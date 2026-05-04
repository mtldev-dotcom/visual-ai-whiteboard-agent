import { describe, expect, it } from "vitest";

import { createToolRegistry } from "./tools";

describe("ToolRegistry", () => {
  const context = {
    actor: { id: "user-1", type: "user" as const },
    workspaceId: "workspace-1",
  };

  it("registers, lists, and executes a tool", async () => {
    const registry = createToolRegistry();

    registry.register({
      description: "Echo input",
      execute: async (input) => ({
        ok: true,
        output: input,
        summary: "Echoed input.",
      }),
      name: "echo",
      permissionLevel: 1,
      validate: () => ({ ok: true }),
    });

    expect(registry.list()).toEqual([
      {
        description: "Echo input",
        name: "echo",
        permissionLevel: 1,
      },
    ]);

    await expect(
      registry.execute("echo", { text: "hi" }, context),
    ).resolves.toEqual({
      ok: true,
      output: { text: "hi" },
      summary: "Echoed input.",
    });
  });

  it("rejects duplicate tool registration", () => {
    const registry = createToolRegistry();
    const tool = {
      description: "Echo input",
      execute: async () => ({ ok: true, summary: "Echoed input." }),
      name: "echo",
      permissionLevel: 1 as const,
      validate: () => ({ ok: true as const }),
    };

    registry.register(tool);

    expect(() => registry.register(tool)).toThrow("Tool already registered");
  });

  it("returns structured validation errors", async () => {
    const registry = createToolRegistry();

    registry.register({
      description: "Reject input",
      execute: async () => ({ ok: true, summary: "Should not run." }),
      name: "reject",
      permissionLevel: 1,
      validate: () => ({ error: "Bad input", ok: false }),
    });

    await expect(registry.execute("reject", {}, context)).resolves.toEqual({
      error: "Bad input",
      ok: false,
      summary: "Tool input validation failed.",
    });
  });
});
