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

async function state() {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text()));
}

function sameStops(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => Number(value) === Number(expected[index]));
}

async function forceRoleSpin(roleId, randoms = [0], options = {}) {
  await page.evaluate(({ id, values, stateData, forceSuccess, forceStops }) => {
    window.__toshiyaSlotV2Test.setState({ coins: 1000, internalState: "normal", normalStage: "street", ...stateData });
    window.__toshiyaSlotV2Test.setRandomSequence(values);
    window.__toshiyaSlotV2Test.forceRole(id);
    if (forceSuccess) window.__toshiyaSlotV2Test.forceStopSuccess(id);
    if (forceStops) window.__toshiyaSlotV2Test.forceStops(forceStops);
  }, {
    id: roleId,
    values: randoms,
    stateData: options.state || {},
    forceSuccess: Boolean(options.forceSuccess),
    forceStops: options.forceStops || null,
  });
  await page.keyboard.press("Space");
  await page.waitForTimeout(80);
  const during = await state();
  await page.keyboard.press("KeyZ");
  await page.keyboard.press("KeyX");
  await page.keyboard.press("KeyC");
  await page.waitForTimeout(120);
  return { during, after: await state() };
}

function assertRoleAutoAligned(roleId, during, after) {
  if (!during.autoStopPattern) failed.push(`${roleId} did not set autoStopPattern during normal spin`);
  assertStopsMatch(roleId, after);
}

function assertStopsMatch(roleId, after) {
  const patterns = globalPatterns[roleId];
  const stops = after.reels.map((reel) => reel.stoppedIndex);
  if (!patterns.some((pattern) => sameStops(stops, pattern))) {
    failed.push(`${roleId} did not stop on a valid role pattern: ${JSON.stringify(stops)}`);
  }
}

await resetPage();
const lineInfo = await page.evaluate(() => [...document.querySelectorAll(".v2-payline")].map((line) => ({
  className: line.className,
  top: getComputedStyle(line).top,
  transform: getComputedStyle(line).transform,
})));
if (lineInfo.length !== 5) failed.push(`expected 5 V2 payline elements, got ${lineInfo.length}`);
if (!lineInfo.some((line) => line.className.includes("diagonal-a")) || !lineInfo.some((line) => line.className.includes("diagonal-b"))) {
  failed.push(`V2 paylines do not include both diagonal lines: ${JSON.stringify(lineInfo)}`);
}

const globalPatterns = await page.evaluate(() => ({
  bell: window.ToshiyaSlotV2Reels.getLineStopPatterns("bell"),
  replay: window.ToshiyaSlotV2Reels.getLineStopPatterns("replay"),
  watermelon: window.ToshiyaSlotV2Reels.getLineStopPatterns("watermelon"),
  normal7: window.ToshiyaSlotV2Reels.getLineStopPatterns("normal7"),
}));

const bellRate = await page.evaluate(() => window.ToshiyaSlotV2Rules.roles.find((role) => role.id === "bell")?.probability);
if (Math.abs(bellRate - 1 / 40) > 0.000001) {
  failed.push(`normal bell probability is not 1/40: ${bellRate}`);
}
const meoshiControlIds = await page.evaluate(() => [
  "v2DebugMeoshiSlip",
  "v2DebugBonusEntrySlip",
  "v2DebugMeoshiRole",
  "v2DebugMeoshiApply",
  "v2DebugMeoshiForce",
].filter((id) => !document.getElementById(id)));
if (meoshiControlIds.length) failed.push(`missing meoshi debug controls: ${meoshiControlIds.join(", ")}`);
const directionalSlip = await page.evaluate(() => ({
  forward: window.ToshiyaSlotV2Reels.slipCellsFromPress(6, 5),
  reverse: window.ToshiyaSlotV2Reels.slipCellsFromPress(6, 7),
  reverseAllowed: window.ToshiyaSlotV2Reels.isSlipAllowed(6, 7, 2),
}));
if (directionalSlip.forward !== 1 || directionalSlip.reverse !== 15 || directionalSlip.reverseAllowed) {
  failed.push(`directional slip API is wrong: ${JSON.stringify(directionalSlip)}`);
}

let result = await forceRoleSpin("bell", [0]);
assertRoleAutoAligned("bell", result.during, result.after);
if (!result.during.autoStopAligned) failed.push("normal bell did not mark autoStopAligned");
if (result.after.lastPayout !== 8) failed.push(`normal bell did not auto-pay 8: ${result.after.lastPayout}`);

result = await forceRoleSpin("replay");
assertRoleAutoAligned("replay", result.during, result.after);
if (!result.during.autoStopAligned) failed.push("normal replay did not mark autoStopAligned");
if (!result.after.replayCredit) failed.push("normal replay did not auto-grant replay credit");

result = await forceRoleSpin("watermelon", [0], { forceSuccess: true });
assertStopsMatch("watermelon", result.after);
if (result.during.autoStopPattern || result.during.autoStopAligned !== null) failed.push("normal watermelon should not auto-stop because payout is meoshi-based");
if (!result.during.roleFlashVisible || result.during.roleFlashRole !== "watermelon") failed.push(`watermelon did not show front-layer flash: ${JSON.stringify(result.during)}`);
if (result.after.lastPayout !== 6) failed.push(`normal watermelon meoshi success did not pay: ${JSON.stringify(result.after)}`);

result = await forceRoleSpin("chance", [0]);
if (!result.during.autoStopPattern || result.during.autoStopAligned) failed.push(`normal chance should use a non-winning visual stop pattern: ${JSON.stringify(result.during)}`);
if (result.after.lastPayout !== 1) failed.push(`normal chance did not resolve internally: ${JSON.stringify(result.after)}`);
const chanceStops = result.after.reels.map((reel) => reel.stoppedIndex);
const chanceVisual = await page.evaluate((stops) => ({
  visualLine: window.ToshiyaSlotV2Reels.findVisualLine(stops),
  forbiddenLine: window.ToshiyaSlotV2Reels.findNormalForbiddenLine(stops),
  leftCherry: window.ToshiyaSlotV2Reels.leftHasCherry(stops),
}), chanceStops);
if (chanceVisual.visualLine || chanceVisual.forbiddenLine || chanceVisual.leftCherry) {
  failed.push(`normal chance showed an accidental role shape: ${JSON.stringify(chanceVisual)} stops=${JSON.stringify(chanceStops)}`);
}

result = await forceRoleSpin("strongCherry", [0], { forceSuccess: true });
if (result.during.autoStopPattern || result.during.autoStopAligned !== null) failed.push("strong cherry should not auto-stop because payout is meoshi-based");
if (!result.during.roleFlashVisible || result.during.roleFlashRole !== "strongCherry") failed.push(`strong cherry did not show front-layer flash: ${JSON.stringify(result.during)}`);
const strongStops = result.after.reels.map((reel) => reel.stoppedIndex);
const strongLeftCherry = await page.evaluate((stops) => window.ToshiyaSlotV2Reels.leftHasCherry(stops), strongStops);
if (!strongLeftCherry || result.after.lastPayout !== 2) failed.push(`strong cherry did not pay from left reel only: ${JSON.stringify(result.after)}`);
const strongWrongCherry = await page.evaluate((stops) => window.ToshiyaSlotV2Reels.findWrongCherryStop("strongCherry", stops[0]), strongStops);
if (strongWrongCherry) failed.push(`strong cherry stopped on a corner cherry row: ${JSON.stringify({ strongStops, strongWrongCherry })}`);

result = await forceRoleSpin("weakCherry", [0], { forceSuccess: true });
const weakStops = result.after.reels.map((reel) => reel.stoppedIndex);
const weakLeftCherry = await page.evaluate((stops) => window.ToshiyaSlotV2Reels.leftHasRoleCherry("weakCherry", stops), weakStops);
const weakWrongCherry = await page.evaluate((stops) => window.ToshiyaSlotV2Reels.findWrongCherryStop("weakCherry", stops[0]), weakStops);
if (!weakLeftCherry || weakWrongCherry || result.after.lastPayout !== 2) {
  failed.push(`weak cherry did not pay from corner left cherry only: ${JSON.stringify({ after: result.after, weakStops, weakLeftCherry, weakWrongCherry })}`);
}

const strongMissStops = await page.evaluate(() => {
  const role = window.ToshiyaSlotV2Rules.roles.find((item) => item.id === "strongCherry");
  return window.ToshiyaSlotV2Reels.buildFailedStops(role, () => 0.73);
});
result = await forceRoleSpin("strongCherry", [0.5, 0.5, 0.5, 0.5], {
  state: { internalState: "high" },
  forceStops: strongMissStops,
});
if (result.after.lastPayout !== 0 || result.after.internalState !== "prelude") {
  failed.push(`strong cherry meoshi miss should lose payout but keep internal prelude: ${JSON.stringify(result.after)} stops=${JSON.stringify(strongMissStops)}`);
}

result = await forceRoleSpin("blank", [0, 0, 0, 0, 0, 0]);
const blankStops = result.after.reels.map((reel) => reel.stoppedIndex);
const blankVisual = await page.evaluate((stops) => ({
  visualLine: window.ToshiyaSlotV2Reels.findVisualLine(stops),
  leftCherry: window.ToshiyaSlotV2Reels.leftHasCherry(stops),
}), blankStops);
if (!result.during.autoStopPattern || result.during.autoStopAligned) failed.push("blank did not use internal miss stop pattern");
if (blankVisual.visualLine || blankVisual.leftCherry) failed.push(`blank showed an accidental role shape: ${JSON.stringify(blankVisual)} stops=${JSON.stringify(blankStops)}`);

const tuning = JSON.parse(await page.evaluate(() => window.__toshiyaSlotV2Test.setMeoshiTuning({
  meoshiSlipCells: 3,
  bonusEntrySlipCells: 4,
})));
if (tuning.meoshiTuning?.meoshiSlipCells !== 3 || tuning.meoshiTuning?.bonusEntrySlipCells !== 4) {
  failed.push(`meoshi tuning debug API did not apply values: ${JSON.stringify(tuning.meoshiTuning)}`);
}

await resetPage();
await page.fill("#v2DebugMeoshiSlip", "1");
await page.fill("#v2DebugBonusEntrySlip", "5");
await page.click("#v2DebugMeoshiApply");
const debugApplied = await state();
if (debugApplied.meoshiTuning?.meoshiSlipCells !== 1 || debugApplied.meoshiTuning?.bonusEntrySlipCells !== 5) {
  failed.push(`meoshi tuning controls did not apply values: ${JSON.stringify(debugApplied.meoshiTuning)}`);
}
await page.selectOption("#v2DebugMeoshiRole", "strongCherry");
await page.click("#v2DebugMeoshiForce");
await page.keyboard.press("Space");
await page.waitForTimeout(80);
const debugForced = await state();
if (debugForced.currentRole !== "strongCherry" || debugForced.spinKind !== "normal") {
  failed.push(`meoshi debug role force did not start strong cherry spin: ${JSON.stringify(debugForced)}`);
}
await page.keyboard.press("KeyZ");
await page.keyboard.press("KeyX");
await page.keyboard.press("KeyC");
await page.waitForTimeout(120);
const debugAfterStops = await state();
if (debugAfterStops.meoshiDebug?.roleId !== "strongCherry" || !Object.hasOwn(debugAfterStops.meoshiDebug?.slips?.[0] || {}, "pressedIndex")) {
  failed.push(`meoshi debug output did not include last stop details: ${JSON.stringify(debugAfterStops.meoshiDebug)}`);
}

await page.screenshot({ path: path.join(root, "tmp", "slot-v2-auto-align-test.png"), fullPage: false });
await browser.close();

console.log(JSON.stringify({ errors, failedRequests, failed }, null, 2));
if (errors.length || failedRequests.length || failed.length) process.exitCode = 1;
