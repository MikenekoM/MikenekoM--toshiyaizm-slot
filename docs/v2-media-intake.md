# V2 映像・音声素材 受領管理メモ

このメモは `docs/v2-handoff-2026-05-10.md` を読んだ後の作業用。今後は V2 を正として、トシヤから受け取る映像・音声を `scene_id` 単位で差し込む。

## 基本方針

- 正本入口は `v2.html`、実装本体は `src/v2/`。
- 演出の差し替え単位は `src/v2/slot-v2-scenes.js` の `scene_id`。
- 生素材は消さず、採用素材だけを実行時フォルダへ整形して置く。
- `normalStage` は内部状態ではなく、通常時動画の出やすさだけを変える示唆パラメータ。
- V2の音声はまだ `scene.audio_path` を再生していない。音を差し込む前に `slot-v2-scene-player.js` か V2用 audio manager の実装が必要。

## フォルダ役割

| 場所 | 役割 | 触り方 |
| --- | --- | --- |
| `assets/sample_by_toshiya/` | トシヤから来た小さめの元素材・参考素材 | 原則そのまま保管。加工しない |
| `assets/videos/movie/` | トシヤから来た大きめの元動画 | 原則そのまま保管。採用前の確認用 |
| `assets/videos/v2/` | V2で実際に読む採用済み動画 | `scene.asset_path` に入れる |
| `assets/voices/` | 採用予定の音声・SE | V2で使う場合は `assets/voices/v2/` を切ってよい |
| `assets/effects/runtime/` | V2で実際に読む画像・カットイン | 画像採用時の実行時置き場 |
| `output/imagegen/` | 説明画像、生成画像、試作画像 | 採用前の成果物置き場 |

## 受領から差し込みまで

1. 元ファイルを `assets/sample_by_toshiya/` または `assets/videos/movie/` に置く。
2. 下の受領台帳に、元ファイル名、用途候補、採用判断、対応 `scene_id` を記録する。
3. 採用する動画は軽量な mp4 にして `assets/videos/v2/` へ置く。
4. 採用する音声は用途別に短く切り、`assets/voices/v2/` へ置く。
5. `src/v2/slot-v2-scenes.js` の `asset_path` / `audio_path` を `scene_id` ごとに更新する。
6. 差し替え後は最低限 `npm run test:v2`、`node scripts/build-dist.mjs`、`node scripts/dist-smoke-test.mjs` を実行する。

## 現在の受領済み素材

| 元ファイル | 状態 | 用途候補 | 次アクション |
| --- | --- | --- | --- |
| `assets/videos/movie/通常時ステージ_LOW.mkv` | 受領済み | `normal_street_*` | 採用済み mp4 と見比べて差し替え判断 |
| `assets/videos/movie/通常時ステージ_MID.mkv` | 受領済み | `normal_heat_*` | 採用済み mp4 と見比べて差し替え判断 |
| `assets/videos/movie/通常時_Hi.mkv` | 受領済み | `normal_deep_*` / `prelude_*` | 採用済み mp4 と見比べて差し替え判断 |
| `assets/videos/movie/弱チェリー.mkv` | 受領済み | `normal_role_weak_cherry` | 採用済み mp4 と見比べて差し替え判断 |
| `assets/videos/movie/強チェリー.mkv` | 受領済み | `normal_role_strong_cherry` | 採用済み mp4 と見比べて差し替え判断 |
| `assets/sample_by_toshiya/*` | 受領済み | 参考画像/短尺動画候補 | 何を採用素材にするかユーザー確認 |

## scene_id 差し替え台帳

| scene_id | 種別 | 現在の参照 | 差し替え候補 |
| --- | --- | --- | --- |
| `normal_street_room` | 通常 | `assets/videos/v2/normal-stage-low.mp4` | LOW系動画 |
| `normal_street_midnight` | 通常 | `assets/videos/v2/normal-stage-low.mp4` | LOW系動画 |
| `normal_street_shadow` | 通常 | `assets/videos/v2/normal-stage-low.mp4` | LOW系動画 |
| `normal_heat_comments` | 通常ざわつき | `assets/videos/v2/normal-stage-mid.mp4` | MID系動画 |
| `normal_heat_ticket` | 通常ざわつき | `assets/videos/v2/normal-stage-mid.mp4` | MID系動画 |
| `normal_heat_table` | 通常ざわつき | `assets/videos/v2/normal-stage-mid.mp4` | MID系動画 |
| `normal_deep_rumble` | 深い気配 | `assets/videos/v2/normal-stage-high.mp4` | Hi系動画 |
| `normal_deep_pressure` | 深い気配 | `assets/videos/v2/normal-stage-high.mp4` | Hi系動画 |
| `normal_deep_hot` | 深い気配 | `assets/videos/v2/normal-stage-high.mp4` | Hi系動画 |
| `normal_role_weak_cherry` | 小役カットイン | `assets/videos/v2/role-weak-cherry.mp4` | 弱チェリー動画 |
| `normal_role_strong_cherry` | 小役カットイン | `assets/videos/v2/role-strong-cherry.mp4` | 強チェリー動画 |
| `prelude_hint` | 前兆 | `assets/videos/v2/normal-stage-high.mp4` | 前兆用動画が来たら専用化 |
| `prelude_deep` | 前兆 | `assets/videos/v2/normal-stage-high.mp4` | 前兆用動画が来たら専用化 |
| `bonus_ready` | 確定 | `assets/effects/runtime/bg_premium_rainbow_ism.webp` | 確定動画/画像 |
| `bonus_open_normal7` | 開始 | `assets/effects/runtime/bonus_ism_awakening.webp` | 7揃い開始動画 |
| `bonus_open_logo` | 開始 | `assets/effects/runtime/bg_premium_rainbow_ism.webp` | ロゴ揃い開始動画 |
| `bonus_early` | BB 1-10G | `assets/effects/runtime/battle_faceoff_silhouette.webp` | 序盤バトル動画 |
| `bonus_middle` | BB 11-20G | `assets/effects/runtime/battle_enemy_attack.webp` | 中盤バトル動画 |
| `bonus_uneasy` | BB 21-27G | `assets/effects/runtime/battle_hold_freeze.webp` | 不穏バトル動画 |
| `bonus_judge_wait` | BB 28-30G | `assets/effects/runtime/battle_hold_freeze.webp` | 判定前動画 |
| `bonus_continue` | 継続 | `assets/effects/runtime/battle_continue_counter.webp` | 継続動画/SE |
| `bonus_lose` | 敗北 | `assets/effects/runtime/battle_lose_down.webp` | 敗北動画/SE |
| `revival_lose` | 復活前 | `assets/effects/runtime/battle_lose_down.webp` | 復活前動画 |
| `revival_wait` | 復活間 | `assets/effects/runtime/lose_baccarat_silence.webp` | 無音/暗転動画 |
| `revival_logo` | 復活 | `assets/effects/runtime/bonus_comic_dogeza_revival.webp` | 復活動画/SE |

## 音声差し込み時の実装メモ

- `slot-v2-scenes.js` の `scene()` には `audio_path` があるが、現状 `slot-v2-scene-player.js` は音声要素を作っていない。
- まずは `audio_path` がある scene のみ `<audio>` を作成し、`muted` 状態やユーザー操作後の再生制限を扱う。
- 既存の `src/slot-audio.js` は WebAudio の疑似SEなので、実音声ファイル再生とは分けて実装するのが安全。
- 音声素材のファイル名は、`scene_id` と対応する ASCII 名に寄せる。例: `assets/voices/v2/bonus_continue_01.mp3`。
