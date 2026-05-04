import { describe, expect, it } from "vitest";

import {
  validateAddCanvasItemInput,
  validateDeleteCanvasItemInput,
  validateUpdateCanvasItemInput,
} from "./canvas-tools";

describe("validateAddCanvasItemInput", () => {
  const validInput = {
    boardId: "board-1",
    content: { text: "Hello" },
    height: 120,
    type: "sticky_note",
    width: 200,
    x: 10,
    y: 20,
  };

  it("accepts valid canvas item input", () => {
    expect(validateAddCanvasItemInput(validInput)).toEqual({ ok: true });
  });

  it("rejects missing board id", () => {
    expect(validateAddCanvasItemInput({ ...validInput, boardId: "" })).toEqual({
      error: "boardId is required.",
      ok: false,
    });
  });

  it("rejects invalid geometry", () => {
    expect(validateAddCanvasItemInput({ ...validInput, width: 0 })).toEqual({
      error: "width and height must be greater than zero.",
      ok: false,
    });
  });

  it("rejects invalid content", () => {
    expect(
      validateAddCanvasItemInput({ ...validInput, content: "bad" }),
    ).toEqual({
      error: "content must be an object.",
      ok: false,
    });
  });

  it("rejects removed notes item type", () => {
    expect(validateAddCanvasItemInput({ ...validInput, type: "notes" })).toEqual(
      {
        error:
          "type must be one of: text, sticky_note, task_list, kanban, markdown, image, link, html_widget.",
        ok: false,
      },
    );
  });
});

describe("validateUpdateCanvasItemInput", () => {
  it("accepts partial updates", () => {
    expect(
      validateUpdateCanvasItemInput({
        content: { text: "Updated" },
        itemId: "item-1",
        x: 24,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects invalid item id", () => {
    expect(validateUpdateCanvasItemInput({ itemId: "" })).toEqual({
      error: "itemId is required.",
      ok: false,
    });
  });

  it("rejects invalid update payloads", () => {
    expect(
      validateUpdateCanvasItemInput({ content: "bad", itemId: "item-1" }),
    ).toEqual({
      error: "content must be an object when provided.",
      ok: false,
    });
  });
});

describe("validateDeleteCanvasItemInput", () => {
  it("requires explicit confirmation", () => {
    expect(validateDeleteCanvasItemInput({ itemId: "item-1" })).toEqual({
      error: "confirmed must be true before deleting an item.",
      ok: false,
    });
  });

  it("accepts confirmed delete input", () => {
    expect(
      validateDeleteCanvasItemInput({ confirmed: true, itemId: "item-1" }),
    ).toEqual({ ok: true });
  });
});
