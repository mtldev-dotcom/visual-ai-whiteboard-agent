"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Key, LayoutDashboard, ScrollText, Globe } from "lucide-react";

type Stats = {
  users: number;
  apiKeys: number;
  boards: number;
  auditEvents: number;
  workspaces: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  const cards = [
    { label: "Users", value: stats?.users, icon: Users, href: "/admin/users", color: "bg-indigo-50 text-indigo-600" },
    { label: "API Keys (active)", value: stats?.apiKeys, icon: Key, href: "/admin/api-keys", color: "bg-emerald-50 text-emerald-600" },
    { label: "Boards", value: stats?.boards, icon: LayoutDashboard, href: "/core", color: "bg-amber-50 text-amber-600" },
    { label: "Workspaces", value: stats?.workspaces, icon: Globe, href: "/admin/users", color: "bg-purple-50 text-purple-600" },
    { label: "Audit Events", value: stats?.auditEvents, icon: ScrollText, href: "/admin/audit", color: "bg-rose-50 text-rose-600" },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-10">
        {cards.map(({ label, value, icon: Icon, href, color }) => (
          <Link
            key={label}
            href={href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className={`inline-flex p-2 rounded-lg mb-3 ${color}`}>
              <Icon size={18} />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {value === undefined ? "—" : value.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 mt-0.5">{label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Manage Users", href: "/admin/users", desc: "Create, promote, delete users" },
          { label: "API Keys", href: "/admin/api-keys", desc: "Generate and revoke API keys" },
          { label: "Core Files", href: "/admin/core-files", desc: "Edit AI system instructions" },
          { label: "Assistant Debug", href: "/admin/assistant", desc: "Test AI with full tool trace" },
        ].map(({ label, href, desc }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
          >
            <div className="font-semibold text-gray-900 mb-1">{label}</div>
            <div className="text-sm text-gray-500">{desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
