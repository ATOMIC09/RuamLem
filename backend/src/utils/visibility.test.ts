import { describe, expect, it } from "bun:test";
import { isVisibleTo, withVisibility } from "./visibility";

const AUTHOR = "3f2a9c1e-5b7d-4e8a-9c0d-1a2b3c4d5e6f";

// Records what filters were applied, standing in for the PostgREST query builder.
function fakeQuery() {
  const calls: [string, ...unknown[]][] = [];
  const q = {
    eq(column: string, value: unknown) {
      calls.push(["eq", column, value]);
      return q;
    },
    or(filters: string) {
      calls.push(["or", filters]);
      return q;
    },
  };
  return { q, calls };
}

describe("withVisibility", () => {
  it("moderation off: adds no filter at all, so the site behaves as before", () => {
    const { q, calls } = fakeQuery();
    expect(withVisibility(q, AUTHOR, false)).toBe(q);
    expect(withVisibility(q, null, false)).toBe(q);
    expect(calls).toEqual([]);
  });

  it("anonymous viewer: published only", () => {
    const { q, calls } = fakeQuery();
    withVisibility(q, null, true);
    expect(calls).toEqual([["eq", "moderation_status", "published"]]);
  });

  it("signed-in viewer: published, plus their own items of any status", () => {
    const { q, calls } = fakeQuery();
    withVisibility(q, AUTHOR, true);
    expect(calls).toEqual([["or", `moderation_status.eq.published,user_id.eq.${AUTHOR}`]]);
  });

  it("a viewer id that is not a UUID is treated as anonymous, so it can never inject a filter", () => {
    for (const hostile of ["x,user_id.neq.0", "1) or (1=1", "", "not-a-uuid", `${AUTHOR},moderation_status.eq.held`]) {
      const { q, calls } = fakeQuery();
      withVisibility(q, hostile, true);
      expect(calls).toEqual([["eq", "moderation_status", "published"]]);
    }
  });
});

describe("isVisibleTo", () => {
  const held = { moderation_status: "held", user_id: AUTHOR };

  it("published items are visible to everyone", () => {
    expect(isVisibleTo({ moderation_status: "published", user_id: AUTHOR }, null, true)).toBe(true);
    expect(isVisibleTo({ user_id: AUTHOR }, "someone-else", true)).toBe(true); // no status counts as published
  });

  it("held and rejected items are visible only to their author", () => {
    for (const status of ["held", "rejected"]) {
      const item = { moderation_status: status, user_id: AUTHOR };
      expect(isVisibleTo(item, AUTHOR, true)).toBe(true);
      expect(isVisibleTo(item, "someone-else", true)).toBe(false);
      expect(isVisibleTo(item, null, true)).toBe(false);
    }
  });

  it("moderation off: everything is visible", () => {
    expect(isVisibleTo(held, null, false)).toBe(true);
  });
});
