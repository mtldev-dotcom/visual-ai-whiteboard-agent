import fs from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { requireSession } from "@/lib/session";

export const maxDuration = 60;

// Magic byte signatures → MIME type
function detectMimeType(buf: Buffer): string | null {
  const b = buf;

  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";

  // PNG: 89 50 4E 47
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";

  // GIF: 47 49 46 38
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";

  // WebP: RIFF????WEBP
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return "image/webp";

  // MP4: ftyp box at offset 4
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return "video/mp4";

  // WebM: 1A 45 DF A3
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";

  // OGG (video or audio): OggS
  if (b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53) return "video/ogg";

  // MP3: ID3 tag or sync frame
  if ((b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) ||
      (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return "audio/mpeg";

  // FLAC: fLaC
  if (b[0] === 0x66 && b[1] === 0x4c && b[2] === 0x61 && b[3] === 0x43) return "audio/flac";

  // WAV: RIFF????WAVE
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x41 && b[10] === 0x56 && b[11] === 0x45
  ) return "audio/wav";

  return null;
}

function sanitizeFilename(raw: string): string {
  return raw
    .replace(/[/\\?%*:|"<>\x00]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/^\.+/, "_")
    .slice(0, 120);
}

const TYPE_LIMITS: Record<string, number> = {
  "image/": 20 * 1024 * 1024,
  "audio/": 50 * 1024 * 1024,
  "video/": 50 * 1024 * 1024,
};

export async function POST(request: Request): Promise<NextResponse> {
  const { session, error } = await requireSession();
  if (error) return error as NextResponse;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file is required." }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Global size cap
  const GLOBAL_MAX = 50 * 1024 * 1024;
  if (buffer.length > GLOBAL_MAX) {
    return NextResponse.json({ error: "File exceeds 50 MB limit." }, { status: 413 });
  }

  // Detect MIME from magic bytes — not from filename/Content-Type
  const detectedMime = detectMimeType(buffer);
  if (!detectedMime) {
    return NextResponse.json({ error: "Unsupported file type. Allowed: images, video, audio." }, { status: 415 });
  }

  // Per-type size check
  const prefix = Object.keys(TYPE_LIMITS).find((k) => detectedMime.startsWith(k));
  if (!prefix || buffer.length > TYPE_LIMITS[prefix]) {
    const limitMb = prefix ? TYPE_LIMITS[prefix] / (1024 * 1024) : 0;
    return NextResponse.json(
      { error: `File too large for type ${detectedMime}. Limit: ${limitMb} MB.` },
      { status: 413 },
    );
  }

  // Build safe path
  const safe = sanitizeFilename(file.name);
  const filename = `${Date.now()}-${safe}`;
  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const dir = path.join(uploadsRoot, session.workspaceId);
  const filePath = path.join(dir, filename);

  // Path traversal guard
  if (!filePath.startsWith(uploadsRoot + path.sep)) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, buffer);

  const url = `/uploads/${session.workspaceId}/${filename}`;
  return NextResponse.json({ url, mimeType: detectedMime }, { status: 201 });
}
