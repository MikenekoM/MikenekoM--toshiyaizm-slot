(function registerSlotEffects(global) {
  const resultTable = [
    { id: "premium", name: "覚醒トシヤイズム", lamp: "虹の信念", payout: 5000, threshold: 0.005 },
    { id: "rush", name: "イズムラッシュ", lamp: "激アツ", payout: 800, threshold: 0.05 },
    { id: "normal", name: "トシヤボーナス", lamp: "当たり", payout: 100, threshold: 0.22 },
    { id: "lose", name: "ハズレ", lamp: "静寂", payout: 0, threshold: 1 },
  ];

  const effectPlans = {
    premium: {
      tier: "premium",
      top: "虹の信念",
      intro: { label: "フリーズ", title: "全停止まで瞬き禁止", message: "虹の導線が、信念を揃えに来ている。" },
      stops: [
        { top: "第一停止・虹", label: "違和感", title: "時が止まる", message: "左リールに異様な圧が宿る。" },
        { top: "第二停止・覚醒", label: "確信", title: "イズム臨界", message: "コメント欄の熱量が振り切れる。" },
        { top: "第三停止・祝", label: "完走", title: "覚醒確定", message: "最後の一押しで伝説が開く。" },
      ],
      final: { label: "フリーズ", title: "覚醒トシヤイズム", message: "信念、上位到達。" },
    },
    rush: {
      tier: "hot",
      top: "激アツ",
      intro: { label: "違和感", title: "空気が変わる", message: "静かな部屋に低い熱が混じる。" },
      stops: [
        { top: "第一停止・好機", label: "ざわつき", title: "金の気配", message: "まだ押し切れる温度だ。" },
        { top: "第二停止・激熱", label: "チャンス", title: "信念が濃くなる", message: "音の低さが、前兆の深さを告げる。" },
        { top: "第三停止・突入", label: "告知", title: "ラッシュ目前", message: "熱量は本物だった。" },
      ],
      final: { label: "金文字", title: "イズムラッシュ", message: "まとまったメダルを獲得。" },
    },
    normal: {
      tier: "normal",
      top: "通常",
      intro: { label: "通常", title: "静かな一回転", message: "配信部屋は静か。小さな違和感だけを拾う。" },
      stops: [
        { top: "第一停止・静", label: "通常", title: "淡々", message: "左リールは静かに止まった。" },
        { top: "第二停止・微", label: "違和感", title: "少し残る", message: "中リールで信念ランプがわずかに残る。" },
        { top: "第三停止・結果", label: "結果", title: "次を待つ", message: "派手さはない。次の契機を待つ。" },
      ],
      final: { label: "結果", title: "トシヤチャンス", message: "小さな違和感が残った。" },
    },
    lose: {
      tier: "lose",
      top: "通常",
      intro: { label: "通常", title: "コメント欄が静か", message: "停止ボタンで流れを見届ける。" },
      stops: [
        { top: "第一停止・静", label: "通常", title: "まだ静か", message: "左リールは淡々と止まった。" },
        { top: "第二停止・弱", label: "様子見", title: "信念待ち", message: "熱い文字はまだ出ない。" },
        { top: "第三停止・次回", label: "通常", title: "まあね……", message: "次の信念に期待。" },
      ],
      final: { label: "通常", title: "まあね……", message: "次の信念に期待。" },
    },
  };

  const effectAssets = {
    premium: {
      top: ["sign_premium_rainbow.png"],
      screen: ["bg_premium_rainbow_ism.png"],
      final: ["bonus_ism_awakening.png"],
    },
    rush: {
      top: ["sign_hot_red_gold.png"],
      screen: [
        "bg_prebonus_low_rumble.png",
        "bg_prebonus_deep_pressure.png",
        "bg_hot_racecourse.png",
        "bg_hot_baccarat_pressure.png",
      ],
      final: ["bonus_race_miracle.png", "bonus_baccarat_climax.png"],
    },
    normal: {
      top: ["sign_idle_purple.png", "sign_chance_gold.png"],
      screen: [
        "bg_normal_subtle_shadow.png",
        "bg_normal_listener_glance.png",
        "bg_normal_stream_room.png",
        "bg_normal_midnight_room.png",
        "bg_chance_comments.png",
        "bg_chance_race_ticket.png",
        "bg_chance_baccarat_table.png",
        "bg_comic_lucky_misread.png",
        "bg_comic_stream_freeze.png",
        "bg_comic_baccarat_wrong_table.png",
      ],
      final: ["bg_chance_comments.png", "bg_comic_lucky_misread.png"],
    },
    lose: {
      top: ["sign_idle_purple.png"],
      screen: ["bg_normal_stream_room.png", "bg_normal_midnight_room.png", "bg_comic_stream_freeze.png"],
      final: [
        "lose_back_view_racecourse.png",
        "lose_baccarat_silence.png",
        "lose_comic_table_collapse.png",
        "lose_comic_soul_escape.png",
      ],
    },
    battle: {
      faceoff: ["battle_faceoff_silhouette.png", "bg_hot_baccarat_pressure.png", "bg_hot_racecourse.png"],
      attack: ["battle_enemy_attack.png", "bg_hot_baccarat_pressure.png"],
      hold: ["battle_hold_freeze.png", "bg_premium_rainbow_ism.png", "bg_hot_racecourse.png"],
      continue: ["battle_continue_counter.png", "bonus_race_miracle.png", "bonus_baccarat_climax.png", "bonus_comic_dogeza_revival.png"],
      lose: ["battle_lose_down.png", "lose_baccarat_silence.png", "lose_comic_table_collapse.png", "lose_comic_soul_escape.png"],
      milestone: ["battle_milestone_20set.png", "bonus_ism_awakening.png", "bg_premium_rainbow_ism.png"],
    },
  };

  function getSpinTone({ role, modeNote }) {
    if (modeNote.becameReady) return "bonusReady";
    if (modeNote.enteredPreBonus) return "preBonus";
    if (modeNote.expectation === "preBonusDeep") return "preBonusDeep";
    if (modeNote.after === "high" && role.rare) return "high";
    if (role.strongRare) return "strongRare";
    if (role.rare) return "smallMismatch";
    if (role.payout > 0) return "smallWin";
    return "quiet";
  }

  function decorateSpinPlan(plan, { role, modeNote, modeLabel, preBonusRemaining }) {
    const tone = getSpinTone({ role, modeNote });
    const decorated = { ...plan, tone };
    if (modeNote.becameReady) {
      decorated.top = "ボーナス確定";
    } else if (modeNote.enteredPreBonus || tone === "preBonus" || tone === "preBonusDeep") {
      decorated.top = tone === "preBonusDeep" ? "前兆濃厚" : "前兆";
    } else if (tone === "high") {
      decorated.top = "高確";
    } else if (role.strongRare) {
      decorated.top = "激アツ";
    } else {
      decorated.top = modeLabel || "通常";
    }

    if (!modeNote.becameReady) {
      decorated.finalAsset = decorated.screenAsset;
    }

    decorated.intro = {
      label: role.rare ? "レア役" : "通常",
      title: tone === "quiet" ? "静かな一回転" : role.name,
      message: tone === "quiet"
        ? "90%は静かに流れる。小さな違和感だけを待つ。"
        : "停止ごとに期待感を確認する。",
    };
    decorated.stops = [
      { top: decorated.top, label: "第一停止", title: role.name, message: role.rare ? "左リールに違和感が残る。" : "静かに止まる。" },
      { top: decorated.top, label: "第二停止", title: modeLabel || "通常", message: tone === "quiet" ? "まだ派手な気配はない。" : "低い熱が少し増える。" },
      { top: decorated.top, label: "第三停止", title: modeNote.becameReady ? "ボーナス確定" : role.name, message: modeNote.message },
    ];
    decorated.final = {
      label: modeNote.becameReady ? "確定" : (role.rare ? "契機" : "結果"),
      title: modeNote.becameReady ? "ボーナス確定" : role.name,
      message: modeNote.becameReady
        ? `${modeNote.message} 継続率は内部で確定済み。`
        : modeNote.message,
      meta: preBonusRemaining > 0 ? `前兆残り${preBonusRemaining}G` : "",
    };
    return decorated;
  }

  function getBattleScene(stage, context) {
    const setLabel = `${context.nextSet}SET`;
    const rateText = `継続率${context.rateLabel}`;
    const scenes = {
      faceoff: {
        top: "BATTLE",
        label: setLabel,
        title: "信念バトル",
        message: `${rateText}。敵の圧がゆっくり近づく。`,
        assetGroup: "faceoff",
        tier: context.effectTier,
      },
      attack: {
        top: "攻撃",
        label: "敵攻撃",
        title: "受けるか、避けるか",
        message: "強い一撃。ここで終わるかもしれない間を作る。",
        assetGroup: "attack",
        tier: context.effectTier,
      },
      hold: {
        top: "溜め",
        label: "間",
        title: "まだ分からない",
        message: "一瞬止まる。反撃なら継続、倒れれば終了。",
        assetGroup: "hold",
        tier: context.effectTier,
      },
      continue: {
        top: context.milestoneReached ? "信念到達" : "継続",
        label: context.milestoneReached ? "到達" : "勝利",
        title: context.milestoneReached ? "信念到達" : `${context.bonusName} 継続`,
        message: context.milestoneReached
          ? `20SET到達。合計${context.totalPayout.toLocaleString("ja-JP")}枚。まだ終わらない。`
          : `勝利。合計${context.totalPayout.toLocaleString("ja-JP")}枚。次セットへ。`,
        assetGroup: context.milestoneReached ? "milestone" : "continue",
        tier: context.milestoneReached ? "premium" : context.effectTier,
      },
      lose: {
        top: "終了",
        label: "敗北",
        title: "バトル終了",
        message: `被弾。合計${context.totalPayout.toLocaleString("ja-JP")}枚で終了。`,
        assetGroup: "lose",
        tier: "lose",
      },
    };
    return scenes[stage] || scenes.faceoff;
  }

  global.ToshiyaEffectSequences = {
    resultTable,
    effectPlans,
    effectAssets,
    getSpinTone,
    decorateSpinPlan,
    getBattleScene,
  };
})(globalThis);
