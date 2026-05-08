(function registerSlotRules(global) {
  const fixedBet = 3;

  const stopPatterns = {
    premium: [
      [7, 7, 7],
      [0, 0, 0],
    ],
    rush: [
      [5, 5, 5],
      [2, 2, 2],
    ],
    normal: [
      [3, 3, 3],
      [1, 1, 1],
    ],
    lose: [
      [0, 3, 6],
      [1, 5, 2],
      [2, 7, 4],
      [4, 0, 5],
      [6, 2, 7],
    ],
  };

  global.ToshiyaSlotRules = {
    version: 3,
    bet: fixedBet,
    modeLabels: {
      low: "低確",
      normal: "通常",
      high: "高確",
      preBonus: "前兆",
      bonusReady: "確定",
    },
    roles: [
      { id: "blank", name: "ハズレ", payout: 0, weight: 437, effect: "lose", heat: 0, quiet: true },
      { id: "replay", name: "Tリプレイ", payout: 0, weight: 220, effect: "lose", heat: 0, quiet: true },
      { id: "bell", name: "ベル", payout: 8, weight: 230, effect: "normal", heat: 1 },
      { id: "weakCherry", name: "弱チェリー", payout: 2, weight: 45, rare: true, effect: "normal", heat: 2, slip: [1, 0, 0] },
      { id: "watermelon", name: "トシヤチャンス", payout: 6, weight: 28, rare: true, effect: "normal", heat: 3, slip: [1, 1, 0] },
      { id: "strongCherry", name: "強チェリー", payout: 2, weight: 12, rare: true, effect: "rush", strongRare: true, heat: 5, slip: [2, 1, 1] },
      { id: "chance", name: "ISM目", payout: 1, weight: 8, rare: true, effect: "rush", strongRare: true, heat: 5, slip: [2, 2, 1] },
    ],
    modeTransitions: {
      low: {
        weakCherry: { low: 0.55, normal: 0.35, high: 0.08, preBonus: 0.02 },
        watermelon: { low: 0.57, normal: 0.25, high: 0.15, preBonus: 0.03 },
        strongCherry: { low: 0.18, normal: 0.25, high: 0.35, preBonus: 0.22 },
        chance: { low: 0.27, normal: 0.25, high: 0.3, preBonus: 0.18 },
      },
      normal: {
        weakCherry: { normal: 0.85, high: 0.12, preBonus: 0.03 },
        watermelon: { normal: 0.78, high: 0.18, preBonus: 0.04 },
        strongCherry: { normal: 0.3, high: 0.45, preBonus: 0.25 },
        chance: { normal: 0.45, high: 0.35, preBonus: 0.2 },
      },
      high: {
        weakCherry: { high: 0.92, preBonus: 0.08 },
        watermelon: { high: 0.88, preBonus: 0.12 },
        strongCherry: { high: 0.62, preBonus: 0.38 },
        chance: { high: 0.7, preBonus: 0.3 },
      },
    },
    preBonusGames: [
      { value: 3, weight: 18 },
      { value: 4, weight: 30 },
      { value: 5, weight: 26 },
      { value: 6, weight: 18 },
      { value: 7, weight: 8 },
    ],
    continuationRates: [
      { value: 0.66, label: "66%", weight: 55 },
      { value: 0.79, label: "79%", weight: 28 },
      { value: 0.84, label: "84%", weight: 12 },
      { value: 0.88, label: "88%", weight: 5 },
    ],
    bonusTypes: [
      { id: "normal", name: "バトルボーナス", weight: 82, effect: "rush", payoutMin: 120, payoutMax: 160 },
      { id: "upper", name: "上位バトルボーナス", weight: 18, effect: "premium", payoutMin: 150, payoutMax: 190, rateBoost: 1 },
    ],
    postBonusModes: {
      normal: { low: 0.45, normal: 0.4, high: 0.15 },
      normalLong: { low: 0.25, normal: 0.45, high: 0.25, preBonus: 0.05 },
      upper: { normal: 0.35, high: 0.55, preBonus: 0.1 },
      highest: { normal: 0.25, high: 0.55, preBonus: 0.2 },
    },
    battle: {
      milestoneSet: 20,
      stages: ["faceoff", "attack", "hold", "resolve"],
    },
    stopPatterns,
    roleStopPatterns: {
      blank: stopPatterns.lose,
      replay: [
        [0, 7, 5],
        [8, 7, 13],
      ],
      bell: [
        [4, 2, 2],
        [12, 10, 10],
      ],
      weakCherry: [
        [1, 3, 6],
        [3, 11, 6],
      ],
      watermelon: [
        [7, 1, 0],
        [7, 9, 8],
      ],
      strongCherry: [
        [2, 3, 6],
        [2, 11, 6],
      ],
      chance: [
        [3, 4, 7],
        [11, 12, 7],
      ],
    },
  };
})(globalThis);
