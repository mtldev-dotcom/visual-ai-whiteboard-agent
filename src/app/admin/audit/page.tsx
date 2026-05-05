"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type AuditEvent = {
  id: string;
  actorType: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  createdAt: string;
  workspace: { name: string };
};

export default function AdminAuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actorType, setActorType] = useState("");
  const [action, setAction] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (actorType) params.set("actorType", actorType);
    if (action) params.set("action", action);
    const r = await fetch(`/api/admin/audit?${params}`);
    const data = await r.json();
    setEvents(data.events ?? []);
    setPages(data.pages ?? 1);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, actorType, action]);

  useEffect(() => { load(); }, [load]);

  function applyFilters() { setPage(1); load(); }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <span className="text-sm text-gray-400">{total.toLocaleString()} events</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <select
          value={actorType}
          onChange={(e) => setActorType(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">All actor types</option>
          {["user", "assistant", "system", "telegram"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Filter by action..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none w-48"
        />
        <button
          onClick={applyFilters}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800"
        >
          Filter
        </button>
        {(actorType || action) && (
          <button
            onClick={() => { setActorType(""); setAction(""); setPage(1); }}
            className="text-sm text-gray-500 hover:text-gray-800 px-2"
          >
            Clear
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No events found.</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Time", "Workspace", "Actor", "Action", "Target", "Summary"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-24 truncate">{e.workspace.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                        e.actorType === "user" ? "bg-blue-50 text-blue-600" :
                        e.actorType === "assistant" ? "bg-purple-50 text-purple-600" :
                        e.actorType === "telegram" ? "bg-sky-50 text-sky-600" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {e.actorType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-700">{e.action}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <span className="font-medium">{e.targetType}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{e.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <span className="text-xs text-gray-400">Page {page} of {pages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button
                    disabled={page === pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
