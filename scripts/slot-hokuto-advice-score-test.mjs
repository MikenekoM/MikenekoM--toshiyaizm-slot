import "../src/slot-rules.js";
import "../src/slot-engine.js";
import "../src/slot-effects.js";

const rules = globalThis.ToshiyaSlotRules;
const engine = globalThis.ToshiyaSlotEngine;
const effects = globalThis.ToshiyaEffectSequences;

const failures = [];
const checks = [];

function check(name, passed, detail = "") {
  checks.push({ name, passed, detail });
  if (!passed) failures.push(`${name}: ${detail}`);
}

const totalRoleWeight = rules.roles.reduce((sum, role) => sum + role.weight, 0);
const quietWeight = rules.roles
  .filter((role) => Number(role.heat || 0) <= 1)
  .reduce((sum, role) => sum + role.weight, 0);
const quietRatio = quietWeight / totalRoleWeight;
check("quiet-normal-90pct", quietRatio >= 0.9, `quietRatio=${quietRatio.toFixed(3)}`);

const preValues = rules.preBonusGames.map((entry) => entry.value);
check("prebonus-6-to-32g", Math.min(...preValues) >= 6 && Math.max(...preValues) <= 32 && preValues.includes(32), `range=${Math.min(...preValues)}-${Math.max(...preValues)}`);

const rateLabels = rules.continuationRates.map((rate) => rate.label);
check("continuation-rate-set", ["66%", "79%", "84%", "89%"].every((label) => rateLabels.includes(label)), rateLabels.join(","));

const middleCherry = {
  low: rules.modeTransitions.low.strongCherry.preBonus,
  normal: rules.modeTransitions.normal.strongCherry.preBonus,
  high: rules.modeTransitions.high.strongCherry.preBonus,
};
check(
  "middle-cherry-mode-pressure",
  middleCherry.low < middleCherry.normal && middleCherry.normal < middleCherry.high && middleCherry.high >= 0.6,
  JSON.stringify(middleCherry),
);

const symbolIds = rules.entrySymbols.map((symbol) => symbol.id);
check("entry-symbols", ["red", "gold", "belief"].every((id) => symbolIds.includes(id)), symbolIds.join(","));

const beliefSymbol = rules.entrySymbols.find((symbol) => symbol.id === "belief");
check(
  "belief-symbol-high-rate-only",
  beliefSymbol && !beliefSymbol.rateWeights["66%"] && !beliefSymbol.rateWeights["79%"],
  JSON.stringify(beliefSymbol?.rateWeights || {}),
);

const rng = engine.createSeededRng(2026050802);
const symbolCounts = {};
const auraCounts = {};
for (let index = 0; index < 4000; index += 1) {
  const bonus = engine.createBonusState(rng);
  symbolCounts[bonus.entrySymbol] = (symbolCounts[bonus.entrySymbol] || 0) + 1;
  auraCounts[bonus.aura] = (auraCounts[bonus.aura] || 0) + 1;
}
check("bonus-symbol-simulation", symbolCounts.red > symbolCounts.gold && symbolCounts.gold > symbolCounts.belief, JSON.stringify(symbolCounts));
check("aura-simulation", Object.keys(auraCounts).length >= 4, JSON.stringify(auraCounts));

const battleBonus = {
  id: "normal",
  name: "バトルボーナス",
  effect: "rush",
  entrySymbol: "red",
  entrySymbolName: "赤ISM揃い",
  rate: 0.79,
  rateLabel: "79%",
  aura: "黄",
  set: 0,
  totalPayout: 0,
  milestoneReached: false,
};
const battleWin = engine.drawBattleSet(battleBonus, engine.createSeededRng(79), { continued: true, payout: 140 });
const battleLose = engine.drawBattleSet(battleBonus, engine.createSeededRng(66), { continued: false, payout: 140 });
check("battle-pattern-win", Boolean(battleWin.attack?.id && battleWin.defense?.id && battleWin.holdMs >= 900), JSON.stringify(battleWin));
check("battle-pattern-lose", battleLose.continued === false && battleLose.defense?.id === "collapse", JSON.stringify(battleLose));

const attackScene = effects.getBattleScene("attack", { ...battleWin, effectTier: "hot", bonusName: "バトルボーナス", totalPayout: 0, aura: "黄" });
const holdScene = effects.getBattleScene("hold", { ...battleWin, effectTier: "hot", bonusName: "バトルボーナス", totalPayout: 0, aura: "黄" });
check("battle-scene-stages", attackScene.title !== holdScene.title && holdScene.message.includes("止まる"), `${attackScene.title} / ${holdScene.title}`);

const passed = checks.filter((item) => item.passed).length;
const score = Math.round((passed / checks.length) * 100);
const result = {
  score,
  checks,
  quietRatio,
  middleCherry,
  symbolCounts,
  auraCounts,
  failures,
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
