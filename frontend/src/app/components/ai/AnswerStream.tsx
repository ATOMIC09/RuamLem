import { ASK_ERROR_MESSAGES } from "@/lib/ask-messages";
import { isGeneralAnswer } from "@/lib/conversation";
import type { AskState } from "@/app/hooks/use-ask";
import SafeMarkdown from "./SafeMarkdown";
import SourceList from "./SourceList";

// The text that screen readers announce. It changes only when the answer is complete
// (or the state changes), never on every streamed token.
export function announcementFor(state: AskState): string {
  switch (state.status) {
    case "searching":
      return "กำลังค้นหาโพสต์ที่เกี่ยวข้อง";
    case "done":
      return `ตอบเสร็จแล้ว ${state.text}`;
    case "stopped":
      return "หยุดการตอบแล้ว";
    case "error":
      return state.error ? ASK_ERROR_MESSAGES[state.error] : "";
    default:
      return "";
  }
}

// One question and its answer.
export default function AnswerStream({ state }: { state: AskState }) {
  const { status, text, sources, error } = state;

  return (
    <div className="mt-6">
      <div role="status" aria-live="polite" className="sr-only">
        {announcementFor(state)}
      </div>

      <article
        aria-busy={status === "searching" || status === "streaming"}
        className="rounded-2xl border border-[#dee5ed] bg-white p-4 text-[#1c2a48] shadow-sm sm:p-6"
      >
        <p className="mb-3 break-words text-sm text-[#7a8b99]">คำถาม: {state.question}</p>

        {status === "searching" && (
          <p className="flex items-center gap-2 text-[#5e7593]">
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-[#405168] border-t-transparent"
              aria-hidden="true"
            />
            กำลังค้นหาโพสต์ที่เกี่ยวข้อง…
          </p>
        )}

        {text && <SafeMarkdown sources={sources}>{text}</SafeMarkdown>}

        {isGeneralAnswer(state) && (
          <p className="mt-3 rounded-lg bg-[#f1f4f8] px-3 py-2 text-xs text-[#5e7593]">
            คำตอบทั่วไป ไม่ได้อ้างอิงโพสต์ใน RuamLem (ไม่พบโพสต์ที่ตรงกับคำถามนี้)
          </p>
        )}

        {status === "stopped" && <p className="mt-3 text-sm text-[#7a8b99]">หยุดการตอบแล้ว</p>}

        {status === "error" && error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {ASK_ERROR_MESSAGES[error]}
          </p>
        )}

        <SourceList sources={sources} />
      </article>
    </div>
  );
}
