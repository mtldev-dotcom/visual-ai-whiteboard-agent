"use client";

import { CheckSquare, Columns3, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  const sectionRef = useRef<HTMLElement>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [previewWidget, setPreviewWidget] = useState<
    (typeof widgets)[number] | null
  >(null);
  const PreviewIcon = previewWidget?.icon;

  useEffect(() => {
    function openWidgets() {
      sectionRef.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }
    window.addEventListener("visual-whiteboard:open-widgets", openWidgets);
    return () =>
      window.removeEventListener("visual-whiteboard:open-widgets", openWidgets);
  }, []);

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
      setPreviewWidget(null);
    } finally {
      setAdding(null);
    }
  }

  return (
    <section className="mt-4" ref={sectionRef}>
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
              onClick={() => setPreviewWidget(widget)}
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

      {previewWidget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "var(--bg-overlay)" }}
          onClick={() => setPreviewWidget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border p-4"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border)",
              boxShadow: "var(--shadow-xl)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: "var(--accent-light)",
                  color: "var(--accent)",
                }}
              >
                {PreviewIcon && <PreviewIcon size={18} />}
              </div>
              <div className="min-w-0">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-1)" }}
                >
                  {previewWidget.name}
                </h3>
                <p className="mt-1 text-xs" style={{ color: "var(--text-3)" }}>
                  {previewWidget.description}
                </p>
              </div>
            </div>

            <WidgetPreview widget={previewWidget} />

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-xl border px-4 py-2 text-sm"
                onClick={() => setPreviewWidget(null)}
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-2)",
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
                disabled={!activeBoardId || adding === previewWidget.type}
                onClick={() => addWidget(previewWidget)}
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                }}
                type="button"
              >
                {adding === previewWidget.type ? "Adding..." : "Add to board"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function WidgetPreview({ widget }: { widget: (typeof widgets)[number] }) {
  if (widget.type === "task_list") {
    return (
      <div
        className="rounded-xl border p-3"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--text-1)" }}
          >
            Tasks
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
            0/3
          </span>
        </div>
        {["Capture ideas", "Prioritize next step", "Review board"].map(
          (task) => (
            <div className="mb-1.5 flex items-center gap-2" key={task}>
              <span
                className="h-3 w-3 rounded-sm border"
                style={{ borderColor: "var(--border-strong)" }}
              />
              <span className="text-xs" style={{ color: "var(--text-2)" }}>
                {task}
              </span>
            </div>
          ),
        )}
      </div>
    );
  }

  if (widget.type === "kanban") {
    return (
      <div
        className="grid grid-cols-3 gap-2 rounded-xl border p-3"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
        }}
      >
        {["To Do", "In Progress", "Done"].map((column, index) => (
          <div
            className="min-h-24 rounded-lg p-2"
            key={column}
            style={{ background: "var(--bg-app)" }}
          >
            <p
              className="mb-2 text-[10px] font-bold uppercase"
              style={{ color: "var(--text-3)" }}
            >
              {column}
            </p>
            {index < 2 && (
              <div
                className="rounded-md border px-2 py-1.5 text-[11px]"
                style={{
                  background: "var(--bg-surface)",
                  borderColor: "var(--border)",
                  color: "var(--text-1)",
                }}
              >
                Sample card
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-3"
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border)",
      }}
    >
      <p
        className="mb-2 text-xs font-semibold"
        style={{ color: "var(--text-1)" }}
      >
        Widget
      </p>
      <div className="space-y-1.5">
        <div className="h-2 rounded" style={{ background: "var(--border)" }} />
        <div
          className="h-2 w-5/6 rounded"
          style={{ background: "var(--border)" }}
        />
        <div
          className="h-2 w-2/3 rounded"
          style={{ background: "var(--border)" }}
        />
      </div>
    </div>
  );
}
