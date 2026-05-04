"use client";

import { useState } from "react";
import Image from "next/image";

import { SandboxedHtmlWidget } from "./SandboxedHtmlWidget";

const zoomStep = 0.1;
const minZoom = 0.5;
const maxZoom = 1.8;

type DemoCanvasItem = {
  id: string;
  type:
    | "text"
    | "sticky_note"
    | "markdown"
    | "image"
    | "link"
    | "task_list"
    | "notes"
    | "html_widget";
  x: number;
  y: number;
  width: number;
  height: number;
  content: {
    title?: string;
    text?: string;
    alt?: string;
    href?: string;
    html?: string;
    src?: string;
    tasks?: { completed: boolean; title: string }[];
  };
};

const initialDemoItems: DemoCanvasItem[] = [
  {
    id: "item-positioning",
    type: "sticky_note",
    x: 32,
    y: 32,
    width: 260,
    height: 160,
    content: {
      title: "Positioning",
      text: "Draft the core story and supporting proof points.",
    },
  },
  {
    id: "item-summary",
    type: "text",
    x: 340,
    y: 40,
    width: 280,
    height: 120,
    content: {
      title: "Launch tasks",
      text: "Press checklist\nDemo board\nTelegram capture test",
    },
  },
  {
    id: "item-markdown",
    type: "markdown",
    x: 80,
    y: 240,
    width: 300,
    height: 170,
    content: {
      text: "## Demo outline\n- Problem\n- Visual workflow\n- Assistant actions",
    },
  },
  {
    id: "item-link",
    type: "link",
    x: 430,
    y: 235,
    width: 250,
    height: 120,
    content: {
      title: "Product brief",
      href: "https://example.com/product-brief",
      text: "Reference link placeholder",
    },
  },
  {
    id: "item-image",
    type: "image",
    x: 720,
    y: 60,
    width: 260,
    height: 180,
    content: {
      alt: "Abstract board placeholder",
      src: "/globe.svg",
      title: "Reference image",
    },
  },
  {
    id: "item-task-list",
    type: "task_list",
    x: 720,
    y: 290,
    width: 280,
    height: 190,
    content: {
      title: "Launch checklist",
      tasks: [
        { completed: true, title: "Draft story" },
        { completed: false, title: "Prepare demo" },
        { completed: false, title: "Review Telegram capture" },
      ],
    },
  },
  {
    id: "item-notes",
    type: "notes",
    x: 80,
    y: 455,
    width: 360,
    height: 150,
    content: {
      title: "Notes",
      text: "Keep launch notes close to the board context.",
    },
  },
  {
    id: "item-html-widget",
    type: "html_widget",
    x: 500,
    y: 520,
    width: 360,
    height: 210,
    content: {
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; margin: 0; padding: 16px; background: #ffffff; color: #1f2933;">
            <h1 style="font-size: 16px; margin: 0 0 8px;">Sandboxed Widget</h1>
            <p style="font-size: 13px; line-height: 1.4;">This demo runs in a restricted iframe.</p>
          </body>
        </html>
      `,
      title: "Sandboxed HTML",
    },
  },
];

function clampZoom(value: number) {
  return Math.min(maxZoom, Math.max(minZoom, value));
}

function renderCanvasItem(item: DemoCanvasItem) {
  const baseClasses =
    "absolute overflow-hidden rounded-md border p-4 text-sm shadow-sm";

  if (item.type === "sticky_note") {
    return (
      <article className={`${baseClasses} border-[#e2c86f] bg-[#fff2a8]`}>
        <h3 className="font-semibold">{item.content.title}</h3>
        <p className="mt-2">{item.content.text}</p>
      </article>
    );
  }

  if (item.type === "markdown") {
    return (
      <article className={`${baseClasses} border-[#b7cfbc] bg-[#e9f5e8]`}>
        <pre className="whitespace-pre-wrap font-sans">{item.content.text}</pre>
      </article>
    );
  }

  if (item.type === "image") {
    return (
      <figure className={`${baseClasses} border-[#c7bfae] bg-white`}>
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
      <article className={`${baseClasses} border-[#b9c6d3] bg-[#eef5fb]`}>
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
      <article className={`${baseClasses} border-[#c7bfae] bg-white`}>
        <h3 className="font-semibold">{item.content.title}</h3>
        <ul className="mt-3 space-y-2">
          {(item.content.tasks ?? []).map((task) => (
            <li className="flex items-center gap-2" key={task.title}>
              <span
                className={`h-4 w-4 rounded border ${
                  task.completed
                    ? "border-[#2f5d50] bg-[#2f5d50]"
                    : "border-[#9ca3af] bg-white"
                }`}
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
      <article className={`${baseClasses} border-[#dbc6a4] bg-[#fff9ed]`}>
        <h3 className="font-semibold">{item.content.title}</h3>
        <p className="mt-2 whitespace-pre-line">{item.content.text}</p>
      </article>
    );
  }

  if (item.type === "html_widget") {
    return (
      <article className={`${baseClasses} border-[#c7bfae] bg-white p-0`}>
        <SandboxedHtmlWidget
          html={item.content.html ?? ""}
          title={item.content.title ?? "Sandboxed HTML widget"}
        />
      </article>
    );
  }

  return (
    <article className={`${baseClasses} border-[#d8d2c3] bg-white`}>
      <h3 className="font-semibold">{item.content.title}</h3>
      <p className="mt-2 whitespace-pre-line">{item.content.text}</p>
    </article>
  );
}

export function BoardCanvas() {
  const [items, setItems] = useState(initialDemoItems);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedItem = items.find((item) => item.id === selectedItemId);
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

  function updateDraggedItem(clientX: number, clientY: number) {
    if (!itemDrag) {
      return;
    }

    const deltaX = (clientX - itemDrag.x) / zoom;
    const deltaY = (clientY - itemDrag.y) / zoom;

    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== itemDrag.itemId) {
          return item;
        }

        if (itemDrag.mode === "resize") {
          return {
            ...item,
            height: Math.max(96, itemDrag.itemHeight + deltaY),
            width: Math.max(160, itemDrag.itemWidth + deltaX),
          };
        }

        return {
          ...item,
          x: itemDrag.itemX + deltaX,
          y: itemDrag.itemY + deltaY,
        };
      }),
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden bg-[#ebe7db]">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-md border border-[#c7bfae] bg-[#fffdfa] p-1 shadow-sm">
        <button
          aria-label="Zoom out"
          className="min-h-11 min-w-11 rounded-md border border-[#e7e0d0] text-lg font-semibold"
          onClick={() => setZoom((current) => clampZoom(current - zoomStep))}
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
          onClick={() => setZoom((current) => clampZoom(current + zoomStep))}
          type="button"
        >
          +
        </button>
      </div>

      <div
        className="absolute inset-0 cursor-grab touch-none bg-[linear-gradient(#d8d2c3_1px,transparent_1px),linear-gradient(90deg,#d8d2c3_1px,transparent_1px)] bg-[size:32px_32px] active:cursor-grabbing"
        onClick={() => setSelectedItemId(null)}
        onPointerCancel={() => setDragStart(null)}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragStart({
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            panX: pan.x,
            panY: pan.y,
          });
        }}
        onPointerMove={(event) => {
          if (!dragStart || dragStart.pointerId !== event.pointerId) {
            return;
          }

          setPan({
            x: dragStart.panX + event.clientX - dragStart.x,
            y: dragStart.panY + event.clientY - dragStart.y,
          });
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
          setDragStart(null);
        }}
      >
        <div
          className="origin-top-left p-4 transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <div className="relative h-[760px] w-[1040px]">
            {items.map((item) => {
              const selected = selectedItemId === item.id;

              return (
                <div
                  aria-pressed={selected}
                  className={`absolute touch-manipulation text-left outline-none ${
                    selected ? "ring-4 ring-[#2f5d50]" : ""
                  }`}
                  key={item.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedItemId(item.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedItemId(item.id);
                    }
                  }}
                  onPointerCancel={() => setItemDrag(null)}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setSelectedItemId(item.id);
                    setItemDrag({
                      mode: "move",
                      pointerId: event.pointerId,
                      itemId: item.id,
                      x: event.clientX,
                      y: event.clientY,
                      itemX: item.x,
                      itemY: item.y,
                      itemWidth: item.width,
                      itemHeight: item.height,
                    });
                  }}
                  onPointerMove={(event) => {
                    if (itemDrag?.pointerId === event.pointerId) {
                      updateDraggedItem(event.clientX, event.clientY);
                    }
                  }}
                  onPointerUp={(event) => {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                    setItemDrag(null);
                  }}
                  role="button"
                  style={{
                    height: item.height,
                    left: item.x,
                    top: item.y,
                    width: item.width,
                  }}
                  tabIndex={0}
                >
                  {renderCanvasItem(item)}
                  {selected ? (
                    <>
                      <span className="absolute -top-8 left-0 rounded-md bg-[#2f5d50] px-2 py-1 text-xs font-semibold text-white">
                        Selected
                      </span>
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-2 -right-2 h-6 w-6 cursor-nwse-resize rounded-md border-2 border-white bg-[#2f5d50]"
                        onPointerCancel={() => setItemDrag(null)}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          event.currentTarget.setPointerCapture(
                            event.pointerId,
                          );
                          setItemDrag({
                            mode: "resize",
                            pointerId: event.pointerId,
                            itemId: item.id,
                            x: event.clientX,
                            y: event.clientY,
                            itemX: item.x,
                            itemY: item.y,
                            itemWidth: item.width,
                            itemHeight: item.height,
                          });
                        }}
                        onPointerMove={(event) => {
                          if (itemDrag?.pointerId === event.pointerId) {
                            updateDraggedItem(event.clientX, event.clientY);
                          }
                        }}
                        onPointerUp={(event) => {
                          event.currentTarget.releasePointerCapture(
                            event.pointerId,
                          );
                          setItemDrag(null);
                        }}
                      />
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedItem ? (
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
              onClick={() => setSelectedItemId(null)}
              type="button"
            >
              Close
            </button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-sm font-semibold">
            {["Edit", "Copy", "Ask AI", "Delete"].map((action) => (
              <button
                className="min-h-11 rounded-md border border-[#e7e0d0] bg-white px-2"
                key={action}
                type="button"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <button
        className="absolute bottom-3 right-3 z-10 hidden min-h-12 rounded-md bg-[#2f5d50] px-4 text-sm font-semibold text-white shadow-lg lg:block"
        type="button"
      >
        Ask AI
      </button>
    </div>
  );
}
