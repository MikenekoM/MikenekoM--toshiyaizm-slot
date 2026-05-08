# slot-core-v2 追加演出素材キュー

このキューは `imagegen` スキル用。画像内文字、既存作品の固有キャラ、商標、読めるロゴは禁止。文字はHTML/CSS側で重ねる。

ユーザー確認後、組み込み画像生成の出力を採用した。API直叩き、従量課金CLI、`OPENAI_API_KEY` は使っていない。

## 採用結果

- 元画像: `C:\Users\piros\.codex\generated_images\019e0525-c6aa-7040-9f68-d9ab4044a031\ig_0e971e87de0e67520169fd414434708191acadbb4e5d4699ba.png`
- 作業保存: `output/imagegen/slot-core-v2/`
- 実行時素材: `assets/effects/runtime/*.webp`
- 採用判断: 既存の黒/金/紫/赤の液晶演出、トシヤ風VTuber、静→前兆→バトル→到達の流れに合うため採用。横長パネルだったため、16:9キャンバスにぼかし背景付きで配置している。

## 共通指定

Use case: stylized-concept  
Asset type: pachislot game LCD effect image for TOSHIYAISM SLOT  
Style/medium: polished anime VTuber game illustration, dramatic pachislot LCD art, original IP  
Subject: male VTuber avatar inspired by Toshiya, short dark brown hair, black glasses, small mustache and goatee, expressive adult male, streamer room / suit-like outfit  
Composition/framing: 16:9 LCD background, leave center-safe space for HTML text overlays  
Constraints: no readable text, no logos, no watermark, no real brands, no existing manga/anime character likeness, no trademark-like symbols  
Avoid: direct parody of existing pachislot titles, cheap neon clutter, distorted hands, overfilled composition

## 10枚キュー

1. `bg_normal_subtle_shadow.png`  
   静かな通常違和感。夜の配信部屋、モニター光だけが低く揺れ、背景の一部に薄い影。トシヤは気づいていない。彩度控えめ。

2. `bg_normal_listener_glance.png`  
   静かな通常違和感。コメント欄がほんの少しだけ流れ、机の上の小物が光る。派手な告知ではなく、気づく人だけ気づく温度。

3. `bg_prebonus_low_rumble.png`  
   前兆序盤。部屋の照明が落ち、紫と金の低い光が床から上がる。トシヤは表情を変えず、空気だけが重い。

4. `bg_prebonus_deep_pressure.png`  
   前兆濃厚。画面周辺に赤金の圧、配信部屋が暗転気味。トシヤの眼鏡に強い反射、爆発直前の静けさ。

5. `battle_faceoff_silhouette.png`  
   バトル敵登場。固有キャラではない抽象的な黒い挑戦者シルエットが液晶奥に立つ。トシヤは手前で構える。

6. `battle_enemy_attack.png`  
   敵攻撃。抽象的な拳圧や衝撃波が迫る。暴力的すぎず、パチスロ液晶の勝負演出として迫力を出す。

7. `battle_hold_freeze.png`  
   溜め。攻撃直後の一瞬停止。画面に亀裂のような光、トシヤの眼鏡だけが光る。結果はまだ分からない。

8. `battle_continue_counter.png`  
   継続。トシヤが反撃または回避し、金色の光で押し返す。歓喜よりも「まだ続く」緊張を残す。

9. `battle_lose_down.png`  
   敗北。トシヤが膝をつき、部屋の光が消える。重すぎず、次ゲームに戻れる余韻。

10. `battle_milestone_20set.png`  
    20SET到達。虹と金の光、トシヤが正面を見て信念到達。既存作品の昇天演出に似せず、配信部屋とイズムの到達感で作る。
