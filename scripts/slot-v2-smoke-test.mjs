import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/piros/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve("E:/Codex_CLI/toshiyaizm-slot");
const url = `file:///${root.replaceAll("\\", "/")}/v2.html`;

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1366, height: 940 }, deviceScaleFactor: 1 });
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
await page.evaluate(() => {
  window.__toshiyaSlotV2Test.setRandomSequence([0.99, 0.99, 0.99, 0.99]);
  window.__toshiyaSlotV2Test.forceRole("blank");
});
await page.keyboard.press("Space");
await page.keyboard.press("KeyZ");
await page.keyboard.press("KeyX");
await page.keyboard.press("KeyC");
const afterNormal = JSON.parse(await page.evaluate(() => window.render_game_to_text()));

await page.evaluate(() => {
  window.__toshiyaSlotV2Test.setState({
    coins: 1000,
    internalState: "high",
    normalStage: "street",
  });
  window.__toshiyaSlotV2Test.setRandomSequence([0.99, 0.99, 0.99, 0.99, 0.99]);
  window.__toshiyaSlotV2Test.forceRole("strongCherry");
  window.__toshiyaSlotV2Test.forceStopSuccess("strongCherry");
});
await page.keyboard.press("Space");
await page.keyboard.press("KeyZ");
await page.keyboard.press("KeyX");
await page.keyboard.press("KeyC");
const afterPreludeEntry = JSON.parse(await page.evaluate(() => window.render_game_to_text()));

await page.evaluate(() => {
  const pending = {
    entrySymbol: "normal7",
    entryName: "通常7揃い",
    rateLabel: "79%",
    rate: 0.79,
    stockSets: 1,
    premium: false,
  };
  window.__toshiyaSlotV2Test.setState({
    coins: 1000,
    internalState: "bonusReady",
    pendingBonus: pending,
  });
  window.__toshiyaSlotV2Test.setRandomSequence([0.99, 0.99, 0.99, 0.99]);
});
await page.keyboard.press("Space");
const afterBonusStart = JSON.parse(await page.evaluate(() => window.render_game_to_text()));

await page.evaluate(() => {
  window.__toshiyaSlotV2Test.forceRole("bell");
  window.__toshiyaSlotV2Test.forceStopSuccess("bell");
});
await page.keyboard.press("Space");
await page.keyboard.press("KeyZ");
await page.keyboard.press("KeyX");
await page.keyboard.press("KeyC");
const afterBonusGame = JSON.parse(await page.evaluate(() => window.render_game_to_text()));

await page.screenshot({ path: path.join(root, "tmp", "slot-v2-smoke-test.png"), fullPage: false });
await browser.close();

const failed = [];
if (!afterNormal || afterNormal.route !== "v2" || afterNormal.totalGames !== 1) failed.push("normal spin did not complete");
if (afterPreludeEntry.internalState !== "prelude" || !afterPreludeEntry.pendingBonus) failed.push("strong cherry did not enter prelude in browser");
if (afterBonusStart.phase !== "bonus" || afterBonusStart.bonus?.gamesInSet !== 0) failed.push("bonus did not start in browser");
if (afterBonusGame.bonus?.gamesInSet !== 1 || afterBonusGame.lastPayout !== 8) failed.push("bonus game did not pay after forced bell");

console.log(JSON.stringify({ errors, failedRequests, failed, afterNormal, afterPreludeEntry, afterBonusStart, afterBonusGame }, null, 2));
if (errors.length || failedRequests.length || failed.length) process.exitCode = 1;
