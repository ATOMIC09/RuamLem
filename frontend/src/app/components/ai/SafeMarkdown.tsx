import Link from "next/link";
import Markdown, { type Components } from "react-markdown";
import type { AskSource } from "@/types/ai";

// Model output is untrusted. This renderer is deliberately narrow:
//  - no rehype-raw, so HTML in the text is shown as plain text, never parsed
//  - images are removed (a markdown image to an attacker's URL leaks data when it loads)
//  - the only links that survive point at RuamLem's own post pages; any other link
//    keeps its text and loses its URL
const POST_PATH = /^\/post\/\d+$/;

// Turns [n] into a link to /post/<id>, but only for sources that were actually sent.
// `(?!\()` leaves a model-written "[1](https://...)" alone, so it can't turn into a link.
export function linkCitations(text: string, sources: AskSource[]): string {
  const postIdByN = new Map(sources.map((s) => [s.n, s.postId]));
  return text.replace(/\[(\d+)\](?!\()/g, (match, n) => {
    const postId = postIdByN.get(Number(n));
    return postId ? `[\\[${n}\\]](/post/${postId})` : match;
  });
}

const components: Components = {
  a({ href, children }) {
    if (typeof href !== "string" || !POST_PATH.test(href)) return <span>{children}</span>;
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-[#405168] underline hover:text-[#1c2a48]"
      >
        {children}
      </Link>
    );
  },
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-6">{children}</ol>,
  h1: ({ children }) => <p className="mb-2 text-lg font-bold">{children}</p>,
  h2: ({ children }) => <p className="mb-2 text-lg font-bold">{children}</p>,
  h3: ({ children }) => <p className="mb-2 font-bold">{children}</p>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  code: ({ children }) => <code className="rounded bg-[#f1f4f8] px-1 py-0.5 text-sm">{children}</code>,
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg bg-[#f1f4f8] p-3 text-sm">{children}</pre>
  ),
};

type Props = { children: string; sources?: AskSource[] };

export default function SafeMarkdown({ children, sources = [] }: Props) {
  return (
    <div className="break-words">
      <Markdown
        components={components}
        disallowedElements={["img"]}
        unwrapDisallowed
        urlTransform={(url) => (POST_PATH.test(url) ? url : "")}
      >
        {linkCitations(children, sources)}
      </Markdown>
    </div>
  );
}
