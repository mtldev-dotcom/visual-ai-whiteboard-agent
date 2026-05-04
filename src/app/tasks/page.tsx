const tasks = [
  {
    board: "Launch plan",
    due: "Today",
    priority: "high",
    title: "Prepare demo board",
  },
  {
    board: "Launch plan",
    due: "Tomorrow",
    priority: "normal",
    title: "Review Telegram capture flow",
  },
  {
    board: "Ideas",
    due: "Unscheduled",
    priority: "low",
    title: "Collect widget ideas",
  },
];

export default function TasksPage() {
  return (
    <main className="min-h-dvh bg-[#f7f5ef] text-[#1f2933]">
      <header className="border-b border-[#d8d2c3] bg-[#fffdfa] px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">
          Workspace
        </p>
        <h1 className="text-xl font-semibold">Tasks</h1>
      </header>

      <section className="mx-auto w-full max-w-3xl p-4">
        <div className="grid gap-3">
          {tasks.map((task) => (
            <article
              className="rounded-md border border-[#e7e0d0] bg-white p-4"
              key={task.title}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">{task.title}</h2>
                  <p className="mt-1 text-sm text-[#6b7280]">{task.board}</p>
                </div>
                <span className="rounded-md border border-[#c7bfae] px-2 py-1 text-xs font-semibold">
                  {task.priority}
                </span>
              </div>
              <p className="mt-3 text-sm">{task.due}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
