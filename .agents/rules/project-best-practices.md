# Project best practices

Apply these defaults when creating or changing any of the user's projects, unless the user says otherwise in that request or the existing repo already uses something else.

## Tooling

1. **vite-plus first.** Drive install, dev, build, test, and lint through vite-plus (`vp`) instead of calling pnpm directly. Call pnpm directly only for something vite-plus does not cover.
2. **pnpm is the only package manager.** Never use npm or yarn: no `npm install`, `npx`, or `yarn`, and no `package-lock.json` or `yarn.lock`. Use `pnpm dlx` instead of `npx`.

## Language and runtime

3. **TypeScript over JavaScript.** Write new source, config, and scripts in TS (`.ts`, `.mts`, `.tsx`, `lang="ts"` in Vue) unless a tool requires JS.
4. **Node is the JS runtime.** Use Node rather than Bun. Bun is acceptable only for simple standalone scripts.
5. **Simple scripts are Python run by uv.** For a small one-off or utility script, write Python and run it with `uv run` (inline script metadata or `pyproject.toml` for dependencies) rather than a JS script.

## Architecture

6. **Monorepo by default.** Start new projects as a pnpm workspace monorepo (e.g. `apps/*` and `packages/*`), sharing logic through internal packages instead of duplicating it.
7. **Use existing official modules.** Before writing custom infrastructure, check for an official or well-maintained ecosystem module (e.g. official Nuxt modules, framework integrations) and adopt it. Write bespoke code only when no suitable module exists or it clearly does not fit, and say why.
8. **No compatibility code before launch.** Until the product is officially deployed, do not add backward-compatibility shims, legacy fallbacks, deprecation aliases, data migrations for old formats, or feature flags kept only for old behavior. Change things directly.

## Debugging

9. **Use the default Chrome for browser debugging.** Launch or attach to the standard stable Google Chrome, not Chrome Dev, Canary, Beta, Chromium, or a bundled test browser, unless the user asks for another one or a tool strictly requires it.

## UI

10. **Dark mode first for web apps.** Design and build the dark theme first and treat it as the default; add the light theme afterward (with a theme toggle and respect for `prefers-color-scheme`).

## Documentation

11. **Every development project has architecture docs, to make ongoing development easier.** Keep an up-to-date architecture document in the repo (e.g. `docs/architecture.md`) covering the system overview, modules/packages and their responsibilities, data flow, key tech choices, and how to run, build, and deploy, so later work (by the user or any agent) can pick up quickly. Create it when starting the project and update it whenever the architecture changes.
12. Bots and agents may only read or write files under `~/Downloads` and `~/projects` by default. Ask the user before touching any other path (reading the agent’s own local config is excepted).
13. When the user mentions a project, look for it under `~/projects` (layout `~/projects/<category>/<name>.worktrees/`) by default. Do not search elsewhere on the disk; if it is not there, ask the user.

## Review and merge

14. **Separate review message; merge only after 🎉 on that message.** For every development task that needs the user's review, after development is complete send a separate review/completion message for that task alone. The message must include a basic introduction of the task, the PR link if one exists, and local or online preview links if they exist. When the user adds a 🎉 emoji to that specific message, treat it as approval to merge into the main branch, then finish the necessary follow-up work, including deleting the development branch and closing the PR as appropriate. Tie the reaction only to that exact task; confirm the work is ready to merge; preserve unrelated changes; and do not bypass branch protections or other safeguards.
