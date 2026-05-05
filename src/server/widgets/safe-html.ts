const MAX_WIDGET_TEXT_LENGTH = 4000;

export function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function slugifyWidgetKey(input: string) {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "generated-widget";
}

export function buildSafeHtmlWidgetSource(input: {
  title: string;
  body: string;
}) {
  const title = escapeHtml(input.title.trim() || "Generated widget");
  const body = escapeHtml(input.body.trim().slice(0, MAX_WIDGET_TEXT_LENGTH));
  const paragraphs = body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("\n");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f8fafc;
        color: #172033;
      }
      main {
        min-height: 100vh;
        box-sizing: border-box;
        padding: 18px;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 18px;
        line-height: 1.2;
      }
      p {
        margin: 0 0 10px;
        font-size: 13px;
        line-height: 1.55;
      }
      .shell {
        border: 1px solid #d8dee9;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
        padding: 16px;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="shell">
        <h1>${title}</h1>
        ${paragraphs || "<p>No content provided.</p>"}
      </section>
    </main>
  </body>
</html>`;
}
