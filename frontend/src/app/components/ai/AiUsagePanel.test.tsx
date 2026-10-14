import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as adminService from "@/services/admin.service";
import type { AiUsageSummary } from "@/services/admin.service";
import AiUsagePanel, { formatCost } from "./AiUsagePanel";

vi.mock("@/services/admin.service", () => ({ getAiUsage: vi.fn() }));
const getUsage = vi.mocked(adminService.getAiUsage);

const tokens = (over: Partial<AiUsageSummary["totals"]> = {}) => ({
  requests: 10,
  promptTokens: 8000,
  completionTokens: 1500,
  embeddingTokens: 500,
  totalTokens: 10000,
  cost: 0.0123 as number | null,
  ...over,
});

const summary = (over: Partial<AiUsageSummary> = {}): AiUsageSummary => ({
  since: "2026-10-01T00:00:00Z",
  days: 30,
  rowsStored: 1234,
  oldestRow: "2026-10-01T05:00:00Z",
  currency: "USD",
  pricesConfigured: true,
  totals: { ...tokens({ cost: 1.5 }), problems: 2, avgLatencyMs: 1800, activeUsers: 3 },
  byFeature: [
    { feature: "ask", ...tokens({ requests: 6, totalTokens: 7000, cost: 0.01 }) },
    { feature: "moderation", ...tokens({ requests: 3, totalTokens: 2500, cost: 0.002 }) },
    { feature: "embedding", ...tokens({ requests: 1, totalTokens: 500, cost: null }) },
  ],
  byDay: [
    { day: "2026-10-13", ...tokens({ totalTokens: 4000 }) },
    { day: "2026-10-14", ...tokens({ totalTokens: 6000 }) },
  ],
  topUsers: [
    { userId: "u1", name: "Atomic Admin", email: "admin@example.com", lastUsed: "2026-10-14T05:00:00Z", ...tokens({ totalTokens: 9000, requests: 8 }) },
    { userId: "u2", name: null, email: null, lastUsed: "2026-10-14T05:00:00Z", ...tokens({ totalTokens: 1000, requests: 2 }) },
  ],
  ...over,
});

beforeEach(() => getUsage.mockReset());

describe("formatCost", () => {
  it("shows a dash when the cost is unknown, and enough digits for tiny amounts", () => {
    expect(formatCost(null, "USD")).toBe("–");
    expect(formatCost(12.3456, "THB")).toBe("12.35 THB");
    expect(formatCost(0.0012, "USD")).toBe("0.0012 USD");
    expect(formatCost(0, "USD")).toBe("0.00 USD");
  });
});

describe("AiUsagePanel", () => {
  it("shows the totals, the cost estimate, the features and the top users", async () => {
    getUsage.mockResolvedValue({ summary: summary() });
    render(<AiUsagePanel />);

    expect(await screen.findByText("10,000")).toBeInTheDocument(); // total tokens
    expect(screen.getByText("1.50 USD")).toBeInTheDocument(); // estimated cost of the total
    expect(screen.getByText("ถามรวมเล่ม (แชต)")).toBeInTheDocument();
    expect(screen.getByText("ตรวจเนื้อหาอัตโนมัติ")).toBeInTheDocument();
    expect(screen.getByText("ทำดัชนีโพสต์")).toBeInTheDocument();
    expect(screen.getByText("Atomic Admin")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("ไม่มีชื่อ")).toBeInTheDocument(); // a user whose profile has no name
    expect(screen.getByText(/ตอนนี้มี 1,234 รายการ/)).toBeInTheDocument();
  });

  it("loads the last 30 days first, and reloads when another range is chosen", async () => {
    getUsage.mockResolvedValue({ summary: summary() });
    const user = userEvent.setup();
    render(<AiUsagePanel />);

    await screen.findByText("10,000");
    expect(getUsage).toHaveBeenLastCalledWith(30);
    expect(screen.getByRole("button", { name: "30 วัน" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "วันนี้" }));
    await waitFor(() => expect(getUsage).toHaveBeenLastCalledWith(1));
    expect(screen.getByRole("button", { name: "วันนี้" })).toHaveAttribute("aria-pressed", "true");
  });

  it("says prices are not set, instead of showing a misleading zero cost", async () => {
    getUsage.mockResolvedValue({ summary: summary({ pricesConfigured: false, totals: { ...tokens({ cost: null }), problems: 0, avgLatencyMs: 0, activeUsers: 1 } }) });
    render(<AiUsagePanel />);
    expect(await screen.findByText("ยังไม่ตั้งราคา")).toBeInTheDocument();
    expect(screen.getByText(/AI_PRICE_/)).toBeInTheDocument();
  });

  it("has an empty state with no usage yet", async () => {
    getUsage.mockResolvedValue({ summary: summary({ byDay: [], byFeature: [], topUsers: [], oldestRow: null, rowsStored: 0, totals: { ...tokens({ requests: 0, totalTokens: 0, promptTokens: 0, completionTokens: 0, embeddingTokens: 0, cost: 0 }), problems: 0, avgLatencyMs: 0, activeUsers: 0 } }) });
    render(<AiUsagePanel />);
    expect(await screen.findByText("ยังไม่มีการใช้งานในช่วงนี้")).toBeInTheDocument();
    expect(screen.getAllByText("ยังไม่มีข้อมูล")).toHaveLength(2);
  });

  it("gives every day of the chart an accessible text", async () => {
    getUsage.mockResolvedValue({ summary: summary() });
    render(<AiUsagePanel />);
    const chart = await screen.findByRole("list", { name: "โทเคนต่อวัน" });
    expect(within(chart).getAllByRole("listitem")).toHaveLength(2);
    expect(within(chart).getByText(/2026-10-14: 6,000 โทเคน/)).toBeInTheDocument();
  });

  it("explains how to fix it when the database part is missing", async () => {
    getUsage.mockResolvedValue({ error: "Could not find the function public.admin_ai_usage_summary in the schema cache" });
    render(<AiUsagePanel />);
    expect(await screen.findByRole("alert")).toHaveTextContent("005_ai_usage.sql");
  });

  it("shows another error as it is", async () => {
    getUsage.mockResolvedValue({ error: "Access denied" });
    render(<AiUsagePanel />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Access denied");
    expect(alert).not.toHaveTextContent("005_ai_usage.sql");
  });
});
