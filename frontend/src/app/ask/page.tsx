"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useEffect, useRef } from "react";
import { AI_ENABLED } from "@/lib/features";
import { useAuth } from "../hooks/use-auth";
import { useAsk } from "../hooks/use-ask";
import AskForm from "../components/ai/AskForm";
import AnswerStream from "../components/ai/AnswerStream";

const EXAMPLES = ["มีข้อสอบ Database ไหม", "อธิบาย deadlock ให้เข้าใจง่าย ๆ", "แนะนำวิธีเตรียมตัวสอบ"];

export default function AskPage() {
  // Feature off: the page does not exist.
  if (!AI_ENABLED) notFound();
  return <AskContent />;
}

function AskContent() {
  const { isSignedIn } = useAuth();
  const { turns, busy, ask, stop, reset } = useAsk();
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the newest question in view as the conversation grows.
  useEffect(() => {
    if (turns.length > 0) endRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [turns.length]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 text-[#405168]">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1c2a48] sm:text-3xl">ถามรวมเล่ม</h1>
        {turns.length > 0 && !busy && (
          <button
            type="button"
            onClick={reset}
            className="rounded-3xl border border-[#e0e7f1] bg-white px-4 py-1.5 text-sm font-medium text-[#405168] hover:bg-[#f8f9fa] focus:outline-none focus:ring-2 focus:ring-[#405168]/40"
          >
            เริ่มบทสนทนาใหม่
          </button>
        )}
      </div>
      <p className="mb-6 text-[#7a8b99]">
        ถามได้ทั้งเรื่องข้อสอบในเว็บ (ตอบจากโพสต์พร้อมลิงก์ต้นทาง) และคำถามทั่วไปเกี่ยวกับการเรียน
      </p>

      {isSignedIn === null ? (
        <p>กำลังตรวจสอบการเข้าสู่ระบบ…</p>
      ) : !isSignedIn ? (
        <div className="rounded-2xl border border-[#dee5ed] bg-white p-6 text-center shadow-sm">
          <p className="mb-4">กรุณาเข้าสู่ระบบก่อนถามคำถาม</p>
          <Link
            href="/signin"
            className="inline-block rounded-3xl bg-[#405168] px-6 py-2 font-medium text-white hover:bg-[#2d3a4c]"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      ) : (
        <>
          {turns.length === 0 && (
            <div className="mb-6">
              <p className="mb-2 text-sm text-[#7a8b99]">ลองถามดู:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => ask(example)}
                    className="rounded-full border border-[#e0e7f1] bg-white px-4 py-1.5 text-sm text-[#405168] hover:bg-[#f8f9fa] focus:outline-none focus:ring-2 focus:ring-[#405168]/40"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((turn) => (
            <AnswerStream key={turn.id} state={turn} />
          ))}
          <div ref={endRef} />

          <div className="mt-6">
            <AskForm busy={busy} onSubmit={ask} onStop={stop} />
          </div>
        </>
      )}
    </main>
  );
}
