import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AskState } from "@/app/hooks/use-ask";
import AnswerStream, { announcementFor } from "./AnswerStream";

const base: AskState = {
  status: "idle",
  question: "มีข้อสอบ Signals ไหม",
  text: "",
  sources: [{ n: 1, postId: 33, title: "มิดเทอม Signal ปี 2566" }],
  error: null,
};

describe("AnswerStream", () => {
  it("renders nothing when idle", () => {
    const { container } = render(<AnswerStream state={base} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("does not announce streamed tokens, only the finished answer", () => {
    const { rerender } = render(<AnswerStream state={{ ...base, status: "streaming", text: "มีข้อ" }} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    rerender(<AnswerStream state={{ ...base, status: "streaming", text: "มีข้อสอบมิดเทอม" }} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    rerender(<AnswerStream state={{ ...base, status: "done", text: "มีข้อสอบมิดเทอม [1]" }} />);
    expect(screen.getByRole("status")).toHaveTextContent("ตอบเสร็จแล้ว มีข้อสอบมิดเทอม [1]");
  });

  it("marks the answer busy while searching or streaming", () => {
    const { rerender } = render(<AnswerStream state={{ ...base, status: "searching" }} />);
    expect(screen.getByRole("article")).toHaveAttribute("aria-busy", "true");
    rerender(<AnswerStream state={{ ...base, status: "done", text: "ok" }} />);
    expect(screen.getByRole("article")).toHaveAttribute("aria-busy", "false");
  });

  it("shows the no-match message without a source list", () => {
    render(<AnswerStream state={{ ...base, status: "no_match", sources: [] }} />);
    expect(screen.getAllByText("ไม่พบโพสต์ที่เกี่ยวข้องใน RuamLem").length).toBeGreaterThan(0);
    expect(screen.queryByText("แหล่งที่มา")).toBeNull();
  });

  it.each([
    ["rate_limited", "ครบจำนวน"],
    ["content_filtered", "ตัวกรอง"],
    ["unavailable", "ไม่พร้อมใช้งาน"],
    ["ai_disabled", "ยังไม่เปิดใช้งาน"],
    ["unauthorized", "เข้าสู่ระบบ"],
  ] as const)("shows a specific message for %s", (error, fragment) => {
    render(<AnswerStream state={{ ...base, status: "error", error }} />);
    expect(screen.getByRole("alert")).toHaveTextContent(fragment);
  });

  it("keeps the partial answer and lists sources after Stop", () => {
    render(<AnswerStream state={{ ...base, status: "stopped", text: "มีข้อสอบ" }} />);
    expect(screen.getAllByText(/มีข้อสอบ/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "มิดเทอม Signal ปี 2566" })).toHaveAttribute("href", "/post/33");
  });
});

describe("announcementFor", () => {
  it("is empty while streaming", () => {
    expect(announcementFor({ ...base, status: "streaming", text: "abc" })).toBe("");
  });
});
