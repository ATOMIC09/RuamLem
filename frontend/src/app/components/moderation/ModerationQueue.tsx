"use client";

import { useCallback, useEffect, useState } from "react";
import * as adminService from "@/services/admin.service";
import type { ModerationQueueItem } from "@/services/admin.service";
import { reasonText } from "@/lib/moderation";

// Lets the tab bar update its count without the admin page holding any extra state.
export const QUEUE_CHANGED_EVENT = "moderation-queue-changed";

function announce(count: number) {
  window.dispatchEvent(new CustomEvent(QUEUE_CHANGED_EVENT, { detail: count }));
}

const keyOf = (item: ModerationQueueItem) => `${item.type}-${item.id}`;

// The admin's review queue: everything the AI held (appealed items first), with the AI's reason.
// An admin decision overrides the AI, is written to the audit log, and a rejection is final.
export default function ModerationQueue() {
  const [items, setItems] = useState<ModerationQueueItem[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const result = await adminService.getModerationQueue();
    if (result.error) {
      setError(result.error);
      return;
    }
    setError("");
    setEnabled(result.enabled !== false);
    setItems(result.items ?? []);
    announce(result.items?.length ?? 0);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (item: ModerationQueueItem, decision: "approve" | "reject") => {
    const key = keyOf(item);
    setBusyKey(key);
    setConfirmReject(null);
    const result = await adminService.decideModeration(item.type, item.id, decision);
    setBusyKey(null);

    if (result.error) {
      setError(result.error);
      return;
    }
    setError("");
    setMessage(decision === "approve" ? "เผยแพร่แล้ว" : "ปฏิเสธแล้ว");
    setItems((current) => {
      const next = (current ?? []).filter((i) => keyOf(i) !== key);
      announce(next.length);
      return next;
    });
  };

  if (items === null && !error) {
    return <p className="p-8 text-center text-[#7a8b99]">กำลังโหลดรายการรอตรวจสอบ…</p>;
  }

  return (
    <section aria-labelledby="moderation-heading" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h2 id="moderation-heading" className="mb-1 text-2xl font-bold text-[#1c2a48]">
        รายการรอตรวจสอบ
      </h2>
      <p className="mb-6 text-sm text-[#7a8b99]">
        AI ตัดสินเกือบทั้งหมดโดยอัตโนมัติ รายการที่นี่คือกรณีก้ำกึ่งหรือผู้เขียนขออุทธรณ์ การตัดสินของคุณจะบันทึกไว้ในประวัติเสมอ
      </p>

      <div role="status" aria-live="polite" className="sr-only">
        {message}
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!enabled && (
        <p className="rounded-2xl border border-[#dee5ed] bg-white p-6 text-center text-[#7a8b99]">
          ระบบตรวจสอบอัตโนมัติปิดอยู่ (AI_MODERATION_ENABLED=false)
        </p>
      )}

      {enabled && items && items.length === 0 && (
        <p className="rounded-2xl border border-[#dee5ed] bg-white p-8 text-center text-[#7a8b99]">
          ไม่มีรายการที่รอตรวจสอบ 🎉
        </p>
      )}

      <ul className="space-y-4">
        {(items ?? []).map((item) => {
          const key = keyOf(item);
          const busy = busyKey === key;
          return (
            <li key={key} className="rounded-2xl border border-[#dee5ed] bg-white p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-[#e0e7f1] px-3 py-1 font-medium text-[#405168]">
                  {item.type === "post" ? "โพสต์" : "ความเห็น"} #{item.id}
                </span>
                {item.appealed && (
                  <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 font-medium text-red-700">
                    ผู้เขียนขออุทธรณ์
                  </span>
                )}
                <span className="text-[#7a8b99]">
                  โดย {item.author.name} · {new Date(item.createdAt).toLocaleString("th-TH")}
                </span>
              </div>

              {item.title && <h3 className="mb-2 break-words text-lg font-bold text-[#1c2a48]">{item.title}</h3>}

              <p className="mb-3 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-[#f8f9fa] p-3 text-sm text-[#405168]">
                {item.body}
              </p>

              {(item.tags.length > 0 || item.files.length > 0) && (
                <p className="mb-3 break-words text-xs text-[#7a8b99]">
                  {item.tags.length > 0 && <>แท็ก: {item.tags.join(", ")} </>}
                  {item.files.length > 0 && <>· ไฟล์: {item.files.map((f) => f.name).join(", ")}</>}
                </p>
              )}

              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-medium">เหตุผลที่ AI ส่งมา: {reasonText(item.reason)}</p>
                {item.detail && item.detail !== "recheck" && (
                  <p className="mt-1 text-xs">บันทึกจาก AI: {item.detail}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => decide(item, "approve")}
                  className="rounded-3xl bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-60"
                >
                  อนุมัติและเผยแพร่
                </button>

                {confirmReject === key ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => decide(item, "reject")}
                      className="rounded-3xl bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-60"
                    >
                      ยืนยันการปฏิเสธ (อุทธรณ์ไม่ได้)
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReject(null)}
                      className="rounded-3xl border border-[#e0e7f1] bg-white px-5 py-2 text-sm font-medium text-[#405168] hover:bg-[#f8f9fa]"
                    >
                      ยกเลิก
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmReject(key)}
                    className="rounded-3xl border border-red-300 bg-white px-5 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-60"
                  >
                    ปฏิเสธ
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
