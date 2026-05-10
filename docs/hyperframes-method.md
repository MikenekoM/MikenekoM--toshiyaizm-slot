# HyperFrames 制作メモ

## 初回試作の目的

`hyperframes/toshiyaism-battle-trial/` は、既存の演出画像を HyperFrames の HTML+GSAP で再構成し、ゲーム内演出を動画素材として展開できるか確認するための試作です。動画制作は独立プロジェクトとして管理し、採用した MP4 だけをゲーム本体の液晶演出へ差し込みます。

## 素材選定

- 追加画像生成は使わず、`assets/effects/runtime/` の既存 WebP をコピーして使用します。
- 初回テーマは「信念バトル → 敵攻撃 → 溜め → 継続 → 20SET到達」です。
- 画像内に読める日本語を入れない既存方針に合わせ、告知文字や枚数表示は HTML/CSS レイヤーで重ねます。

## 構成方針

- `DESIGN.md` で黒、金、紫、赤、虹のパレットと文字ルールを固定します。
- `index.html` は単一コンポジションで、12秒のタイムラインを `window.__timelines["main"]` に登録します。
- GSAP は `opacity`, `x`, `y`, `scale`, `rotation` など視覚プロパティだけを動かします。
- 無限ループは使わず、点滅や脈動は12秒尺に収まる有限リピートにします。

## 検証手順

HyperFrames プロジェクト直下で以下を実行します。

```powershell
npx --yes hyperframes@0.5.5 lint
npx --yes hyperframes@0.5.5 inspect --samples 15
npx --yes hyperframes@0.5.5 render --output renders/toshiyaism-battle-trial.mp4 --quality draft
```

確認観点:

- 日本語テキストが画面外にはみ出していないか
- 背景や液晶素材が欠けていないか
- 既存作品や商標を連想させる固有表現がないか
- 12秒内で「対峙、攻撃、溜め、継続、到達」の流れが読めるか

## ゲーム内への差し替え

- 採用した MP4 は `assets/videos/` に置き、`scripts/build-dist.mjs` のコピー対象に追加します。
- 常時動かす背景動画は `ambientVideo` として、通常の静止画演出レイヤーより下に置きます。
- 一回だけ前面に出す到達演出やBB節目だけ `effectVideo` として扱い、再生中は `effectVideoPlaying` を立ててレバーと停止ボタンを一時停止します。
- 動画終了時、読み込み失敗時、別演出に切り替わる時は `pause()` と `currentTime = 0` で必ず片付けます。
- 静止画演出は下に残し、動画が再生できない環境でも最低限の画面表示が崩れないようにします。
- 液晶中央の結果名、役名、払い出し枚数などのHTML文字は表示しません。状態確認は左HUDとデバッグパネル側に寄せます。

## 通常背景ループ動画の量産

- 通常背景は `hyperframes/toshiyaism-normal-backgrounds/` にまとめ、`generate.mjs` で状態ごとの HyperFrames プロジェクトを生成します。
- 追加時は状態ID、表示名、尺、背景素材、切り抜き素材、アクセント色を `generate.mjs` に足して再生成します。
- 各背景は個別ディレクトリで `lint`、`inspect`、`render` を通し、採用MP4だけ `assets/videos/` にコピーします。
- ゲーム側では `src/app.js` の `ambientVideoClips` と `getAmbientVideoId()` で、内部状態から対応背景を選びます。
- 背景動画には結果文字や払い出し表示を焼き込みません。ゲーム側でも液晶中央の結果名、役名、コメント文字は出しません。
- `cut_*.webp` は名前だけでは採用しません。`scripts/create-alpha-cutouts.py` で生成した `cut_alpha_*.png` のように、実アルファを持つ透過素材だけを前景レイヤーとして使い、非透過矩形が見える素材は使用禁止です。
- 透過素材を作ったら、`RGBA`、`alpha_min=0`、`alpha_max=255` を確認し、`tmp/alpha-cutout-preview.png` で縁残りを目視確認してから動画に採用します。
- 背景動画には結果文字や払い出し表示を焼き込みません。ゲーム側でも液晶中央の結果HTML文字は出しません。
- 結果画面のたびに動画を前面再生する実装は通常時には使いません。通常時は液晶背景が常に動き、節目だけ前面動画を使います。

## 次回以降の拡張

- 必要なら `imagegen` 組み込み生成で追加背景や切り抜き素材を作り、採用分だけ動画プロジェクトへコピーします。
- ゲーム側のデバッグシナリオから、同じ演出順を JSON 的に書き出して HyperFrames へ渡す形にすると量産しやすくなります。
- 音声や効果音を入れる場合は、映像クリップに音を持たせず、HyperFrames の `<audio>` クリップとして別管理します。
