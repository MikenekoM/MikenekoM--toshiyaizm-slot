(function registerSlotV2Audio(global) {
  const basePath = "./assets/voices/v2";
  const assetPaths = {
    spins: [
      `${basePath}/reels/reel_spin_1.wav`,
      `${basePath}/reels/reel_spin_2.wav`,
      `${basePath}/reels/reel_spin_3.wav`,
    ],
    stops: [
      `${basePath}/reels/reel_stop_1.wav`,
      `${basePath}/reels/reel_stop_2.wav`,
      `${basePath}/reels/reel_stop_3.wav`,
    ],
    lever: `${basePath}/ui/lever_pull.wav`,
    buttonConfirm: `${basePath}/ui/button_confirm.wav`,
    buttonSoft: `${basePath}/ui/button_soft.wav`,
    bgm: {
      bonusConfirm: `${basePath}/bgm/bonus_confirm.mp3`,
      sevenMode: `${basePath}/bgm/seven_mode.mp3`,
    },
  };

  const reelProfiles = [
    { gain: 0.26, rate: 0.985, pan: -0.28 },
    { gain: 0.22, rate: 1.0, pan: 0 },
    { gain: 0.24, rate: 1.018, pan: 0.28 },
  ];
  const stopProfiles = [
    { gain: 0.43, rate: 1.03 },
    { gain: 0.43, rate: 1.03 },
    { gain: 0.43, rate: 1.03 },
  ];
  const uiProfiles = {
    lever: { gain: 0.42 },
    confirm: { gain: 0.34 },
    soft: { gain: 0.22 },
  };
  const bgmProfiles = {
    bonusConfirm: { gain: 0.44 },
    sevenMode: { gain: 0.44 },
  };
  const bgmTitles = {
    bonusConfirm: "ギャンブルが大好きだ（ボーナス確定）",
    sevenMode: "ギャンブルが大好きだ x（7揃モード）",
  };
  const bgmVolumeKeys = {
    bonusConfirm: "bgmBonusConfirm",
    sevenMode: "bgmSevenMode",
  };
  const defaultVolumes = {
    master: 1,
    reel: 1,
    stop: 1,
    lever: 1,
    button: 1,
    bgm: 1,
    bgmBonusConfirm: 1,
    bgmSevenMode: 1,
  };

  function createAudioElement(src, options = {}) {
    const element = new Audio(src);
    element.preload = "auto";
    element.loop = Boolean(options.loop);
    element.volume = Math.max(0, Math.min(1, Number(options.volume ?? 1)));
    element.playbackRate = Math.max(0.25, Math.min(4, Number(options.playbackRate ?? 1)));
    return element;
  }

  function clampVolume(value, fallback = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.min(2, number));
  }

  function normalizeVolumes(values = {}) {
    return Object.fromEntries(Object.entries(defaultVolumes).map(([key, value]) => [
      key,
      clampVolume(values[key], value),
    ]));
  }

  function create(options = {}) {
    const AudioContextCtor = global.AudioContext || global.webkitAudioContext;
    const muted = Boolean(options.muted);
    let volumes = normalizeVolumes(options.volumes);
    let context = null;
    let ready = false;
    let unlocked = false;
    let decodedCount = 0;
    let failedCount = 0;
    let nodeFailedCount = 0;

    const reelLoops = assetPaths.spins.map((src, index) => createAudioElement(src, {
      loop: true,
      volume: effectiveVolume("reel", reelProfiles[index].gain),
      playbackRate: reelProfiles[index].rate,
    }));
    const stopElements = assetPaths.stops.map((src, index) => createAudioElement(src, {
      volume: effectiveVolume("stop", stopProfiles[index].gain),
      playbackRate: stopProfiles[index].rate,
    }));
    const uiElements = {
      lever: createAudioElement(assetPaths.lever, { volume: effectiveVolume("lever", uiProfiles.lever.gain) }),
      confirm: createAudioElement(assetPaths.buttonConfirm, { volume: effectiveVolume("button", uiProfiles.confirm.gain) }),
      soft: createAudioElement(assetPaths.buttonSoft, { volume: effectiveVolume("button", uiProfiles.soft.gain) }),
    };
    const bgmElements = Object.fromEntries(Object.entries(assetPaths.bgm).map(([kind, src]) => [
      kind,
      createAudioElement(src, {
        loop: true,
        volume: effectiveBgmVolume(kind),
      }),
    ]));
    const reelSpinning = [false, false, false];
    const reelNodes = [null, null, null];
    const activeOneShots = new Set();
    const bgmFadeTimers = new Map();
    let currentBgmKind = null;

    function effectiveVolume(kind, baseGain) {
      return Math.max(0, Math.min(1, baseGain * volumes.master * (volumes[kind] ?? 1)));
    }

    function effectiveBgmVolume(kind) {
      const trackVolume = volumes[bgmVolumeKeys[kind]] ?? 1;
      return effectiveVolume("bgm", (bgmProfiles[kind]?.gain ?? 0) * trackVolume);
    }

    function effectiveReelGain(index) {
      return effectiveVolume("reel", reelProfiles[index]?.gain ?? 0);
    }

    function ensureContext() {
      if (!AudioContextCtor) return null;
      if (!context) context = new AudioContextCtor();
      if (context.state === "suspended") {
        context.resume?.().catch(() => {});
      }
      return context;
    }

    function preloadElement(element) {
      try {
        element.load?.();
        decodedCount += 1;
      } catch (_) {
        failedCount += 1;
      }
    }

    function preload() {
      if (ready) return Promise.resolve(getDebugState());
      [...reelLoops, ...stopElements, ...Object.values(uiElements), ...Object.values(bgmElements)].forEach(preloadElement);
      ready = true;
      return Promise.resolve(getDebugState());
    }

    function unlock() {
      unlocked = true;
      ensureContext();
      ensureReelNodes();
      preload();
      return unlocked;
    }

    function ensureReelNodes() {
      const activeContext = ensureContext();
      if (!activeContext?.createMediaElementSource) return;
      reelLoops.forEach((reel, index) => {
        if (reelNodes[index]) return;
        try {
          const source = activeContext.createMediaElementSource(reel);
          const gainNode = activeContext.createGain();
          const panNode = typeof activeContext.createStereoPanner === "function"
            ? activeContext.createStereoPanner()
            : null;
          gainNode.gain.value = effectiveReelGain(index);
          if (panNode) {
            panNode.pan.value = reelProfiles[index].pan;
            source.connect(panNode);
            panNode.connect(gainNode);
          } else {
            source.connect(gainNode);
          }
          gainNode.connect(activeContext.destination);
          reel.volume = 1;
          reelNodes[index] = { gainNode, panNode };
        } catch (_) {
          nodeFailedCount += 1;
          reelNodes[index] = { failed: true };
        }
      });
    }

    function setReelGain(index, value) {
      const node = reelNodes[index];
      if (node?.gainNode && context) {
        node.gainNode.gain.cancelScheduledValues(context.currentTime);
        node.gainNode.gain.setValueAtTime(value, context.currentTime);
        return true;
      }
      reelLoops[index].volume = value;
      return false;
    }

    function updateElementBaseVolumes() {
      stopElements.forEach((element, index) => {
        element.volume = effectiveVolume("stop", stopProfiles[index].gain);
      });
      uiElements.lever.volume = effectiveVolume("lever", uiProfiles.lever.gain);
      uiElements.confirm.volume = effectiveVolume("button", uiProfiles.confirm.gain);
      uiElements.soft.volume = effectiveVolume("button", uiProfiles.soft.gain);
      Object.entries(bgmElements).forEach(([kind, element]) => {
        element.volume = effectiveBgmVolume(kind);
      });
      reelLoops.forEach((reel, index) => {
        if (reelNodes[index]?.gainNode) {
          setReelGain(index, effectiveReelGain(index));
        } else {
          reel.volume = effectiveReelGain(index);
        }
      });
    }

    function cancelBgmFade(kind) {
      const timer = bgmFadeTimers.get(kind);
      if (timer) {
        global.clearTimeout?.(timer);
        bgmFadeTimers.delete(kind);
      }
    }

    function setBgmVolume(kind, value) {
      const element = bgmElements[kind];
      if (!element) return;
      element.volume = Math.max(0, Math.min(1, value));
    }

    function fadeOutBgm(kind, duration = 220) {
      const element = bgmElements[kind];
      if (!element) return;
      cancelBgmFade(kind);
      const startVolume = element.volume;
      const startedAt = performance.now();
      const step = () => {
        const progress = Math.min(1, (performance.now() - startedAt) / duration);
        element.volume = startVolume * (1 - progress);
        if (progress < 1) {
          const timer = global.setTimeout(step, 16);
          bgmFadeTimers.set(kind, timer);
          return;
        }
        stopElement(element);
        setBgmVolume(kind, effectiveBgmVolume(kind));
        bgmFadeTimers.delete(kind);
      };
      step();
    }

    function stopElement(element) {
      if (!element) return;
      try {
        element.pause();
        element.currentTime = 0;
      } catch (_) {}
    }

    function playClone(template, options = {}) {
      if (muted || !template) return;
      unlock();
      const clone = template.cloneNode(true);
      clone.volume = Math.max(0, Math.min(1, Number(options.volume ?? template.volume ?? 1)));
      clone.playbackRate = Math.max(0.25, Math.min(4, Number(options.playbackRate ?? template.playbackRate ?? 1)));
      const release = () => activeOneShots.delete(clone);
      activeOneShots.add(clone);
      clone.addEventListener("ended", release, { once: true });
      clone.addEventListener("error", release, { once: true });
      global.setTimeout(release, 3000);
      clone.play?.().catch(() => {
        release();
      });
    }

    function fadeStopReel(index) {
      const reel = reelLoops[index];
      if (!reel) return;
      const originalVolume = effectiveReelGain(index);
      const node = reelNodes[index];
      if (node?.gainNode && context) {
        const now = context.currentTime;
        node.gainNode.gain.cancelScheduledValues(now);
        node.gainNode.gain.setValueAtTime(originalVolume, now);
        node.gainNode.gain.linearRampToValueAtTime(0, now + 0.035);
        global.setTimeout(() => {
          stopElement(reel);
          setReelGain(index, originalVolume);
        }, 35);
        return;
      }
      reel.volume = Math.min(reel.volume || originalVolume, originalVolume);
      const startedAt = performance.now();
      const duration = 35;
      const step = () => {
        const progress = Math.min(1, (performance.now() - startedAt) / duration);
        reel.volume = originalVolume * (1 - progress);
        if (progress < 1) {
          global.requestAnimationFrame?.(step) || global.setTimeout(step, 8);
          return;
        }
        stopElement(reel);
        reel.volume = originalVolume;
      };
      step();
    }

    function startReels() {
      unlock();
      if (muted) return;
      reelLoops.forEach((reel, index) => {
        stopElement(reel);
        reel.loop = true;
        setReelGain(index, effectiveReelGain(index));
        reel.playbackRate = reelProfiles[index].rate;
        reelSpinning[index] = true;
        reel.play?.().catch(() => {});
      });
    }

    function stopReel(index) {
      const reelIndex = Number(index);
      if (!Number.isInteger(reelIndex) || reelIndex < 0 || reelIndex > 2) return;
      reelSpinning[reelIndex] = false;
      fadeStopReel(reelIndex);
      playClone(stopElements[reelIndex]);
    }

    function stopAllReels(options = {}) {
      reelLoops.forEach((reel, index) => {
        reelSpinning[index] = false;
        stopElement(reel);
        setReelGain(index, effectiveReelGain(index));
      });
      if (!options.silent) {
        stopElements.forEach((element, index) => playClone(element, {
          volume: effectiveVolume("stop", 0.22 - index * 0.02),
        }));
      }
    }

    function playLever() {
      playClone(uiElements.lever);
    }

    function playButton(kind = "soft") {
      playClone(kind === "confirm" ? uiElements.confirm : uiElements.soft);
    }

    function playBgm(kind) {
      if (!kind || !bgmElements[kind]) {
        stopBgm();
        return;
      }
      if (currentBgmKind === kind) {
        setBgmVolume(kind, effectiveBgmVolume(kind));
        return;
      }
      const previous = currentBgmKind;
      currentBgmKind = kind;
      if (previous) fadeOutBgm(previous, 160);
      cancelBgmFade(kind);
      const element = bgmElements[kind];
      stopElement(element);
      element.loop = true;
      setBgmVolume(kind, effectiveBgmVolume(kind));
      unlock();
      if (!muted) element.play?.().catch(() => {});
    }

    function stopBgm(options = {}) {
      const kind = currentBgmKind;
      currentBgmKind = null;
      if (!kind) return;
      if (options.silent) {
        cancelBgmFade(kind);
        stopElement(bgmElements[kind]);
        setBgmVolume(kind, effectiveBgmVolume(kind));
        return;
      }
      fadeOutBgm(kind, Number(options.fadeMs) || 220);
    }

    function syncModeBgm(kind) {
      if (kind) playBgm(kind);
      else stopBgm();
    }

    function setVolumes(nextVolumes = {}) {
      volumes = normalizeVolumes({ ...volumes, ...nextVolumes });
      updateElementBaseVolumes();
      return getDebugState();
    }

    function getVolumes() {
      return { ...volumes };
    }

    function getDebugState() {
      return {
        ready,
        muted,
        unlocked,
        reelSpinning: reelSpinning.slice(),
        decodedCount,
        failedCount,
        nodeFailedCount,
        webAudioReels: reelNodes.map((node) => Boolean(node?.gainNode)),
        volumes: getVolumes(),
        bgm: {
          current: currentBgmKind,
          available: Object.keys(bgmElements),
          tracks: Object.fromEntries(Object.keys(bgmElements).map((kind) => [
            kind,
            {
              title: bgmTitles[kind],
              volumeKey: bgmVolumeKeys[kind],
              effectiveVolume: effectiveBgmVolume(kind),
            },
          ])),
        },
        contextState: context?.state || null,
      };
    }

    preload();

    return {
      preload,
      unlock,
      playLever,
      playButton,
      playBgm,
      stopBgm,
      syncModeBgm,
      setVolumes,
      getVolumes,
      startReels,
      stopReel,
      stopAllReels,
      getDebugState,
    };
  }

  global.ToshiyaSlotV2Audio = { create };
})(globalThis);
