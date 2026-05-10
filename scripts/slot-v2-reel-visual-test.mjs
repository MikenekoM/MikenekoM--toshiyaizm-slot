import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/piros/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve("E:/Codex_CLI/toshiyaizm-slot");
const url = `file:///${root.replaceAll("\\", "/")}/v2.html`;
const tmpDir = path.join(root, "tmp");
fs.mkdirSync(tmpDir, { recursive: true });

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

async function resetPage() {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__toshiyaSlotV2Test?.getReels));
}

async function reels() {
  return JSON.parse(await page.evaluate(() => window.__toshiyaSlotV2Test.getReels()));
}

function sameLockedReel(before, after, label) {
  if (before.offset !== after.offset) failed.push(`${label}: offset changed from ${before.offset} to ${after.offset}`);
  if (before.stoppedIndex !== after.stoppedIndex) failed.push(`${label}: stoppedIndex changed from ${before.stoppedIndex} to ${after.stoppedIndex}`);
  if (!after.locked || after.spinning) failed.push(`${label}: reel is not locked after later stop`);
}

const expectedCopyOffsets = [-5600, -4480, -3360, -2240, -1120, 0, 1120, 2240, 3360, 4480, 5600];

function copiesCoverViewport(offset, viewportHeight = 205, stripHeight = 1120, copyOffsets = expectedCopyOffsets) {
  const intervals = copyOffsets
    .map((copyOffset) => [offset + copyOffset, offset + copyOffset + stripHeight])
    .sort((a, b) => a[0] - b[0]);
  let coveredUntil = 0;
  for (const [start, end] of intervals) {
    if (end <= coveredUntil) continue;
    if (start > coveredUntil + 0.001) return false;
    coveredUntil = Math.max(coveredUntil, end);
    if (coveredUntil >= viewportHeight - 0.001) return true;
  }
  return false;
}

await resetPage();
const copyInfo = await page.evaluate(() => [...document.querySelectorAll("[data-v2-reel]")].map((reel) => (
  [...reel.querySelectorAll("img")].map((image) => Number.parseInt(image.style.getPropertyValue("--copy-offset"), 10))
)));
copyInfo.forEach((offsets, index) => {
  if (offsets.length !== 11) failed.push(`reel ${index} expected 11 generated copies, got ${offsets.length}`);
  if (JSON.stringify(offsets) !== JSON.stringify(expectedCopyOffsets)) {
    failed.push(`reel ${index} copy offsets are wrong: ${JSON.stringify(offsets)}`);
  }
});

const nextStopPreview = await page.evaluate(() => {
  const test = window.__toshiyaSlotV2Test;
  return {
    exactBoundary: test.previewStopIndexFromOffset(-560),
    justAfterBoundary: test.previewStopIndexFromOffset(-559.9),
    partialAfterBoundary: test.previewStopIndexFromOffset(-530),
    positiveJustAfter: test.previewStopIndexFromOffset(1),
    positiveNearNext: test.previewStopIndexFromOffset(69.9),
    positiveExactNext: test.previewStopIndexFromOffset(70),
    positiveAfterNext: test.previewStopIndexFromOffset(70.1),
  };
});
const expectedNextStopPreview = {
  exactBoundary: 8,
  justAfterBoundary: 7,
  partialAfterBoundary: 7,
  positiveJustAfter: 15,
  positiveNearNext: 15,
  positiveExactNext: 15,
  positiveAfterNext: 14,
};
if (JSON.stringify(nextStopPreview) !== JSON.stringify(expectedNextStopPreview)) {
  failed.push(`next-cell stop preview is wrong: ${JSON.stringify(nextStopPreview)}`);
}

await page.evaluate(() => window.advanceTime(0));
await page.evaluate(() => {
  window.__toshiyaSlotV2Test.setMeoshiTuning({ meoshiSlipCells: 0 });
  window.__toshiyaSlotV2Test.forceRole("watermelon");
});
await page.keyboard.press("Space");
await page.evaluate(() => window.advanceTime(20));
const leftBeforeNextCellStop = (await reels())[0];
if (leftBeforeNextCellStop.nextStopIndex !== 15) {
  failed.push(`left reel should be aiming at next cell 15 before stop: ${JSON.stringify(leftBeforeNextCellStop)}`);
}
await page.keyboard.press("KeyZ");
await page.evaluate(() => window.advanceTime(0));
const leftAfterNextCellStop = (await reels())[0];
if (leftAfterNextCellStop.stoppedIndex !== 15) {
  failed.push(`left reel stopped on nearest/current cell instead of next cell: ${JSON.stringify(leftAfterNextCellStop)}`);
}

await resetPage();
await page.keyboard.press("Space");
await page.waitForTimeout(180);
await page.keyboard.press("KeyX");
await page.waitForTimeout(120);
const centerAfterStop = (await reels())[1];
await page.waitForTimeout(160);
await page.keyboard.press("KeyC");
await page.waitForTimeout(120);
sameLockedReel(centerAfterStop, (await reels())[1], "center reel after right stop");
await page.keyboard.press("KeyZ");
await page.waitForTimeout(120);
sameLockedReel(centerAfterStop, (await reels())[1], "center reel after all stops");

await resetPage();
await page.keyboard.press("Space");
await page.waitForTimeout(160);
await page.keyboard.press("KeyC");
await page.waitForTimeout(120);
const rightAfterStop = (await reels())[2];
await page.waitForTimeout(120);
await page.keyboard.press("KeyX");
await page.waitForTimeout(120);
sameLockedReel(rightAfterStop, (await reels())[2], "right reel after center stop");
await page.keyboard.press("KeyZ");
await page.waitForTimeout(120);
sameLockedReel(rightAfterStop, (await reels())[2], "right reel after all stops");

await resetPage();
await page.keyboard.press("Space");
await page.waitForTimeout(140);
await page.keyboard.press("Space");
await page.waitForTimeout(100);
const leftAfterSpaceStop = (await reels())[0];
await page.keyboard.press("Space");
await page.waitForTimeout(100);
sameLockedReel(leftAfterSpaceStop, (await reels())[0], "left reel after second Space stop");
const middleAfterSpaceStop = (await reels())[1];
await page.keyboard.press("Space");
await page.waitForTimeout(120);
const finalSpaceReels = await reels();
sameLockedReel(leftAfterSpaceStop, finalSpaceReels[0], "left reel after third Space stop");
sameLockedReel(middleAfterSpaceStop, finalSpaceReels[1], "middle reel after third Space stop");

for (let index = 0; index < 16; index += 1) {
  const offset = index * -70;
  if (!copiesCoverViewport(offset)) failed.push(`stop index ${index} leaves an uncovered reel viewport area`);
}
for (let offset = -5600; offset <= 5600; offset += 137) {
  if (!copiesCoverViewport(offset)) failed.push(`raw offset ${offset} leaves an uncovered reel viewport area`);
}

await resetPage();
const spinMsPerSymbol = await page.evaluate(() => window.ToshiyaSlotV2Rules.reel.spinMsPerSymbol);
if (spinMsPerSymbol !== 55) failed.push(`spinMsPerSymbol expected 55 after speed-up, got ${spinMsPerSymbol}`);
const beforeSpin = await reels();
await page.keyboard.press("Space");
await page.waitForTimeout(70);
const firstSpin = await reels();
await page.waitForTimeout(140);
const secondSpin = await reels();
if (!firstSpin[0].spinning || !secondSpin[0].spinning) failed.push("left reel did not enter spinning state");
if (!(secondSpin[0].rawOffset > firstSpin[0].rawOffset)) {
  failed.push(`left reel rawOffset did not move downward: ${firstSpin[0].rawOffset} -> ${secondSpin[0].rawOffset}`);
}
if (beforeSpin[0].offset !== 0) failed.push(`initial reel offset was expected to be 0, got ${beforeSpin[0].offset}`);

await page.screenshot({ path: path.join(tmpDir, "slot-v2-reel-visual-test.png"), fullPage: false });
await browser.close();

console.log(JSON.stringify({ errors, failedRequests, failed }, null, 2));
if (errors.length || failedRequests.length || failed.length) process.exitCode = 1;
