import "../src/v2/slot-v2-rules.js";
import "../src/v2/slot-v2-engine.js";
import "../src/v2/slot-v2-reels.js";

const rules = globalThis.ToshiyaSlotV2Rules;
const engine = globalThis.ToshiyaSlotV2Engine;
const reels = globalThis.ToshiyaSlotV2Reels;

const failed = [];
const strong = rules.roles.find((role) => role.id === "strongCherry");
const successPattern = reels.pickStopPattern(strong, engine.createSeededRng(7));
const missPattern = successPattern.map((value, index) => index === 0 ? value + 4 : value);

const successEvent = engine.resolveNormalSpin(
  engine.initialState({ internalState: "high", coins: 100 }),
  reels.evaluateStops(strong, successPattern),
  engine.createSequenceRng([0.5, 0.5, 0.5, 0.5]),
  strong,
);
const visualMissEvent = engine.resolveNormalSpin(
  engine.initialState({ internalState: "high", coins: 100 }),
  reels.evaluateStops(strong, missPattern),
  engine.createSequenceRng([0.5, 0.5, 0.5, 0.5]),
  strong,
);

if (!successEvent.stopResult.success || successEvent.payout !== strong.payout) {
  failed.push("normal internal strong cherry did not pay");
}
if (visualMissEvent.stopResult.success || visualMissEvent.payout !== 0) {
  failed.push("normal visual miss paid strong cherry");
}
if (visualMissEvent.nextState.internalState !== "prelude" || !visualMissEvent.internalEffectApplied) {
  failed.push("normal visual miss did not keep internal prelude effect");
}

const replay = rules.roles.find((role) => role.id === "replay");
const replaySuccess = engine.resolveNormalSpin(
  engine.initialState({ internalState: "normal", coins: 100 }),
  reels.evaluateStops(replay, reels.pickStopPattern(replay, engine.createSeededRng(8))),
  engine.createSequenceRng([0.9, 0.9, 0.9, 0.9]),
  replay,
);
const replayMiss = engine.resolveNormalSpin(
  engine.initialState({ internalState: "normal", coins: 100 }),
  reels.evaluateStops(replay, [5, 5, 5]),
  engine.createSequenceRng([0.9, 0.9, 0.9, 0.9]),
  replay,
);

if (!replaySuccess.nextState.replayCredit) failed.push("successful replay did not grant replay credit");
if (!replayMiss.nextState.replayCredit) failed.push("normal visual miss changed internal replay credit");

const bell = rules.roles.find((role) => role.id === "bell");
const lineResults = rules.reel.activeLines.map((line) => ({
  id: line.id,
  result: reels.evaluateStops(bell, reels.getLineStopPatterns(bell, line.id)[0]),
}));
for (const item of lineResults) {
  if (!item.result.success || item.result.matchedLine?.id !== item.id) {
    failed.push(`bell did not evaluate active line ${item.id}: ${JSON.stringify(item.result)}`);
  }
}
const bellMiss = reels.evaluateStops(bell, reels.buildFailedStops(bell, engine.createSeededRng(41)));
if (bellMiss.success) failed.push(`buildFailedStops produced a bell payline: ${JSON.stringify(bellMiss)}`);

if (reels.slipCellsFromPress(6, 5) !== 1) {
  failed.push(`directional slip 6 -> 5 should be 1 cell, got ${reels.slipCellsFromPress(6, 5)}`);
}
if (reels.slipCellsFromPress(6, 7) !== 15 || reels.isSlipAllowed(6, 7, 2)) {
  failed.push(`reverse slip 6 -> 7 should not be allowed: ${reels.slipCellsFromPress(6, 7)}`);
}

const visualRoleIds = ["bell", "replay", "watermelon", "normal7", "toshiyaLogo"];
const roleAlignmentResults = visualRoleIds.map((roleId) => {
  const role = rules.roles.find((item) => item.id === roleId) || { id: roleId, targetable: true };
  const patterns = reels.getLineStopPatterns(roleId).map((pattern) => ({
    pattern,
    roleLine: reels.findRoleLine(roleId, pattern),
    visualLine: reels.findVisualLine(pattern),
    result: reels.evaluateStops(role, pattern),
  }));
  return { roleId, expectedSymbol: reels.getRoleSymbol(roleId), patterns };
});
for (const item of roleAlignmentResults) {
  for (const pattern of item.patterns) {
    if (pattern.roleLine?.symbol !== item.expectedSymbol) {
      failed.push(`${item.roleId} pattern does not show expected symbol line: ${JSON.stringify(pattern)}`);
    }
    if (!pattern.result.success || pattern.result.matchedLine?.symbol !== item.expectedSymbol) {
      failed.push(`${item.roleId} pattern did not evaluate as displayed role line: ${JSON.stringify(pattern.result)}`);
    }
  }
}

const chance = rules.roles.find((role) => role.id === "chance");
const logoLine = reels.pickLineStopPattern("toshiyaLogo", engine.createSeededRng(77));
const chanceOnLogo = reels.evaluateStops(chance, logoLine);
if (chanceOnLogo.success) {
  failed.push(`chance paid on logo line: ${JSON.stringify(chanceOnLogo)}`);
}
if (reels.findNormalForbiddenLine(logoLine)?.symbol !== "logo") {
  failed.push(`logo line was not detected as normal-forbidden: ${JSON.stringify(logoLine)}`);
}
const sevenLine = reels.pickLineStopPattern("normal7", engine.createSeededRng(78));
if (reels.findNormalForbiddenLine(sevenLine)?.symbol !== "seven") {
  failed.push(`seven line was not detected as normal-forbidden: ${JSON.stringify(sevenLine)}`);
}
const avoidLogoLine = reels.avoidNormalForbiddenLineStop(2, logoLine[2], [logoLine[0], logoLine[1], null]);
if (!avoidLogoLine.adjusted || reels.findNormalForbiddenLine([logoLine[0], logoLine[1], avoidLogoLine.stopIndex])) {
  failed.push(`normal-forbidden logo line was not nudged away: ${JSON.stringify({ logoLine, avoidLogoLine })}`);
}
for (const pattern of reels.getLineStopPatterns("chance")) {
  if (reels.findNormalForbiddenLine(pattern)) {
    failed.push(`chance stop pattern still shows a forbidden logo line: ${JSON.stringify(pattern)}`);
  }
}

function previousSymbol(strip, index) {
  return strip[(index - 1 + strip.length) % strip.length];
}

function nextSymbol(strip, index) {
  return strip[(index + 1) % strip.length];
}

const [leftStrip, centerStrip, rightStrip] = rules.reel.symbolStrips;
leftStrip.forEach((symbol, index) => {
  if (symbol === "seven" && previousSymbol(leftStrip, index) !== "watermelon") {
    failed.push(`left reel seven is not below watermelon at index ${index}`);
  }
  if (symbol === "cherry" && previousSymbol(leftStrip, index) !== "bar") {
    failed.push(`left reel cherry is not below BAR at index ${index}`);
  }
});
centerStrip.forEach((symbol, index) => {
  if (symbol === "seven" && nextSymbol(centerStrip, index) !== "watermelon") {
    failed.push(`center reel seven is not above watermelon at index ${index}`);
  }
});
rightStrip.forEach((symbol, index) => {
  if (symbol === "seven" && nextSymbol(rightStrip, index) !== "watermelon") {
    failed.push(`right reel seven is not above watermelon at index ${index}`);
  }
});

const oldWatermelonFalseLine = reels.evaluateStops(
  rules.roles.find((role) => role.id === "watermelon"),
  [7, 1, 0],
);
if (oldWatermelonFalseLine.success) {
  failed.push(`watermelon paid on non-watermelon visual line: ${JSON.stringify(oldWatermelonFalseLine)}`);
}
const watermelon = rules.roles.find((role) => role.id === "watermelon");
const watermelonMiddlePattern = reels.getLineStopPatterns("watermelon", "middle")[0];
const reverseRightWatermelon = reels.findSlipStop(
  watermelon,
  2,
  reels.normalizeIndex(watermelonMiddlePattern[2] - 1),
  [watermelonMiddlePattern[0], watermelonMiddlePattern[1], null],
  { maxSlipCells: 2 },
);
const forwardRightWatermelon = reels.findSlipStop(
  watermelon,
  2,
  reels.normalizeIndex(watermelonMiddlePattern[2] + 1),
  [watermelonMiddlePattern[0], watermelonMiddlePattern[1], null],
  { maxSlipCells: 2 },
);
if (reverseRightWatermelon) {
  failed.push(`right watermelon slipped backward to a target above the press: ${JSON.stringify({ watermelonMiddlePattern, reverseRightWatermelon })}`);
}
if (!forwardRightWatermelon || forwardRightWatermelon.slipCells !== 1 || !forwardRightWatermelon.directionAllowed) {
  failed.push(`right watermelon did not slip forward by 1 cell: ${JSON.stringify({ watermelonMiddlePattern, forwardRightWatermelon })}`);
}

const weakCherry = rules.roles.find((role) => role.id === "weakCherry");
const weakTop = reels.evaluateStops(weakCherry, [7, 0, 0]);
const weakMiddle = reels.evaluateStops(weakCherry, [6, 0, 0]);
const weakBottom = reels.evaluateStops(weakCherry, [5, 0, 0]);
if (!weakTop.success || !weakBottom.success) {
  failed.push(`weak cherry did not pay on corner rows: ${JSON.stringify({ weakTop, weakBottom })}`);
}
if (weakMiddle.success) {
  failed.push(`weak cherry paid on middle row: ${JSON.stringify(weakMiddle)}`);
}
const strongMiddle = reels.evaluateStops(strong, [6, 0, 0]);
const strongTop = reels.evaluateStops(strong, [7, 0, 0]);
const strongBottom = reels.evaluateStops(strong, [5, 0, 0]);
if (!strongMiddle.success) {
  failed.push(`strong cherry did not pay on middle row: ${JSON.stringify(strongMiddle)}`);
}
if (strongTop.success || strongBottom.success) {
  failed.push(`strong cherry paid on corner row: ${JSON.stringify({ strongTop, strongBottom })}`);
}
const weakSlipFromMiddle = reels.findSlipStop(weakCherry, 0, 6, [null, null, null], { maxSlipCells: 2 });
if (!weakSlipFromMiddle || reels.findWrongCherryStop(weakCherry, weakSlipFromMiddle.stopIndex)) {
  failed.push(`weak cherry slip stayed on middle cherry: ${JSON.stringify(weakSlipFromMiddle)}`);
}
const strongSlipFromCorner = reels.findSlipStop(strong, 0, 7, [null, null, null], { maxSlipCells: 2 });
if (!strongSlipFromCorner || reels.findWrongCherryStop(strong, strongSlipFromCorner.stopIndex)) {
  failed.push(`strong cherry slip stayed on corner cherry: ${JSON.stringify(strongSlipFromCorner)}`);
}
const avoidWrongWeak = reels.avoidWrongCherryStop(weakCherry, 0, 6, [null, null, null], { maxNudgeCells: 2, avoidRoleCherry: true });
if (!avoidWrongWeak.adjusted || reels.findWrongCherryStop(weakCherry, avoidWrongWeak.stopIndex) || reels.leftHasRoleCherry(weakCherry, [avoidWrongWeak.stopIndex, null, null])) {
  failed.push(`weak cherry wrong middle row was not nudged away: ${JSON.stringify(avoidWrongWeak)}`);
}
const avoidWrongStrong = reels.avoidWrongCherryStop(strong, 0, 7, [null, null, null], { maxNudgeCells: 3, avoidRoleCherry: true });
if (!avoidWrongStrong.adjusted || reels.findWrongCherryStop(strong, avoidWrongStrong.stopIndex) || reels.leftHasRoleCherry(strong, [avoidWrongStrong.stopIndex, null, null])) {
  failed.push(`strong cherry wrong corner row was not nudged away: ${JSON.stringify(avoidWrongStrong)}`);
}

function findDecorativeExample(symbol) {
  for (let left = 0; left < rules.reel.symbolCount; left += 1) {
    for (let center = 0; center < rules.reel.symbolCount; center += 1) {
      for (let right = 0; right < rules.reel.symbolCount; right += 1) {
        const stops = [left, center, right];
        if (reels.findDecorativeLine(stops)?.symbol === symbol) return { symbol, stops };
      }
    }
  }
  return { symbol, stops: null };
}

const decorativeExamples = rules.reel.decorativeSymbols.map(findDecorativeExample);
for (const example of decorativeExamples) {
  if (!example.stops) continue;
  const line = reels.findDecorativeLine(example.stops);
  if (line?.symbol !== example.symbol) {
    failed.push(`decorative example did not show expected ${example.symbol} line: ${JSON.stringify({ example, line })}`);
  }
  for (const roleId of visualRoleIds) {
    const role = rules.roles.find((item) => item.id === roleId) || { id: roleId, targetable: true };
    const result = reels.evaluateStops(role, example.stops);
    if (result.success) {
      failed.push(`decorative ${example.symbol} line paid ${roleId}: ${JSON.stringify(result)}`);
    }
  }
}
const faceExample = decorativeExamples.find((example) => example.symbol === "face" && example.stops);
const dogezaExample = decorativeExamples.find((example) => example.symbol === "dogeza" && example.stops);
const avoidFaceLine = faceExample
  ? reels.avoidDecorativeLineStop(2, faceExample.stops[2], [faceExample.stops[0], faceExample.stops[1], null])
  : null;
if (faceExample && !avoidFaceLine?.adjusted) {
  failed.push(`decorative face line did not request a nudge: ${JSON.stringify({ faceExample, avoidFaceLine })}`);
}
if (avoidFaceLine && reels.findDecorativeLine([faceExample.stops[0], faceExample.stops[1], avoidFaceLine.stopIndex])) {
  failed.push(`decorative face line was not nudged away: ${JSON.stringify(avoidFaceLine)}`);
}
if (dogezaExample?.stops) {
  const avoidDogezaLine = reels.avoidDecorativeLineStop(2, dogezaExample.stops[2], [dogezaExample.stops[0], dogezaExample.stops[1], null]);
  if (!avoidDogezaLine.adjusted || reels.findDecorativeLine([dogezaExample.stops[0], dogezaExample.stops[1], avoidDogezaLine.stopIndex])) {
    failed.push(`decorative dogeza line was not nudged away: ${JSON.stringify(avoidDogezaLine)}`);
  }
}

const nonWinningStops = reels.buildNonWinningStops(engine.createSeededRng(42));
if (reels.findVisualLine(nonWinningStops) || reels.leftHasCherry(nonWinningStops)) {
  failed.push(`non-winning stops showed a visual win: ${JSON.stringify({ nonWinningStops, line: reels.findVisualLine(nonWinningStops), leftCherry: reels.leftHasCherry(nonWinningStops) })}`);
}

console.log(JSON.stringify({ failed, successEvent, visualMissEvent, replaySuccess, replayMiss, lineResults, bellMiss, roleAlignmentResults, chanceOnLogo, logoLine, avoidLogoLine, oldWatermelonFalseLine, reverseRightWatermelon, forwardRightWatermelon, weakTop, weakMiddle, weakBottom, strongMiddle, strongTop, strongBottom, decorativeExamples, avoidFaceLine, nonWinningStops }, null, 2));
if (failed.length) process.exitCode = 1;
