(function registerSlotV2ScenePlayer(global) {
  const scenes = global.ToshiyaSlotV2Scenes;

  function create(options = {}) {
    const root = options.root || (typeof document !== "undefined" ? document.querySelector("#v2Scene") : null);
    const mediaWrap = root?.querySelector("[data-scene-media]");
    const titleEl = root?.querySelector("[data-scene-title]");
    const messageEl = root?.querySelector("[data-scene-message]");
    const typeEl = root?.querySelector("[data-scene-type]");
    const timers = new Set();
    let currentScene = null;

    function clearTimers() {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    }

    function renderMedia(scene) {
      if (!mediaWrap) return;
      mediaWrap.textContent = "";
      const element = document.createElement(scene.asset_type === "video" ? "video" : "img");
      element.src = scene.asset_path;
      element.alt = scene.title || scene.scene_id;
      if (scene.asset_type === "video") {
        element.muted = true;
        element.loop = true;
        element.playsInline = true;
        element.autoplay = true;
        element.preload = "auto";
        element.play?.().catch(() => {});
      }
      mediaWrap.appendChild(element);
    }

    function applyTimelineStep(step) {
      if (!root || !step) return;
      root.dataset.timelineAction = step.action || "";
      if (step.action === "pulse") {
        root.classList.add("is-pulsing");
        const timer = setTimeout(() => root.classList.remove("is-pulsing"), 260);
        timers.add(timer);
      }
      if (step.action === "settle") root.classList.remove("is-pulsing");
    }

    function playScene(sceneId, context = {}) {
      clearTimers();
      const scene = scenes.getScene(sceneId);
      currentScene = { ...scene, context };
      if (root) {
        root.dataset.sceneId = scene.scene_id;
        root.dataset.sceneType = scene.scene_type;
        root.classList.toggle("is-blackout", scene.transition_type === "blackout");
      }
      renderMedia(scene);
      if (titleEl) titleEl.textContent = context.title || scene.title || scene.scene_id;
      if (messageEl) messageEl.textContent = context.message || scene.message || "";
      if (typeEl) typeEl.textContent = scene.scene_type;
      for (const step of scene.timeline) {
        const timer = setTimeout(() => applyTimelineStep(step), Math.max(0, Number(step.at) || 0) * 1000);
        timers.add(timer);
      }
      return currentScene;
    }

    function getCurrentScene() {
      return currentScene;
    }

    return { playScene, getCurrentScene, clearTimers };
  }

  const defaultPlayer = {
    playScene(sceneId, context = {}) {
      return scenes.getScene(sceneId, context);
    },
  };

  global.ToshiyaSlotV2ScenePlayer = {
    create,
    playScene(sceneId, context = {}) {
      if (typeof document === "undefined") return defaultPlayer.playScene(sceneId, context);
      if (!global.__toshiyaSlotV2ScenePlayer) {
        global.__toshiyaSlotV2ScenePlayer = create();
      }
      return global.__toshiyaSlotV2ScenePlayer.playScene(sceneId, context);
    },
  };
})(globalThis);
