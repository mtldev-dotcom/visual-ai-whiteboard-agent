import { describe, expect, it } from "vitest";

import {
  validateGenerateHtmlWidgetInput,
  validateRollbackHtmlWidgetInput,
} from "./widget-tools";

describe("validateGenerateHtmlWidgetInput", () => {
  const validInput = {
    boardId: "board-1",
    body: "Useful widget content",
    title: "Decision Card",
  };

  it("accepts valid generation input", () => {
    expect(validateGenerateHtmlWidgetInput(validInput)).toEqual({ ok: true });
  });

  it("rejects missing body", () => {
    expect(
      validateGenerateHtmlWidgetInput({ ...validInput, body: "" }),
    ).toEqual({
      error: "body is required.",
      ok: false,
    });
  });

  it("rejects invalid geometry", () => {
    expect(
      validateGenerateHtmlWidgetInput({ ...validInput, width: Number.NaN }),
    ).toEqual({
      error: "width must be a finite number.",
      ok: false,
    });
  });
});

describe("validateRollbackHtmlWidgetInput", () => {
  it("accepts valid rollback input", () => {
    expect(
      validateRollbackHtmlWidgetInput({
        itemId: "item-1",
        sourceVersion: "v1",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects missing source version", () => {
    expect(validateRollbackHtmlWidgetInput({ itemId: "item-1" })).toEqual({
      error: "sourceVersion is required.",
      ok: false,
    });
  });
});
