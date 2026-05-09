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
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

await page.goto(url);
await page.evaluate((key) => {
  localStorage.clear();
  localStorage.setItem(key, JSON.stringify({
    version: 2,
    coins: 300,
    bet: 3,
    totalGames: 25,
    gamesSinceBonus: 25,
    mode: "bonusReady",
    phase: "normal",
    preBonusRemaining: 0,
    bonus: null,
    ownedItems: [],
  }));
}, saveKey);
await page.reload();
await page.click("#modeToggle");
await page.evaluate(() => window.__toshiyaSlotTest.setRandomSequence([], "bonus-smoke"));
const beforeBonus = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
await page.click("#bonusStartButton");
const afterStart = JSON.parse(await page.evaluate(() => window.render_game_to_text()));

async function spinAndStop() {
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()));
}

const afterFirstBbGame = await spinAndStop();
for (let index = 1; index < 30; index += 1) {
  await spinAndStop();
}
const afterThirtyGames = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
await page.evaluate(() => window.__toshiyaSlotTest.setNextBattle({
  continued: true,
  attack: "middle",
  defense: "stand",
  payout: 0,
}));
await page.keyboard.press("Space");
const duringBattle = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
await page.screenshot({ path: path.join(root, "tmp", "bonus-battle-during.png"), fullPage: false });
await page.evaluate(() => window.advanceTime(6000));
const afterSet = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
await page.screenshot({ path: path.join(root, "tmp", "bonus-smoke-test.png"), fullPage: false });
await browser.close();

const failed = [];
if (afterStart.phase !== "battleBonus" || afterStart.bonusGame?.gamesInSet !== 0 || afterStart.bonusGame?.setGames !== 30) {
  failed.push("bonus did not start at 0/30G");
}
if (!["bell", "replay"].includes(afterFirstBbGame.pendingRole) || afterFirstBbGame.lastPayout !== 8 || afterFirstBbGame.bonusGame?.gamesInSet !== 1) {
  failed.push("first BB game did not stop on bell/replay with 8 payout");
}
if (afterThirtyGames.bonusGame?.gamesInSet !== 30 || afterThirtyGames.battleStage !== "setReady") {
  failed.push("BB set did not become battle-ready after 30 games");
}
if (duringBattle.battleStage !== "faceoff" || !duringBattle.bonusBattleAnimating) {
  failed.push("battle did not start after 30G set");
}
if (afterSet.battleOutcome !== "continued" || afterSet.bonusGame?.gamesInSet !== 0 || afterSet.bonusGame?.setNumber !== 2) {
  failed.push("continued battle did not reset next set to 0/30G");
}

console.log(JSON.stringify({ errors, failed, beforeBonus, afterStart, afterFirstBbGame, afterThirtyGames, duringBattle, afterSet }, null, 2));
if (errors.length || failed.length) process.exitCode = 1;
