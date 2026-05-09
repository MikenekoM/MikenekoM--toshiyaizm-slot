import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/piros/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve("E:/Codex_CLI/toshiyaizm-slot");
const dist = path.join(root, "dist");
const url = `file:///${dist.replaceAll("\\", "/")}/index.html`;
const v2Url = `file:///${dist.replaceAll("\\", "/")}/v2.html`;

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });
const errors = [];
const failedRequests = [];

page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("requestfailed", (request) => {
  failedRequests.push(`${request.url()} ${request.failure()?.errorText || ""}`.trim());
});

await page.goto(url);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.click("#modeToggle");
await page.keyboard.press("Space");
await page.keyboard.press("Space");
await page.keyboard.press("Space");
await page.keyboard.press("Space");
const afterSpin = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
await page.click("#modeToggle");
const afterToggle = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
await page.goto(v2Url);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.evaluate(() => {
  window.__toshiyaSlotV2Test.setRandomSequence([0.99, 0.99, 0.99, 0.99]);
  window.__toshiyaSlotV2Test.forceRole("blank");
});
await page.keyboard.press("Space");
await page.keyboard.press("KeyZ");
await page.keyboard.press("KeyX");
await page.keyboard.press("KeyC");
const afterV2Spin = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
await page.screenshot({ path: path.join(root, "tmp", "dist-smoke-test.png"), fullPage: false });
await browser.close();

const result = { errors, failedRequests, afterSpin, afterToggle, afterV2Spin };
console.log(JSON.stringify(result, null, 2));

if (errors.length > 0 || failedRequests.length > 0 || !afterSpin || afterToggle.mode !== "full" || afterV2Spin.route !== "v2") {
  process.exitCode = 1;
}
