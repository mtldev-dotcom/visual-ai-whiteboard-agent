import { describe, expect, it } from "vitest";

import { summarizeCanvasItemContent } from "./board-query-tools";

describe("summarizeCanvasItemContent", () => {
  it("includes text content in the preview", () => {
    const summary = summarizeCanvasItemContent({
      text: "What does success look like?",
      title: "Project Goals",
    });

    expect(summary.title).toBe("Project Goals");
    expect(summary.text).toBe("What does success look like?");
    expect(summary.preview).toContain("Title: Project Goals");
    expect(summary.preview).toContain("Text: What does success look like?");
  });

  it("includes task completion state in the preview", () => {
    const summary = summarizeCanvasItemContent({
      tasks: [
        { completed: false, title: "Define scope" },
        { completed: true, title: "Assign owners" },
      ],
      title: "Launch Checklist",
    });

    expect(summary.tasks).toEqual([
      { completed: false, title: "Define scope" },
      { completed: true, title: "Assign owners" },
    ]);
    expect(summary.preview).toContain("[ ] Define scope");
    expect(summary.preview).toContain("[x] Assign owners");
  });

  it("includes kanban columns and card titles in the preview", () => {
    const summary = summarizeCanvasItemContent({
      columns: [
        {
          cards: [{ title: "Research phase" }],
          title: "Backlog",
        },
        {
          cards: [],
          title: "Done",
        },
      ],
      title: "Sprint Board",
    });

    expect(summary.columns).toEqual([
      { cards: [{ title: "Research phase" }], title: "Backlog" },
      { cards: [], title: "Done" },
    ]);
    expect(summary.preview).toContain("Backlog (1 card: Research phase)");
    expect(summary.preview).toContain("Done (0 cards)");
  });
});
