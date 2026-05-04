# Server Code Contract

This folder owns server-side application logic.

Rules:

- Keep provider integrations behind internal interfaces.
- Do not read secrets outside server-only modules.
- Do not expose API keys, tokens, or connection strings to client components.
- Validate inputs before calling tools or persistence helpers.
- Update architecture docs and handoff notes when server contracts change.
