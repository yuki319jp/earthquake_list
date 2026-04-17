# 大前提
- 日本語で対応してください
- 必要に応じてGitへのコミットを行ってください
  - 場合によってはブランチを分けても良い 
- できる限り小さく実装してください
- 無駄なものを追加しないでください
- 少しのミスですべてがぶっ壊れるリスクがあることを常に理解しておいてください

# Repository Guidelines

## Project Structure & Module Organization
This repository is a small full-stack earthquake list app.

- `backend/src/server.ts`: Hono API entry point. It fetches the latest JMA quake feed, upserts into PostgreSQL, and serves `/api/quakes`.
- `frontend/src/App.tsx`: SolidJS UI entry point for list rendering, filtering, sorting, modal details, and auto-refresh.
- `frontend/src/index.tsx`, `App.css`, `index.css`: app bootstrap and styling.
- `frontend/src/assets/`: static images and icons.
- `docker-compose.yml`: local multi-service setup for `db`, `backend`, and `frontend`.
- `.env.example`: baseline environment variables for local setup.

## Build, Test, and Development Commands
- `docker compose up --build`: start PostgreSQL, backend, and frontend together.
- Use `pnpm` in this repository. Do not switch to npm/yarn/bun.
### Standard workflow:
- `pnpm install`
- `pnpm run lint`
- `pnpm run test`
- `pnpm run build`
- `pnpm run dev` when interactive verification is needed

Before changing code, inspect package.json, README, Vite/Vitest/TypeScript config files, and CI definitions.
Do not invent alternative toolchains if pnpm is already configured.
Keep changes minimal, explain failures briefly, and verify with the appropriate `pnpm` commands before finishing.

## Coding Style & Naming Conventions
Use TypeScript throughout. Follow the existing style: 2-space indentation, single quotes, semicolons omitted, and `const`-first functional code. Use `PascalCase` for Solid components and TypeScript types, `camelCase` for variables/functions, and `SCREAMING_SNAKE_CASE` for module-level constants such as `API_BASE_URL`.

Keep backend logic in small parsing/query helpers instead of expanding `server.ts` inline. For frontend additions, prefer colocating UI logic with `App.tsx` until the file becomes large enough to justify extraction.

## Testing Guidelines
There is no automated test suite yet. Do not claim test coverage that does not exist. For now:

- run `cd backend && pnpm run build`
- run `cd frontend && pnpm run build`
- manually verify `GET /api/quakes`, search, sort, modal details, theme toggle, and 2-minute refresh behavior

When adding tests later, place them beside the feature or under `src/__tests__/` and use `*.test.ts` / `*.test.tsx`.

## Commit & Pull Request Guidelines
Git history currently starts with a single concise commit (`initial commit`). Keep commits short, imperative, and scoped, for example `Add quake filter state` or `Fix DB insert rollback handling`.

Pull requests should include a brief summary, affected areas (`backend`, `frontend`, `docker`), manual verification steps, and screenshots for UI changes. Link related issues when applicable and note any new environment variables or schema changes.
