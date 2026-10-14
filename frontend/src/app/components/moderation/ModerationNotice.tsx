"use client";

import { useState } from "react";
import * as postService from "@/services/post.service";
import { canAppeal, reasonText, type ModerationInfo, type ModerationStatus } from "@/lib/moderation";

type Props = {
  kind: "post" | "comment";
  id: number;
  status: ModerationStatus;
  reason: string | null;
  appealed?: boolean;
  // Called after a successful appeal, so the parent can refresh what it shows.
  onAppealed?: (info: ModerationInfo) => void;
};

// Tells the author what happened to their post or comment, and lets them ask a person to look again.
export default function ModerationNotice({ kind, id, status, reason, appealed = false, onAppealed }: Props) {
  const [current, setCurrent] = useState({ status, reason, appealed });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (current.status === "published") return null;

  const noun = kind === "post" ? "โพสต์" : "ความเห็น";

  const sendAppeal = async () => {
    setSending(true);
    setError("");
    const result = await postService.appeal(kind, id);
    setSending(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    const info = result.moderation ?? { status: "held" as const, reason: current.reason };
    setCurrent({ status: info.status, reason: info.reason, appealed: true });
    onAppealed?.(info);
  };

  const rejected = current.status === "rejected";
  const tone = rejected ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div role="status" className={`rounded-2xl border p-4 text-sm ${tone}`}>
      {rejected ? (
        <>
          <p className="font-semibold">{noun}นี้ถูกปฏิเสธ</p>
          <p className="mt-1">เหตุผล: {reasonText(current.reason)}</p>
          <p className="mt-1">เฉพาะคุณเท่านั้นที่มองเห็น{noun}นี้</p>
        </>
      ) : (
        <>
          <p className="font-semibold">{noun}นี้อยู่ระหว่างการตรวจสอบ</p>
          <p className="mt-1">
            {current.appealed
              ? "คุณส่งให้ผู้ดูแลระบบตรวจสอบอีกครั้งแล้ว ระหว่างนี้เฉพาะคุณเท่านั้นที่มองเห็น"
              : `เฉพาะคุณเท่านั้นที่มองเห็นจนกว่าผู้ดูแลระบบจะอนุมัติ (${reasonText(current.reason)})`}
          </p>
        </>
      )}

      {canAppeal(current.status, current.reason) && (
        <button
          type="button"
          onClick={sendAppeal}
          disabled={sending}
          className="mt-3 rounded-3xl border border-red-300 bg-white px-4 py-2 font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-60"
        >
          {sending ? "กำลังส่ง…" : "ขอให้แอดมินตรวจสอบ"}
        </button>
      )}

      {rejected && !canAppeal(current.status, current.reason) && (
        <p className="mt-2 text-xs">ผู้ดูแลระบบตรวจสอบแล้ว จึงไม่สามารถอุทธรณ์ได้</p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
