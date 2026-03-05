# AGENTS.md

## Commands

- **Build:** `yarn build`
- **Dev server:** `yarn dev`
- **Lint (full):** `yarn lint` (runs svelte-check, prettier --check, eslint)
- **Typecheck:** `yarn svelte-kit sync && yarn svelte-check --tsconfig ./tsconfig.json --fail-on-warnings`
- **Test all:** `yarn test`
- **Test single file:** `yarn vitest run <path>` (e.g. `yarn vitest run src/lib/url-templates.test.ts`)
- **Format:** `yarn format`

## Architecture

SvelteKit app (Svelte 5, adapter-node) — a code search frontend for [zoekt](https://github.com/sourcegraph/zoekt). Uses Tailwind CSS 4, TypeScript (strict mode), and Vite. Routes are in `src/routes/`; shared components and utilities are in `src/lib/`. Server-side code (zoekt client, API helpers) lives in `src/lib/server/`. Schema validation uses `@badrap/valita`. Tests are co-located with source files as `*.test.ts` and use vitest.

## Code Style

- Package manager: **yarn** (v4, Corepack). Never use npm.
- Formatting: Prettier (default config + prettier-plugin-svelte). No semicolons omission — use defaults.
- Imports: bare specifiers for deps, `$lib/` alias for `src/lib/`. No file extensions on TS imports.
- Types: strict TS (`strict: true`). No `any` unless unavoidable. Use `@badrap/valita` for runtime validation.
- Naming: kebab-case filenames, camelCase variables/functions.
- Components: Svelte 5 (runes). `.svelte` files in `src/lib/` or route dirs.
- No code comments explaining obvious logic; comments should explain _why_, not _what_.
- Prefer arrow functions over the `function` keyword.
- Always use braces with conditionals or loops.
