(function registerSlotV2Engine(global) {
  const rules = global.ToshiyaSlotV2Rules;

  function pickWeighted(items, rng = Math.random) {
    const total = items.reduce((sum, item) => sum + Number(item.weight || 0), 0);
    if (total <= 0) return items[0] || null;
    let roll = rng() * total;
    for (const item of items) {
      roll -= Number(item.weight || 0);
      if (roll <= 0) return item;
    }
    return items.at(-1) || null;
  }

  function pickWeightedMap(weightMap, rng = Math.random) {
    return pickWeighted(Object.entries(weightMap).map(([value, weight]) => ({ value, weight })), rng)?.value;
  }

  function createSequenceRng(values, fallback = Math.random) {
    const queue = Array.isArray(values) ? values.slice() : [];
    return () => (queue.length ? Number(queue.shift()) : fallback());
  }

  function createSeededRng(seed = 1) {
    let value = Number(seed) || 1;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 0x100000000;
    };
  }

  function initialState(overrides = {}) {
    return normalizeState({
      version: rules.version,
      coins: 300,
      totalGames: 0,
      gamesSinceBonus: 0,
      internalState: "normal",
      normalStage: "street",
      preludeRemaining: 0,
      pendingBonus: null,
      phase: "normal",
      bonus: null,
      replayCredit: false,
      lastRole: null,
      lastPayout: 0,
      lastSceneId: null,
      lastMessage: "待機中",
      ...overrides,
    });
  }

  function normalizeState(raw = {}) {
    const validStates = new Set(["low", "normal", "high", "prelude", "bonus", "bonusReady"]);
    const validStages = new Set(rules.stageOrder);
    return {
      version: rules.version,
      coins: Math.max(0, Number(raw.coins) || 0),
      totalGames: Math.max(0, Number(raw.totalGames) || 0),
      gamesSinceBonus: Math.max(0, Number(raw.gamesSinceBonus) || 0),
      internalState: validStates.has(raw.internalState) ? raw.internalState : "normal",
      normalStage: validStages.has(raw.normalStage) ? raw.normalStage : "street",
      preludeRemaining: Math.max(0, Number(raw.preludeRemaining) || 0),
      pendingBonus: sanitizePendingBonus(raw.pendingBonus),
      phase: raw.phase === "bonus" ? "bonus" : "normal",
      bonus: sanitizeBonus(raw.bonus),
      replayCredit: Boolean(raw.replayCredit),
      lastRole: typeof raw.lastRole === "string" ? raw.lastRole : null,
      lastPayout: Math.max(0, Number(raw.lastPayout) || 0),
      lastSceneId: typeof raw.lastSceneId === "string" ? raw.lastSceneId : null,
      lastMessage: typeof raw.lastMessage === "string" ? raw.lastMessage : "待機中",
    };
  }

  function sanitizePendingBonus(raw) {
    if (!raw || typeof raw !== "object") return null;
    const entry = rules.entrySymbols.find((item) => item.id === raw.entrySymbol) || rules.entrySymbols[0];
    const rateLabel = Object.hasOwn(rules.continuationRates, raw.rateLabel) ? raw.rateLabel : "66%";
    return {
      entrySymbol: entry.id,
      entryName: entry.name,
      rateLabel,
      rate: rules.continuationRates[rateLabel],
      stockSets: Math.max(0, Math.min(30, Number(raw.stockSets) || 0)),
      premium: Boolean(entry.premium),
      causeRole: typeof raw.causeRole === "string" ? raw.causeRole : null,
    };
  }

  function sanitizeBonus(raw) {
    if (!raw || typeof raw !== "object") return null;
    const pending = sanitizePendingBonus(raw);
    const setGames = Math.max(1, Number(raw.setGames) || rules.bonus.gamesPerSet);
    return {
      ...pending,
      setNumber: Math.max(1, Number(raw.setNumber) || 1),
      gamesInSet: Math.min(setGames, Math.max(0, Number(raw.gamesInSet) || 0)),
      setGames,
      totalPayout: Math.max(0, Number(raw.totalPayout) || 0),
      currentSetPlan: sanitizeSetPlan(raw.currentSetPlan),
      ended: Boolean(raw.ended),
    };
  }

  function sanitizeSetPlan(raw) {
    if (!raw || typeof raw !== "object") return null;
    return {
      continued: Boolean(raw.continued),
      usedStock: Boolean(raw.usedStock),
      revival: Boolean(raw.revival),
      stockBefore: Math.max(0, Number(raw.stockBefore) || 0),
      rateLabel: typeof raw.rateLabel === "string" ? raw.rateLabel : "66%",
    };
  }

  function drawRole(rng = Math.random) {
    let roll = rng();
    for (const role of rules.roles) {
      if (role.id === "blank") continue;
      roll -= Number(role.probability || 0);
      if (roll <= 0) return role;
    }
    return rules.roles.find((role) => role.id === "blank");
  }

  function drawBonusRole(rng = Math.random) {
    const entry = pickWeighted(rules.bonus.roles, rng);
    const base = rules.roles.find((role) => role.id === entry.id) || rules.roles[0];
    return { ...base, ...entry, bonusGame: true, targetable: true };
  }

  function drawPreludeGames(rng = Math.random) {
    return pickWeighted(rules.preludeGames, rng)?.value || 16;
  }

  function drawEntrySymbol(causeRole, rng = Math.random) {
    const boost = rules.entryBoostByRole[causeRole?.id || causeRole] || {};
    const items = rules.entrySymbols.map((entry) => ({
      ...entry,
      weight: Number(entry.weight || 0) + Number(boost[entry.id] || 0),
    }));
    return pickWeighted(items, rng) || rules.entrySymbols[0];
  }

  function drawPendingBonus(rng = Math.random, causeRole = null) {
    const entry = drawEntrySymbol(causeRole, rng);
    const rateLabel = pickWeightedMap(entry.rateWeights, rng) || "66%";
    const stockSets = Number(pickWeightedMap(entry.stockWeights, rng) || 1);
    return {
      entrySymbol: entry.id,
      entryName: entry.name,
      rateLabel,
      rate: rules.continuationRates[rateLabel],
      stockSets,
      premium: Boolean(entry.premium),
      causeRole: causeRole?.id || causeRole || null,
    };
  }

  function pickTransition(currentState, role, rng = Math.random) {
    const table = rules.modeTransitions[currentState]?.[role.id];
    if (!table) return currentState;
    let roll = rng();
    for (const [target, probability] of Object.entries(table)) {
      roll -= Number(probability || 0);
      if (roll <= 0) return target;
    }
    return currentState;
  }

  function moveStage(stage, delta) {
    const index = rules.stageOrder.indexOf(stage);
    const next = Math.max(0, Math.min(rules.stageOrder.length - 1, index + delta));
    return rules.stageOrder[next] || "street";
  }

  function updateNormalStage(state, role, transitionNote = {}, rng = Math.random) {
    const current = rules.stageOrder.includes(state.normalStage) ? state.normalStage : "street";
    const table = rules.stageTransitions[role?.id] || rules.stageTransitions.blank;
    let next = current;
    const jumpRoll = rng();
    if (jumpRoll < Number(table.jumpDeep || 0)) {
      next = "deep";
    } else {
      const roll = rng();
      if (transitionNote.enteredPrelude && roll < 0.85) {
        next = moveStage(current, 1);
      } else if (roll < Number(table.up || 0)) {
        next = moveStage(current, 1);
      } else if (roll < Number(table.up || 0) + Number(table.down || 0)) {
        next = moveStage(current, -1);
      }
    }
    return {
      before: current,
      after: next,
      changed: current !== next,
      linked: false,
      reason: role?.id || "blank",
    };
  }

  function enterPrelude(state, rng = Math.random, causeRole = null) {
    const pendingBonus = state.pendingBonus || drawPendingBonus(rng, causeRole);
    return {
      ...state,
      internalState: "prelude",
      preludeRemaining: drawPreludeGames(rng),
      pendingBonus,
    };
  }

  function resolveNormalSpin(state, stopResult, rng = Math.random, forcedRole = null) {
    const before = normalizeState(state);
    const role = forcedRole || drawRole(rng);
    let nextState = { ...before };
    const successfulStop = Boolean(stopResult?.success);
    const payout = successfulStop ? Math.max(0, Number(role.payout) || 0) : 0;
    const transitionNote = {
      before: before.internalState,
      after: before.internalState,
      enteredPrelude: false,
      becameReady: false,
      preludeTick: false,
    };

    nextState.coins += payout;
    nextState.totalGames += 1;
    nextState.gamesSinceBonus += 1;
    nextState.lastRole = role.id;
    nextState.lastPayout = payout;
    nextState.replayCredit = Boolean(role.replay && successfulStop);

    if (before.internalState === "prelude") {
      nextState.preludeRemaining = Math.max(0, before.preludeRemaining - 1);
      transitionNote.preludeTick = true;
      if (nextState.preludeRemaining <= 0) {
        nextState.internalState = "bonusReady";
        transitionNote.becameReady = true;
      }
    } else if (before.internalState === "bonusReady") {
      transitionNote.after = "bonusReady";
    } else {
      const target = pickTransition(before.internalState, role, rng);
      if (target === "prelude") {
        nextState = enterPrelude(nextState, rng, role);
        transitionNote.enteredPrelude = true;
      } else {
        nextState.internalState = target;
      }
    }

    transitionNote.after = nextState.internalState;
    const stageNote = updateNormalStage(before, role, transitionNote, rng);
    nextState.normalStage = stageNote.after;
    nextState.lastMessage = buildSpinMessage({ role, successfulStop, payout, transitionNote, stageNote });
    return {
      role,
      stopResult: { ...stopResult, success: successfulStop },
      payout,
      nextState,
      transitionNote,
      stageNote,
      internalEffectApplied: Boolean(role.rare || transitionNote.preludeTick || transitionNote.becameReady),
    };
  }

  function buildSpinMessage({ role, successfulStop, payout, transitionNote, stageNote }) {
    const missed = role.targetable && !successfulStop ? "取りこぼし。内部効果は残る。" : "";
    if (transitionNote.becameReady) return `${role.name}。前兆の奥で告知が立ち上がる。`;
    if (transitionNote.enteredPrelude) return `${role.name}から深い気配へ。${missed}`.trim();
    if (payout > 0) return `${role.name}成功、${payout}枚。`;
    if (role.replay && successfulStop) return "リプレイ成功。次ゲームはBET免除。";
    if (stageNote.changed) return `${role.name}。空気だけが少し変わった。${missed}`.trim();
    return `${role.name}。まだ断定できない。${missed}`.trim();
  }

  function startBonusSet(bonus, rng = Math.random) {
    const stockBefore = Math.max(0, Number(bonus.stockSets) || 0);
    const usedStock = stockBefore > 0;
    const continued = usedStock || rng() < Number(bonus.rate || 0);
    const revival = continued && !usedStock && rng() < rules.bonus.revivalRate;
    return {
      continued,
      usedStock,
      revival,
      stockBefore,
      rateLabel: bonus.rateLabel,
    };
  }

  function startBonus(state, rng = Math.random) {
    const before = normalizeState(state);
    const pending = before.pendingBonus || drawPendingBonus(rng);
    const bonus = {
      ...pending,
      setNumber: 1,
      gamesInSet: 0,
      setGames: rules.bonus.gamesPerSet,
      totalPayout: 0,
      currentSetPlan: null,
      ended: false,
    };
    bonus.currentSetPlan = startBonusSet(bonus, rng);
    if (bonus.currentSetPlan.usedStock) bonus.stockSets = Math.max(0, bonus.stockSets - 1);
    const nextState = {
      ...before,
      phase: "bonus",
      internalState: "bonus",
      pendingBonus: null,
      preludeRemaining: 0,
      gamesSinceBonus: 0,
      replayCredit: false,
      bonus,
      lastRole: pending.entrySymbol,
      lastPayout: 0,
      lastMessage: `${pending.entryName}。継続率とストックは内部で決まっている。`,
    };
    return {
      nextState,
      openingRole: {
        id: pending.entrySymbol,
        name: pending.entryName,
        payout: 0,
        targetable: true,
      },
    };
  }

  function resolveBonusGame(state, stopResult, rng = Math.random, forcedRole = null) {
    const before = normalizeState(state);
    if (before.phase !== "bonus" || !before.bonus) {
      return { role: null, payout: 0, nextState: before };
    }
    const role = forcedRole || drawBonusRole(rng);
    const successfulStop = Boolean(stopResult?.success);
    const payout = successfulStop ? Math.max(0, Number(role.payout) || 0) : 0;
    const bonus = { ...before.bonus };
    bonus.gamesInSet = Math.min(bonus.setGames, bonus.gamesInSet + 1);
    bonus.totalPayout += payout;
    const nextState = {
      ...before,
      coins: before.coins + payout,
      totalGames: before.totalGames + 1,
      bonus,
      lastRole: role.id,
      lastPayout: payout,
      lastMessage: successfulStop
        ? `${role.name}成功、${payout}枚。${bonus.gamesInSet}/${bonus.setGames}G。`
        : `${role.name}取りこぼし。${bonus.gamesInSet}/${bonus.setGames}G。`,
    };
    return { role, payout, stopResult: { ...stopResult, success: successfulStop }, nextState };
  }

  function resolveBonusJudge(state, rng = Math.random) {
    const before = normalizeState(state);
    if (before.phase !== "bonus" || !before.bonus?.currentSetPlan) {
      return { nextState: before, plan: null };
    }
    const plan = before.bonus.currentSetPlan;
    const bonus = { ...before.bonus };
    if (plan.continued) {
      bonus.setNumber += 1;
      bonus.gamesInSet = 0;
      bonus.currentSetPlan = startBonusSet(bonus, rng);
      if (bonus.currentSetPlan.usedStock) bonus.stockSets = Math.max(0, bonus.stockSets - 1);
      return {
        plan,
        nextState: {
          ...before,
          bonus,
          lastMessage: plan.revival ? "沈黙のあと、ロゴが戻す。" : "まだ終わらない。",
        },
      };
    }
    bonus.ended = true;
    return {
      plan,
      nextState: {
        ...before,
        phase: "normal",
        internalState: "normal",
        normalStage: before.normalStage === "deep" ? "heat" : before.normalStage,
        bonus: null,
        pendingBonus: null,
        preludeRemaining: 0,
        gamesSinceBonus: 0,
        lastMessage: `${bonus.setNumber}SETで終了。まだ次があるかもしれない。`,
      },
    };
  }

  global.ToshiyaSlotV2Engine = {
    pickWeighted,
    pickWeightedMap,
    createSequenceRng,
    createSeededRng,
    initialState,
    normalizeState,
    drawRole,
    drawBonusRole,
    drawPreludeGames,
    drawEntrySymbol,
    drawPendingBonus,
    updateNormalStage,
    enterPrelude,
    resolveNormalSpin,
    startBonus,
    startBonusSet,
    resolveBonusGame,
    resolveBonusJudge,
  };
})(globalThis);
