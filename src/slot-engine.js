(function registerSlotEngine(global) {
  const rules = global.ToshiyaSlotRules;

  function pickWeighted(items, rng = Math.random) {
    const totalWeight = items.reduce((sum, item) => sum + Number(item.weight || 0), 0);
    let roll = rng() * totalWeight;
    for (const item of items) {
      roll -= Number(item.weight || 0);
      if (roll <= 0) return item;
    }
    return items.at(-1);
  }

  function pickWeightedMap(weightMap, rng = Math.random) {
    const items = Object.entries(weightMap).map(([value, weight]) => ({ value, weight }));
    return pickWeighted(items, rng)?.value;
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

  function drawRole(rng = Math.random) {
    return pickWeighted(rules.roles, rng);
  }

  function getBonusGamesPerSet() {
    return Math.max(1, Number(rules.bonusGame?.gamesPerSet) || 30);
  }

  function drawBonusGameRole(rng = Math.random, forcedRoleId = null) {
    const table = Array.isArray(rules.bonusGame?.roles) && rules.bonusGame.roles.length
      ? rules.bonusGame.roles
      : [
          { roleId: "bell", name: "ベル", payout: 8, weight: 1 },
          { roleId: "replay", name: "Tリプレイ", payout: 8, weight: 1 },
        ];
    const entry = forcedRoleId
      ? (table.find((item) => item.roleId === forcedRoleId) || table[0])
      : pickWeighted(table, rng);
    const baseRole = rules.roles.find((role) => role.id === entry.roleId) || rules.roles[0];
    return {
      ...baseRole,
      id: entry.roleId,
      name: entry.name || baseRole.name,
      payout: Math.max(0, Number(entry.payout) || 0),
      effect: "normal",
      rare: false,
      strongRare: false,
      quiet: false,
      heat: 1,
      slip: [0, 0, 0],
      bonusGame: true,
    };
  }

  function drawPreBonusGames(rng = Math.random) {
    return pickWeighted(rules.preBonusGames, rng)?.value || 4;
  }

  function drawBonusType(rng = Math.random) {
    return pickWeighted(rules.bonusTypes, rng);
  }

  function rateByLabel(label) {
    return rules.continuationRates.find((rate) => rate.label === label) || rules.continuationRates[0];
  }

  function drawEntrySymbol(rng = Math.random) {
    return pickWeighted(rules.entrySymbols || [], rng) || {
      id: "red",
      name: "赤ISM揃い",
      bonusId: "normal",
      effect: "rush",
      rateWeights: { "66%": 1 },
    };
  }

  function drawContinuationRate(entrySymbolOrBonusType, rng = Math.random) {
    const rateWeights = entrySymbolOrBonusType?.rateWeights;
    if (rateWeights) return rateByLabel(pickWeightedMap(rateWeights, rng));
    const rates = rules.continuationRates.slice(entrySymbolOrBonusType?.rateBoost || 0);
    return pickWeighted(rates.length ? rates : rules.continuationRates, rng);
  }

  function drawAura(rateLabel, rng = Math.random) {
    const auraTable = rules.auraByRate?.[rateLabel] || rules.auraByRate?.["66%"] || [{ value: "白", weight: 1 }];
    return pickWeighted(auraTable, rng)?.value || "白";
  }

  function createBonusState(rng = Math.random, forced = null) {
    if (forced) return sanitizeBonus(forced);
    const entrySymbol = drawEntrySymbol(rng);
    const type = rules.bonusTypes.find((candidate) => candidate.id === entrySymbol.bonusId) || drawBonusType(rng);
    const rate = drawContinuationRate(entrySymbol, rng);
    return {
      id: type.id,
      name: type.name,
      effect: entrySymbol.effect || type.effect,
      entrySymbol: entrySymbol.id,
      entrySymbolName: entrySymbol.name,
      rate: rate.value,
      rateLabel: rate.label,
      aura: drawAura(rate.label, rng),
      set: 0,
      gamesInSet: 0,
      setGames: getBonusGamesPerSet(),
      totalPayout: 0,
      milestoneReached: false,
    };
  }

  function sanitizeBonus(rawBonus) {
    if (!rawBonus || typeof rawBonus !== "object") return null;
    const rate = Number(rawBonus.rate);
    const id = rawBonus.id === "upper" ? "upper" : "normal";
    const fallbackType = rules.bonusTypes.find((type) => type.id === id) || rules.bonusTypes[0];
    const setGames = Math.max(1, Number(rawBonus.setGames) || getBonusGamesPerSet());
    return {
      id,
      name: String(rawBonus.name || fallbackType.name),
      effect: rawBonus.effect === "premium" ? "premium" : fallbackType.effect,
      entrySymbol: typeof rawBonus.entrySymbol === "string" ? rawBonus.entrySymbol : (id === "upper" ? "belief" : "red"),
      entrySymbolName: typeof rawBonus.entrySymbolName === "string" ? rawBonus.entrySymbolName : (id === "upper" ? "信念図柄揃い" : "赤ISM揃い"),
      rate: Number.isFinite(rate) ? Math.min(0.99, Math.max(0.01, rate)) : 0.66,
      rateLabel: String(rawBonus.rateLabel || "66%"),
      aura: typeof rawBonus.aura === "string" ? rawBonus.aura : "白",
      set: Math.max(0, Number(rawBonus.set) || 0),
      gamesInSet: Math.min(setGames, Math.max(0, Number(rawBonus.gamesInSet) || 0)),
      setGames,
      totalPayout: Math.max(0, Number(rawBonus.totalPayout) || 0),
      milestoneReached: Boolean(rawBonus.milestoneReached),
    };
  }

  function getEffectIdForSpin(role, modeNote) {
    if (modeNote.becameReady) return "premium";
    if (modeNote.enteredPreBonus) return "rush";
    if (modeNote.after === "high" && role.rare) return "rush";
    return role.effect || "lose";
  }

  function playNormalGame(slotState, rng = Math.random, forcedRole = null) {
    const before = slotState.mode;
    const role = forcedRole || drawRole(rng);
    const nextState = {
      mode: before,
      preBonusRemaining: Math.max(0, Number(slotState.preBonusRemaining) || 0),
      pendingBonus: slotState.pendingBonus || null,
    };
    const note = {
      before,
      after: before,
      enteredPreBonus: false,
      becameReady: false,
      quiet: Boolean(role.quiet),
      heat: Number(role.heat || 0),
      slip: role.slip || [0, 0, 0],
      message: `${role.name}成立。`,
      expectation: "quiet",
    };

    if (before === "preBonus") {
      nextState.preBonusRemaining = Math.max(0, nextState.preBonusRemaining - 1);
      note.expectation = nextState.preBonusRemaining <= 1 ? "preBonusDeep" : "preBonus";
      if (nextState.preBonusRemaining <= 0) {
        nextState.mode = "bonusReady";
        nextState.preBonusRemaining = 0;
        nextState.pendingBonus = nextState.pendingBonus || createBonusState(rng);
        note.after = nextState.mode;
        note.becameReady = true;
        note.expectation = "bonusReady";
        note.message = `${role.name}成立。前兆突破、ボーナス開始へ。`;
        return { role, payout: role.payout, nextState, note, effectId: "premium" };
      }
      note.after = nextState.mode;
      note.message = `${role.name}成立。前兆残り${nextState.preBonusRemaining}G。`;
      return { role, payout: role.payout, nextState, note, effectId: getEffectIdForSpin(role, note) };
    }

    if (before === "bonusReady") {
      note.message = "ボーナス開始を待っています。";
      note.expectation = "bonusReady";
      return { role, payout: role.payout, nextState, note, effectId: "premium" };
    }

    if (!role.rare) {
      note.expectation = role.payout > 0 ? "smallWin" : "quiet";
      note.message = role.payout > 0
        ? `${role.name}成立。${role.payout}枚払い出し。`
        : `${role.name}。次のレア役に期待。`;
      return { role, payout: role.payout, nextState, note, effectId: getEffectIdForSpin(role, note) };
    }

    const transitionTable = rules.modeTransitions[before]?.[role.id];
    nextState.mode = transitionTable ? (pickWeightedMap(transitionTable, rng) || before) : before;
    note.after = nextState.mode;

    if (nextState.mode === "preBonus") {
      nextState.preBonusRemaining = drawPreBonusGames(rng);
      nextState.pendingBonus = null;
      note.enteredPreBonus = true;
      note.expectation = "preBonus";
      note.message = `${role.name}で前兆へ。信念ランプが騒ぎ始めた。`;
      return { role, payout: role.payout, nextState, note, effectId: "rush" };
    }

    note.expectation = nextState.mode === "high" ? "high" : (role.strongRare ? "strongMiss" : "smallMismatch");
    note.message = `${role.name}成立。内部は${rules.modeLabels[nextState.mode]}へ。`;
    return { role, payout: role.payout, nextState, note, effectId: getEffectIdForSpin(role, note) };
  }

  function drawBonusSetPayout(bonus, rng = Math.random) {
    const type = rules.bonusTypes.find((candidate) => candidate.id === bonus.id) || rules.bonusTypes[0];
    return Math.round(type.payoutMin + rng() * (type.payoutMax - type.payoutMin));
  }

  function drawBattleSet(bonus, rng = Math.random, forced = {}) {
    const payout = Number.isFinite(Number(forced.payout))
      ? Number(forced.payout)
      : Math.max(0, Number(rules.battle?.resolvePayout) || 0);
    const continued = typeof forced.continued === "boolean" ? forced.continued : rng() < Number(bonus.rate);
    const nextSet = Math.max(0, Number(bonus.set) || 0) + 1;
    const milestoneReached = continued
      && nextSet >= rules.battle.milestoneSet
      && !bonus.milestoneReached;
    const attack = forced.attack || drawBattleAttack({ continued, rate: Number(bonus.rate), rng });
    const defense = forced.defense || drawBattleDefense({ continued, attack, rng });
    return {
      payout,
      continued,
      nextSet,
      milestoneReached,
      rateLabel: bonus.rateLabel,
      bonusId: bonus.id,
      attack,
      defense,
      holdMs: attack.holdMs,
    };
  }

  function drawBattleAttack({ continued, rate = 0.66, rng = Math.random }) {
    const baseWeights = continued ? rules.battle.attackWeights.continued : rules.battle.attackWeights.ended;
    const weights = { ...baseWeights };
    if (continued && rate >= 0.84) {
      weights.toshiyaFirst = Math.round((weights.toshiyaFirst || 0) * 1.4);
      weights.heavy = Math.max(4, Math.round((weights.heavy || 0) * 0.75));
    }
    if (!continued && rate >= 0.84) {
      weights.heavy = Math.round((weights.heavy || 0) * 1.2);
    }
    const id = pickWeightedMap(weights, rng);
    return rules.battle.attackPatterns.find((pattern) => pattern.id === id)
      || rules.battle.attackPatterns.find((pattern) => pattern.id === "middle")
      || rules.battle.attackPatterns[0];
  }

  function drawBattleDefense({ continued, attack, rng = Math.random }) {
    const weights = continued ? attack.continuedWeights : attack.endedWeights;
    const id = pickWeightedMap(weights, rng) || (continued ? "stand" : "collapse");
    const labels = {
      toshiyaFirst: "先制",
      dodge: "回避",
      counter: "反撃",
      stand: "耐える",
      revival: "復活",
      collapse: "倒れる",
    };
    return {
      id,
      name: labels[id] || id,
      dramatic: id === "revival" || id === "stand" || attack.danger >= 3,
    };
  }

  function selectPostBonusMode(bonus, rng = Math.random) {
    let table = rules.postBonusModes[bonus.id] || rules.postBonusModes.normal;
    if (Number(bonus.rate) >= 0.88) {
      table = rules.postBonusModes.highest;
    } else if (bonus.id === "normal" && Number(bonus.set) >= 3) {
      table = rules.postBonusModes.normalLong;
    }
    return pickWeightedMap(table, rng) || "normal";
  }

  global.ToshiyaSlotEngine = {
    pickWeighted,
    pickWeightedMap,
    createSequenceRng,
    createSeededRng,
    drawRole,
    drawBonusGameRole,
    drawPreBonusGames,
    drawEntrySymbol,
    createBonusState,
    sanitizeBonus,
    playNormalGame,
    drawBattleSet,
    drawBattleAttack,
    drawBattleDefense,
    drawBonusSetPayout,
    selectPostBonusMode,
  };
})(globalThis);
