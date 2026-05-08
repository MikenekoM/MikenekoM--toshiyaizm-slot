import "../src/slot-rules.js";
import "../src/slot-engine.js";

const rules = globalThis.ToshiyaSlotRules;
const engine = globalThis.ToshiyaSlotEngine;

const roleCounts = Object.fromEntries(rules.roles.map((role) => [role.id, 0]));
const rng = engine.createSeededRng(20260508);
const state = {
  mode: "normal",
  preBonusRemaining: 0,
  pendingBonus: null,
};

let preBonusEntries = 0;
let bonusReadyHits = 0;
const totalSpins = 20000;

for (let index = 0; index < totalSpins; index += 1) {
  const event = engine.playNormalGame(state, rng);
  roleCounts[event.role.id] += 1;
  state.mode = event.nextState.mode;
  state.preBonusRemaining = event.nextState.preBonusRemaining;
  state.pendingBonus = event.nextState.pendingBonus;
  if (event.note.enteredPreBonus) preBonusEntries += 1;
  if (event.note.becameReady) {
    bonusReadyHits += 1;
    state.mode = "normal";
    state.preBonusRemaining = 0;
    state.pendingBonus = null;
  }
}

function simulateBonus(rate, seed) {
  const localRng = engine.createSeededRng(seed);
  const runs = 5000;
  let totalSets = 0;
  let reached20 = 0;
  for (let run = 0; run < runs; run += 1) {
    const bonus = {
      id: "normal",
      name: "バトルボーナス",
      effect: "rush",
      rate,
      rateLabel: `${Math.round(rate * 100)}%`,
      set: 0,
      totalPayout: 0,
      milestoneReached: false,
    };
    while (bonus.set < 80) {
      const battle = engine.drawBattleSet(bonus, localRng);
      bonus.set = battle.nextSet;
      bonus.totalPayout += battle.payout;
      if (battle.milestoneReached) bonus.milestoneReached = true;
      if (!battle.continued) break;
    }
    totalSets += bonus.set;
    if (bonus.set >= rules.battle.milestoneSet) reached20 += 1;
  }
  return {
    averageSets: totalSets / runs,
    reached20Rate: reached20 / runs,
  };
}

const bonusStats = {
  "66": simulateBonus(0.66, 66),
  "79": simulateBonus(0.79, 79),
  "84": simulateBonus(0.84, 84),
  "88": simulateBonus(0.88, 88),
};

const failed = [];
const roleTotal = Object.values(roleCounts).reduce((sum, value) => sum + value, 0);
for (const role of rules.roles) {
  const actual = roleCounts[role.id] / roleTotal;
  const expected = role.weight / rules.roles.reduce((sum, item) => sum + item.weight, 0);
  if (Math.abs(actual - expected) > 0.015) {
    failed.push(`${role.id}: probability ${actual.toFixed(4)} outside expected ${expected.toFixed(4)}`);
  }
}

if (preBonusEntries < 100 || bonusReadyHits < 80) {
  failed.push(`preBonus flow too rare: entries=${preBonusEntries}, ready=${bonusReadyHits}`);
}

if (!(bonusStats["66"].averageSets < bonusStats["79"].averageSets
  && bonusStats["79"].averageSets < bonusStats["84"].averageSets
  && bonusStats["84"].averageSets < bonusStats["88"].averageSets)) {
  failed.push("bonus average sets are not ordered by continuation rate");
}

if (bonusStats["88"].reached20Rate <= bonusStats["66"].reached20Rate) {
  failed.push("20SET reach rate does not increase for high continuation");
}

const result = {
  roleCounts,
  preBonusEntries,
  bonusReadyHits,
  bonusStats,
  failed,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exitCode = 1;
