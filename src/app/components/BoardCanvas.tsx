"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { SandboxedHtmlWidget } from "./SandboxedHtmlWidget";

const zoomStep = 0.1;
const minZoom = 0.5;
const maxZoom = 1.8;
const DEBOUNCE_MS = 600;

type CanvasItemContent = {
  title?: string;
  text?: string;
  alt?: string;
  href?: string;
  html?: string;
  src?: string;
  tasks?: { completed: boolean; title: string }[];
};

type CanvasItem = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: CanvasItemContent;
};

type EditState = { itemId: string; title: string; text: string } | null;
type ConfirmState = { itemId: string } | null;

function clampZoom(v: number) {
  return Math.min(maxZoom, Math.max(minZoom, v));
}

function renderItem(item: CanvasItem, onEdit: (item: CanvasItem) => void) {
  const base =
    "absolute overflow-hidden rounded-md border p-4 text-sm shadow-sm";

  if (item.type === "sticky_note") {
    return (
      <article className={`${base} border-[#e2c86f] bg-[#fff2a8]`}>
        <h3 className="font-semibold">{item.content.title}</h3>
        <p className="mt-2 whitespace-pre-line">{item.content.text}</p>
        <button
          className="absolute right-2 top-2 rounded px-1 text-xs text-[#6b7280] hover:text-[#1f2933]"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
          type="button"
        >
          Edit
        </button>
      </article>
    );
  }
  if (item.type === "markdown") {
    return (
      <article className={`${base} border-[#b7cfbc] bg-[#e9f5e8]`}>
        <pre className="whitespace-pre-wrap font-sans text-sm">
          {item.content.text}
        </pre>
      </article>
    );
  }
  if (item.type === "image") {
    return (
      <figure className={`${base} border-[#c7bfae] bg-white`}>
        <Image
          alt={item.content.alt ?? ""}
          className="h-24 w-full object-contain"
          height={96}
          src={item.content.src ?? "/globe.svg"}
          width={228}
        />
        <figcaption className="mt-3 font-semibold">
          {item.content.title}
        </figcaption>
      </figure>
    );
  }
  if (item.type === "link") {
    return (
      <article className={`${base} border-[#b9c6d3] bg-[#eef5fb]`}>
        <h3 className="font-semibold">{item.content.title}</h3>
        <p className="mt-2 text-[#4b5563]">{item.content.text}</p>
        <a
          className="mt-3 block truncate font-semibold"
          href={item.content.href}
        >
          {item.content.href}
        </a>
      </article>
    );
  }
  if (item.type === "task_list") {
    return (
      <article className={`${base} border-[#c7bfae] bg-white`}>
        <h3 className="font-semibold">{item.content.title}</h3>
        <ul className="mt-3 space-y-2">
          {(item.content.tasks ?? []).map((task, i) => (
            <li className="flex items-center gap-2" key={i}>
              <span
                className={`h-4 w-4 flex-shrink-0 rounded border ${task.completed ? "border-[#2f5d50] bg-[#2f5d50]" : "border-[#9ca3af] bg-white"}`}
              />
              <span>{task.title}</span>
            </li>
          ))}
        </ul>
      </article>
    );
  }
  if (item.type === "notes") {
    return (
      <article className={`${base} border-[#dbc6a4] bg-[#fff9ed]`}>
        <h3 className="font-semibold">{item.content.title}</h3>
        <p className="mt-2 whitespace-pre-line">{item.content.text}</p>
      </article>
    );
  }
  if (item.type === "html_widget") {
    return (
      <article className={`${base} border-[#c7bfae] bg-white p-0`}>
        <SandboxedHtmlWidget
          html={item.content.html ?? ""}
          title={item.content.title ?? "Sandboxed HTML widget"}
        />
      </article>
    );
  }
  return (
    <article className={`${base} border-[#d8d2c3] bg-white`}>
      <h3 className="font-semibold">{item.content.title}</h3>
      <p className="mt-2 whitespace-pre-line">{item.content.text}</p>
    </article>
  );
}

type Props = {
  boardId: string | null;
  refreshKey: number;
  onRefreshNeeded: () => void;
};

export function BoardCanvas({ boardId, refreshKey, onRefreshNeeded }: Props) {
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmState>(null);
  const [dragStart, setDragStart] = useState<{
    pointerId: number;
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);
  const [itemDrag, setItemDrag] = useState<{
    mode: "move" | "resize";
    pointerId: number;
    itemId: string;
    x: number;
    y: number;
    itemX: number;
    itemY: number;
    itemWidth: number;
    itemHeight: number;
  } | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedItem = items.find((i) => i.id === selectedId) ?? null;

  useEffect(() => {
    if (!boardId) return;

    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/boards/${boardId}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { canvasItems?: CanvasItem[] };
        setItems(
          (data.canvasItems ?? []).map((ci) => ({
            content: ci.content as CanvasItemContent,
            height: ci.height,
            id: ci.id,
            type: ci.type,
            width: ci.width,
            x: ci.x,
            y: ci.y,
          })),
        );
      } catch {
        // aborted or network error — leave existing items
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [boardId, refreshKey]);

  const persistPosition = useCallback((id: string, x: number, y: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(`/api/canvas-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x, y }),
      }).catch(() => null);
    }, DEBOUNCE_MS);
  }, []);

  const persistSize = useCallback(
    (id: string, width: number, height: number) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch(`/api/canvas-items/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ width, height }),
        }).catch(() => null);
      }, DEBOUNCE_MS);
    },
    [],
  );

  function updateDragged(clientX: number, clientY: number) {
    if (!itemDrag) return;
    const dx = (clientX - itemDrag.x) / zoom;
    const dy = (clientY - itemDrag.y) / zoom;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemDrag.itemId) return item;
        if (itemDrag.mode === "resize") {
          const w = Math.max(160, itemDrag.itemWidth + dx);
          const h = Math.max(96, itemDrag.itemHeight + dy);
          persistSize(item.id, w, h);
          return { ...item, width: w, height: h };
        }
        const nx = itemDrag.itemX + dx;
        const ny = itemDrag.itemY + dy;
        persistPosition(item.id, nx, ny);
        return { ...item, x: nx, y: ny };
      }),
    );
  }

  async function deleteItem(id: string) {
    await fetch(`/api/canvas-items/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedId(null);
    setConfirmDelete(null);
  }

  async function saveEdit() {
    if (!editState) return;
    const { itemId, title, text } = editState;
    await fetch(`/api/canvas-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { title, text } }),
    });
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, content: { ...i.content, title, text } } : i,
      ),
    );
    setEditState(null);
  }

  async function copyItem(item: CanvasItem) {
    if (!boardId) return;
    const res = await fetch("/api/canvas-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardId,
        type: item.type,
        x: item.x + 24,
        y: item.y + 24,
        width: item.width,
        height: item.height,
        content: item.content,
      }),
    });
    const data = (await res.json()) as { item?: CanvasItem };
    if (data.item) {
      setItems((prev) => [
        ...prev,
        {
          id: data.item!.id,
          type: data.item!.type,
          x: data.item!.x,
          y: data.item!.y,
          width: data.item!.width,
          height: data.item!.height,
          content: data.item!.content as CanvasItemContent,
        },
      ]);
    }
  }

  return (
    <div className="relative flex-1 overflow-hidden bg-[#ebe7db]">
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#ebe7db]/80">
          <span className="text-sm text-[#6b7280]">Loading board…</span>
        </div>
      )}

      {!boardId && !loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-[#9ca3af]">
            Select or create a board to get started.
          </p>
        </div>
      )}

      {boardId && !loading && items.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-[#9ca3af]">
            This board is empty. Ask AI or add an item.
          </p>
        </div>
      )}

      <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-md border border-[#c7bfae] bg-[#fffdfa] p-1 shadow-sm">
        <button
          aria-label="Zoom out"
          className="min-h-11 min-w-11 rounded-md border border-[#e7e0d0] text-lg font-semibold"
          onClick={() => setZoom((z) => clampZoom(z - zoomStep))}
          type="button"
        >
          -
        </button>
        <output className="min-w-14 text-center text-sm font-semibold">
          {Math.round(zoom * 100)}%
        </output>
        <button
          aria-label="Zoom in"
          className="min-h-11 min-w-11 rounded-md bg-[#2f5d50] text-lg font-semibold text-white"
          onClick={() => setZoom((z) => clampZoom(z + zoomStep))}
          type="button"
        >
          +
        </button>
      </div>

      <div
        className="absolute inset-0 cursor-grab touch-none bg-[linear-gradient(#d8d2c3_1px,transparent_1px),linear-gradient(90deg,#d8d2c3_1px,transparent_1px)] bg-[size:32px_32px] active:cursor-grabbing"
        onClick={() => setSelectedId(null)}
        onPointerCancel={() => setDragStart(null)}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragStart({
            pointerId: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            panX: pan.x,
            panY: pan.y,
          });
        }}
        onPointerMove={(e) => {
          if (!dragStart || dragStart.pointerId !== e.pointerId) return;
          setPan({
            x: dragStart.panX + e.clientX - dragStart.x,
            y: dragStart.panY + e.clientY - dragStart.y,
          });
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          setDragStart(null);
        }}
      >
        <div
          className="origin-top-left"
          style={{
            transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
          }}
        >
          <div className="relative h-[760px] w-[1040px]">
            {items.map((item) => {
              const selected = selectedId === item.id;
              return (
                <div
                  aria-pressed={selected}
                  className={`absolute touch-manipulation text-left outline-none ${selected ? "ring-4 ring-[#2f5d50]" : ""}`}
                  key={item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(item.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(item.id);
                    }
                  }}
                  onPointerCancel={() => setItemDrag(null)}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setSelectedId(item.id);
                    setItemDrag({
                      mode: "move",
                      pointerId: e.pointerId,
                      itemId: item.id,
                      x: e.clientX,
                      y: e.clientY,
                      itemX: item.x,
                      itemY: item.y,
                      itemWidth: item.width,
                      itemHeight: item.height,
                    });
                  }}
                  onPointerMove={(e) => {
                    if (itemDrag?.pointerId === e.pointerId)
                      updateDragged(e.clientX, e.clientY);
                  }}
                  onPointerUp={(e) => {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    setItemDrag(null);
                  }}
                  role="button"
                  style={{
                    left: item.x,
                    top: item.y,
                    width: item.width,
                    height: item.height,
                  }}
                  tabIndex={0}
                >
                  {renderItem(item, (i) =>
                    setEditState({
                      itemId: i.id,
                      title: i.content.title ?? "",
                      text: i.content.text ?? "",
                    }),
                  )}
                  {selected && (
                    <>
                      <span className="absolute -top-8 left-0 rounded-md bg-[#2f5d50] px-2 py-1 text-xs font-semibold text-white">
                        Selected
                      </span>
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-2 -right-2 h-6 w-6 cursor-nwse-resize rounded-md border-2 border-white bg-[#2f5d50]"
                        onPointerCancel={() => setItemDrag(null)}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setItemDrag({
                            mode: "resize",
                            pointerId: e.pointerId,
                            itemId: item.id,
                            x: e.clientX,
                            y: e.clientY,
                            itemX: item.x,
                            itemY: item.y,
                            itemWidth: item.width,
                            itemHeight: item.height,
                          });
                        }}
                        onPointerMove={(e) => {
                          if (itemDrag?.pointerId === e.pointerId)
                            updateDragged(e.clientX, e.clientY);
                        }}
                        onPointerUp={(e) => {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                          setItemDrag(null);
                        }}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedItem && (
        <div className="absolute inset-x-3 bottom-3 z-20 rounded-md border border-[#c7bfae] bg-[#fffdfa] p-3 shadow-lg lg:hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                Selected
              </p>
              <h3 className="text-sm font-semibold">
                {selectedItem.content.title ?? selectedItem.type}
              </h3>
            </div>
            <button
              className="min-h-11 rounded-md border border-[#c7bfae] px-3 text-sm font-semibold"
              onClick={() => setSelectedId(null)}
              type="button"
            >
              Close
            </button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-sm font-semibold">
            <button
              className="min-h-11 rounded-md border border-[#e7e0d0] bg-white px-2"
              onClick={() =>
                setEditState({
                  itemId: selectedItem.id,
                  title: selectedItem.content.title ?? "",
                  text: selectedItem.content.text ?? "",
                })
              }
              type="button"
            >
              Edit
            </button>
            <button
              className="min-h-11 rounded-md border border-[#e7e0d0] bg-white px-2"
              onClick={() => copyItem(selectedItem)}
              type="button"
            >
              Copy
            </button>
            <button
              className="min-h-11 rounded-md border border-[#e7e0d0] bg-white px-2"
              onClick={onRefreshNeeded}
              type="button"
            >
              Refresh
            </button>
            <button
              className="min-h-11 rounded-md border border-red-200 bg-red-50 px-2 text-red-700"
              onClick={() => setConfirmDelete({ itemId: selectedItem.id })}
              type="button"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <button
        className="absolute bottom-3 right-3 z-10 hidden min-h-12 rounded-md bg-[#2f5d50] px-4 text-sm font-semibold text-white shadow-lg lg:block"
        type="button"
      >
        Ask AI
      </button>

      {editState && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-md border border-[#d8d2c3] bg-[#fffdfa] p-4 shadow-xl">
            <h3 className="mb-3 text-sm font-semibold">Edit item</h3>
            <input
              className="mb-3 min-h-10 w-full rounded-md border border-[#c7bfae] bg-white px-3 text-sm"
              onChange={(e) =>
                setEditState((s) => s && { ...s, title: e.target.value })
              }
              placeholder="Title"
              value={editState.title}
            />
            <textarea
              className="mb-3 min-h-24 w-full resize-y rounded-md border border-[#c7bfae] bg-white px-3 py-2 text-sm"
              onChange={(e) =>
                setEditState((s) => s && { ...s, text: e.target.value })
              }
              placeholder="Content"
              value={editState.text}
            />
            <div className="flex justify-end gap-2">
              <button
                className="min-h-10 rounded-md border border-[#c7bfae] px-4 text-sm"
                onClick={() => setEditState(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="min-h-10 rounded-md bg-[#2f5d50] px-4 text-sm font-semibold text-white"
                onClick={saveEdit}
                type="button"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xs rounded-md border border-[#d8d2c3] bg-[#fffdfa] p-4 shadow-xl">
            <h3 className="mb-2 text-sm font-semibold">Delete this item?</h3>
            <p className="mb-4 text-sm text-[#6b7280]">
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="min-h-10 rounded-md border border-[#c7bfae] px-4 text-sm"
                onClick={() => setConfirmDelete(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="min-h-10 rounded-md bg-red-600 px-4 text-sm font-semibold text-white"
                onClick={() => deleteItem(confirmDelete.itemId)}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
