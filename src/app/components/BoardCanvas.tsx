"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { CanvasToolbar, type CanvasTool } from "./CanvasToolbar";
import { SandboxedHtmlWidget } from "./SandboxedHtmlWidget";

const zoomStep = 0.1;
const minZoom = 0.3;
const maxZoom = 2.5;
const DEBOUNCE_MS = 600;
const GRID_SIZE = 24;

type CanvasItemContent = {
  title?: string;
  text?: string;
  alt?: string;
  href?: string;
  html?: string;
  src?: string;
  bgColor?: string;
  tasks?: { completed: boolean; title: string }[];
  columns?: {
    id: string;
    title: string;
    cards: { id: string; title: string }[];
  }[];
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
type UndoSnapshot = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function clampZoom(v: number) {
  return Math.min(maxZoom, Math.max(minZoom, v));
}

function ItemCard({
  item,
  onEdit,
}: {
  item: CanvasItem;
  onEdit: () => void;
}) {
  const base =
    "absolute inset-0 overflow-hidden rounded-xl border text-sm transition-shadow";

  if (item.type === "shape") {
    const bg = item.content.bgColor ?? "#dbeafe";
    return (
      <div
        className="absolute inset-0 rounded-xl flex items-center justify-center overflow-hidden"
        style={{
          background: bg,
          border: "none",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {item.content.text && (
          <p
            className="px-3 text-sm font-medium text-center leading-snug"
            style={{ color: "var(--text-1)" }}
          >
            {item.content.text}
          </p>
        )}
        {!item.content.text && (
          <button
            className="absolute top-1 right-1.5 rounded px-1 py-0.5 text-[10px] opacity-0 hover:opacity-100 transition-opacity"
            style={{ color: "var(--text-3)", background: "rgba(0,0,0,0.08)" }}
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            type="button"
          >
            edit
          </button>
        )}
      </div>
    );
  }

  if (item.type === "frame") {
    const borderColor = item.content.bgColor ?? "var(--border-strong)";
    const bgAlpha = item.content.bgColor ? `${item.content.bgColor}18` : "rgba(255,255,255,0.02)";
    return (
      <div
        className="absolute inset-0 rounded-xl overflow-hidden"
        style={{
          background: bgAlpha,
          border: `2px dashed ${borderColor}`,
        }}
      >
        <div
          className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest select-none"
          style={{ color: item.content.bgColor ?? "var(--text-3)" }}
        >
          {item.content.title || "Frame"}
        </div>
      </div>
    );
  }

  if (item.type === "sticky_note") {
    const bg = item.content.bgColor ?? "#fef9c3";
    const headerBg = item.content.bgColor
      ? `${item.content.bgColor}cc`
      : "#fef08a";
    const borderColor = item.content.bgColor ?? "#fde047";
    const textColor = item.content.bgColor === "#1e293b" ? "#e2e8f0" : "#713f12";
    return (
      <div
        className={`${base} flex flex-col`}
        style={{
          background: bg,
          borderColor: borderColor,
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ background: headerBg, borderBottom: `1px solid ${borderColor}` }}
        >
          <span className="truncate text-xs font-semibold" style={{ color: textColor }}>
            {item.content.title || "Note"}
          </span>
          <button
            className="ml-1 shrink-0 rounded px-1 py-0.5 text-xs hover:bg-black/10"
            style={{ color: textColor }}
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            type="button"
          >
            Edit
          </button>
        </div>
        <p
          className="flex-1 overflow-hidden px-3 py-2 text-xs leading-relaxed whitespace-pre-line"
          style={{ color: textColor }}
        >
          {item.content.text}
        </p>
      </div>
    );
  }

  if (item.type === "text") {
    const bg = item.content.bgColor ?? "var(--bg-surface)";
    return (
      <div
        className={`${base} flex flex-col`}
        style={{
          background: bg,
          borderColor: item.content.bgColor ?? "var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div
          className="flex items-center justify-between border-b px-3 py-2"
          style={{ borderColor: item.content.bgColor ?? "var(--border)" }}
        >
          <span
            className="truncate text-xs font-semibold"
            style={{ color: "var(--text-1)" }}
          >
            {item.content.title}
          </span>
          <button
            className="ml-1 shrink-0 rounded px-1 py-0.5 text-xs transition-colors"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
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
          boxShadow: "var(--shadow-card)",
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
          boxShadow: "var(--shadow-card)",
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
          boxShadow: "var(--shadow-card)",
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
          boxShadow: "var(--shadow-card)",
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
                  borderColor: task.completed ? "var(--accent)" : "var(--border-strong)",
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

  if (item.type === "kanban") {
    type KanbanCard = { id: string; title: string };
    type KanbanColumn = { id: string; title: string; cards: KanbanCard[] };
    const columns = (item.content.columns ?? []) as KanbanColumn[];
    return (
      <div
        className={`${base} flex flex-col`}
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-card)",
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
            {item.content.title ?? "Kanban"}
          </span>
          <button
            className="ml-1 shrink-0 rounded px-1 py-0.5 text-xs transition-colors"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            style={{ color: "var(--text-3)" }}
            type="button"
          >
            Edit
          </button>
        </div>
        <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto p-2">
          {columns.map((col) => (
            <div
              className="flex w-32 shrink-0 flex-col gap-1.5 rounded-lg p-2"
              key={col.id}
              style={{ background: "var(--bg-app)" }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "var(--text-3)" }}
              >
                {col.title}
              </span>
              <span
                className="text-[10px] font-medium"
                style={{ color: "var(--text-3)" }}
              >
                {col.cards.length} card{col.cards.length !== 1 ? "s" : ""}
              </span>
              {col.cards.map((card, i) => (
                <div
                  className="rounded-lg border px-2 py-1.5 text-[11px] leading-snug"
                  key={card.id ?? i}
                  style={{
                    background: "var(--bg-surface)",
                    borderColor: "var(--border)",
                    color: "var(--text-1)",
                  }}
                >
                  {card.title}
                </div>
              ))}
              {col.cards.length === 0 && (
                <p
                  className="text-[10px] italic"
                  style={{ color: "var(--text-3)" }}
                >
                  Empty
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (item.type === "notes") {
    const bg = item.content.bgColor ?? "#fffbf0";
    return (
      <div
        className={`${base} flex flex-col`}
        style={{
          background: bg,
          borderColor: item.content.bgColor ?? "#fed7aa",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div
          className="flex items-center justify-between border-b px-3 py-2"
          style={{ borderBottom: `1px solid ${item.content.bgColor ?? "#fed7aa"}` }}
        >
          <span className="text-xs font-semibold text-orange-900">
            {item.content.title}
          </span>
          <button
            className="ml-1 shrink-0 rounded px-1 py-0.5 text-xs text-orange-500 hover:bg-orange-100"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
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
          boxShadow: "var(--shadow-card)",
        }}
      >
        <SandboxedHtmlWidget
          html={item.content.html ?? ""}
          title={item.content.title ?? "Widget"}
        />
      </div>
    );
  }

  return (
    <div
      className={`${base} flex flex-col`}
      style={{
        background: item.content.bgColor ?? "var(--bg-surface)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        className="border-b px-3 py-2 text-xs font-semibold"
        style={{ borderColor: "var(--border)", color: "var(--text-1)" }}
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
  sticky_note: { width: 200, height: 180, content: { title: "Note", text: "" } },
  task_list: { width: 260, height: 200, content: { title: "Tasks", tasks: [] } },
  kanban: {
    width: 480,
    height: 300,
    content: {
      title: "Kanban",
      columns: [
        { id: "todo", title: "To Do", cards: [] },
        { id: "doing", title: "In Progress", cards: [] },
        { id: "done", title: "Done", cards: [] },
      ],
    },
  },
  shape: { width: 200, height: 150, content: { title: "", text: "" } },
  frame: { width: 420, height: 320, content: { title: "Frame", text: "" } },
};

const AUTO_EDIT_TYPES = new Set(["text", "sticky_note", "shape", "frame", "notes"]);

export function BoardCanvas({ boardId, refreshKey, onRefreshNeeded }: Props) {
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmState>(null);
  const [undoToast, setUndoToast] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
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
    before: UndoSnapshot;
  } | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoStack = useRef<UndoSnapshot[]>([]);
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

  useEffect(() => {
    undoStack.current = [];
  }, [boardId]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (undoToastTimer.current) clearTimeout(undoToastTimer.current);
      if (panEndTimer.current) clearTimeout(panEndTimer.current);
    };
  }, []);

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

  const showUndoToast = useCallback(() => {
    setUndoToast(true);
    if (undoToastTimer.current) clearTimeout(undoToastTimer.current);
    undoToastTimer.current = setTimeout(() => setUndoToast(false), 3000);
  }, []);

  const pushUndoSnapshot = useCallback((snapshot: UndoSnapshot) => {
    undoStack.current = [...undoStack.current, snapshot].slice(-20);
  }, []);

  const undoCanvasChange = useCallback(async () => {
    const snapshot = undoStack.current.pop();
    if (!snapshot) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    setItems((prev) =>
      prev.map((item) =>
        item.id === snapshot.id
          ? { ...item, height: snapshot.height, width: snapshot.width, x: snapshot.x, y: snapshot.y }
          : item,
      ),
    );
    setSelectedId(snapshot.id);
    showUndoToast();

    try {
      await fetch(`/api/canvas-items/${snapshot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          height: snapshot.height,
          width: snapshot.width,
          x: snapshot.x,
          y: snapshot.y,
        }),
      });
    } catch {
      onRefreshNeeded();
    }
  }, [onRefreshNeeded, showUndoToast]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (tagName === "INPUT" || tagName === "TEXTAREA" || target?.isContentEditable) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        void undoCanvasChange();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoCanvasChange]);

  const finishItemDrag = useCallback(
    (pointerId: number) => {
      if (!itemDrag || itemDrag.pointerId !== pointerId) return;
      const item = items.find((candidate) => candidate.id === itemDrag.itemId);
      if (
        item &&
        (item.x !== itemDrag.before.x ||
          item.y !== itemDrag.before.y ||
          item.width !== itemDrag.before.width ||
          item.height !== itemDrag.before.height)
      ) {
        pushUndoSnapshot(itemDrag.before);
      }
      setItemDrag(null);
    },
    [itemDrag, items, pushUndoSnapshot],
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

  function openEditFor(item: CanvasItem) {
    setEditState({
      itemId: item.id,
      title: item.content.title ?? "",
      text: item.content.text ?? "",
    });
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
    const content = {
      ...defaults.content,
      ...(activeColor ? { bgColor: activeColor } : {}),
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
        content,
      }),
    });
    const data = (await res.json()) as { item?: CanvasItem };
    if (data.item) {
      const newItem: CanvasItem = {
        id: data.item.id,
        type: data.item.type,
        x: data.item.x,
        y: data.item.y,
        width: data.item.width,
        height: data.item.height,
        content: data.item.content as CanvasItemContent,
      };
      setItems((prev) => [...prev, newItem]);
      setSelectedId(data.item!.id);
      if (AUTO_EDIT_TYPES.has(type)) {
        setEditState({
          itemId: data.item.id,
          title: data.item.content.title ?? "",
          text: data.item.content.text ?? "",
        });
      }
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

  function tidyCanvas() {
    if (items.length === 0) return;
    const GAP = 32;
    const START = 64;
    const COLS = Math.max(1, Math.ceil(Math.sqrt(items.length)));

    const sorted = [...items].sort((a, b) => {
      const rowA = Math.floor(a.y / 150);
      const rowB = Math.floor(b.y / 150);
      return rowA !== rowB ? rowA - rowB : a.x - b.x;
    });

    // Max height per row
    const rowHeights: number[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const r = Math.floor(i / COLS);
      rowHeights[r] = Math.max(rowHeights[r] ?? 0, sorted[i].height);
    }

    // Max width per column
    const colWidths: number[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const c = i % COLS;
      colWidths[c] = Math.max(colWidths[c] ?? 0, sorted[i].width);
    }

    // Cumulative positions
    const rowY: number[] = [START];
    for (let r = 0; r < rowHeights.length - 1; r++) {
      rowY[r + 1] = rowY[r] + (rowHeights[r] ?? 0) + GAP;
    }
    const colX: number[] = [START];
    for (let c = 0; c < colWidths.length - 1; c++) {
      colX[c + 1] = colX[c] + (colWidths[c] ?? 0) + GAP;
    }

    const updates = sorted.map((item, idx) => ({
      id: item.id,
      x: colX[idx % COLS] ?? START,
      y: rowY[Math.floor(idx / COLS)] ?? START,
    }));

    setItems((prev) =>
      prev.map((item) => {
        const u = updates.find((upd) => upd.id === item.id);
        if (!u) return item;
        persistPosition(item.id, u.x, u.y);
        return { ...item, x: u.x, y: u.y };
      }),
    );
  }

  function triggerPanIndicator() {
    setIsPanning(true);
    if (panEndTimer.current) clearTimeout(panEndTimer.current);
    panEndTimer.current = setTimeout(() => setIsPanning(false), 800);
  }

  const isPanMode = activeTool === "hand";
  const isCreateMode = !["select", "hand", "widget", "arrow"].includes(activeTool);

  const gridBgSize = GRID_SIZE * zoom;
  const gridBgPosX = pan.x % gridBgSize;
  const gridBgPosY = pan.y % gridBgSize;

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
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
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
            <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>
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
            <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
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
          cursor: isPanMode
            ? dragStart ? "grabbing" : "grab"
            : isCreateMode
            ? "crosshair"
            : "default",
          backgroundImage: `radial-gradient(circle, rgba(100,116,139,0.28) 1.5px, transparent 1.5px)`,
          backgroundSize: `${gridBgSize}px ${gridBgSize}px`,
          backgroundPosition: `${gridBgPosX}px ${gridBgPosY}px`,
        }}
        onClick={(e) => {
          if (activeTool === "arrow") {
            setActiveTool("select");
            return;
          }
          if (isCreateMode) {
            const itemType = activeTool === "pen" ? "sticky_note" : activeTool;
            void createItemAtPosition(itemType, e.clientX, e.clientY);
            setActiveTool("select");
            return;
          }
          setSelectedId(null);
        }}
        onPointerCancel={() => {
          setDragStart(null);
          setIsPanning(false);
        }}
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
          triggerPanIndicator();
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
            triggerPanIndicator();
          }
        }}
      >
        <div
          className="origin-top-left"
          style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})` }}
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
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    openEditFor(item);
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
                      before: {
                        height: item.height,
                        id: item.id,
                        width: item.width,
                        x: item.x,
                        y: item.y,
                      },
                    });
                  }}
                  onPointerMove={(e) => {
                    if (itemDrag?.pointerId === e.pointerId)
                      updateDragged(e.clientX, e.clientY);
                  }}
                  onPointerUp={(e) => {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    finishItemDrag(e.pointerId);
                  }}
                >
                  <ItemCard item={item} onEdit={() => openEditFor(item)} />

                  {/* Selection ring + handles */}
                  {selected && (
                    <>
                      <div
                        className="pointer-events-none absolute -inset-1 rounded-xl"
                        style={{ outline: "2px solid var(--accent)", outlineOffset: "2px" }}
                      />

                      {/* Context actions */}
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
                        <ActionBtn label="Edit" onClick={() => openEditFor(item)} />
                        <ActionBtn label="Copy" onClick={() => copyItem(item)} />
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
                            before: {
                              height: item.height,
                              id: item.id,
                              width: item.width,
                              x: item.x,
                              y: item.y,
                            },
                          });
                        }}
                        onPointerMove={(e) => {
                          if (itemDrag?.pointerId === e.pointerId)
                            updateDragged(e.clientX, e.clientY);
                        }}
                        onPointerUp={(e) => {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                          finishItemDrag(e.pointerId);
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

      {/* Undo toast */}
      {undoToast && (
        <div
          className="absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-full border px-3 py-1.5 text-xs font-semibold"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-md)",
            color: "var(--text-1)",
          }}
        >
          Canvas change undone
        </div>
      )}

      {/* Pan position indicator (n8n style) */}
      {isPanning && (
        <div
          className="absolute bottom-20 left-4 z-20 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium tabular-nums transition-opacity"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-md)",
            color: "var(--text-2)",
          }}
        >
          <span style={{ color: "var(--text-3)" }}>x</span>
          <span>{Math.round(-pan.x / zoom)}</span>
          <span style={{ color: "var(--border)" }}>·</span>
          <span style={{ color: "var(--text-3)" }}>y</span>
          <span>{Math.round(-pan.y / zoom)}</span>
        </div>
      )}

      {/* Floating canvas toolbar */}
      <CanvasToolbar
        activeTool={activeTool}
        activeColor={activeColor}
        zoom={zoom}
        onToolChange={setActiveTool}
        onColorChange={setActiveColor}
        onZoomIn={() => setZoom((z) => clampZoom(z + zoomStep))}
        onZoomOut={() => setZoom((z) => clampZoom(z - zoomStep))}
        onTidy={tidyCanvas}
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
              style={{ borderColor: "var(--border)", color: "var(--text-3)" }}
              type="button"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[
              { label: "Edit", action: () => openEditFor(selectedItem) },
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
                  background: danger ? "var(--danger-light)" : "var(--bg-surface)",
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
            <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--text-1)" }}>
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void saveEdit();
                }
              }}
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
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl px-4 py-2 text-sm font-semibold"
                onClick={saveEdit}
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
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
            <h3 className="mb-1 text-sm font-semibold" style={{ color: "var(--text-1)" }}>
              Delete this item?
            </h3>
            <p className="mb-5 text-xs" style={{ color: "var(--text-3)" }}>
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="rounded-xl border px-4 py-2 text-sm"
                onClick={() => setConfirmDelete(null)}
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl px-4 py-2 text-sm font-semibold"
                onClick={() => deleteItem(confirmDelete.itemId)}
                style={{ background: "var(--danger)", color: "var(--danger-fg)" }}
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
      style={{ color: danger ? "var(--danger)" : "var(--text-2)" }}
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
