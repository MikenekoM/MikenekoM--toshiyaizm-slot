(function registerSlotV2Scenes(global) {
  const rules = global.ToshiyaSlotV2Rules;

  const baseTimeline = [
    { at: 0.0, action: "show_media" },
    { at: 0.3, action: "show_caption" },
    { at: 1.2, action: "pulse" },
    { at: 2.2, action: "settle" },
  ];

  const catalog = {
    normal_street_room: scene("normal_street_room", "normal", 2.6, "image", "assets/effects/runtime/bg_normal_stream_room.webp", "静かな配信部屋", "大きな変化はない。小さな違和感だけが残る。"),
    normal_street_midnight: scene("normal_street_midnight", "normal", 2.6, "image", "assets/effects/runtime/bg_normal_midnight_room.webp", "深夜の静けさ", "何も起きていないようで、画面だけが少し重い。"),
    normal_street_shadow: scene("normal_street_shadow", "normal", 2.6, "image", "assets/effects/runtime/bg_normal_subtle_shadow.webp", "弱い影", "期待するほどではない。だが完全には消えていない。"),
    normal_heat_comments: scene("normal_heat_comments", "normal", 2.8, "image", "assets/effects/runtime/bg_chance_comments.webp", "コメントがざわつく", "流れが少しだけ前のめりになる。"),
    normal_heat_ticket: scene("normal_heat_ticket", "normal", 2.8, "image", "assets/effects/runtime/bg_chance_race_ticket.webp", "握ったチャンス", "まだ確信はない。手元だけが熱い。"),
    normal_heat_table: scene("normal_heat_table", "normal", 2.8, "image", "assets/effects/runtime/bg_chance_baccarat_table.webp", "盤面の違和感", "外れてもおかしくない。だからこそ目が離せない。"),
    normal_deep_rumble: scene("normal_deep_rumble", "normal", 3.0, "image", "assets/effects/runtime/bg_prebonus_low_rumble.webp", "低いざわめき", "前兆のようにも見える。まだ言い切れない。"),
    normal_deep_pressure: scene("normal_deep_pressure", "normal", 3.0, "image", "assets/effects/runtime/bg_prebonus_deep_pressure.webp", "濃い圧", "画面の奥が沈む。強いが、確定ではない。"),
    normal_deep_hot: scene("normal_deep_hot", "normal", 3.0, "image", "assets/effects/runtime/bg_hot_baccarat_pressure.webp", "赤い圧", "当たっていてほしい。その願いをあえて揺らす。"),
    prelude_hint: scene("prelude_hint", "prelude", 3.1, "image", "assets/effects/runtime/bg_prebonus_low_rumble.webp", "前兆の奥", "内部では決まっている。だが画面はまだ答えを出さない。"),
    prelude_deep: scene("prelude_deep", "prelude", 3.2, "image", "assets/effects/runtime/bg_prebonus_deep_pressure.webp", "沈む画面", "残りゲームだけが、確定へ近づいていく。"),
    bonus_ready: scene("bonus_ready", "bonus_ready", 3.0, "image", "assets/effects/runtime/bg_premium_rainbow_ism.webp", "ボーナス確定", "次のレバーで揃う。ここから先は継続の勝負。"),
    bonus_open_normal7: scene("bonus_open_normal7", "bonus_open", 3.0, "image", "assets/effects/runtime/bonus_ism_awakening.webp", "7揃い", "通常7揃い。ストックと継続率はすでに決まっている。"),
    bonus_open_logo: scene("bonus_open_logo", "bonus_open", 3.2, "image", "assets/effects/runtime/bg_premium_rainbow_ism.webp", "トシヤロゴ揃い", "夢は大きい。だが完走確定ではない。"),
    bonus_early: scene("bonus_early", "bonus_game", 2.2, "image", "assets/effects/runtime/battle_faceoff_silhouette.webp", "期待感ゾーン", "強い演出が多い。けれど安心するには早い。"),
    bonus_middle: scene("bonus_middle", "bonus_game", 2.2, "image", "assets/effects/runtime/battle_enemy_attack.webp", "中間ゾーン", "強弱が混ざる。続く理由も終わる理由もある。"),
    bonus_uneasy: scene("bonus_uneasy", "bonus_game", 2.3, "image", "assets/effects/runtime/battle_hold_freeze.webp", "不穏ゾーン", "静かな間が増える。終わるかもしれない。"),
    bonus_judge_wait: scene("bonus_judge_wait", "bonus_judge", 2.8, "image", "assets/effects/runtime/battle_hold_freeze.webp", "最後のレバー", "ここで初めて、内部の答えが顔を出す。"),
    bonus_continue: scene("bonus_continue", "bonus_result", 3.0, "image", "assets/effects/runtime/battle_continue_counter.webp", "継続", "まだ終わらない。次のセットへ進む。"),
    bonus_lose: scene("bonus_lose", "bonus_result", 3.0, "image", "assets/effects/runtime/battle_lose_down.webp", "敗北", "終わったように見える。ここで終わることもある。"),
    revival_lose: scene("revival_lose", "revival", 2.0, "image", "assets/effects/runtime/battle_lose_down.webp", "敗北", "通常画面へ戻りそうになる。", { next_scene: "revival_wait" }),
    revival_wait: scene("revival_wait", "revival", 1.4, "image", "assets/effects/runtime/lose_baccarat_silence.webp", "無音", "一瞬、何も動かない。", { next_scene: "revival_logo", transition_type: "blackout" }),
    revival_logo: scene("revival_logo", "revival", 2.6, "image", "assets/effects/runtime/bonus_comic_dogeza_revival.webp", "復活", "ロゴが戻す。諦めたあとに、まだあった。"),
  };

  const normalSceneWeights = {
    street: [
      ["normal_street_room", 46],
      ["normal_street_midnight", 28],
      ["normal_street_shadow", 18],
      ["normal_heat_comments", 6],
      ["normal_deep_rumble", 2],
    ],
    heat: [
      ["normal_street_shadow", 16],
      ["normal_heat_comments", 30],
      ["normal_heat_ticket", 22],
      ["normal_heat_table", 18],
      ["normal_deep_rumble", 10],
      ["normal_deep_pressure", 4],
    ],
    deep: [
      ["normal_heat_comments", 10],
      ["normal_heat_table", 14],
      ["normal_deep_rumble", 28],
      ["normal_deep_pressure", 30],
      ["normal_deep_hot", 18],
    ],
  };

  function scene(scene_id, scene_type, duration, asset_type, asset_path, title, message, overrides = {}) {
    return {
      scene_id,
      scene_type,
      duration,
      asset_type,
      asset_path,
      audio_path: "",
      can_skip: true,
      transition_type: "fade",
      next_scene: "",
      title,
      message,
      timeline: baseTimeline.map((step) => ({ ...step })),
      ...overrides,
    };
  }

  function cloneScene(source) {
    return {
      ...source,
      timeline: source.timeline.map((step) => ({ ...step })),
    };
  }

  function getScene(sceneId) {
    return catalog[sceneId] ? cloneScene(catalog[sceneId]) : cloneScene(catalog.normal_street_room);
  }

  function weightedSceneId(entries, rng = Math.random) {
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = rng() * total;
    for (const [sceneId, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return sceneId;
    }
    return entries.at(-1)?.[0] || "normal_street_room";
  }

  function pickNormalScene(context = {}, rng = Math.random) {
    if (context.internalState === "bonusReady") return getScene("bonus_ready");
    if (context.internalState === "prelude") {
      return getScene(context.preludeRemaining <= 8 ? "prelude_deep" : "prelude_hint");
    }
    const stage = rules.stageOrder.includes(context.normalStage) ? context.normalStage : "street";
    const entries = normalSceneWeights[stage].map(([sceneId, weight]) => {
      let adjusted = weight;
      if (context.role?.rare && sceneId.includes("heat")) adjusted += 10;
      if (context.role?.strongRare && sceneId.includes("deep")) adjusted += 14;
      if (context.internalState === "high" && sceneId.includes("deep")) adjusted += 6;
      return [sceneId, adjusted];
    });
    return getScene(weightedSceneId(entries, rng));
  }

  function pickBonusGameScene(gamesInSet) {
    const game = Math.max(1, Number(gamesInSet) || 1);
    if (game <= 10) return getScene("bonus_early");
    if (game <= 20) return getScene("bonus_middle");
    if (game <= 27) return getScene("bonus_uneasy");
    return getScene("bonus_judge_wait");
  }

  function pickBonusJudgeScenes(plan) {
    if (plan?.continued && plan?.revival) {
      return [getScene("revival_lose"), getScene("revival_wait"), getScene("revival_logo")];
    }
    return [getScene(plan?.continued ? "bonus_continue" : "bonus_lose")];
  }

  global.ToshiyaSlotV2Scenes = {
    catalog,
    normalSceneWeights,
    getScene,
    pickNormalScene,
    pickBonusGameScene,
    pickBonusJudgeScenes,
  };
})(globalThis);
