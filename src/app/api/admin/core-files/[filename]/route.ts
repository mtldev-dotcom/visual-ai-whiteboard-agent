import fs from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";

const CORE_DIR = path.join(process.cwd(), "docs", "agent-core");

function safeName(filename: string) {
  // Only allow simple .md filenames with no path traversal
  return /^[a-zA-Z0-9_-]+\.md$/.test(filename) ? filename : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  void admin;

  const { filename } = await params;
  const safe = safeName(filename);
  if (!safe) return NextResponse.json({ error: "Invalid filename." }, { status: 400 });

  try {
    const content = await fs.readFile(path.join(CORE_DIR, safe), "utf-8");
    return NextResponse.json({ filename: safe, content });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  void admin;

  const { filename } = await params;
  const safe = safeName(filename);
  if (!safe) return NextResponse.json({ error: "Invalid filename." }, { status: 400 });

  const body = (await request.json()) as { content?: string };
  if (typeof body.content !== "string") {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }

  await fs.writeFile(path.join(CORE_DIR, safe), body.content, "utf-8");
  return NextResponse.json({ ok: true, filename: safe });
}
