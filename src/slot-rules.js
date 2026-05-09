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
    version: 5,
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
      { id: "weakCherry", name: "角チェリー", payout: 2, weight: 45, rare: true, effect: "normal", heat: 2, slip: [1, 0, 0] },
      { id: "watermelon", name: "トシヤチャンス", payout: 6, weight: 28, rare: true, effect: "normal", heat: 3, slip: [1, 1, 0] },
      { id: "strongCherry", name: "中段チェリー", payout: 2, weight: 12, rare: true, effect: "rush", strongRare: true, heat: 5, slip: [2, 1, 1] },
      { id: "chance", name: "ISM目", payout: 1, weight: 8, rare: true, effect: "rush", strongRare: true, heat: 5, slip: [2, 2, 1] },
    ],
    modeTransitions: {
      low: {
        weakCherry: { low: 0.55, normal: 0.35, high: 0.08, preBonus: 0.02 },
        watermelon: { low: 0.57, normal: 0.25, high: 0.15, preBonus: 0.03 },
        strongCherry: { low: 0.18, normal: 0.22, high: 0.34, preBonus: 0.26 },
        chance: { low: 0.27, normal: 0.25, high: 0.3, preBonus: 0.18 },
      },
      normal: {
        weakCherry: { normal: 0.85, high: 0.12, preBonus: 0.03 },
        watermelon: { normal: 0.78, high: 0.18, preBonus: 0.04 },
        strongCherry: { normal: 0.2, high: 0.45, preBonus: 0.35 },
        chance: { normal: 0.35, high: 0.35, preBonus: 0.3 },
      },
      high: {
        weakCherry: { high: 0.92, preBonus: 0.08 },
        watermelon: { high: 0.88, preBonus: 0.12 },
        strongCherry: { high: 0.32, preBonus: 0.68 },
        chance: { high: 0.48, preBonus: 0.52 },
      },
    },
    preBonusGames: [
      { value: 6, weight: 2 },
      { value: 7, weight: 3 },
      { value: 8, weight: 4 },
      { value: 9, weight: 5 },
      { value: 10, weight: 6 },
      { value: 11, weight: 7 },
      { value: 12, weight: 8 },
      { value: 13, weight: 9 },
      { value: 14, weight: 9 },
      { value: 15, weight: 9 },
      { value: 16, weight: 8 },
      { value: 17, weight: 8 },
      { value: 18, weight: 8 },
      { value: 19, weight: 7 },
      { value: 20, weight: 7 },
      { value: 21, weight: 7 },
      { value: 22, weight: 6 },
      { value: 23, weight: 6 },
      { value: 24, weight: 6 },
      { value: 25, weight: 5 },
      { value: 26, weight: 5 },
      { value: 27, weight: 5 },
      { value: 28, weight: 4 },
      { value: 29, weight: 4 },
      { value: 30, weight: 3 },
      { value: 31, weight: 3 },
      { value: 32, weight: 2 },
    ],
    continuationRates: [
      { value: 0.66, label: "66%", weight: 55 },
      { value: 0.79, label: "79%", weight: 28 },
      { value: 0.84, label: "84%", weight: 12 },
      { value: 0.89, label: "89%", weight: 5 },
    ],
    entrySymbols: [
      { id: "red", name: "赤ISM揃い", bonusId: "normal", effect: "rush", weight: 86, rateWeights: { "66%": 58, "79%": 27, "84%": 11, "89%": 4 } },
      { id: "gold", name: "金ISM揃い", bonusId: "normal", effect: "rush", weight: 11, rateWeights: { "79%": 52, "84%": 33, "89%": 15 } },
      { id: "belief", name: "信念図柄揃い", bonusId: "upper", effect: "premium", weight: 3, rateWeights: { "84%": 55, "89%": 45 } },
    ],
    auraByRate: {
      "66%": [
        { value: "白", weight: 52 },
        { value: "青", weight: 30 },
        { value: "黄", weight: 13 },
        { value: "赤", weight: 5 },
      ],
      "79%": [
        { value: "青", weight: 38 },
        { value: "黄", weight: 32 },
        { value: "緑", weight: 20 },
        { value: "赤", weight: 9 },
        { value: "虹", weight: 1 },
      ],
      "84%": [
        { value: "黄", weight: 24 },
        { value: "緑", weight: 42 },
        { value: "赤", weight: 28 },
        { value: "虹", weight: 6 },
      ],
      "89%": [
        { value: "緑", weight: 24 },
        { value: "赤", weight: 42 },
        { value: "虹", weight: 34 },
      ],
    },
    bonusTypes: [
      { id: "normal", name: "バトルボーナス", weight: 82, effect: "rush", payoutMin: 120, payoutMax: 160 },
      { id: "upper", name: "上位バトルボーナス", weight: 18, effect: "premium", payoutMin: 150, payoutMax: 190, rateBoost: 1 },
    ],
    bonusGame: {
      gamesPerSet: 30,
      roles: [
        { roleId: "bell", name: "ベル", payout: 8, weight: 50 },
        { roleId: "replay", name: "Tリプレイ", payout: 8, weight: 50 },
      ],
    },
    postBonusModes: {
      normal: { low: 0.45, normal: 0.4, high: 0.15 },
      normalLong: { low: 0.25, normal: 0.45, high: 0.25, preBonus: 0.05 },
      upper: { normal: 0.35, high: 0.55, preBonus: 0.1 },
      highest: { normal: 0.25, high: 0.55, preBonus: 0.2 },
    },
    battle: {
      milestoneSet: 20,
      resolvePayout: 0,
      stages: ["faceoff", "attack", "hold", "resolve"],
      attackPatterns: [
        {
          id: "toshiyaFirst",
          name: "先制",
          danger: 0,
          holdMs: 900,
          continuedWeights: { toshiyaFirst: 100 },
          endedWeights: {},
        },
        {
          id: "light",
          name: "軽打",
          danger: 1,
          holdMs: 1250,
          continuedWeights: { dodge: 38, counter: 42, stand: 20 },
          endedWeights: { collapse: 100 },
        },
        {
          id: "middle",
          name: "蹴撃",
          danger: 2,
          holdMs: 1550,
          continuedWeights: { dodge: 20, counter: 26, stand: 44, revival: 10 },
          endedWeights: { collapse: 100 },
        },
        {
          id: "heavy",
          name: "大圧",
          danger: 3,
          holdMs: 2050,
          continuedWeights: { stand: 58, revival: 42 },
          endedWeights: { collapse: 100 },
        },
      ],
      attackWeights: {
        continued: { toshiyaFirst: 14, light: 42, middle: 30, heavy: 14 },
        ended: { light: 18, middle: 42, heavy: 40 },
      },
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
