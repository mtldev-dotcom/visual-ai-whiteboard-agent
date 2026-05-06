"use client";

import { Bot, Paperclip, Send, Wrench, X } from "lucide-react";
import {
  Fragment,
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

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

type DbMessage = {
  id: string;
  role: string;
  content: string;
  toolName?: string | null;
  toolStatus?: string | null;
};

type Props = {
  boardId: string | null;
  onCanvasChanged?: () => void;
};

type TextBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] };

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  text: "I can help shape this board. Ask me to create boards, add notes, or organize your workspace.",
};

function normalizeAssistantText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\s+(\*\*[^*]+:\*\*)/g, "\n$1")
    .replace(/\s+(\d+\.\s+)/g, "\n$1")
    .replace(/\s+-\s+(`[^`]+`\s+-\s+|[A-Z][^:\n]{1,36}:\s+)/g, "\n- $1")
    .replace(/(\*\*[^*]+:\*\*)\s+(?=-|\d+\.)/g, "$1\n")
    .trim();
}

function parseAssistantBlocks(text: string): TextBlock[] {
  const lines = normalizeAssistantText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks: TextBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    const boldHeading = line.match(/^\*\*(.+)\*\*$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    const unordered = line.match(/^[-*]\s+(.+)$/);

    if (heading || boldHeading) {
      blocks.push({
        type: "heading",
        text: heading?.[1] ?? boldHeading?.[1] ?? "",
      });
      index += 1;
      continue;
    }

    if (ordered) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\d+\.\s+(.+)$/);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    if (unordered) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].match(/^[-*]\s+(.+)$/);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      blocks.push({ type: "unordered-list", items });
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (
      index < lines.length &&
      !/^#{1,3}\s+/.test(lines[index]) &&
      !/^\d+\.\s+/.test(lines[index]) &&
      !/^[-*]\s+/.test(lines[index])
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
}

function renderInlineText(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong className="font-semibold" key={`${part}-${index}`}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          className="break-words rounded border px-1 py-0.5 text-[0.82em]"
          key={`${part}-${index}`}
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border)",
            color: "var(--text-1)",
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

function AssistantMessageText({ text }: { text: string }) {
  const blocks = parseAssistantBlocks(text);

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h3
              className="text-sm font-semibold leading-snug"
              key={`${block.type}-${index}`}
            >
              {renderInlineText(block.text)}
            </h3>
          );
        }

        if (block.type === "unordered-list") {
          return (
            <ul
              className="list-disc space-y-1 pl-4"
              key={`${block.type}-${index}`}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>{renderInlineText(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered-list") {
          return (
            <ol
              className="list-decimal space-y-1 pl-4"
              key={`${block.type}-${index}`}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>{renderInlineText(item)}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={`${block.type}-${index}`}>{renderInlineText(block.text)}</p>
        );
      })}
    </div>
  );
}

function dbToMessage(m: DbMessage): Message {
  if (m.role === "tool") {
    return {
      id: m.id,
      role: "tool",
      toolName: m.toolName ?? "tool",
      status: (m.toolStatus as "success" | "error") ?? "success",
      summary: m.content,
    };
  }
  return {
    id: m.id,
    role: m.role as "user" | "assistant",
    text: m.content,
  };
}

export function AssistantPanel({ boardId, onCanvasChanged }: Props) {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [youtubeSuggest, setYoutubeSuggest] = useState<{
    videoId: string;
    embedUrl: string;
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  }, []);

  // Load thread history whenever boardId changes
  useEffect(() => {
    const controller = new AbortController();
    async function loadThread() {
      setLoadingHistory(true);
      setMessages([WELCOME]);
      setThreadId(null);
      try {
        const url = boardId
          ? `/api/chat/thread?boardId=${boardId}`
          : `/api/chat/thread`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as {
          threadId: string;
          messages: DbMessage[];
        };
        setThreadId(data.threadId);
        if (data.messages.length > 0) {
          setMessages(data.messages.map(dbToMessage));
          scrollToBottom();
        }
      } catch {
        // aborted or network error — keep welcome message
      } finally {
        setLoadingHistory(false);
      }
    }
    void loadThread();
    return () => controller.abort();
  }, [boardId, scrollToBottom]);

  function detectYouTubeUrl(text: string): { videoId: string; embedUrl: string } | null {
    const match = text.match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
    );
    if (!match?.[1]) return null;
    return { videoId: match[1], embedUrl: `https://www.youtube.com/embed/${match[1]}` };
  }

  async function handleFileAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) return;
      const data = (await res.json()) as { url?: string };
      if (!data.url) return;
      const label = file.name.replace(/\.[^.]+$/, "");
      setDraft((prev) => (prev ? `${prev} [${label}](${data.url})` : `[${label}](${data.url})`));
    } finally {
      setUploading(false);
    }
  }

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
        body: JSON.stringify({ messages: history, boardId, threadId }),
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
        {(pending || loadingHistory) && (
          <span className="ml-auto text-xs" style={{ color: "var(--text-3)" }}>
            {loadingHistory ? "loading…" : "thinking…"}
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
              className={`animate-fade-in max-w-[92%] break-words rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
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
              {message.role === "assistant" ? (
                <AssistantMessageText text={message.text} />
              ) : (
                message.text
              )}
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
        {/* YouTube embed suggestion banner */}
        {youtubeSuggest && boardId && (
          <div
            className="mb-2 flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5"
            style={{
              background: "var(--accent-light)",
              borderColor: "var(--accent)",
            }}
          >
            <span className="text-[11px] font-medium" style={{ color: "var(--accent)" }}>
              YouTube detected — embed on canvas?
            </span>
            <button
              className="rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              type="button"
              onClick={async () => {
                if (!boardId || !youtubeSuggest) return;
                const res = await fetch("/api/canvas-items", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    boardId,
                    type: "iframe_embed",
                    x: 200,
                    y: 200,
                    width: 480,
                    height: 320,
                    content: {
                      src: youtubeSuggest.embedUrl,
                      embedUrl: youtubeSuggest.embedUrl,
                      title: "YouTube video",
                    },
                  }),
                });
                if (res.ok) {
                  onCanvasChanged?.();
                  setYoutubeSuggest(null);
                  setDraft("");
                }
              }}
            >
              Embed
            </button>
            <button
              aria-label="Dismiss"
              className="rounded p-0.5"
              type="button"
              style={{ color: "var(--text-3)" }}
              onClick={() => setYoutubeSuggest(null)}
            >
              <X size={11} />
            </button>
          </div>
        )}

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
            disabled={pending || loadingHistory}
            onChange={(e) => {
              setDraft(e.target.value);
              setYoutubeSuggest(detectYouTubeUrl(e.target.value));
            }}
            placeholder={boardId ? "Ask AI…" : "Select a board first…"}
            style={{ color: "var(--text-1)" }}
            value={draft}
          />
          <input
            ref={fileInputRef}
            accept="image/*,video/*,audio/*"
            className="sr-only"
            type="file"
            onChange={handleFileAttach}
          />
          <button
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-40"
            disabled={pending || loadingHistory || uploading || !boardId}
            style={{ color: "var(--text-3)" }}
            title="Attach file"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <span
                className="h-3.5 w-3.5 animate-spin rounded-full border-2"
                style={{
                  borderColor: "var(--accent)",
                  borderTopColor: "transparent",
                }}
              />
            ) : (
              <Paperclip size={13} />
            )}
          </button>
          <button
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-40"
            disabled={pending || loadingHistory || !draft.trim() || !boardId}
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
