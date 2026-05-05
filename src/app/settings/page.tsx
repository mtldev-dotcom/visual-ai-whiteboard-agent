import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { getPrismaClient } from "@/db/client";
import { authOptions } from "@/lib/auth";

import { TelegramSettings } from "./TelegramSettings";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.workspaceId) {
    redirect("/login");
  }

  const prisma = getPrismaClient();
  const account = await prisma.telegramAccount.findFirst({
    where: { ownerUserId: session.user.id, unlinkedAt: null },
    select: {
      telegramUserId: true,
      username: true,
      firstName: true,
      lastName: true,
      linkedAt: true,
    },
  });

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? null;

  return (
    <div
      className="min-h-dvh"
      style={{ background: "var(--bg-app)" }}
    >
      {/* Header */}
      <header
        className="flex h-11 items-center gap-3 border-b px-4"
        style={{
          background: "var(--bg-surface)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <a
          href="/"
          className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--text-2)" }}
        >
          ← Back
        </a>
        <div className="h-5 w-px" style={{ background: "var(--border)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
          Settings
        </span>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-8 text-xl font-bold" style={{ color: "var(--text-1)" }}>
          Account Settings
        </h1>

        <section
          className="rounded-xl border p-6"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <TelegramSettings
            initialAccount={account ? {
              telegramUserId: account.telegramUserId,
              username: account.username,
              firstName: account.firstName,
              lastName: account.lastName,
              linkedAt: account.linkedAt.toISOString(),
            } : null}
            botUsername={botUsername}
          />
        </section>
      </div>
    </div>
  );
}
