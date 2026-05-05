"use client";

import {
  Bot,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Code2,
  LayoutDashboard,
  Menu,
  Moon,
  Plus,
  Settings,
  Sun,
  X,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

import { AssistantPanel } from "./AssistantPanel";
import { BoardCanvas } from "./BoardCanvas";
import { BoardExplorer } from "./BoardExplorer";
import { useTheme } from "./ThemeProvider";

type Board = {
  id: string;
  title: string;
  parentBoardId: string | null;
};

type Props = {
  initialBoards: Board[];
  userEmail: string;
};

type MobilePanel = "boards" | "chat" | null;

export function WorkspaceShell({ initialBoards, userEmail }: Props) {
  const { theme, toggle: toggleTheme } = useTheme();
  const [boards, setBoards] = useState(initialBoards);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(
    initialBoards[0]?.id ?? null,
  );
  const [canvasRefreshKey, setCanvasRefreshKey] = useState(0);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);

  const activeBoard = boards.find((b) => b.id === activeBoardId) ?? null;

  const refreshCanvas = useCallback(() => {
    setCanvasRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    function openWidgetsPanel() {
      setLeftOpen(true);
      if (window.matchMedia("(max-width: 1023px)").matches) {
        setMobilePanel("boards");
      }
    }
    window.addEventListener("visual-whiteboard:open-widgets", openWidgetsPanel);
    return () =>
      window.removeEventListener(
        "visual-whiteboard:open-widgets",
        openWidgetsPanel,
      );
  }, []);

  const handleBoardCreated = useCallback((board: Board) => {
    setBoards((prev) => [board, ...prev]);
  }, []);

  function closeMobile() {
    setMobilePanel(null);
  }

  const initials = userEmail?.[0]?.toUpperCase() ?? "U";

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden"
      style={{ background: "var(--bg-app)" }}
    >
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header
        className="flex h-11 shrink-0 items-center gap-3 border-b px-3"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Mobile menu button */}
        <button
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors lg:hidden"
          onClick={() =>
            setMobilePanel((p) => (p === "boards" ? null : "boards"))
          }
          style={{ color: "var(--text-2)" }}
          type="button"
        >
          <Menu size={18} />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          >
            W
          </div>
          <span
            className="hidden text-sm font-semibold sm:block"
            style={{ color: "var(--text-1)" }}
          >
            Visual AI
          </span>
        </div>

        {/* Board title */}
        <div className="h-5 w-px" style={{ background: "var(--border)" }} />
        <span
          className="max-w-[160px] truncate text-sm font-medium lg:max-w-xs"
          style={{ color: "var(--text-2)" }}
        >
          {activeBoard?.title ?? "No board"}
        </span>

        <div className="flex-1" />

        {/* Right controls */}
        <Link
          className="hidden h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors lg:flex"
          href="/core"
          style={{ color: "var(--text-2)" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background =
              "var(--accent-light)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "")
          }
        >
          <Code2 size={14} />
          Core
        </Link>

        <Link
          className="hidden h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors lg:flex"
          href="/tasks"
          style={{ color: "var(--text-2)" }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background =
              "var(--accent-light)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "")
          }
        >
          Tasks
        </Link>

        <Link
          className="hidden h-7 w-7 items-center justify-center rounded-lg transition-colors lg:flex"
          href="/settings"
          style={{ color: "var(--text-2)" }}
          title="Settings"
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background =
              "var(--accent-light)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "")
          }
        >
          <Settings size={15} />
        </Link>

        {/* Theme toggle */}
        <button
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          onClick={toggleTheme}
          style={{ color: "var(--text-2)" }}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
          type="button"
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background =
              "var(--accent-light)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = "")
          }
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* User avatar + sign out */}
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-opacity hover:opacity-80"
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
          title={`Sign out (${userEmail})`}
          type="button"
        >
          {initials}
        </button>
      </header>

      {/* ─── Main ───────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        {/* Left sidebar — desktop */}
        <aside
          className="hidden shrink-0 flex-col border-r transition-all duration-200 lg:flex"
          style={{
            width: leftOpen ? "260px" : "0",
            overflow: "hidden",
            background: "var(--bg-sidebar)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex w-[260px] min-w-0 flex-1 flex-col overflow-y-auto p-3">
            <BoardExplorer
              activeBoardId={activeBoardId}
              initialBoards={boards}
              onBoardCreated={handleBoardCreated}
              onBoardSelect={setActiveBoardId}
              onItemAdded={refreshCanvas}
            />
          </div>
        </aside>

        {/* Canvas area */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          {/* Left toggle — desktop */}
          <button
            className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 translate-x-0 items-center justify-center rounded-r-lg border border-l-0 transition-all duration-200 lg:flex"
            onClick={() => setLeftOpen((v) => !v)}
            style={{
              height: "48px",
              width: "16px",
              background: "var(--bg-surface)",
              borderColor: "var(--border)",
              color: "var(--text-3)",
              boxShadow: "var(--shadow-sm)",
            }}
            title={leftOpen ? "Hide boards" : "Show boards"}
            type="button"
          >
            {leftOpen ? <ChevronLeft size={11} /> : <ChevronRight size={11} />}
          </button>

          <BoardCanvas
            boardId={activeBoardId}
            refreshKey={canvasRefreshKey}
            onBoardSelect={setActiveBoardId}
            onRefreshNeeded={refreshCanvas}
          />

          {/* Right toggle — desktop */}
          <button
            className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-l-lg border border-r-0 transition-all duration-200 lg:flex"
            onClick={() => setRightOpen((v) => !v)}
            style={{
              height: "48px",
              width: "16px",
              background: "var(--bg-surface)",
              borderColor: "var(--border)",
              color: "var(--text-3)",
              boxShadow: "var(--shadow-sm)",
            }}
            title={rightOpen ? "Hide assistant" : "Show assistant"}
            type="button"
          >
            {rightOpen ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
          </button>
        </div>

        {/* Right panel — desktop */}
        <aside
          className="hidden shrink-0 flex-col border-l transition-all duration-200 lg:flex"
          style={{
            width: rightOpen ? "340px" : "0",
            overflow: "hidden",
            background: "var(--bg-sidebar)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex w-[340px] min-h-0 flex-1 flex-col">
            <AssistantPanel
              boardId={activeBoardId}
              onCanvasChanged={refreshCanvas}
            />
          </div>
        </aside>
      </div>

      {/* ─── Mobile bottom nav ──────────────────────────────────────── */}
      <nav
        className="flex shrink-0 items-center border-t lg:hidden"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
          height: "56px",
        }}
      >
        {[
          {
            id: "boards",
            icon: <LayoutDashboard size={20} />,
            label: "Boards",
            action: () =>
              setMobilePanel((p) => (p === "boards" ? null : "boards")),
            active: mobilePanel === "boards",
          },
          {
            id: "chat",
            icon: <Bot size={20} />,
            label: "Chat",
            action: () => setMobilePanel((p) => (p === "chat" ? null : "chat")),
            active: mobilePanel === "chat",
          },
          {
            id: "add",
            icon: <Plus size={22} />,
            label: "",
            action: () =>
              setMobilePanel((p) => (p === "boards" ? null : "boards")),
            active: false,
            isAccent: true,
          },
          {
            id: "tasks",
            icon: <CheckSquare size={20} />,
            label: "Tasks",
            href: "/tasks",
            active: false,
          },
          {
            id: "settings",
            icon: <Settings size={20} />,
            label: "Settings",
            href: "/settings",
            active: false,
          },
        ].map((item) =>
          item.href ? (
            <Link
              className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors"
              href={item.href}
              key={item.id}
              style={{ color: "var(--text-3)", minHeight: "56px" }}
            >
              {item.icon}
              {item.label}
            </Link>
          ) : item.isAccent ? (
            <button
              className="flex flex-1 items-center justify-center"
              key={item.id}
              onClick={item.action}
              style={{ minHeight: "56px" }}
              type="button"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-fg)",
                }}
              >
                {item.icon}
              </span>
            </button>
          ) : (
            <button
              className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors"
              key={item.id}
              onClick={item.action}
              style={{
                color: item.active ? "var(--accent)" : "var(--text-3)",
                minHeight: "56px",
              }}
              type="button"
            >
              {item.icon}
              {item.label}
            </button>
          ),
        )}
      </nav>

      {/* ─── Mobile: Boards drawer ──────────────────────────────────── */}
      {mobilePanel === "boards" && (
        <>
          <div
            className="animate-fade-in fixed inset-0 z-40 lg:hidden"
            onClick={closeMobile}
            style={{ background: "var(--bg-overlay)" }}
          />
          <div
            className="animate-slide-up fixed inset-x-0 bottom-14 z-50 rounded-t-2xl border-t lg:hidden"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border)",
              maxHeight: "75dvh",
              overflow: "auto",
            }}
          >
            <div
              className="flex items-center justify-between border-b p-4"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--text-1)" }}
              >
                Boards & Widgets
              </span>
              <button
                onClick={closeMobile}
                style={{ color: "var(--text-3)" }}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <BoardExplorer
                activeBoardId={activeBoardId}
                initialBoards={boards}
                onBoardCreated={handleBoardCreated}
                onBoardSelect={(id) => {
                  setActiveBoardId(id);
                  closeMobile();
                }}
                onItemAdded={() => {
                  refreshCanvas();
                  closeMobile();
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* ─── Mobile: Chat drawer ────────────────────────────────────── */}
      {mobilePanel === "chat" && (
        <>
          <div
            className="animate-fade-in fixed inset-0 z-40 lg:hidden"
            onClick={closeMobile}
            style={{ background: "var(--bg-overlay)" }}
          />
          <div
            className="animate-slide-up fixed inset-x-0 bottom-14 z-50 flex flex-col rounded-t-2xl border-t lg:hidden"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border)",
              height: "72dvh",
            }}
          >
            <div
              className="flex items-center justify-between border-b p-4"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--text-1)" }}
              >
                AI Assistant
              </span>
              <button
                onClick={closeMobile}
                style={{ color: "var(--text-3)" }}
                type="button"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <AssistantPanel
                boardId={activeBoardId}
                onCanvasChanged={() => {
                  refreshCanvas();
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
