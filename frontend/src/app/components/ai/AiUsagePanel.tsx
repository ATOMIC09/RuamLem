"use client";

import { useEffect, useState } from "react";
import * as adminService from "@/services/admin.service";
import type { AiFeature, AiUsageSummary } from "@/services/admin.service";

const RANGES = [
  { days: 1, label: "วันนี้" },
  { days: 7, label: "7 วัน" },
  { days: 30, label: "30 วัน" },
  { days: 90, label: "90 วัน" },
] as const;

const FEATURE_LABEL: Record<AiFeature, string> = {
  ask: "ถามรวมเล่ม (แชต)",
  moderation: "ตรวจเนื้อหาอัตโนมัติ",
  embedding: "ทำดัชนีโพสต์",
};

const number = (n: number) => n.toLocaleString("th-TH");

export function formatCost(cost: number | null, currency: string): string {
  if (cost === null) return "–";
  const digits = cost > 0 && cost < 0.01 ? 4 : 2;
  return `${cost.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${currency}`;
}

// Admin dashboard for AI usage: tokens, requests and an estimated cost, by day, feature and user.
// The numbers hold counts only. A question, an answer or a post's text is never stored.
export default function AiUsagePanel() {
  const [days, setDays] = useState<number>(30);
  const [summary, setSummary] = useState<AiUsageSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminService.getAiUsage(days).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.error || !result.summary) {
        setError(result.error ?? "ไม่สามารถดึงข้อมูลการใช้งาน AI ได้");
        return;
      }
      setError("");
      setSummary(result.summary);
    });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const t = summary?.totals;
  const maxDay = Math.max(1, ...(summary?.byDay ?? []).map((d) => d.totalTokens));

  return (
    <section aria-labelledby="ai-usage-heading" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="ai-usage-heading" className="mb-1 text-2xl font-bold text-[#1c2a48]">
            การใช้งาน AI
          </h2>
          <p className="text-sm text-[#7a8b99]">
            เก็บเฉพาะตัวเลข (โทเคน จำนวนครั้ง เวลา) ไม่เก็บคำถาม คำตอบ หรือเนื้อหาโพสต์ วันที่นับตามเวลาประเทศไทย
          </p>
        </div>
        <div role="group" aria-label="ช่วงเวลา" className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              aria-pressed={days === r.days}
              onClick={() => setDays(r.days)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#405168]/40 ${
                days === r.days ? "bg-[#405168] text-white" : "bg-white text-[#405168] hover:bg-[#f1f4f8]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
          {/does not exist|ai_usage|schema cache|function/i.test(error) && (
            <span className="block pt-1 text-xs">ยังไม่ได้รันไฟล์ backend/sql/005_ai_usage.sql ใน Supabase</span>
          )}
        </p>
      )}

      {loading && !summary && <p className="p-8 text-center text-[#7a8b99]">กำลังโหลดข้อมูลการใช้งาน AI…</p>}

      {summary && t && (
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={loading}>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card label="จำนวนครั้ง" value={number(t.requests)} hint={`ผู้ใช้ ${number(t.activeUsers)} คน`} />
            <Card
              label="โทเคนรวม"
              value={number(t.totalTokens)}
              hint={`ถาม ${number(t.promptTokens)} · ตอบ ${number(t.completionTokens)} · ฝัง ${number(t.embeddingTokens)}`}
            />
            <Card
              label="ค่าใช้จ่ายโดยประมาณ"
              value={summary.pricesConfigured ? formatCost(t.cost, summary.currency) : "ยังไม่ตั้งราคา"}
              hint={summary.pricesConfigured ? "คำนวณจากราคาต่อล้านโทเคน" : "ตั้ง AI_PRICE_* ในไฟล์ .env ของ backend"}
            />
            <Card label="ปัญหา" value={number(t.problems)} hint={`เวลาเฉลี่ย ${number(t.avgLatencyMs)} ms`} />
          </div>

          <div className="mb-6 rounded-2xl border border-[#dee5ed] bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-lg font-bold text-[#1c2a48]">โทเคนต่อวัน</h3>
            <p className="mb-4 text-xs text-[#7a8b99]">
              <Dot color="bg-[#405168]" /> ถาม (prompt) <Dot color="bg-[#8aa4c4]" /> ตอบ (completion) <Dot color="bg-amber-400" /> ฝังข้อความ (embedding)
            </p>
            {summary.byDay.length === 0 ? (
              <p className="py-6 text-center text-[#7a8b99]">ยังไม่มีการใช้งานในช่วงนี้</p>
            ) : (
              <ol className="flex h-44 items-end gap-1 overflow-x-auto" aria-label="โทเคนต่อวัน">
                {summary.byDay.map((d) => {
                  const height = (d.totalTokens / maxDay) * 100;
                  const other = Math.max(0, d.totalTokens - d.promptTokens - d.completionTokens - d.embeddingTokens);
                  const part = (n: number) => (d.totalTokens > 0 ? (n / d.totalTokens) * 100 : 0);
                  return (
                    <li
                      key={d.day}
                      className="group flex h-full min-w-[14px] flex-1 flex-col justify-end"
                      title={`${d.day}: ${number(d.totalTokens)} โทเคน, ${number(d.requests)} ครั้ง${d.cost !== null ? `, ${formatCost(d.cost, summary.currency)}` : ""}`}
                    >
                      <span className="sr-only">
                        {d.day}: {number(d.totalTokens)} โทเคน {number(d.requests)} ครั้ง
                      </span>
                      <div className="flex w-full flex-col-reverse overflow-hidden rounded-t" style={{ height: `${Math.max(height, 2)}%` }} aria-hidden="true">
                        <div className="bg-[#405168]" style={{ height: `${part(d.promptTokens)}%` }} />
                        <div className="bg-[#8aa4c4]" style={{ height: `${part(d.completionTokens)}%` }} />
                        <div className="bg-amber-400" style={{ height: `${part(d.embeddingTokens)}%` }} />
                        <div className="bg-[#c5d0de]" style={{ height: `${part(other)}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
            {summary.byDay.length > 0 && (
              <div className="mt-2 flex justify-between text-xs text-[#7a8b99]">
                <span>{summary.byDay[0].day}</span>
                <span>{summary.byDay[summary.byDay.length - 1].day}</span>
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#dee5ed] bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-lg font-bold text-[#1c2a48]">แยกตามฟีเจอร์</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-[#7a8b99]">
                    <tr>
                      <th className="pb-2 pr-3 font-medium">ฟีเจอร์</th>
                      <th className="pb-2 pr-3 text-right font-medium">ครั้ง</th>
                      <th className="pb-2 pr-3 text-right font-medium">โทเคน</th>
                      <th className="pb-2 text-right font-medium">ค่าใช้จ่าย</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#405168]">
                    {summary.byFeature.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-[#7a8b99]">ยังไม่มีข้อมูล</td>
                      </tr>
                    )}
                    {summary.byFeature.map((f) => (
                      <tr key={f.feature} className="border-t border-[#f0f4f8]">
                        <td className="py-2 pr-3">{FEATURE_LABEL[f.feature] ?? f.feature}</td>
                        <td className="py-2 pr-3 text-right">{number(f.requests)}</td>
                        <td className="py-2 pr-3 text-right">{number(f.totalTokens)}</td>
                        <td className="py-2 text-right">{formatCost(f.cost, summary.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-[#dee5ed] bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-lg font-bold text-[#1c2a48]">ผู้ใช้ที่ใช้มากที่สุด</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-[#7a8b99]">
                    <tr>
                      <th className="pb-2 pr-3 font-medium">ผู้ใช้</th>
                      <th className="pb-2 pr-3 text-right font-medium">ครั้ง</th>
                      <th className="pb-2 pr-3 text-right font-medium">โทเคน</th>
                      <th className="pb-2 text-right font-medium">ค่าใช้จ่าย</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#405168]">
                    {summary.topUsers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-[#7a8b99]">ยังไม่มีข้อมูล</td>
                      </tr>
                    )}
                    {summary.topUsers.map((u) => (
                      <tr key={u.userId} className="border-t border-[#f0f4f8]">
                        <td className="max-w-[16rem] py-2 pr-3">
                          <div className="truncate font-medium">{u.name ?? "ไม่มีชื่อ"}</div>
                          <div className="truncate text-xs text-[#7a8b99]">{u.email ?? u.userId}</div>
                        </td>
                        <td className="py-2 pr-3 text-right">{number(u.requests)}</td>
                        <td className="py-2 pr-3 text-right">{number(u.totalTokens)}</td>
                        <td className="py-2 text-right">{formatCost(u.cost, summary.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <p className="mt-6 text-xs text-[#7a8b99]">
            เก็บประวัติสูงสุดประมาณ 200,000 รายการ เมื่อเต็มจะลบรายการที่เก่าที่สุดก่อน ตอนนี้มี {number(summary.rowsStored)} รายการ
            {summary.oldestRow ? ` เก่าสุดเมื่อ ${new Date(summary.oldestRow).toLocaleDateString("th-TH")}` : ""}
          </p>
        </div>
      )}
    </section>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[#dee5ed] bg-white p-5 shadow-sm">
      <div className="text-sm text-[#7a8b99]">{label}</div>
      <div className="mt-1 break-words text-2xl font-bold text-[#1c2a48]">{value}</div>
      {hint && <div className="mt-1 text-xs text-[#7a8b99]">{hint}</div>}
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span aria-hidden="true" className={`mr-1 ml-2 inline-block h-2.5 w-2.5 rounded-sm align-middle ${color}`} />;
}
