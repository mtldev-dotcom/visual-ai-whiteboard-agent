"use client";

import { useEffect, useState } from "react";
import { Save, Eye, EyeOff, FileText } from "lucide-react";

type FileMeta = { filename: string; size: number; updatedAt: string };

export default function AdminCoreFilesPage() {
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/core-files")
      .then((r) => r.json())
      .then((d) => {
        setFiles(d.files ?? []);
        if (d.files?.length) selectFile(d.files[0].filename);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectFile(filename: string) {
    setSelected(filename);
    setLoading(true);
    setPreview(false);
    const r = await fetch(`/api/admin/core-files/${filename}`);
    const data = await r.json();
    setContent(data.content ?? "");
    setOriginal(data.content ?? "");
    setLoading(false);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/admin/core-files/${selected}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setOriginal(content);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const dirty = content !== original;

  return (
    <div className="flex h-full">
      {/* File list sidebar */}
      <div className="w-48 flex-shrink-0 border-r border-gray-200 bg-gray-50 p-3 space-y-0.5">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wide px-2 py-1 mb-1">
          agent-core/
        </div>
        {files.map((f) => (
          <button
            key={f.filename}
            onClick={() => selectFile(f.filename)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors ${
              selected === f.filename
                ? "bg-indigo-600 text-white"
                : "text-gray-600 hover:bg-gray-200"
            }`}
          >
            <FileText size={13} />
            {f.filename}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-gray-700">{selected ?? "Select a file"}</span>
            {dirty && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Unsaved</span>}
            {saved && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Saved</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg"
            >
              {preview ? <EyeOff size={13} /> : <Eye size={13} />}
              {preview ? "Edit" : "Preview"}
            </button>
            <button
              onClick={save}
              disabled={saving || !dirty || !selected}
              className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              <Save size={13} />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : preview ? (
            <div className="p-6 prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">{content}</pre>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full p-5 font-mono text-sm text-gray-800 resize-none focus:outline-none bg-white leading-relaxed"
              spellCheck={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}
