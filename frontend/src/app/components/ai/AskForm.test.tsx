import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import AskForm from "./AskForm";

// Mimics the page: submitting makes the form busy, Stop makes it idle again.
function Harness({ onAsk, onStopped }: { onAsk: (q: string) => void; onStopped: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <AskForm
      busy={busy}
      onSubmit={(q) => {
        onAsk(q);
        setBusy(true);
      }}
      onStop={() => {
        onStopped();
        setBusy(false);
      }}
    />
  );
}

describe("AskForm", () => {
  it("clicking Stop stops, and does not submit the form again", async () => {
    const user = userEvent.setup();
    const onAsk = vi.fn();
    const onStopped = vi.fn();
    render(<Harness onAsk={onAsk} onStopped={onStopped} />);

    await user.type(screen.getByLabelText(/ถามอะไรเกี่ยวกับข้อสอบ/), "มีข้อสอบ Signals ไหม");
    await user.click(screen.getByRole("button", { name: "ถาม" }));
    expect(onAsk).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "หยุด" }));
    expect(onStopped).toHaveBeenCalledTimes(1);
    expect(onAsk).toHaveBeenCalledTimes(1); // the bug: Stop used to submit a second question
  });

  it("renders Stop and Send as different DOM nodes", async () => {
    // Regression: one reused <button> flipped back to type="submit" during the Stop click,
    // so the browser submitted the form again and started a second request.
    const user = userEvent.setup();
    render(<Harness onAsk={() => {}} onStopped={() => {}} />);

    await user.type(screen.getByLabelText(/ถามอะไรเกี่ยวกับข้อสอบ/), "คำถาม");
    const sendButton = screen.getByRole("button", { name: "ถาม" });
    await user.click(sendButton);
    const stopButton = screen.getByRole("button", { name: "หยุด" });

    expect(stopButton).not.toBe(sendButton);
    expect(stopButton).toHaveAttribute("type", "button");
  });

  it("Enter sends, Shift+Enter does not", async () => {
    const user = userEvent.setup();
    const onAsk = vi.fn();
    render(<Harness onAsk={onAsk} onStopped={() => {}} />);
    const box = screen.getByLabelText(/ถามอะไรเกี่ยวกับข้อสอบ/);

    await user.type(box, "คำถาม{Shift>}{Enter}{/Shift}ต่อ");
    expect(onAsk).not.toHaveBeenCalled();
    expect(box).toHaveValue("คำถาม\nต่อ");

    await user.type(box, "{Enter}");
    expect(onAsk).toHaveBeenCalledWith("คำถาม\nต่อ");
  });

  it("ignores blank questions and limits length to 500", async () => {
    const user = userEvent.setup();
    const onAsk = vi.fn();
    render(<Harness onAsk={onAsk} onStopped={() => {}} />);
    const box = screen.getByLabelText(/ถามอะไรเกี่ยวกับข้อสอบ/);

    expect(screen.getByRole("button", { name: "ถาม" })).toBeDisabled();
    await user.type(box, "   {Enter}");
    expect(onAsk).not.toHaveBeenCalled();
    expect(box).toHaveAttribute("maxlength", "500");
  });
});
