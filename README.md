# パチスロ トシヤイズム

ブラウザで動く、オリジナル世界観のパチスロ風ミニゲームです。
サーバー、ログイン、課金、ランキング、景品交換は使わず、HTML/CSS/JavaScriptだけで動きます。

## 遊び方

- `Space`: 回す。ボーナス確定中はBB開始。
- `Z / X / C`: 左・中・右リール停止。
- 1ゲーム3枚BET固定。
- 所持メダル、ショップ購入、内部状態は `localStorage` に保存。
- あいことばで状態を発行・復元できます。

## 現在の仕様

- 通常時は小役抽選、内部モード移行、前兆、ボーナス確定を処理します。
- 内部モードは `low / normal / high / preBonus / bonusReady`。
- ボーナス中は `battleBonus` としてセット継続型で進みます。
- 継続率は 66% / 79% / 84% / 88%。
- 弱チェリーは左リール上段または下段、強チェリーは左リール中段で見せます。
- 全体モードは説明書代わりの全体シート、プレイモードは実際に遊ぶ画面です。

詳しい仕様は [docs/game-rules.md](docs/game-rules.md) を参照してください。

## ローカル画像生成

OpenAI APIキーはチャットに貼らず、ソースコード、ログ、フロントエンド、ビルド成果物にも入れません。

1. `secrets/openai_api_key.txt.example` を参考に、`secrets/openai_api_key.txt` を作る。
2. `secrets/openai_api_key.txt` にOpenAI APIキーを1行で保存する。
3. PowerShellで次を実行する。

```powershell
.\scripts\start-with-openai-key.ps1
```

補助スクリプトは `secrets/openai_api_key.txt` を読み、現在の起動プロセスだけに `OPENAI_API_KEY` を設定してからローカルサーバーを起動します。アプリ本体とAPI処理は `OPENAI_API_KEY` だけを参照し、秘密ファイルを直接読みません。

起動後は `http://localhost:4173/` を開き、プレイモードの「画像生成」タブから入力文を送れます。画像生成APIはサーバー側の `/api/images/generate` で呼び出し、ブラウザ側からOpenAI APIへ直接アクセスしません。

`OPENAI_API_KEY` が未設定、秘密ファイルが存在しない、または空の場合は、APIキーの値を表示せずに案内だけを出します。本物のAPIキーや本物に見えるサンプルキーは、このREADMEやサンプルファイルに書かないでください。

## 公開用ビルド

公開時は、開発中の大きな元画像や一時ファイルを含めず、必要な実行ファイルだけを `dist/` にまとめます。

```powershell
node scripts/build-dist.mjs
```

生成される `dist/` には、次だけが入ります。

- `index.html`
- `src/*.js`
- `src/styles.css`
- 実行時に使う筐体画像、リール画像、WebP演出画像
- 検索避け用の `robots.txt` と `_headers`

## 公開先

最初のテスト公開は Cloudflare Pages を推奨します。

- Build command: `node scripts/build-dist.mjs`
- Output directory: `dist`
- Framework preset: なし、または static site

詳しい手順は [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) を参照してください。

## テスト

公開前の主な確認:

```powershell
node scripts/smoke-test.mjs
node scripts/bonus-smoke-test.mjs
node scripts/role-alignment-test.mjs
node scripts/effect-state-test.mjs
node scripts/effect-transition-test.mjs
node scripts/build-dist.mjs
node scripts/dist-smoke-test.mjs
```
