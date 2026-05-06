# Media Upload & Embed Plan

## Context
Users and the AI assistant need to add images, video, and audio to the canvas by dragging/dropping files or clicking an upload button. YouTube (and other) URLs pasted in chat should suggest embedding directly on the canvas. The AI assistant should be able to call `add_canvas_item` with the new `video`, `audio`, and `iframe_embed` types. After implementation, a test prompt document must be produced.

The admin dashboard from the prior session is already fully implemented — this plan replaces that one.

---

## Confirmed current state

- `iframe_embed` is already in `VALID_TYPES` (canvas-items/route.ts:8-27) but has **no renderer** in BoardCanvas.tsx
- `image` renderer exists (BoardCanvas.tsx:635-660) but uses fixed 64px `next/image` — needs full-card replacement
- No file upload API exists; no cloud storage library installed
- Storage env vars (`STORAGE_PROVIDER=local`) exist but are wired to nothing
- `ASSISTANT_CANVAS_ITEM_TYPES` (canvas-tools.ts:46-63) is missing `iframe_embed`, `video`, `audio`
- `getToolInputSchema("add_canvas_item")` enum (chat/route.ts:286-302) is missing same types
- CanvasToolbar `Props` (lines 93-104): no upload prop yet
- AssistantPanel form (lines 513-546): text-only input, imports `{ Bot, Send, Wrench }` from lucide
- `next.config.ts`: minimal, no body size limit set
- `.gitignore`: no `public/uploads/` entry

---

## Files to create / modify

| File | Action |
|------|--------|
| `next.config.ts` | Add `experimental.serverBodySizeLimit: "50mb"` |
| `.gitignore` | Append `public/uploads/**` |
| `public/uploads/.gitkeep` | Create (tracks directory in git) |
| `src/app/api/upload/route.ts` | **New** — multipart upload handler |
| `src/app/api/canvas-items/route.ts` | Add `"video"`, `"audio"` to `VALID_TYPES` |
| `src/server/assistant/canvas-tools.ts` | Add `"iframe_embed"`, `"video"`, `"audio"` to type enum + expand description |
| `src/app/api/chat/route.ts` | Add same 3 types to `getToolInputSchema("add_canvas_item")` enum (lines 286-302) |
| `src/app/components/BoardCanvas.tsx` | Replace image renderer; add iframe_embed/video/audio renderers; add drag-drop + upload helper; update `CanvasItemContent` type and `NEW_ITEM_DEFAULTS` |
| `src/app/components/CanvasToolbar.tsx` | Add `onUpload` prop + hidden file input + Upload button |
| `src/app/components/AssistantPanel.tsx` | Add paperclip file-attach + YouTube paste detection banner |
| `docs/MEDIA_UPLOAD_TEST_PROMPTS.md` | **New** — test prompt document |

---

## 1. Infrastructure

**`next.config.ts`** — add body size limit:
```ts
const nextConfig: NextConfig = {
  allowedDevOrigins: ["100.110.134.117", "192.168.5.12"],
  experimental: {
    serverBodySizeLimit: "50mb",
  },
};
```

**`.gitignore`** — append:
```
public/uploads/**
```

Create `public/uploads/.gitkeep` (empty file).

---

## 2. Upload API — `src/app/api/upload/route.ts` (new)

```ts
export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse> {
  const { session, error } = await requireSession();
  if (error) return error as NextResponse;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file is required." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  // 1. Global size cap
  if (buffer.length > 50 * 1024 * 1024)
    return NextResponse.json({ error: "File exceeds 50 MB." }, { status: 413 });

  // 2. Detect MIME from magic bytes (not filename)
  const detectedMime = detectMimeType(buffer);
  if (!detectedMime)
    return NextResponse.json({ error: "Unsupported file type." }, { status: 415 });

  // Per-type size limits
  const TYPE_LIMITS: Record<string, number> = {
    "image/": 20 * 1024 * 1024,
    "audio/": 50 * 1024 * 1024,
    "video/": 50 * 1024 * 1024,
  };
  const prefix = Object.keys(TYPE_LIMITS).find((k) => detectedMime.startsWith(k));
  if (!prefix || buffer.length > TYPE_LIMITS[prefix])
    return NextResponse.json({ error: "File too large for this type." }, { status: 413 });

  // 3. Sanitize filename; build path under public/uploads/{workspaceId}/
  const safe = sanitizeFilename(file.name);
  const filename = `${Date.now()}-${safe}`;
  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  const dir = path.join(uploadsRoot, session.workspaceId);
  const filePath = path.join(dir, filename);

  // Path traversal guard
  if (!filePath.startsWith(uploadsRoot + path.sep))
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, buffer);

  return NextResponse.json(
    { url: `/uploads/${session.workspaceId}/${filename}`, mimeType: detectedMime },
    { status: 201 },
  );
}
```

**`detectMimeType(buf: Buffer): string | null`** — magic byte table:
| Hex prefix | MIME |
|---|---|
| `FF D8 FF` | image/jpeg |
| `89 50 4E 47` | image/png |
| `47 49 46 38` | image/gif |
| `52 49 46 46 .. .. .. .. 57 45 42 50` | image/webp |
| `00 00 00 .. 66 74 79 70` | video/mp4 |
| `1A 45 DF A3` | video/webm |
| `4F 67 67 53` | video/ogg |
| `49 44 33` or `FF FB` | audio/mpeg |
| `66 4C 61 43` | audio/flac |
| `52 49 46 46 .. .. .. .. 57 41 56 45` | audio/wav |

**`sanitizeFilename(raw: string): string`** — remove `/ \ ? % * : | " < > \0`, replace whitespace with `_`, strip leading dots, limit to 120 chars.

---

## 3. Type registry updates

**`src/app/api/canvas-items/route.ts`** (line 27, inside VALID_TYPES array) — add after `"notes"`:
```ts
"video",
"audio",
```

**`src/server/assistant/canvas-tools.ts`** (lines 46-63, ASSISTANT_CANVAS_ITEM_TYPES) — add:
```ts
"iframe_embed",
"video",
"audio",
```

Also expand `description` field (line 194) to document content shapes:
```
Add a structured item to a board canvas.

Content shapes:
- image: { src, alt?, title? } — full-card image. Default 320×240.
- video: { src, title? } — HTML5 video player. Default 400×280.
- audio: { src, title? } — HTML5 audio player. Default 320×140.
- iframe_embed: { src (embed URL), title? } — iframe embed. Default 480×320.
  YouTube: convert https://youtube.com/watch?v=ID → https://www.youtube.com/embed/ID
- link: { href, title?, text? }
- text: { title, text, bgColor? }
- sticky_note: { title, text, bgColor? }
- board_link: { targetBoardId, title?, text? }
```

**`src/app/api/chat/route.ts`** (lines 286-302, enum array) — append `"iframe_embed"`, `"video"`, `"audio"` to the existing 15 types.

---

## 4. Canvas renderers — `src/app/components/BoardCanvas.tsx`

### 4a. Extend `CanvasItemContent` type (line 75, add after last field):
```ts
mimeType?: string;
embedUrl?: string;
```

### 4b. Replace `image` renderer (lines 635-660):
Replace the `next/image` block. Use a native `<img>` tag filling the card with `object-contain`. Show title as a small caption bar below. Add `onError` fallback to `/globe.svg`. Use `// eslint-disable-next-line @next/next/no-img-element` above the `<img>`.

### 4c. Add `iframe_embed` renderer (insert after image block):
```tsx
if (item.type === "iframe_embed") {
  const src = item.content.embedUrl ?? item.content.src ?? "";
  return (
    <div className={`${base} overflow-hidden`} style={{ background: "#000", ... }}>
      {src ? (
        <iframe
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          src={src}
          title={item.content.title ?? "Embed"}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs">No embed URL</div>
      )}
    </div>
  );
}
```
Sandbox: `allow-scripts allow-same-origin allow-presentation` — required for YouTube player; does NOT allow top-navigation or popups.

### 4d. Add `video` renderer (after iframe_embed block):
`<video controls playsInline preload="metadata" src={item.content.src}>` filling the card with `object-contain`. Title caption bar below.

### 4e. Add `audio` renderer (after video block):
Card with a decorative static waveform (20 divs with sin-wave heights), title, and `<audio controls>`. Add `onPointerDown={(e) => e.stopPropagation()}` on the `<audio>` element to prevent the canvas drag system from activating on scrubber clicks.

### 4f. Update `NEW_ITEM_DEFAULTS` (after line 1090):
```ts
video: { width: 400, height: 280, content: { title: "Video", src: "" } },
audio: { width: 320, height: 140, content: { title: "Audio", src: "" } },
iframe_embed: { width: 480, height: 320, content: { title: "Embed", src: "" } },
image: already present — no change needed
```

### 4g. Add upload state + helper function:
```ts
const [uploadProgress, setUploadProgress] = useState<{ filename: string } | null>(null);

async function uploadFileToCanvas(file: File, canvasX: number, canvasY: number) {
  if (!boardId) return;
  setUploadProgress({ filename: file.name });
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  setUploadProgress(null);
  if (!res.ok) return;
  const data = await res.json() as { url?: string; mimeType?: string };
  if (!data.url) return;
  const mime = data.mimeType ?? "";
  const type = mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") ? "audio" : null;
  if (!type) return;
  const dims = { image: [320, 240], video: [400, 280], audio: [320, 140] }[type]!;
  await createCanvasItem({
    type, x: canvasX - dims[0] / 2, y: canvasY - dims[1] / 2,
    width: dims[0], height: dims[1],
    content: { src: data.url, title: file.name.replace(/\.[^.]+$/, ""), mimeType: mime },
  });
}
```

### 4h. Add drag-drop handlers to canvas surface div (line ~1809):
```tsx
onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
onDrop={(e) => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files)
    .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/") || f.type.startsWith("audio/"))
    .slice(0, 5);
  const pt = getCanvasPoint(e.clientX, e.clientY);
  if (!pt) return;
  files.forEach((f, i) => void uploadFileToCanvas(f, pt.x + i * 20, pt.y + i * 20));
}}
```

### 4i. Add upload progress overlay (in JSX, near existing loading overlay):
Spinner + filename badge, `position: absolute`, centered bottom, visible when `uploadProgress !== null`.

---

## 5. CanvasToolbar — `src/app/components/CanvasToolbar.tsx`

- Add `onUpload: (file: File) => void` to `Props` type (line 93)
- Add hidden `<input type="file" accept="image/*,video/*,audio/*" ref={fileInputRef} className="sr-only" onChange={...} />`
- Add `Upload` icon from lucide-react
- Add `<ToolBtn label="Upload media  U" onClick={() => fileInputRef.current?.click()}><Upload size={15} /></ToolBtn>` after a `<Divider />` near the Tidy button (line 291)
- Add keyboard shortcut `"u"` in the existing `onKey` `useEffect`

Wire in BoardCanvas.tsx where `<CanvasToolbar ... />` is rendered:
```tsx
onUpload={(file) => {
  if (!canvasRef.current) return;
  const rect = canvasRef.current.getBoundingClientRect();
  void uploadFileToCanvas(file, (rect.width / 2 - pan.x) / zoom, (rect.height / 2 - pan.y) / zoom);
}}
```

---

## 6. AssistantPanel — `src/app/components/AssistantPanel.tsx`

### 6a. File attach button
- Add `Paperclip` to lucide import (line 3)
- Add `fileInputRef`, `uploading` state
- Add `handleFileAttach`: upload file → insert `[name](url)` into draft via `setDraft`
- Add hidden file input + `<button>` with `<Paperclip size={13} />` inside the form flex row, left of the Send button
- Show spinner in button while `uploading`

### 6b. YouTube paste detection
- Add `youtubeSuggest` state: `{ videoId, embedUrl } | null`
- Add `detectYouTubeUrl(text)` helper — matches `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/shorts/ID` via regex, extracts 11-char video ID
- Wire into input `onChange`: set `youtubeSuggest` from draft text
- Add suggestion banner above the input (inside `<form>`): "YouTube detected — embed on canvas?" with "Embed" button that POSTs to `/api/canvas-items` with `type: "iframe_embed"` + embed URL, then calls `onCanvasChanged?.()` and clears draft
- Add `X` to lucide import for the dismiss button on the banner

---

## 7. Content JSON shapes (canonical)

| Type | Content shape |
|------|--------------|
| `image` | `{ src: "/uploads/ws-id/file.jpg", alt?: "...", title?: "..." }` |
| `video` | `{ src: "/uploads/ws-id/file.mp4", title?: "...", mimeType?: "video/mp4" }` |
| `audio` | `{ src: "/uploads/ws-id/file.mp3", title?: "...", mimeType?: "audio/mpeg" }` |
| `iframe_embed` | `{ src: "https://www.youtube.com/embed/ID", embedUrl?: "https://...", title?: "..." }` |

---

## 8. Implementation order

1. `next.config.ts` + `.gitignore` + `public/uploads/.gitkeep`
2. `src/app/api/upload/route.ts`
3. `src/app/api/canvas-items/route.ts` — add video/audio to VALID_TYPES
4. `src/server/assistant/canvas-tools.ts` — add types + description
5. `src/app/api/chat/route.ts` — update enum
6. `src/app/components/BoardCanvas.tsx` — all renderer + drag-drop changes
7. `src/app/components/CanvasToolbar.tsx` — upload button
8. `src/app/components/AssistantPanel.tsx` — file attach + YouTube detection
9. `docs/MEDIA_UPLOAD_TEST_PROMPTS.md` — test prompt doc

---

## 9. Security

- MIME detected from buffer magic bytes — a renamed `.exe` file gets 415
- Path traversal: `sanitizeFilename` strips all path separators; result is verified to be inside `uploadsRoot` after `path.join`
- Files land in `public/` (static assets) — never `require()`d or executed server-side
- Workspace isolation: `public/uploads/{workspaceId}/` — users can't guess other workspaces' paths
- iframe sandbox: `allow-scripts allow-same-origin allow-presentation` only; no top-navigation, forms, or popups
- Drop handler caps at 5 files to prevent DoS via mass concurrent uploads

---

## 10. Verification

```bash
npm run typecheck
npm run lint
npm run dev   # manual QA
```

**Manual QA checklist:**
- [ ] Drag a JPEG onto canvas → image card appears at drop position
- [ ] Drag an MP4 → video card with native controls appears
- [ ] Drag an MP3 → audio card with waveform + player appears
- [ ] Click Upload toolbar button → file picker → image card at viewport center
- [ ] Press `U` shortcut → file picker opens
- [ ] Paperclip in chat → attach image → `[name](url)` inserted in draft
- [ ] Paste YouTube URL in chat → banner appears → click Embed → iframe_embed card on canvas
- [ ] Tell AI: "Embed this YouTube video: https://youtube.com/watch?v=dQw4w9WgXcQ" → AI creates iframe_embed with correct embed URL
- [ ] Tell AI: "Add the image at /uploads/.../file.jpg to the canvas" → AI creates image card
- [ ] Upload a renamed `.html` file → rejected with 415

---

## 11. Test prompt document

After implementation, create `docs/MEDIA_UPLOAD_TEST_PROMPTS.md` with structured prompts covering:
- Image/video/audio on canvas (via AI tool call, using URLs from prior uploads)
- YouTube embed via chat
- Updating a media item's title
- Listing canvas items to confirm media items appear
- Mixing media with other item types in one turn
