import "../src/v2/slot-v2-rules.js";
import "../src/v2/slot-v2-engine.js";
import "../src/v2/slot-v2-reels.js";

const rules = globalThis.ToshiyaSlotV2Rules;
const engine = globalThis.ToshiyaSlotV2Engine;
const reels = globalThis.ToshiyaSlotV2Reels;

const rng = engine.createSeededRng(2026050901);
const counts = Object.fromEntries(rules.roles.map((role) => [role.id, 0]));
const spins = 120000;
for (let index = 0; index < spins; index += 1) {
  counts[engine.drawRole(rng).id] += 1;
}

const failed = [];
for (const role of rules.roles) {
  if (role.id === "blank") continue;
  const actual = counts[role.id] / spins;
  const expected = role.probability;
  if (Math.abs(actual - expected) > 0.004) {
    failed.push(`${role.id} probability ${actual.toFixed(5)} outside ${expected.toFixed(5)}`);
  }
}

const preludeRng = engine.createSeededRng(2026050902);
for (let index = 0; index < 1000; index += 1) {
  const games = engine.drawPreludeGames(preludeRng);
  if (games < 16 || games > 32) failed.push(`prelude out of range: ${games}`);
}

const base = engine.initialState({ internalState: "high", coins: 100 });
const strong = rules.roles.find((role) => role.id === "strongCherry");
const successStops = reels.pickStopPattern(strong, engine.createSeededRng(1));
const event = engine.resolveNormalSpin(
  base,
  reels.evaluateStops(strong, successStops),
  engine.createSequenceRng([0.99, 0.99, 0.99, 0.99]),
  strong,
);

if (!event.transitionNote.enteredPrelude || event.nextState.internalState !== "prelude") {
  failed.push("high strongCherry did not enter prelude at 100%");
}
if (!event.nextState.pendingBonus) failed.push("prelude did not create pending bonus");

const preludeState = {
  ...event.nextState,
  internalState: "prelude",
  preludeRemaining: 2,
  pendingBonus: event.nextState.pendingBonus,
};
const rareDuringPrelude = engine.resolveNormalSpin(
  preludeState,
  reels.evaluateStops(strong, successStops),
  engine.createSequenceRng([0, 0, 0, 0, 0]),
  strong,
);
if (JSON.stringify(rareDuringPrelude.nextState.pendingBonus) !== JSON.stringify(preludeState.pendingBonus)) {
  failed.push("prelude changed pending bonus after additional rare role");
}
if (rareDuringPrelude.nextState.preludeRemaining !== 1) {
  failed.push("prelude did not tick exactly one game");
}

const ready = engine.resolveNormalSpin(
  { ...preludeState, preludeRemaining: 1 },
  reels.evaluateStops(strong, successStops),
  engine.createSequenceRng([0, 0, 0, 0]),
  strong,
);
if (ready.nextState.internalState !== "bonusReady" || !ready.transitionNote.becameReady) {
  failed.push("prelude final game did not become bonusReady");
}

console.log(JSON.stringify({ counts, failed }, null, 2));
if (failed.length) process.exitCode = 1;
