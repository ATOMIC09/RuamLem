import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as postService from "@/services/post.service";
import ModerationBadge from "./ModerationBadge";
import ModerationNotice from "./ModerationNotice";

vi.mock("@/services/post.service", () => ({ appeal: vi.fn() }));
const appeal = vi.mocked(postService.appeal);

beforeEach(() => appeal.mockReset());

describe("ModerationNotice", () => {
  it("shows nothing for a published item", () => {
    const { container } = render(<ModerationNotice kind="post" id={1} status="published" reason={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("a held post says it is under review and only the author can see it", () => {
    render(<ModerationNotice kind="post" id={1} status="held" reason="off_topic" />);
    expect(screen.getByRole("status")).toHaveTextContent("อยู่ระหว่างการตรวจสอบ");
    expect(screen.getByRole("status")).toHaveTextContent("เฉพาะคุณเท่านั้นที่มองเห็น");
    expect(screen.queryByRole("button")).toBeNull(); // nothing to appeal yet
  });

  it("a rejected post shows the reason and an appeal button", () => {
    render(<ModerationNotice kind="post" id={7} status="rejected" reason="spam" />);
    expect(screen.getByRole("status")).toHaveTextContent("ถูกปฏิเสธ");
    expect(screen.getByRole("status")).toHaveTextContent("สแปม");
    expect(screen.getByRole("button", { name: "ขอให้แอดมินตรวจสอบ" })).toBeInTheDocument();
  });

  it("appealing moves it to 'held', calls the backend, and removes the button", async () => {
    appeal.mockResolvedValue({ moderation: { status: "held", reason: "spam" } });
    const onAppealed = vi.fn();
    const user = userEvent.setup();
    render(<ModerationNotice kind="post" id={7} status="rejected" reason="spam" onAppealed={onAppealed} />);

    await user.click(screen.getByRole("button", { name: "ขอให้แอดมินตรวจสอบ" }));

    expect(appeal).toHaveBeenCalledWith("post", 7);
    expect(onAppealed).toHaveBeenCalledWith({ status: "held", reason: "spam" });
    expect(await screen.findByText(/ส่งให้ผู้ดูแลระบบตรวจสอบอีกครั้งแล้ว/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("appeals a comment through the comment endpoint", async () => {
    appeal.mockResolvedValue({ moderation: { status: "held", reason: "abuse" } });
    const user = userEvent.setup();
    render(<ModerationNotice kind="comment" id={3} status="rejected" reason="abuse" />);
    await user.click(screen.getByRole("button", { name: "ขอให้แอดมินตรวจสอบ" }));
    expect(appeal).toHaveBeenCalledWith("comment", 3);
  });

  it("shows the error and keeps the button when the appeal fails", async () => {
    appeal.mockResolvedValue({ error: "เครือข่ายขัดข้อง" });
    const user = userEvent.setup();
    render(<ModerationNotice kind="post" id={7} status="rejected" reason="spam" />);
    await user.click(screen.getByRole("button", { name: "ขอให้แอดมินตรวจสอบ" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("เครือข่ายขัดข้อง");
    expect(screen.getByRole("button", { name: "ขอให้แอดมินตรวจสอบ" })).toBeEnabled();
  });

  it("an admin's rejection has no appeal button and says why", () => {
    render(<ModerationNotice kind="post" id={7} status="rejected" reason="admin_rejected" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("ไม่สามารถอุทธรณ์ได้");
  });

  it("an appealed post waiting for an admin says so", () => {
    render(<ModerationNotice kind="post" id={7} status="held" reason="spam" appealed />);
    expect(screen.getByRole("status")).toHaveTextContent("ส่งให้ผู้ดูแลระบบตรวจสอบอีกครั้งแล้ว");
  });
});

describe("ModerationBadge", () => {
  it("renders nothing for published or missing status", () => {
    expect(render(<ModerationBadge status="published" />).container).toBeEmptyDOMElement();
    expect(render(<ModerationBadge />).container).toBeEmptyDOMElement();
  });

  it("labels held, appealed and rejected items", () => {
    const { rerender } = render(<ModerationBadge status="held" />);
    expect(screen.getByText("รอผู้ดูแลตรวจสอบ")).toBeInTheDocument();
    rerender(<ModerationBadge status="held" appealed />);
    expect(screen.getByText("ส่งให้ผู้ดูแลตรวจสอบแล้ว")).toBeInTheDocument();
    rerender(<ModerationBadge status="rejected" />);
    expect(screen.getByText("ถูกปฏิเสธ")).toBeInTheDocument();
  });
});
