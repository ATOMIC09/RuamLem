import Link from "next/link";
import type { AskSource } from "@/types/ai";

export default function SourceList({ sources }: { sources: AskSource[] }) {
  if (sources.length === 0) return null;

  return (
    <section aria-labelledby="ask-sources-heading" className="mt-6 border-t border-[#dee5ed] pt-4">
      <h2 id="ask-sources-heading" className="mb-2 text-sm font-semibold text-[#405168]">
        แหล่งที่มา
      </h2>
      <ol className="space-y-1">
        {sources.map((source) => (
          <li key={source.n} className="flex gap-2 text-sm">
            <span className="shrink-0 text-[#7a8b99]">[{source.n}]</span>
            <Link
              href={`/post/${source.postId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 break-words text-[#405168] underline hover:text-[#1c2a48]"
            >
              {source.title}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
