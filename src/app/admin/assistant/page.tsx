"use client";

import { useState } from "react";
import { Send, ChevronDown, ChevronRight } from "lucide-react";

type TraceRound = {
  round: number;
  request: { messages: unknown[]; systemPromptLength: number };
  response: { content: string | null; toolCalls: unknown[] };
  toolResults: unknown[];
};

type DebugResult = {
  content: string | null;
  systemPromptLength: number;
  systemPromptPreview: string;
  trace: TraceRound[];
};

export default function AdminAssistantPage() {
  const [message, setMessage] = useState("");
  const [boardId, setBoardId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set([0]));
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  async function send() {
    if (!message.trim()) return;
    setLoading(true);
    setResult(null);
    const r = await fetch("/api/admin/assistant/debug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, boardId: boardId || undefined }),
    });
    const data = await r.json();
    setResult(data);
    setLoading(false);
    setExpandedRounds(new Set([0]));
  }

  function toggleRound(n: number) {
    setExpandedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Assistant Debugger</h1>

      {/* Input */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex gap-3 mb-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Test Message</label>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="e.g. List the boards in this workspace"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="w-56">
            <label className="block text-xs text-gray-500 mb-1">Board ID (optional)</label>
            <input
              value={boardId}
              onChange={(e) => setBoardId(e.target.value)}
              placeholder="cld_..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="self-end">
            <button
              onClick={send}
              disabled={loading || !message.trim()}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Send size={14} />
              {loading ? "Running..." : "Send"}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Final response */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Final Response</div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap">{result.content ?? "(no content)"}</div>
          </div>

          {/* System prompt preview */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowSystemPrompt((p) => !p)}
              className="flex items-center justify-between w-full px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <span>System Prompt ({result.systemPromptLength.toLocaleString()} chars)</span>
              {showSystemPrompt ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {showSystemPrompt && (
              <div className="px-5 pb-4 border-t border-gray-100">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono mt-3">{result.systemPromptPreview}</pre>
              </div>
            )}
          </div>

          {/* Tool trace */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 text-sm font-medium text-gray-700">
              Tool Trace — {result.trace.length} round{result.trace.length !== 1 ? "s" : ""}
            </div>
            {result.trace.length === 0 ? (
              <div className="px-5 py-4 text-sm text-gray-400">No tool calls made.</div>
            ) : (
              result.trace.map((round) => (
                <div key={round.round} className="border-b border-gray-100 last:border-0">
                  <button
                    onClick={() => toggleRound(round.round)}
                    className="flex items-center justify-between w-full px-5 py-3 text-sm hover:bg-gray-50"
                  >
                    <span className="font-medium text-gray-700">
                      Round {round.round + 1} —{" "}
                      <span className="text-gray-500 font-normal">
                        {(round.response.toolCalls as unknown[]).length} tool call(s)
                      </span>
                    </span>
                    {expandedRounds.has(round.round) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>

                  {expandedRounds.has(round.round) && (
                    <div className="px-5 pb-4 border-t border-gray-100 space-y-3">
                      {round.response.content && (
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Assistant thinking</div>
                          <div className="text-sm text-gray-700 bg-gray-50 rounded p-2">{round.response.content}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Tool calls + results</div>
                        <pre className="text-xs bg-gray-950 text-gray-100 rounded-lg p-3 overflow-auto max-h-80 whitespace-pre-wrap">
                          {JSON.stringify(round.toolResults, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
