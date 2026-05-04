"use client";

import { FormEvent, useCallback, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type ToolCard = {
  id: string;
  role: "tool";
  toolName: string;
  status: "success" | "error" | "pending";
  summary: string;
};

type Message = ChatMessage | ToolCard;

type Props = {
  boardId: string | null;
  onCanvasChanged?: () => void;
};

const WELCOME: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    text: "I can help shape this board. Ask me to create boards, add notes, or organize your workspace.",
  },
];

export function AssistantPanel({ boardId, onCanvasChanged }: Props) {
  const [messages, setMessages] = useState<Message[]>(WELCOME);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  }, []);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setPending(true);
    scrollToBottom();

    const pendingCard: ToolCard = {
      id: `pending-${Date.now()}`,
      role: "tool",
      toolName: "thinking",
      status: "pending",
      summary: "Assistant is thinking…",
    };
    setMessages((prev) => [...prev, pendingCard]);

    try {
      const history = [...messages, userMsg]
        .filter(
          (m): m is ChatMessage => m.role === "user" || m.role === "assistant",
        )
        .map((m) => ({ role: m.role, content: m.text }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, boardId }),
      });

      const data = (await res.json()) as {
        content?: string;
        toolCalls?: {
          toolName: string;
          status: "success" | "error";
          summary: string;
        }[];
        error?: string;
      };

      setMessages((prev) => prev.filter((m) => m.id !== pendingCard.id));

      if (!res.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            text: data.error ?? "Something went wrong. Please try again.",
          },
        ]);
        return;
      }

      const newMessages: Message[] = [];

      for (const tc of data.toolCalls ?? []) {
        newMessages.push({
          id: `tc-${Date.now()}-${tc.toolName}`,
          role: "tool",
          toolName: tc.toolName,
          status: tc.status,
          summary: tc.summary,
        });
      }

      if (data.content) {
        newMessages.push({
          id: `a-${Date.now()}`,
          role: "assistant",
          text: data.content,
        });
      }

      if (newMessages.length) {
        setMessages((prev) => [...prev, ...newMessages]);
        if ((data.toolCalls ?? []).some((tc) => tc.status === "success")) {
          onCanvasChanged?.();
        }
        scrollToBottom();
      }
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== pendingCard.id),
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          text: "Network error. Please try again.",
        },
      ]);
    } finally {
      setPending(false);
    }
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
                <span
                  className={`rounded-md px-2 py-1 text-xs font-semibold text-white ${
                    message.status === "success"
                      ? "bg-[#2f5d50]"
                      : message.status === "error"
                        ? "bg-red-500"
                        : "bg-[#9ca3af]"
                  }`}
                >
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
        <div ref={bottomRef} />
      </div>
      <form className="mt-3 flex gap-2" onSubmit={submitMessage}>
        <input
          className="min-h-11 flex-1 rounded-md border border-[#c7bfae] bg-white px-3 text-sm disabled:opacity-60"
          disabled={pending}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={boardId ? "Ask AI…" : "Select a board first…"}
          value={draft}
        />
        <button
          className="min-h-11 rounded-md bg-[#2f5d50] px-4 text-sm font-semibold text-white disabled:opacity-60"
          disabled={pending || !draft.trim() || !boardId}
          type="submit"
        >
          Send
        </button>
      </form>
    </aside>
  );
}
