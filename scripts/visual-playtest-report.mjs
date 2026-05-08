import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/piros/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve("E:/Codex_CLI/toshiyaizm-slot");
const url = `file:///${root.replaceAll("\\", "/")}/index.html`;
const saveKey = "toshiyaizm-game-state-v2";
const reportDir = path.join(root, "tmp", "visual-playtest-report");
await fs.mkdir(reportDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

async function load(saved) {
  await page.goto(url);
  await page.evaluate(({ key, state }) => {
    localStorage.clear();
    localStorage.setItem(key, JSON.stringify(state));
  }, { key: saveKey, state: saved });
  await page.reload();
  await page.click("#modeToggle");
}

async function capture(name) {
  const state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  const screenText = await page.locator("#effectScreen").innerText();
  const topText = await page.locator("#topEffect strong").innerText();
  const image = path.join(reportDir, `${name}.png`);
  await page.screenshot({ path: image, fullPage: false });
  return { name, image, topText, screenText, state };
}

const base = {
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

const rows = [];
await load(base);
rows.push(await capture("01-normal-idle"));

await page.evaluate(() => window.__toshiyaSlotTest.setRandomSequence([0.986, 0.9, 0, 0, 0, 0], "visual-pre"));
await page.keyboard.press("Space");
await page.keyboard.press("KeyZ");
await page.keyboard.press("KeyX");
await page.keyboard.press("KeyC");
rows.push(await capture("02-strong-cherry-prebonus"));

await load({ ...base, mode: "preBonus", preBonusRemaining: 1 });
await page.evaluate(() => window.__toshiyaSlotTest.setRandomSequence([0.1, 0, 0, 0, 0, 0], "visual-ready"));
await page.keyboard.press("Space");
await page.keyboard.press("KeyZ");
await page.keyboard.press("KeyX");
await page.keyboard.press("KeyC");
rows.push(await capture("03-bonus-ready"));

await load({
  ...base,
  mode: "bonusReady",
  phase: "battleBonus",
  bonus: {
    id: "upper",
    name: "上位バトルボーナス",
    effect: "premium",
    rate: 0.88,
    rateLabel: "88%",
    set: 19,
    totalPayout: 2600,
    milestoneReached: false,
  },
});
await page.evaluate(() => window.__toshiyaSlotTest.setRandomSequence([0.5, 0.1, 0, 0, 0, 0], "visual-battle"));
await page.keyboard.press("Space");
rows.push(await capture("04-battle-faceoff"));
await page.evaluate(() => window.advanceTime(1100));
rows.push(await capture("05-battle-hold"));
await page.evaluate(() => window.advanceTime(600));
rows.push(await capture("06-milestone"));

await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  errors,
  rows,
};
await fs.writeFile(path.join(reportDir, "report.json"), JSON.stringify(report, null, 2), "utf8");
await fs.writeFile(
  path.join(reportDir, "index.html"),
  [
    "<!doctype html><meta charset=\"utf-8\"><title>visual playtest report</title>",
    "<style>body{font-family:sans-serif;background:#111;color:#eee}article{margin:24px 0}img{max-width:960px;width:100%;display:block;border:1px solid #555}pre{white-space:pre-wrap;background:#222;padding:12px}</style>",
    "<h1>パチスロ トシヤイズム 挙動接触シート</h1>",
    ...rows.map((row) => `<article><h2>${row.name}</h2><img src="./${path.basename(row.image)}"><pre>${JSON.stringify({ topText: row.topText, screenText: row.screenText, state: row.state }, null, 2)}</pre></article>`),
  ].join("\n"),
  "utf8",
);

console.log(JSON.stringify({ errors, reportDir, rows: rows.length }, null, 2));
if (errors.length) process.exitCode = 1;
