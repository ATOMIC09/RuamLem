import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as adminService from "@/services/admin.service";
import type { ModerationQueueItem } from "@/services/admin.service";
import ModerationQueue, { QUEUE_CHANGED_EVENT } from "./ModerationQueue";
import ModerationTabs from "./ModerationTabs";

vi.mock("@/services/admin.service", () => ({ getModerationQueue: vi.fn(), decideModeration: vi.fn() }));
const getQueue = vi.mocked(adminService.getModerationQueue);
const decide = vi.mocked(adminService.decideModeration);

const item = (over: Partial<ModerationQueueItem>): ModerationQueueItem => ({
  type: "post",
  id: 1,
  postId: 1,
  title: "ขายคอร์สลับ",
  body: "ทักไลน์ @cheap99",
  tags: ["In Dev"],
  files: [{ name: "a.pdf", size: 10 }],
  reason: "spam",
  detail: "โพสต์โฆษณา",
  appealed: false,
  author: { id: "u1", name: "Temp Tester" },
  createdAt: "2026-10-14T05:00:00.000Z",
  ...over,
});

beforeEach(() => {
  getQueue.mockReset();
  decide.mockReset();
});

describe("ModerationQueue", () => {
  it("lists held items with the AI's reason, explanation, author and text", async () => {
    getQueue.mockResolvedValue({ enabled: true, items: [item({ appealed: true }), item({ type: "comment", id: 9, title: null, body: "โทร 0812345678", reason: "personal_data", detail: null })] });
    render(<ModerationQueue />);

    expect(await screen.findByText("ขายคอร์สลับ")).toBeInTheDocument();
    expect(screen.getByText("ผู้เขียนขออุทธรณ์")).toBeInTheDocument();
    expect(screen.getByText(/เหตุผลที่ AI ส่งมา: ถูกจัดว่าเป็นสแปม/)).toBeInTheDocument();
    expect(screen.getByText(/บันทึกจาก AI: โพสต์โฆษณา/)).toBeInTheDocument();
    expect(screen.getByText("ทักไลน์ @cheap99")).toBeInTheDocument();
    expect(screen.getAllByText(/โดย Temp Tester/)).toHaveLength(2); // one per item
    expect(screen.getByText("ความเห็น #9")).toBeInTheDocument();
    expect(screen.getByText(/เหตุผลที่ AI ส่งมา: พบข้อมูลส่วนบุคคล/)).toBeInTheDocument();
  });

  it("approving publishes the item and removes it from the queue", async () => {
    getQueue.mockResolvedValue({ enabled: true, items: [item({}), item({ id: 2, title: "อีกโพสต์" })] });
    decide.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<ModerationQueue />);

    const first = (await screen.findByText("ขายคอร์สลับ")).closest("li")!;
    await user.click(within(first).getByRole("button", { name: "อนุมัติและเผยแพร่" }));

    expect(decide).toHaveBeenCalledWith("post", 1, "approve");
    await waitFor(() => expect(screen.queryByText("ขายคอร์สลับ")).toBeNull());
    expect(screen.getByText("อีกโพสต์")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("เผยแพร่แล้ว");
  });

  it("rejecting needs a second click, because an admin rejection is final", async () => {
    getQueue.mockResolvedValue({ enabled: true, items: [item({})] });
    decide.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<ModerationQueue />);

    await user.click(await screen.findByRole("button", { name: "ปฏิเสธ" }));
    expect(decide).not.toHaveBeenCalled(); // first click only asks to confirm

    await user.click(screen.getByRole("button", { name: /ยืนยันการปฏิเสธ/ }));
    expect(decide).toHaveBeenCalledWith("post", 1, "reject");
    await waitFor(() => expect(screen.queryByText("ขายคอร์สลับ")).toBeNull());
  });

  it("cancelling the confirmation does not reject", async () => {
    getQueue.mockResolvedValue({ enabled: true, items: [item({})] });
    const user = userEvent.setup();
    render(<ModerationQueue />);

    await user.click(await screen.findByRole("button", { name: "ปฏิเสธ" }));
    await user.click(screen.getByRole("button", { name: "ยกเลิก" }));
    expect(decide).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "ปฏิเสธ" })).toBeInTheDocument();
  });

  it("keeps the item and shows the error when saving fails", async () => {
    getQueue.mockResolvedValue({ enabled: true, items: [item({})] });
    decide.mockResolvedValue({ error: "บันทึกไม่สำเร็จ" });
    const user = userEvent.setup();
    render(<ModerationQueue />);

    await user.click(await screen.findByRole("button", { name: "อนุมัติและเผยแพร่" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("บันทึกไม่สำเร็จ");
    expect(screen.getByText("ขายคอร์สลับ")).toBeInTheDocument();
  });

  it("shows an empty state", async () => {
    getQueue.mockResolvedValue({ enabled: true, items: [] });
    render(<ModerationQueue />);
    expect(await screen.findByText(/ไม่มีรายการที่รอตรวจสอบ/)).toBeInTheDocument();
  });

  it("says moderation is off when the backend reports it", async () => {
    getQueue.mockResolvedValue({ enabled: false, items: [] });
    render(<ModerationQueue />);
    expect(await screen.findByText(/ระบบตรวจสอบอัตโนมัติปิดอยู่/)).toBeInTheDocument();
  });

  it("tells the tab bar how many items are left", async () => {
    getQueue.mockResolvedValue({ enabled: true, items: [item({}), item({ id: 2, title: "โพสต์ที่สอง" })] });
    const counts: number[] = [];
    const listener = (e: Event) => counts.push((e as CustomEvent<number>).detail);
    window.addEventListener(QUEUE_CHANGED_EVENT, listener);
    render(<ModerationQueue />);
    await screen.findByText("ขายคอร์สลับ");
    window.removeEventListener(QUEUE_CHANGED_EVENT, listener);
    expect(counts).toContain(2);
  });
});

describe("queue and tab bar together", () => {
  it("rejecting an item updates the badge without React's 'update a component while rendering' error", async () => {
    getQueue.mockResolvedValue({ enabled: true, items: [item({}), item({ id: 2, title: "โพสต์ที่สอง" })] });
    decide.mockResolvedValue({ success: true });
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    render(
      <>
        <ModerationTabs section="moderation" onChange={() => {}} />
        <ModerationQueue />
      </>,
    );

    const first = (await screen.findByText("ขายคอร์สลับ")).closest("li")!;
    await waitFor(() => expect(screen.getByRole("tab", { name: /ตรวจสอบเนื้อหา/ })).toHaveTextContent("2"));

    await user.click(within(first).getByRole("button", { name: "ปฏิเสธ" }));
    await user.click(within(first).getByRole("button", { name: /ยืนยันการปฏิเสธ/ }));

    await waitFor(() => expect(screen.getByRole("tab", { name: /ตรวจสอบเนื้อหา/ })).toHaveTextContent("1"));
    const warnings = errors.mock.calls.map((c) => String(c[0])).filter((m) => m.includes("while rendering a different component"));
    errors.mockRestore();
    expect(warnings).toEqual([]);
  });
});

describe("ModerationTabs", () => {
  it("renders nothing while moderation is off, so the admin page is unchanged", async () => {
    getQueue.mockResolvedValue({ enabled: false, items: [] });
    const { container } = render(<ModerationTabs section="overview" onChange={() => {}} />);
    await waitFor(() => expect(getQueue).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the queue cannot be loaded (for example, not an admin)", async () => {
    getQueue.mockResolvedValue({ error: "Access denied" });
    const { container } = render(<ModerationTabs section="overview" onChange={() => {}} />);
    await waitFor(() => expect(getQueue).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("shows both tabs with the waiting count when moderation is on, and switches section", async () => {
    getQueue.mockResolvedValue({ enabled: true, items: [item({}), item({ id: 2 }), item({ id: 3 })] });
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ModerationTabs section="overview" onChange={onChange} />);

    const moderationTab = await screen.findByRole("tab", { name: /ตรวจสอบเนื้อหา/ });
    expect(moderationTab).toHaveTextContent("3");
    expect(screen.getByRole("tab", { name: "ภาพรวม" })).toHaveAttribute("aria-selected", "true");

    await user.click(moderationTab);
    expect(onChange).toHaveBeenCalledWith("moderation");
  });
});
