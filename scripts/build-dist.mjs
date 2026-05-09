import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

const requiredFiles = [
  "index.html",
  "v2.html",
  "src/styles.css",
  "src/slot-rules.js",
  "src/slot-engine.js",
  "src/slot-effects.js",
  "src/slot-audio.js",
  "src/app.js",
  "src/v2/slot-v2.css",
  "src/v2/slot-v2-rules.js",
  "src/v2/slot-v2-engine.js",
  "src/v2/slot-v2-reels.js",
  "src/v2/slot-v2-scenes.js",
  "src/v2/slot-v2-scene-player.js",
  "src/v2/slot-v2-app.js",
  "src/aikotoba.js",
  "src/comment-data.js",
  "src/shop-data.js",
  "assets/mock/full-mode-shell-v1-alpha.png",
  "assets/mock/room-style-shell-v1-alpha.png",
  "assets/reels/reel-strip-left-v2.png",
  "assets/reels/reel-strip-center-v2.png",
  "assets/reels/reel-strip-right-v2.png",
  "assets/videos/toshiyaism-battle-trial.mp4",
  "assets/videos/toshiyaism-bg-normal-idle.mp4",
  "assets/videos/toshiyaism-bg-normal-high.mp4",
  "assets/videos/toshiyaism-bg-normal-prebonus.mp4",
  "assets/videos/toshiyaism-bg-normal-ready.mp4",
];

const requiredDirs = [
  "assets/effects/runtime",
];

function assertInsideRoot(target) {
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to touch path outside project: ${target}`);
  }
}

async function copyFile(relativePath) {
  const from = path.join(root, relativePath);
  const to = path.join(dist, relativePath);
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to);
}

async function copyDir(relativePath) {
  const from = path.join(root, relativePath);
  const to = path.join(dist, relativePath);
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.cp(from, to, { recursive: true });
}

assertInsideRoot(dist);
await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(dist, { recursive: true });

for (const file of requiredFiles) {
  await copyFile(file);
}

for (const dir of requiredDirs) {
  await copyDir(dir);
}

await fs.writeFile(
  path.join(dist, "robots.txt"),
  "User-agent: *\nDisallow: /\n",
  "utf8",
);

await fs.writeFile(
  path.join(dist, "_headers"),
  [
    "/*",
    "  X-Robots-Tag: noindex",
    "",
    "/assets/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "",
  ].join("\n"),
  "utf8",
);

const files = [];
async function collect(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collect(fullPath);
    } else {
      const stat = await fs.stat(fullPath);
      files.push({ path: path.relative(dist, fullPath).replaceAll("\\", "/"), bytes: stat.size });
    }
  }
}

await collect(dist);
const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
console.log(JSON.stringify({ output: dist, files: files.length, totalBytes }, null, 2));
