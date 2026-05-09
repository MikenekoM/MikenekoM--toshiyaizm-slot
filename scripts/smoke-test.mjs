import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/piros/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve("E:/Codex_CLI/toshiyaizm-slot");
const url = `file:///${root.replaceAll("\\", "/")}/index.html`;

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
await page.goto(url);
await page.click("#modeToggle");
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.click("#modeToggle");
await page.keyboard.press("ShiftLeft");
await page.keyboard.press("Space");
await page.keyboard.press("Space");
await page.keyboard.press("Space");
const afterSpin = await page.evaluate(() => window.render_game_to_text());
await page.click('[data-buy-item="star-sticker"]');
const afterBuy = await page.evaluate(() => window.render_game_to_text());
await page.click('[data-panel-tab="save"]');
await page.click("#issueAikotoba");
const phrase = await page.locator("#aikotobaOutput").inputValue();
await page.fill("#aikotobaInput", phrase);
await page.click("#restoreAikotoba");
const afterRestore = await page.evaluate(() => window.render_game_to_text());
await page.screenshot({ path: path.join(root, "tmp", "smoke-test.png"), fullPage: false });
await browser.close();

console.log(JSON.stringify({ errors, afterSpin, afterBuy, phraseLength: phrase.length, afterRestore }, null, 2));
