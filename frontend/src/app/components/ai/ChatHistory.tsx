"use client";

import { useState } from "react";
import type { StoredChat } from "@/lib/chat-store";

type Props = {
  chats: StoredChat[];
  activeId: string | null;
  disabled?: boolean;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
};

export function formatWhen(timestamp: number, now: number = Date.now()): string {
  const days = Math.floor((now - timestamp) / 86_400_000);
  if (days <= 0) return "วันนี้";
  if (days === 1) return "เมื่อวาน";
  if (days < 7) return `${days} วันที่แล้ว`;
  return new Date(timestamp).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

// The list of saved chats. They live in this browser only.
export default function ChatHistory({ chats, activeId, disabled, onNew, onOpen, onDelete, onDeleteAll }: Props) {
  const [confirmAll, setConfirmAll] = useState(false);

  return (
    <nav aria-label="ประวัติการสนทนา" className="text-sm">
      <button
        type="button"
        onClick={onNew}
        disabled={disabled}
        className="mb-3 w-full rounded-3xl bg-[#405168] px-4 py-2 font-medium text-white hover:bg-[#2d3a4c] focus:outline-none focus:ring-2 focus:ring-[#405168]/40 disabled:opacity-60"
      >
        + แชตใหม่
      </button>

      {chats.length === 0 ? (
        <p className="rounded-2xl border border-[#dee5ed] bg-white p-3 text-[#7a8b99]">ยังไม่มีบทสนทนาที่บันทึกไว้ บทสนทนาที่ตอบเสร็จแล้วจะแสดงที่นี่</p>
      ) : (
        <ul className="space-y-1.5">
          {chats.map((chat) => {
            const active = chat.id === activeId;
            return (
              <li key={chat.id} className={`flex items-stretch rounded-2xl border ${active ? "border-[#405168] bg-[#eef2f7]" : "border-[#dee5ed] bg-white"}`}>
                <button
                  type="button"
                  onClick={() => onOpen(chat.id)}
                  disabled={disabled}
                  aria-current={active ? "true" : undefined}
                  className="min-w-0 flex-1 rounded-2xl px-3 py-2 text-left hover:bg-[#f8f9fa] focus:outline-none focus:ring-2 focus:ring-[#405168]/40 disabled:opacity-60"
                >
                  <span className="block truncate font-medium text-[#1c2a48]">{chat.title}</span>
                  <span className="block text-xs text-[#7a8b99]">
                    {formatWhen(chat.updatedAt)} · {chat.turns.length} ข้อความ
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(chat.id)}
                  aria-label={`ลบบทสนทนา ${chat.title}`}
                  className="rounded-r-2xl px-3 text-[#7a8b99] hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 text-xs text-[#7a8b99]">
        เก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น ไม่ถูกส่งไปเก็บที่เซิร์ฟเวอร์ เก็บได้ไม่เกิน 30 บทสนทนา เมื่อเต็มจะลบอันเก่าที่สุดก่อน
      </p>

      {chats.length > 0 &&
        (confirmAll ? (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmAll(false);
                onDeleteAll();
              }}
              className="rounded-3xl bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              ยืนยันลบทั้งหมด
            </button>
            <button type="button" onClick={() => setConfirmAll(false)} className="rounded-3xl border border-[#e0e7f1] bg-white px-3 py-1 text-xs text-[#405168]">
              ยกเลิก
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmAll(true)} className="mt-2 text-xs text-[#7a8b99] underline hover:text-red-600">
            ลบประวัติทั้งหมด
          </button>
        ))}
    </nav>
  );
}
