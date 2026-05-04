"use client";

import {
  CheckSquare,
  Hand,
  LayoutGrid,
  Minus,
  MousePointer2,
  Plus,
  StickyNote,
  Type,
} from "lucide-react";
import { useEffect } from "react";

export type CanvasTool =
  | "select"
  | "hand"
  | "text"
  | "sticky_note"
  | "task_list"
  | "widget";

const NAV_TOOLS: { id: CanvasTool; Icon: React.ElementType; label: string }[] =
  [
    { id: "select", Icon: MousePointer2, label: "Select  V" },
    { id: "hand", Icon: Hand, label: "Pan  H" },
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

type Props = {
  activeTool: CanvasTool;
  zoom: number;
  onToolChange: (tool: CanvasTool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

export function CanvasToolbar({
  activeTool,
  zoom,
  onToolChange,
  onZoomIn,
  onZoomOut,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      switch (e.key.toLowerCase()) {
        case "v":
          onToolChange("select");
          break;
        case "h":
          onToolChange("hand");
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
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center">
      <div
        className="pointer-events-auto flex items-center gap-0.5 rounded-xl border p-1.5"
        style={{
          background: "var(--bg-elevated)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Nav tools */}
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

        {/* Create tools */}
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

        {/* Zoom */}
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
          ? {
              background: "var(--accent-light)",
              color: "var(--accent)",
            }
          : {
              color: "var(--text-2)",
            }
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
