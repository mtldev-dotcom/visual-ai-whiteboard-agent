"use client";

import { Bot, Send, Wrench } from "lucide-react";
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
  const inputRef = useRef<HTMLInputElement>(null);

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
      summary: "Working on it…",
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
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{ background: "var(--bg-sidebar)" }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center gap-2 border-b px-4 py-3"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="flex h-6 w-6 items-center justify-center rounded-lg"
          style={{ background: "var(--accent-light)", color: "var(--accent)" }}
        >
          <Bot size={14} />
        </div>
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--text-1)" }}
        >
          AI Assistant
        </span>
        {pending && (
          <span className="ml-auto text-xs" style={{ color: "var(--text-3)" }}>
            thinking…
          </span>
        )}
      </div>

      {/* Message list */}
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-3">
        {messages.map((message) => {
          if (message.role === "tool") {
            return (
              <div
                className="animate-fade-in rounded-xl border p-3"
                key={message.id}
                style={{
                  background:
                    message.status === "pending"
                      ? "var(--bg-surface)"
                      : message.status === "success"
                        ? "var(--accent-light)"
                        : "var(--danger-light)",
                  borderColor:
                    message.status === "pending"
                      ? "var(--border)"
                      : message.status === "success"
                        ? "var(--accent)"
                        : "var(--danger)",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Wrench
                      size={12}
                      style={{
                        color:
                          message.status === "success"
                            ? "var(--accent)"
                            : message.status === "pending"
                              ? "var(--text-3)"
                              : "var(--danger)",
                      }}
                    />
                    <span
                      className="text-xs font-semibold font-mono"
                      style={{ color: "var(--text-1)" }}
                    >
                      {message.toolName}
                    </span>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={
                      message.status === "success"
                        ? {
                            background: "var(--accent)",
                            color: "var(--accent-fg)",
                          }
                        : message.status === "error"
                          ? {
                              background: "var(--danger)",
                              color: "var(--danger-fg)",
                            }
                          : {
                              background: "var(--border)",
                              color: "var(--text-2)",
                            }
                    }
                  >
                    {message.status}
                  </span>
                </div>
                <p
                  className="mt-1.5 text-xs leading-relaxed"
                  style={{ color: "var(--text-2)" }}
                >
                  {message.summary}
                </p>
              </div>
            );
          }

          return (
            <div
              className={`animate-fade-in max-w-[92%] rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
                message.role === "user" ? "ml-auto" : "mr-auto"
              }`}
              key={message.id}
              style={
                message.role === "user"
                  ? {
                      background: "var(--accent)",
                      color: "var(--accent-fg)",
                    }
                  : {
                      background: "var(--bg-surface)",
                      color: "var(--text-1)",
                      border: "1px solid var(--border)",
                    }
              }
            >
              {message.text}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        className="shrink-0 border-t p-3"
        onSubmit={submitMessage}
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors"
          style={{
            background: "var(--bg-surface)",
            borderColor: "var(--border)",
          }}
        >
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm outline-none"
            disabled={pending}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={boardId ? "Ask AI…" : "Select a board first…"}
            style={{ color: "var(--text-1)" }}
            value={draft}
          />
          <button
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-40"
            disabled={pending || !draft.trim() || !boardId}
            style={{
              background: "var(--accent)",
              color: "var(--accent-fg)",
            }}
            type="submit"
          >
            <Send size={13} />
          </button>
        </div>
      </form>
    </div>
  );
}
