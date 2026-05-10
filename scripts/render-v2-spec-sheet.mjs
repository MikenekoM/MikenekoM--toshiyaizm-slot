import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/piros/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve("E:/Codex_CLI/toshiyaizm-slot");
const inputName = process.argv[2] || "toshiyaism-v2-spec-sheet";
const safeName = inputName.replace(/\.html$/i, "").replace(/[^a-z0-9._-]/gi, "");
const htmlPath = path.join(root, "output/imagegen/v2-spec-sheet", `${safeName}.html`);
const pngPath = path.join(root, "output/imagegen/v2-spec-sheet", `${safeName}.png`);

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});

const page = await browser.newPage({
  viewport: { width: 1600, height: 2200 },
  deviceScaleFactor: 1,
});

await page.goto(`file:///${htmlPath.replaceAll("\\", "/")}`, { waitUntil: "load" });
await page.screenshot({ path: pngPath, fullPage: true });
await browser.close();

console.log(JSON.stringify({ html: htmlPath, png: pngPath }, null, 2));
