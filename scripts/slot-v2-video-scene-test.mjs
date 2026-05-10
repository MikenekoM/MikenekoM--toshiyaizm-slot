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
  await page.waitForFunction(() => Boolean(window.__toshiyaSlotV2Test?.setState));
}

async function resetWithStage(stage) {
  await resetPage();
  await page.evaluate((normalStage) => {
    window.__toshiyaSlotV2Test.setState({
      coins: 1000,
      internalState: "normal",
      normalStage,
    });
    window.__toshiyaSlotV2Test.playNormalLoopScene();
  }, stage);
  await page.waitForTimeout(250);
}

async function currentMedia() {
  return page.evaluate(() => {
    const media = document.querySelector("[data-scene-media] > *");
    return {
      tag: media?.tagName || "",
      src: media?.getAttribute("src") || "",
      readyState: media?.readyState ?? null,
      videoWidth: media?.videoWidth ?? 0,
      videoHeight: media?.videoHeight ?? 0,
    };
  });
}

async function endCurrentVideoWithRoll(roll) {
  await page.evaluate((value) => {
    window.__toshiyaSlotV2Test.setRandomSequence([value]);
    const video = document.querySelector("[data-scene-media] video");
    video?.dispatchEvent(new Event("ended"));
  }, roll);
  await page.waitForTimeout(250);
}

async function startForcedRole(roleId) {
  await page.evaluate((id) => {
    window.__toshiyaSlotV2Test.forceRole(id);
  }, roleId);
  await page.keyboard.press("Space");
  await page.waitForTimeout(120);
}

await resetWithStage("heat");
await endCurrentVideoWithRoll(0.2);
let state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
let media = await currentMedia();
if (state.lastSceneId !== "normal_heat_comments") failed.push(`heat loop appropriate roll scene was ${state.lastSceneId}`);
if (media.tag !== "VIDEO" || !media.src.endsWith("assets/videos/v2/normal-stage-mid.mp4")) failed.push(`heat loop did not render the mid video: ${JSON.stringify(media)}`);
if (media.readyState < 2 || media.videoWidth <= 0) failed.push(`heat loop video did not load metadata/frame: ${JSON.stringify(media)}`);

await endCurrentVideoWithRoll(0.6);
state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
media = await currentMedia();
if (state.lastSceneId !== "normal_street_room") failed.push(`heat loop normal roll scene was ${state.lastSceneId}`);
if (media.tag !== "VIDEO" || !media.src.endsWith("assets/videos/v2/normal-stage-low.mp4")) failed.push(`heat loop normal roll did not render the low video: ${JSON.stringify(media)}`);

await endCurrentVideoWithRoll(0.95);
state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
media = await currentMedia();
if (state.lastSceneId !== "normal_deep_rumble") failed.push(`heat loop mismatched roll scene was ${state.lastSceneId}`);
if (media.tag !== "VIDEO" || !media.src.endsWith("assets/videos/v2/normal-stage-high.mp4")) failed.push(`heat loop mismatched roll did not render the high video: ${JSON.stringify(media)}`);

await resetWithStage("deep");
await endCurrentVideoWithRoll(0.2);
const beforeSpinMedia = await currentMedia();
await startForcedRole("strongCherry");
state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
media = await currentMedia();
if (state.currentRole !== "strongCherry") failed.push(`strong cherry spin did not start: ${state.currentRole}`);
if (media.src !== beforeSpinMedia.src) failed.push(`normal spin changed video immediately: ${beforeSpinMedia.src} -> ${media.src}`);

await resetWithStage("street");
await page.evaluate(() => {
  const pending = {
    entrySymbol: "normal7",
    entryName: "通常7揃い",
    rateLabel: "79%",
    rate: 0.79,
    stockSets: 1,
    premium: false,
  };
  window.__toshiyaSlotV2Test.setState({
    coins: 1000,
    internalState: "bonusReady",
    pendingBonus: pending,
  });
  window.__toshiyaSlotV2Test.forceStopSuccess("normal7");
});
await page.keyboard.press("Space");
await page.waitForTimeout(80);
state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
if (state.spinKind !== "bonusEntry" || state.phase === "bonus") failed.push(`bonusReady did not enter 7 aiming turn first: ${JSON.stringify(state)}`);
await page.keyboard.press("KeyZ");
await page.keyboard.press("KeyX");
await page.keyboard.press("KeyC");
await page.waitForTimeout(150);
state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
media = await currentMedia();
if (state.phase !== "bonus" || state.lastSceneId !== "bonus_open_normal7") failed.push(`bonus did not switch after 7 entry success: ${JSON.stringify(state)}`);
if (media.tag !== "IMG" || !media.src.endsWith("assets/effects/runtime/bonus_ism_awakening.webp")) failed.push(`bonus opening did not replace video after 7 entry success: ${JSON.stringify(media)}`);

await page.screenshot({ path: path.join(root, "tmp", "slot-v2-video-scene-test.png"), fullPage: false });
await browser.close();

console.log(JSON.stringify({ errors, failedRequests, failed }, null, 2));
if (errors.length || failedRequests.length || failed.length) process.exitCode = 1;
