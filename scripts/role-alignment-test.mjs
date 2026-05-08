import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/piros/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve("E:/Codex_CLI/toshiyaizm-slot");
const url = `file:///${root.replaceAll("\\", "/")}/index.html`;
const saveKey = "toshiyaizm-game-state-v2";

const roleRolls = {
  replay: 0.55,
  bell: 0.78,
  weakCherry: 0.91,
  watermelon: 0.965,
  strongCherry: 0.986,
  chance: 0.996,
};

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

const states = {};
for (const [role, roll] of Object.entries(roleRolls)) {
  await page.goto(url);
  await page.evaluate(({ key }) => {
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify({
      version: 3,
      coins: 300,
      bet: 3,
      totalGames: 0,
      gamesSinceBonus: 0,
      mode: "normal",
      phase: "normal",
      preBonusRemaining: 0,
      pendingBonus: null,
      bonus: null,
      lastBonusSummary: null,
      ownedItems: [],
    }));
  }, { key: saveKey });
  await page.reload();
  await page.click("#modeToggle");
  await page.evaluate((value) => {
    window.__toshiyaSlotTest.setRandomSequence([value, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "role-align");
  }, roll);
  await page.keyboard.press("Space");
  await page.keyboard.press("KeyZ");
  await page.keyboard.press("KeyX");
  await page.keyboard.press("KeyC");
  states[role] = await page.evaluate(() => window.render_game_to_text());
  await page.screenshot({ path: path.join(root, "tmp", `role-${role}.png`), fullPage: false });
}

await browser.close();

const failed = [];
for (const [role, stateText] of Object.entries(states)) {
  const state = JSON.parse(stateText);
  if (state.pendingRole !== role) failed.push(`${role}: ${state.pendingRole}`);
}

console.log(JSON.stringify({ errors, failed, states }, null, 2));
if (errors.length || failed.length) process.exitCode = 1;
