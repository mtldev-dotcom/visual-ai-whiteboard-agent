# Assistant Server Contract

This folder owns assistant runtime interfaces and provider adapters.

Rules:

- Keep LLM providers behind a provider-agnostic adapter.
- Do not couple canvas tools to one model vendor.
- Tool execution must go through a registry with validation and permission checks.
- Keep local/deterministic adapters available for development and tests.
- Do not log prompts that may contain private user data unless explicit debug policy exists.
