import { describe, expect, it } from "vitest";

import {
  defaultCustomHtmlWidgetPermissions,
  hasWidgetPermission,
  validateWidgetPermissions,
} from "./permissions";

describe("widget permissions", () => {
  it("disables network and tool access by default for custom HTML widgets", () => {
    expect(
      hasWidgetPermission(
        defaultCustomHtmlWidgetPermissions,
        "network.request",
      ),
    ).toBe(false);
    expect(
      hasWidgetPermission(defaultCustomHtmlWidgetPermissions, "tools.invoke"),
    ).toBe(false);
  });

  it("accepts known permissions", () => {
    expect(validateWidgetPermissions(["board.read", "board.write"])).toEqual({
      ok: true,
      permissions: ["board.read", "board.write"],
    });
  });

  it("rejects unknown permissions", () => {
    expect(validateWidgetPermissions(["network.all"])).toEqual({
      error: "Unsupported widget permission: network.all",
      ok: false,
    });
  });

  it("rejects duplicate permissions", () => {
    expect(validateWidgetPermissions(["board.read", "board.read"])).toEqual({
      error: "Duplicate widget permission: board.read",
      ok: false,
    });
  });
});
