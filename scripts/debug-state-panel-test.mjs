import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/piros/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve("E:/Codex_CLI/toshiyaizm-slot");
const url = `file:///${root.replaceAll("\\", "/")}/index.html`;
const saveKey = "toshiyaizm-game-state-v2";

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });
const errors = [];
const failed = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

const savedState = {
  version: 4,
  coins: 777,
  bet: 3,
  totalGames: 12,
  gamesSinceBonus: 5,
  mode: "normal",
  phase: "normal",
  preBonusRemaining: 0,
  pendingBonus: null,
  bonus: null,
  lastBonusSummary: null,
  ownedItems: ["star-sticker"],
};

async function state() {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()));
}

async function clickScenario(id) {
  await page.click(`[data-debug-scenario="${id}"]`);
  return state();
}

async function clickAction(action) {
  await page.click(`[data-debug-action="${action}"]`);
  return state();
}

async function finishSpin() {
  await clickAction("stop-left");
  await clickAction("stop-center");
  return clickAction("stop-right");
}

async function finishBattle() {
  await clickAction("battle-attack");
  await clickAction("battle-hold");
  return clickAction("battle-result");
}

await page.goto(url);
await page.evaluate(({ key, value }) => {
  localStorage.clear();
  localStorage.setItem(key, JSON.stringify(value));
}, { key: saveKey, value: savedState });
await page.reload();
await page.click("#modeToggle");
await page.click("#debugToggle");
await page.screenshot({ path: path.join(root, "tmp", "debug-state-panel.png"), fullPage: false });

const stateTabVisible = await page.locator("#debugScenarioControls").isVisible();
if (!stateTabVisible) failed.push("state tab is not visible");

await clickScenario("quiet-normal");
let current = await finishSpin();
if (!current.debugSandboxActive || current.pendingRole !== "blank" || current.effectTone !== "quiet") {
  failed.push("quiet normal scenario failed");
}

await clickScenario("strong-prebonus");
current = await finishSpin();
if (current.internalMode !== "preBonus" || current.pendingRole !== "strongCherry" || current.preBonusRemaining <= 0) {
  failed.push("strong cherry prebonus scenario failed");
}

await clickScenario("prebonus-ready");
current = await finishSpin();
if (current.internalMode !== "bonusReady" || !current.pendingBonus) {
  failed.push("prebonus ready scenario failed");
}

current = await clickScenario("bb-continue");
if (current.battleStage !== "faceoff" || !current.lastBattle?.attack) {
  failed.push("bb continue did not enter faceoff");
}
await page.click("#spinButton");
current = await state();
if (current.battleStage !== "attack") failed.push("bb continue did not advance to attack from spin button");
await page.keyboard.press("Space");
current = await state();
if (current.battleStage !== "hold") failed.push("bb continue did not advance to hold from space");
await page.click("#spinButton");
current = await state();
if (current.battleOutcome !== "continued" || current.phase !== "battleBonus") {
  failed.push("bb continue result failed");
}

await clickScenario("bb-lose");
current = await finishBattle();
if (current.battleOutcome !== "ended" || current.phase !== "normal") {
  failed.push("bb lose result failed");
}

await clickScenario("bb-revival");
await clickAction("battle-attack");
current = await clickAction("battle-hold");
await page.screenshot({ path: path.join(root, "tmp", "debug-battle-hold.png"), fullPage: false });
if (current.battleStage !== "hold" || current.lastBattle?.attack !== "heavy") {
  failed.push("heavy revival hold stage failed");
}
current = await clickAction("battle-result");
if (current.battleOutcome !== "continued" || current.lastBattle?.defense !== "revival") {
  failed.push("revival result failed");
}

await clickScenario("milestone");
current = await finishBattle();
await page.screenshot({ path: path.join(root, "tmp", "debug-20set.png"), fullPage: false });
if (!current.bonus?.milestoneReached || current.bonus?.set !== 20) {
  failed.push("20set milestone failed");
}

current = await clickAction("restore-save");
const savedAfterDebug = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), saveKey);
if (current.debugSandboxActive || current.coins !== savedState.coins || savedAfterDebug.coins !== savedState.coins) {
  failed.push("debug sandbox leaked into saved state");
}
if (!current.ownedItems.includes("star-sticker") || !savedAfterDebug.ownedItems.includes("star-sticker")) {
  failed.push("saved owned items were not restored");
}

await browser.close();

console.log(JSON.stringify({
  errors,
  failed,
  savedAfterDebug,
}, null, 2));
if (errors.length || failed.length) process.exitCode = 1;
