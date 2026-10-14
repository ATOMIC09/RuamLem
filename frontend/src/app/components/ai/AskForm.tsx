"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";

export const MAX_QUESTION_LENGTH = 500;

type Props = {
  busy: boolean;
  onSubmit: (question: string) => void;
  onStop: () => void;
};

export default function AskForm({ busy, onSubmit, onStop }: Props) {
  const [question, setQuestion] = useState("");
  const inputId = useId();
  const hintId = useId();
  const canSubmit = !busy && question.trim().length > 0;

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (canSubmit) onSubmit(question.trim());
  };

  // Enter sends, Shift+Enter adds a line, and Enter while composing (IME) does neither.
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor={inputId} className="block text-sm font-medium text-[#405168]">
        ถามอะไรเกี่ยวกับข้อสอบและสรุปวิชา
      </label>
      <textarea
        id={inputId}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={onKeyDown}
        maxLength={MAX_QUESTION_LENGTH}
        rows={3}
        aria-describedby={hintId}
        placeholder="เช่น มีข้อสอบ midterm วิชา Signals ไหม"
        className="w-full resize-y rounded-2xl border border-[#e0e7f1] bg-white p-3 text-[#1c2a48] shadow-sm focus:border-[#405168] focus:outline-none focus:ring-2 focus:ring-[#405168]/30"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id={hintId} className="text-xs text-[#7a8b99]">
          Enter เพื่อส่ง · Shift+Enter เพื่อขึ้นบรรทัดใหม่ · {question.length}/{MAX_QUESTION_LENGTH}
        </p>
        {/* Separate keys make Stop and Send two different DOM nodes. If React reused one <button>,
            clicking Stop would flip it back to type="submit" before the browser's default click
            action ran, and the form would be submitted again. */}
        {busy ? (
          <button
            key="stop"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onStop();
            }}
            className="rounded-3xl border border-[#405168] bg-white px-5 py-2 font-medium text-[#405168] hover:bg-[#f8f9fa] focus:outline-none focus:ring-2 focus:ring-[#405168]/40"
          >
            หยุด
          </button>
        ) : (
          <button
            key="send"
            type="submit"
            disabled={!canSubmit}
            className="rounded-3xl bg-[#405168] px-5 py-2 font-medium text-white hover:bg-[#2d3a4c] focus:outline-none focus:ring-2 focus:ring-[#405168]/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ถาม
          </button>
        )}
      </div>
    </form>
  );
}
