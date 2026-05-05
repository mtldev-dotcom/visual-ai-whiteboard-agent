import fs from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";

const CORE_DIR = path.join(process.cwd(), "docs", "agent-core");

export async function GET() {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  void admin;

  const entries = await fs.readdir(CORE_DIR);
  const files = await Promise.all(
    entries
      .filter((f) => f.endsWith(".md"))
      .map(async (filename) => {
        const stat = await fs.stat(path.join(CORE_DIR, filename));
        return { filename, size: stat.size, updatedAt: stat.mtime.toISOString() };
      }),
  );

  return NextResponse.json({ files });
}
