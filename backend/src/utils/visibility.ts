import { isModerationEnabled } from "../ai/client";

// Who can see a post or comment once moderation is on:
//   everyone       -> published items
//   the author too -> their own held and rejected items, with the status
// With moderation off this does nothing, so the site behaves exactly as before
// (and the moderation columns are not even touched).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function withVisibility<Q>(
  query: Q,
  viewerId: string | null | undefined,
  enabled: boolean = isModerationEnabled()
): Q {
  if (!enabled) return query;

  // The PostgREST builder types are too deep to constrain here, so the filter methods are called loosely.
  const builder = query as unknown as { eq(c: string, v: unknown): Q; or(f: string): Q };

  // The id comes from a verified token, but it is validated anyway because it goes into a filter string.
  if (viewerId && UUID.test(viewerId)) {
    return builder.or(`moderation_status.eq.published,user_id.eq.${viewerId}`);
  }
  return builder.eq("moderation_status", "published");
}

// Same rule for a row already in memory.
export function isVisibleTo(
  item: { moderation_status?: string | null; user_id?: string | null },
  viewerId: string | null | undefined,
  enabled: boolean = isModerationEnabled()
): boolean {
  if (!enabled) return true;
  if ((item.moderation_status ?? "published") === "published") return true;
  return !!viewerId && item.user_id === viewerId;
}
