import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test";

// ---- A tiny in-memory stand-in for the Supabase query builder -------------------------------
// It implements only what post-repo's read paths use (eq, lt, in, gte, or, order, limit,
// single, count) so the real repository code, including withVisibility, runs against it.

type Row = Record<string, any>;
const db: Record<string, Row[]> = {};

class Query implements PromiseLike<any> {
  private preds: ((row: Row) => boolean)[] = [];
  private sort?: { column: string; ascending: boolean };
  private max?: number;
  private opts?: { count?: string; head?: boolean };
  private cols = "*";
  private wantsOne = false;

  constructor(private table: string) {}

  select(cols = "*", opts?: { count?: string; head?: boolean }) {
    this.cols = cols;
    this.opts = opts;
    return this;
  }
  eq(column: string, value: unknown) {
    this.preds.push((r) => r[column] === value);
    return this;
  }
  lt(column: string, value: number) {
    this.preds.push((r) => r[column] < value);
    return this;
  }
  gte(column: string, value: unknown) {
    this.preds.push((r) => r[column] >= (value as any));
    return this;
  }
  in(column: string, values: unknown[]) {
    this.preds.push((r) => values.includes(r[column]));
    return this;
  }
  // PostgREST "a.eq.x,b.eq.y" means a OR b
  or(filters: string) {
    const parts = filters.split(",").map((f) => {
      const [column, op, ...rest] = f.split(".");
      if (op !== "eq") throw new Error(`fake supports only eq inside or(): ${f}`);
      return { column, value: rest.join(".") };
    });
    this.preds.push((r) => parts.some((p) => String(r[p.column]) === p.value));
    return this;
  }
  order(column: string, o: { ascending: boolean }) {
    this.sort = { column, ascending: o.ascending };
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  single() {
    this.wantsOne = true;
    return this;
  }

  private run() {
    let rows = (db[this.table] ?? []).filter((r) => this.preds.every((p) => p(r)));
    if (this.sort) {
      const { column, ascending } = this.sort;
      rows = [...rows].sort((a, b) => (a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0) * (ascending ? 1 : -1));
    }
    if (this.max !== undefined) rows = rows.slice(0, this.max);

    if (this.opts?.head) return { data: null, count: rows.length, error: null };

    // post_tags rows are fetched with their tag embedded: select("tags(id, subject_name)")
    if (this.table === "post_tags" && this.cols.includes("tags(")) {
      rows = rows.map((r) => ({ ...r, tags: db.tags.find((t) => t.id === r.tag_id) ?? null }));
    }

    if (this.wantsOne) {
      return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { message: "not exactly one row" } };
    }
    return { data: rows, error: null };
  }

  then<R1 = any, R2 = never>(onfulfilled?: ((v: any) => R1 | PromiseLike<R1>) | null, onrejected?: ((e: any) => R2 | PromiseLike<R2>) | null) {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

mock.module("../supabase", () => ({ supabase: { from: (table: string) => new Query(table), auth: {} } }));

// ---- Fixtures ---------------------------------------------------------------------------------

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function seed() {
  db.profiles = [
    { uuid: A, first_name: "Aom", last_name: "A", avatar_url: null },
    { uuid: B, first_name: "Bee", last_name: "B", avatar_url: null },
  ];
  db.tags = [{ id: 1, subject_name: "Database" }];
  db.files = [];
  db.post_tags = [1, 2, 3, 4, 5].map((post_id) => ({ post_id, tag_id: 1 }));
  db.posts = [
    { id: 1, user_id: A, title: "A published", body: "x", moderation_status: "published" },
    { id: 2, user_id: A, title: "A held", body: "x", moderation_status: "held", moderation_reason: "off_topic" },
    { id: 3, user_id: A, title: "A rejected", body: "x", moderation_status: "rejected", moderation_reason: "spam" },
    { id: 4, user_id: B, title: "B published", body: "x", moderation_status: "published" },
    { id: 5, user_id: B, title: "B held", body: "x", moderation_status: "held", moderation_reason: "abuse" },
  ];
  db.comments = [
    { id: 10, post_id: 1, user_id: A, body: "A ok", moderation_status: "published", created_at: "2026-01-01" },
    { id: 11, post_id: 1, user_id: B, body: "B held comment", moderation_status: "held", created_at: "2026-01-02" },
    { id: 12, post_id: 1, user_id: B, body: "B ok", moderation_status: "published", created_at: "2026-01-03" },
    { id: 13, post_id: 1, user_id: A, body: "A rejected comment", moderation_status: "rejected", created_at: "2026-01-04" },
  ];
}

const ids = (result: any) => (result.data as Row[]).map((p) => p.id);

let repo: typeof import("./post-repo");
const saved = process.env.AI_MODERATION_ENABLED;

beforeAll(async () => {
  repo = await import("./post-repo");
});
afterAll(() => {
  if (saved === undefined) delete process.env.AI_MODERATION_ENABLED;
  else process.env.AI_MODERATION_ENABLED = saved;
});

// ---- Moderation ON: held content is hidden from others, shown to its author ---------------------

describe("read paths with moderation on", () => {
  beforeAll(() => {
    process.env.AI_MODERATION_ENABLED = "true";
    seed();
  });

  describe("post lists", () => {
    it("anonymous visitors see published posts only", async () => {
      expect(ids(await repo.getPost(10, null))).toEqual([4, 1]);
      expect(ids(await repo.getPost(10))).toEqual([4, 1]); // no viewer given at all
    });

    it("another signed-in user does not see someone else's held or rejected posts", async () => {
      expect(ids(await repo.getPost(10, B))).toEqual([5, 4, 1]); // B's own held post, not A's 2 or 3
      expect(ids(await repo.getPost(10, "cccccccc-cccc-4ccc-8ccc-cccccccccccc"))).toEqual([4, 1]);
    });

    it("the author also sees their own held and rejected posts, with the status", async () => {
      const result: any = await repo.getPost(10, A);
      expect(ids(result)).toEqual([4, 3, 2, 1]);
      const byId = Object.fromEntries(result.data.map((p: Row) => [p.id, p]));
      expect(byId[2]).toMatchObject({ moderation_status: "held", moderation_reason: "off_topic" });
      expect(byId[3]).toMatchObject({ moderation_status: "rejected", moderation_reason: "spam" });
      expect(byId[1].moderation_status).toBe("published");
    });

    it("pagination (getPostAfter) follows the same rule", async () => {
      expect(ids(await repo.getPostAfter(5, 10, null))).toEqual([4, 1]);
      expect(ids(await repo.getPostAfter(5, 10, A))).toEqual([4, 3, 2, 1]);
      expect(ids(await repo.getPostAfter(3, 10, null))).toEqual([1]);
    });

    it("tag filtering (getPostFilter) follows the same rule", async () => {
      expect(ids(await repo.getPostFilter("Database", 10, null))).toEqual([1, 4]);
      expect((ids(await repo.getPostFilter("Database", 10, A)) as number[]).sort()).toEqual([1, 2, 3, 4]);
    });
  });

  describe("a single post", () => {
    it("a held post looks like a missing post to everyone but its author", async () => {
      expect(await repo.getPostById(2, null)).toEqual({ status: 404, message: "Post not found" });
      expect(await repo.getPostById(2, B)).toEqual({ status: 404, message: "Post not found" });
      expect(await repo.getPostById(3, B)).toMatchObject({ status: 404 });
      expect(await repo.getPostById(2, A)).toMatchObject({ status: 200, data: { id: 2, moderation_status: "held" } });
    });

    it("a published post is visible to everyone", async () => {
      expect(await repo.getPostById(1, null)).toMatchObject({ status: 200 });
      expect(await repo.getPostById(1, B)).toMatchObject({ status: 200 });
    });

    it("an author cannot see another author's held post", async () => {
      expect(await repo.getPostById(5, A)).toMatchObject({ status: 404 });
      expect(await repo.getPostById(5, B)).toMatchObject({ status: 200 });
    });
  });

  describe("comments", () => {
    it("anonymous visitors see published comments only", async () => {
      const result: any = await repo.getComment(1, null);
      expect(ids(result).sort()).toEqual([10, 12]);
    });

    it("each author also sees their own held or rejected comments", async () => {
      expect(ids((await repo.getComment(1, B)) as any).sort()).toEqual([10, 11, 12]);
      expect(ids((await repo.getComment(1, A)) as any).sort()).toEqual([10, 12, 13]);
    });

    it("the comment count shown on a post follows the same rule", async () => {
      expect(((await repo.getPostById(1, null)) as any).data.comment_count).toBe(2);
      expect(((await repo.getPostById(1, B)) as any).data.comment_count).toBe(3);
    });
  });

  it("a viewer id that is not a UUID is treated as anonymous", async () => {
    expect(ids(await repo.getPost(10, "x,user_id.neq.0"))).toEqual([4, 1]);
  });
});

// ---- Moderation OFF: exactly as today ---------------------------------------------------------

describe("read paths with moderation off", () => {
  beforeAll(() => {
    process.env.AI_MODERATION_ENABLED = "false";
    // Rows without any moderation columns, like the database before the migration.
    seed();
    for (const table of ["posts", "comments"]) for (const row of db[table]) delete row.moderation_status;
  });

  it("returns everything, with no filter applied", async () => {
    expect(ids(await repo.getPost(10, null))).toEqual([5, 4, 3, 2, 1]);
    expect(ids(await repo.getPost(10, A))).toEqual([5, 4, 3, 2, 1]);
    expect(ids(await repo.getPostAfter(5, 10, null))).toEqual([4, 3, 2, 1]);
    expect(await repo.getPostById(2, null)).toMatchObject({ status: 200 });
    expect(ids((await repo.getComment(1, null)) as any).sort()).toEqual([10, 11, 12, 13]);
    expect(((await repo.getPostById(1)) as any).data.comment_count).toBe(4);
  });
});
