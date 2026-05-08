import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/piros/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve("E:/Codex_CLI/toshiyaizm-slot");
const url = `file:///${root.replaceAll("\\", "/")}/index.html`;
const saveKey = "toshiyaizm-game-state-v2";

const baseState = {
  version: 3,
  coins: 1000,
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

async function loadState(data = {}) {
  await page.goto(url);
  await page.evaluate(({ key, saved }) => {
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify(saved));
  }, { key: saveKey, saved: { ...baseState, ...data } });
  await page.reload();
  await page.click("#modeToggle");
}

async function spinWithSequence(name, sequence, state = {}) {
  await loadState(state);
  await page.evaluate((values) => window.__toshiyaSlotTest.setRandomSequence(values, "effect-sequence"), sequence);
  await page.keyboard.press("Space");
  await page.keyboard.press("KeyZ");
  await page.keyboard.press("KeyX");
  await page.keyboard.press("KeyC");
  const result = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  const topText = await page.locator("#topEffect strong").innerText();
  const screenText = await page.locator("#effectScreen").innerText();
  await page.screenshot({ path: path.join(root, "tmp", `effect-sequence-${name}.png`), fullPage: false });
  return { result, topText, screenText };
}

async function battleScenario(name, bonus, sequence) {
  const resumeBattle = Number(bonus.set || 0) > 0;
  await loadState(resumeBattle
    ? {
      mode: "bonusReady",
      phase: "battleBonus",
      bonus,
      totalGames: 20,
      gamesSinceBonus: 0,
    }
    : {
      mode: "bonusReady",
      pendingBonus: bonus,
      totalGames: 20,
      gamesSinceBonus: 20,
    });
  if (!resumeBattle) await page.click("#bonusStartButton");
  await page.evaluate((values) => window.__toshiyaSlotTest.setRandomSequence(values, "battle-sequence"), sequence);
  await page.keyboard.press("Space");
  const faceoff = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  await page.evaluate(() => window.advanceTime(800));
  const attack = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  await page.evaluate(() => window.advanceTime(700));
  const hold = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  await page.evaluate(() => window.advanceTime(1500));
  const resolved = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  await page.screenshot({ path: path.join(root, "tmp", `effect-sequence-${name}.png`), fullPage: false });
  return { faceoff, attack, hold, resolved };
}

const scenarios = {
  quiet: await spinWithSequence("quiet", [0.1, 0, 0, 0, 0, 0]),
  weakHigh: await spinWithSequence("weak-high", [0.91, 0.9, 0, 0, 0, 0]),
  strongPre: await spinWithSequence("strong-pre", [0.986, 0.9, 0, 0, 0, 0]),
  ready: await spinWithSequence("ready", [0.1, 0, 0, 0, 0, 0], {
    mode: "preBonus",
    preBonusRemaining: 1,
  }),
  battleContinue: await battleScenario("battle-continue", {
    id: "normal",
    name: "バトルボーナス",
    effect: "rush",
    rate: 0.79,
    rateLabel: "79%",
    set: 0,
    totalPayout: 0,
    milestoneReached: false,
  }, [0.5, 0.1, 0, 0, 0, 0, 0, 0]),
  battleLose: await battleScenario("battle-lose", {
    id: "normal",
    name: "バトルボーナス",
    effect: "rush",
    rate: 0.66,
    rateLabel: "66%",
    set: 0,
    totalPayout: 0,
    milestoneReached: false,
  }, [0.5, 0.99, 0, 0, 0, 0, 0, 0]),
  milestone: await battleScenario("milestone", {
    id: "upper",
    name: "上位バトルボーナス",
    effect: "premium",
    rate: 0.89,
    rateLabel: "89%",
    set: 19,
    totalPayout: 2600,
    milestoneReached: false,
  }, [0.5, 0.1, 0, 0, 0, 0, 0, 0]),
};

await browser.close();

const failed = [];
if (scenarios.quiet.result.effectTone !== "quiet") failed.push("quiet tone not detected");
if (scenarios.weakHigh.result.internalMode !== "high" || scenarios.weakHigh.topText !== "高確") failed.push("weak cherry high transition failed");
if (scenarios.strongPre.result.internalMode !== "preBonus" || scenarios.strongPre.topText !== "前兆") failed.push("strong cherry preBonus transition failed");
if (scenarios.ready.result.internalMode !== "bonusReady" || !scenarios.ready.result.pendingBonus) failed.push("preBonus final ready failed");
if (scenarios.battleContinue.faceoff.battleStage !== "faceoff") failed.push("battle faceoff missing");
if (scenarios.battleContinue.attack.battleStage !== "attack") failed.push("battle attack missing");
if (scenarios.battleContinue.hold.battleStage !== "hold") failed.push("battle hold missing");
if (!scenarios.battleContinue.attack.lastBattle?.attack) failed.push("battle attack pattern missing");
if (!scenarios.battleContinue.resolved.lastBattle?.defense) failed.push("battle defense pattern missing");
if (scenarios.battleContinue.resolved.battleOutcome !== "continued") failed.push("battle continue failed");
if (scenarios.battleLose.resolved.phase !== "normal" || scenarios.battleLose.resolved.battleOutcome !== "ended") failed.push("battle lose failed");
if (scenarios.milestone.resolved.battleStage !== "continue" || !scenarios.milestone.resolved.bonus?.milestoneReached) failed.push("milestone failed");

console.log(JSON.stringify({ errors, failed, scenarios }, null, 2));
if (errors.length || failed.length) process.exitCode = 1;
