# Codex development workflow

- Scope: this repository only. Do not apply this setup to Casino King in ChatGPT Work.
- For code relationship/impact questions, first run `npm run graph:build` with Graphify 0.9.95 available, then `npm run graph:query -- "question" --seed src/path.js --budget 2000`.
- For a changed symbol, resolve its exact node ID in graphify-out/graph.json (names may repeat), then run `npm run graph:affected -- NODE_ID --depth 2`.
- Treat graph results as candidates, not a complete dependency inventory. Confirm EXTRACTED/INFERRED edges against source. Search globalThis/window registrations, HTML script loading order, data tables, assets and CSS separately; these are not fully covered by this code-only graph.
- Rebuild after edits, renames, deletions or switching branches. Do not use a stale graph. If Graphify is unavailable, report the limitation and use rg/source inspection; do not block development.
- Use only the local code-only build in scripts/graphify.mjs. No model backend, paid service, global skill install or Git hook is required.
- Keep graphify-out/ untracked and out of deployment. Run relevant existing tests; distinguish pre-existing environment failures from regressions. See docs/graphify.md for setup, verification and reuse.
