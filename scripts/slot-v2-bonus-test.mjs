import "../src/v2/slot-v2-rules.js";
import "../src/v2/slot-v2-engine.js";
import "../src/v2/slot-v2-reels.js";

const rules = globalThis.ToshiyaSlotV2Rules;
const engine = globalThis.ToshiyaSlotV2Engine;
const reels = globalThis.ToshiyaSlotV2Reels;
const failed = [];

const logoPending = {
  entrySymbol: "toshiyaLogo",
  entryName: "トシヤロゴ揃い",
  rateLabel: "89%",
  rate: 0.89,
  stockSets: 3,
  premium: true,
};
const start = engine.startBonus(engine.initialState({
  internalState: "bonusReady",
  pendingBonus: logoPending,
  coins: 1000,
}), engine.createSequenceRng([0.99]));

if (start.openingRole.id !== "toshiyaLogo") failed.push("logo bonus did not open with logo role");
if (start.nextState.bonus.setGames !== 30 || start.nextState.bonus.gamesInSet !== 0) failed.push("bonus did not start at 0/30G");
if (!start.nextState.bonus.currentSetPlan.continued || !start.nextState.bonus.currentSetPlan.usedStock) {
  failed.push("stock did not guarantee first set continuation");
}
if (start.nextState.bonus.stockSets !== 2) failed.push("stock was not consumed when set plan was made");

let bonusState = start.nextState;
const bell = { ...rules.roles.find((role) => role.id === "bell"), payout: 8, bonusGame: true, targetable: true };
const success = reels.evaluateStops(bell, reels.pickStopPattern(bell, engine.createSeededRng(31)));
for (let index = 0; index < 30; index += 1) {
  bonusState = engine.resolveBonusGame(bonusState, success, engine.createSeededRng(index + 1), bell).nextState;
}
if (bonusState.bonus.gamesInSet !== 30 || bonusState.bonus.totalPayout !== 240) failed.push("30G bonus payout/progress invalid");

const continued = engine.resolveBonusJudge(bonusState, engine.createSequenceRng([0.99]));
if (!continued.plan.continued || continued.nextState.bonus.setNumber !== 2 || continued.nextState.bonus.gamesInSet !== 0) {
  failed.push("continued judge did not advance to next set");
}

const entryCounts = { normal7: 0, toshiyaLogo: 0 };
const rateCounts = { "66%": 0, "79%": 0, "84%": 0, "89%": 0 };
const stockCounts = {};
const logoRng = engine.createSeededRng(2026050903);
for (let index = 0; index < 6000; index += 1) {
  const pending = engine.drawPendingBonus(logoRng, "strongCherry");
  entryCounts[pending.entrySymbol] += 1;
  if (pending.entrySymbol === "toshiyaLogo") {
    rateCounts[pending.rateLabel] += 1;
    stockCounts[pending.stockSets] = (stockCounts[pending.stockSets] || 0) + 1;
  }
}
if (entryCounts.toshiyaLogo <= 500) failed.push("strong cherry did not boost logo entries");
if ((rateCounts["84%"] + rateCounts["89%"]) <= (rateCounts["66%"] + rateCounts["79%"])) {
  failed.push("logo entries are not biased to high continuation rates");
}
if (Object.keys(stockCounts).some((value) => Number(value) >= 20)) failed.push("logo stock table implies completion guarantee");

const revivalRng = engine.createSeededRng(2026050904);
let continuedWithoutStock = 0;
let revivals = 0;
for (let index = 0; index < 20000; index += 1) {
  const plan = engine.startBonusSet({ rate: 0.89, rateLabel: "89%", stockSets: 0 }, revivalRng);
  if (plan.continued) {
    continuedWithoutStock += 1;
    if (plan.revival) revivals += 1;
  }
}
const revivalRate = revivals / continuedWithoutStock;
if (revivalRate < rules.bonus.revivalMin || revivalRate > rules.bonus.revivalMax) {
  failed.push(`revival rate out of range: ${revivalRate}`);
}

console.log(JSON.stringify({ failed, entryCounts, rateCounts, stockCounts, revivalRate }, null, 2));
if (failed.length) process.exitCode = 1;
