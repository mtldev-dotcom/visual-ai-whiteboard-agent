"use client";

import { ChevronRight, FolderOpen, LayoutTemplate, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { WidgetLibrary } from "./WidgetLibrary";

type Board = {
  id: string;
  title: string;
  parentBoardId: string | null;
};

type Props = {
  initialBoards: Board[];
  activeBoardId: string | null;
  onBoardSelect: (boardId: string) => void;
  onBoardCreated: (board: Board) => void;
  onItemAdded?: () => void;
};

export function BoardExplorer({
  initialBoards,
  activeBoardId,
  onBoardSelect,
  onBoardCreated,
  onItemAdded,
}: Props) {
  const [boards, setBoards] = useState(initialBoards);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Board[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; name: string; description: string; category: string }[]>([]);
  const [applyingTemplate, setApplyingTemplate] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = search.trim();
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      if (!q) {
        setSearchResults(null);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(`/api/boards?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { boards?: Board[] };
        setSearchResults(data.boards ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [search]);

  const displayed = search.trim() ? (searchResults ?? boards) : boards;
  const topLevel = displayed.filter((b) => !b.parentBoardId);
  const subBoards = (parentId: string) =>
    displayed.filter((b) => b.parentBoardId === parentId);

  const createBoard = useCallback(async () => {
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = (await res.json()) as { board?: Board; error?: string };
      if (data.board) {
        setBoards((prev) => [data.board!, ...prev]);
        onBoardCreated(data.board!);
        onBoardSelect(data.board!.id);
        setNewTitle("");
        setShowCreate(false);
      }
    } finally {
      setCreating(false);
    }
  }, [newTitle, onBoardCreated, onBoardSelect]);

  async function openTemplates() {
    setShowTemplates(true);
    if (templates.length) return;
    const res = await fetch("/api/boards/from-template");
    const data = (await res.json()) as { templates?: { id: string; name: string; description: string; category: string }[] };
    setTemplates(data.templates ?? []);
  }

  async function applyTemplate(templateId: string) {
    setApplyingTemplate(templateId);
    try {
      const res = await fetch("/api/boards/from-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const data = (await res.json()) as { boardId?: string; boardTitle?: string };
      if (data.boardId && data.boardTitle) {
        const board: Board = { id: data.boardId, title: data.boardTitle, parentBoardId: null };
        setBoards((prev) => [board, ...prev]);
        onBoardCreated(board);
        onBoardSelect(board.id);
        setShowTemplates(false);
      }
    } finally {
      setApplyingTemplate(null);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Section header */}
      <div className="flex items-center justify-between pb-1">
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--text-3)" }}
        >
          Boards
        </span>
        <div className="flex items-center gap-1">
          <button
            className="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
            onClick={openTemplates}
            style={{ color: "var(--text-3)" }}
            title="Use a template"
            type="button"
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "var(--accent-light)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "")
            }
          >
            <LayoutTemplate size={13} />
          </button>
          <button
            className="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
            onClick={() => setShowCreate((v) => !v)}
            style={{ color: "var(--text-3)" }}
            title="New board"
            type="button"
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "var(--accent-light)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "")
            }
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Template picker */}
      {showTemplates && (
        <div
          className="animate-scale-in rounded-lg border p-3"
          style={{ background: "var(--bg-surface)", borderColor: "var(--accent)" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--text-1)" }}>
              Templates
            </span>
            <button
              onClick={() => setShowTemplates(false)}
              style={{ color: "var(--text-3)" }}
              type="button"
              className="text-xs"
            >
              ✕
            </button>
          </div>
          <div className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto pr-0.5">
            {Array.from(new Set(templates.map((t) => t.category))).map((cat) => (
              <div key={cat}>
                <div
                  className="mb-1 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--text-3)" }}
                >
                  {cat}
                </div>
                <div className="flex flex-col gap-1">
                  {templates.filter((t) => t.category === cat).map((t) => (
                    <button
                      className="rounded-lg border p-2 text-left text-xs transition-colors disabled:opacity-50"
                      disabled={applyingTemplate === t.id}
                      key={t.id}
                      onClick={() => applyTemplate(t.id)}
                      style={{ background: "var(--bg-sidebar)", borderColor: "var(--border)", color: "var(--text-1)" }}
                      type="button"
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.borderColor = "var(--accent)")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.borderColor = "var(--border)")
                      }
                    >
                      <div className="font-semibold">{t.name}</div>
                      <div style={{ color: "var(--text-3)" }}>{t.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div
        className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
        }}
      >
        <Search size={12} style={{ color: "var(--text-3)" }} />
        <input
          className="flex-1 bg-transparent text-xs outline-none"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search boards…"
          style={{ color: "var(--text-1)" }}
          value={search}
        />
        {searching && (
          <span
            className="h-3 w-3 animate-spin rounded-full border border-t-transparent"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
          />
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div
          className="animate-scale-in rounded-lg border p-2"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--accent)",
          }}
        >
          <input
            autoFocus
            className="mb-2 w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
            onKeyDown={(e) => e.key === "Enter" && createBoard()}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Board name…"
            style={{
              background: "var(--bg-sidebar)",
              borderColor: "var(--border)",
              color: "var(--text-1)",
            }}
            value={newTitle}
          />
          <div className="flex gap-1.5">
            <button
              className="flex-1 rounded-md py-1 text-xs font-medium transition-colors"
              disabled={creating || !newTitle.trim()}
              onClick={createBoard}
              style={{
                background: "var(--accent)",
                color: "var(--accent-fg)",
                opacity: creating || !newTitle.trim() ? 0.5 : 1,
              }}
              type="button"
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              className="rounded-md px-2 py-1 text-xs"
              onClick={() => {
                setShowCreate(false);
                setNewTitle("");
              }}
              style={{ color: "var(--text-3)" }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Board list */}
      <div className="mt-1 flex flex-col gap-0.5">
        {topLevel.length === 0 && !search && (
          <div
            className="flex flex-col items-center gap-2 rounded-xl py-6 text-center"
            style={{ color: "var(--text-3)" }}
          >
            <FolderOpen size={28} />
            <p className="text-xs">No boards yet</p>
            <button
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              onClick={() => setShowCreate(true)}
              style={{
                background: "var(--accent-light)",
                color: "var(--accent)",
              }}
              type="button"
            >
              Create one
            </button>
          </div>
        )}

        {topLevel.map((board) => {
          const subs = subBoards(board.id);
          const isActive = activeBoardId === board.id;
          return (
            <div key={board.id}>
              <button
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors"
                onClick={() => onBoardSelect(board.id)}
                style={{
                  background: isActive ? "var(--accent-light)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text-2)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--bg-surface)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.background = "";
                }}
                type="button"
              >
                <FolderOpen size={13} />
                <span className="flex-1 truncate">{board.title}</span>
                {subs.length > 0 && (
                  <ChevronRight size={11} style={{ color: "var(--text-3)" }} />
                )}
              </button>
              {subs.map((sub) => (
                <button
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 pl-7 text-left text-xs font-medium transition-colors"
                  key={sub.id}
                  onClick={() => onBoardSelect(sub.id)}
                  style={{
                    background:
                      activeBoardId === sub.id
                        ? "var(--accent-light)"
                        : "transparent",
                    color:
                      activeBoardId === sub.id
                        ? "var(--accent)"
                        : "var(--text-3)",
                  }}
                  onMouseEnter={(e) => {
                    if (activeBoardId !== sub.id)
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--bg-surface)";
                  }}
                  onMouseLeave={(e) => {
                    if (activeBoardId !== sub.id)
                      (e.currentTarget as HTMLElement).style.background = "";
                  }}
                  type="button"
                >
                  <span
                    className="h-3 w-3 rounded-sm border"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <span className="flex-1 truncate">{sub.title}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Widget library */}
      <WidgetLibrary activeBoardId={activeBoardId} onItemAdded={onItemAdded} />
    </div>
  );
}
