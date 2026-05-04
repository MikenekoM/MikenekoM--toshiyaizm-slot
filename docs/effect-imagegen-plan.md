# パチスロ トシヤイズム 演出画像生成 指示書

## 目的

「パチスロ トシヤイズム」の液晶演出、信念サイン、ボーナス告知、ハズレ演出に使う画像素材を、段階的に生成して揃える。

初期実装では、すべてを1枚絵で作り込むのではなく、背景画像・キャラリアクション・ランプ演出・文字レイヤーを組み合わせて、少ない素材で多くの演出に見せる。

## 基本方針

- 画像内の日本語文字は原則入れない。
- 「信念」「BONUS」「まあね」などの文字はHTML/CSS側で重ねる。
- 画像は派手だが、安っぽいネオンや雑な光エフェクトにしすぎない。
- パチスロの液晶演出らしく、黒、金、紫、赤、虹色を中心にする。
- トシヤはVTuberアバターとして扱う。
- トシヤの特徴は、黒〜濃茶の短髪、眼鏡、細い口ひげとあごひげ、スーツまたは配信者風衣装。
- 実在ギャンブルの広告にはしない。ゲーム内演出・ネタ表現として扱う。
- 競馬、バカラ、土下座、配信部屋、信念、理想をモチーフにする。

## 出力サイズ

- 液晶演出背景: 1920x1080
- 上部の信念サイン背景: 1280x360
- ボーナス確定/カットイン: 1080x1080 または 1536x1024
- ハズレ演出背景: 1920x1080
- 透過キャラ素材: 1024x1024、透明背景

## 優先順位

1. まず液晶背景を揃える。
2. 次に信念サイン用の横長画像を揃える。
3. ボーナス確定画像を揃える。
4. ハズレ画像を揃える。
5. 足りない反応差分を追加する。

## 最小セット

初期完成に必要な画像は18枚。

| ID | 種別 | ファイル名案 | 用途 |
|---|---|---|---|
| BG-01 | 通常背景 | bg_normal_stream_room.png | 通常待機 |
| BG-02 | 通常背景 | bg_normal_midnight_room.png | 夜の通常 |
| BG-03 | チャンス背景 | bg_chance_comments.png | コメントざわつき |
| BG-04 | チャンス背景 | bg_chance_race_ticket.png | 競馬チャンス |
| BG-05 | チャンス背景 | bg_chance_baccarat_table.png | バカラチャンス |
| BG-06 | 激アツ背景 | bg_hot_racecourse.png | 競馬激アツ |
| BG-07 | 激アツ背景 | bg_hot_baccarat_pressure.png | バカラ激アツ |
| BG-08 | プレミア背景 | bg_premium_rainbow_ism.png | 覚醒/プレミア |
| SIGN-01 | 信念サイン | sign_idle_purple.png | 待機 |
| SIGN-02 | 信念サイン | sign_chance_gold.png | チャンス |
| SIGN-03 | 信念サイン | sign_hot_red_gold.png | 激アツ |
| SIGN-04 | 信念サイン | sign_premium_rainbow.png | プレミア |
| BONUS-01 | 確定画像 | bonus_race_miracle.png | 競馬ボーナス |
| BONUS-02 | 確定画像 | bonus_baccarat_climax.png | バカラボーナス |
| BONUS-03 | 確定画像 | bonus_ism_awakening.png | 覚醒ボーナス |
| LOSE-01 | ハズレ画像 | lose_back_view_racecourse.png | 背中でがっかり |
| LOSE-02 | ハズレ画像 | lose_baccarat_silence.png | バカラ敗北 |
| CUT-01 | 透過キャラ | cut_surprised_toshiya.png | 驚き差分 |

## コミカル追加セット

真面目な激アツ演出だけではキャラの魅力が薄くなるため、2D寄りであほっぽい差分を追加する。

| ID | 種別 | ファイル名 | 用途 |
|---|---|---|---|
| COMIC-CUT-01 | 2Dキャラ | cut_comic_big_surprise_toshiya.png | 大げさな驚き |
| COMIC-CUT-02 | 2Dキャラ | cut_comic_dogeza_toshiya.png | 土下座/謝罪/復活前 |
| COMIC-CUT-03 | 2Dキャラ | cut_comic_crying_toshiya.png | 泣き/ハズレ後 |
| COMIC-CUT-04 | 2Dキャラ | cut_comic_baccarat_panic_toshiya.png | バカラでパニック |
| COMIC-BG-01 | 液晶背景 | bg_comic_lucky_misread.png | 勘違いチャンス |
| COMIC-BG-02 | 液晶背景 | bg_comic_empty_wallet_race.png | 空財布ハズレ |
| COMIC-BONUS-01 | 確定画像 | bonus_comic_accidental_win.png | なぜか当たった |
| COMIC-LOSE-01 | ハズレ画像 | lose_comic_table_collapse.png | 机に突っ伏す |
| COMIC-CUT-05 | 2Dキャラ | cut_comic_smug_maane_toshiya.png | まあね顔/謎の自信 |
| COMIC-CUT-06 | 2Dキャラ | cut_comic_dead_eyes_toshiya.png | 虚無顔/敗北 |
| COMIC-CUT-07 | 2Dキャラ | cut_comic_praying_ticket_toshiya.png | 馬券祈り |
| COMIC-CUT-08 | 2Dキャラ | cut_comic_guitar_panic_toshiya.png | ギターでごまかす |
| COMIC-BG-03 | 液晶背景 | bg_comic_stream_freeze.png | 配信フリーズ |
| COMIC-BG-04 | 液晶背景 | bg_comic_baccarat_wrong_table.png | バカラ卓勘違い |
| COMIC-BONUS-02 | 確定画像 | bonus_comic_dogeza_revival.png | 土下座復活 |
| COMIC-LOSE-02 | ハズレ画像 | lose_comic_soul_escape.png | 魂が抜ける |

## 生成プロンプト共通部

Use case: stylized-concept  
Asset type: pachislot game effect image  
Style/medium: high-quality anime VTuber illustration, dramatic pachislot LCD art, polished game asset  
Subject: male VTuber avatar inspired by Toshiya; short dark brown hair, black glasses, small mustache and goatee, expressive eyes, slim adult male, suit-like or streamer outfit  
Lighting/mood: cinematic, dramatic, glossy pachislot lighting  
Color palette: black, gold, purple, red, with scene-specific accent colors  
Constraints: no readable text, no logos, no watermark, no real brand names, avoid cheap flat SVG shapes, avoid distorted hands, keep character appealing and consistent  

## 生成キュー

### BG-01 bg_normal_stream_room.png

通常時の配信部屋。暖色の部屋、机、マイク、ギター、紫のカーテン。トシヤは画面中央より少し右、落ち着いて待機。液晶内背景に使うため、中央に文字を重ねる余白を残す。

### BG-02 bg_normal_midnight_room.png

夜の配信部屋。部屋は暗め、モニター光と小さな照明。トシヤは椅子に座り、静かに考えている。通常時の別背景。

### BG-03 bg_chance_comments.png

コメント欄がざわつくチャンス演出。画面周辺に抽象的なコメント吹き出しや流れる光。トシヤは少し驚いた表情。中央は文字を重ねるため空ける。

### BG-04 bg_chance_race_ticket.png

競馬チャンス。競馬場のスタンド、馬券を握るトシヤ、期待と緊張の表情。紙吹雪ではなく、風と光で期待感を出す。

### BG-05 bg_chance_baccarat_table.png

バカラチャンス。暗いカジノ風テーブル、カードをめくる直前、トシヤは息を呑んでいる。赤と金の緊張感。

### BG-06 bg_hot_racecourse.png

激アツ競馬場。ゴール前の迫力、強い金色の光、馬券を握りしめて驚くトシヤ。画面全体に勝負感。文字は入れない。

### BG-07 bg_hot_baccarat_pressure.png

激アツバカラ。テーブル上のカード、赤い緊張感、トシヤの額に汗、金色の反射。勝つか負けるか直前の圧。

### BG-08 bg_premium_rainbow_ism.png

プレミア覚醒。虹色の光、紫の雷、金の装飾、トシヤが覚醒した表情で正面を見る。最も派手。ただし文字なし。

### SIGN-01 sign_idle_purple.png

横長の上部ランプ背景。黒と紫の高級感ある発光パネル。金の細い装飾。文字なし。

### SIGN-02 sign_chance_gold.png

横長の上部ランプ背景。紫ベースに金色の発光が強まる。チャンス告知向け。文字なし。

### SIGN-03 sign_hot_red_gold.png

横長の上部ランプ背景。赤と金の強い発光、中心から熱が出るような雰囲気。激アツ向け。文字なし。

### SIGN-04 sign_premium_rainbow.png

横長の上部ランプ背景。黒い高級パネルに虹色の光と金縁。プレミア向け。文字なし。

### BONUS-01 bonus_race_miracle.png

ボーナス確定用。競馬場で奇跡的に当たった雰囲気。トシヤが馬券を握って驚きと歓喜の表情。金色の爆発光。文字なし。

### BONUS-02 bonus_baccarat_climax.png

ボーナス確定用。バカラ卓で勝利を確信した瞬間。トシヤが驚きつつ前のめり。赤、黒、金の豪華な光。文字なし。

### BONUS-03 bonus_ism_awakening.png

覚醒ボーナス用。トシヤが正面で覚醒、紫雷、虹、金のオーラ。最上位演出。文字なし。

### LOSE-01 lose_back_view_racecourse.png

ハズレ用。競馬場で背中を向けてがっかりしているトシヤ。地面に外れ馬券。コミカルすぎず、配信ネタとして笑える落ち込み。

### LOSE-02 lose_baccarat_silence.png

ハズレ用。バカラ卓の前で沈黙するトシヤ。肩を落とし、照明は暗い。敗北感はあるが重すぎない。

### CUT-01 cut_surprised_toshiya.png

透過キャラ素材。トシヤが大きく驚く表情。眼鏡、短髪、ひげを維持。上半身。透明背景。画像に文字なし。

## 実装メモ

- 生成後の画像は `assets/effects/` に入れる。
- ファイル名は上記に合わせる。
- `src/app.js` 側では、結果タイプごとに背景候補をランダム選択する。
- 画像内テキストは使わず、今の `.effect-screen-overlay` と `.top-effect-overlay` の文字を活かす。
- ボーナス確定時は、背景画像を切り替えたうえで、CSSで金文字や虹エフェクトを重ねる。
