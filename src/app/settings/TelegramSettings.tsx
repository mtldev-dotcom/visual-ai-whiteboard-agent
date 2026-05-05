"use client";

import { Check, KeyRound, Send, Trash2, Unlink } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

type TelegramAccount = {
  telegramUserId: string;
  telegramChatId: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  linkedAt: string;
};

type TelegramBot = {
  id: string;
  botId: string;
  botUsername: string | null;
  botFirstName: string | null;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
};

type Props = {
  initialAccount: TelegramAccount | null;
  initialBot: TelegramBot | null;
};

export function TelegramSettings({ initialAccount, initialBot }: Props) {
  const [account, setAccount] = useState<TelegramAccount | null>(
    initialAccount,
  );
  const [bot, setBot] = useState<TelegramBot | null>(initialBot);
  const [botToken, setBotToken] = useState("");
  const [telegramUserId, setTelegramUserId] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function connectToken() {
    setLoadingAction("token");
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/telegram/bot", {
        body: JSON.stringify({ token: botToken }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await res.json()) as { bot?: TelegramBot; error?: string };

      if (!res.ok || !data.bot) {
        throw new Error(data.error ?? "Could not connect Telegram bot.");
      }

      setBot(data.bot);
      setAccount(null);
      setBotToken("");
      setNotice(
        "Token connected. Send /start to your bot, then paste the ID it replies with.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not connect Telegram bot.",
      );
    } finally {
      setLoadingAction(null);
    }
  }

  async function connectId() {
    setLoadingAction("id");
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/telegram/account", {
        body: JSON.stringify({ telegramUserId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await res.json()) as {
        account?: TelegramAccount;
        error?: string;
      };

      if (!res.ok || !data.account) {
        throw new Error(data.error ?? "Could not connect Telegram ID.");
      }

      setAccount(data.account);
      setTelegramUserId("");
      setNotice("Telegram ID connected. Try /boards or /tasks in your bot.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not connect Telegram ID.",
      );
    } finally {
      setLoadingAction(null);
    }
  }

  async function disconnectId() {
    setLoadingAction("disconnect-id");
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/telegram/account", { method: "DELETE" });
      if (!res.ok) throw new Error("Could not disconnect Telegram ID.");
      setAccount(null);
      setNotice("Telegram ID disconnected. The bot token is still saved.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not disconnect Telegram ID.",
      );
    } finally {
      setLoadingAction(null);
    }
  }

  async function removeBot() {
    setLoadingAction("remove-bot");
    setError(null);
    setNotice(null);

    try {
      const res = await fetch("/api/telegram/bot", { method: "DELETE" });
      if (!res.ok) throw new Error("Could not remove Telegram bot.");
      setBot(null);
      setAccount(null);
      setNotice("Telegram bot removed.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not remove Telegram bot.",
      );
    } finally {
      setLoadingAction(null);
    }
  }

  const botLabel = bot?.botUsername
    ? `@${bot.botUsername}`
    : (bot?.botFirstName ?? "your bot");
  const displayName = account
    ? [account.firstName, account.lastName].filter(Boolean).join(" ") ||
      (account.username ? `@${account.username}` : account.telegramUserId)
    : null;

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: "var(--accent-light)", color: "var(--accent)" }}
        >
          <Send size={18} />
        </div>
        <div>
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--text-1)" }}
          >
            Telegram
          </h2>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            Use your own BotFather bot for board and task commands.
          </p>
        </div>
      </div>

      {error && <StatusMessage tone="danger" text={error} />}
      {notice && <StatusMessage tone="success" text={notice} />}

      <div className="space-y-6">
        <section>
          <StepHeader
            active={!bot}
            complete={Boolean(bot)}
            icon={<KeyRound size={14} />}
            label="1"
            title="Connect token"
          />
          <p className="mb-3 text-xs" style={{ color: "var(--text-2)" }}>
            In Telegram, open BotFather, run /newbot, create a bot, then paste
            the token here.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
              disabled={loadingAction !== null}
              onChange={(event) => setBotToken(event.target.value)}
              placeholder="123456789:AA..."
              style={{
                background: "var(--bg-elevated, var(--bg-app))",
                borderColor: "var(--border)",
                color: "var(--text-1)",
              }}
              type="password"
              value={botToken}
            />
            <button
              className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
              disabled={loadingAction !== null || !botToken.trim()}
              onClick={connectToken}
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              type="button"
            >
              <KeyRound size={14} />
              {loadingAction === "token" ? "Connecting..." : "Connect token"}
            </button>
          </div>
          {bot && (
            <div
              className="mt-3 rounded-lg border px-3 py-2 text-xs"
              style={{
                background: "var(--bg-elevated, var(--bg-app))",
                borderColor: "var(--border)",
                color: "var(--text-2)",
              }}
            >
              Token connected for{" "}
              <strong style={{ color: "var(--text-1)" }}>{botLabel}</strong>.
            </div>
          )}
        </section>

        <section>
          <StepHeader
            active={Boolean(bot && !account)}
            complete={Boolean(account)}
            icon={<Send size={14} />}
            label="2"
            title="Connect ID"
          />
          <p className="mb-3 text-xs" style={{ color: "var(--text-2)" }}>
            Send /start to {bot ? botLabel : "the bot you connected"}. It will
            reply with your Telegram ID. Paste that ID here.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
              disabled={!bot || loadingAction !== null}
              inputMode="numeric"
              onChange={(event) =>
                setTelegramUserId(event.target.value.replace(/\D/g, ""))
              }
              placeholder="Telegram ID"
              style={{
                background: "var(--bg-elevated, var(--bg-app))",
                borderColor: "var(--border)",
                color: "var(--text-1)",
              }}
              value={telegramUserId}
            />
            <button
              className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
              disabled={!bot || loadingAction !== null || !telegramUserId}
              onClick={connectId}
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              type="button"
            >
              <Check size={14} />
              {loadingAction === "id" ? "Connecting..." : "Connect ID"}
            </button>
          </div>
        </section>

        {account && (
          <section>
            <StepHeader
              active={false}
              complete
              icon={<Check size={14} />}
              label="3"
              title="Connected"
            />
            <div
              className="mb-3 flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center"
              style={{
                background: "var(--bg-elevated, var(--bg-app))",
                borderColor: "var(--border)",
              }}
            >
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium"
                  style={{ color: "var(--text-1)" }}
                >
                  {displayName}
                </p>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>
                  Telegram ID {account.telegramUserId}
                </p>
              </div>
              <span
                className="w-fit rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  background: "var(--success-light, #dcfce7)",
                  color: "var(--success, #16a34a)",
                }}
              >
                Connected
              </span>
            </div>
          </section>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          {account && (
            <button
              className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              disabled={loadingAction !== null}
              onClick={disconnectId}
              style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
              type="button"
            >
              <Unlink size={14} />
              {loadingAction === "disconnect-id"
                ? "Disconnecting..."
                : "Disconnect ID"}
            </button>
          )}
          {bot && (
            <button
              className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              disabled={loadingAction !== null}
              onClick={removeBot}
              style={{ borderColor: "var(--border)", color: "var(--danger)" }}
              type="button"
            >
              <Trash2 size={14} />
              {loadingAction === "remove-bot" ? "Removing..." : "Remove bot"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepHeader(props: {
  active: boolean;
  complete: boolean;
  icon: ReactNode;
  label: string;
  title: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <div
        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
        style={{
          background:
            props.complete || props.active
              ? "var(--accent)"
              : "var(--bg-elevated, var(--bg-app))",
          border: `1px solid ${props.complete || props.active ? "var(--accent)" : "var(--border)"}`,
          color:
            props.complete || props.active
              ? "var(--accent-fg)"
              : "var(--text-3)",
        }}
      >
        {props.complete ? props.icon : props.label}
      </div>
      <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
        {props.title}
      </h3>
    </div>
  );
}

function StatusMessage(props: { tone: "danger" | "success"; text: string }) {
  const isDanger = props.tone === "danger";

  return (
    <p
      className="mb-4 rounded-lg px-3 py-2 text-xs"
      style={{
        background: isDanger
          ? "var(--danger-light, #fee2e2)"
          : "var(--success-light, #dcfce7)",
        color: isDanger ? "var(--danger, #dc2626)" : "var(--success, #16a34a)",
      }}
    >
      {props.text}
    </p>
  );
}
