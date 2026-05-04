"use client";

import { useState } from "react";

type SandboxedHtmlWidgetProps = {
  html: string;
  requiresConfirmation?: boolean;
  title: string;
};

export function SandboxedHtmlWidget({
  html,
  requiresConfirmation = true,
  title,
}: SandboxedHtmlWidgetProps) {
  const [confirmed, setConfirmed] = useState(!requiresConfirmation);

  if (!confirmed) {
    return (
      <div className="flex h-full flex-col justify-between gap-3 bg-white p-4 text-sm">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-2 text-[#4b5563]">
            Generated HTML is sandboxed and isolated.
          </p>
        </div>
        <button
          className="min-h-11 rounded-md bg-[#2f5d50] px-4 font-semibold text-white"
          onClick={() => setConfirmed(true)}
          type="button"
        >
          Run
        </button>
      </div>
    );
  }

  return (
    <iframe
      className="h-full w-full border-0"
      referrerPolicy="no-referrer"
      sandbox="allow-scripts"
      srcDoc={html}
      title={title}
    />
  );
}
