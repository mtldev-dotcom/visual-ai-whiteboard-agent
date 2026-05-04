"use client";

import { signOut } from "next-auth/react";
import { useCallback, useState } from "react";

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
};

export function BoardExplorer({
  initialBoards,
  activeBoardId,
  onBoardSelect,
  onBoardCreated,
}: Props) {
  const [boards, setBoards] = useState(initialBoards);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const filtered = search.trim()
    ? boards.filter((b) => b.title.toLowerCase().includes(search.toLowerCase()))
    : boards;

  const topLevel = filtered.filter((b) => !b.parentBoardId);
  const subBoards = (parentId: string) =>
    filtered.filter((b) => b.parentBoardId === parentId);

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
      }
    } finally {
      setCreating(false);
    }
  }, [newTitle, onBoardCreated, onBoardSelect]);

  return (
    <>
      <h2 className="text-sm font-semibold">Boards</h2>
      <div className="mt-3">
        <input
          className="min-h-11 w-full rounded-md border border-[#c7bfae] bg-white px-3 text-sm"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search boards"
          value={search}
        />
      </div>

      <div className="mt-3 space-y-1">
        {topLevel.length === 0 && !search && (
          <p className="px-2 py-3 text-sm text-[#9ca3af]">
            No boards yet. Create one below.
          </p>
        )}
        {topLevel.map((board) => (
          <div key={board.id}>
            <button
              className={`block w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                activeBoardId === board.id
                  ? "border-[#2f5d50] bg-[#e8f2ee] font-semibold"
                  : "border-[#e7e0d0] bg-white hover:bg-[#f7f5ef]"
              }`}
              onClick={() => onBoardSelect(board.id)}
            >
              {board.title}
            </button>
            {subBoards(board.id).map((sub) => (
              <button
                className={`mt-1 block w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  activeBoardId === sub.id
                    ? "border-[#2f5d50] bg-[#e8f2ee] font-semibold"
                    : "border-[#e7e0d0] bg-white hover:bg-[#f7f5ef]"
                }`}
                key={sub.id}
                onClick={() => onBoardSelect(sub.id)}
                style={{ paddingLeft: "30px" }}
              >
                {sub.title}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="min-h-10 flex-1 rounded-md border border-[#c7bfae] bg-white px-3 text-sm"
          onKeyDown={(e) => e.key === "Enter" && createBoard()}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New board name"
          value={newTitle}
        />
        <button
          className="min-h-10 rounded-md bg-[#2f5d50] px-3 text-sm font-semibold text-white disabled:opacity-50"
          disabled={creating || !newTitle.trim()}
          onClick={createBoard}
          type="button"
        >
          {creating ? "…" : "+"}
        </button>
      </div>

      <WidgetLibrary activeBoardId={activeBoardId} />

      <div className="mt-6 border-t border-[#e7e0d0] pt-4">
        <button
          className="text-xs text-[#9ca3af] hover:text-[#6b7280]"
          onClick={() => signOut({ callbackUrl: "/login" })}
          type="button"
        >
          Sign out
        </button>
      </div>
    </>
  );
}
