"use client";

import {
  AlignJustify,
  ArrowRight,
  CheckSquare,
  Circle,
  Diamond,
  Frame,
  Hand,
  LayoutGrid,
  Minus,
  MousePointer2,
  PenTool,
  Plus,
  Square,
  StickyNote,
  Type,
} from "lucide-react";
import { useEffect } from "react";

export type CanvasTool =
  | "select"
  | "hand"
  | "pen"
  | "shape"
  | "frame"
  | "arrow"
  | "text"
  | "sticky_note"
  | "task_list"
  | "widget";

export type ShapeKind = "rectangle" | "ellipse" | "diamond";

export const PALETTE: {
  value: string | null;
  label: string;
  bg: string;
  ring: string;
}[] = [
  {
    value: null,
    label: "None",
    bg: "var(--bg-surface)",
    ring: "var(--border-strong)",
  },
  { value: "#fef9c3", label: "Yellow", bg: "#fef9c3", ring: "#fde047" },
  { value: "#dbeafe", label: "Blue", bg: "#dbeafe", ring: "#93c5fd" },
  { value: "#dcfce7", label: "Green", bg: "#dcfce7", ring: "#86efac" },
  { value: "#fce7f3", label: "Pink", bg: "#fce7f3", ring: "#f9a8d4" },
  { value: "#f3e8ff", label: "Purple", bg: "#f3e8ff", ring: "#d8b4fe" },
  { value: "#fed7aa", label: "Orange", bg: "#fed7aa", ring: "#fb923c" },
  { value: "#fee2e2", label: "Red", bg: "#fee2e2", ring: "#fca5a5" },
  { value: "#1e293b", label: "Dark", bg: "#1e293b", ring: "#475569" },
];

const NAV_TOOLS: { id: CanvasTool; Icon: React.ElementType; label: string }[] =
  [
    { id: "select", Icon: MousePointer2, label: "Select  V" },
    { id: "hand", Icon: Hand, label: "Pan  H" },
  ];

const DRAW_TOOLS: { id: CanvasTool; Icon: React.ElementType; label: string }[] =
  [
    { id: "pen", Icon: PenTool, label: "Pen  P" },
    { id: "shape", Icon: Square, label: "Shape  R" },
    { id: "frame", Icon: Frame, label: "Frame  F" },
    { id: "arrow", Icon: ArrowRight, label: "Arrow  A" },
  ];

const CREATE_TOOLS: {
  id: CanvasTool;
  Icon: React.ElementType;
  label: string;
}[] = [
  { id: "text", Icon: Type, label: "Text  T" },
  { id: "sticky_note", Icon: StickyNote, label: "Sticky  S" },
  { id: "task_list", Icon: CheckSquare, label: "Task list  K" },
  { id: "widget", Icon: LayoutGrid, label: "Widget  W" },
];

const SHAPE_KINDS: { id: ShapeKind; Icon: React.ElementType; label: string }[] =
  [
    { id: "rectangle", Icon: Square, label: "Rectangle" },
    { id: "ellipse", Icon: Circle, label: "Ellipse" },
    { id: "diamond", Icon: Diamond, label: "Diamond" },
  ];

type Props = {
  activeTool: CanvasTool;
  activeColor: string | null;
  activeShapeKind: ShapeKind;
  zoom: number;
  onToolChange: (tool: CanvasTool) => void;
  onColorChange: (color: string | null) => void;
  onShapeKindChange: (shape: ShapeKind) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onTidy: () => void;
};

export function CanvasToolbar({
  activeTool,
  activeColor,
  activeShapeKind,
  zoom,
  onToolChange,
  onColorChange,
  onShapeKindChange,
  onZoomIn,
  onZoomOut,
  onTidy,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return;
      switch (e.key.toLowerCase()) {
        case "v":
          onToolChange("select");
          break;
        case "h":
          onToolChange("hand");
          break;
        case "p":
          onToolChange("pen");
          break;
        case "r":
          onToolChange("shape");
          break;
        case "f":
          onToolChange("frame");
          break;
        case "a":
          onToolChange("arrow");
          break;
        case "t":
          onToolChange("text");
          break;
        case "s":
          onToolChange("sticky_note");
          break;
        case "k":
          onToolChange("task_list");
          break;
        case "w":
          onToolChange("widget");
          break;
        case "+":
        case "=":
          onZoomIn();
          break;
        case "-":
          onZoomOut();
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onToolChange, onZoomIn, onZoomOut]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex flex-col items-center gap-2">
      {/* Color palette */}
      <div
        className="pointer-events-auto flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5"
        style={{
          background: "var(--bg-elevated)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {PALETTE.map((c) => {
          const isActive = activeColor === c.value;
          return (
            <button
              key={c.label}
              title={c.label}
              type="button"
              className="relative h-5 w-5 rounded-full border-2 transition-all hover:scale-110 active:scale-95"
              style={{
                background: c.bg,
                borderColor: isActive ? "var(--accent)" : c.ring,
                boxShadow: isActive ? "0 0 0 2px var(--accent)" : undefined,
              }}
              onClick={() => onColorChange(c.value)}
            >
              {c.value === null && (
                <svg
                  viewBox="0 0 12 12"
                  className="absolute inset-0.5"
                  aria-hidden
                >
                  <line
                    x1="1"
                    y1="11"
                    x2="11"
                    y2="1"
                    stroke="var(--text-3)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {activeTool === "shape" && (
        <div
          className="pointer-events-auto flex items-center gap-1 rounded-xl border p-1"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {SHAPE_KINDS.map(({ id, Icon, label }) => (
            <ToolBtn
              key={id}
              active={activeShapeKind === id}
              label={label}
              onClick={() => onShapeKindChange(id)}
            >
              <Icon size={16} />
            </ToolBtn>
          ))}
        </div>
      )}

      {/* Main toolbar */}
      <div
        className="pointer-events-auto flex items-center gap-0.5 rounded-xl border p-1.5"
        style={{
          background: "var(--bg-elevated)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {NAV_TOOLS.map(({ id, Icon, label }) => (
          <ToolBtn
            key={id}
            active={activeTool === id}
            label={label}
            onClick={() => onToolChange(id)}
          >
            <Icon size={17} />
          </ToolBtn>
        ))}

        <Divider />

        {DRAW_TOOLS.map(({ id, Icon, label }) => (
          <ToolBtn
            key={id}
            active={activeTool === id}
            label={label}
            onClick={() => onToolChange(id)}
          >
            <Icon size={17} />
          </ToolBtn>
        ))}

        <Divider />

        {CREATE_TOOLS.map(({ id, Icon, label }) => (
          <ToolBtn
            key={id}
            active={activeTool === id}
            label={label}
            onClick={() => onToolChange(id)}
          >
            <Icon size={17} />
          </ToolBtn>
        ))}

        <Divider />

        <ToolBtn label="Tidy canvas" onClick={onTidy}>
          <AlignJustify size={15} />
        </ToolBtn>

        <Divider />

        <ToolBtn label="Zoom out  −" onClick={onZoomOut}>
          <Minus size={15} />
        </ToolBtn>
        <span
          className="min-w-[46px] select-none text-center text-xs font-semibold tabular-nums"
          style={{ color: "var(--text-2)" }}
        >
          {Math.round(zoom * 100)}%
        </span>
        <ToolBtn label="Zoom in  +" onClick={onZoomIn}>
          <Plus size={15} />
        </ToolBtn>
      </div>
    </div>
  );
}

function ToolBtn({
  children,
  active,
  label,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
      onClick={onClick}
      style={
        active
          ? { background: "var(--accent-light)", color: "var(--accent)" }
          : { color: "var(--text-2)" }
      }
      title={label}
      type="button"
      onMouseEnter={(e) => {
        if (!active)
          (e.currentTarget as HTMLElement).style.background =
            "var(--accent-light)";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "";
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="mx-1 h-5 w-px" style={{ background: "var(--border)" }} />
  );
}
