import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/piros/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve("E:/Codex_CLI/toshiyaizm-slot");
const url = `file:///${root.replaceAll("\\", "/")}/index.html`;
const outDir = path.join(root, "tmp");

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });
await page.goto(url);
await page.screenshot({ path: path.join(outDir, "full-mode.png"), fullPage: false });
await page.click("#modeToggle");
await page.screenshot({ path: path.join(outDir, "play-mode.png"), fullPage: false });
await page.click("#debugToggle");
await page.screenshot({ path: path.join(outDir, "play-debug.png"), fullPage: false });
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
await browser.close();

console.log(JSON.stringify({ url, errors }, null, 2));
