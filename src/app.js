const board = document.querySelector("#mockStage");
const modeToggle = document.querySelector("#modeToggle");
const topEffect = document.querySelector("#topEffect");
const effectScreen = document.querySelector("#effectScreen");
const commentStream = document.querySelector("#commentStream");
const spinButton = document.querySelector("#spinButton");
const stopButtons = [...document.querySelectorAll("[data-stop]")];
const betButtons = [...document.querySelectorAll("[data-bet-step]")];
const reels = [...document.querySelectorAll(".live-reel")];
const coinDisplay = document.querySelector("#coinDisplay");
const betDisplay = document.querySelector("#betDisplay");
const lineDisplay = document.querySelector("#lineDisplay");
const resultDisplay = document.querySelector("#resultDisplay");
const totalGameDisplay = document.querySelector("#totalGameDisplay");
const bonusGameDisplay = document.querySelector("#bonusGameDisplay");
const modeDisplay = document.querySelector("#modeDisplay");
const roleDisplay = document.querySelector("#roleDisplay");
const bonusInfoDisplay = document.querySelector("#bonusInfoDisplay");
const bonusStartButton = document.querySelector("#bonusStartButton");
const shopList = document.querySelector("#shopList");
const ownedTray = document.querySelector("#ownedTray");
const utilityTabs = [...document.querySelectorAll("[data-panel-tab]")];
const utilityContents = [...document.querySelectorAll("[data-panel-content]")];
const issueAikotoba = document.querySelector("#issueAikotoba");
const restoreAikotoba = document.querySelector("#restoreAikotoba");
const aikotobaOutput = document.querySelector("#aikotobaOutput");
const aikotobaInput = document.querySelector("#aikotobaInput");
const aikotobaMessage = document.querySelector("#aikotobaMessage");
const imagePrompt = document.querySelector("#imagePrompt");
const generateImageButton = document.querySelector("#generateImageButton");
const imagegenMessage = document.querySelector("#imagegenMessage");
const imagegenPreview = document.querySelector("#imagegenPreview");
const imagegenImage = document.querySelector("#imagegenImage");
const debugToggle = document.querySelector("#debugToggle");
const debugControls = document.querySelector("#debugControls");
const debugCopy = document.querySelector("#debugCopy");
const debugReset = document.querySelector("#debugReset");
const debugOutput = document.querySelector("#debugOutput");
const debugState = document.querySelector("#debugState");
const soundToggle = document.querySelector("#soundToggle");

const slotRules = window.ToshiyaSlotRules;
const slotEngine = window.ToshiyaSlotEngine;
const slotEffects = window.ToshiyaEffectSequences;
const slotAudio = window.ToshiyaSlotAudio?.create();

const debugDefaults = {
  "--play-machine-w": 1536,
  "--play-machine-h": 1024,
  "--board-x": 0,
  "--board-y": 0,
  "--board-w": 1536,
  "--board-h": 1024,
  "--top-x": 500,
  "--top-y": 40,
  "--top-w": 530,
  "--top-h": 140,
  "--screen-x": 450,
  "--screen-y": 224,
  "--screen-w": 635,
  "--screen-h": 347,
  "--reels-x": 500,
  "--reels-y": 611,
  "--reels-w": 519,
  "--reels-h": 205,
  "--reel-w": 159,
  "--reel-left-w": 164,
  "--reel-center-w": 159,
  "--reel-right-w": 156,
  "--reel-gap": 20,
  "--glass-x": 500,
  "--glass-y": 608,
  "--glass-w": 519,
  "--glass-h": 205,
  "--spin-x": 534,
  "--spin-y": 838,
  "--spin-w": 88,
  "--spin-h": 50,
  "--stop-x": 648,
  "--stop-y": 874,
  "--stop-size": 76,
  "--stop-gap": 18,
};

const debugGroups = [
  ["プレイ筐体", ["--play-machine-w", "--play-machine-h"]],
  ["筐体画像", ["--board-x", "--board-y", "--board-w", "--board-h"]],
  ["信念サイン", ["--top-x", "--top-y", "--top-w", "--top-h"]],
  ["演出画面", ["--screen-x", "--screen-y", "--screen-w", "--screen-h"]],
  ["リール", ["--reels-x", "--reels-y", "--reels-w", "--reels-h", "--reel-w", "--reel-left-w", "--reel-center-w", "--reel-right-w", "--reel-gap"]],
  ["リール影", ["--glass-x", "--glass-y", "--glass-w", "--glass-h"]],
  ["回すボタン", ["--spin-x", "--spin-y", "--spin-w", "--spin-h"]],
  ["停止ボタン", ["--stop-x", "--stop-y", "--stop-size", "--stop-gap"]],
];

const debugLabels = {
  x: "横",
  y: "縦",
  w: "幅",
  h: "高",
  size: "径",
  gap: "間",
};

const debugStorageKey = "toshiyaizm-debug-layout-room-full-v3";
const betStorageKey = "toshiyaizm-bet-count-v1";
const gameStorageKey = "toshiyaizm-game-state-v2";
const imagePromptMaxLength = 1200;
let debugValues = { ...debugDefaults };

const state = {
  spinning: false,
  stopped: [true, true, true],
  coins: 300,
  bet: 3,
  totalGames: 0,
  gamesSinceBonus: 0,
  mode: "normal",
  phase: "normal",
  preBonusRemaining: 0,
  pendingRole: null,
  pendingPayout: 0,
  pendingMessage: "",
  currentResult: null,
  effectPlan: null,
  lastPayout: 0,
  bonusBattleAnimating: false,
  battleStage: "idle",
  battleOutcome: null,
  lastBattle: null,
  lastEngineEvent: null,
  lastSlip: [0, 0, 0],
  lastRandomSeed: null,
  testMode: false,
  pendingBonus: null,
  bonus: null,
  lastBonusSummary: null,
  ownedItems: [],
};

const betProfiles = {
  3: { lines: 5, label: "3枚固定・上中下＋斜め 5ライン", payoutMultiplier: 1 },
};
const betOptions = Object.keys(betProfiles).map(Number);
const fixedBet = 3;
const resultTable = [
  { id: "premium", name: "覚醒トシヤイズム", lamp: "虹の信念", payout: 5000, threshold: 0.005 },
  { id: "rush", name: "イズムラッシュ", lamp: "激アツ", payout: 800, threshold: 0.05 },
  { id: "normal", name: "トシヤボーナス", lamp: "当たり", payout: 100, threshold: 0.22 },
  { id: "lose", name: "ハズレ", lamp: "静寂", payout: 0, threshold: 1 },
];

const gameRules = {
  bet: fixedBet,
  roles: [
    { id: "blank", name: "ハズレ", payout: 0, weight: 437, effect: "lose" },
    { id: "replay", name: "Tリプレイ", payout: 0, weight: 220, effect: "lose" },
    { id: "bell", name: "ベル", payout: 8, weight: 230, effect: "normal" },
    { id: "weakCherry", name: "角チェリー", payout: 2, weight: 45, rare: true, effect: "normal" },
    { id: "watermelon", name: "トシヤチャンス", payout: 6, weight: 28, rare: true, effect: "normal" },
    { id: "strongCherry", name: "中段チェリー", payout: 2, weight: 12, rare: true, effect: "rush" },
    { id: "chance", name: "ISM目", payout: 1, weight: 8, rare: true, effect: "rush" },
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
    { value: 0.89, label: "89%", weight: 5 },
  ],
  bonusTypes: [
    { id: "normal", name: "バトルボーナス", weight: 82, effect: "rush", payoutMin: 120, payoutMax: 160 },
    { id: "upper", name: "上位バトルボーナス", weight: 18, effect: "premium", payoutMin: 150, payoutMax: 190, rateBoost: 1 },
  ],
  postBonusModes: {
    normal: { low: 0.45, normal: 0.4, high: 0.15 },
    upper: { normal: 0.45, high: 0.55 },
  },
};

const modeLabels = {
  low: "低確",
  normal: "通常",
  high: "高確",
  preBonus: "前兆",
  bonusReady: "確定",
};

let currentStops = [0, 0, 0];
const effectClassNames = ["effect-normal", "effect-hot", "effect-premium", "effect-lose"];
const commentProfiles = window.ToshiyaCommentProfiles || {};
const commentTierCounts = { normal: 3, hot: 5, premium: 7, lose: 3 };
let commentTimers = [];
let testRandomQueue = [];
let virtualTimeEnabled = false;
let virtualNow = 0;
let virtualTimerId = 1;
let virtualTimers = [];

function nextRandom() {
  if (testRandomQueue.length) return Number(testRandomQueue.shift());
  return Math.random();
}

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

const roleStopPatterns = {
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
};

const effectPlans = {
  premium: {
    tier: "premium",
    top: "虹の信念",
    intro: {
      label: "フリーズ",
      title: "全停止まで瞬き禁止",
      message: "虹の導線が、信念を揃えに来ている。",
    },
    stops: [
      { top: "第一停止・虹", label: "違和感", title: "時が止まる", message: "左リールに異様な圧が宿る。" },
      { top: "第二停止・覚醒", label: "確信", title: "イズム臨界", message: "コメント欄の熱量が振り切れる。" },
      { top: "第三停止・祝", label: "完走", title: "覚醒確定", message: "最後の一押しで伝説が開く。" },
    ],
    final: {
      label: "フリーズ",
      title: "覚醒トシヤイズム",
      message: "信念、上位到達。",
    },
  },
  rush: {
    tier: "hot",
    top: "激アツ",
    intro: {
      label: "金文字",
      title: "イズムラッシュ接近",
      message: "停止ごとに熱が上がる。",
    },
    stops: [
      { top: "第一停止・好機", label: "ざわざわ", title: "金の気配", message: "まだ押し切れる温度だ。" },
      { top: "第二停止・激熱", label: "チャンス", title: "ラッシュ目前", message: "信念の音が大きくなる。" },
      { top: "第三停止・突入", label: "告知", title: "ラッシュ告知", message: "熱量は本物だった。" },
    ],
    final: {
      label: "金文字",
      title: "イズムラッシュ",
      message: "まとまったメダルを獲得。",
    },
  },
  normal: {
    tier: "normal",
    top: "当たり",
    intro: {
      label: "前兆",
      title: "トシヤチャンス",
      message: "小さな違和感が走る。",
    },
    stops: [
      { top: "第一停止・小役", label: "予感", title: "悪くない形", message: "左から信念が残る。" },
      { top: "第二停止・期待", label: "継続", title: "まだある", message: "中リールで期待がつながる。" },
      { top: "第三停止・当選", label: "ボーナス", title: "トシヤボーナス", message: "堅実な当たりを掴んだ。" },
    ],
    final: {
      label: "ボーナス",
      title: "トシヤボーナス",
      message: "次の大波に備える。",
    },
  },
  lose: {
    tier: "lose",
    top: "静寂",
    intro: {
      label: "通常",
      title: "コメント欄が静か",
      message: "停止ボタンで流れを見届ける。",
    },
    stops: [
      { top: "第一停止・静", label: "通常", title: "まだ静か", message: "左リールは淡々と止まった。" },
      { top: "第二停止・弱", label: "様子見", title: "信念待ち", message: "熱い文字はまだ出ない。" },
      { top: "第三停止・次回", label: "通常", title: "まあね……", message: "次の信念に期待。" },
    ],
    final: {
      label: "通常",
      title: "まあね……",
      message: "次の信念に期待。",
    },
  },
};

const assetBasePath = "./assets/effects/runtime/";
const effectAssets = {
  premium: {
    top: ["sign_premium_rainbow.png"],
    screen: ["bg_premium_rainbow_ism.png"],
    final: ["bonus_ism_awakening.png"],
  },
  rush: {
    top: ["sign_hot_red_gold.png"],
    screen: ["bg_hot_racecourse.png", "bg_hot_baccarat_pressure.png"],
    final: ["bonus_race_miracle.png", "bonus_baccarat_climax.png"],
  },
  normal: {
    top: ["sign_idle_purple.png", "sign_chance_gold.png"],
    screen: [
      "bg_normal_stream_room.png",
      "bg_normal_midnight_room.png",
      "bg_chance_comments.png",
      "bg_chance_race_ticket.png",
      "bg_chance_baccarat_table.png",
      "bg_comic_lucky_misread.png",
      "bg_comic_stream_freeze.png",
      "bg_comic_baccarat_wrong_table.png",
    ],
    final: [
      "bonus_race_miracle.png",
      "bonus_baccarat_climax.png",
      "bonus_comic_accidental_win.png",
      "bonus_comic_dogeza_revival.png",
    ],
  },
  lose: {
    top: ["sign_idle_purple.png"],
    screen: [
      "bg_normal_stream_room.png",
      "bg_normal_midnight_room.png",
      "bg_comic_empty_wallet_race.png",
      "bg_comic_stream_freeze.png",
      "bg_comic_baccarat_wrong_table.png",
    ],
    final: [
      "lose_back_view_racecourse.png",
      "lose_baccarat_silence.png",
      "lose_comic_table_collapse.png",
      "lose_comic_soul_escape.png",
    ],
  },
};

function setMode(isPlayMode) {
  board.classList.toggle("play-mode", isPlayMode);
  modeToggle.setAttribute("aria-pressed", String(isPlayMode));
}

function getBetProfile() {
  return betProfiles[state.bet] || betProfiles[3];
}

function drawResult() {
  const roll = Math.random();
  return resultTable.find((result) => roll < result.threshold) || resultTable.at(-1);
}

function pickWeighted(items) {
  return slotEngine.pickWeighted(items, nextRandom);
}

function pickWeightedMap(weightMap) {
  return slotEngine.pickWeightedMap(weightMap, nextRandom);
}

function drawRole() {
  return slotEngine.drawRole(nextRandom);
}

function drawPreBonusGames() {
  return slotEngine.drawPreBonusGames(nextRandom);
}

function getEffectResult(effectId, overrides = {}) {
  const source = slotEffects.resultTable || resultTable;
  const base = source.find((result) => result.id === effectId) || source.at(-1);
  return { ...base, ...overrides, payout: 0 };
}

function getStopsForResult(result) {
  const patterns = stopPatterns[result?.id] || stopPatterns.lose;
  return patterns[Math.floor(nextRandom() * patterns.length)].slice();
}

function getStopsForRole(role) {
  const patterns = (slotRules.roleStopPatterns || roleStopPatterns)[role?.id] || slotRules.stopPatterns.lose;
  return patterns[Math.floor(nextRandom() * patterns.length)].slice();
}

function processModeAfterRole(role) {
  const event = slotEngine.playNormalGame(state, nextRandom, role);
  state.mode = event.nextState.mode;
  state.preBonusRemaining = event.nextState.preBonusRemaining;
  state.pendingBonus = event.nextState.pendingBonus;
  state.lastEngineEvent = event;
  state.lastSlip = event.note.slip || [0, 0, 0];
  return event.note;
}

function getEffectIdForSpin(role, modeNote) {
  return state.lastEngineEvent?.effectId || (modeNote.becameReady ? "premium" : role.effect || "lose");
}

function createSpinEffectPlan(role, modeNote, effectId) {
  const plan = buildEffectPlan(getEffectResult(effectId));
  const modeName = modeLabels[state.mode] || "通常";
  return slotEffects.decorateSpinPlan(plan, {
    role,
    modeNote,
    modeLabel: modeName,
    preBonusRemaining: state.preBonusRemaining,
  });
}

function buildEffectPlan(result) {
  const basePlan = slotEffects.effectPlans[result?.id] || slotEffects.effectPlans.lose;
  const assets = slotEffects.effectAssets[result?.id] || slotEffects.effectAssets.lose;
  return {
    ...basePlan,
    topAsset: pickAsset(assets.top),
    screenAsset: pickAsset(assets.screen),
    finalAsset: pickAsset(assets.final || assets.screen),
  };
}

function buildBattleVisualPlan(scene, effectId) {
  const result = getEffectResult(scene.tier === "lose" ? "lose" : effectId);
  const plan = buildEffectPlan(result);
  const battleAssets = slotEffects.effectAssets.battle?.[scene.assetGroup] || [];
  const battleAsset = pickAsset(battleAssets);
  return {
    ...plan,
    tier: scene.tier || plan.tier,
    top: scene.top,
    screenAsset: battleAsset || plan.screenAsset,
    finalAsset: battleAsset || plan.finalAsset,
  };
}

function pickAsset(assets) {
  if (!assets?.length) return null;
  return assets[Math.floor(nextRandom() * assets.length)];
}

function asCssUrl(asset) {
  const runtimeAsset = asset?.replace(/\.png$/i, ".webp");
  return runtimeAsset ? `url("${assetBasePath}${runtimeAsset}")` : "none";
}

function setEffectVisual(plan, isFinal = false) {
  topEffect.style.backgroundImage = `${asCssUrl(plan.topAsset)}, radial-gradient(circle, rgba(255, 255, 255, 0.2), transparent 58%)`;
  topEffect.style.backgroundSize = "cover, cover";
  topEffect.style.backgroundPosition = "center, center";
  const screenImage = asCssUrl(isFinal ? plan.finalAsset : plan.screenAsset);
  effectScreen.style.setProperty("--effect-image", "none");
  effectScreen.style.backgroundImage = `
    radial-gradient(circle at 44% 44%, rgba(255, 255, 255, 0.26), transparent 8%),
    linear-gradient(135deg, transparent 26%, rgba(255, 255, 255, 0.22) 28%, transparent 32%),
    linear-gradient(180deg, rgba(9, 2, 18, 0.18), rgba(0, 0, 0, 0.36)),
    ${screenImage},
    radial-gradient(circle, rgba(142, 67, 255, 0.36), rgba(0, 0, 0, 0.9) 68%)
  `;
  effectScreen.style.backgroundSize = "auto, auto, auto, cover, auto";
  effectScreen.style.backgroundPosition = "center, center, center, center, center";
}

function setEffectClass(tier) {
  topEffect.classList.remove(...effectClassNames);
  effectScreen.classList.remove(...effectClassNames);
  board.classList.remove(...effectClassNames);
  const className = `effect-${tier || "normal"}`;
  if (effectClassNames.includes(className)) {
    topEffect.classList.add(className);
    effectScreen.classList.add(className);
    board.classList.add(className);
  }
}

function setTopEffectText(text) {
  topEffect.querySelector("strong").textContent = text;
}

function setEffectScreenContent(scene, payout = null) {
  const payoutText = payout !== null
    ? `<span>${scene.message}${payout > 0 ? ` / ${payout.toLocaleString("ja-JP")}枚 獲得` : ""}</span>`
    : `<span>${scene.message}</span>`;
  effectScreen.innerHTML = `<p>${scene.label}</p><strong>${scene.title}</strong>${payoutText}`;
}

function getCommentPool(tier) {
  const normalizedTier = tier === "rush" ? "hot" : tier || "normal";
  return [
    ...(commentProfiles.common || []),
    ...(commentProfiles[normalizedTier] || []),
  ];
}

function pickCommentName() {
  const names = commentProfiles.names || ["リスナー"];
  return names[Math.floor(nextRandom() * names.length)];
}

function showStreamComment(tier, text, index) {
  if (!commentStream || !text) return;
  const item = document.createElement("span");
  item.className = `stream-comment stream-comment--${tier || "normal"}`;
  item.style.setProperty("--comment-y", `${10 + nextRandom() * 76}%`);
  item.style.setProperty("--comment-duration", `${3.2 + nextRandom() * 1.1}s`);
  const name = document.createElement("b");
  name.textContent = pickCommentName();
  const body = document.createElement("em");
  body.textContent = text;
  item.append(name, body);
  commentStream.append(item);

  const delay = index * 90;
  item.style.animationDelay = `${delay}ms`;
  const cleanupTimer = window.setTimeout(() => item.remove(), 5400 + delay);
  commentTimers.push(cleanupTimer);

  while (commentStream.children.length > 10) {
    commentStream.firstElementChild?.remove();
  }
}

function burstStreamComments(tier, amount = null) {
  const normalizedTier = tier === "rush" ? "hot" : tier || "normal";
  const pool = getCommentPool(normalizedTier);
  const count = amount ?? commentTierCounts[normalizedTier] ?? 4;
  for (let index = 0; index < count; index += 1) {
    const text = pool[Math.floor(nextRandom() * pool.length)];
    const timer = window.setTimeout(() => showStreamComment(normalizedTier, text, index), index * 120);
    commentTimers.push(timer);
  }
}

function clearStreamComments() {
  if (!commentStream) return;
  commentTimers.forEach((timer) => window.clearTimeout(timer));
  commentTimers = [];
  commentStream.innerHTML = "";
}

function scheduleGameTimer(callback, delay) {
  if (!virtualTimeEnabled) return window.setTimeout(callback, delay);
  const timer = { id: virtualTimerId, due: virtualNow + delay, callback };
  virtualTimerId += 1;
  virtualTimers.push(timer);
  virtualTimers.sort((a, b) => a.due - b.due);
  return timer.id;
}

function clearGameTimers() {
  virtualTimers = [];
}

function advanceVirtualTime(ms) {
  virtualTimeEnabled = true;
  virtualNow += Math.max(0, Number(ms) || 0);
  let guard = 0;
  while (virtualTimers.length && virtualTimers[0].due <= virtualNow && guard < 100) {
    const timer = virtualTimers.shift();
    timer.callback();
    guard += 1;
  }
  renderControls();
  return renderGameToText();
}

function renderEffectStep(stopCount) {
  const plan = state.effectPlan || buildEffectPlan(state.currentResult);
  const scene = plan.stops[Math.max(0, stopCount - 1)] || plan.intro;
  setTopEffectText(scene.top || plan.top);
  setEffectScreenContent(scene);
  burstStreamComments(plan.tier, Math.max(2, stopCount + 1));
}

function renderStatus() {
  const betProfile = getBetProfile();
  coinDisplay.textContent = state.coins.toLocaleString("ja-JP");
  betDisplay.textContent = state.bet.toLocaleString("ja-JP");
  lineDisplay.textContent = `${betProfile.lines}ライン固定`;
  lineDisplay.title = betProfile.label;
  board.dataset.bet = String(state.bet);
  if (totalGameDisplay) totalGameDisplay.textContent = state.totalGames.toLocaleString("ja-JP");
  if (bonusGameDisplay) bonusGameDisplay.textContent = state.gamesSinceBonus.toLocaleString("ja-JP");
  if (modeDisplay) {
    const modeName = state.phase === "battleBonus" ? "BB中" : (modeLabels[state.mode] || "通常");
    modeDisplay.textContent = modeName;
    modeDisplay.title = state.preBonusRemaining > 0 ? `前兆残り${state.preBonusRemaining}G` : modeName;
  }
  if (roleDisplay) {
    roleDisplay.textContent = state.pendingRole?.name || "待機";
  }
  if (bonusInfoDisplay) {
    if (state.bonus) {
      bonusInfoDisplay.textContent = state.bonusBattleAnimating
        ? `BATTLE ${state.bonus.rateLabel}`
        : `${state.bonus.set}SET ${state.bonus.rateLabel}`;
      bonusInfoDisplay.title = `${state.bonus.name} / 合計${state.bonus.totalPayout.toLocaleString("ja-JP")}枚`;
    } else if (state.pendingBonus) {
      bonusInfoDisplay.textContent = `確定 ${state.pendingBonus.rateLabel}`;
      bonusInfoDisplay.title = state.pendingBonus.name;
    } else if (state.lastBonusSummary) {
      bonusInfoDisplay.textContent = state.lastBonusSummary;
      bonusInfoDisplay.title = state.lastBonusSummary;
    } else {
      bonusInfoDisplay.textContent = "-";
      bonusInfoDisplay.title = "";
    }
  }
  if (state.bonusBattleAnimating) {
    resultDisplay.textContent = "勝負中";
  } else if (state.spinning && state.currentResult) {
    resultDisplay.textContent = "抽選中";
  } else if (state.lastPayout > 0) {
    resultDisplay.textContent = `+${state.lastPayout}`;
  } else if (state.mode === "bonusReady") {
    resultDisplay.textContent = "確定";
  } else if (state.phase === "battleBonus") {
    resultDisplay.textContent = "BB中";
  } else if (state.pendingRole) {
    resultDisplay.textContent = state.pendingRole.name;
  } else {
    resultDisplay.textContent = "待機中";
  }
  renderShop();
  renderOwnedItems();
  renderDebugState();
}

function renderDebugState() {
  if (!debugState) return;
  const bonus = state.bonus || state.pendingBonus;
  const battleText = state.lastBattle
    ? `${state.battleStage}/${state.lastBattle.attackName || "-"}:${state.lastBattle.defenseName || "-"}`
    : `${state.battleStage}${state.battleOutcome ? `/${state.battleOutcome}` : ""}`;
  const lines = [
    `mode: ${state.phase === "battleBonus" ? "BB中" : modeLabels[state.mode] || state.mode}`,
    `pre: ${state.preBonusRemaining}`,
    `role: ${state.pendingRole?.id || "-"}`,
    `slip: ${state.lastSlip.join("/")}`,
    `battle: ${battleText}`,
    `rate: ${bonus?.rateLabel || "-"}`,
    `symbol: ${bonus?.entrySymbolName || "-"}`,
    `aura: ${bonus?.aura || "-"}`,
    `seed: ${state.lastRandomSeed || "-"}`,
  ];
  debugState.innerHTML = `
    <strong>検証状態</strong>
    <dl>${lines.map((line) => {
      const [key, value] = line.split(": ");
      return `<div><dt>${key}</dt><dd>${value}</dd></div>`;
    }).join("")}</dl>
  `;
}

function renderSoundToggle() {
  if (!soundToggle || !slotAudio) return;
  const muted = slotAudio.isMuted();
  soundToggle.setAttribute("aria-pressed", String(!muted));
  soundToggle.textContent = muted ? "音OFF" : "音ON";
}

function getSaveData() {
  return {
    version: slotRules.version,
    coins: state.coins,
    bet: fixedBet,
    totalGames: state.totalGames,
    gamesSinceBonus: state.gamesSinceBonus,
    mode: state.mode,
    phase: state.phase,
    preBonusRemaining: state.preBonusRemaining,
    pendingBonus: state.pendingBonus ? { ...state.pendingBonus } : null,
    bonus: state.bonus ? { ...state.bonus } : null,
    lastBonusSummary: state.lastBonusSummary,
    ownedItems: state.ownedItems.slice(),
  };
}

function isValidMode(mode) {
  return Object.hasOwn(modeLabels, mode);
}

function sanitizeBonus(rawBonus) {
  return slotEngine.sanitizeBonus(rawBonus);
}

function saveGameState() {
  localStorage.setItem(gameStorageKey, JSON.stringify(getSaveData()));
}

function applySaveData(data, options = {}) {
  state.coins = Math.max(0, Number(data.coins) || 0);
  state.bet = fixedBet;
  state.totalGames = Math.max(0, Number(data.totalGames) || 0);
  state.gamesSinceBonus = Math.max(0, Number(data.gamesSinceBonus) || 0);
  state.mode = isValidMode(data.mode) ? data.mode : "normal";
  state.phase = data.phase === "battleBonus" ? "battleBonus" : "normal";
  state.preBonusRemaining = Math.max(0, Number(data.preBonusRemaining) || 0);
  state.bonus = state.phase === "battleBonus" ? sanitizeBonus(data.bonus) : null;
  if (state.phase === "battleBonus" && !state.bonus) {
    state.phase = "normal";
  }
  state.pendingBonus = state.mode === "bonusReady" && state.phase !== "battleBonus"
    ? (sanitizeBonus(data.pendingBonus) || createBonusState())
    : null;
  state.lastBonusSummary = typeof data.lastBonusSummary === "string" ? data.lastBonusSummary : null;
  state.ownedItems = Array.isArray(data.ownedItems) ? data.ownedItems.slice() : [];
  state.currentResult = null;
  state.effectPlan = null;
  state.pendingRole = null;
  state.pendingPayout = 0;
  state.pendingMessage = "";
  state.lastPayout = 0;
  state.battleStage = "idle";
  state.battleOutcome = null;
  state.lastBattle = null;
  state.bonusBattleAnimating = false;
  state.lastEngineEvent = null;
  state.lastSlip = [0, 0, 0];
  clearGameTimers();
  if (options.persist !== false) {
    saveGameState();
  }
  renderControls();
  renderInitialEffect();
}

function loadGameState() {
  try {
    const saved = JSON.parse(localStorage.getItem(gameStorageKey) || "null");
    if (saved && typeof saved === "object") {
      applySaveData(saved, { persist: false });
      return;
    }
  } catch {
    // 壊れた保存は無視して初期状態で始める。
  }
  state.bet = fixedBet;
}

function renderGameToText() {
  return JSON.stringify({
    mode: board.classList.contains("play-mode") ? "play" : "full",
    internalMode: state.mode,
    phase: state.phase,
    spinning: state.spinning,
    stopped: state.stopped,
    coins: state.coins,
    bet: state.bet,
    totalGames: state.totalGames,
    gamesSinceBonus: state.gamesSinceBonus,
    preBonusRemaining: state.preBonusRemaining,
    pendingRole: state.pendingRole ? state.pendingRole.id : null,
    pendingRoleName: state.pendingRole ? state.pendingRole.name : null,
    currentResult: state.currentResult ? state.currentResult.id : null,
    effectTier: state.effectPlan ? state.effectPlan.tier : null,
    effectTone: state.effectPlan ? state.effectPlan.tone || null : null,
    lastPayout: state.lastPayout,
    bonusBattleAnimating: state.bonusBattleAnimating,
    battleStage: state.battleStage,
    battleOutcome: state.battleOutcome,
    lastBattle: state.lastBattle,
    lastSlip: state.lastSlip,
    lastEngineEvent: state.lastEngineEvent ? {
      effectId: state.lastEngineEvent.effectId,
      note: state.lastEngineEvent.note,
      role: state.lastEngineEvent.role?.id,
    } : null,
    pendingBonus: state.pendingBonus,
    bonus: state.bonus,
    ownedItems: state.ownedItems,
  });
}

function renderShop() {
  if (!shopList || !window.ToshiyaShopItems) return;
  shopList.innerHTML = window.ToshiyaShopItems.map((item) => {
    const owned = state.ownedItems.includes(item.id);
    const disabled = owned || state.coins < item.price;
    const buttonText = owned ? "購入済" : `${item.price}枚`;
    return `
      <article class="shop-item">
        <div class="shop-icon">${item.iconText}</div>
        <div>
          <strong>${item.name}</strong>
          <span>${item.description}</span>
          <button type="button" data-buy-item="${item.id}" ${disabled ? "disabled" : ""}>${buttonText}</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderOwnedItems() {
  if (!ownedTray || !window.ToshiyaShopItems) return;
  const owned = window.ToshiyaShopItems.filter((item) => state.ownedItems.includes(item.id));
  ownedTray.innerHTML = owned.length
    ? owned.map((item) => `<div class="owned-item" title="${item.name}">${item.iconText}</div>`).join("")
    : `<div class="owned-empty">購入した小物がここに並びます</div>`;
}

function buyItem(itemId) {
  const item = window.ToshiyaShopItems?.find((candidate) => candidate.id === itemId);
  if (!item || state.ownedItems.includes(item.id) || state.coins < item.price) return;
  state.coins -= item.price;
  state.ownedItems.push(item.id);
  state.lastPayout = 0;
  resultDisplay.textContent = "購入";
  saveGameState();
  renderControls();
}

function setImagegenMessage(message) {
  if (imagegenMessage) {
    imagegenMessage.textContent = message;
  }
}

function validateImagegenPrompt(value) {
  const prompt = String(value || "").trim();
  if (!prompt) return "画像生成の入力文を入力してください。";
  if (prompt.length > imagePromptMaxLength) return `画像生成の入力文は${imagePromptMaxLength}文字以内にしてください。`;
  return "";
}

async function generateImageFromPrompt() {
  const prompt = String(imagePrompt?.value || "").trim();
  const validationMessage = validateImagegenPrompt(prompt);
  if (validationMessage) {
    setImagegenMessage(validationMessage);
    return;
  }

  if (window.location.protocol === "file:") {
    setImagegenMessage("画像生成はローカルAPIサーバーから起動したときだけ使えます。");
    return;
  }

  generateImageButton.disabled = true;
  setImagegenMessage("画像を生成しています。");

  try {
    const response = await fetch("/api/images/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "画像生成に失敗しました。");
    }
    if (!payload.imageDataUrl) {
      throw new Error("画像データを取得できませんでした。");
    }

    imagegenImage.src = payload.imageDataUrl;
    imagegenPreview.hidden = false;
    setImagegenMessage(`${payload.model} / ${payload.size} / ${payload.quality}`);
  } catch (error) {
    setImagegenMessage(error.message || "画像生成に失敗しました。");
  } finally {
    generateImageButton.disabled = false;
  }
}

function normalizeBet(value) {
  return fixedBet;
}

function saveBet() {
  localStorage.setItem(betStorageKey, String(fixedBet));
}

function loadBet() {
  state.bet = fixedBet;
}

function changeBet(direction) {
  state.bet = fixedBet;
  renderControls();
}

function getDebugLabel(name) {
  const key = name.replace(/^--/, "").split("-").pop();
  return debugLabels[key] || key;
}

function saveDebugValues() {
  localStorage.setItem(debugStorageKey, JSON.stringify(debugValues));
}

function renderDebugOutput() {
  const lines = [":root {"];
  Object.entries(debugValues).forEach(([name, value]) => {
    lines.push(`  ${name}: ${value}px;`);
  });
  lines.push("}");
  debugOutput.value = lines.join("\n");
}

function applyDebugValues() {
  Object.entries(debugValues).forEach(([name, value]) => {
    document.documentElement.style.setProperty(name, `${value}px`);
  });
  document.querySelectorAll("[data-debug-var]").forEach((input) => {
    input.value = debugValues[input.dataset.debugVar];
  });
  renderDebugOutput();
}

function changeDebugValue(name, delta) {
  debugValues[name] = Number(debugValues[name]) + delta;
  applyDebugValues();
  saveDebugValues();
}

function buildDebugPanel() {
  debugControls.innerHTML = "";
  debugGroups.forEach(([title, names]) => {
    const group = document.createElement("section");
    group.className = "debug-group";
    group.innerHTML = `<strong>${title}</strong>`;

    names.forEach((name) => {
      const row = document.createElement("div");
      row.className = "debug-row";
      row.innerHTML = `
        <span>${getDebugLabel(name)}</span>
        <button type="button" data-debug-step="-10" data-debug-name="${name}">-10</button>
        <button type="button" data-debug-step="-1" data-debug-name="${name}">-1</button>
        <input type="number" data-debug-var="${name}" value="${debugValues[name]}">
        <button type="button" data-debug-step="1" data-debug-name="${name}">+1</button>
        <button type="button" data-debug-step="10" data-debug-name="${name}">+10</button>
      `;
      group.append(row);
    });

    debugControls.append(group);
  });

  debugControls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-debug-step]");
    if (!button) return;
    changeDebugValue(button.dataset.debugName, Number(button.dataset.debugStep));
  });

  debugControls.addEventListener("input", (event) => {
    const input = event.target.closest("[data-debug-var]");
    if (!input) return;
    debugValues[input.dataset.debugVar] = Number(input.value || 0);
    applyDebugValues();
    saveDebugValues();
  });
}

function loadDebugValues() {
  try {
    const saved = JSON.parse(localStorage.getItem(debugStorageKey) || "{}");
    debugValues = { ...debugDefaults, ...saved };
  } catch {
    debugValues = { ...debugDefaults };
  }
}

function renderControls() {
  const readyForBonus = state.mode === "bonusReady" && state.phase !== "battleBonus";
  const canSpinNormal = state.phase === "battleBonus" || state.coins >= fixedBet;
  spinButton.disabled = state.spinning || state.bonusBattleAnimating || readyForBonus || !canSpinNormal;
  spinButton.textContent = state.phase === "battleBonus" ? "勝負" : "回す";
  if (bonusStartButton) {
    bonusStartButton.hidden = !readyForBonus;
    bonusStartButton.disabled = !readyForBonus;
  }
  stopButtons.forEach((button, index) => {
    button.disabled = !state.spinning || state.stopped[index];
  });
  betButtons.forEach((button) => {
    button.disabled = true;
    button.title = "この版は3枚BET固定です";
  });
  renderStatus();
}

function startSpin() {
  if (state.phase === "battleBonus") {
    runBattleBonusSet();
    return;
  }
  if (state.mode === "bonusReady") {
    startBattleBonus();
    return;
  }
  if (state.spinning) return;
  if (state.coins < fixedBet) {
    const noMedalPlan = buildEffectPlan({ id: "lose" });
    clearStreamComments();
    topEffect.querySelector("strong").textContent = "メダル不足";
    setEffectClass("lose");
    setEffectVisual(noMedalPlan, true);
    effectScreen.innerHTML = "<p>信念不足</p><strong>メダルが足りない</strong><span>ショップより先に、まずは一回転だ。</span>";
    renderControls();
    return;
  }
  slotAudio?.play("lever");
  state.spinning = true;
  state.stopped = [false, false, false];
  state.coins -= fixedBet;
  state.bet = fixedBet;
  state.totalGames += 1;
  state.gamesSinceBonus += 1;
  state.lastPayout = 0;
  state.lastBonusSummary = null;
  state.battleStage = "idle";
  state.battleOutcome = null;
  state.pendingRole = drawRole();
  const modeNote = processModeAfterRole(state.pendingRole);
  state.pendingPayout = state.pendingRole.payout;
  state.pendingMessage = modeNote.message;
  const effectId = getEffectIdForSpin(state.pendingRole, modeNote);
  state.currentResult = getEffectResult(effectId, {
    name: state.pendingRole.name,
    lamp: modeNote.becameReady ? "確定" : (modeLabels[state.mode] || "通常"),
  });
  state.effectPlan = createSpinEffectPlan(state.pendingRole, modeNote, effectId);
  currentStops = getStopsForRole(state.pendingRole);
  if (modeNote.enteredPreBonus || state.mode === "preBonus") slotAudio?.play("prebonus");
  setEffectClass(state.effectPlan.tier);
  setEffectVisual(state.effectPlan);
  setTopEffectText(state.effectPlan.top);
  setEffectScreenContent(state.effectPlan.intro);
  clearStreamComments();
  burstStreamComments(state.effectPlan.tier);
  reels.forEach((reel) => {
    reel.style.setProperty("--spin-start", reel.style.getPropertyValue("--stop-y") || "0px");
    reel.classList.add("spinning");
  });
  renderControls();
}

function drawBonusType() {
  return slotEngine.pickWeighted(slotRules.bonusTypes, nextRandom);
}

function drawContinuationRate(bonusType) {
  const rates = slotRules.continuationRates.slice(bonusType.rateBoost || 0);
  return slotEngine.pickWeighted(rates.length ? rates : slotRules.continuationRates, nextRandom);
}

function createBonusState() {
  return slotEngine.createBonusState(nextRandom);
}

function drawBonusSetPayout(bonus) {
  return slotEngine.drawBonusSetPayout(bonus, nextRandom);
}

function startBattleBonus() {
  if (state.spinning || state.mode !== "bonusReady") return;
  const bonus = state.pendingBonus || createBonusState();
  slotAudio?.play("bonusStart");
  state.phase = "battleBonus";
  state.bonus = { ...bonus, set: 0, totalPayout: 0 };
  state.pendingBonus = null;
  state.gamesSinceBonus = 0;
  state.battleStage = "idle";
  state.battleOutcome = null;
  state.lastBattle = null;
  state.pendingRole = null;
  state.pendingPayout = 0;
  state.lastPayout = 0;
  state.currentResult = getEffectResult(state.bonus.effect, { name: state.bonus.name, lamp: state.bonus.rateLabel });
  state.effectPlan = buildEffectPlan(state.currentResult);
  state.effectPlan.intro = {
    label: "開始",
    title: `${state.bonus.entrySymbolName || state.bonus.name}`,
    message: `継続率${state.bonus.rateLabel}。${state.bonus.aura || "白"}オーラでバトルへ。`,
  };
  state.effectPlan.final = state.effectPlan.intro;
  setEffectClass(state.effectPlan.tier);
  setEffectVisual(state.effectPlan);
  setTopEffectText(state.bonus.rateLabel);
  setEffectScreenContent(state.effectPlan.intro);
  clearStreamComments();
  burstStreamComments(state.effectPlan.tier, 3);
  saveGameState();
  renderControls();
}

function runBattleBonusSet() {
  if (state.spinning || state.bonusBattleAnimating || state.phase !== "battleBonus" || !state.bonus) return;
  slotAudio?.play("lever");
  state.bonusBattleAnimating = true;
  state.battleStage = "faceoff";
  state.battleOutcome = null;
  state.totalGames += 1;
  const battle = slotEngine.drawBattleSet(state.bonus, nextRandom);
  const battleTier = state.bonus.effect;
  const context = {
    ...battle,
    bonusName: state.bonus.name,
    aura: state.bonus.aura,
    effectTier: battleTier === "premium" ? "premium" : "hot",
    totalPayout: state.bonus.totalPayout,
  };
  state.lastBattle = {
    attack: battle.attack?.id || null,
    attackName: battle.attack?.name || null,
    attackDanger: battle.attack?.danger ?? null,
    defense: battle.defense?.id || null,
    defenseName: battle.defense?.name || null,
    holdMs: battle.holdMs,
  };
  const faceoff = slotEffects.getBattleScene("faceoff", context);
  const plan = buildBattleVisualPlan(faceoff, battleTier);
  state.pendingRole = { id: "battleBonus", name: `${battle.nextSet}SET バトル` };
  state.currentResult = getEffectResult(battleTier, { name: state.bonus.name, lamp: "勝負" });
  state.effectPlan = plan;
  setEffectClass(plan.tier);
  setEffectVisual(plan);
  setTopEffectText(faceoff.top);
  setEffectScreenContent(faceoff);
  clearStreamComments();
  burstStreamComments(plan.tier, 3);
  saveGameState();
  renderControls();

  scheduleGameTimer(() => {
    if (!state.bonusBattleAnimating || state.phase !== "battleBonus" || !state.bonus) return;
    state.battleStage = "attack";
    const attack = slotEffects.getBattleScene("attack", context);
    const attackPlan = buildBattleVisualPlan(attack, battleTier);
    state.effectPlan = attackPlan;
    setEffectClass(attackPlan.tier);
    setEffectVisual(attackPlan);
    setTopEffectText(attack.top);
    setEffectScreenContent(attack);
    slotAudio?.play("battleImpact");
    clearStreamComments();
    burstStreamComments(attackPlan.tier, 2);
    renderControls();
  }, 720);

  scheduleGameTimer(() => {
    if (!state.bonusBattleAnimating || state.phase !== "battleBonus" || !state.bonus) return;
    state.battleStage = "hold";
    const hold = slotEffects.getBattleScene("hold", context);
    const holdPlan = buildBattleVisualPlan(hold, battleTier);
    state.effectPlan = holdPlan;
    setEffectClass(holdPlan.tier);
    setEffectVisual(holdPlan);
    setTopEffectText(hold.top);
    setEffectScreenContent(hold);
    clearStreamComments();
    burstStreamComments(holdPlan.tier, 1);
    renderControls();
  }, 1380);

  scheduleGameTimer(() => {
    resolveBattleBonusSet(battle);
  }, 1520 + Math.max(900, Number(battle.holdMs || 1400)));
}

function resolveBattleBonusSet({ continued, payout, nextSet, milestoneReached, attack, defense }) {
  if (!state.bonusBattleAnimating || state.phase !== "battleBonus" || !state.bonus) return;
  state.bonusBattleAnimating = false;
  state.bonus.set = nextSet;
  state.bonus.totalPayout += payout;
  if (milestoneReached) state.bonus.milestoneReached = true;
  state.coins += payout;
  state.lastPayout = payout;
  state.pendingRole = { id: "battleBonus", name: `${state.bonus.set}SET` };
  state.battleStage = continued ? "continue" : "lose";
  state.battleOutcome = continued ? "continued" : "ended";

  const resultEffectId = continued ? state.bonus.effect : "lose";
  const scene = slotEffects.getBattleScene(continued ? "continue" : "lose", {
    nextSet,
    payout,
    continued,
    milestoneReached,
    rateLabel: state.bonus.rateLabel,
    bonusName: state.bonus.name,
    totalPayout: state.bonus.totalPayout,
    effectTier: state.bonus.effect === "premium" ? "premium" : "hot",
    attack,
    defense,
  });
  const resultPlan = buildBattleVisualPlan(scene, resultEffectId);
  state.currentResult = getEffectResult(resultEffectId, { name: state.bonus.name, lamp: continued ? "継続" : "終了" });
  state.effectPlan = resultPlan;
  setEffectClass(resultPlan.tier);
  setEffectVisual(resultPlan, true);
  setTopEffectText(scene.top);
  setEffectScreenContent(scene, payout);
  clearStreamComments();
  burstStreamComments(resultPlan.tier, continued ? 3 : 2);
  const soundId = milestoneReached
    ? "milestone"
    : continued && defense?.id === "revival"
      ? "revival"
      : continued
        ? "continue"
        : "end";
  slotAudio?.play(soundId);

  if (!continued) {
    const endedBonus = state.bonus;
    state.phase = "normal";
    state.mode = slotEngine.selectPostBonusMode(endedBonus, nextRandom);
    state.preBonusRemaining = 0;
    state.lastBonusSummary = `${endedBonus.set}SET ${endedBonus.totalPayout.toLocaleString("ja-JP")}枚`;
    state.bonus = null;
    state.pendingRole = null;
  }

  saveGameState();
  renderControls();
}

function stopReel(index) {
  if (!state.spinning || state.stopped[index]) return;
  state.stopped[index] = true;
  reels[index].classList.remove("spinning");
  const stopIndex = currentStops[index] ?? 0;
  const slipCells = Number(state.lastSlip?.[index] || 0);
  reels[index].style.setProperty("--slip-cells", slipCells);
  reels[index].style.setProperty("--slip-distance", `${slipCells * 70}px`);
  reels[index].classList.toggle("slip-stop", slipCells > 0);
  slotAudio?.play(slipCells >= 2 ? "strongStop" : "stop");
  reels[index].style.setProperty("--stop-y", `${stopIndex * -70}px`);
  window.setTimeout(() => reels[index].classList.remove("slip-stop"), 240);
  renderEffectStep(state.stopped.filter(Boolean).length);

  if (state.stopped.every(Boolean)) {
    state.spinning = false;
    finishSpin();
  }

  renderControls();
}

function finishSpin() {
  const result = state.currentResult || resultTable.at(-1);
  const plan = state.effectPlan || buildEffectPlan(result);
  const payout = state.pendingPayout || 0;
  state.lastPayout = payout;
  state.coins += payout;
  setEffectVisual(plan, true);
  setTopEffectText(plan.top || result.lamp);
  setEffectScreenContent(plan.final, payout);
  burstStreamComments(plan.tier, payout > 0 ? 6 : 4);
  saveGameState();
}

function renderInitialEffect() {
  if (state.phase === "battleBonus" && state.bonus) {
    const plan = buildEffectPlan(getEffectResult(state.bonus.effect));
    const scene = {
      label: "再開",
      title: state.bonus.name,
      message: `${state.bonus.set}SET進行中。継続率${state.bonus.rateLabel}。`,
    };
    setEffectClass(plan.tier);
    setEffectVisual(plan);
    setTopEffectText(state.bonus.rateLabel);
    setEffectScreenContent(scene);
    return;
  }

  if (state.mode === "bonusReady") {
    const plan = buildEffectPlan(getEffectResult("premium"));
    const scene = {
      label: "確定",
      title: "ボーナス確定",
      message: state.pendingBonus
        ? `${state.pendingBonus.name}、継続率${state.pendingBonus.rateLabel}。`
        : "信念、開放。",
    };
    setEffectClass(plan.tier);
    setEffectVisual(plan, true);
    setTopEffectText("ボーナス確定");
    setEffectScreenContent(scene);
    return;
  }

  const plan = buildEffectPlan(getEffectResult("normal"));
  setEffectClass(plan.tier);
  setEffectVisual(plan);
  setTopEffectText(modeLabels[state.mode] || "通常");
  setEffectScreenContent({
    label: "待機",
    title: modeLabels[state.mode] || "通常",
    message: "スペースキーか回すボタンで一回転。",
  });
}

modeToggle.addEventListener("click", () => {
  setMode(!board.classList.contains("play-mode"));
});

debugToggle.addEventListener("click", () => {
  const isDebugMode = !board.classList.contains("debug-mode");
  board.classList.toggle("debug-mode", isDebugMode);
  debugToggle.setAttribute("aria-pressed", String(isDebugMode));
  if (isDebugMode) {
    setMode(true);
  }
});

debugCopy.addEventListener("click", async () => {
  renderDebugOutput();
  debugOutput.select();
  try {
    await navigator.clipboard.writeText(debugOutput.value);
    debugCopy.textContent = "コピー済";
    setTimeout(() => {
      debugCopy.textContent = "CSSコピー";
    }, 900);
  } catch {
    document.execCommand("copy");
  }
});

debugReset.addEventListener("click", () => {
  debugValues = { ...debugDefaults };
  saveDebugValues();
  applyDebugValues();
});

soundToggle?.addEventListener("click", () => {
  slotAudio?.toggleMuted();
  renderSoundToggle();
});

utilityTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    utilityTabs.forEach((item) => item.classList.toggle("is-active", item === tab));
    utilityContents.forEach((content) => {
      content.classList.toggle("is-active", content.dataset.panelContent === tab.dataset.panelTab);
    });
  });
});

shopList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-buy-item]");
  if (!button) return;
  buyItem(button.dataset.buyItem);
});

issueAikotoba?.addEventListener("click", () => {
  aikotobaOutput.value = window.ToshiyaAikotoba.encodeSaveData(getSaveData());
  aikotobaMessage.textContent = "あいことばを発行しました。";
});

restoreAikotoba?.addEventListener("click", () => {
  const result = window.ToshiyaAikotoba.decodeAikotoba(aikotobaInput.value);
  if (!result.ok) {
    aikotobaMessage.textContent = "まあね……とは言えません。";
    return;
  }
  applySaveData(result.data);
  aikotobaMessage.textContent = "信念を復元しました。";
});

generateImageButton?.addEventListener("click", generateImageFromPrompt);

spinButton.addEventListener("click", startSpin);
bonusStartButton?.addEventListener("click", startBattleBonus);
stopButtons.forEach((button) => {
  button.addEventListener("click", () => stopReel(Number(button.dataset.stop)));
});

betButtons.forEach((button) => {
  button.addEventListener("click", () => changeBet(Number(button.dataset.betStep)));
});

document.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.target.matches("input, textarea, select")) return;

  const key = event.key.toLowerCase();
  if (event.code === "Space") {
    event.preventDefault();
    if (state.mode === "bonusReady" && state.phase !== "battleBonus") {
      startBattleBonus();
    } else {
      startSpin();
    }
    return;
  }

  const stopKeys = { z: 0, x: 1, c: 2 };
  if (Object.hasOwn(stopKeys, key)) {
    event.preventDefault();
    stopReel(stopKeys[key]);
  }
});

loadGameState();
loadDebugValues();
buildDebugPanel();
applyDebugValues();
renderSoundToggle();
renderControls();
renderInitialEffect();
window.render_game_to_text = renderGameToText;
window.advanceTime = advanceVirtualTime;
window.__toshiyaSlotTest = {
  setRandomSequence(values, label = "sequence") {
    testRandomQueue = Array.isArray(values) ? values.slice() : [];
    state.lastRandomSeed = label;
    state.testMode = true;
    virtualTimeEnabled = true;
    return renderGameToText();
  },
  setSeed(seed) {
    const rng = slotEngine.createSeededRng(seed);
    testRandomQueue = Array.from({ length: 512 }, () => rng());
    state.lastRandomSeed = String(seed);
    state.testMode = true;
    virtualTimeEnabled = true;
    return renderGameToText();
  },
  setState(data) {
    applySaveData({ ...getSaveData(), ...data });
    state.testMode = true;
    return renderGameToText();
  },
  clearVirtualTimers() {
    clearGameTimers();
    return renderGameToText();
  },
  getState() {
    return renderGameToText();
  },
};
