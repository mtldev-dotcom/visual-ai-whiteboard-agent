"use client";

import { useCallback, useState } from "react";

import { AssistantPanel } from "./AssistantPanel";
import { BoardCanvas } from "./BoardCanvas";
import { BoardExplorer } from "./BoardExplorer";

type Board = {
  id: string;
  title: string;
  parentBoardId: string | null;
};

type Props = {
  initialBoards: Board[];
  userEmail: string;
};

export function WorkspaceShell({ initialBoards, userEmail }: Props) {
  const [boards, setBoards] = useState(initialBoards);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(
    initialBoards[0]?.id ?? null,
  );
  const [canvasRefreshKey, setCanvasRefreshKey] = useState(0);

  const activeBoard = boards.find((b) => b.id === activeBoardId) ?? null;

  const refreshCanvas = useCallback(() => {
    setCanvasRefreshKey((k) => k + 1);
  }, []);

  const handleBoardCreated = useCallback((board: Board) => {
    setBoards((prev) => [board, ...prev]);
  }, []);

  const explorerContent = (
    <BoardExplorer
      activeBoardId={activeBoardId}
      initialBoards={boards}
      onBoardCreated={handleBoardCreated}
      onBoardSelect={setActiveBoardId}
    />
  );

  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f5ef] text-[#1f2933]">
      <header className="flex items-center justify-between border-b border-[#d8d2c3] bg-[#fffdfa] px-4 py-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">
            Workspace
          </p>
          <h1 className="text-lg font-semibold">Visual AI Whiteboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-[#9ca3af] sm:block">
            {userEmail}
          </span>
          <a
            className="hidden min-h-11 items-center rounded-md border border-[#c7bfae] px-3 text-sm font-semibold sm:flex"
            href="/core"
          >
            Core
          </a>
        </div>
      </header>

      <main className="grid flex-1 gap-0 lg:grid-cols-[280px_1fr_360px]">
        <aside className="hidden border-r border-[#d8d2c3] bg-[#fffdfa] p-4 lg:block">
          {explorerContent}
        </aside>

        <section className="flex min-h-0 flex-col">
          <details className="border-b border-[#d8d2c3] bg-[#fffdfa] lg:hidden">
            <summary className="flex min-h-12 cursor-pointer items-center justify-between px-4 text-sm font-semibold">
              Boards
              <span className="text-xs font-medium text-[#6b7280]">Open</span>
            </summary>
            <div className="border-t border-[#e7e0d0] p-4">
              {explorerContent}
            </div>
          </details>

          <div className="flex items-center justify-between border-b border-[#d8d2c3] bg-[#fffdfa] px-4 py-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                Board
              </p>
              <h2 className="text-base font-semibold">
                {activeBoard?.title ?? "No board selected"}
              </h2>
            </div>
          </div>

          <BoardCanvas
            boardId={activeBoardId}
            refreshKey={canvasRefreshKey}
            onRefreshNeeded={refreshCanvas}
          />
        </section>

        <AssistantPanel
          boardId={activeBoardId}
          onCanvasChanged={refreshCanvas}
        />
      </main>

      <nav className="grid grid-cols-5 border-t border-[#d8d2c3] bg-[#fffdfa] text-xs font-medium lg:hidden">
        {["Tasks", "Core"].map((item) => (
          <a
            className="flex min-h-14 items-center justify-center px-1"
            href={item === "Tasks" ? "/tasks" : "/core"}
            key={item}
          >
            {item}
          </a>
        ))}
        {["Chat", "Board", "Widgets"].map((item) => (
          <button className="min-h-14 px-1" key={item} type="button">
            {item}
          </button>
        ))}
      </nav>
    </div>
  );
}
