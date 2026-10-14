"use client";

import { useEffect, useState } from "react";
import * as adminService from "@/services/admin.service";
import { QUEUE_CHANGED_EVENT } from "./ModerationQueue";

export type AdminSection = "overview" | "moderation";

type Props = { section: AdminSection; onChange: (section: AdminSection) => void };

// Renders nothing until the backend says AI moderation is on, so with the switch off the admin
// page looks exactly as it did before.
export default function ModerationTabs({ section, onChange }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let cancelled = false;
    adminService.getModerationQueue().then((result) => {
      if (cancelled || result.error || !result.enabled) return;
      setEnabled(true);
      setPending(result.items?.length ?? 0);
    });

    const onQueueChanged = (e: Event) => setPending((e as CustomEvent<number>).detail);
    window.addEventListener(QUEUE_CHANGED_EVENT, onQueueChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(QUEUE_CHANGED_EVENT, onQueueChanged);
    };
  }, []);

  if (!enabled) return null;

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
        {tab("moderation", "ตรวจสอบเนื้อหา", pending)}
      </div>
    </div>
  );
}
