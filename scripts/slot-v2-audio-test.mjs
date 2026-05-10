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
const page = await browser.newPage({ viewport: { width: 1366, height: 940 }, deviceScaleFactor: 1 });
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

async function state() {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()));
}

function assertReelAudio(label, actual, expected) {
  const value = JSON.stringify(actual?.audioDebug?.reelSpinning || null);
  const target = JSON.stringify(expected);
  if (value !== target) failed.push(`${label}: expected reelSpinning ${target}, got ${value}`);
}

function assertVolume(label, actual, key, expected) {
  const value = actual?.audioDebug?.volumes?.[key];
  if (Math.abs(value - expected) > 0.001) failed.push(`${label}: expected ${key} volume ${expected}, got ${value}`);
}

async function resetForSpin() {
  await page.evaluate(() => {
    localStorage.clear();
    window.__toshiyaSlotV2Test.setState({
      coins: 1000,
      internalState: "normal",
      normalStage: "street",
      phase: "normal",
      bonus: null,
      pendingBonus: null,
    });
    window.__toshiyaSlotV2Test.setRandomSequence([0.99, 0.99, 0.99, 0.99]);
    window.__toshiyaSlotV2Test.forceRole("blank");
  });
}

await page.goto(url);
await page.evaluate(() => localStorage.clear());
await page.reload();

const initial = await state();
if (!initial.audioDebug?.ready) failed.push("audio manager should report ready on page load");
if ((initial.audioDebug?.decodedCount || 0) < 11) failed.push(`expected at least 11 prepared audio assets, got ${initial.audioDebug?.decodedCount}`);
if (!initial.audioDebug?.volumes) failed.push("audio manager should expose volume settings");

await page.evaluate(() => {
  const setSlider = (key, percent) => {
    const input = document.querySelector(`[data-v2-audio-volume="${key}"]`);
    input.value = String(percent);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  setSlider("lever", 55);
  setSlider("button", 65);
  setSlider("bgm", 35);
  setSlider("bgmBonusConfirm", 70);
  setSlider("bgmSevenMode", 45);
});
const tunedAudio = await state();
assertVolume("after audio volume tuning", tunedAudio, "lever", 0.55);
assertVolume("after audio volume tuning", tunedAudio, "button", 0.65);
assertVolume("after audio volume tuning", tunedAudio, "bgm", 0.35);
assertVolume("after audio volume tuning", tunedAudio, "bgmBonusConfirm", 0.7);
assertVolume("after audio volume tuning", tunedAudio, "bgmSevenMode", 0.45);
const tunedOutputs = await page.evaluate(() => Object.fromEntries(
  [...document.querySelectorAll("[data-v2-audio-volume-value]")].map((output) => [output.dataset.v2AudioVolumeValue, output.textContent])
));
if (
  tunedOutputs.lever !== "55%"
  || tunedOutputs.button !== "65%"
  || tunedOutputs.bgm !== "35%"
  || tunedOutputs.bgmBonusConfirm !== "70%"
  || tunedOutputs.bgmSevenMode !== "45%"
) {
  failed.push(`audio volume outputs did not update: ${JSON.stringify(tunedOutputs)}`);
}
const bgmTitles = await page.evaluate(() => [...document.querySelectorAll(".v2-bgm-volume small")].map((item) => item.textContent));
if (!bgmTitles.includes("ギャンブルが大好きだ（ボーナス確定）") || !bgmTitles.includes("ギャンブルが大好きだ x（7揃モード）")) {
  failed.push(`BGM titles should be visible in the debug volume panel: ${JSON.stringify(bgmTitles)}`);
}
await page.reload();
const persistedAudio = await state();
assertVolume("after audio volume reload", persistedAudio, "lever", 0.55);
assertVolume("after audio volume reload", persistedAudio, "button", 0.65);
assertVolume("after audio volume reload", persistedAudio, "bgm", 0.35);
assertVolume("after audio volume reload", persistedAudio, "bgmBonusConfirm", 0.7);
assertVolume("after audio volume reload", persistedAudio, "bgmSevenMode", 0.45);
if (persistedAudio.audioDebug?.bgm?.tracks?.bonusConfirm?.title !== "ギャンブルが大好きだ（ボーナス確定）") {
  failed.push("audioDebug should expose the bonusConfirm BGM title");
}

await page.evaluate(() => window.__toshiyaSlotV2Test.applyDebug({ internalState: "bonusReady", coins: 1000 }));
await page.waitForTimeout(50);
const bonusReadyAudio = await state();
if (bonusReadyAudio.audioDebug?.bgm?.current !== "sevenMode") {
  failed.push(`bonusReady should loop sevenMode BGM, got ${bonusReadyAudio.audioDebug?.bgm?.current}`);
}
const sevenModeStartsBeforeSpin = bonusReadyAudio.audioDebug?.bgm?.tracks?.sevenMode?.startCount;
await page.keyboard.press("Space");
await page.waitForTimeout(80);
const sevenModeAudio = await state();
if (sevenModeAudio.audioDebug?.bgm?.current !== "sevenMode") {
  failed.push(`bonus entry spin should loop sevenMode BGM, got ${sevenModeAudio.audioDebug?.bgm?.current}`);
}
if (sevenModeAudio.audioDebug?.bgm?.tracks?.sevenMode?.startCount !== sevenModeStartsBeforeSpin) {
  failed.push(`bonus entry spin should not restart sevenMode BGM: before ${sevenModeStartsBeforeSpin}, after ${sevenModeAudio.audioDebug?.bgm?.tracks?.sevenMode?.startCount}`);
}
await page.evaluate(() => window.__toshiyaSlotV2Test.applyDebug({ internalState: "bonus", coins: 1000 }));
await page.waitForTimeout(50);
const bonusAudio = await state();
if (bonusAudio.audioDebug?.bgm?.current !== "bonusConfirm") {
  failed.push(`bonus phase should loop bonusConfirm BGM, got ${bonusAudio.audioDebug?.bgm?.current}`);
}
const bonusStartsBeforeSpin = bonusAudio.audioDebug?.bgm?.tracks?.bonusConfirm?.startCount;
await page.keyboard.press("Space");
await page.waitForTimeout(80);
const bonusSpinAudio = await state();
if (bonusSpinAudio.audioDebug?.bgm?.current !== "bonusConfirm") {
  failed.push(`bonus game spin should keep bonusConfirm BGM, got ${bonusSpinAudio.audioDebug?.bgm?.current}`);
}
if (bonusSpinAudio.audioDebug?.bgm?.tracks?.bonusConfirm?.startCount !== bonusStartsBeforeSpin) {
  failed.push(`bonus game spin should not restart bonusConfirm BGM: before ${bonusStartsBeforeSpin}, after ${bonusSpinAudio.audioDebug?.bgm?.tracks?.bonusConfirm?.startCount}`);
}
await page.evaluate(() => window.__toshiyaSlotV2Test.applyDebug({ internalState: "normal", coins: 1000 }));
await page.waitForTimeout(260);
const bgmStoppedAudio = await state();
if (bgmStoppedAudio.audioDebug?.bgm?.current !== null) {
  failed.push(`leaving bonusReady should fade back to no BGM, got ${bgmStoppedAudio.audioDebug?.bgm?.current}`);
}

await resetForSpin();
await page.keyboard.press("Space");
await page.waitForTimeout(80);
assertReelAudio("after starting spin", await state(), [true, true, true]);

await page.keyboard.press("KeyZ");
await page.waitForTimeout(30);
assertReelAudio("after left stop", await state(), [false, true, true]);

await page.keyboard.press("KeyX");
await page.waitForTimeout(30);
assertReelAudio("after middle stop", await state(), [false, false, true]);

await page.keyboard.press("KeyC");
await page.waitForTimeout(80);
assertReelAudio("after right stop", await state(), [false, false, false]);

await resetForSpin();
await page.keyboard.press("Space");
await page.waitForTimeout(80);
await page.keyboard.press("Space");
await page.waitForTimeout(30);
assertReelAudio("space stop left", await state(), [false, true, true]);
await page.keyboard.press("Space");
await page.waitForTimeout(30);
assertReelAudio("space stop middle", await state(), [false, false, true]);
await page.keyboard.press("Space");
await page.waitForTimeout(80);
assertReelAudio("space stop right", await state(), [false, false, false]);

await resetForSpin();
await page.keyboard.press("Space");
await page.waitForTimeout(80);
assertReelAudio("before debug apply", await state(), [true, true, true]);
await page.click("#v2DebugApply");
await page.waitForTimeout(50);
assertReelAudio("debug apply stops reels", await state(), [false, false, false]);

await resetForSpin();
await page.keyboard.press("Space");
await page.waitForTimeout(80);
await page.click("#v2DebugReset");
await page.waitForTimeout(50);
assertReelAudio("debug reset stops reels", await state(), [false, false, false]);

await browser.close();

console.log(JSON.stringify({ errors, failedRequests, failed, initial }, null, 2));
if (errors.length || failedRequests.length || failed.length) process.exitCode = 1;
