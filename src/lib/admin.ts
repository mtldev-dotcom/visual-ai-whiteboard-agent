import { NextResponse } from "next/server";

import { requireSession } from "@/lib/session";

export async function requireAdmin() {
  const { session, error } = await requireSession();
  if (error) return { admin: null, error };
  if (session.role !== "ADMIN") {
    return {
      admin: null,
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }
  return { admin: session, error: null };
}
