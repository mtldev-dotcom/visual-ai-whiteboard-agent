"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

type DueReminder = { id: string; title: string; remindAt: string; recurrence: string | null };

const POLL_MS = 5 * 60 * 1000; // 5 minutes

export function ReminderNotifier() {
  const { status } = useSession();
  const [toasts, setToasts] = useState<DueReminder[]>([]);

  const check = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch("/api/reminders/check");
      if (!res.ok) return;
      const data = (await res.json()) as { triggered: DueReminder[] };
      if (data.triggered.length > 0) {
        setToasts((prev) => [...prev, ...data.triggered]);
      }
    } catch {
      // silent — not critical
    }
  }, [status]);

  useEffect(() => {
    void check();
    const interval = setInterval(() => void check(), POLL_MS);
    return () => clearInterval(interval);
  }, [check]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-slide-up pointer-events-auto flex max-w-xs items-start gap-3 rounded-xl border p-3 shadow-lg"
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-xl)",
          }}
        >
          <span className="mt-0.5 text-base">🔔</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
              Reminder
            </p>
            <p className="truncate text-sm" style={{ color: "var(--text-2)" }}>
              {t.title}
            </p>
            {t.recurrence && (
              <p className="mt-0.5 text-xs" style={{ color: "var(--text-3)" }}>
                Repeats {t.recurrence}
              </p>
            )}
          </div>
          <button
            className="flex-shrink-0 rounded-md p-1 text-xs"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            style={{ color: "var(--text-3)" }}
            type="button"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
