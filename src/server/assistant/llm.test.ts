import { describe, expect, it } from "vitest";

import { createLlmAdapter } from "./llm";

describe("createLlmAdapter", () => {
  it("returns the local adapter by default", async () => {
    const adapter = createLlmAdapter("");

    const response = await adapter.complete({
      messages: [{ role: "user", content: "Create a board" }],
    });

    expect(response.provider).toBe("local");
    expect(response.content).toContain("Create a board");
    expect(response.metadata?.coreContextLoaded).toBe(true);
    expect(response.toolCalls).toEqual([]);
  });

  it("accepts injected core context for deterministic tests", async () => {
    const adapter = createLlmAdapter("local");

    const response = await adapter.complete({
      coreContext: "core",
      messages: [],
    });

    expect(response.metadata).toEqual({
      coreContextCharacters: 4,
      coreContextLoaded: true,
    });
  });

  it("rejects unsupported providers", () => {
    expect(() => createLlmAdapter("unknown-provider")).toThrow(
      "Unsupported LLM provider",
    );
  });
});
