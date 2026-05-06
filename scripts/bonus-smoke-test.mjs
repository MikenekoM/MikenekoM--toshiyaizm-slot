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
const beforeBonus = await page.evaluate(() => window.render_game_to_text());
await page.click("#bonusStartButton");
const afterStart = await page.evaluate(() => window.render_game_to_text());
await page.keyboard.press("Space");
const duringBattle = await page.evaluate(() => window.render_game_to_text());
await page.screenshot({ path: path.join(root, "tmp", "bonus-battle-during.png"), fullPage: false });
await page.waitForTimeout(1300);
const afterSet = await page.evaluate(() => window.render_game_to_text());
await page.screenshot({ path: path.join(root, "tmp", "bonus-smoke-test.png"), fullPage: false });
await browser.close();

console.log(JSON.stringify({ errors, beforeBonus, afterStart, duringBattle, afterSet }, null, 2));
