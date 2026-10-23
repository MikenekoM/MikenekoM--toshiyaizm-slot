# Graphify: local code investigation

## Adopted implementation and environment

Checked 2026-10-24 (Japan). Official upstream: https://github.com/Graphify-Labs/graphify
Official PyPI distribution is **graphifyy**, command **graphify**. Tested version: 0.9.95, Python 3.12.14, Node.js 24.19.0, Linux. Upstream minimum is Python 3.10; uv or pipx provides an isolated installation. JavaScript/TypeScript, Python, Go, Rust, Java, C/C++ and many other languages have local code extractors; optional grammars vary by language. For this repository `.js` and `.mjs` are relevant. In this version HTML is classified as documentation and excluded by code-only; CSS is unsupported. Do not claim complete HTML/CSS dependency analysis.

Install into a separate tool environment (recommended):

```sh
uv tool install graphifyy==0.9.95
# alternative: pipx install graphifyy==0.9.95
npm run graph:build
```

No npm dependency or browser runtime dependency is added. If graphify is outside PATH, set GRAPHIFY_BIN to its executable; PowerShell example:

```powershell
$env:GRAPHIFY_BIN = 'C:\path\to\graphify.exe'
npm run graph:build
```

The wrapper runs `graphify extract . --code-only --no-cluster --max-workers 2`, then `graphify cluster-only . --no-label`. Both stages avoid model calls. Generated files stay in ignored graphify-out/. `.graphifyignore` excludes media, output, credentials, dependencies and local environments. The game and deployment file list are unchanged. Do not run unrestricted semantic extraction by default: documentation/media processing can call a configured model and incur cost.

## Codex integration

Repository AGENTS.md supplies persistent instructions without changing personal Codex settings or installing a third-party skill. The commands work directly in Codex shell tasks. Upstream additionally supports `graphify install --project --platform codex` / `$graphify` and an optional MCP extra, but neither is required or installed here. Upstream's parallel semantic-extraction feature needs Codex multi_agent; this local code-only workflow does not.

```sh
npm run graph:query -- "drawRole" --seed src/slot-engine.js --budget 2000
npm run graph:affected -- src_slot_engine_drawrole --depth 2
# more detail:
graphify explain src_slot_engine_drawrole --all
```

Use exact IDs: this project has three drawRole() nodes. Bare drawRole did not resolve uniquely in the tested affected command. Node IDs can change when files/symbols are renamed.

## Verified example and limits

Baseline revision: 11ae25f5cd381889d58639f3b3274a0193a41bb1. A hypothetical edit to `src/slot-engine.js` drawRole() was investigated without modifying gameplay code.

- `affected src_slot_engine_drawrole --depth 2` returned playNormalGame(), the containing engine, scripts/slot-core-simulation-test.mjs and scripts/slot-hokuto-advice-score-test.mjs. Raw source confirmed drawRole() calls pickWeighted() and playNormalGame() calls drawRole().
- Source search additionally found src/app.js: drawRole() calls slotEngine.drawRole(nextRandom), and startSpin() calls that wrapper. Graphify did not link that cross-file global-object call to the engine symbol. index.html loads rules before engine; src/slot-engine.js reads global.ToshiyaSlotRules. Those dependencies must be checked manually.
- 46 code files produced 870 nodes / 1741 raw edges on the initial build. The clustering view reported 1585 endpoint pairs. `diagnose multigraph --json` identified 156 edges sharing endpoints in the undirected projection; do not interpret visualization edge counts as all distinct relationships.
- Extraction warned that five files yielded no symbols, including both rules tables and the comment/shop data tables. File-level nodes alone do not prove their data semantics were understood. HTML, CSS, media paths and runtime events are outside the verified coverage.

Useful result: the graph narrows source/test candidates. It does not establish a complete impact list. No measured time or token saving is claimed.

## Regression checks

Before setup: test:core passed. test:smoke failed loading Playwright from a hard-coded C:/Users/piros path; it also hard-codes the E: project root and Chrome location. test:v2 passed core, meoshi and stage, then stopped in scene tests because their E:/Codex_CLI/toshiyaizm-slot root cannot find assets on Linux. These are pre-existing portability problems, not missing assets established in GitHub. Later v2 tests in that chained command did not run.

After setup: see verification section below. Recommended separate follow-up: make test roots relative to import.meta.url, declare Playwright as a development dependency with a lockfile, and make the browser executable configurable. That change is deliberately outside this Graphify patch; until then full browser regression validation remains blocked here.

## Reusable procedure for other Codex projects

1. Read the project's existing AGENTS.md and test commands; record the revision and baseline failures. Confirm its language extractor and global/dynamic wiring limits.
2. Copy scripts/graphify.mjs and add the three graph:* commands. Merge the relevant instructions into existing AGENTS.md rather than replacing it. Adapt .graphifyignore and .gitignore to the project.
3. Use the pinned version, rebuild on the current checkout, query a changed file/symbol, then confirm candidate callers and tests against source. Search unsupported files and dynamic registrations separately.
4. Run relevant tests, record misses and false links, and retain Graphify only if it helps actual investigations. Rebuild after changes or branch switches; repeat build uses upstream's incremental manifest/cache. Do not install commit hooks or watch processes by default. A deletion-related overwrite guard requires inspecting the reduced graph before explicitly choosing --force.

This is a per-repository procedure; it does not automatically configure other existing or future projects. Casino King is excluded. To remove: remove the graph:* scripts, wrapper, ignore entries, instructions and this document; delete local graphify-out/ only when no longer needed.

## Post-change verification (2026-10-24)

- test:core: passed; test:advice: passed.
- graph:build: passed initially and on repeat; repeat reported 46 unchanged / 0 changed / 0 deleted code files, demonstrating incremental reuse.
- graph:affected through the npm wrapper: passed for the exact engine node ID.
- git diff --check: passed. No src/, gameplay HTML/CSS, test code or deployment code changed.
- Full browser and chained v2 coverage remains blocked by the baseline Windows paths described above.
- npm run build: passed (102 deployed files); no Graphify index or tooling was copied to dist.
