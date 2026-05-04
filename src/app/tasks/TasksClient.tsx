"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type Task = {
  id: string;
  title: string;
  priority: string;
  status: string;
  dueAt: string | null;
  boardId: string | null;
};

type Board = { id: string; title: string };

type Props = {
  initialTasks: Task[];
  boards: Board[];
};

function formatDue(iso: string | null) {
  if (!iso) return "Unscheduled";
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (due.getTime() - today.getTime()) / 86400000;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  return d.toLocaleDateString();
}

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  normal: "bg-[#f7f5ef] text-[#4b5563] border-[#c7bfae]",
  low: "bg-[#f7f5ef] text-[#9ca3af] border-[#e7e0d0]",
};

export function TasksClient({ initialTasks, boards }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueAt, setDueAt] = useState("");
  const [boardId, setBoardId] = useState("");
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);

  async function createTask(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          priority,
          dueAt: dueAt || undefined,
          boardId: boardId || undefined,
        }),
      });
      const data = (await res.json()) as { task?: Task };
      if (data.task) {
        setTasks((prev) => [data.task!, ...prev]);
        setTitle("");
        setDueAt("");
        setBoardId("");
        setPriority("normal");
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function completeTask(id: string) {
    setCompleting(id);
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setCompleting(null);
    }
  }

  const boardMap = Object.fromEntries(boards.map((b) => [b.id, b.title]));

  return (
    <main className="min-h-dvh bg-[#f7f5ef] text-[#1f2933]">
      <header className="border-b border-[#d8d2c3] bg-[#fffdfa] px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">
          Workspace
        </p>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Tasks</h1>
          <div className="flex gap-2">
            <button
              className="min-h-11 rounded-md bg-[#2f5d50] px-4 text-sm font-semibold text-white"
              onClick={() => setShowForm((v) => !v)}
              type="button"
            >
              {showForm ? "Cancel" : "New task"}
            </button>
            <Link
              className="flex min-h-11 items-center rounded-md border border-[#c7bfae] px-3 text-sm font-semibold"
              href="/"
            >
              Board
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-3xl p-4">
        {showForm && (
          <form
            className="mb-4 rounded-md border border-[#d8d2c3] bg-[#fffdfa] p-4"
            onSubmit={createTask}
          >
            <h2 className="mb-3 text-sm font-semibold">New task</h2>
            <div className="grid gap-3">
              <input
                autoFocus
                className="min-h-11 w-full rounded-md border border-[#c7bfae] bg-white px-3 text-sm"
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                required
                value={title}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="min-h-11 rounded-md border border-[#c7bfae] bg-white px-3 text-sm"
                  onChange={(e) => setPriority(e.target.value)}
                  value={priority}
                >
                  <option value="low">Low priority</option>
                  <option value="normal">Normal priority</option>
                  <option value="high">High priority</option>
                </select>
                <input
                  className="min-h-11 rounded-md border border-[#c7bfae] bg-white px-3 text-sm"
                  onChange={(e) => setDueAt(e.target.value)}
                  type="date"
                  value={dueAt}
                />
              </div>
              {boards.length > 0 && (
                <select
                  className="min-h-11 rounded-md border border-[#c7bfae] bg-white px-3 text-sm"
                  onChange={(e) => setBoardId(e.target.value)}
                  value={boardId}
                >
                  <option value="">No board</option>
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              )}
              <button
                className="min-h-11 rounded-md bg-[#2f5d50] text-sm font-semibold text-white disabled:opacity-60"
                disabled={saving || !title.trim()}
                type="submit"
              >
                {saving ? "Adding…" : "Add task"}
              </button>
            </div>
          </form>
        )}

        {tasks.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-[#9ca3af]">
              No open tasks. Create one above.
            </p>
          </div>
        )}

        <div className="grid gap-3">
          {tasks.map((task) => (
            <article
              className="rounded-md border border-[#e7e0d0] bg-white p-4"
              key={task.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold">{task.title}</h2>
                  {task.boardId && (
                    <p className="mt-1 text-sm text-[#6b7280]">
                      {boardMap[task.boardId] ?? "Board"}
                    </p>
                  )}
                </div>
                <span
                  className={`flex-shrink-0 rounded-md border px-2 py-1 text-xs font-semibold ${priorityColors[task.priority] ?? priorityColors.normal}`}
                >
                  {task.priority}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-sm text-[#6b7280]">
                  {formatDue(task.dueAt)}
                </p>
                <button
                  className="min-h-9 rounded-md border border-[#2f5d50] px-3 text-xs font-semibold text-[#2f5d50] disabled:opacity-50 hover:bg-[#e8f2ee]"
                  disabled={completing === task.id}
                  onClick={() => completeTask(task.id)}
                  type="button"
                >
                  {completing === task.id ? "Completing…" : "Mark complete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
