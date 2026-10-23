import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const executable = process.env.GRAPHIFY_BIN || "graphify";
const mode = process.argv[2] || "build";
const commands = {
  build: [["extract", ".", "--code-only", "--no-cluster", "--max-workers", "2"],
          ["cluster-only", ".", "--no-label"]],
  query: [["query", ...process.argv.slice(3)]],
  affected: [["affected", ...process.argv.slice(3)]],
  explain: [["explain", ...process.argv.slice(3)]],
};
if (!commands[mode]) {
  console.error("Usage: node scripts/graphify.mjs build|query|affected|explain [arguments]");
  process.exit(2);
}
for (const args of commands[mode]) {
  const result = spawnSync(executable, args, { cwd: root, stdio: "inherit", shell: false });
  if (result.error) {
    console.error(`Cannot run Graphify: ${result.error.message}. Install graphifyy==0.9.95 or set GRAPHIFY_BIN.`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
