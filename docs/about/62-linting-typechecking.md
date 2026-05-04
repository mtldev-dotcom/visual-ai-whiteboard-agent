# Linting and Type Checking

This project uses ESLint, Prettier, and TypeScript's `tsc` as a three-layer quality gate. Each layer catches a different class of error, and all three must pass before changes are considered complete.

## ESLint Configuration

**File:** `eslint.config.mjs`

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

### Why `eslint-config-next`

`eslint-config-next` is Next.js's official ESLint plugin suite. It bundles three categories of rules:

1. **`core-web-vitals`**: Rules from the Next.js Core Web Vitals initiative — catches patterns that degrade LCP, FID, and CLS (e.g., using `<img>` without `alt`, layout shift in `useEffect`).
2. **`typescript`**: ESLint rules for TypeScript, configured for Next.js conventions (strict null checks, no implicit `any` for exported functions, correct hook dependencies).

Using the official Next.js ESLint config ensures that the lint rules match what Next.js itself expects. If the Next.js team deprecates a pattern, the ESLint config will flag it automatically on the next `npm install`.

### Ignored Paths

The `globalIgnores` list excludes build artifacts:

- `.next/**` — Next.js production build output.
- `out/**` — Static export output (if configured).
- `build/**` — Legacy build directory.
- `next-env.d.ts` — Auto-generated TypeScript declarations file, not user-editable.

**Why not ignore `node_modules`.** `eslint-config-next` already ignores `node_modules` by default. The `globalIgnores` list only needs to add Next.js-specific directories that ESLint's default ignores don't cover.

### ESLint Version

The project uses ESLint v9 with the flat config format (`eslint.config.mjs`). The flat config is the newer, simpler format that replaces the legacy `.eslintrc.*` files. All Next.js v16 projects default to flat config.

---

## Prettier Configuration

**File:** `.prettierrc` (project uses Prettier defaults — no custom `.prettierrc` file exists).

The Prettier ignore file:

```
node_modules
.next
coverage
dist
build
next-scaffold-tmp
next-env.d.ts
```

### Why No Custom Prettier Config

The project intentionally uses **Prettier's default settings** (2-space indent, double quotes, trailing commas in ES5, 80-char print width). This is a deliberate choice:

- **Zero-config consistency.** Every developer and agent gets the same formatting without negotiating config options.
- **No style debates.** Default Prettier settles all formatting debates by fiat. There is no `.prettierrc` to argue over.
- **Upgrade safety.** When Prettier v4 changes defaults, the project automatically adopts them without merge conflicts in a config file.

The only customization is `.prettierignore`, which excludes build artifacts and generated files.

---

## TypeScript Configuration

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

### Key Compiler Options

#### `strict: true`

Enables all strict type-checking options:
- `strictNullChecks`: `null` and `undefined` are not assignable to other types.
- `strictFunctionTypes`: function parameter types are checked contravariantly.
- `strictBindCallApply`: `bind`, `call`, and `apply` arguments are type-checked.
- `strictPropertyInitialization`: class properties must be initialized in the constructor.
- `noImplicitAny`: TypeScript will not infer `any` for unannotated parameters.
- `noImplicitThis`: `this` in functions must have an explicit type.
- `alwaysStrict`: emit `"use strict"` and parse in strict mode.

**Why strict mode matters in an AI agent project.** The assistant generates and mutates data through tool calls. Without strict null checks, a missing `boardId` could propagate as `undefined` into a database query and fail with an opaque Prisma error instead of a clear type error. Strict mode catches these at compile time.

#### `target: "ES2017"`

Compiles to ES2017 syntax. This is the standard Next.js target — it supports `async/await` natively, does not transpile to generators, and is compatible with Node.js 16+ and all modern browsers.

#### `moduleResolution: "bundler"`

Uses the bundler-style module resolution that Next.js and Turbopack use. This allows:
- Importing without file extensions (e.g., `import { x } from "./foo"` instead of `from "./foo.js"`).
- Resolving `package.json` `exports` fields.
- Resolving `@/` path aliases.

#### `noEmit: true`

TypeScript does not produce `.js` output files. Next.js handles compilation through its own pipeline (Turbopack in development, SWC in production). `tsc --noEmit` is used purely for type checking.

#### `jsx: "react-jsx"`

Uses the new JSX transform (React 17+). Components do not need `import React from "react"` at the top of `.tsx` files.

#### `paths: { "@/*": ["./src/*"] }`

Maps the `@/` import prefix to the `./src` directory. This is the same alias used in `vitest.config.ts` (Chapter 60). It allows clean imports like:

```ts
import { requireSession } from "@/lib/session";
```

instead of:

```ts
import { requireSession } from "../../lib/session";
```

### Incremental Compilation

`"incremental": true` creates a `.tsbuildinfo` file that caches type-check results. Subsequent `tsc --noEmit` runs are significantly faster because unchanged files are not re-checked. The `.tsbuildinfo` file is git-ignored.

### Next.js Plugin

The `plugins: [{ "name": "next" }]` entry enables Next.js-specific TypeScript features:
- Page component type checking.
- Layout component type checking.
- Route handler type checking.
- Middleware type checking.

This plugin is what enables `next-env.d.ts` type generation and the `.next/types/` directory.

---

## Quality Gate Commands

### `npm run lint`

```bash
npm run lint
```

Runs: `eslint`

Executes ESLint across the project. By default, ESLint v9 only lints files matched by the config. Since `eslint.config.mjs` does not specify a `files` pattern, it lints all `.ts` and `.tsx` files (inherited from `eslint-config-next`).

**What it catches:**
- Unused variables and imports.
- Incorrect React hook dependencies (`exhaustive-deps`).
- Accessibility violations (missing `alt` attributes, incorrect ARIA roles).
- Core Web Vitals regressions (synchronous scripts, large layout shifts).
- TypeScript-specific issues (preferring `interface` over `type` in certain contexts).

### `npm run format`

```bash
npm run format
```

Runs: `prettier . --write`

Formats every file in the project (excluding files in `.prettierignore`). This is a **destructive** command — it writes changes to disk. Run it before commits to ensure consistent formatting.

### `npm run format:check`

```bash
npm run format:check
```

Runs: `prettier . --check`

Validates that all files are already formatted. Returns exit code 1 if any file would be changed by `prettier --write`. Use this in CI to enforce formatting.

### `npm run typecheck`

```bash
npm run typecheck
```

Runs: `tsc --noEmit`

Compiles the entire TypeScript project and reports type errors. Does not produce any output files (because of `noEmit`). This is the definitive check that the codebase is type-safe.

**What it catches:**
- Missing or incorrect types in function signatures.
- Passing the wrong shape to a component prop.
- Accessing properties that don't exist on a type.
- Incorrect generic type arguments.
- Type mismatches in test assertions.

---

## The Quality Gate Pipeline

These four commands form a pipeline that should be run in this order:

```
npm run format:check  →  npm run lint  →  npm run typecheck
```

**Why this order:**

1. **Format first.** Formatting issues are cosmetic and can mask real lint errors. Fix formatting first so lint only reports meaningful issues.
2. **Lint second.** Lint catches both cosmetic and structural issues. Fix lint errors before type checking because some lint errors can cause misleading type errors.
3. **Typecheck last.** Type checking is the most expensive operation and the most likely to reveal deep structural problems. Run it after the faster checks have passed.

In practice, agents use the combined command:

```bash
npm run lint && npm run typecheck && npm test -- --run && npm run build
```

Formatting is typically run once before commits:

```bash
npm run format
```

---

## Standard Next.js Quality Gates

These lint, format, and typecheck commands are **standard Next.js quality gates**. They are not project-specific customizations. Any Next.js developer who joins the project will recognize these patterns:

- `eslint-config-next` is the default ESLint config for Next.js projects.
- `prettier` with minimal configuration is the most common formatting setup.
- `tsc --noEmit` is the standard type-checking command for TypeScript projects.

This familiarity reduces onboarding friction and keeps the project aligned with the broader Next.js ecosystem.

---

## Troubleshooting Common Issues

### `tsc --noEmit` reports errors in `node_modules`

Set `"skipLibCheck": true` in `tsconfig.json`. This is already set. If errors persist, a dependency's types may be incompatible with the project's TypeScript version. Try:
- `npm install` (may update type packages).
- Check that `@types/*` packages match the dependency version.

### `eslint` reports errors about `import/no-unresolved`

The `@/` alias must be configured in both `tsconfig.json` (for `tsc`) and `vitest.config.ts` (for tests). If ESLint reports unresolved imports with `@/`, verify that the `paths` entry in `tsconfig.json` is correct.

### Prettier changes files in unexpected ways

The project uses Prettier defaults. If you prefer a different formatting style, add a `.prettierrc` — but understand that this creates divergence from the project convention and must be justified.

### `eslint.config.mjs` fails to parse

This project uses ESLint v9 flat config. The file **must** be `.mjs` (ES module), not `.js` or `.cjs`. If ESLint reports "ESLint configuration is invalid," check that:
1. ESLint v9+ is installed (`eslint@^9` in `package.json`).
2. The config file exports a default array using `defineConfig`.
3. All imports use ESM syntax (`import` not `require`).
