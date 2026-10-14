import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { StoredChat } from "@/lib/chat-store";
import ChatHistory, { formatWhen } from "./ChatHistory";

const NOW = Date.UTC(2026, 9, 14, 12, 0, 0);
const chat = (id: string, title: string, updatedAt: number, turns = 2): StoredChat => ({
  id,
  title,
  updatedAt,
  turns: Array.from({ length: turns }, () => ({ question: "q", text: "a", sources: [], status: "done" as const })),
});

const setup = (chats: StoredChat[], activeId: string | null = null, disabled = false) => {
  const handlers = { onNew: vi.fn(), onOpen: vi.fn(), onDelete: vi.fn(), onDeleteAll: vi.fn() };
  render(<ChatHistory chats={chats} activeId={activeId} disabled={disabled} {...handlers} />);
  return handlers;
};

describe("formatWhen", () => {
  it("says today, yesterday, days ago, then a date", () => {
    expect(formatWhen(NOW - 3600_000, NOW)).toBe("วันนี้");
    expect(formatWhen(NOW - 86_400_000 * 1.2, NOW)).toBe("เมื่อวาน");
    expect(formatWhen(NOW - 86_400_000 * 3, NOW)).toBe("3 วันที่แล้ว");
    expect(formatWhen(NOW - 86_400_000 * 30, NOW)).toMatch(/\d/);
  });
});

describe("ChatHistory", () => {
  it("lists saved chats with how many messages each has, and marks the open one", () => {
    setup([chat("1", "มีข้อสอบ Database ไหม", Date.now()), chat("2", "อธิบาย deadlock", Date.now(), 3)], "2");
    expect(screen.getByText("มีข้อสอบ Database ไหม")).toBeInTheDocument();
    expect(screen.getByText(/3 ข้อความ/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^อธิบาย deadlock/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /^มีข้อสอบ Database/ })).not.toHaveAttribute("aria-current");
  });

  it("opens a chat, starts a new one, and deletes one", async () => {
    const user = userEvent.setup();
    const h = setup([chat("1", "แชตแรก", Date.now())]);
    await user.click(screen.getByRole("button", { name: /^แชตแรก/ }));
    expect(h.onOpen).toHaveBeenCalledWith("1");
    await user.click(screen.getByRole("button", { name: "+ แชตใหม่" }));
    expect(h.onNew).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "ลบบทสนทนา แชตแรก" }));
    expect(h.onDelete).toHaveBeenCalledWith("1");
  });

  it("deleting everything needs a second click", async () => {
    const user = userEvent.setup();
    const h = setup([chat("1", "a", Date.now())]);
    await user.click(screen.getByRole("button", { name: "ลบประวัติทั้งหมด" }));
    expect(h.onDeleteAll).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "ยืนยันลบทั้งหมด" }));
    expect(h.onDeleteAll).toHaveBeenCalledTimes(1);
  });

  it("explains that chats stay in this browser, and shows an empty state", () => {
    setup([]);
    expect(screen.getByText(/ยังไม่มีบทสนทนาที่บันทึกไว้/)).toBeInTheDocument();
    expect(screen.getByText(/เก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ลบประวัติทั้งหมด" })).toBeNull();
  });

  it("cannot switch chats while an answer is coming in", () => {
    setup([chat("1", "แชตแรก", Date.now())], null, true);
    expect(screen.getByRole("button", { name: /^แชตแรก/ })).toBeDisabled();
    expect(within(screen.getByRole("navigation")).getByRole("button", { name: "+ แชตใหม่" })).toBeDisabled();
  });
});
