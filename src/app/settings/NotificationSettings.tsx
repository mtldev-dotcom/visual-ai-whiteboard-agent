"use client";

import { useEffect, useState } from "react";

type Prefs = { inApp: boolean; telegram: boolean };

export function NotificationSettings({ initialPrefs }: { initialPrefs: Prefs }) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function toggle(key: keyof Prefs) {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/notification-preferences", {
        body: JSON.stringify({ [key]: updated[key] }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      setSaved(true);
    } finally {
      setSaving(false);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div>
      <h2
        className="mb-1 text-base font-semibold"
        style={{ color: "var(--text-1)" }}
      >
        Notifications
      </h2>
      <p className="mb-5 text-sm" style={{ color: "var(--text-3)" }}>
        Choose how you want to receive reminder alerts.
      </p>

      <div className="flex flex-col gap-4">
        {(
          [
            {
              key: "inApp" as const,
              label: "In-app notifications",
              description: "Show a toast in the browser when a reminder is due.",
            },
            {
              key: "telegram" as const,
              label: "Telegram notifications",
              description:
                "Send a Telegram message when a reminder fires (requires a connected bot).",
            },
          ] as const
        ).map(({ key, label, description }) => (
          <div key={key} className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                {label}
              </p>
              <p className="text-xs" style={{ color: "var(--text-3)" }}>
                {description}
              </p>
            </div>
            <button
              aria-checked={prefs[key]}
              aria-label={label}
              className="relative mt-0.5 h-5 w-9 flex-shrink-0 rounded-full border-2 transition-colors"
              disabled={saving}
              onClick={() => toggle(key)}
              role="switch"
              style={{
                background: prefs[key] ? "var(--accent)" : "var(--bg-canvas)",
                borderColor: prefs[key] ? "var(--accent)" : "var(--border-strong)",
              }}
              type="button"
            >
              <span
                className="absolute top-0 h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
                style={{ transform: prefs[key] ? "translateX(16px)" : "translateX(1px)" }}
              />
            </button>
          </div>
        ))}
      </div>

      {saved && (
        <p className="mt-3 text-xs" style={{ color: "var(--accent)" }}>
          Saved.
        </p>
      )}
    </div>
  );
}
