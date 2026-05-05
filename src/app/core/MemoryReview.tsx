"use client";

import { useState } from "react";

type MemoryEntry = {
  title: string;
  date: string;
  lines: string[];
};

function parseMemoryEntries(content: string): { header: string; entries: MemoryEntry[] } {
  const ENTRY_RE = /^## Board memory — (.+?) \((\d{4}-\d{2}-\d{2})\)\s*$/m;
  const firstMatch = content.search(ENTRY_RE);

  if (firstMatch === -1) return { header: content, entries: [] };

  const header = content.slice(0, firstMatch).trimEnd();
  const body = content.slice(firstMatch);
  const sections = body.split(/^(?=## Board memory — )/m).filter(Boolean);

  const entries: MemoryEntry[] = sections.map((section) => {
    const lines = section.trim().split("\n");
    const firstLine = lines[0] ?? "";
    const m = firstLine.match(/^## Board memory — (.+?) \((\d{4}-\d{2}-\d{2})\)/);
    return {
      title: m?.[1] ?? "Unknown board",
      date: m?.[2] ?? "",
      lines: lines.slice(1).filter((l) => l.trim()),
    };
  });

  return { header, entries };
}

export function MemoryReview({
  content,
  onClear,
}: {
  content: string;
  onClear: () => Promise<void>;
}) {
  const { entries } = parseMemoryEntries(content);
  const [clearing, setClearing] = useState(false);

  async function handleClear() {
    setClearing(true);
    try {
      await onClear();
    } finally {
      setClearing(false);
    }
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-[#9ca3af]">
        No board memory entries yet. Ask the assistant to &ldquo;remember this board&rdquo; to save a summary here.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#6b7280]">
          {entries.length} saved {entries.length === 1 ? "entry" : "entries"}
        </p>
        <button
          className="rounded-md border border-[#fca5a5] bg-[#fee2e2] px-3 py-1.5 text-xs font-semibold text-[#dc2626] disabled:opacity-50"
          disabled={clearing}
          onClick={handleClear}
          type="button"
        >
          {clearing ? "Clearing…" : "Clear all entries"}
        </button>
      </div>

      {entries.map((entry, i) => (
        <div
          className="rounded-md border border-[#e7e0d0] bg-[#f7f5ef] p-3"
          key={i}
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-[#1f2933]">{entry.title}</p>
            <span className="flex-shrink-0 text-xs text-[#9ca3af]">{entry.date}</span>
          </div>
          {entry.lines.map((line, j) => (
            <p className="mt-1 text-xs text-[#6b7280]" key={j}>
              {line.replace(/\*\*/g, "")}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}
