"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { CanvasToolbar, type CanvasTool } from "./CanvasToolbar";
import { SandboxedHtmlWidget } from "./SandboxedHtmlWidget";

const zoomStep = 0.1;
const minZoom = 0.3;
const maxZoom = 2.5;
const DEBOUNCE_MS = 600;

type CanvasItemContent = {
  title?: string;
  text?: string;
  alt?: string;
  href?: string;
  html?: string;
  src?: string;
  tasks?: { completed: boolean; title: string }[];
};

type CanvasItem = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: CanvasItemContent;
};

type EditState = { itemId: string; title: string; text: string } | null;
type ConfirmState = { itemId: string } | null;

function clampZoom(v: number) {
  return Math.min(maxZoom, Math.max(minZoom, v));
}

function ItemCard({ item, onEdit }: { item: CanvasItem; onEdit: () => void }) {
  const base =
    "absolute inset-0 overflow-hidden rounded-xl border text-sm transition-shadow";

  if (item.type === "sticky_note") {
    return (
      <div
        className={`${base} flex flex-col`}
        style={{
          background: "#fef9c3",
          borderColor: "#fde047",
          boxShadow: "2px 3px 8px rgba(0,0,0,0.12)",
        }}
      >
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ background: "#fef08a", borderBottom: "1px solid #fde047" }}
        >
          <span className="truncate text-xs font-semibold text-yellow-900">
            {item.content.title || "Note"}
          </span>
          <button
            className="ml-1 shrink-0 rounded px-1 py-0.5 text-xs text-yellow-700 hover:bg-yellow-200"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            type="button"
          >
            Edit
          </button>
        </div>
        <p className="flex-1 overflow-hidden px-3 py-2 text-xs leading-relaxed text-yellow-900 whitespace-pre-line">
          {item.content.text}
        </p>
      </div>
    );
  }

  if (item.type === "text") {
    return (
      <div
        className={`${base} flex flex-col`}
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          className="flex items-center justify-between border-b px-3 py-2"
          style={{ borderColor: "var(--border)" }}
        >
          <span
            className="truncate text-xs font-semibold"
            style={{ color: "var(--text-1)" }}
          >
            {item.content.title}
          </span>
          <button
            className="ml-1 shrink-0 rounded px-1 py-0.5 text-xs transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            style={{ color: "var(--text-3)" }}
            type="button"
          >
            Edit
          </button>
        </div>
        <p
          className="flex-1 overflow-hidden px-3 py-2 text-xs leading-relaxed whitespace-pre-line"
          style={{ color: "var(--text-2)" }}
        >
          {item.content.text}
        </p>
      </div>
    );
  }

  if (item.type === "markdown") {
    return (
      <div
        className={`${base} flex flex-col`}
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--accent)",
          borderLeftWidth: "3px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--accent)" }}
        >
          Markdown
        </div>
        <pre
          className="flex-1 overflow-hidden px-3 pb-3 text-xs leading-relaxed font-mono whitespace-pre-wrap"
          style={{ color: "var(--text-1)" }}
        >
          {item.content.text}
        </pre>
      </div>
    );
  }

  if (item.type === "image") {
    return (
      <div
        className={`${base} flex flex-col items-center justify-center gap-2 p-3`}
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <Image
          alt={item.content.alt ?? ""}
          className="h-16 w-full object-contain opacity-80"
          height={64}
          src={item.content.src ?? "/globe.svg"}
          width={200}
        />
        <p
          className="text-center text-xs font-medium"
          style={{ color: "var(--text-1)" }}
        >
          {item.content.title}
        </p>
      </div>
    );
  }

  if (item.type === "link") {
    return (
      <div
        className={`${base} flex flex-col`}
        style={{
          background: "var(--bg-surface)",
          borderColor: "#93c5fd",
          borderTopWidth: "3px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="px-3 pt-2">
          <p
            className="text-xs font-semibold"
            style={{ color: "var(--text-1)" }}
          >
            {item.content.title}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-2)" }}>
            {item.content.text}
          </p>
        </div>
        <a
          className="mt-auto truncate px-3 pb-3 pt-2 text-xs font-medium"
          href={item.content.href}
          style={{ color: "#3b82f6" }}
        >
          {item.content.href}
        </a>
      </div>
    );
  }

  if (item.type === "task_list") {
    const tasks = item.content.tasks ?? [];
    const done = tasks.filter((t) => t.completed).length;
    return (
      <div
        className={`${base} flex flex-col`}
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          className="flex items-center justify-between border-b px-3 py-2"
          style={{ borderColor: "var(--border)" }}
        >
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--text-1)" }}
          >
            {item.content.title}
          </span>
          {tasks.length > 0 && (
            <span
              className="text-[10px] font-medium"
              style={{ color: "var(--text-3)" }}
            >
              {done}/{tasks.length}
            </span>
          )}
        </div>
        <ul className="flex-1 overflow-hidden px-3 py-2 space-y-1.5">
          {tasks.length === 0 && (
            <li className="text-xs italic" style={{ color: "var(--text-3)" }}>
              No tasks yet
            </li>
          )}
          {tasks.map((task, i) => (
            <li className="flex items-start gap-2" key={i}>
              <span
                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm border flex items-center justify-center"
                style={{
                  borderColor: task.completed
                    ? "var(--accent)"
                    : "var(--border-strong)",
                  background: task.completed ? "var(--accent)" : "transparent",
                }}
              >
                {task.completed && (
                  <svg viewBox="0 0 10 10" fill="none" className="h-2 w-2">
                    <path
                      d="M2 5l2.5 2.5L8 3"
                      stroke="var(--accent-fg)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span
                className="text-xs leading-tight"
                style={{
                  color: task.completed ? "var(--text-3)" : "var(--text-1)",
                  textDecoration: task.completed ? "line-through" : "none",
                }}
              >
                {task.title}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (item.type === "notes") {
    return (
      <div
        className={`${base} flex flex-col`}
        style={{
          background: "#fffbf0",
          borderColor: "#fed7aa",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          className="flex items-center justify-between border-b px-3 py-2"
          style={{ borderBottom: "1px solid #fed7aa" }}
        >
          <span className="text-xs font-semibold text-orange-900">
            {item.content.title}
          </span>
          <button
            className="ml-1 shrink-0 rounded px-1 py-0.5 text-xs text-orange-500 hover:bg-orange-100"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            type="button"
          >
            Edit
          </button>
        </div>
        <p className="flex-1 overflow-hidden px-3 py-2 text-xs leading-relaxed text-orange-900 whitespace-pre-line">
          {item.content.text}
        </p>
      </div>
    );
  }

  if (item.type === "html_widget") {
    return (
      <div
        className={`${base} p-0`}
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <SandboxedHtmlWidget
          html={item.content.html ?? ""}
          title={item.content.title ?? "Widget"}
        />
      </div>
    );
  }

  // Default / custom_html
  return (
    <div
      className={`${base} flex flex-col`}
      style={{
        background: "var(--bg-surface)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        className="border-b px-3 py-2 text-xs font-semibold"
        style={{
          borderColor: "var(--border)",
          color: "var(--text-1)",
        }}
      >
        {item.content.title ?? item.type}
      </div>
      <p
        className="flex-1 overflow-hidden px-3 py-2 text-xs leading-relaxed whitespace-pre-line"
        style={{ color: "var(--text-2)" }}
      >
        {item.content.text}
      </p>
    </div>
  );
}

type Props = {
  boardId: string | null;
  refreshKey: number;
  onRefreshNeeded: () => void;
};

const NEW_ITEM_DEFAULTS: Record<
  string,
  { width: number; height: number; content: CanvasItemContent }
> = {
  text: { width: 220, height: 140, content: { title: "New text", text: "" } },
  sticky_note: {
    width: 200,
    height: 180,
    content: { title: "Note", text: "" },
  },
  notes: {
    width: 260,
    height: 180,
    content: { title: "Notes", text: "" },
  },
  task_list: {
    width: 260,
    height: 200,
    content: { title: "Tasks", tasks: [] },
  },
};

export function BoardCanvas({ boardId, refreshKey, onRefreshNeeded }: Props) {
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");
  const [editState, setEditState] = useState<EditState>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmState>(null);
  const [dragStart, setDragStart] = useState<{
    pointerId: number;
    x: number;
    y: number;
    panX: number;
    panY: number;
    moved: boolean;
  } | null>(null);
  const [itemDrag, setItemDrag] = useState<{
    mode: "move" | "resize";
    pointerId: number;
    itemId: string;
    x: number;
    y: number;
    itemX: number;
    itemY: number;
    itemWidth: number;
    itemHeight: number;
  } | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const selectedItem = items.find((i) => i.id === selectedId) ?? null;

  useEffect(() => {
    if (!boardId) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/boards/${boardId}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { canvasItems?: CanvasItem[] };
        setItems(
          (data.canvasItems ?? []).map((ci) => ({
            content: ci.content as CanvasItemContent,
            height: ci.height,
            id: ci.id,
            type: ci.type,
            width: ci.width,
            x: ci.x,
            y: ci.y,
          })),
        );
      } catch {
        // aborted or network error
      } finally {
        setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [boardId, refreshKey]);

  const persistPosition = useCallback((id: string, x: number, y: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(`/api/canvas-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x, y }),
      }).catch(() => null);
    }, DEBOUNCE_MS);
  }, []);

  const persistSize = useCallback(
    (id: string, width: number, height: number) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch(`/api/canvas-items/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ width, height }),
        }).catch(() => null);
      }, DEBOUNCE_MS);
    },
    [],
  );

  function updateDragged(clientX: number, clientY: number) {
    if (!itemDrag) return;
    const dx = (clientX - itemDrag.x) / zoom;
    const dy = (clientY - itemDrag.y) / zoom;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemDrag.itemId) return item;
        if (itemDrag.mode === "resize") {
          const w = Math.max(160, itemDrag.itemWidth + dx);
          const h = Math.max(96, itemDrag.itemHeight + dy);
          persistSize(item.id, w, h);
          return { ...item, width: w, height: h };
        }
        const nx = itemDrag.itemX + dx;
        const ny = itemDrag.itemY + dy;
        persistPosition(item.id, nx, ny);
        return { ...item, x: nx, y: ny };
      }),
    );
  }

  async function createItemAtPosition(
    type: string,
    clientX: number,
    clientY: number,
  ) {
    if (!boardId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round((clientX - rect.left - pan.x) / zoom);
    const y = Math.round((clientY - rect.top - pan.y) / zoom);
    const defaults = NEW_ITEM_DEFAULTS[type] ?? {
      width: 220,
      height: 140,
      content: { title: "New item", text: "" },
    };
    const res = await fetch("/api/canvas-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardId,
        type,
        x: x - defaults.width / 2,
        y: y - defaults.height / 2,
        width: defaults.width,
        height: defaults.height,
        content: defaults.content,
      }),
    });
    const data = (await res.json()) as { item?: CanvasItem };
    if (data.item) {
      setItems((prev) => [
        ...prev,
        {
          id: data.item!.id,
          type: data.item!.type,
          x: data.item!.x,
          y: data.item!.y,
          width: data.item!.width,
          height: data.item!.height,
          content: data.item!.content as CanvasItemContent,
        },
      ]);
      setSelectedId(data.item.id);
    }
  }

  async function deleteItem(id: string) {
    await fetch(`/api/canvas-items/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedId(null);
    setConfirmDelete(null);
  }

  async function saveEdit() {
    if (!editState) return;
    const { itemId, title, text } = editState;
    await fetch(`/api/canvas-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { title, text } }),
    });
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, content: { ...i.content, title, text } } : i,
      ),
    );
    setEditState(null);
  }

  async function copyItem(item: CanvasItem) {
    if (!boardId) return;
    const res = await fetch("/api/canvas-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardId,
        type: item.type,
        x: item.x + 24,
        y: item.y + 24,
        width: item.width,
        height: item.height,
        content: item.content,
      }),
    });
    const data = (await res.json()) as { item?: CanvasItem };
    if (data.item) {
      setItems((prev) => [
        ...prev,
        {
          id: data.item!.id,
          type: data.item!.type,
          x: data.item!.x,
          y: data.item!.y,
          width: data.item!.width,
          height: data.item!.height,
          content: data.item!.content as CanvasItemContent,
        },
      ]);
    }
  }

  const isPanMode = activeTool === "hand";
  const isCreateMode =
    activeTool !== "select" && activeTool !== "hand" && activeTool !== "widget";

  return (
    <div
      className="relative flex-1 overflow-hidden"
      style={{ background: "var(--bg-canvas)" }}
    >
      {/* Loading overlay */}
      {loading && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center"
          style={{ background: "var(--bg-canvas)" }}
        >
          <div
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border)",
              color: "var(--text-2)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
              style={{
                borderColor: "var(--accent)",
                borderTopColor: "transparent",
              }}
            />
            Loading board…
          </div>
        </div>
      )}

      {/* Empty states */}
      {!boardId && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div
            className="rounded-xl border p-6 text-center"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-2)" }}
            >
              No board selected
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-3)" }}>
              Choose or create a board to get started
            </p>
          </div>
        </div>
      )}

      {boardId && !loading && items.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div
            className="rounded-xl border p-8 text-center"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-1)" }}
            >
              Canvas is empty
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-3)" }}>
              Ask the AI assistant or pick a tool below to add items
            </p>
          </div>
        </div>
      )}

      {/* Canvas surface */}
      <div
        ref={canvasRef}
        className="canvas-surface absolute inset-0 touch-none"
        style={{
          cursor: isPanMode ? "grab" : isCreateMode ? "crosshair" : "default",
        }}
        onClick={(e) => {
          if (isCreateMode) {
            void createItemAtPosition(activeTool, e.clientX, e.clientY);
            setActiveTool("select");
            return;
          }
          setSelectedId(null);
        }}
        onPointerCancel={() => setDragStart(null)}
        onPointerDown={(e) => {
          if (isCreateMode) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragStart({
            pointerId: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            panX: pan.x,
            panY: pan.y,
            moved: false,
          });
        }}
        onPointerMove={(e) => {
          if (!dragStart || dragStart.pointerId !== e.pointerId) return;
          setPan({
            x: dragStart.panX + e.clientX - dragStart.x,
            y: dragStart.panY + e.clientY - dragStart.y,
          });
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          setDragStart(null);
        }}
        onWheel={(e) => {
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) {
            setZoom((z) => clampZoom(z - e.deltaY * 0.01));
          } else {
            setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
          }
        }}
      >
        <div
          className="origin-top-left"
          style={{
            transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
          }}
        >
          <div className="relative h-[3000px] w-[3000px]">
            {items.map((item) => {
              const selected = selectedId === item.id;
              return (
                <div
                  aria-pressed={selected}
                  className="absolute touch-manipulation text-left outline-none"
                  key={item.id}
                  role="button"
                  style={{
                    left: item.x,
                    top: item.y,
                    width: item.width,
                    height: item.height,
                    zIndex: selected ? 2 : 1,
                  }}
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(item.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(item.id);
                    }
                    if (e.key === "Delete" || e.key === "Backspace") {
                      if (selected) setConfirmDelete({ itemId: item.id });
                    }
                  }}
                  onPointerCancel={() => setItemDrag(null)}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setSelectedId(item.id);
                    setItemDrag({
                      mode: "move",
                      pointerId: e.pointerId,
                      itemId: item.id,
                      x: e.clientX,
                      y: e.clientY,
                      itemX: item.x,
                      itemY: item.y,
                      itemWidth: item.width,
                      itemHeight: item.height,
                    });
                  }}
                  onPointerMove={(e) => {
                    if (itemDrag?.pointerId === e.pointerId)
                      updateDragged(e.clientX, e.clientY);
                  }}
                  onPointerUp={(e) => {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    setItemDrag(null);
                  }}
                >
                  <ItemCard
                    item={item}
                    onEdit={() =>
                      setEditState({
                        itemId: item.id,
                        title: item.content.title ?? "",
                        text: item.content.text ?? "",
                      })
                    }
                  />

                  {/* Selection ring + handles */}
                  {selected && (
                    <>
                      {/* Selection ring */}
                      <div
                        className="pointer-events-none absolute -inset-1 rounded-xl"
                        style={{
                          outline: "2px solid var(--accent)",
                          outlineOffset: "2px",
                        }}
                      />

                      {/* Context actions — top */}
                      <div
                        className="absolute -top-9 left-0 flex items-center gap-1 rounded-lg border px-1.5 py-1"
                        style={{
                          background: "var(--bg-elevated)",
                          borderColor: "var(--border)",
                          boxShadow: "var(--shadow-md)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <ActionBtn
                          label="Edit"
                          onClick={() =>
                            setEditState({
                              itemId: item.id,
                              title: item.content.title ?? "",
                              text: item.content.text ?? "",
                            })
                          }
                        />
                        <ActionBtn
                          label="Copy"
                          onClick={() => copyItem(item)}
                        />
                        <ActionBtn label="Refresh" onClick={onRefreshNeeded} />
                        <ActionBtn
                          danger
                          label="Delete"
                          onClick={() => setConfirmDelete({ itemId: item.id })}
                        />
                      </div>

                      {/* Resize handle */}
                      <div
                        className="absolute -bottom-2 -right-2 h-5 w-5 cursor-nwse-resize rounded-md border-2"
                        style={{
                          background: "var(--accent)",
                          borderColor: "var(--bg-surface)",
                        }}
                        onPointerCancel={() => setItemDrag(null)}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setItemDrag({
                            mode: "resize",
                            pointerId: e.pointerId,
                            itemId: item.id,
                            x: e.clientX,
                            y: e.clientY,
                            itemX: item.x,
                            itemY: item.y,
                            itemWidth: item.width,
                            itemHeight: item.height,
                          });
                        }}
                        onPointerMove={(e) => {
                          if (itemDrag?.pointerId === e.pointerId)
                            updateDragged(e.clientX, e.clientY);
                        }}
                        onPointerUp={(e) => {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                          setItemDrag(null);
                        }}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating canvas toolbar */}
      <CanvasToolbar
        activeTool={activeTool}
        zoom={zoom}
        onToolChange={setActiveTool}
        onZoomIn={() => setZoom((z) => clampZoom(z + zoomStep))}
        onZoomOut={() => setZoom((z) => clampZoom(z - zoomStep))}
      />

      {/* Mobile bottom sheet for selected item */}
      {selectedItem && (
        <div
          className="animate-slide-up absolute inset-x-3 bottom-20 z-20 rounded-2xl border p-3 lg:hidden"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-xl)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--text-3)" }}
              >
                Selected
              </p>
              <h3
                className="mt-0.5 text-sm font-semibold"
                style={{ color: "var(--text-1)" }}
              >
                {selectedItem.content.title ?? selectedItem.type}
              </h3>
            </div>
            <button
              className="rounded-lg border p-1.5"
              onClick={() => setSelectedId(null)}
              style={{
                borderColor: "var(--border)",
                color: "var(--text-3)",
              }}
              type="button"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              {
                label: "Edit",
                action: () =>
                  setEditState({
                    itemId: selectedItem.id,
                    title: selectedItem.content.title ?? "",
                    text: selectedItem.content.text ?? "",
                  }),
              },
              { label: "Copy", action: () => copyItem(selectedItem) },
              { label: "Refresh", action: onRefreshNeeded },
              {
                label: "Delete",
                action: () => setConfirmDelete({ itemId: selectedItem.id }),
                danger: true,
              },
            ].map(({ label, action, danger }) => (
              <button
                className="rounded-xl border py-2.5 text-xs font-semibold transition-colors"
                key={label}
                onClick={action}
                style={{
                  background: danger
                    ? "var(--danger-light)"
                    : "var(--bg-surface)",
                  borderColor: danger ? "var(--danger)" : "var(--border)",
                  color: danger ? "var(--danger)" : "var(--text-1)",
                }}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editState && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: "var(--bg-overlay)" }}
          onClick={() => setEditState(null)}
        >
          <div
            className="animate-scale-in w-full max-w-sm rounded-2xl border p-5"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border)",
              boxShadow: "var(--shadow-xl)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="mb-4 text-sm font-semibold"
              style={{ color: "var(--text-1)" }}
            >
              Edit item
            </h3>
            <input
              autoFocus
              className="mb-3 w-full rounded-xl border px-3 py-2 text-sm outline-none"
              onChange={(e) =>
                setEditState((s) => s && { ...s, title: e.target.value })
              }
              placeholder="Title"
              style={{
                background: "var(--bg-surface)",
                borderColor: "var(--border)",
                color: "var(--text-1)",
              }}
              value={editState.title}
            />
            <textarea
              className="mb-4 w-full resize-y rounded-xl border px-3 py-2 text-sm outline-none"
              onChange={(e) =>
                setEditState((s) => s && { ...s, text: e.target.value })
              }
              placeholder="Content"
              rows={4}
              style={{
                background: "var(--bg-surface)",
                borderColor: "var(--border)",
                color: "var(--text-1)",
              }}
              value={editState.text}
            />
            <div className="flex justify-end gap-2">
              <button
                className="rounded-xl border px-4 py-2 text-sm"
                onClick={() => setEditState(null)}
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-2)",
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl px-4 py-2 text-sm font-semibold"
                onClick={saveEdit}
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                }}
                type="button"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: "var(--bg-overlay)" }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="animate-scale-in w-full max-w-xs rounded-2xl border p-5"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border)",
              boxShadow: "var(--shadow-xl)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="mb-1 text-sm font-semibold"
              style={{ color: "var(--text-1)" }}
            >
              Delete this item?
            </h3>
            <p className="mb-5 text-xs" style={{ color: "var(--text-3)" }}>
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="rounded-xl border px-4 py-2 text-sm"
                onClick={() => setConfirmDelete(null)}
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-2)",
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl px-4 py-2 text-sm font-semibold"
                onClick={() => deleteItem(confirmDelete.itemId)}
                style={{
                  background: "var(--danger)",
                  color: "var(--danger-fg)",
                }}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      className="rounded-md px-2 py-1 text-xs font-medium transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        color: danger ? "var(--danger)" : "var(--text-2)",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.background = danger
          ? "var(--danger-light)"
          : "var(--accent-light)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.background = "")
      }
      type="button"
    >
      {label}
    </button>
  );
}
