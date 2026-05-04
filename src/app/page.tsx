import { AssistantPanel } from "./components/AssistantPanel";
import { BoardCanvas } from "./components/BoardCanvas";
import { WidgetLibrary } from "./components/WidgetLibrary";

export default function Home() {
  const boards = [
    { title: "Launch plan", depth: 0 },
    { title: "Messaging", depth: 1 },
    { title: "Demo board", depth: 1 },
    { title: "Ideas", depth: 0 },
    { title: "Tasks", depth: 0 },
  ];

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
          <a
            className="hidden min-h-11 items-center rounded-md border border-[#c7bfae] px-3 text-sm font-semibold sm:flex"
            href="/core"
          >
            Core
          </a>
          <button className="min-h-11 rounded-md bg-[#2f5d50] px-4 text-sm font-semibold text-white">
            New
          </button>
        </div>
      </header>

      <main className="grid flex-1 gap-0 lg:grid-cols-[280px_1fr_360px]">
        <aside className="hidden border-r border-[#d8d2c3] bg-[#fffdfa] p-4 lg:block">
          <h2 className="text-sm font-semibold">Boards</h2>
          <div className="mt-3">
            <input
              className="min-h-11 w-full rounded-md border border-[#c7bfae] bg-white px-3 text-sm"
              placeholder="Search boards"
            />
          </div>
          <div className="mt-3 space-y-2">
            {boards.map((board) => (
              <button
                className="block w-full rounded-md border border-[#e7e0d0] bg-white px-3 py-2 text-left text-sm"
                key={board.title}
                style={{ paddingLeft: `${12 + board.depth * 18}px` }}
              >
                {board.title}
              </button>
            ))}
          </div>
          <WidgetLibrary />
        </aside>

        <section className="flex min-h-0 flex-col">
          <details className="border-b border-[#d8d2c3] bg-[#fffdfa] lg:hidden">
            <summary className="flex min-h-12 cursor-pointer items-center justify-between px-4 text-sm font-semibold">
              Boards
              <span className="text-xs font-medium text-[#6b7280]">Open</span>
            </summary>
            <div className="border-t border-[#e7e0d0] p-4">
              <input
                className="min-h-11 w-full rounded-md border border-[#c7bfae] bg-white px-3 text-sm"
                placeholder="Search boards"
              />
              <div className="mt-3 space-y-2">
                {boards.map((board) => (
                  <button
                    className="block min-h-11 w-full rounded-md border border-[#e7e0d0] bg-white px-3 py-2 text-left text-sm"
                    key={board.title}
                    style={{ paddingLeft: `${12 + board.depth * 18}px` }}
                  >
                    {board.title}
                  </button>
                ))}
              </div>
              <WidgetLibrary />
            </div>
          </details>

          <div className="flex items-center justify-between border-b border-[#d8d2c3] bg-[#fffdfa] px-4 py-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                Board
              </p>
              <h2 className="text-base font-semibold">Launch plan</h2>
            </div>
            <button className="min-h-11 rounded-md border border-[#c7bfae] px-3 text-sm font-medium">
              Search
            </button>
          </div>

          <BoardCanvas />
        </section>

        <AssistantPanel />
      </main>

      <nav className="grid grid-cols-5 border-t border-[#d8d2c3] bg-[#fffdfa] text-xs font-medium lg:hidden">
        {["Chat", "Board", "Widgets", "Tasks", "Core"].map((item) =>
          item === "Tasks" || item === "Core" ? (
            <a
              className="flex min-h-14 items-center justify-center px-1"
              href={item === "Tasks" ? "/tasks" : "/core"}
              key={item}
            >
              {item}
            </a>
          ) : (
            <button className="min-h-14 px-1" key={item}>
              {item}
            </button>
          ),
        )}
      </nav>
    </div>
  );
}
