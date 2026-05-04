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

async function loadSavedState(name, data) {
  await page.goto(url);
  await page.evaluate(({ key, saved }) => {
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify(saved));
  }, { key: saveKey, saved: data });
  await page.reload();
  await page.click("#modeToggle");
  const state = await page.evaluate(() => window.render_game_to_text());
  const effectText = await page.locator("#effectScreen").innerText();
  await page.screenshot({ path: path.join(root, "tmp", `effect-state-${name}.png`), fullPage: false });
  return { state, effectText };
}

const baseState = {
  version: 2,
  coins: 300,
  bet: 3,
  totalGames: 30,
  gamesSinceBonus: 10,
  preBonusRemaining: 0,
  lastBonusSummary: null,
  ownedItems: [],
};

const bonusReady = await loadSavedState("bonus-ready", {
  ...baseState,
  mode: "bonusReady",
  phase: "normal",
  pendingBonus: {
    id: "upper",
    name: "上位バトルボーナス",
    effect: "premium",
    rate: 0.88,
    rateLabel: "88%",
    set: 0,
    totalPayout: 0,
  },
  bonus: null,
});

const battleBonus = await loadSavedState("battle-bonus", {
  ...baseState,
  mode: "bonusReady",
  phase: "battleBonus",
  pendingBonus: null,
  bonus: {
    id: "normal",
    name: "バトルボーナス",
    effect: "rush",
    rate: 0.79,
    rateLabel: "79%",
    set: 2,
    totalPayout: 286,
  },
});

await browser.close();

const failed = [];
if (!bonusReady.effectText.includes("ボーナス確定") || !bonusReady.effectText.includes("88%")) {
  failed.push("bonusReady effect text did not show confirmed bonus details");
}
if (!battleBonus.effectText.includes("再開") || !battleBonus.effectText.includes("2SET")) {
  failed.push("battleBonus effect text did not show resume details");
}

console.log(JSON.stringify({ errors, failed, bonusReady, battleBonus }, null, 2));
if (errors.length || failed.length) {
  process.exitCode = 1;
}
