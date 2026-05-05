"use client";

import { useEffect, useState } from "react";
import { Plus, X, Copy, Check, Trash2 } from "lucide-react";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  user: { id: string; email: string; name: string | null };
};

type User = { id: string; email: string; name: string | null };

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", userId: "", scopes: "read", expiresAt: "" });
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const [keysRes, usersRes] = await Promise.all([
      fetch("/api/admin/api-keys"),
      fetch("/api/admin/users"),
    ]);
    const keysData = await keysRes.json();
    const usersData = await usersRes.json();
    setKeys(keysData.keys ?? []);
    setUsers(usersData.users ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createKey() {
    setCreating(true);
    setError("");
    const r = await fetch("/api/admin/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        userId: form.userId,
        scopes: form.scopes.split(",").map((s) => s.trim()).filter(Boolean),
        expiresAt: form.expiresAt || undefined,
      }),
    });
    const data = await r.json();
    setCreating(false);
    if (!r.ok) { setError(data.error ?? "Failed"); return; }
    setNewKey(data.rawKey);
    load();
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this API key? It cannot be recovered.")) return;
    await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
    load();
  }

  function copyKey() {
    if (newKey) { navigator.clipboard.writeText(newKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
        <button
          onClick={() => { setShowCreate(true); setNewKey(null); setError(""); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus size={15} /> New Key
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">Create API Key</h2>
              <button onClick={() => { setShowCreate(false); setNewKey(null); }}><X size={18} className="text-gray-400" /></button>
            </div>

            {newKey ? (
              <div>
                <p className="text-sm text-gray-600 mb-3">Key created. Copy it now — it won&apos;t be shown again.</p>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 font-mono text-xs text-gray-800 break-all mb-4">
                  {newKey}
                  <button onClick={copyKey} className="ml-auto flex-shrink-0 text-gray-400 hover:text-gray-700">
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </div>
                <button
                  onClick={() => { setShowCreate(false); setNewKey(null); }}
                  className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm hover:bg-gray-800"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
                <div className="mb-3">
                  <label className="block text-xs text-gray-500 mb-1">Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Production webhook"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-xs text-gray-500 mb-1">Owner User</label>
                  <select
                    value={form.userId}
                    onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="">Select user...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.email}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="block text-xs text-gray-500 mb-1">Scopes (comma-separated)</label>
                  <input
                    value={form.scopes}
                    onChange={(e) => setForm((f) => ({ ...f, scopes: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="read, write"
                  />
                </div>
                <div className="mb-5">
                  <label className="block text-xs text-gray-500 mb-1">Expires (optional)</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <button
                  onClick={createKey}
                  disabled={creating || !form.name || !form.userId}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? "Generating..." : "Generate Key"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Name", "Prefix", "Owner", "Scopes", "Created", "Last Used", "Expires", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{k.keyPrefix}...</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{k.user.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {k.scopes.map((s) => (
                        <span key={s} className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(k.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      k.revokedAt ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {k.revokedAt ? "Revoked" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!k.revokedAt && (
                      <button
                        onClick={() => revokeKey(k.id)}
                        title="Revoke key"
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
