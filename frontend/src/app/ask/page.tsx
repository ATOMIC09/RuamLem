"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AI_ENABLED } from "@/lib/features";
import { useAuth } from "../hooks/use-auth";
import { useAsk } from "../hooks/use-ask";
import AskForm from "../components/ai/AskForm";
import AnswerStream from "../components/ai/AnswerStream";

export default function AskPage() {
  // Feature off: the page does not exist.
  if (!AI_ENABLED) notFound();
  return <AskContent />;
}

function AskContent() {
  const { isSignedIn } = useAuth();
  const { state, ask, stop } = useAsk();
  const busy = state.status === "searching" || state.status === "streaming";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 text-[#405168]">
      <h1 className="mb-1 text-2xl font-bold text-[#1c2a48] sm:text-3xl">ถามรวมเล่ม</h1>
      <p className="mb-6 text-[#7a8b99]">ตอบจากโพสต์ใน RuamLem เท่านั้น พร้อมลิงก์ไปยังโพสต์ต้นทาง</p>

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
          <AskForm busy={busy} onSubmit={ask} onStop={stop} />
          <AnswerStream state={state} />
        </>
      )}
    </main>
  );
}
