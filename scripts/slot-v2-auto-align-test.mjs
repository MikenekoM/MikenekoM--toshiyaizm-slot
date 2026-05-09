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
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });
const errors = [];
const failedRequests = [];
const failed = [];

page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("requestfailed", (request) => {
  failedRequests.push(`${request.url()} ${request.failure()?.errorText || ""}`.trim());
});

async function resetPage() {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__toshiyaSlotV2Test?.setState));
}

async function state() {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()));
}

function sameStops(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => Number(value) === Number(expected[index]));
}

async function forceRoleSpin(roleId) {
  await page.evaluate((id) => {
    window.__toshiyaSlotV2Test.setState({ coins: 1000, internalState: "normal", normalStage: "street" });
    window.__toshiyaSlotV2Test.setSeed(100);
    window.__toshiyaSlotV2Test.forceRole(id);
  }, roleId);
  await page.keyboard.press("Space");
  await page.waitForTimeout(80);
  const during = await state();
  await page.keyboard.press("KeyZ");
  await page.keyboard.press("KeyX");
  await page.keyboard.press("KeyC");
  await page.waitForTimeout(120);
  return { during, after: await state() };
}

function assertRoleAutoAligned(roleId, during, after) {
  const patterns = globalPatterns[roleId];
  const stops = after.reels.map((reel) => reel.stoppedIndex);
  if (!during.autoStopPattern) failed.push(`${roleId} did not set autoStopPattern during normal spin`);
  if (!patterns.some((pattern) => sameStops(stops, pattern))) {
    failed.push(`${roleId} did not stop on a valid role pattern: ${JSON.stringify(stops)}`);
  }
}

await resetPage();
const lineInfo = await page.evaluate(() => [...document.querySelectorAll(".v2-payline")].map((line) => ({
  className: line.className,
  top: getComputedStyle(line).top,
  transform: getComputedStyle(line).transform,
})));
if (lineInfo.length !== 5) failed.push(`expected 5 V2 payline elements, got ${lineInfo.length}`);
if (!lineInfo.some((line) => line.className.includes("diagonal-a")) || !lineInfo.some((line) => line.className.includes("diagonal-b"))) {
  failed.push(`V2 paylines do not include both diagonal lines: ${JSON.stringify(lineInfo)}`);
}

const globalPatterns = await page.evaluate(() => ({
  bell: window.ToshiyaSlotV2Reels.getStopPatterns("bell"),
  replay: window.ToshiyaSlotV2Reels.getStopPatterns("replay"),
}));

let result = await forceRoleSpin("bell");
assertRoleAutoAligned("bell", result.during, result.after);
if (result.after.lastPayout !== 8) failed.push(`normal bell did not auto-pay 8: ${result.after.lastPayout}`);

result = await forceRoleSpin("replay");
assertRoleAutoAligned("replay", result.during, result.after);
if (!result.after.replayCredit) failed.push("normal replay did not auto-grant replay credit");

await page.evaluate(() => {
  window.__toshiyaSlotV2Test.setState({ coins: 1000, internalState: "normal", normalStage: "street" });
  window.__toshiyaSlotV2Test.forceRole("strongCherry");
  window.__toshiyaSlotV2Test.forceStops([6, 3, 6]);
});
await page.keyboard.press("Space");
await page.waitForTimeout(80);
const strongDuring = await state();
await page.keyboard.press("KeyZ");
await page.keyboard.press("KeyX");
await page.keyboard.press("KeyC");
await page.waitForTimeout(120);
const strongAfter = await state();
if (strongDuring.autoStopPattern) failed.push("strong cherry incorrectly set autoStopPattern");
if (strongAfter.lastPayout !== 0) failed.push(`strong cherry miss paid out: ${strongAfter.lastPayout}`);
if (!sameStops(strongAfter.reels.map((reel) => reel.stoppedIndex), [6, 3, 6])) {
  failed.push(`strong cherry forced miss stops changed: ${JSON.stringify(strongAfter.reels)}`);
}

await page.screenshot({ path: path.join(root, "tmp", "slot-v2-auto-align-test.png"), fullPage: false });
await browser.close();

console.log(JSON.stringify({ errors, failedRequests, failed }, null, 2));
if (errors.length || failedRequests.length || failed.length) process.exitCode = 1;
