import { beforeEach, describe, expect, it, mock } from "bun:test";

// The view and download tables are closed to the API, so analytics goes through database functions.
// This fake records each rpc call and answers from a queue.
const calls: { fn: string; args: Record<string, unknown> }[] = [];
let answers: { data?: unknown; error?: { message: string } | null }[] = [];

mock.module("../supabase", () => ({
  supabase: {
    rpc: async (fn: string, args: Record<string, unknown> = {}) => {
      calls.push({ fn, args });
      return answers.shift() ?? { data: null, error: null };
    },
  },
  supabaseAuth: { auth: {} },
}));

const repo = await import("./analytics-repo");

beforeEach(() => {
  calls.length = 0;
  answers = [];
});

describe("recordPostView", () => {
  it("asks the database to record the view, passing only the post and the IP address", async () => {
    answers = [{ data: "recorded" }];
    const result = await repo.recordPostView(33, "some-user-id", "203.0.113.9");
    expect(result).toEqual({ status: 200, message: "View recorded successfully" });
    expect(calls).toEqual([{ fn: "record_post_view", args: { p_post_id: 33, p_ip: "203.0.113.9" } }]);
    // the user id is never sent: the database reads the signed-in user from the request's own token
    expect(JSON.stringify(calls)).not.toContain("some-user-id");
  });

  it("reports a repeat view within 24 hours", async () => {
    answers = [{ data: "already_recorded" }];
    expect(await repo.recordPostView(33, null, "203.0.113.9")).toEqual({ status: 200, message: "View already recorded recently" });
  });

  it("turns a database error into a 500 result instead of throwing", async () => {
    answers = [{ error: { message: "boom" } }];
    expect(await repo.recordPostView(33)).toMatchObject({ status: 500, error: "boom" });
  });
});

describe("view counts", () => {
  it("one post: returns its count, or 0 when it has no views", async () => {
    answers = [{ data: [{ post_id: 33, view_count: 7 }] }, { data: [] }];
    expect(await repo.getPostViewCount(33)).toEqual({ status: 200, data: { viewCount: 7 } });
    expect(await repo.getPostViewCount(34)).toEqual({ status: 200, data: { viewCount: 0 } });
    expect(calls[0]).toEqual({ fn: "post_view_counts", args: { p_post_ids: [33] } });
  });

  it("several posts: keeps the requested order and fills in 0 for posts with no views", async () => {
    answers = [{ data: [{ post_id: 42, view_count: 5 }, { post_id: 33, view_count: "2" }] }];
    expect(await repo.getMultiplePostViews([33, 41, 42])).toEqual({
      status: 200,
      data: [
        { postId: 33, viewCount: 2 },
        { postId: 41, viewCount: 0 },
        { postId: 42, viewCount: 5 },
      ],
    });
  });

  it("reports an error as a 500 result", async () => {
    answers = [{ error: { message: "denied" } }];
    expect(await repo.getMultiplePostViews([1])).toMatchObject({ status: 500, error: "denied" });
  });
});

describe("downloads", () => {
  it("records a download through the database function", async () => {
    answers = [{ data: "recorded" }];
    expect(await repo.recordFileDownload(9, 33, "ignored-user", "203.0.113.9")).toEqual({
      status: 200,
      message: "Download recorded successfully",
    });
    expect(calls[0]).toEqual({ fn: "record_file_download", args: { p_file_id: 9, p_post_id: 33, p_ip: "203.0.113.9" } });
  });

  it("returns counts for one file and for several, defaulting to 0", async () => {
    answers = [
      { data: [{ file_id: 9, download_count: 3 }] },
      { data: [{ file_id: 9, download_count: 3 }] },
    ];
    expect(await repo.getFileDownloadCount(9)).toEqual({ status: 200, data: { downloadCount: 3 } });
    expect(await repo.getMultipleFileDownloads([9, 10])).toEqual({
      status: 200,
      data: [
        { fileId: 9, downloadCount: 3 },
        { fileId: 10, downloadCount: 0 },
      ],
    });
  });
});

describe("totals", () => {
  it("reads both totals from one database function", async () => {
    answers = [{ data: [{ total_views: 128, total_downloads: "51" }] }, { data: [{ total_views: 128, total_downloads: 51 }] }];
    expect(await repo.getTotalViews()).toEqual({ status: 200, data: { totalViews: 128 } });
    expect(await repo.getTotalDownloads()).toEqual({ status: 200, data: { totalDownloads: 51 } });
    expect(calls.every((c) => c.fn === "engagement_totals")).toBe(true);
  });

  it("is zero when the database returns nothing", async () => {
    answers = [{ data: [] }];
    expect(await repo.getTotalViews()).toEqual({ status: 200, data: { totalViews: 0 } });
  });
});
