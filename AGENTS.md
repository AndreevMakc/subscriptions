# Repository Guidelines

## Project Structure & Module Organization
- Root `frontend/` holds the Vite + React client; run all npm commands here.
- `frontend/src/components/` contains reusable UI pieces; keep feature-specific components under `pages/<feature>`.
- `frontend/src/store/` exposes Zustand slices; colocate derived selectors with the slice file.
- `frontend/src/utils/` and `src/data/` provide domain helpers and canned response data; prefer typed exports from `src/types.ts`.
- Static assets live in `frontend/public/` or `src/assets/` for bundling; avoid importing from outside `frontend`.

## Build, Test, and Development Commands
- `npm install` (inside `frontend`) installs dependencies; always delete stale `node_modules` when switching Node versions.
- `npm run dev` starts Vite at `http://localhost:5173` with hot reloading; ideal for verifying state hydration flows.
- `npm run lint` executes the ESLint flat config; run it before every commit to catch TypeScript and hook misuse.
- `npm run build` performs a type check via `tsc -b` and produces production assets under `frontend/dist`.
- `npm run preview` serves the built bundle to sanity-check router configuration and translations.

## Coding Style & Naming Conventions
- Use TypeScript throughout; prefer interfaces for props and `type` aliases for union-heavy models defined in `src/types.ts`.
- Components, hooks, and Zustand stores are in PascalCase files; hooks must start with `use` to satisfy lint rules.
- Indent with two spaces, keep imports ordered by package → alias → relative, and organise Tailwind classes from layout to modifiers.
- Share tokens through the Tailwind theme (see `tailwind.config.js`) and centralise repeated class bundles with `@apply` in `index.css`.

## Testing Guidelines
- Automated testing is not wired yet; propose Vitest + Testing Library before adding `npm run test`.
- When adding tests, mirror the source tree (`src/pages/dashboard/Dashboard.test.tsx`) and focus on store hydration, routing, and localisation edge cases.
- Document any manual verification steps in PR descriptions until the automated suite lands.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `style:`) as seen in recent history; keep scope nouns short and lowercase.
- Reference issue IDs in the body, summarise user-visible impact, and note translations touched.
- Open PRs against `develop`, include screenshots or clip recordings for UI changes, and confirm lint/build status in the checklist.
