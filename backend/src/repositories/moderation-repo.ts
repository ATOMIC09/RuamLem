import { supabase } from "../supabase";

// These calls run as the signed-in person making the request, so row level security decides what they may do:
// authors see and change their own items, admins see and decide everything, and the audit log is admin-readable.

export type TargetType = "post" | "comment";
export type Status = "published" | "held" | "rejected";

const TABLE: Record<TargetType, "posts" | "comments"> = { post: "posts", comment: "comments" };

export type ModerationItem = {
  id: number;
  userId: string;
  status: Status;
  reason: string | null;
  appealed: boolean;
};

export async function getItem(type: TargetType, id: number): Promise<ModerationItem | null> {
  const { data, error } = await supabase
    .from(TABLE[type])
    .select("id, user_id, moderation_status, moderation_reason, moderation_appealed")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getItem failed: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    status: data.moderation_status,
    reason: data.moderation_reason,
    appealed: data.moderation_appealed,
  };
}

export async function setStatus(
  type: TargetType,
  id: number,
  change: { status: Status; reason: string | null; appealed: boolean }
) {
  const { error } = await supabase
    .from(TABLE[type])
    .update({
      moderation_status: change.status,
      moderation_reason: change.reason,
      moderation_appealed: change.appealed,
    })
    .eq("id", id);

  if (error) throw new Error(`setStatus failed: ${error.message}`);
}

export type LogEntry = {
  targetType: TargetType;
  targetId: number;
  decision: Status;
  // 'ai', or the user id of the admin (or author, for an appeal) who acted.
  actor: string;
  reason?: string | null;
  detail?: string | null;
};

export async function writeLog(entry: LogEntry) {
  const { error } = await supabase.from("moderation_log").insert({
    target_type: entry.targetType,
    target_id: entry.targetId,
    decision: entry.decision,
    actor: entry.actor,
    reason: entry.reason ?? null,
    detail: entry.detail ?? null,
  });

  if (error) throw new Error(`writeLog failed: ${error.message}`);
}

// The most recent AI explanation for an item, shown to admins next to the reason code.
async function latestDetails(type: TargetType, ids: number[]): Promise<Map<number, string>> {
  const details = new Map<number, string>();
  if (ids.length === 0) return details;

  const { data, error } = await supabase
    .from("moderation_log")
    .select("target_id, detail, created_at")
    .eq("target_type", type)
    .in("target_id", ids)
    .not("detail", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`latestDetails failed: ${error.message}`);
  for (const row of data ?? []) if (!details.has(row.target_id)) details.set(row.target_id, row.detail);
  return details;
}

export type QueueItem = {
  type: TargetType;
  id: number;
  postId: number | null;
  title: string | null;
  body: string;
  tags: string[];
  files: { name: string; size: number }[];
  reason: string | null;
  detail: string | null;
  appealed: boolean;
  author: { id: string; name: string };
  createdAt: string;
};

// Held items waiting for an admin, appealed ones first, then oldest first.
export async function listQueue(): Promise<QueueItem[]> {
  const db = supabase;

  const [posts, comments] = await Promise.all([
    db
      .from("posts")
      .select("id, user_id, title, body, created_at, moderation_reason, moderation_appealed, post_tags(tags(subject_name)), files(file_name, file_size)")
      .eq("moderation_status", "held"),
    db
      .from("comments")
      .select("id, user_id, post_id, body, created_at, moderation_reason, moderation_appealed")
      .eq("moderation_status", "held"),
  ]);
  if (posts.error) throw new Error(`listQueue posts failed: ${posts.error.message}`);
  if (comments.error) throw new Error(`listQueue comments failed: ${comments.error.message}`);

  const userIds = [...new Set([...(posts.data ?? []), ...(comments.data ?? [])].map((row: any) => row.user_id))];
  const names = new Map<string, string>();
  if (userIds.length > 0) {
    const { data } = await db.from("profiles").select("uuid, first_name, last_name").in("uuid", userIds);
    for (const p of data ?? []) names.set(p.uuid, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unknown");
  }

  const [postDetails, commentDetails] = await Promise.all([
    latestDetails("post", (posts.data ?? []).map((p: any) => p.id)),
    latestDetails("comment", (comments.data ?? []).map((c: any) => c.id)),
  ]);

  const items: QueueItem[] = [
    ...(posts.data ?? []).map((p: any) => ({
      type: "post" as const,
      id: p.id,
      postId: p.id,
      title: p.title,
      body: p.body,
      tags: (p.post_tags ?? []).map((pt: any) => pt.tags?.subject_name).filter(Boolean),
      files: (p.files ?? []).map((f: any) => ({ name: f.file_name, size: f.file_size })),
      reason: p.moderation_reason,
      detail: postDetails.get(p.id) ?? null,
      appealed: p.moderation_appealed,
      author: { id: p.user_id, name: names.get(p.user_id) ?? "Unknown" },
      createdAt: p.created_at,
    })),
    ...(comments.data ?? []).map((c: any) => ({
      type: "comment" as const,
      id: c.id,
      postId: c.post_id,
      title: null,
      body: c.body,
      tags: [],
      files: [],
      reason: c.moderation_reason,
      detail: commentDetails.get(c.id) ?? null,
      appealed: c.moderation_appealed,
      author: { id: c.user_id, name: names.get(c.user_id) ?? "Unknown" },
      createdAt: c.created_at,
    })),
  ];

  return items.sort(
    (a, b) => Number(b.appealed) - Number(a.appealed) || Date.parse(a.createdAt) - Date.parse(b.createdAt)
  );
}

// For `ai:recheck`: held items whose check could not finish.
export async function listHeldByReason(type: TargetType, reason: string) {
  const { data, error } = await supabase
    .from(TABLE[type])
    .select(type === "post" ? "id, user_id, title, body" : "id, user_id, body")
    .eq("moderation_status", "held")
    .eq("moderation_reason", reason);

  if (error) throw new Error(`listHeldByReason failed: ${error.message}`);
  return (data ?? []) as unknown as { id: number; user_id: string; title?: string; body: string }[];
}

export async function getPostTagsAndFiles(postId: number) {
  const { data, error } = await supabase
    .from("posts")
    .select("post_tags(tags(subject_name)), files(file_name)")
    .eq("id", postId)
    .maybeSingle();

  if (error) throw new Error(`getPostTagsAndFiles failed: ${error.message}`);
  const row = data as any;
  return {
    tags: ((row?.post_tags ?? []) as any[]).map((pt) => pt.tags?.subject_name).filter(Boolean) as string[],
    fileNames: ((row?.files ?? []) as any[]).map((f) => f.file_name).filter(Boolean) as string[],
  };
}
