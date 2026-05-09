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
const missEvent = engine.resolveNormalSpin(
  engine.initialState({ internalState: "high", coins: 100 }),
  reels.evaluateStops(strong, missPattern),
  engine.createSequenceRng([0.5, 0.5, 0.5, 0.5]),
  strong,
);

if (!successEvent.stopResult.success || successEvent.payout !== strong.payout) {
  failed.push("successful meoshi did not pay strong cherry");
}
if (missEvent.stopResult.success || missEvent.payout !== 0) {
  failed.push("missed meoshi paid out");
}
if (missEvent.nextState.internalState !== "prelude" || !missEvent.internalEffectApplied) {
  failed.push("missed strong cherry did not keep internal prelude effect");
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
if (replayMiss.nextState.replayCredit) failed.push("missed replay granted replay credit");

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

console.log(JSON.stringify({ failed, successEvent, missEvent, replaySuccess, replayMiss, lineResults, bellMiss }, null, 2));
if (failed.length) process.exitCode = 1;
