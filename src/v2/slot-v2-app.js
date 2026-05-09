(function registerSlotV2App(global) {
  const rules = global.ToshiyaSlotV2Rules;
  const engine = global.ToshiyaSlotV2Engine;
  const reelsApi = global.ToshiyaSlotV2Reels;
  const scenes = global.ToshiyaSlotV2Scenes;
  const scenePlayerFactory = global.ToshiyaSlotV2ScenePlayer;

  const dom = {
    coin: document.querySelector("#v2Coins"),
    totalGames: document.querySelector("#v2TotalGames"),
    gamesSinceBonus: document.querySelector("#v2GamesSinceBonus"),
    role: document.querySelector("#v2Role"),
    payout: document.querySelector("#v2Payout"),
    lamp: document.querySelector("#v2Lamp"),
    message: document.querySelector("#v2Message"),
    internalState: document.querySelector("#v2InternalState"),
    normalStage: document.querySelector("#v2NormalStage"),
    prelude: document.querySelector("#v2Prelude"),
    bonus: document.querySelector("#v2Bonus"),
    sceneId: document.querySelector("#v2SceneId"),
    spin: document.querySelector("#v2SpinButton"),
    stops: [...document.querySelectorAll("[data-v2-stop]")],
    reels: [...document.querySelectorAll("[data-v2-reel]")],
    roleFlash: document.querySelector("[data-role-flash]"),
    roleFlashImage: document.querySelector("[data-role-flash-image]"),
    roleFlashKicker: document.querySelector("[data-role-flash-kicker]"),
    roleFlashTitle: document.querySelector("[data-role-flash-title]"),
    debugState: document.querySelector("#v2DebugState"),
    debugStage: document.querySelector("#v2DebugStage"),
    debugCoins: document.querySelector("#v2DebugCoins"),
    debugApply: document.querySelector("#v2DebugApply"),
    debugReset: document.querySelector("#v2DebugReset"),
    debugMeoshiSlip: document.querySelector("#v2DebugMeoshiSlip"),
    debugBonusEntrySlip: document.querySelector("#v2DebugBonusEntrySlip"),
    debugMeoshiRole: document.querySelector("#v2DebugMeoshiRole"),
    debugMeoshiApply: document.querySelector("#v2DebugMeoshiApply"),
    debugMeoshiForce: document.querySelector("#v2DebugMeoshiForce"),
  };

  const scenePlayer = scenePlayerFactory.create({
    root: document.querySelector("#v2Scene"),
    onVideoEnded: handleSceneVideoEnded,
  });
  let rng = Math.random;
  let state = loadState();
  let meoshiTuning = {
    meoshiSlipCells: Number(rules.reel.meoshiSlipCells ?? 2),
    bonusEntrySlipCells: Number(rules.reel.bonusEntrySlipCells ?? rules.reel.meoshiSlipCells ?? 2),
  };
  let currentSpin = null;
  let nextForcedRoleId = null;
  let nextForcedStops = null;
  let judgeRunning = false;
  let lastMeoshiResult = null;
  let virtualNow = 0;
  let virtualTimers = [];
  let useVirtualTimers = false;
  let reelFrameId = null;
  let roleFlashToken = 0;
  const reelCellHeight = rules.reel.cellHeight;
  const reelCycleHeight = rules.reel.symbolCount * reelCellHeight;
  const reelCopyRange = 5;
  const reelSpeedPxPerMs = reelCellHeight / rules.reel.spinMsPerSymbol;
  prepareReelCopies();
  const reelStates = dom.reels.map((reel, index) => ({
    index,
    reel,
    offset: 0,
    spinStartOffset: 0,
    spinStartedAt: 0,
    stoppedIndex: 0,
    locked: true,
    spinning: false,
  }));

  function prepareReelCopies() {
    dom.reels.forEach((reel) => {
      const source = reel.querySelector("img");
      const src = source?.getAttribute("src");
      if (!src) return;
      reel.replaceChildren();
      for (let copy = -reelCopyRange; copy <= reelCopyRange; copy += 1) {
        const image = document.createElement("img");
        image.className = "v2-reel__copy";
        image.src = src;
        image.alt = "";
        image.setAttribute("aria-hidden", "true");
        image.style.setProperty("--copy-offset", `${copy * reelCycleHeight}px`);
        reel.appendChild(image);
      }
    });
  }

  function now() {
    return useVirtualTimers ? virtualNow : performance.now();
  }

  function schedule(delayMs, callback) {
    if (!useVirtualTimers) return window.setTimeout(callback, delayMs);
    const timer = { at: virtualNow + delayMs, callback, done: false };
    virtualTimers.push(timer);
    virtualTimers.sort((a, b) => a.at - b.at);
    return timer;
  }

  function runVirtualTimers() {
    let ran = true;
    while (ran) {
      ran = false;
      for (const timer of virtualTimers) {
        if (!timer.done && timer.at <= virtualNow) {
          timer.done = true;
          timer.callback();
          ran = true;
        }
      }
    }
    virtualTimers = virtualTimers.filter((timer) => !timer.done);
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(rules.saveKey) || "null");
      return engine.normalizeState(saved || engine.initialState());
    } catch {
      return engine.initialState();
    }
  }

  function saveState() {
    localStorage.setItem(rules.saveKey, JSON.stringify(engine.normalizeState(state)));
  }

  function roleById(roleId) {
    const entry = rules.entrySymbols.find((item) => item.id === roleId);
    if (entry) {
      return { id: entry.id, name: entry.name, payout: 0, targetable: true };
    }
    if (state.phase === "bonus") {
      const bonusRole = rules.bonus.roles.find((role) => role.id === roleId);
      if (bonusRole) {
        const base = rules.roles.find((role) => role.id === roleId) || rules.roles[0];
        return { ...base, ...bonusRole, bonusGame: true, targetable: true };
      }
    }
    return rules.roles.find((role) => role.id === roleId) || null;
  }

  function normalizeOffset(offset) {
    const raw = Number(offset) || 0;
    const positive = ((raw % reelCycleHeight) + reelCycleHeight) % reelCycleHeight;
    return positive === 0 ? 0 : positive - reelCycleHeight;
  }

  function indexToOffset(index) {
    return reelsApi.normalizeIndex(index) * -reelCellHeight;
  }

  function offsetToNextStopIndex(rawOffset) {
    const rawCells = (Number(rawOffset) || 0) / reelCellHeight;
    const boundaryCells = Math.ceil(rawCells - 0.000001);
    return reelsApi.normalizeIndex(-boundaryCells);
  }

  function applyReelOffset(reelState, offset) {
    if (!reelState?.reel) return;
    reelState.offset = normalizeOffset(offset);
    const value = `${reelState.offset}px`;
    reelState.reel.style.setProperty("--reel-offset", value);
    reelState.reel.style.setProperty("--stop-y", value);
  }

  function computeSpinOffset(reelState, at = now()) {
    return normalizeOffset(computeSpinRawOffset(reelState, at));
  }

  function computeSpinRawOffset(reelState, at = now()) {
    const phaseOffsetMs = reelState.index * 37;
    const elapsed = Math.max(0, at - reelState.spinStartedAt + phaseOffsetMs);
    return reelState.spinStartOffset + elapsed * reelSpeedPxPerMs;
  }

  function renderReels() {
    const at = now();
    reelStates.forEach((reelState) => {
      if (reelState.spinning && !reelState.locked) {
        applyReelOffset(reelState, computeSpinOffset(reelState, at));
      }
    });
  }

  function startReelLoop() {
    if (useVirtualTimers || reelFrameId) return;
    const tick = () => {
      reelFrameId = null;
      renderReels();
      if (currentSpin && reelStates.some((reelState) => reelState.spinning)) {
        reelFrameId = window.requestAnimationFrame(tick);
      }
    };
    reelFrameId = window.requestAnimationFrame(tick);
  }

  function stopReelLoop() {
    if (!reelFrameId) return;
    window.cancelAnimationFrame(reelFrameId);
    reelFrameId = null;
  }

  function setReelStops(stopIndexes) {
    stopIndexes.forEach((stopIndex, index) => {
      const reelState = reelStates[index];
      if (!reelState) return;
      const stoppedIndex = reelsApi.normalizeIndex(stopIndex);
      reelState.spinning = false;
      reelState.locked = true;
      reelState.stoppedIndex = stoppedIndex;
      reelState.reel?.classList.remove("is-spinning", "is-stopping");
      applyReelOffset(reelState, indexToOffset(stoppedIndex));
    });
  }

  function getPendingEntryRole() {
    const pending = state.pendingBonus || engine.drawPendingBonus(rng);
    if (!state.pendingBonus) state = { ...state, pendingBonus: pending, internalState: "bonusReady" };
    return { id: pending.entrySymbol, name: pending.entryName, payout: 0, targetable: true };
  }

  function isNormalMeoshiPayoutRole(role) {
    return engine.isNormalMeoshiPayoutRole?.(role) || rules.normalMeoshiPayoutRoles?.includes(role?.id);
  }

  function isAutoBonusEntryRole(role) {
    return role?.id === "toshiyaLogo";
  }

  function isManualMeoshiSpin(spin = currentSpin) {
    return (spin?.kind === "bonusEntry" && !isAutoBonusEntryRole(spin.role))
      || (spin?.kind === "normal" && isNormalMeoshiPayoutRole(spin.role));
  }

  function getMeoshiSlipCells(spin = currentSpin) {
    return spin?.kind === "bonusEntry"
      ? Number(meoshiTuning.bonusEntrySlipCells ?? rules.reel.bonusEntrySlipCells ?? rules.reel.meoshiSlipCells ?? 3)
      : Number(meoshiTuning.meoshiSlipCells ?? rules.reel.meoshiSlipCells ?? 3);
  }

  function getLineBlockSymbolsForSpin(spinOrKind = currentSpin) {
    const kind = typeof spinOrKind === "string" ? spinOrKind : spinOrKind?.kind;
    const symbols = [...(rules.reel.decorativeSymbols || [])];
    if (kind !== "bonusEntry") symbols.push(...(rules.reel.normalForbiddenLineSymbols || []));
    return [...new Set(symbols.filter(Boolean))];
  }

  function pickSafeLineStopPattern(role, kind) {
    const blockedSymbols = getLineBlockSymbolsForSpin(kind);
    for (let attempt = 0; attempt < 48; attempt += 1) {
      const pattern = reelsApi.pickLineStopPattern(role, rng);
      if (!reelsApi.findLineBySymbols?.(pattern, blockedSymbols)) return pattern;
    }
    return reelsApi.pickLineStopPattern(role, rng);
  }

  function shouldFlashRole(role) {
    return role?.id === "watermelon" || role?.cherry;
  }

  function showRoleFlash(role) {
    if (!dom.roleFlash || !shouldFlashRole(role)) return;
    const flash = {
      watermelon: {
        title: "スイカ",
        kicker: "RARE",
        image: "./assets/effects/runtime/cut_surprised_toshiya.webp",
      },
      weakCherry: {
        title: "チェリー",
        kicker: "CHANCE",
        image: "./assets/effects/runtime/cut_comic_smug_maane_toshiya.webp",
      },
      strongCherry: {
        title: "中段チェリー",
        kicker: "STRONG",
        image: "./assets/effects/runtime/cut_comic_big_surprise_toshiya.webp",
      },
    }[role.id] || {
      title: role.name || "レア役",
      kicker: "CHANCE",
      image: "./assets/effects/runtime/cut_surprised_toshiya.webp",
    };
    roleFlashToken += 1;
    const token = roleFlashToken;
    if (dom.roleFlashImage) {
      dom.roleFlashImage.src = flash.image;
      dom.roleFlashImage.alt = flash.title;
    }
    if (dom.roleFlashKicker) dom.roleFlashKicker.textContent = flash.kicker;
    if (dom.roleFlashTitle) dom.roleFlashTitle.textContent = flash.title;
    dom.roleFlash.hidden = false;
    dom.roleFlash.dataset.role = role.id;
    requestAnimationFrame(() => dom.roleFlash?.classList.add("is-visible"));
    schedule(920, () => {
      if (token !== roleFlashToken || !dom.roleFlash) return;
      dom.roleFlash.classList.remove("is-visible");
      schedule(180, () => {
        if (token === roleFlashToken && dom.roleFlash) {
          dom.roleFlash.hidden = true;
          delete dom.roleFlash.dataset.role;
        }
      });
    });
  }

  function hideRoleFlash() {
    roleFlashToken += 1;
    dom.roleFlash?.classList.remove("is-visible");
    if (dom.roleFlash) {
      dom.roleFlash.hidden = true;
      delete dom.roleFlash.dataset.role;
    }
  }

  function buildAutoStopPattern(kind, role) {
    if (kind === "bonusGame") {
      return {
        pattern: pickSafeLineStopPattern(role, kind),
        aligned: true,
      };
    }
    if (kind === "bonusEntry" && isAutoBonusEntryRole(role)) {
      return {
        pattern: pickSafeLineStopPattern(role, kind),
        aligned: true,
      };
    }
    if (kind !== "normal") return null;
    if (!role || role.id === "blank") {
      return {
        pattern: reelsApi.buildNonWinningStops(rng),
        aligned: false,
      };
    }
    if (role?.id === "chance") {
      return {
        pattern: reelsApi.buildNonWinningStops(rng),
        aligned: false,
      };
    }
    if (role?.id === "replay") {
      return {
        pattern: pickSafeLineStopPattern(role, kind),
        aligned: true,
      };
    }
    if (role?.id === "bell") {
      return {
        pattern: pickSafeLineStopPattern(role, kind),
        aligned: true,
      };
    }
    if (isNormalMeoshiPayoutRole(role)) return null;
    return {
      pattern: pickSafeLineStopPattern(role, kind),
      aligned: true,
    };
  }

  function canPlayNormalLoopScene() {
    return state.phase === "normal" && state.internalState !== "bonusReady" && !judgeRunning;
  }

  function playNormalLoopScene() {
    if (!canPlayNormalLoopScene()) return null;
    const scene = scenes.pickNormalLoopScene({
      internalState: state.internalState,
      normalStage: state.normalStage,
      preludeRemaining: state.preludeRemaining,
    }, rng);
    state.lastSceneId = scene.scene_id;
    scenePlayer.playScene(scene.scene_id, { message: state.lastMessage || scene.message });
    render();
    return scene;
  }

  function handleSceneVideoEnded() {
    playNormalLoopScene();
  }

  function updateSceneMessage() {
    scenePlayer.updateCopy?.({ message: state.lastMessage || "" });
  }

  function spinAction() {
    if (currentSpin) {
      stopNextReel();
      return;
    }
    if (judgeRunning) return;
    if (state.phase === "bonus" && state.bonus?.gamesInSet >= state.bonus?.setGames) {
      runBonusJudge();
      return;
    }
    if (state.internalState === "bonusReady" && state.phase !== "bonus") {
      startReelSpin("bonusEntry");
      return;
    }
    startReelSpin(state.phase === "bonus" ? "bonusGame" : "normal");
  }

  function startReelSpin(kind) {
    if (kind === "normal" || kind === "bonusEntry") {
      if (kind === "normal" && state.replayCredit) {
        state = { ...state, replayCredit: false };
      } else {
        if (state.coins < rules.bet) {
          state.lastMessage = "メダルが足りない。";
          render();
          return;
        }
        state = { ...state, coins: state.coins - rules.bet };
      }
    }
    const forcedRole = nextForcedRoleId ? roleById(nextForcedRoleId) : null;
    nextForcedRoleId = null;
    const role = forcedRole || (kind === "bonusGame"
      ? engine.drawBonusRole(rng)
      : kind === "bonusEntry"
        ? getPendingEntryRole()
        : engine.drawRole(rng));
    const startedAt = now();
    lastMeoshiResult = null;
    currentSpin = {
      kind,
      role,
      startedAt,
      stops: [null, null, null],
      forcedStops: nextForcedStops,
      autoStop: buildAutoStopPattern(kind, role),
      meoshiSlips: [null, null, null],
      decorativeNudges: [null, null, null],
    };
    nextForcedStops = null;
    reelStates.forEach((reelState) => {
      reelState.spinStartOffset = reelState.offset;
      reelState.spinStartedAt = startedAt;
      reelState.stoppedIndex = null;
      reelState.locked = false;
      reelState.spinning = true;
      reelState.reel?.classList.remove("is-stopping");
      reelState.reel?.classList.add("is-spinning");
    });
    renderReels();
    startReelLoop();
    hideRoleFlash();
    if (kind === "normal") {
      state.lastMessage = isNormalMeoshiPayoutRole(role)
        ? `${role.name}を狙う。払い出しは目押し、内部効果は有効。`
        : `${role.name}。停止形は内部で決定済み。`;
      showRoleFlash(role);
    } else if (kind === "bonusEntry") {
      state.lastMessage = isAutoBonusEntryRole(role)
        ? `${role.name}。トシヤロゴは自動で揃う。`
        : `${role.name}を狙え。揃うまでボーナスは始まらない。`;
    } else {
      state.lastMessage = `${role.name}。内部成立で自動停止。`;
    }
    if (kind === "bonusGame") {
      const scene = scenes.pickBonusGameScene((state.bonus?.gamesInSet || 0) + 1);
      state.lastSceneId = scene.scene_id;
      scenePlayer.playScene(scene.scene_id, { message: state.lastMessage });
    } else {
      updateSceneMessage();
    }
    render();
  }

  function currentReelIndex(index) {
    const reelState = reelStates[index];
    if (!reelState) return 0;
    const offset = reelState.spinning ? computeSpinRawOffset(reelState) : reelState.offset;
    return offsetToNextStopIndex(offset);
  }

  function stopNextReel() {
    const index = currentSpin?.stops.findIndex((value) => value === null);
    if (index >= 0) stopReel(index);
  }

  function stopReel(index) {
    if (!currentSpin || currentSpin.stops[index] !== null) return;
    renderReels();
    const reelState = reelStates[index];
    const forced = currentSpin.forcedStops?.[index];
    const autoStop = currentSpin.autoStop?.pattern?.[index];
    let stopIndex = currentReelIndex(index);
    const hasAutoStop = Number.isFinite(Number(autoStop));
    const hasForcedStop = Number.isFinite(Number(forced));
    if (hasForcedStop) {
      stopIndex = Number(forced);
    } else if (hasAutoStop) {
      stopIndex = Number(autoStop);
    } else if (isManualMeoshiSpin(currentSpin)) {
      const slip = reelsApi.findSlipStop?.(currentSpin.role, index, stopIndex, currentSpin.stops, {
        maxSlipCells: getMeoshiSlipCells(currentSpin),
        forbiddenLineSymbols: getLineBlockSymbolsForSpin(currentSpin),
      });
      if (slip) {
        stopIndex = slip.stopIndex;
        currentSpin.meoshiSlips[index] = slip;
      } else {
        const pressedIndex = reelsApi.normalizeIndex(stopIndex);
        currentSpin.meoshiSlips[index] = {
          pressedIndex,
          stopIndex: pressedIndex,
          slipCells: null,
          directionAllowed: false,
          blockedByDirection: true,
          assisted: false,
          distance: Infinity,
        };
      }
    }
    if (!hasForcedStop && !hasAutoStop) {
      const wrongCherryAdjusted = reelsApi.avoidWrongCherryStop?.(currentSpin.role, index, stopIndex, currentSpin.stops, {
        maxNudgeCells: 3,
        avoidRoleCherry: true,
      });
      if (wrongCherryAdjusted?.adjusted) {
        stopIndex = wrongCherryAdjusted.stopIndex;
        currentSpin.decorativeNudges[index] = wrongCherryAdjusted;
      }
      const adjusted = reelsApi.avoidLineBySymbolsStop?.(index, stopIndex, currentSpin.stops, getLineBlockSymbolsForSpin(currentSpin), {
        maxNudgeCells: 2,
      });
      if (adjusted?.adjusted) {
        stopIndex = adjusted.stopIndex;
        currentSpin.decorativeNudges[index] = adjusted;
      }
    }
    const normalizedStopIndex = reelsApi.normalizeIndex(stopIndex);
    currentSpin.stops[index] = normalizedStopIndex;
    if (reelState) {
      reelState.spinning = false;
      reelState.locked = true;
      reelState.stoppedIndex = normalizedStopIndex;
      reelState.reel?.classList.remove("is-spinning");
      reelState.reel?.classList.add("is-stopping");
      applyReelOffset(reelState, indexToOffset(normalizedStopIndex));
      schedule(120, () => {
        reelState.reel?.classList.remove("is-stopping");
      });
    }
    if (currentSpin.stops.every((value) => value !== null)) finishSpin();
    render();
  }

  function finishSpin() {
    if (!currentSpin) return;
    const spin = currentSpin;
    currentSpin = null;
    stopReelLoop();
    lastMeoshiResult = buildMeoshiDebug(spin);
    const stopResult = reelsApi.evaluateStops(spin.role, spin.stops);

    if (spin.kind === "bonusEntry") {
      const event = engine.resolveBonusEntry(state, stopResult, rng, spin.role);
      state = event.nextState;
      if (event.started) {
        const sceneId = event.openingRole?.id === "toshiyaLogo" ? "bonus_open_logo" : "bonus_open_normal7";
        state.lastSceneId = sceneId;
        scenePlayer.playScene(sceneId, { message: state.lastMessage });
      } else {
        state.lastSceneId = "bonus_ready";
        scenePlayer.playScene("bonus_ready", { message: state.lastMessage });
      }
    } else if (spin.kind === "bonusGame") {
      const event = engine.resolveBonusGame(state, stopResult, rng, spin.role);
      state = event.nextState;
      const scene = scenes.pickBonusGameScene(state.bonus?.gamesInSet || 1);
      state.lastSceneId = scene.scene_id;
      scenePlayer.playScene(scene.scene_id, {
        message: state.bonus?.gamesInSet >= state.bonus?.setGames
          ? "30G消化。次のレバーでジャッジ。"
          : state.lastMessage,
      });
    } else {
      const event = engine.resolveNormalSpin(state, stopResult, rng, spin.role);
      state = event.nextState;
      if (state.internalState === "bonusReady") {
        const scene = scenes.getScene("bonus_ready");
        state.lastSceneId = scene.scene_id;
        scenePlayer.playScene(scene.scene_id, { message: state.lastMessage });
      } else {
        updateSceneMessage();
      }
    }

    saveState();
    render();
  }

  function startBonus() {
    const event = engine.startBonus(state, rng);
    state = event.nextState;
    const pattern = reelsApi.pickStopPattern(event.openingRole.id, rng);
    setReelStops(pattern);
    const sceneId = event.openingRole.id === "toshiyaLogo" ? "bonus_open_logo" : "bonus_open_normal7";
    state.lastSceneId = sceneId;
    scenePlayer.playScene(sceneId);
    saveState();
    render();
  }

  function runBonusJudge() {
    if (judgeRunning || state.phase !== "bonus" || !state.bonus) return;
    judgeRunning = true;
    const plan = state.bonus.currentSetPlan;
    const sceneChain = scenes.pickBonusJudgeScenes(plan);
    let offset = 0;
    for (const scene of sceneChain) {
      schedule(offset, () => {
        state.lastSceneId = scene.scene_id;
        scenePlayer.playScene(scene.scene_id);
        render();
      });
      offset += Math.max(600, Number(scene.duration || 1) * 420);
    }
    schedule(offset, () => {
      const event = engine.resolveBonusJudge(state, rng);
      state = event.nextState;
      judgeRunning = false;
      const finalScene = event.plan?.continued
        ? scenes.getScene("bonus_continue")
        : null;
      if (finalScene) {
        state.lastSceneId = finalScene.scene_id;
        scenePlayer.playScene(finalScene.scene_id, { message: state.lastMessage });
      } else {
        playNormalLoopScene();
      }
      saveState();
      render();
    });
    render();
  }

  function makeDebugPending() {
    return engine.drawPendingBonus(rng, "strongCherry");
  }

  function makeDebugPendingForEntry(entrySymbol) {
    const entry = rules.entrySymbols.find((item) => item.id === entrySymbol) || rules.entrySymbols[0];
    const pending = engine.drawPendingBonus(rng, entry.premium ? "chance" : null);
    return {
      ...pending,
      entrySymbol: entry.id,
      entryName: entry.name,
      premium: Boolean(entry.premium),
    };
  }

  function clampSlipCells(value, fallback) {
    const parsed = Math.floor(Number(value));
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.min(6, parsed));
  }

  function applyMeoshiTuning(options = {}) {
    meoshiTuning = {
      meoshiSlipCells: clampSlipCells(dom.debugMeoshiSlip?.value, meoshiTuning.meoshiSlipCells),
      bonusEntrySlipCells: clampSlipCells(dom.debugBonusEntrySlip?.value, meoshiTuning.bonusEntrySlipCells),
    };
    if (!options.silent) state = { ...state, lastMessage: `目押し調整: 通常${meoshiTuning.meoshiSlipCells}コマ / 7狙い${meoshiTuning.bonusEntrySlipCells}コマ。` };
    render();
    return meoshiTuning;
  }

  function forceDebugMeoshiRole() {
    applyMeoshiTuning({ silent: true });
    stopReelLoop();
    hideRoleFlash();
    currentSpin = null;
    judgeRunning = false;
    lastMeoshiResult = null;
    const roleId = dom.debugMeoshiRole?.value || "watermelon";
    const entryRole = rules.entrySymbols.find((entry) => entry.id === roleId);
    if (entryRole) {
      state = engine.normalizeState({
        ...state,
        phase: "normal",
        internalState: "bonusReady",
        pendingBonus: makeDebugPendingForEntry(roleId),
        bonus: null,
        preludeRemaining: 0,
        lastMessage: `デバッグ: ${entryRole.name}の目押しターン。`,
      });
      nextForcedRoleId = null;
      setReelStops(reelsApi.buildNonWinningStops(rng));
      saveState();
      playSceneForState();
      render();
      return;
    }
    const role = roleById(roleId);
    state = engine.normalizeState({
      ...state,
      phase: "normal",
      internalState: "normal",
      pendingBonus: null,
      bonus: null,
      preludeRemaining: 0,
      lastMessage: `デバッグ: 次ゲームを${role?.name || roleId}に固定。`,
    });
    nextForcedRoleId = roleId;
    setReelStops(reelsApi.buildNonWinningStops(rng));
    saveState();
    playSceneForState();
    render();
  }

  function playSceneForState() {
    if (state.phase === "bonus") {
      const scene = scenes.pickBonusGameScene((state.bonus?.gamesInSet || 0) + 1);
      state.lastSceneId = scene.scene_id;
      scenePlayer.playScene(scene.scene_id, { message: state.lastMessage });
      return;
    }
    if (state.internalState === "bonusReady") {
      state.lastSceneId = "bonus_ready";
      scenePlayer.playScene("bonus_ready", { message: state.lastMessage });
      return;
    }
    if (state.internalState === "prelude") {
      const scene = scenes.pickNormalScene({
        internalState: state.internalState,
        normalStage: state.normalStage,
        preludeRemaining: state.preludeRemaining,
      }, rng);
      state.lastSceneId = scene.scene_id;
      scenePlayer.playScene(scene.scene_id, { message: state.lastMessage || scene.message });
      return;
    }
    playNormalLoopScene();
  }

  function applyDebugState() {
    stopReelLoop();
    hideRoleFlash();
    currentSpin = null;
    judgeRunning = false;
    lastMeoshiResult = null;
    const requestedState = dom.debugState?.value || "normal";
    const requestedStage = dom.debugStage?.value || state.normalStage || "street";
    const coins = Math.max(0, Math.min(999999, Math.floor(Number(dom.debugCoins?.value) || 0)));
    let nextState = engine.normalizeState({
      ...engine.initialState(),
      coins,
      totalGames: state.totalGames,
      gamesSinceBonus: state.gamesSinceBonus,
      internalState: requestedState,
      normalStage: requestedStage,
      lastMessage: "デバッグ状態を反映した。",
    });
    if (requestedState === "prelude") {
      nextState = engine.enterPrelude(nextState, rng, "strongCherry");
      nextState.lastMessage = "デバッグ: 前兆中。";
    } else if (requestedState === "bonusReady") {
      nextState = engine.normalizeState({
        ...nextState,
        internalState: "bonusReady",
        pendingBonus: makeDebugPending(),
        preludeRemaining: 0,
        lastMessage: "デバッグ: 7揃え待ち。",
      });
    } else if (requestedState === "bonus") {
      const pending = makeDebugPending();
      nextState = engine.startBonus(engine.normalizeState({
        ...nextState,
        internalState: "bonusReady",
        pendingBonus: pending,
        lastMessage: "デバッグ: ボーナス中。",
      }), rng).nextState;
    }
    state = engine.normalizeState(nextState);
    setReelStops(reelsApi.buildNonWinningStops(rng));
    saveState();
    playSceneForState();
    render();
  }

  function resetDebugState() {
    stopReelLoop();
    hideRoleFlash();
    currentSpin = null;
    judgeRunning = false;
    lastMeoshiResult = null;
    state = engine.initialState();
    setReelStops([0, 0, 0]);
    saveState();
    playNormalLoopScene();
    render();
  }

  function syncDebugControls() {
    if (dom.debugState && document.activeElement !== dom.debugState) {
      dom.debugState.value = state.phase === "bonus" ? "bonus" : state.internalState;
    }
    if (dom.debugStage && document.activeElement !== dom.debugStage) {
      dom.debugStage.value = state.normalStage;
    }
    if (dom.debugCoins && document.activeElement !== dom.debugCoins) {
      dom.debugCoins.value = String(state.coins);
    }
    if (dom.debugMeoshiSlip && document.activeElement !== dom.debugMeoshiSlip) {
      dom.debugMeoshiSlip.value = String(meoshiTuning.meoshiSlipCells);
    }
    if (dom.debugBonusEntrySlip && document.activeElement !== dom.debugBonusEntrySlip) {
      dom.debugBonusEntrySlip.value = String(meoshiTuning.bonusEntrySlipCells);
    }
  }

  function render() {
    const labels = rules.internalStateLabels;
    if (dom.coin) dom.coin.textContent = state.coins.toLocaleString("ja-JP");
    if (dom.totalGames) dom.totalGames.textContent = state.totalGames.toLocaleString("ja-JP");
    if (dom.gamesSinceBonus) dom.gamesSinceBonus.textContent = state.gamesSinceBonus.toLocaleString("ja-JP");
    if (dom.role) dom.role.textContent = currentSpin?.role?.name || roleById(state.lastRole)?.name || state.lastRole || "待機";
    if (dom.payout) dom.payout.textContent = `${state.lastPayout || 0}枚`;
    if (dom.lamp) {
      dom.lamp.textContent = state.phase === "bonus"
        ? "BONUS"
        : state.internalState === "bonusReady"
          ? "確定"
        : state.preludeRemaining > 0
          ? "ざわつき"
        : state.normalStage === "deep"
          ? "強気配"
        : state.normalStage === "heat"
          ? "気配"
        : "通常";
    }
    if (dom.message) dom.message.textContent = state.lastMessage || "";
    if (dom.internalState) dom.internalState.textContent = labels[state.internalState] || state.internalState;
    if (dom.normalStage) dom.normalStage.textContent = state.normalStage;
    if (dom.prelude) dom.prelude.textContent = state.preludeRemaining > 0 ? `${state.preludeRemaining}G` : "-";
    if (dom.bonus) {
      dom.bonus.textContent = state.bonus
        ? `${state.bonus.setNumber}SET ${state.bonus.gamesInSet}/${state.bonus.setGames}G ST${state.bonus.stockSets}`
        : (state.pendingBonus ? state.pendingBonus.entryName : "-");
    }
    if (dom.sceneId) dom.sceneId.textContent = state.lastSceneId || "-";
    syncDebugControls();
    dom.stops.forEach((button, index) => {
      button.disabled = !currentSpin || currentSpin.stops[index] !== null;
    });
    if (dom.spin) {
      dom.spin.textContent = currentSpin
        ? "停止"
        : state.phase === "bonus" && state.bonus?.gamesInSet >= state.bonus?.setGames
        ? "ジャッジ"
        : state.internalState === "bonusReady" && state.phase !== "bonus"
          ? state.pendingBonus?.entrySymbol === "toshiyaLogo" ? "ロゴ" : "7狙い"
        : "回す";
    }
  }

  function getReelDebug() {
    const at = now();
    return reelStates.map((reelState) => {
      const rawOffset = reelState.spinning
        ? computeSpinRawOffset(reelState, at)
        : reelState.offset;
      return {
        index: reelState.index,
        offset: Number(reelState.offset.toFixed(3)),
        rawOffset: Number(rawOffset.toFixed(3)),
        nextStopIndex: offsetToNextStopIndex(rawOffset),
        stoppedIndex: reelState.stoppedIndex,
        locked: reelState.locked,
        spinning: reelState.spinning,
      };
    });
  }

  function buildMeoshiDebug(spin) {
    if (!spin) return null;
    return {
      kind: spin.kind,
      roleId: spin.role?.id || null,
      stops: spin.stops.map((value) => value === null || value === undefined ? null : reelsApi.normalizeIndex(value)),
      slips: spin.meoshiSlips.map((slip) => slip ? {
        pressedIndex: slip.pressedIndex ?? null,
        stopIndex: slip.stopIndex ?? null,
        slipCells: slip.slipCells ?? null,
        directionAllowed: Boolean(slip.directionAllowed),
        blockedByDirection: Boolean(slip.blockedByDirection),
        assisted: Boolean(slip.assisted),
      } : null),
      safetyNudges: spin.decorativeNudges.map((nudge) => nudge ? {
        stopIndex: nudge.stopIndex ?? null,
        slipCells: nudge.slipCells ?? null,
        nudgeCells: nudge.nudgeCells ?? null,
        directionAllowed: Boolean(nudge.directionAllowed),
        adjusted: Boolean(nudge.adjusted),
        blockedSymbol: nudge.blockedLine?.symbol || nudge.decorativeLine?.symbol || nudge.wrongCherry?.symbol || null,
      } : null),
    };
  }

  function renderGameToText() {
    renderReels();
    return JSON.stringify({
      route: "v2",
      coins: state.coins,
      totalGames: state.totalGames,
      gamesSinceBonus: state.gamesSinceBonus,
      internalState: state.internalState,
      normalStage: state.normalStage,
      preludeRemaining: state.preludeRemaining,
      phase: state.phase,
      pendingBonus: state.pendingBonus,
      bonus: state.bonus ? {
        entrySymbol: state.bonus.entrySymbol,
        rateLabel: state.bonus.rateLabel,
        stockSets: state.bonus.stockSets,
        setNumber: state.bonus.setNumber,
        gamesInSet: state.bonus.gamesInSet,
        setGames: state.bonus.setGames,
        totalPayout: state.bonus.totalPayout,
        currentSetPlan: state.bonus.currentSetPlan,
      } : null,
      replayCredit: state.replayCredit,
      spinning: Boolean(currentSpin),
      spinKind: currentSpin?.kind || null,
      stopped: currentSpin ? currentSpin.stops.map((value) => value !== null) : [true, true, true],
      currentRole: currentSpin?.role?.id || null,
      autoStopPattern: currentSpin?.autoStop?.pattern || null,
      autoStopAligned: currentSpin?.autoStop?.aligned ?? null,
      lastRole: state.lastRole,
      lastPayout: state.lastPayout,
      lastSceneId: state.lastSceneId,
      message: state.lastMessage,
      judgeRunning,
      roleFlashVisible: Boolean(dom.roleFlash && !dom.roleFlash.hidden && dom.roleFlash.classList.contains("is-visible")),
      roleFlashRole: dom.roleFlash?.dataset.role || null,
      meoshiTuning: { ...meoshiTuning },
      meoshiDebug: currentSpin ? buildMeoshiDebug(currentSpin) : lastMeoshiResult,
      reels: getReelDebug(),
    });
  }

  dom.spin?.addEventListener("click", spinAction);
  dom.stops.forEach((button) => {
    button.addEventListener("click", () => stopReel(Number(button.dataset.v2Stop)));
  });
  dom.debugApply?.addEventListener("click", applyDebugState);
  dom.debugReset?.addEventListener("click", resetDebugState);
  dom.debugMeoshiApply?.addEventListener("click", () => applyMeoshiTuning());
  dom.debugMeoshiForce?.addEventListener("click", forceDebugMeoshiRole);
  document.addEventListener("keydown", (event) => {
    if (event.code === "Space" || event.code === "ShiftLeft") {
      event.preventDefault();
      spinAction();
      return;
    }
    const stopKeys = { KeyZ: 0, KeyX: 1, KeyC: 2 };
    if (Object.hasOwn(stopKeys, event.code)) {
      event.preventDefault();
      stopReel(stopKeys[event.code]);
    }
  });

  global.render_game_to_text = renderGameToText;
  global.advanceTime = (ms) => {
    useVirtualTimers = true;
    virtualNow += Math.max(0, Number(ms) || 0);
    renderReels();
    runVirtualTimers();
    renderReels();
    render();
    return renderGameToText();
  };
  global.__toshiyaSlotV2Test = {
    setSeed(seed) {
      rng = engine.createSeededRng(seed);
      return renderGameToText();
    },
    setRandomSequence(values) {
      rng = engine.createSequenceRng(values);
      return renderGameToText();
    },
    setState(data) {
      state = engine.normalizeState({ ...engine.initialState(), ...data });
      saveState();
      render();
      return renderGameToText();
    },
    forceRole(roleId) {
      nextForcedRoleId = roleId;
      return renderGameToText();
    },
    forceStops(stopIndexes) {
      nextForcedStops = Array.isArray(stopIndexes) ? stopIndexes.slice(0, 3) : null;
      return renderGameToText();
    },
    forceStopSuccess(roleId) {
      const role = roleById(roleId || nextForcedRoleId) || rules.roles.find((item) => item.id === roleId);
      nextForcedStops = role?.cherry
        ? reelsApi.pickCherryStopPattern(role, rng)
        : reelsApi.pickLineStopPattern(role || roleId, rng);
      return renderGameToText();
    },
    getState() {
      return renderGameToText();
    },
    getReels() {
      renderReels();
      return JSON.stringify(getReelDebug());
    },
    previewStopIndexFromOffset(rawOffset) {
      return offsetToNextStopIndex(rawOffset);
    },
    playNormalLoopScene() {
      return playNormalLoopScene()?.scene_id || null;
    },
    applyDebug(data = {}) {
      if (dom.debugState && data.internalState) dom.debugState.value = data.internalState;
      if (dom.debugStage && data.normalStage) dom.debugStage.value = data.normalStage;
      if (dom.debugCoins && Number.isFinite(Number(data.coins))) dom.debugCoins.value = String(Number(data.coins));
      applyDebugState();
      return renderGameToText();
    },
    setMeoshiTuning(data = {}) {
      if (dom.debugMeoshiSlip && Number.isFinite(Number(data.meoshiSlipCells))) dom.debugMeoshiSlip.value = String(Number(data.meoshiSlipCells));
      if (dom.debugBonusEntrySlip && Number.isFinite(Number(data.bonusEntrySlipCells))) dom.debugBonusEntrySlip.value = String(Number(data.bonusEntrySlipCells));
      applyMeoshiTuning({ silent: true });
      return renderGameToText();
    },
  };

  if (state.phase === "bonus") {
    const initialScene = scenes.pickBonusGameScene((state.bonus?.gamesInSet || 0) + 1);
    state.lastSceneId = initialScene.scene_id;
    scenePlayer.playScene(initialScene.scene_id);
  } else if (state.internalState === "bonusReady") {
    state.lastSceneId = "bonus_ready";
    scenePlayer.playScene("bonus_ready");
  } else {
    playNormalLoopScene();
  }
  render();
})(globalThis);
