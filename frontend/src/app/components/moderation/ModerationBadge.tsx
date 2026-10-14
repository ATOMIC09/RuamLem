import { statusLabel, type ModerationStatus } from "@/lib/moderation";

type Props = { status?: ModerationStatus | null; appealed?: boolean };

// A small pill for a post or comment that is not published. Published items show nothing,
// so with moderation switched off the page looks exactly as before.
export default function ModerationBadge({ status, appealed }: Props) {
  if (!status || status === "published") return null;

  const style =
    status === "rejected"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-amber-50 text-amber-800 border-amber-200";
  const label = status === "held" && appealed ? "ส่งให้ผู้ดูแลตรวจสอบแล้ว" : statusLabel(status);

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
