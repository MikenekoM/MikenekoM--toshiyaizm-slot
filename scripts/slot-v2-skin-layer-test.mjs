import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/piros/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const { PNG } = require("C:/Users/piros/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pngjs");

const root = path.resolve("E:/Codex_CLI/toshiyaizm-slot");
const baseUrl = `file:///${root.replaceAll("\\", "/")}/v2.html`;

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });
const errors = [];
const failedRequests = [];
const failed = [];

function isExpectedBgmAbort(request) {
  return request.url().includes("/assets/voices/v2/bgm/") && (request.failure()?.errorText || "").includes("ERR_ABORTED");
}

page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("requestfailed", (request) => {
  if (isExpectedBgmAbort(request)) return;
  failedRequests.push(`${request.url()} ${request.failure()?.errorText || ""}`.trim());
});

async function gotoV2(query = "") {
  const url = query ? `${baseUrl}?${query}` : baseUrl;
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__toshiyaSlotV2Test?.getSkin));
}

async function gameState() {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()));
}

async function layoutFor(selector) {
  return page.$eval(selector, (element) => {
    const style = getComputedStyle(element);
    return {
      left: Number.parseFloat(style.left),
      top: Number.parseFloat(style.top),
      width: Number.parseFloat(style.width),
      height: Number.parseFloat(style.height),
      zIndex: style.zIndex,
      hidden: element.hidden,
      src: element.getAttribute("src") || "",
    };
  });
}

async function rectFor(selector) {
  return page.$eval(selector, (element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    };
  });
}

function assertBox(label, actual, expected) {
  for (const key of ["left", "top", "width", "height"]) {
    if (Math.abs(actual[key] - expected[key]) > 0.01) {
      failed.push(`${label} ${key} expected ${expected[key]}, got ${actual[key]}`);
    }
  }
}

function alphaAt(filePath, x, y) {
  const image = PNG.sync.read(fs.readFileSync(filePath));
  const index = (image.width * y + x) * 4;
  return {
    width: image.width,
    height: image.height,
    alpha: image.data[index + 3],
  };
}

function validateCabinetAsset(label, filePath) {
  const outside = alphaAt(filePath, 10, 100);
  const screen = alphaAt(filePath, 768, 400);
  const reel = alphaAt(filePath, 768, 700);
  const button = alphaAt(filePath, 768, 920);
  if (outside.width !== 1536 || outside.height !== 1024) failed.push(`${label} cabinet size wrong: ${outside.width}x${outside.height}`);
  if (outside.alpha !== 0) failed.push(`${label} cabinet outside should be transparent, got alpha ${outside.alpha}`);
  if (screen.alpha > 8) failed.push(`${label} cabinet LCD window should be transparent, got alpha ${screen.alpha}`);
  if (reel.alpha > 8) failed.push(`${label} cabinet reel window should be transparent, got alpha ${reel.alpha}`);
  if (button.alpha < 200) failed.push(`${label} cabinet button deck should remain opaque, got alpha ${button.alpha}`);
}

function validateBackgroundAsset(label, filePath) {
  const center = alphaAt(filePath, 768, 512);
  if (center.width !== 1536 || center.height !== 1024) failed.push(`${label} background size wrong: ${center.width}x${center.height}`);
}

await gotoV2();
let state = await gameState();
if (state.skin.id !== "default") failed.push(`default skin did not load: ${JSON.stringify(state.skin)}`);
if (state.appearance.cabinet.id !== "default" || state.appearance.background.id !== "default") {
  failed.push(`default appearance did not load: ${JSON.stringify(state.appearance)}`);
}
let cabinet = await layoutFor("[data-v2-skin-cabinet]");
let background = await layoutFor("[data-v2-skin-background]");
if (!cabinet.src.includes("assets/mock/room-style-shell-v1-alpha.png")) failed.push(`default cabinet src mismatch: ${cabinet.src}`);
if (!background.hidden || background.src) failed.push(`default background should be hidden: ${JSON.stringify(background)}`);

const stageRect = await rectFor(".v2-stage");
const sideRect = await rectFor(".v2-side");
const debugRect = await rectFor(".v2-panel--debug");
if (sideRect.bottom > stageRect.bottom + 0.01) {
  failed.push(`side panel overflows stage bottom: side=${JSON.stringify(sideRect)}, stage=${JSON.stringify(stageRect)}`);
}
if (debugRect.bottom > stageRect.bottom + 0.01) {
  failed.push(`debug panel frame overflows stage bottom: debug=${JSON.stringify(debugRect)}, stage=${JSON.stringify(stageRect)}`);
}
if (debugRect.scrollHeight <= debugRect.clientHeight) {
  failed.push(`debug panel should own its overflow with internal scroll: ${JSON.stringify(debugRect)}`);
}
const appearanceSwitchRect = await rectFor(".v2-appearance-switch");
const appearanceSwitchInDebug = await page.$eval(".v2-appearance-switch", (element) => Boolean(element.closest(".v2-panel--debug")));
const layerButtonsInDebug = await page.$$eval("[data-v2-background-choice], [data-v2-cabinet-choice]", (buttons) => (
  buttons.some((button) => Boolean(button.closest(".v2-panel--debug")))
));
if (appearanceSwitchInDebug || layerButtonsInDebug) failed.push("appearance switch should be outside the debug panel");
if (appearanceSwitchRect.left < stageRect.left - 0.01 || appearanceSwitchRect.bottom > stageRect.bottom + 0.01) {
  failed.push(`appearance switch is outside the stage: switch=${JSON.stringify(appearanceSwitchRect)}, stage=${JSON.stringify(stageRect)}`);
}
if (appearanceSwitchRect.left - stageRect.left > 80 || stageRect.bottom - appearanceSwitchRect.bottom > 60) {
  failed.push(`appearance switch should stay in the lower-left player area: switch=${JSON.stringify(appearanceSwitchRect)}, stage=${JSON.stringify(stageRect)}`);
}

await gotoV2("skin=space-v1");
state = await gameState();
if (state.skin.id !== "space-v1") failed.push(`space-v1 did not load from query: ${JSON.stringify(state.skin)}`);
if (state.appearance.cabinet.id !== "space-v1" || state.appearance.background.id !== "space-v1") {
  failed.push(`legacy skin query did not set both layers: ${JSON.stringify(state.appearance)}`);
}

const expectedBoxes = {
  scene: { left: 450, top: 224, width: 635, height: 347 },
  reels: { left: 500, top: 611, width: 519, height: 205 },
  glass: { left: 500, top: 608, width: 519, height: 209 },
  spin: { left: 474, top: 899, width: 88, height: 50 },
  stop0: { left: 634, top: 888, width: 76, height: 76 },
  stop1: { left: 728, top: 888, width: 76, height: 76 },
  stop2: { left: 822, top: 888, width: 76, height: 76 },
};
assertBox("scene", await layoutFor(".v2-scene"), expectedBoxes.scene);
assertBox("reels", await layoutFor(".v2-reels"), expectedBoxes.reels);
assertBox("glass", await layoutFor(".v2-reel-glass"), expectedBoxes.glass);
assertBox("spin", await layoutFor("#v2SpinButton"), expectedBoxes.spin);
assertBox("stop0", await layoutFor('[data-v2-stop="0"]'), expectedBoxes.stop0);
assertBox("stop1", await layoutFor('[data-v2-stop="1"]'), expectedBoxes.stop1);
assertBox("stop2", await layoutFor('[data-v2-stop="2"]'), expectedBoxes.stop2);

cabinet = await layoutFor("[data-v2-skin-cabinet]");
background = await layoutFor("[data-v2-skin-background]");
if (!cabinet.src.includes("assets/skins/v2/space-v1/cabinet-alpha.png")) failed.push(`space cabinet src mismatch: ${cabinet.src}`);
if (background.hidden || !background.src.includes("assets/skins/v2/space-v1/background-space.png")) {
  failed.push(`space background src/hidden mismatch: ${JSON.stringify(background)}`);
}
if (background.zIndex !== "0" || cabinet.zIndex !== "2") {
  failed.push(`skin layer z-index mismatch: background=${background.zIndex}, cabinet=${cabinet.zIndex}`);
}
if ((await layoutFor(".v2-scene")).zIndex !== "1" || (await layoutFor(".v2-reels")).zIndex !== "1") {
  failed.push("operational scene/reel layer z-index should stay at 1");
}
if ((await layoutFor(".v2-reel-glass")).zIndex !== "3" || (await layoutFor(".v2-payline-overlay")).zIndex !== "4") {
  failed.push("glass/payline overlay z-index changed");
}
if ((await layoutFor(".v2-controls")).zIndex !== "5") failed.push("controls z-index changed");

validateCabinetAsset("space-v1", path.join(root, "assets", "skins", "v2", "space-v1", "cabinet-alpha.png"));
validateBackgroundAsset("space-v1", path.join(root, "assets", "skins", "v2", "space-v1", "background-space.png"));
validateCabinetAsset("toshiya-motif-v1", path.join(root, "assets", "skins", "v2", "toshiya-motif-v1", "cabinet-alpha.png"));
validateBackgroundAsset("toshiya-room-v1", path.join(root, "assets", "skins", "v2", "toshiya-room-v1", "background-room.png"));

await page.click('[data-v2-background-choice="default"]');
state = await gameState();
if (state.skin.id !== "custom" || state.appearance.cabinet.id !== "space-v1" || state.appearance.background.id !== "default") {
  failed.push(`background button did not switch independently: ${JSON.stringify(state)}`);
}
let params = new URL(page.url()).searchParams;
if (params.has("skin") || params.get("cabinet") !== "space-v1" || params.has("background")) {
  failed.push(`independent background switch URL mismatch: ${page.url()}`);
}
await page.click('[data-v2-cabinet-choice="default"]');
state = await gameState();
if (state.skin.id !== "default" || state.appearance.cabinet.id !== "default" || state.appearance.background.id !== "default") {
  failed.push(`cabinet button did not switch independently: ${JSON.stringify(state)}`);
}
params = new URL(page.url()).searchParams;
if (params.has("skin") || params.has("cabinet") || params.has("background")) {
  failed.push(`default appearance should remove query params: ${page.url()}`);
}
await page.click('[data-v2-background-choice="space-v1"]');
state = await gameState();
if (state.skin.id !== "custom" || state.appearance.cabinet.id !== "default" || state.appearance.background.id !== "space-v1") {
  failed.push(`background space button did not switch independently: ${JSON.stringify(state)}`);
}
params = new URL(page.url()).searchParams;
if (params.has("skin") || params.has("cabinet") || params.get("background") !== "space-v1") {
  failed.push(`background-only URL mismatch: ${page.url()}`);
}
await page.click('[data-v2-cabinet-choice="space-v1"]');
state = await gameState();
if (state.skin.id !== "space-v1" || state.appearance.cabinet.id !== "space-v1" || state.appearance.background.id !== "space-v1") {
  failed.push(`cabinet space button did not switch independently: ${JSON.stringify(state)}`);
}
params = new URL(page.url()).searchParams;
if (params.has("skin") || params.get("cabinet") !== "space-v1" || params.get("background") !== "space-v1") {
  failed.push(`space appearance URL mismatch: ${page.url()}`);
}

await page.click('[data-v2-background-choice="toshiya-room-v1"]');
state = await gameState();
if (state.skin.id !== "custom" || state.appearance.cabinet.id !== "space-v1" || state.appearance.background.id !== "toshiya-room-v1") {
  failed.push(`toshiya room background button did not switch independently: ${JSON.stringify(state)}`);
}
params = new URL(page.url()).searchParams;
if (params.has("skin") || params.get("cabinet") !== "space-v1" || params.get("background") !== "toshiya-room-v1") {
  failed.push(`toshiya room background URL mismatch: ${page.url()}`);
}
await page.click('[data-v2-cabinet-choice="toshiya-motif-v1"]');
state = await gameState();
if (state.skin.id !== "custom" || state.appearance.cabinet.id !== "toshiya-motif-v1" || state.appearance.background.id !== "toshiya-room-v1") {
  failed.push(`toshiya motif cabinet button did not switch independently: ${JSON.stringify(state)}`);
}
params = new URL(page.url()).searchParams;
if (params.has("skin") || params.get("cabinet") !== "toshiya-motif-v1" || params.get("background") !== "toshiya-room-v1") {
  failed.push(`toshiya appearance URL mismatch: ${page.url()}`);
}

const activeCabinet = await page.getAttribute('[data-v2-cabinet-choice="toshiya-motif-v1"]', "aria-pressed");
const activeBackground = await page.getAttribute('[data-v2-background-choice="toshiya-room-v1"]', "aria-pressed");
if (activeCabinet !== "true" || activeBackground !== "true") {
  failed.push(`active layer buttons were not marked pressed: cabinet=${activeCabinet}, background=${activeBackground}`);
}

await page.screenshot({ path: path.join(root, "tmp", "slot-v2-skin-layer-test.png"), fullPage: false });
await browser.close();

console.log(JSON.stringify({ errors, failedRequests, failed, skin: state.skin }, null, 2));
if (errors.length || failedRequests.length || failed.length) process.exitCode = 1;
