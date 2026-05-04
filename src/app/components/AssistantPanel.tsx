"use client";

import { FormEvent, useState } from "react";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type ToolExecutionMessage = {
  id: string;
  role: "tool";
  status: "success" | "error" | "pending";
  summary: string;
  toolName: string;
};

type AssistantPanelMessage = ChatMessage | ToolExecutionMessage;

const initialMessages: AssistantPanelMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    text: "I can help shape this board.",
  },
  {
    id: "tool-demo-create-board",
    role: "tool",
    status: "success",
    summary: "Created demo board shell.",
    toolName: "create_board",
  },
];

export function AssistantPanel() {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = draft.trim();

    if (!text) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        text,
      },
    ]);
    setDraft("");
  }

  return (
    <aside className="flex min-h-[320px] flex-col border-t border-[#d8d2c3] bg-[#fffdfa] p-4 lg:border-l lg:border-t-0">
      <h2 className="text-sm font-semibold">Assistant</h2>
      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {messages.map((message) =>
          message.role === "tool" ? (
            <div
              className="rounded-md border border-[#c7bfae] bg-[#f7f5ef] p-3 text-sm"
              key={message.id}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{message.toolName}</span>
                <span className="rounded-md bg-[#2f5d50] px-2 py-1 text-xs font-semibold text-white">
                  {message.status}
                </span>
              </div>
              <p className="mt-2 text-[#4b5563]">{message.summary}</p>
            </div>
          ) : (
            <div
              className={`rounded-md border p-3 text-sm ${
                message.role === "user"
                  ? "ml-8 border-[#b9c6d3] bg-[#eef5fb]"
                  : "mr-8 border-[#e7e0d0] bg-white"
              }`}
              key={message.id}
            >
              {message.text}
            </div>
          ),
        )}
      </div>
      <form className="mt-3 flex gap-2" onSubmit={submitMessage}>
        <input
          className="min-h-11 flex-1 rounded-md border border-[#c7bfae] bg-white px-3 text-sm"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask AI..."
          value={draft}
        />
        <button
          className="min-h-11 rounded-md bg-[#2f5d50] px-4 text-sm font-semibold text-white"
          type="submit"
        >
          Send
        </button>
      </form>
    </aside>
  );
}
