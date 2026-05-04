import { describe, expect, it } from "vitest";

import {
  validateCreateBoardInput,
  validateCreateSubBoardInput,
} from "./board-tools";

describe("validateCreateBoardInput", () => {
  it("accepts a title and optional description", () => {
    expect(
      validateCreateBoardInput({
        description: "Planning board",
        title: "Launch",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects missing title", () => {
    expect(validateCreateBoardInput({ title: "" })).toEqual({
      error: "title is required.",
      ok: false,
    });
  });

  it("rejects invalid description", () => {
    expect(
      validateCreateBoardInput({ description: 123, title: "Launch" }),
    ).toEqual({
      error: "description must be a string when provided.",
      ok: false,
    });
  });
});

describe("validateCreateSubBoardInput", () => {
  it("accepts parent board id", () => {
    expect(
      validateCreateSubBoardInput({
        parentBoardId: "board-1",
        title: "Research",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects missing parent board id", () => {
    expect(validateCreateSubBoardInput({ title: "Research" })).toEqual({
      error: "parentBoardId is required.",
      ok: false,
    });
  });
});
