(function registerSlotV2Rules(global) {
  const roles = [
    { id: "blank", name: "ハズレ", probability: null, payout: 0, heat: 0, targetable: false },
    { id: "bell", name: "ベル", probability: 1 / 40, payout: 8, heat: 1, targetable: true },
    { id: "replay", name: "リプレイ", probability: 1 / 7.3, payout: 0, heat: 0, replay: true, targetable: true },
    { id: "watermelon", name: "スイカ", probability: 1 / 119, payout: 6, heat: 3, rare: true, targetable: true },
    { id: "weakCherry", name: "角チェリー", probability: 1 / 135, payout: 2, heat: 2, rare: true, cherry: true, targetable: true },
    { id: "chance", name: "トシヤチャンス", probability: 1 / 180, payout: 1, heat: 4, rare: true, chance: true, targetable: true },
    { id: "strongCherry", name: "中段チェリー", probability: 1 / 247, payout: 2, heat: 5, rare: true, strongRare: true, cherry: true, targetable: true },
  ];

  const stageOrder = ["street", "heat", "deep"];

  global.ToshiyaSlotV2Rules = {
    version: 1,
    saveKey: "toshiyaizm-slot-v2-state",
    bet: 3,
    reel: {
      symbolCount: 16,
      cellHeight: 70,
      spinMsPerSymbol: 55,
      successWindowCells: 1,
      activeLines: [
        { id: "middle", label: "中段", rows: [1, 1, 1] },
        { id: "top", label: "上段", rows: [0, 0, 0] },
        { id: "bottom", label: "下段", rows: [2, 2, 2] },
        { id: "diagonalDown", label: "右下がり", rows: [0, 1, 2] },
        { id: "diagonalUp", label: "右上がり", rows: [2, 1, 0] },
      ],
      symbolStrips: [
        ["face", "replay", "seven", "cherry", "logo", "bell", "dogeza", "bar", "face", "replay", "seven", "cherry", "logo", "bell", "dogeza", "bar"],
        ["replay", "seven", "face", "bell", "cherry", "logo", "watermelon", "dogeza", "replay", "seven", "face", "bell", "cherry", "logo", "watermelon", "dogeza"],
        ["logo", "face", "dogeza", "bell", "seven", "watermelon", "replay", "cherry", "logo", "face", "dogeza", "bell", "seven", "watermelon", "replay", "cherry"],
      ],
      stopPatterns: {
        blank: [[0, 5, 9], [4, 11, 2], [8, 1, 13]],
        bell: [[4, 2, 2], [12, 10, 10]],
        replay: [[0, 7, 5], [8, 15, 13]],
        watermelon: [[7, 1, 0], [15, 9, 8]],
        weakCherry: [[1, 3, 6], [3, 11, 6]],
        chance: [[3, 4, 7], [11, 12, 15]],
        strongCherry: [[2, 3, 6], [2, 11, 14]],
        normal7: [[7, 7, 7]],
        toshiyaLogo: [[11, 11, 11]],
      },
      requiredReels: {
        bell: [0, 1, 2],
        replay: [0, 1, 2],
        watermelon: [0, 1, 2],
        weakCherry: [0],
        chance: [0, 1, 2],
        strongCherry: [0],
        normal7: [0, 1, 2],
        toshiyaLogo: [0, 1, 2],
      },
    },
    roles,
    internalStateLabels: {
      low: "低確",
      normal: "通常",
      high: "高確",
      prelude: "前兆",
      bonus: "ボーナス",
      bonusReady: "確定",
    },
    normalStages: {
      street: { label: "静", order: 0 },
      heat: { label: "ざわつき", order: 1 },
      deep: { label: "深い気配", order: 2 },
    },
    stageOrder,
    stageTransitions: {
      blank: { up: 0.03, down: 0.08, jumpDeep: 0.005 },
      bell: { up: 0.05, down: 0.06, jumpDeep: 0.01 },
      replay: { up: 0.05, down: 0.45, jumpDeep: 0.005 },
      weakCherry: { up: 0.45, down: 0.06, jumpDeep: 0.08 },
      watermelon: { up: 0.58, down: 0.04, jumpDeep: 0.14 },
      chance: { up: 0.65, down: 0.03, jumpDeep: 0.18 },
      strongCherry: { up: 0.78, down: 0.02, jumpDeep: 0.26 },
    },
    modeTransitions: {
      low: {
        weakCherry: { normal: 0.10 },
        watermelon: { normal: 0.25, high: 0.03 },
        chance: { normal: 0.20, high: 0.05, prelude: 0.01 },
        strongCherry: { normal: 0.50, prelude: 0.25 },
      },
      normal: {
        weakCherry: { high: 0.12 },
        watermelon: { high: 0.30, prelude: 0.05 },
        chance: { high: 0.25, prelude: 0.03 },
        strongCherry: { high: 0.25, prelude: 0.25 },
      },
      high: {
        weakCherry: { prelude: 0.15 },
        watermelon: { prelude: 0.25 },
        chance: { prelude: 0.25 },
        strongCherry: { prelude: 1.00 },
      },
    },
    preludeGames: Array.from({ length: 17 }, (_, index) => ({ value: index + 16, weight: 1 })),
    entrySymbols: [
      {
        id: "normal7",
        name: "通常7揃い",
        weight: 94,
        rateWeights: { "66%": 55, "79%": 30, "84%": 11, "89%": 4 },
        stockWeights: { 1: 70, 2: 24, 3: 6 },
      },
      {
        id: "toshiyaLogo",
        name: "トシヤロゴ揃い",
        weight: 6,
        premium: true,
        rateWeights: { "66%": 10, "79%": 35, "84%": 35, "89%": 20 },
        stockWeights: { 2: 30, 3: 28, 4: 20, 5: 12, 7: 7, 10: 3 },
      },
    ],
    entryBoostByRole: {
      chance: { toshiyaLogo: 10 },
      strongCherry: { toshiyaLogo: 12 },
    },
    continuationRates: {
      "66%": 0.66,
      "79%": 0.79,
      "84%": 0.84,
      "89%": 0.89,
    },
    bonus: {
      gamesPerSet: 30,
      roles: [
        { id: "bell", name: "ベル", payout: 8, weight: 50 },
        { id: "replay", name: "リプレイ", payout: 8, weight: 50 },
      ],
      revivalRate: 0.15,
      revivalMin: 0.10,
      revivalMax: 0.20,
      judgeZones: [
        { id: "early", from: 1, to: 10 },
        { id: "middle", from: 11, to: 20 },
        { id: "uneasy", from: 21, to: 27 },
        { id: "judge", from: 28, to: 30 },
      ],
    },
  };
})(globalThis);
