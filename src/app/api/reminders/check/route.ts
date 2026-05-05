import { NextResponse } from "next/server";

import { getDueReminders, markReminderSent, nextRemindAt, createReminder } from "@/db/reminders";
import { requireSession } from "@/lib/session";

// GET /api/reminders/check — returns due reminders, marks them sent, creates next occurrence for recurring ones.
// Called by the client on app load and periodically.
export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const due = await getDueReminders(session.workspaceId);
  const triggered: { id: string; title: string; remindAt: string; recurrence: string | null }[] = [];

  for (const reminder of due) {
    await markReminderSent(reminder.id);

    if (reminder.recurrence) {
      const next = nextRemindAt(reminder.remindAt, reminder.recurrence);
      const end = reminder.recurrenceEnd;
      if (!end || next <= end) {
        await createReminder({
          boardId: reminder.boardId ?? undefined,
          canvasItemId: reminder.canvasItemId ?? undefined,
          createdBy: "system",
          recurrence: reminder.recurrence as "daily" | "weekly" | "monthly" | "yearly",
          recurrenceEnd: end ?? undefined,
          remindAt: next,
          taskId: reminder.taskId ?? undefined,
          title: reminder.title,
          workspaceId: reminder.workspaceId,
        });
      }
    }

    triggered.push({
      id: reminder.id,
      title: reminder.title,
      remindAt: reminder.remindAt.toISOString(),
      recurrence: reminder.recurrence,
    });
  }

  return NextResponse.json({ triggered });
}
