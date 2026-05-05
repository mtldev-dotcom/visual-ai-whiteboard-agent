"use client";

import Image from "next/image";
import {
  ArrowUpRight,
  Check,
  Copy,
  Edit3,
  RefreshCcw,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  CanvasToolbar,
  type CanvasTool,
  type ShapeKind,
} from "./CanvasToolbar";
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
  targetBoardId?: string;
  boardId?: string;
  html?: string;
  widgetDefinitionId?: string;
  sourceVersion?: string;
  src?: string;
  bgColor?: string;
  stroke?: string;
  fill?: string;
  shape?: ShapeKind;
  points?: { x: number; y: number }[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  sourceWidth?: number;
  sourceHeight?: number;
  tasks?: { completed: boolean; title: string }[];
  reminders?: { status?: string; title: string; when?: string }[];
  blocks?: { type?: string; text?: string }[];
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

type InlineEditState = {
  itemId: string;
  title: string;
  text: string;
} | null;
type InlineEditPatch = Partial<
  Pick<NonNullable<InlineEditState>, "title" | "text">
>;
type ConfirmState = { itemId: string } | null;
type UndoSnapshot = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
type CanvasPoint = { x: number; y: number };
type DraftState =
  | {
      type: "drawing";
      pointerId: number;
      points: CanvasPoint[];
    }
  | {
      type: "shape" | "frame" | "arrow" | "text" | "sticky_note";
      pointerId: number;
      start: CanvasPoint;
      current: CanvasPoint;
    }
  | null;

const MIN_DRAW_SIZE = 8;
const DEFAULT_STROKE = "var(--text-1)";

function clampZoom(v: number) {
  return Math.min(maxZoom, Math.max(minZoom, v));
}

function getBounds(start: CanvasPoint, end: CanvasPoint) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return {
    x,
    y,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function getPointsBounds(points: CanvasPoint[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function pointsToPath(points: CanvasPoint[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function isInlineEditableType(type: string) {
  return ["text", "sticky_note", "shape", "frame", "notes"].includes(type);
}

function InlineFields({
  compact = false,
  inlineEdit,
  isEditing,
  onInlineCancel,
  onInlineChange,
  onInlineCommit,
  textColor = "var(--text-1)",
}: {
  compact?: boolean;
  inlineEdit: InlineEditState;
  isEditing: boolean;
  onInlineCancel: () => void;
  onInlineChange: (patch: InlineEditPatch) => void;
  onInlineCommit: () => void;
  textColor?: string;
}) {
  if (!isEditing || !inlineEdit) return null;
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col gap-2 p-2"
      style={{ background: "inherit" }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          onInlineCommit();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        className="min-h-8 w-full rounded-md border px-2 text-xs font-semibold outline-none"
        onChange={(e) => onInlineChange({ title: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onInlineCancel();
          }
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onInlineCommit();
          }
        }}
        placeholder="Title"
        style={{
          background: "rgba(255,255,255,0.72)",
          borderColor: "rgba(0,0,0,0.12)",
          color: textColor,
        }}
        value={inlineEdit.title}
      />
      {!compact && (
        <textarea
          className="min-h-0 flex-1 resize-none rounded-md border px-2 py-1.5 text-xs leading-relaxed outline-none"
          onChange={(e) => onInlineChange({ text: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onInlineCancel();
            }
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              onInlineCommit();
            }
          }}
          placeholder="Write here"
          style={{
            background: "rgba(255,255,255,0.72)",
            borderColor: "rgba(0,0,0,0.12)",
            color: textColor,
          }}
          value={inlineEdit.text}
        />
      )}
      {compact && <div className="flex-1" />}
      <div className="flex justify-end gap-1">
        <button
          aria-label="Cancel edit"
          className="flex h-7 w-7 items-center justify-center rounded-md border"
          onClick={onInlineCancel}
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border)",
            color: "var(--text-2)",
          }}
          type="button"
        >
          <X size={14} />
        </button>
        <button
          aria-label="Save edit"
          className="flex h-7 w-7 items-center justify-center rounded-md"
          onClick={onInlineCommit}
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          type="button"
        >
          <Check size={14} />
        </button>
      </div>
    </div>
  );
}

function ItemCard({
  item,
  onEdit,
  onOpenBoardLink,
  inlineEdit,
  onInlineChange,
  onInlineCommit,
  onInlineCancel,
}: {
  item: CanvasItem;
  onEdit: () => void;
  onOpenBoardLink: (boardId: string) => void;
  inlineEdit: InlineEditState;
  onInlineChange: (patch: InlineEditPatch) => void;
  onInlineCommit: () => void;
  onInlineCancel: () => void;
}) {
  const base =
    "absolute inset-0 overflow-hidden rounded-xl border text-sm transition-shadow";
  const isEditing = inlineEdit?.itemId === item.id;
  const inlineProps = {
    inlineEdit,
    isEditing,
    onInlineCancel,
    onInlineChange,
    onInlineCommit,
  };

  if (item.type === "shape") {
    const shape = item.content.shape ?? "rectangle";
    const fill = item.content.fill ?? item.content.bgColor ?? "#dbeafe";
    const stroke = item.content.stroke ?? item.content.bgColor ?? "#93c5fd";
    return (
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl"
        style={{
          background: "transparent",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <svg
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          {shape === "ellipse" && (
            <ellipse
              cx="50%"
              cy="50%"
              fill={fill}
              rx="48%"
              ry="46%"
              stroke={stroke}
              strokeWidth="2"
            />
          )}
          {shape === "diamond" && (
            <polygon
              fill={fill}
              points={`${item.width / 2},2 ${item.width - 2},${item.height / 2} ${item.width / 2},${item.height - 2} 2,${item.height / 2}`}
              stroke={stroke}
              strokeLinejoin="round"
              strokeWidth="2"
            />
          )}
          {shape === "rectangle" && (
            <rect
              fill={fill}
              height={Math.max(1, item.height - 4)}
              rx="10"
              stroke={stroke}
              strokeWidth="2"
              width={Math.max(1, item.width - 4)}
              x="2"
              y="2"
            />
          )}
        </svg>
        {item.content.text && (
          <p
            className="relative px-3 text-center text-sm font-medium leading-snug"
            style={{ color: "var(--text-1)" }}
          >
            {item.content.text}
          </p>
        )}
        <InlineFields {...inlineProps} compact />
      </div>
    );
  }

  if (item.type === "frame") {
    const borderColor = item.content.bgColor ?? "var(--border-strong)";
    const bgAlpha = item.content.bgColor
      ? `${item.content.bgColor}18`
      : "rgba(255,255,255,0.02)";
    return (
      <div
        className="absolute inset-0 rounded-xl overflow-hidden"
        style={{
          background: bgAlpha,
          border: `2px dashed ${borderColor}`,
        }}
      >
        <InlineFields {...inlineProps} compact />
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
    const textColor =
      item.content.bgColor === "#1e293b" ? "#e2e8f0" : "#713f12";
    return (
      <div
        className={`${base} flex flex-col`}
        style={{
          background: bg,
          borderColor: borderColor,
          boxShadow: "var(--shadow-card)",
        }}
      >
        <InlineFields {...inlineProps} textColor={textColor} />
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{
            background: headerBg,
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          <span
            className="truncate text-xs font-semibold"
            style={{ color: textColor }}
          >
            {item.content.title || "Note"}
          </span>
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
        <InlineFields {...inlineProps} />
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

  if (item.type === "rich_text") {
    const blocks = item.content.blocks ?? [];
    return (
      <div
        className={`${base} flex flex-col`}
        style={{
          background: "var(--bg-surface)",
          borderColor: "#c4b5fd",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div
          className="border-b px-3 py-2"
          style={{ borderColor: "var(--border)" }}
        >
          <span
            className="truncate text-xs font-semibold"
            style={{ color: "var(--text-1)" }}
          >
            {item.content.title ?? "Rich Text"}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-3 py-2">
          {blocks.length === 0 && (
            <p className="text-xs italic" style={{ color: "var(--text-3)" }}>
              No content yet
            </p>
          )}
          {blocks.map((block, index) => {
            if (block.type === "heading") {
              return (
                <h4
                  className="mb-1 text-sm font-semibold"
                  key={index}
                  style={{ color: "var(--text-1)" }}
                >
                  {block.text}
                </h4>
              );
            }
            if (block.type === "callout") {
              return (
                <p
                  className="mb-2 rounded-lg border px-2 py-1.5 text-xs leading-relaxed"
                  key={index}
                  style={{
                    background: "var(--accent-light)",
                    borderColor: "var(--border)",
                    color: "var(--accent)",
                  }}
                >
                  {block.text}
                </p>
              );
            }
            return (
              <p
                className="mb-2 text-xs leading-relaxed"
                key={index}
                style={{ color: "var(--text-2)" }}
              >
                {block.text}
              </p>
            );
          })}
        </div>
      </div>
    );
  }

  if (item.type === "drawing") {
    const points = item.content.points ?? [];
    return (
      <svg
        aria-label="Freehand drawing"
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        viewBox={`0 0 ${Math.max(1, item.content.sourceWidth ?? item.width)} ${Math.max(1, item.content.sourceHeight ?? item.height)}`}
      >
        <path
          d={pointsToPath(points)}
          fill="none"
          stroke={item.content.stroke ?? DEFAULT_STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
      </svg>
    );
  }

  if (item.type === "arrow") {
    const start = item.content.start ?? { x: 0, y: item.height / 2 };
    const end = item.content.end ?? { x: item.width, y: item.height / 2 };
    const markerId = `arrow-${item.id}`;
    const stroke = item.content.stroke ?? DEFAULT_STROKE;
    return (
      <svg
        aria-label="Arrow"
        className="absolute inset-0 h-full w-full overflow-visible"
        role="img"
        viewBox={`0 0 ${Math.max(1, item.content.sourceWidth ?? item.width)} ${Math.max(1, item.content.sourceHeight ?? item.height)}`}
      >
        <defs>
          <marker
            id={markerId}
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" fill={stroke} />
          </marker>
        </defs>
        <line
          markerEnd={`url(#${markerId})`}
          stroke={stroke}
          strokeLinecap="round"
          strokeWidth="3"
          x1={start.x}
          x2={end.x}
          y1={start.y}
          y2={end.y}
        />
      </svg>
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

  if (item.type === "board_link") {
    const targetBoardId = item.content.targetBoardId ?? item.content.boardId;
    return (
      <div
        className={`${base} flex flex-col`}
        style={{
          background: "var(--bg-surface)",
          borderColor: "#86efac",
          borderTopWidth: "3px",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col px-3 pt-2">
          <p
            className="truncate text-xs font-semibold"
            style={{ color: "var(--text-1)" }}
          >
            {item.content.title ?? "Board link"}
          </p>
          <p
            className="mt-1 line-clamp-3 text-xs leading-relaxed"
            style={{ color: "var(--text-2)" }}
          >
            {item.content.text ?? "Open a related board."}
          </p>
        </div>
        <button
          className="mt-auto flex items-center justify-between gap-2 px-3 pb-3 pt-2 text-left text-xs font-semibold disabled:opacity-50"
          disabled={!targetBoardId}
          onClick={(e) => {
            e.stopPropagation();
            if (targetBoardId) onOpenBoardLink(targetBoardId);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ color: "#16a34a" }}
          type="button"
        >
          <span className="truncate">Open board</span>
          <ArrowUpRight size={14} />
        </button>
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

  if (item.type === "reminders") {
    const reminders = item.content.reminders ?? [];
    return (
      <div
        className={`${base} flex flex-col`}
        style={{
          background: "var(--bg-surface)",
          borderColor: "#fca5a5",
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
            {item.content.title ?? "Reminders"}
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
            {reminders.length}
          </span>
        </div>
        <ul className="flex-1 overflow-hidden px-3 py-2 space-y-2">
          {reminders.length === 0 && (
            <li className="text-xs italic" style={{ color: "var(--text-3)" }}>
              No reminders yet
            </li>
          )}
          {reminders.map((reminder, index) => (
            <li className="flex items-start gap-2" key={index}>
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                style={{
                  background:
                    reminder.status === "done"
                      ? "var(--text-3)"
                      : "var(--danger)",
                }}
              />
              <span className="min-w-0">
                <span
                  className="block truncate text-xs font-medium"
                  style={{ color: "var(--text-1)" }}
                >
                  {reminder.title}
                </span>
                {reminder.when && (
                  <span
                    className="block truncate text-[10px]"
                    style={{ color: "var(--text-3)" }}
                  >
                    {reminder.when}
                  </span>
                )}
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
        <InlineFields {...inlineProps} textColor="#7c2d12" />
        <div
          className="flex items-center justify-between border-b px-3 py-2"
          style={{
            borderBottom: `1px solid ${item.content.bgColor ?? "#fed7aa"}`,
          }}
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
  onBoardSelect: (boardId: string) => void;
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
  task_list: {
    width: 260,
    height: 200,
    content: { title: "Tasks", tasks: [] },
  },
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
  shape: {
    width: 200,
    height: 150,
    content: {
      fill: "#dbeafe",
      shape: "rectangle",
      stroke: "#93c5fd",
      text: "",
    },
  },
  frame: { width: 420, height: 320, content: { title: "Frame", text: "" } },
};

export function BoardCanvas({
  boardId,
  refreshKey,
  onRefreshNeeded,
  onBoardSelect,
}: Props) {
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [activeShapeKind, setActiveShapeKind] =
    useState<ShapeKind>("rectangle");
  const [inlineEdit, setInlineEdit] = useState<InlineEditState>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmState>(null);
  const [draft, setDraft] = useState<DraftState>(null);
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

  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const undoToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoStack = useRef<UndoSnapshot[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const ignoreNextCanvasClick = useRef(false);
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
        setDraft(null);
        setInlineEdit(null);
        setSelectedId(null);
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
    const timers = saveTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      if (undoToastTimer.current) clearTimeout(undoToastTimer.current);
      if (panEndTimer.current) clearTimeout(panEndTimer.current);
    };
  }, []);

  const persistPatch = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      const existing = saveTimers.current.get(id);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        saveTimers.current.delete(id);
        fetch(`/api/canvas-items/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }).catch(() => null);
      }, DEBOUNCE_MS);
      saveTimers.current.set(id, timer);
    },
    [],
  );

  const flushPendingPatch = useCallback((id: string) => {
    const existing = saveTimers.current.get(id);
    if (!existing) return;
    clearTimeout(existing);
    saveTimers.current.delete(id);
  }, []);

  const persistPosition = useCallback(
    (id: string, x: number, y: number) => {
      persistPatch(id, { x, y });
    },
    [persistPatch],
  );

  const persistSize = useCallback(
    (id: string, width: number, height: number) => {
      persistPatch(id, { width, height });
    },
    [persistPatch],
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

    flushPendingPatch(snapshot.id);
    setItems((prev) =>
      prev.map((item) =>
        item.id === snapshot.id
          ? {
              ...item,
              height: snapshot.height,
              width: snapshot.width,
              x: snapshot.x,
              y: snapshot.y,
            }
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
  }, [flushPendingPatch, onRefreshNeeded, showUndoToast]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        target?.isContentEditable
      )
        return;

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

  function getCanvasPoint(
    clientX: number,
    clientY: number,
  ): CanvasPoint | null {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.round((clientX - rect.left - pan.x) / zoom),
      y: Math.round((clientY - rect.top - pan.y) / zoom),
    };
  }

  function openEditFor(item: CanvasItem) {
    if (!isInlineEditableType(item.type)) return;
    setInlineEdit({
      itemId: item.id,
      text: item.content.text ?? "",
      title: item.content.title ?? "",
    });
  }

  function updateInlineEdit(patch: InlineEditPatch) {
    setInlineEdit((current) => (current ? { ...current, ...patch } : current));
  }

  function cancelInlineEdit() {
    setInlineEdit(null);
  }

  async function commitInlineEdit() {
    if (!inlineEdit) return;
    const item = items.find((candidate) => candidate.id === inlineEdit.itemId);
    if (!item) {
      setInlineEdit(null);
      return;
    }
    const content = {
      ...item.content,
      title: inlineEdit.title,
      text: inlineEdit.text,
    };
    setItems((prev) =>
      prev.map((candidate) =>
        candidate.id === item.id ? { ...candidate, content } : candidate,
      ),
    );
    setInlineEdit(null);
    await fetch(`/api/canvas-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }).catch(() => onRefreshNeeded());
  }

  async function createCanvasItem(input: {
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    content: CanvasItemContent;
    autoEdit?: boolean;
  }) {
    if (!boardId) return null;
    const res = await fetch("/api/canvas-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardId,
        type: input.type,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
        content: input.content,
      }),
    });
    const data = (await res.json()) as { item?: CanvasItem };
    if (!data.item) return null;
    const newItem: CanvasItem = {
      content: data.item.content as CanvasItemContent,
      height: data.item.height,
      id: data.item.id,
      type: data.item.type,
      width: data.item.width,
      x: data.item.x,
      y: data.item.y,
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedId(newItem.id);
    if (input.autoEdit) openEditFor(newItem);
    return newItem;
  }

  async function createItemAtPosition(
    type: string,
    clientX: number,
    clientY: number,
  ) {
    const point = getCanvasPoint(clientX, clientY);
    if (!point) return;
    const defaults = NEW_ITEM_DEFAULTS[type] ?? {
      width: 220,
      height: 140,
      content: { title: "New item", text: "" },
    };
    const color = activeColor ?? undefined;
    const content = {
      ...defaults.content,
      ...(type === "shape"
        ? {
            fill: color ?? defaults.content.fill ?? "#dbeafe",
            shape: activeShapeKind,
            stroke: color ?? defaults.content.stroke ?? "#93c5fd",
          }
        : color
          ? { bgColor: color }
          : {}),
    };
    await createCanvasItem({
      content,
      autoEdit: isInlineEditableType(type),
      height: defaults.height,
      type,
      width: defaults.width,
      x: point.x - defaults.width / 2,
      y: point.y - defaults.height / 2,
    });
  }

  async function createItemFromDraft(currentDraft: NonNullable<DraftState>) {
    if (currentDraft.type === "drawing") {
      if (currentDraft.points.length < 2) return;
      const bounds = getPointsBounds(currentDraft.points);
      if (bounds.width < MIN_DRAW_SIZE && bounds.height < MIN_DRAW_SIZE) return;
      const pad = 10;
      const x = bounds.x - pad;
      const y = bounds.y - pad;
      const points = currentDraft.points.map((point) => ({
        x: point.x - x,
        y: point.y - y,
      }));
      await createCanvasItem({
        content: {
          points,
          sourceHeight: bounds.height + pad * 2,
          sourceWidth: bounds.width + pad * 2,
          stroke: activeColor ?? DEFAULT_STROKE,
        },
        height: bounds.height + pad * 2,
        type: "drawing",
        width: bounds.width + pad * 2,
        x,
        y,
      });
      return;
    }

    const bounds = getBounds(currentDraft.start, currentDraft.current);
    const isSmall =
      bounds.width < MIN_DRAW_SIZE && bounds.height < MIN_DRAW_SIZE;
    if (currentDraft.type === "text" || currentDraft.type === "sticky_note") {
      if (isSmall) {
        await createItemAtPosition(
          currentDraft.type,
          currentDraft.start.x * zoom +
            pan.x +
            (canvasRef.current?.getBoundingClientRect().left ?? 0),
          currentDraft.start.y * zoom +
            pan.y +
            (canvasRef.current?.getBoundingClientRect().top ?? 0),
        );
        return;
      }
      const content =
        currentDraft.type === "text"
          ? {
              title: "New text",
              text: "",
              ...(activeColor ? { bgColor: activeColor } : {}),
            }
          : {
              title: "Note",
              text: "",
              ...(activeColor ? { bgColor: activeColor } : {}),
            };
      await createCanvasItem({
        content,
        autoEdit: true,
        height: Math.max(96, bounds.height),
        type: currentDraft.type,
        width: Math.max(160, bounds.width),
        x: bounds.x,
        y: bounds.y,
      });
      return;
    }

    if (isSmall) return;
    if (currentDraft.type === "arrow") {
      const pad = 16;
      const x = bounds.x - pad;
      const y = bounds.y - pad;
      await createCanvasItem({
        content: {
          end: { x: currentDraft.current.x - x, y: currentDraft.current.y - y },
          sourceHeight: bounds.height + pad * 2,
          sourceWidth: bounds.width + pad * 2,
          start: { x: currentDraft.start.x - x, y: currentDraft.start.y - y },
          stroke: activeColor ?? DEFAULT_STROKE,
        },
        height: bounds.height + pad * 2,
        type: "arrow",
        width: bounds.width + pad * 2,
        x,
        y,
      });
      return;
    }

    if (currentDraft.type === "shape") {
      await createCanvasItem({
        content: {
          fill: activeColor ?? "#dbeafe",
          shape: activeShapeKind,
          stroke: activeColor ?? "#93c5fd",
          text: "",
        },
        autoEdit: true,
        height: Math.max(64, bounds.height),
        type: "shape",
        width: Math.max(96, bounds.width),
        x: bounds.x,
        y: bounds.y,
      });
      return;
    }

    await createCanvasItem({
      content: {
        bgColor: activeColor ?? undefined,
        title: "Frame",
        text: "",
      },
      autoEdit: true,
      height: Math.max(160, bounds.height),
      type: "frame",
      width: Math.max(240, bounds.width),
      x: bounds.x,
      y: bounds.y,
    });
  }

  async function deleteItem(id: string) {
    await fetch(`/api/canvas-items/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedId(null);
    setConfirmDelete(null);
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

  function handleToolChange(tool: CanvasTool) {
    if (tool === "widget") {
      window.dispatchEvent(new CustomEvent("visual-whiteboard:open-widgets"));
      setActiveTool("select");
      return;
    }
    setActiveTool(tool);
  }

  const isPanMode = activeTool === "hand";
  const isCreateMode = !["select", "hand", "widget"].includes(activeTool);

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
          cursor: isPanMode
            ? dragStart
              ? "grabbing"
              : "grab"
            : isCreateMode
              ? "crosshair"
              : "default",
          backgroundImage: `radial-gradient(circle, rgba(100,116,139,0.28) 1.5px, transparent 1.5px)`,
          backgroundSize: `${gridBgSize}px ${gridBgSize}px`,
          backgroundPosition: `${gridBgPosX}px ${gridBgPosY}px`,
        }}
        onClick={() => {
          if (ignoreNextCanvasClick.current) {
            ignoreNextCanvasClick.current = false;
            return;
          }
          setSelectedId(null);
        }}
        onPointerCancel={() => {
          setDraft(null);
          setDragStart(null);
          setIsPanning(false);
        }}
        onPointerDown={(e) => {
          if (isCreateMode) {
            if (activeTool === "task_list") {
              ignoreNextCanvasClick.current = true;
              void createItemAtPosition(activeTool, e.clientX, e.clientY).then(
                () => setActiveTool("select"),
              );
              return;
            }
            const point = getCanvasPoint(e.clientX, e.clientY);
            if (!point) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            setSelectedId(null);
            setInlineEdit(null);
            if (activeTool === "pen") {
              setDraft({
                points: [point],
                pointerId: e.pointerId,
                type: "drawing",
              });
            } else if (
              activeTool === "shape" ||
              activeTool === "frame" ||
              activeTool === "arrow" ||
              activeTool === "text" ||
              activeTool === "sticky_note"
            ) {
              setDraft({
                current: point,
                pointerId: e.pointerId,
                start: point,
                type: activeTool,
              });
            }
            return;
          }
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
          if (draft?.pointerId === e.pointerId) {
            const point = getCanvasPoint(e.clientX, e.clientY);
            if (!point) return;
            setDraft((current) => {
              if (!current || current.pointerId !== e.pointerId) return current;
              if (current.type === "drawing") {
                const last = current.points[current.points.length - 1];
                if (
                  last &&
                  Math.hypot(last.x - point.x, last.y - point.y) < 2
                ) {
                  return current;
                }
                return { ...current, points: [...current.points, point] };
              }
              return { ...current, current: point };
            });
            return;
          }
          if (!dragStart || dragStart.pointerId !== e.pointerId) return;
          setPan({
            x: dragStart.panX + e.clientX - dragStart.x,
            y: dragStart.panY + e.clientY - dragStart.y,
          });
          triggerPanIndicator();
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          if (draft?.pointerId === e.pointerId) {
            const currentDraft = draft;
            setDraft(null);
            ignoreNextCanvasClick.current = true;
            void createItemFromDraft(currentDraft).then(() =>
              setActiveTool("select"),
            );
            return;
          }
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
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    openEditFor(item);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(item.id);
                      if (e.key === "Enter") openEditFor(item);
                    }
                    if (e.key === "Delete" || e.key === "Backspace") {
                      if (selected) setConfirmDelete({ itemId: item.id });
                    }
                  }}
                  onPointerCancel={() => setItemDrag(null)}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (inlineEdit?.itemId === item.id) return;
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
                  <ItemCard
                    inlineEdit={inlineEdit}
                    item={item}
                    onEdit={() => openEditFor(item)}
                    onOpenBoardLink={onBoardSelect}
                    onInlineCancel={cancelInlineEdit}
                    onInlineChange={updateInlineEdit}
                    onInlineCommit={() => {
                      void commitInlineEdit();
                    }}
                  />

                  {/* Selection ring + handles */}
                  {selected && (
                    <>
                      <div
                        className="pointer-events-none absolute -inset-1 rounded-xl"
                        style={{
                          outline: "2px solid var(--accent)",
                          outlineOffset: "2px",
                        }}
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
                        {isInlineEditableType(item.type) && (
                          <ActionBtn
                            label="Edit inline"
                            onClick={() => openEditFor(item)}
                          >
                            <Edit3 size={15} />
                          </ActionBtn>
                        )}
                        <ActionBtn label="Copy" onClick={() => copyItem(item)}>
                          <Copy size={15} />
                        </ActionBtn>
                        <ActionBtn label="Refresh" onClick={onRefreshNeeded}>
                          <RefreshCcw size={15} />
                        </ActionBtn>
                        <ActionBtn
                          danger
                          label="Delete"
                          onClick={() => setConfirmDelete({ itemId: item.id })}
                        >
                          <Trash2 size={15} />
                        </ActionBtn>
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
            {draft && (
              <DraftPreview
                activeColor={activeColor}
                draft={draft}
                shapeKind={activeShapeKind}
              />
            )}
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
        activeShapeKind={activeShapeKind}
        activeTool={activeTool}
        activeColor={activeColor}
        zoom={zoom}
        onShapeKindChange={setActiveShapeKind}
        onToolChange={handleToolChange}
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
              ...(isInlineEditableType(selectedItem.type)
                ? [{ label: "Edit", action: () => openEditFor(selectedItem) }]
                : []),
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
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
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

function DraftPreview({
  activeColor,
  draft,
  shapeKind,
}: {
  activeColor: string | null;
  draft: NonNullable<DraftState>;
  shapeKind: ShapeKind;
}) {
  const stroke = activeColor ?? DEFAULT_STROKE;
  if (draft.type === "drawing") {
    const bounds = getPointsBounds(draft.points);
    const pad = 10;
    const x = bounds.x - pad;
    const y = bounds.y - pad;
    const points = draft.points.map((point) => ({
      x: point.x - x,
      y: point.y - y,
    }));
    return (
      <svg
        className="pointer-events-none absolute overflow-visible opacity-80"
        style={{
          height: bounds.height + pad * 2,
          left: x,
          top: y,
          width: bounds.width + pad * 2,
        }}
        viewBox={`0 0 ${bounds.width + pad * 2} ${bounds.height + pad * 2}`}
      >
        <path
          d={pointsToPath(points)}
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
        />
      </svg>
    );
  }

  const bounds = getBounds(draft.start, draft.current);
  const style = {
    height: Math.max(1, bounds.height),
    left: bounds.x,
    top: bounds.y,
    width: Math.max(1, bounds.width),
  };

  if (draft.type === "arrow") {
    return (
      <svg
        className="pointer-events-none absolute overflow-visible opacity-80"
        style={style}
        viewBox={`0 0 ${Math.max(1, bounds.width)} ${Math.max(1, bounds.height)}`}
      >
        <defs>
          <marker
            id="draft-arrow"
            markerHeight="8"
            markerWidth="8"
            orient="auto"
            refX="7"
            refY="4"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" fill={stroke} />
          </marker>
        </defs>
        <line
          markerEnd="url(#draft-arrow)"
          stroke={stroke}
          strokeLinecap="round"
          strokeWidth="3"
          x1={draft.start.x <= draft.current.x ? 0 : bounds.width}
          x2={draft.start.x <= draft.current.x ? bounds.width : 0}
          y1={draft.start.y <= draft.current.y ? 0 : bounds.height}
          y2={draft.start.y <= draft.current.y ? bounds.height : 0}
        />
      </svg>
    );
  }

  if (draft.type === "frame") {
    return (
      <div
        className="pointer-events-none absolute rounded-xl border-2 border-dashed opacity-80"
        style={{
          ...style,
          background: activeColor
            ? `${activeColor}18`
            : "rgba(255,255,255,0.04)",
          borderColor: activeColor ?? "var(--border-strong)",
        }}
      />
    );
  }

  if (draft.type === "shape") {
    return (
      <svg
        className="pointer-events-none absolute overflow-visible opacity-80"
        style={style}
        viewBox={`0 0 ${Math.max(1, bounds.width)} ${Math.max(1, bounds.height)}`}
      >
        {shapeKind === "ellipse" && (
          <ellipse
            cx="50%"
            cy="50%"
            fill={activeColor ?? "#dbeafe"}
            rx="48%"
            ry="46%"
            stroke={activeColor ?? "#93c5fd"}
            strokeWidth="2"
          />
        )}
        {shapeKind === "diamond" && (
          <polygon
            fill={activeColor ?? "#dbeafe"}
            points={`${bounds.width / 2},2 ${bounds.width - 2},${bounds.height / 2} ${bounds.width / 2},${bounds.height - 2} 2,${bounds.height / 2}`}
            stroke={activeColor ?? "#93c5fd"}
            strokeLinejoin="round"
            strokeWidth="2"
          />
        )}
        {shapeKind === "rectangle" && (
          <rect
            fill={activeColor ?? "#dbeafe"}
            height={Math.max(1, bounds.height - 4)}
            rx="10"
            stroke={activeColor ?? "#93c5fd"}
            strokeWidth="2"
            width={Math.max(1, bounds.width - 4)}
            x="2"
            y="2"
          />
        )}
      </svg>
    );
  }

  return (
    <div
      className="pointer-events-none absolute rounded-xl border opacity-70"
      style={{
        ...style,
        background:
          draft.type === "sticky_note"
            ? (activeColor ?? "#fef9c3")
            : "var(--bg-surface)",
        borderColor: activeColor ?? "var(--border-strong)",
      }}
    />
  );
}

function ActionBtn({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-md transition-colors"
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
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
