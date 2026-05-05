import { describe, expect, it } from "vitest";

import {
  buildSafeHtmlWidgetSource,
  escapeHtml,
  slugifyWidgetKey,
} from "./safe-html";

describe("safe HTML widget helpers", () => {
  it("escapes HTML-sensitive characters", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });

  it("builds source without preserving executable tags", () => {
    const source = buildSafeHtmlWidgetSource({
      body: "<script>alert(1)</script>",
      title: "Demo",
    });

    expect(source).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(source).not.toContain("<script>alert(1)</script>");
  });

  it("creates stable widget key slugs", () => {
    expect(slugifyWidgetKey("Sprint Plan!")).toBe("sprint-plan");
  });
});
