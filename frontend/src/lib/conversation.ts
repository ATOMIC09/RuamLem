import type { AskFailure } from "@/lib/ask-messages";
import type { AskSource } from "@/types/ai";

export type AskStatus = "searching" | "streaming" | "done" | "stopped" | "error";

// One question and its answer.
export type Turn = {
  id: number;
  question: string;
  text: string;
  sources: AskSource[];
  status: AskStatus;
  error: AskFailure | null;
};

export type HistoryMessage = { role: "user" | "assistant"; content: string };

// The backend keeps only the last 8 messages (4 question and answer pairs).
export const MAX_HISTORY_MESSAGES = 8;

// What the model is told about the conversation so far: every earlier turn that produced an answer.
// A failed turn, or one stopped before any text arrived, is left out so it cannot confuse a follow-up.
export function buildHistory(turns: Turn[]): HistoryMessage[] {
  const messages: HistoryMessage[] = [];
  for (const turn of turns) {
    if ((turn.status === "done" || turn.status === "stopped") && turn.text.trim()) {
      messages.push({ role: "user", content: turn.question });
      messages.push({ role: "assistant", content: turn.text });
    }
  }
  return messages.slice(-MAX_HISTORY_MESSAGES);
}

// A finished answer that cites no post came from the model's general knowledge, not from RuamLem.
export function isGeneralAnswer(turn: Pick<Turn, "status" | "sources" | "text">): boolean {
  return (turn.status === "done" || turn.status === "stopped") && turn.sources.length === 0 && turn.text.trim().length > 0;
}
