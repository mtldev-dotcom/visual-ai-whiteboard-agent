"use client";

import { useEffect, useState } from "react";
import { Shield, ShieldOff, Trash2, Plus, X } from "lucide-react";

type User = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  _count: { workspaces: number };
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "USER" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin/users");
    const data = await r.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function promoteOrDemote(user: User) {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    load();
  }

  async function deleteUser(user: User) {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    load();
  }

  async function createUser() {
    setCreating(true);
    setError("");
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await r.json();
    setCreating(false);
    if (!r.ok) { setError(data.error ?? "Failed"); return; }
    setShowCreate(false);
    setForm({ email: "", password: "", name: "", role: "USER" });
    load();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus size={15} /> New User
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">Create User</h2>
              <button onClick={() => setShowCreate(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
            {(["email", "password", "name"] as const).map((field) => (
              <div key={field} className="mb-3">
                <label className="block text-xs text-gray-500 mb-1 capitalize">{field}</label>
                <input
                  type={field === "password" ? "password" : "text"}
                  value={form[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}
            <div className="mb-5">
              <label className="block text-xs text-gray-500 mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <button
              onClick={createUser}
              disabled={creating}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create User"}
            </button>
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
                {["Email", "Name", "Role", "Workspaces", "Created", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{u.email}</td>
                  <td className="px-4 py-3 text-gray-500">{u.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === "ADMIN" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u._count.workspaces}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => promoteOrDemote(u)}
                        title={u.role === "ADMIN" ? "Demote to User" : "Promote to Admin"}
                        className="text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        {u.role === "ADMIN" ? <ShieldOff size={15} /> : <Shield size={15} />}
                      </button>
                      <button
                        onClick={() => deleteUser(u)}
                        title="Delete user"
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
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
