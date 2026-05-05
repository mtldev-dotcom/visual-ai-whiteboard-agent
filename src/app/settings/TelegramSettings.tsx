"use client";

import { Check, Copy, ExternalLink, Send, Unlink } from "lucide-react";
import { useState } from "react";

type TelegramAccount = {
  telegramUserId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  linkedAt: string;
};

type Props = {
  initialAccount: TelegramAccount | null;
  botUsername: string | null;
};

export function TelegramSettings({ initialAccount, botUsername }: Props) {
  const [account, setAccount] = useState<TelegramAccount | null>(initialAccount);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const command = token ? `/start ${token}` : null;
  const deepLink = token && botUsername
    ? `https://t.me/${botUsername}?start=${token}`
    : null;

  async function generateToken() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/link-token", { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate link token.");
      const data = await res.json() as { token: string; expiresAt: string };
      setToken(data.token);
      setExpiresAt(data.expiresAt);
    } catch {
      setError("Could not generate a link token. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function unlinkAccount() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/telegram/account", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to unlink account.");
      setAccount(null);
      setToken(null);
      setExpiresAt(null);
    } catch {
      setError("Could not unlink account. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCommand() {
    if (!command) return;
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const displayName = account
    ? [account.firstName, account.lastName].filter(Boolean).join(" ") ||
      (account.username ? `@${account.username}` : account.telegramUserId)
    : null;

  return (
    <div>
      {/* Section heading */}
      <div className="mb-5 flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: "var(--accent-light)", color: "var(--accent)" }}
        >
          <Send size={18} />
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
            Telegram
          </h2>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            Connect your Telegram account to use bot commands for boards and tasks.
          </p>
        </div>
      </div>

      {error && (
        <p
          className="mb-4 rounded-lg px-3 py-2 text-xs"
          style={{ background: "var(--danger-light, #fee2e2)", color: "var(--danger, #dc2626)" }}
        >
          {error}
        </p>
      )}

      {account ? (
        /* ── Connected state ── */
        <div>
          <div
            className="mb-4 flex items-center gap-3 rounded-lg border px-4 py-3"
            style={{ borderColor: "var(--border)", background: "var(--bg-elevated, var(--bg-app))" }}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              {(account.firstName?.[0] ?? account.username?.[0] ?? "T").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>
                {displayName}
              </p>
              {account.username && (
                <p className="text-xs" style={{ color: "var(--text-3)" }}>
                  @{account.username}
                </p>
              )}
            </div>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ background: "var(--success-light, #dcfce7)", color: "var(--success, #16a34a)" }}
            >
              Connected
            </span>
          </div>

          <p className="mb-4 text-xs" style={{ color: "var(--text-3)" }}>
            Linked on {new Date(account.linkedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}.
            You can use{botUsername ? ` @${botUsername}` : " the bot"} in Telegram to manage boards and tasks.
          </p>

          <button
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
            disabled={loading}
            onClick={unlinkAccount}
            style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
            type="button"
          >
            <Unlink size={14} />
            {loading ? "Disconnecting…" : "Disconnect Telegram"}
          </button>
        </div>
      ) : token ? (
        /* ── Token generated state ── */
        <div>
          <p className="mb-3 text-xs" style={{ color: "var(--text-2)" }}>
            Send the command below to{" "}
            {botUsername ? (
              <strong>@{botUsername}</strong>
            ) : (
              "your Telegram bot"
            )}{" "}
            to link your account. This link expires in 15 minutes.
          </p>

          <div
            className="mb-3 flex items-center gap-2 rounded-lg border px-3 py-2.5"
            style={{ borderColor: "var(--border)", background: "var(--bg-elevated, var(--bg-app))" }}
          >
            <code
              className="flex-1 truncate text-sm font-mono"
              style={{ color: "var(--text-1)" }}
            >
              {command}
            </code>
            <button
              className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors"
              onClick={copyCommand}
              style={{
                background: copied ? "var(--accent-light)" : "var(--bg-surface)",
                color: copied ? "var(--accent)" : "var(--text-2)",
              }}
              type="button"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {deepLink && (
            <a
              className="mb-4 flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-70"
              href={deepLink}
              rel="noopener noreferrer"
              style={{ color: "var(--accent)" }}
              target="_blank"
            >
              <ExternalLink size={13} />
              Open in Telegram
            </a>
          )}

          <p className="mb-4 text-xs" style={{ color: "var(--text-3)" }}>
            Expires at {new Date(expiresAt!).toLocaleTimeString(undefined, { timeStyle: "short" })}.
            Already sent it?{" "}
            <button
              className="underline transition-opacity hover:opacity-70"
              onClick={() => window.location.reload()}
              style={{ color: "var(--text-2)" }}
              type="button"
            >
              Refresh to check status
            </button>
            .
          </p>

          <button
            className="text-xs underline transition-opacity hover:opacity-70"
            onClick={generateToken}
            style={{ color: "var(--text-3)" }}
            type="button"
          >
            Generate a new link
          </button>
        </div>
      ) : (
        /* ── Not connected state ── */
        <div>
          <p className="mb-4 text-xs" style={{ color: "var(--text-2)" }}>
            Not connected.{botUsername ? ` Connect to @${botUsername}` : " Connect a Telegram bot"} to
            manage your boards and tasks directly from Telegram.
          </p>

          <button
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            disabled={loading}
            onClick={generateToken}
            style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            type="button"
          >
            <Send size={14} />
            {loading ? "Generating…" : "Connect Telegram"}
          </button>
        </div>
      )}
    </div>
  );
}
