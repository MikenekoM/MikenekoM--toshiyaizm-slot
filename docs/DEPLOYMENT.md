# 公開手順

このゲームは静的サイトなので、`dist/` を公開できるサービスなら動きます。
まずはスロットに詳しい人へURLを渡して触ってもらう用途として、検索避け付きのテスト公開にします。

## 事前確認

公開前にローカルで確認します。

```powershell
node scripts/smoke-test.mjs
node scripts/bonus-smoke-test.mjs
node scripts/role-alignment-test.mjs
node scripts/effect-state-test.mjs
node scripts/effect-transition-test.mjs
node scripts/build-dist.mjs
node scripts/dist-smoke-test.mjs
```

`dist/` は公開に必要なファイルだけを入れるフォルダです。
元PNG、作業用画像、`tmp/`、`docs/`、テストスクリプトは公開物に含めません。

## 第一候補: Cloudflare Pages

公開テストは Cloudflare Pages が扱いやすいです。

1. GitHubに `toshiyaizm-slot` リポジトリを作る。
2. このフォルダの内容をpushする。
3. Cloudflare PagesでGitHubリポジトリを接続する。
4. Framework preset は `None` または静的サイトを選ぶ。
5. Build command に `node scripts/build-dist.mjs` を入れる。
6. Output directory に `dist` を入れる。
7. デプロイする。
8. 発行されたURLをテスターへ共有する。

現在の `dist/` には `robots.txt` と `_headers` を入れているため、検索エンジンには載せない前提です。
本公開に切り替える場合は、`scripts/build-dist.mjs` の検索避け設定を外してください。

## GitHub Pagesで出す場合

GitHub Pagesは `dist/` をそのまま出す設定が少し面倒なので、最初はCloudflare Pages推奨です。
GitHub Pagesを使うなら、GitHub Actionsで `node scripts/build-dist.mjs` を実行し、生成した `dist/` をPagesへアップロードする形にします。

## 手動アップロードで出す場合

NetlifyやCloudflare PagesのDirect Uploadを使う場合:

1. ローカルで `node scripts/build-dist.mjs` を実行する。
2. 生成された `dist/` フォルダをアップロードする。
3. 公開URLを開き、`Space / Z / X / C` と全体モード切り替えを確認する。

## テスターへ渡す文面

[docs/playtest-request.md](playtest-request.md) をそのまま送れます。
公開URLだけ先頭に追記してください。
