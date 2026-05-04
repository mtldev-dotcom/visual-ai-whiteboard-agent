import path from "path";
import { describe, expect, it } from "vitest";

import {
  formatCoreFilesForAssistantContext,
  getCoreFilePath,
  isCoreFileName,
} from "./core-files";

describe("core file helpers", () => {
  it("accepts whitelisted core files", () => {
    expect(isCoreFileName("CORE.md")).toBe(true);
    expect(isCoreFileName("TOOLS.md")).toBe(true);
  });

  it("rejects non-core files", () => {
    expect(isCoreFileName("AGENTS.md")).toBe(false);
    expect(isCoreFileName("../README.md")).toBe(false);
  });

  it("resolves core files inside docs/agent-core", () => {
    expect(getCoreFilePath("CORE.md")).toBe(
      path.join(process.cwd(), "docs", "agent-core", "CORE.md"),
    );
  });

  it("rejects path traversal attempts", () => {
    expect(() => getCoreFilePath("../README.md")).toThrow(
      "Unsupported core file",
    );
  });

  it("formats assistant context with file boundaries", () => {
    expect(
      formatCoreFilesForAssistantContext([
        { content: "# Core", name: "CORE.md" },
        { content: "# Rules\n", name: "RULES.md" },
      ]),
    ).toBe("--- CORE.md ---\n# Core\n\n--- RULES.md ---\n# Rules");
  });
});
