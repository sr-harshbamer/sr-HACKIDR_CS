"use client";

import type { HighlightedPhrase } from "@/lib/types";
import { useMemo } from "react";

/**
 * Render `content` with every matched phrase wrapped in a highlight span.
 * Implementation detail: we build a regex union of escaped phrases and split
 * the content so the highlights remain visually identical to the original.
 */
export function HighlightedContent({
  content,
  phrases,
}: {
  content: string;
  phrases: HighlightedPhrase[];
}) {
  const parts = useMemo(() => {
    if (!phrases.length) return [{ text: content, highlight: null as string | null }];

    // Longest phrases first so nested matches go to the larger match
    const sorted = [...phrases].sort((a, b) => b.phrase.length - a.phrase.length);
    const escaped = sorted
      .map((p) => p.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .filter(Boolean);
    if (!escaped.length) return [{ text: content, highlight: null as string | null }];

    const re = new RegExp(`(${escaped.join("|")})`, "gi");
    const chunks = content.split(re);

    const phraseLookup = new Map<string, string>();
    for (const p of sorted) phraseLookup.set(p.phrase.toLowerCase(), p.reason);

    return chunks.map((chunk) => {
      const hit = phraseLookup.get(chunk.toLowerCase());
      return { text: chunk, highlight: hit ?? null };
    });
  }, [content, phrases]);

  return (
    <pre className="whitespace-pre-wrap break-words font-sans text-[15px] leading-relaxed text-ink-800">
      {parts.map((p, i) =>
        p.highlight ? (
          <span
            key={i}
            className="phrase-highlight"
            title={p.highlight}
          >
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </pre>
  );
}
