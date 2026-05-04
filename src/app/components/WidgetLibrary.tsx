"use client";

import { useState } from "react";

const widgets = [
  {
    category: "Productivity",
    description: "Checklist widget for board-level tasks.",
    name: "Task List",
    type: "task_list",
    defaultContent: { title: "Tasks", tasks: [] },
    defaultWidth: 280,
    defaultHeight: 200,
  },
  {
    category: "Notes",
    description: "Plain notes widget for quick capture.",
    name: "Notes",
    type: "notes",
    defaultContent: { title: "Notes", text: "" },
    defaultWidth: 300,
    defaultHeight: 160,
  },
];

type Props = {
  activeBoardId: string | null;
  onItemAdded?: () => void;
};

export function WidgetLibrary({ activeBoardId, onItemAdded }: Props) {
  const [adding, setAdding] = useState<string | null>(null);

  async function addWidget(widget: (typeof widgets)[number]) {
    if (!activeBoardId) return;
    setAdding(widget.type);
    try {
      await fetch("/api/canvas-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId: activeBoardId,
          type: widget.type,
          x: 40 + Math.random() * 80,
          y: 40 + Math.random() * 80,
          width: widget.defaultWidth,
          height: widget.defaultHeight,
          content: widget.defaultContent,
        }),
      });
      onItemAdded?.();
    } finally {
      setAdding(null);
    }
  }

  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold">Widgets</h2>
      <div className="mt-3 space-y-2">
        {widgets.map((widget) => (
          <button
            className="block w-full rounded-md border border-[#e7e0d0] bg-white p-3 text-left text-sm transition-colors hover:bg-[#f7f5ef] disabled:opacity-50"
            disabled={!activeBoardId || adding === widget.type}
            key={widget.name}
            onClick={() => addWidget(widget)}
            type="button"
          >
            <span className="block font-semibold">{widget.name}</span>
            <span className="mt-1 block text-xs text-[#6b7280]">
              {widget.category}
            </span>
            <span className="mt-2 block text-[#4b5563]">
              {widget.description}
            </span>
          </button>
        ))}
        {!activeBoardId && (
          <p className="px-1 text-xs text-[#9ca3af]">
            Select a board to add widgets.
          </p>
        )}
      </div>
    </section>
  );
}
