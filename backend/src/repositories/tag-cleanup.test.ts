import { beforeEach, describe, expect, it, mock } from "bun:test";

// A tag that loses its last post must go away. The repositories collect the tag ids BEFORE the links are
// removed and then call the database function `delete_unused_tags`, which only deletes tags nobody uses.
const log: string[] = [];
let answers: Record<string, { data?: unknown; error?: unknown }> = {};

function builder(table: string) {
  let op = "";
  const b: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === "then") {
          return (resolve: (v: unknown) => void) => resolve(answers[`${table}.${op}`] ?? { data: null, error: null });
        }
        if (prop === "single" || prop === "maybeSingle") {
          return async () => answers[`${table}.${op}.one`] ?? answers[`${table}.${op}`] ?? { data: null, error: null };
        }
        return (...args: unknown[]) => {
          if (["select", "insert", "update", "delete"].includes(prop) && !op) op = prop;
          if (["insert", "update", "delete"].includes(prop)) log.push(`${prop} ${table}${prop === "insert" ? " " + JSON.stringify(args[0]) : ""}`);
          return b;
        };
      },
    },
  );
  return b;
}

mock.module("../supabase", () => ({
  supabase: {
    from: (table: string) => builder(table),
    rpc: async (fn: string, args: unknown) => {
      log.push(`rpc ${fn} ${JSON.stringify(args)}`);
      return answers[`rpc.${fn}`] ?? { data: 1, error: null };
    },
    storage: { from: () => ({ remove: async () => ({ error: null }) }) },
  },
  supabaseAuth: { auth: {} },
}));

const { getPostTagIds, removeUnusedTags } = await import("./tag-repo");
const { deletePost, editPost } = await import("./post-repo");
const { deletePostAsAdmin } = await import("./admin-repo");

beforeEach(() => {
  log.length = 0;
  answers = {};
});

describe("tag-repo", () => {
  it("reads the tag ids of a post", async () => {
    answers["post_tags.select"] = { data: [{ tag_id: 4 }, { tag_id: 9 }] };
    expect(await getPostTagIds(1)).toEqual([4, 9]);
  });

  it("returns no ids when the read fails", async () => {
    answers["post_tags.select"] = { data: null, error: { message: "boom" } };
    expect(await getPostTagIds(1)).toEqual([]);
  });

  it("asks the database to remove the unused ones, and skips the call for an empty list", async () => {
    await removeUnusedTags([4, 9]);
    await removeUnusedTags([]);
    expect(log).toEqual(['rpc delete_unused_tags {"p_tag_ids":[4,9]}']);
  });

  it("never throws when the database function fails", async () => {
    answers["rpc.delete_unused_tags"] = { data: null, error: { message: "missing function" } };
    await expect(removeUnusedTags([4])).resolves.toBeUndefined();
  });
});

describe("deleting a post cleans up its tag", () => {
  it("author delete: removes the tag after the post is gone", async () => {
    answers["posts.select.one"] = { data: { user_id: "u1" } };
    answers["files.select"] = { data: [] };
    answers["post_tags.select"] = { data: [{ tag_id: 7 }] };
    const result = await deletePost("u1", 5);
    expect(result.status).toBe(200);
    const cleanup = log.findIndex((l) => l.startsWith("rpc delete_unused_tags"));
    expect(log[cleanup]).toBe('rpc delete_unused_tags {"p_tag_ids":[7]}');
    expect(cleanup).toBeGreaterThan(log.indexOf("delete posts"));
  });

  it("author delete: someone else's post is refused and no tag is touched", async () => {
    answers["posts.select.one"] = { data: { user_id: "someone-else" } };
    const result = await deletePost("u1", 5);
    expect(result.status).toBe(500);
    expect(log.some((l) => l.startsWith("rpc"))).toBe(false);
  });

  it("admin delete: removes the tag after the post is gone", async () => {
    answers["files.select"] = { data: [] };
    answers["post_tags.select"] = { data: [{ tag_id: 3 }] };
    await deletePostAsAdmin(5);
    expect(log).toEqual(["delete posts", 'rpc delete_unused_tags {"p_tag_ids":[3]}']);
  });
});

describe("editing a post cleans up the tag it left", () => {
  const owned = () => {
    answers["posts.select.one"] = { data: { user_id: "u1" } };
    answers["posts.update.one"] = { data: { id: 5 } };
  };

  it("moving to another tag removes the old tag if it is now unused", async () => {
    owned();
    answers["post_tags.select.one"] = { data: { tag_id: 2 } }; // current tag
    answers["tags.select.one"] = { data: { id: 8 } }; // the new tag already exists
    const result = await editPost("u1", 5, "t", "b", "new tag");
    expect(result.status).toBe(200);
    expect(log).toContain('rpc delete_unused_tags {"p_tag_ids":[2]}');
  });

  it("keeping the same tag removes nothing", async () => {
    owned();
    answers["post_tags.select.one"] = { data: { tag_id: 2 } };
    answers["tags.select.one"] = { data: { id: 2 } };
    await editPost("u1", 5, "t", "b", "same");
    expect(log.some((l) => l.startsWith("rpc"))).toBe(false);
  });
});
