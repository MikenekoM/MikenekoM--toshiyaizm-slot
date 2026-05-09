import "../src/v2/slot-v2-rules.js";
import "../src/v2/slot-v2-engine.js";

const rules = globalThis.ToshiyaSlotV2Rules;
const engine = globalThis.ToshiyaSlotV2Engine;
const failed = [];

function sample(roleId, startStage, seed) {
  const role = rules.roles.find((item) => item.id === roleId);
  const rng = engine.createSeededRng(seed);
  const counts = { up: 0, down: 0, same: 0 };
  for (let index = 0; index < 10000; index += 1) {
    const note = engine.updateNormalStage({ normalStage: startStage }, role, {}, rng);
    const before = rules.stageOrder.indexOf(note.before);
    const after = rules.stageOrder.indexOf(note.after);
    if (after > before) counts.up += 1;
    else if (after < before) counts.down += 1;
    else counts.same += 1;
  }
  return counts;
}

const strong = sample("strongCherry", "street", 11);
const replay = sample("replay", "heat", 12);
const blank = sample("blank", "street", 13);

if (strong.up <= 6000) failed.push(`strong cherry stage-up too low: ${strong.up}`);
if (replay.down <= 3500) failed.push(`replay stage-down too low: ${replay.down}`);
if (blank.up <= 0) failed.push("blank never raised stage");

const strongNoLink = engine.updateNormalStage(
  { normalStage: "street" },
  rules.roles.find((role) => role.id === "strongCherry"),
  {},
  engine.createSequenceRng([0.99, 0.99]),
);
const replayNoLink = engine.updateNormalStage(
  { normalStage: "deep" },
  rules.roles.find((role) => role.id === "replay"),
  {},
  engine.createSequenceRng([0.99, 0.99]),
);
const blankUp = engine.updateNormalStage(
  { normalStage: "street" },
  rules.roles.find((role) => role.id === "blank"),
  {},
  engine.createSequenceRng([0.99, 0.01]),
);

if (strongNoLink.after !== "street") failed.push("strong rare always linked to stage-up");
if (replayNoLink.after !== "deep") failed.push("replay always linked to stage-down");
if (blankUp.after !== "heat") failed.push("blank could not raise stage on probability operation");

console.log(JSON.stringify({ failed, strong, replay, blank, strongNoLink, replayNoLink, blankUp }, null, 2));
if (failed.length) process.exitCode = 1;
