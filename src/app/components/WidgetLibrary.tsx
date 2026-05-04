"use client";

import { AlignLeft, CheckSquare, Columns3, Plus } from "lucide-react";
import { useState } from "react";

const widgets = [
  {
    category: "Productivity",
    description: "Checklist for board-level tasks",
    name: "Task List",
    icon: CheckSquare,
    type: "task_list",
    defaultContent: { title: "Tasks", tasks: [] },
    defaultWidth: 280,
    defaultHeight: 200,
  },
  {
    category: "Notes",
    description: "Quick-capture notes",
    name: "Notes",
    icon: AlignLeft,
    type: "notes",
    defaultContent: { title: "Notes", text: "" },
    defaultWidth: 300,
    defaultHeight: 160,
  },
  {
    category: "Productivity",
    description: "Visual columns for workflow stages",
    name: "Kanban",
    icon: Columns3,
    type: "kanban",
    defaultContent: {
      title: "Kanban",
      columns: [
        { id: "todo", title: "To Do", cards: [] },
        { id: "doing", title: "In Progress", cards: [] },
        { id: "done", title: "Done", cards: [] },
      ],
    },
    defaultWidth: 480,
    defaultHeight: 300,
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
    <section className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-3)" }}
        >
          Widgets
        </span>
      </div>

      {!activeBoardId && (
        <p className="text-xs" style={{ color: "var(--text-3)" }}>
          Select a board to add widgets.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {widgets.map((widget) => {
          const Icon = widget.icon;
          const isAdding = adding === widget.type;
          return (
            <button
              className="flex flex-col gap-1.5 rounded-xl border p-3 text-left text-xs transition-all disabled:opacity-40"
              disabled={!activeBoardId || isAdding}
              key={widget.name}
              onClick={() => addWidget(widget)}
              style={{
                background: "var(--bg-surface)",
                borderColor: "var(--border)",
              }}
              type="button"
              onMouseEnter={(e) => {
                if (activeBoardId)
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--accent)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--border)";
              }}
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{
                  background: "var(--accent-light)",
                  color: "var(--accent)",
                }}
              >
                {isAdding ? (
                  <span
                    className="h-3 w-3 animate-spin rounded-full border border-t-transparent"
                    style={{
                      borderColor: "var(--accent)",
                      borderTopColor: "transparent",
                    }}
                  />
                ) : (
                  <Icon size={14} />
                )}
              </div>
              <span
                className="font-semibold"
                style={{ color: "var(--text-1)" }}
              >
                {widget.name}
              </span>
              <span style={{ color: "var(--text-3)" }}>
                {widget.description}
              </span>
            </button>
          );
        })}

        {/* Placeholder for more widgets */}
        <button
          className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-3 text-xs transition-colors"
          disabled
          style={{
            borderColor: "var(--border)",
            color: "var(--text-3)",
          }}
          type="button"
        >
          <Plus size={16} />
          <span>More soon</span>
        </button>
      </div>
    </section>
  );
}
