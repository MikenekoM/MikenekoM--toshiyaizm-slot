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
  };

  const scenePlayer = scenePlayerFactory.create({ root: document.querySelector("#v2Scene") });
  let rng = Math.random;
  let state = loadState();
  let currentSpin = null;
  let nextForcedRoleId = null;
  let nextForcedStops = null;
  let judgeRunning = false;
  let virtualNow = 0;
  let virtualTimers = [];
  let useVirtualTimers = false;

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
    if (state.phase === "bonus") {
      const bonusRole = rules.bonus.roles.find((role) => role.id === roleId);
      if (bonusRole) {
        const base = rules.roles.find((role) => role.id === roleId) || rules.roles[0];
        return { ...base, ...bonusRole, bonusGame: true, targetable: true };
      }
    }
    return rules.roles.find((role) => role.id === roleId) || null;
  }

  function setReelStops(stopIndexes) {
    stopIndexes.forEach((stopIndex, index) => {
      const reel = dom.reels[index];
      if (!reel) return;
      reel.classList.remove("is-spinning");
      reel.style.setProperty("--stop-y", `${reelsApi.normalizeIndex(stopIndex) * -rules.reel.cellHeight}px`);
    });
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
      startBonus();
      return;
    }
    startReelSpin(state.phase === "bonus" ? "bonusGame" : "normal");
  }

  function startReelSpin(kind) {
    if (kind === "normal") {
      if (!state.replayCredit) {
        if (state.coins < rules.bet) {
          state.lastMessage = "メダルが足りない。";
          render();
          return;
        }
        state = { ...state, coins: state.coins - rules.bet };
      } else {
        state = { ...state, replayCredit: false };
      }
    }
    const forcedRole = nextForcedRoleId ? roleById(nextForcedRoleId) : null;
    nextForcedRoleId = null;
    const role = forcedRole || (kind === "bonusGame" ? engine.drawBonusRole(rng) : engine.drawRole(rng));
    currentSpin = {
      kind,
      role,
      startedAt: now(),
      stops: [null, null, null],
      forcedStops: nextForcedStops,
    };
    nextForcedStops = null;
    dom.reels.forEach((reel) => {
      reel.style.setProperty("--spin-start", reel.style.getPropertyValue("--stop-y") || "0px");
      reel.classList.add("is-spinning");
    });
    const scene = kind === "bonusGame"
      ? scenes.pickBonusGameScene((state.bonus?.gamesInSet || 0) + 1)
      : scenes.pickNormalScene({
        internalState: state.internalState,
        normalStage: state.normalStage,
        role,
        preludeRemaining: state.preludeRemaining,
      }, rng);
    state.lastSceneId = scene.scene_id;
    state.lastMessage = `${role.name}を狙う。成功時だけ払い出し。`;
    scenePlayer.playScene(scene.scene_id, { message: state.lastMessage });
    render();
  }

  function currentReelIndex(index) {
    const elapsed = now() - currentSpin.startedAt + index * 37;
    return reelsApi.normalizeIndex(Math.floor(elapsed / rules.reel.spinMsPerSymbol));
  }

  function stopNextReel() {
    const index = currentSpin?.stops.findIndex((value) => value === null);
    if (index >= 0) stopReel(index);
  }

  function stopReel(index) {
    if (!currentSpin || currentSpin.stops[index] !== null) return;
    const forced = currentSpin.forcedStops?.[index];
    const stopIndex = Number.isFinite(Number(forced)) ? Number(forced) : currentReelIndex(index);
    currentSpin.stops[index] = reelsApi.normalizeIndex(stopIndex);
    dom.reels[index]?.classList.remove("is-spinning");
    dom.reels[index]?.style.setProperty("--stop-y", `${currentSpin.stops[index] * -rules.reel.cellHeight}px`);
    if (currentSpin.stops.every((value) => value !== null)) finishSpin();
    render();
  }

  function finishSpin() {
    if (!currentSpin) return;
    const spin = currentSpin;
    currentSpin = null;
    const stopResult = reelsApi.evaluateStops(spin.role, spin.stops);
    const visualStops = stopResult.success
      ? (stopResult.matchedPattern || reelsApi.pickStopPattern(spin.role, rng))
      : reelsApi.buildFailedStops(spin.role, rng);
    setReelStops(visualStops);

    if (spin.kind === "bonusGame") {
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
      const scene = scenes.pickNormalScene({
        internalState: state.internalState,
        normalStage: state.normalStage,
        role: event.role,
        preludeRemaining: state.preludeRemaining,
      }, rng);
      state.lastSceneId = scene.scene_id;
      scenePlayer.playScene(scene.scene_id, { message: state.lastMessage });
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
        : scenes.pickNormalScene({
          internalState: state.internalState,
          normalStage: state.normalStage,
        }, rng);
      state.lastSceneId = finalScene.scene_id;
      scenePlayer.playScene(finalScene.scene_id, { message: state.lastMessage });
      saveState();
      render();
    });
    render();
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
    dom.stops.forEach((button, index) => {
      button.disabled = !currentSpin || currentSpin.stops[index] !== null;
    });
    if (dom.spin) {
      dom.spin.textContent = currentSpin
        ? "停止"
        : state.phase === "bonus" && state.bonus?.gamesInSet >= state.bonus?.setGames
          ? "ジャッジ"
        : state.internalState === "bonusReady" && state.phase !== "bonus"
          ? "BB開始"
        : "回す";
    }
  }

  function renderGameToText() {
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
      spinning: Boolean(currentSpin),
      stopped: currentSpin ? currentSpin.stops.map((value) => value !== null) : [true, true, true],
      currentRole: currentSpin?.role?.id || null,
      lastRole: state.lastRole,
      lastPayout: state.lastPayout,
      lastSceneId: state.lastSceneId,
      message: state.lastMessage,
      judgeRunning,
    });
  }

  dom.spin?.addEventListener("click", spinAction);
  dom.stops.forEach((button) => {
    button.addEventListener("click", () => stopReel(Number(button.dataset.v2Stop)));
  });
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
    runVirtualTimers();
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
      nextForcedStops = reelsApi.pickStopPattern(role || roleId, rng);
      return renderGameToText();
    },
    getState() {
      return renderGameToText();
    },
  };

  const initialScene = scenes.pickNormalScene({
    internalState: state.internalState,
    normalStage: state.normalStage,
    preludeRemaining: state.preludeRemaining,
  }, rng);
  state.lastSceneId ||= initialScene.scene_id;
  scenePlayer.playScene(state.lastSceneId);
  render();
})(globalThis);
