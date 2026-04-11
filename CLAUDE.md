# CLAUDE.md — AI向けプロジェクトガイド

このファイルはAIコーディングアシスタント（Claude Code, Cursor, Copilot等）がこのプロジェクトを理解するためのドキュメントです。

## プロジェクト概要

カードゲームイベントのマッチング管理Webアプリ。フレームワーク不使用のVanilla JS単一ファイル構成。

- **管理画面**: `admin.html` — 主催者がプレイヤー/テーブル管理、マッチング操作
- **参加者ビュー**: `view.html` — 参加者がスマホで座席・順位・履歴を閲覧
- **バックエンド**: Supabase（PostgreSQL + Realtime）— イベント共有用
- **ホスティング**: GitHub Pages（静的配信）

## アーキテクチャ

```
admin.html (管理画面)
├── CSS: インラインstyle要素（CSS変数ベースのダーク/ライトテーマ）
├── HTML: 静的構造 + テンプレートリテラルによる動的レンダリング
└── JS: インラインscript要素
    ├── store層: localStorage CRUD (_load, _save, getPlayers, getTables, getMatches...)
    ├── Supabase同期: _supabase, _syncNow, _syncDebounce, RPC呼び出し
    ├── matching層: pairPenalty, groupPenalty, generateMatching, optimizeTableAssignment
    ├── layout層: enableDrag, applyPosition, snap (グリッドスナップ)
    ├── UI層: render() → renderPlayerStats, renderPlayers, renderRoomObjects, renderTables, renderMatchingBar
    └── ダイアログ: _openDlg/_closeDlg, dlgConfirm, dlgEditPlayer, dlgSettings...

view.html (参加者ビュー)
├── ES Module: import { createClient } from Supabase CDN
├── Supabase Realtime購読 + 30秒ポーリングフォールバック
└── renderTables, renderStandings, renderHistory, renderSeatBanner
```

## 重要な設計判断

### 単一ファイル構成
`admin.html`と`view.html`はそれぞれ1ファイルで完結。CSS/JS/HTMLすべてインライン。これはGitHub Pagesでビルドなしにデプロイするための意図的な設計。`src/`内のファイルはテスト用の参照実装であり、実際の動作には使用されない。

### データフロー
- 管理画面: localStorage → render() → 画面更新 + _syncDebounce() → Supabase
- 参加者ビュー: Supabase → fetchData()/Realtime → render() → 画面更新

### セキュリティモデル
- `admin_key`: イベント作成時にブラウザ側で生成、localStorageにのみ保存
- Supabase側: カラムレベル権限でanon読み取り不可
- 更新/削除: RPC関数(SECURITY DEFINER)でadmin_key照合
- anon keyはクライアントに公開されるが、書き込みはRPC経由のみ

### マッチングアルゴリズム
`generateMatching()` がコア。ペナルティスコアベースの貪欲法:
- 同グループ: +5点
- 対戦済み: +10点×回数
- VP差: +floor(差/5)点
- 20人以下: 全組み合わせ探索、21人以上: 貪欲法
- `optimizeTableAssignment()`: 席移動最小化の後処理（8卓以下は全順列、9卓以上は貪欲）

## コマンド

```bash
npx vite                # 開発サーバー
npx vitest run          # 単体テスト (72件)
npx playwright test     # E2Eテスト (30件)
npx eslint . --ext .js  # リンター
```

## テスト構成

- `tests/store.test.js` — localStorage CRUD (vitest + jsdom)
- `tests/matching.test.js` — マッチングアルゴリズム (vitest)
- `tests/layout.test.js` — ドラッグ&ドロップ (vitest + jsdom)
- `e2e/app.spec.js` — 管理画面E2E (Playwright)
- `e2e/share.spec.js` — イベント共有E2E (Playwright + Supabase実接続)
- `e2e/view.spec.js` — 参加者ビューE2E (Playwright)

## Supabase

- URL/Key: `admin.html`と`view.html`内にハードコード（anon key、公開可）
- テーブル: `tournaments` (id, data[JSONB], admin_key, short_code, created_at, updated_at)
- RPC関数: `create_tournament`, `update_tournament`, `delete_tournament`, `find_tournament_by_code`, `cleanup_old_tournaments`
- pg_cron: 毎日UTC 19:00(JST 4:00)に14日以上前のデータを自動削除

## コーディング規約

- フレームワーク不使用（Vanilla JS）
- 外部ライブラリはCDN経由のみ（Supabase JS SDK, Lucide Icons, qrcode-generator）
- HTMLエスケープは`esc()`関数を必ず使用
- UIテキストは日本語（「イベント」を使用、「大会」は使わない）
- CSSはCSS変数ベース（:rootとdata-theme="light"で切替）
- トグルスイッチは`.toggle`クラス（チェックボックスではなく）
- アイコンはLucide Icons（`<i data-lucide="icon-name">`、render()末尾でcreateIcons()）
- コミットメッセージ: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `cleanup:`, `security:`, `chore:`
