"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Key,
  Bot,
  FileText,
  ScrollText,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { signOut } from "next-auth/react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/api-keys", label: "API Keys", icon: Key },
  { href: "/admin/assistant", label: "Assistant Debug", icon: Bot },
  { href: "/admin/core-files", label: "Core Files", icon: FileText },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.replace("/core");
    }
  }, [status, session, router]);

  if (status === "loading" || !session) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-400">
        Loading...
      </div>
    );
  }

  if (session.user?.role !== "ADMIN") return null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-gray-950 flex flex-col">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-800">
          <ShieldCheck size={18} className="text-indigo-400" />
          <span className="text-white font-semibold text-sm tracking-wide">Admin</span>
        </div>

        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <div className="px-3 py-1 text-xs text-gray-500 truncate mb-2">
            {session.user.email}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
