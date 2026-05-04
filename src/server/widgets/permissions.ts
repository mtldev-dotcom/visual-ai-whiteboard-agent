export const widgetPermissions = [
  "board.read",
  "board.write",
  "network.request",
  "storage.local",
  "tools.invoke",
] as const;

export type WidgetPermission = (typeof widgetPermissions)[number];

const widgetPermissionSet = new Set<string>(widgetPermissions);

export const defaultCustomHtmlWidgetPermissions: WidgetPermission[] = [];

export function isWidgetPermission(input: unknown): input is WidgetPermission {
  return typeof input === "string" && widgetPermissionSet.has(input);
}

export function validateWidgetPermissions(input: unknown) {
  if (!Array.isArray(input)) {
    return { error: "permissions must be an array.", ok: false } as const;
  }

  const seen = new Set<string>();

  for (const permission of input) {
    if (!isWidgetPermission(permission)) {
      return {
        error: `Unsupported widget permission: ${String(permission)}`,
        ok: false,
      } as const;
    }

    if (seen.has(permission)) {
      return {
        error: `Duplicate widget permission: ${permission}`,
        ok: false,
      } as const;
    }

    seen.add(permission);
  }

  return { ok: true, permissions: input } as const;
}

export function hasWidgetPermission(
  permissions: readonly WidgetPermission[],
  permission: WidgetPermission,
) {
  return permissions.includes(permission);
}
