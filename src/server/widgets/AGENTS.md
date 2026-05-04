# Widget Server Contract

This folder owns server-side widget policy and persistence helpers.

Rules:

- Default custom HTML widgets to no network and no tool access.
- Keep executable source separate from widget instance state.
- Validate permission names before storing or granting them.
- Treat generated/custom HTML widgets as security-sensitive.
- Update widget runtime docs whenever permission behavior changes.
