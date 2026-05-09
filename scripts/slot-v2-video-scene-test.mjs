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

page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("requestfailed", (request) => {
  failedRequests.push(`${request.url()} ${request.failure()?.errorText || ""}`.trim());
});

async function resetPage() {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__toshiyaSlotV2Test?.setState));
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

async function startForcedRole(roleId, state = {}) {
  await page.evaluate(({ roleId, state }) => {
    window.__toshiyaSlotV2Test.setState({
      coins: 1000,
      internalState: "normal",
      normalStage: "street",
      ...state,
    });
    window.__toshiyaSlotV2Test.forceRole(roleId);
  }, { roleId, state });
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
}

await resetPage();
await startForcedRole("weakCherry");
let state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
let media = await currentMedia();
if (state.lastSceneId !== "normal_role_weak_cherry") failed.push(`weak cherry scene was ${state.lastSceneId}`);
if (media.tag !== "VIDEO" || !media.src.endsWith("assets/videos/v2/role-weak-cherry.mp4")) failed.push(`weak cherry did not render the expected video: ${JSON.stringify(media)}`);
if (media.readyState < 2 || media.videoWidth <= 0) failed.push(`weak cherry video did not load metadata/frame: ${JSON.stringify(media)}`);

await resetPage();
await startForcedRole("strongCherry");
state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
media = await currentMedia();
if (state.lastSceneId !== "normal_role_strong_cherry") failed.push(`strong cherry scene was ${state.lastSceneId}`);
if (media.tag !== "VIDEO" || !media.src.endsWith("assets/videos/v2/role-strong-cherry.mp4")) failed.push(`strong cherry did not render the expected video: ${JSON.stringify(media)}`);
if (media.readyState < 2 || media.videoWidth <= 0) failed.push(`strong cherry video did not load metadata/frame: ${JSON.stringify(media)}`);

await resetPage();
await page.evaluate(() => {
  window.__toshiyaSlotV2Test.setRandomSequence([0.3]);
});
await startForcedRole("blank", { normalStage: "deep" });
state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
media = await currentMedia();
if (state.lastSceneId !== "normal_deep_rumble") failed.push(`deep stage scene was ${state.lastSceneId}`);
if (media.tag !== "VIDEO" || !media.src.endsWith("assets/videos/v2/normal-stage-high.mp4")) failed.push(`deep stage did not render the high video: ${JSON.stringify(media)}`);
if (media.readyState < 2 || media.videoWidth <= 0) failed.push(`deep stage video did not load metadata/frame: ${JSON.stringify(media)}`);

await page.screenshot({ path: path.join(root, "tmp", "slot-v2-video-scene-test.png"), fullPage: false });
await browser.close();

console.log(JSON.stringify({ errors, failedRequests, failed }, null, 2));
if (errors.length || failedRequests.length || failed.length) process.exitCode = 1;
