"use client";

import { useEffect, useState } from "react";
import * as adminService from "@/services/admin.service";
import { QUEUE_CHANGED_EVENT } from "./ModerationQueue";

export type AdminSection = "overview" | "moderation" | "ai-usage";

type Props = { section: AdminSection; onChange: (section: AdminSection) => void };

// Renders nothing unless the caller is an admin AND an AI feature is on (moderation on the server, or the
// Ask RuamLem page on the frontend), so with both switches off the admin page looks exactly as it did before.
export default function ModerationTabs({ section, onChange }: Props) {
  const [moderationOn, setModerationOn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pending, setPending] = useState(0);
  const aiOn = process.env.NEXT_PUBLIC_AI_ENABLED === "true";

  useEffect(() => {
    let cancelled = false;
    adminService.getModerationQueue().then((result) => {
      if (cancelled || result.error) return;
      setIsAdmin(true);
      setModerationOn(!!result.enabled);
      setPending(result.items?.length ?? 0);
    });

    const onQueueChanged = (e: Event) => setPending((e as CustomEvent<number>).detail);
    window.addEventListener(QUEUE_CHANGED_EVENT, onQueueChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(QUEUE_CHANGED_EVENT, onQueueChanged);
    };
  }, []);

  if (!isAdmin || !(moderationOn || aiOn)) return null;

  const tab = (id: AdminSection, label: string, count?: number) => {
    const selected = section === id;
    return (
      <button
        type="button"
        role="tab"
        aria-selected={selected}
        onClick={() => onChange(id)}
        className={`rounded-full px-5 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#405168]/40 ${
          selected ? "bg-[#405168] text-white" : "bg-white text-[#405168] hover:bg-[#f1f4f8]"
        }`}
      >
        {label}
        {count ? (
          <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-[#1c2a48]">{count}</span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="border-b border-[#dee5ed] bg-white">
      <div role="tablist" aria-label="ส่วนของแดชบอร์ด" className="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 py-3 sm:px-6 lg:px-8">
        {tab("overview", "ภาพรวม")}
        {moderationOn && tab("moderation", "ตรวจสอบเนื้อหา", pending)}
        {tab("ai-usage", "การใช้งาน AI")}
      </div>
    </div>
  );
}
