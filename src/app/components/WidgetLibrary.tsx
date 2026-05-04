const widgets = [
  {
    category: "Productivity",
    description: "Checklist widget for board-level tasks.",
    name: "Task List",
  },
  {
    category: "Notes",
    description: "Plain notes widget for quick capture.",
    name: "Notes",
  },
];

export function WidgetLibrary() {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold">Widgets</h2>
      <div className="mt-3 space-y-2">
        {widgets.map((widget) => (
          <button
            className="block w-full rounded-md border border-[#e7e0d0] bg-white p-3 text-left text-sm"
            key={widget.name}
            type="button"
          >
            <span className="block font-semibold">{widget.name}</span>
            <span className="mt-1 block text-xs text-[#6b7280]">
              {widget.category}
            </span>
            <span className="mt-2 block text-[#4b5563]">
              {widget.description}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
