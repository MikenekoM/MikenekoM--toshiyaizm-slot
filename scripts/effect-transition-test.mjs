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

const baseState = {
  version: 2,
  coins: 300,
  bet: 3,
  totalGames: 0,
  gamesSinceBonus: 0,
  phase: "normal",
  preBonusRemaining: 0,
  pendingBonus: null,
  bonus: null,
  lastBonusSummary: null,
  ownedItems: [],
};

async function setSavedState(data) {
  await page.goto(url);
  await page.evaluate(({ key, saved }) => {
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify(saved));
  }, { key: saveKey, saved: data });
  await page.reload();
  await page.click("#modeToggle");
}

async function forceRandom(values) {
  await page.evaluate((sequence) => {
    const values = sequence.slice();
    Math.random = () => (values.length ? values.shift() : 0);
  }, values);
}

async function playOneSpin({ name, mode, randoms }) {
  await setSavedState({ ...baseState, mode });
  await forceRandom(randoms);
  await page.keyboard.press("Space");
  await page.keyboard.press("KeyZ");
  await page.keyboard.press("KeyX");
  await page.keyboard.press("KeyC");
  const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  const topText = await page.locator("#topEffect strong").innerText();
  const effectText = await page.locator("#effectScreen").innerText();
  await page.screenshot({ path: path.join(root, "tmp", `effect-transition-${name}.png`), fullPage: false });
  return { state, topText, effectText };
}

async function startSavedBonus({ name, pendingBonus }) {
  await setSavedState({
    ...baseState,
    mode: "bonusReady",
    totalGames: 20,
    gamesSinceBonus: 20,
    pendingBonus,
  });
  await page.click("#bonusStartButton");
  const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  const effectText = await page.locator("#effectScreen").innerText();
  await page.screenshot({ path: path.join(root, "tmp", `effect-transition-${name}.png`), fullPage: false });
  return { state, effectText };
}

const scenarios = {
  blankNormal: await playOneSpin({
    name: "blank-normal",
    mode: "normal",
    randoms: [0.1, 0, 0, 0, 0, 0, 0],
  }),
  bellNormal: await playOneSpin({
    name: "bell-normal",
    mode: "normal",
    randoms: [0.78, 0, 0, 0, 0, 0, 0],
  }),
  weakCherryStayNormal: await playOneSpin({
    name: "weak-cherry-stay-normal",
    mode: "normal",
    randoms: [0.91, 0.5, 0, 0, 0, 0, 0],
  }),
  weakCherryToHigh: await playOneSpin({
    name: "weak-cherry-to-high",
    mode: "normal",
    randoms: [0.91, 0.9, 0, 0, 0, 0, 0],
  }),
  strongCherryStayNormal: await playOneSpin({
    name: "strong-cherry-stay-normal",
    mode: "normal",
    randoms: [0.986, 0.1, 0, 0, 0, 0, 0],
  }),
  strongCherryToPreBonus: await playOneSpin({
    name: "strong-cherry-to-prebonus",
    mode: "normal",
    randoms: [0.986, 0.9, 0, 0, 0, 0, 0],
  }),
  preBonusToReady: await setSavedState({
    ...baseState,
    mode: "preBonus",
    preBonusRemaining: 1,
  }).then(async () => {
    await forceRandom([0.1, 0, 0, 0, 0, 0, 0]);
    await page.keyboard.press("Space");
    await page.keyboard.press("KeyZ");
    await page.keyboard.press("KeyX");
    await page.keyboard.press("KeyC");
    const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    const effectText = await page.locator("#effectScreen").innerText();
    await page.screenshot({ path: path.join(root, "tmp", "effect-transition-prebonus-ready.png"), fullPage: false });
    return { state, effectText };
  }),
  normalBonusStart: await startSavedBonus({
    name: "normal-bonus-start",
    pendingBonus: {
      id: "normal",
      name: "バトルボーナス",
      effect: "rush",
      rate: 0.79,
      rateLabel: "79%",
      set: 0,
      totalPayout: 0,
    },
  }),
  upperBonusStart: await startSavedBonus({
    name: "upper-bonus-start",
    pendingBonus: {
      id: "upper",
      name: "上位バトルボーナス",
      effect: "premium",
      rate: 0.88,
      rateLabel: "88%",
      set: 0,
      totalPayout: 0,
    },
  }),
};

await browser.close();

const expected = {
  blankNormal: { role: "blank", tier: "lose", mode: "normal", top: "通常" },
  bellNormal: { role: "bell", tier: "normal", mode: "normal", top: "通常" },
  weakCherryStayNormal: { role: "weakCherry", tier: "normal", mode: "normal", top: "通常" },
  weakCherryToHigh: { role: "weakCherry", tier: "hot", mode: "high", top: "高確" },
  strongCherryStayNormal: { role: "strongCherry", tier: "hot", mode: "normal", top: "激アツ" },
  strongCherryToPreBonus: { role: "strongCherry", tier: "hot", mode: "preBonus", top: "前兆" },
  preBonusToReady: { role: "blank", tier: "premium", mode: "bonusReady" },
  normalBonusStart: { phase: "battleBonus", tier: "hot", bonusId: "normal" },
  upperBonusStart: { phase: "battleBonus", tier: "premium", bonusId: "upper" },
};

const failed = [];
for (const [name, rule] of Object.entries(expected)) {
  const actual = scenarios[name].state;
  if (rule.role && actual.pendingRole !== rule.role) failed.push(`${name}: role ${actual.pendingRole} !== ${rule.role}`);
  if (rule.tier && actual.effectTier !== rule.tier) failed.push(`${name}: tier ${actual.effectTier} !== ${rule.tier}`);
  if (rule.mode && actual.internalMode !== rule.mode) failed.push(`${name}: mode ${actual.internalMode} !== ${rule.mode}`);
  if (rule.phase && actual.phase !== rule.phase) failed.push(`${name}: phase ${actual.phase} !== ${rule.phase}`);
  if (rule.bonusId && actual.bonus?.id !== rule.bonusId) failed.push(`${name}: bonus ${actual.bonus?.id} !== ${rule.bonusId}`);
  if (rule.top && scenarios[name].topText !== rule.top) failed.push(`${name}: top ${scenarios[name].topText} !== ${rule.top}`);
}

console.log(JSON.stringify({ errors, failed, scenarios }, null, 2));
if (errors.length || failed.length) {
  process.exitCode = 1;
}
