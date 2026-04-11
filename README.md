# マッチング管理

[English](README.en.md)

カードゲーム交流会・対戦イベントのためのマッチング管理アプリ。
サーバー不要・インストール不要。ブラウザだけで動作します。

**[アプリを開く](https://soichirow.github.io/matching-kanri/)**

---

## 特徴

- **自動マッチング** — 過去の対戦ペアを避け、異なるグループを優先して組み合わせ
- **イベント共有** — 参加コード(4桁)やQRコードで参加者にテーブル配席をリアルタイム共有
- **点数記録** — VP(勝利点)の記録と順位表の自動生成、CSVエクスポート
- **誰でも開催** — URLにアクセスするだけでイベントを作成・運営可能

## 画面構成

| 画面 | URL | 用途 |
|------|-----|------|
| トップページ | `index.html` | イベント作成・参加コード入力 |
| 管理画面 | `admin.html` | 主催者がプレイヤー/テーブル管理、マッチング操作 |
| 参加者ビュー | `view.html` | 参加者がスマホで座席・順位表・対戦履歴を閲覧 |

---

## 使い方

### 主催者

```
1. プレイヤーを追加（＋プレイヤーボタン / Excelから一括入力）
2. テーブルを追加（＋テーブルボタン）
3. マッチングボタンで自動配席 → 仮マッチプレビュー → 確定
4. 対戦終了 → 次のラウンドへ
```

### イベントの共有

1. 設定 → 「イベントを共有する」をクリック
2. 参加コード(4桁英数字)とURLが発行される
3. 参加者にコードまたはQRコードを共有
4. 管理画面での操作が自動で参加者に反映

### 参加者

1. 共有URLにアクセス、または `view.html` で参加コードを入力
2. 名前を検索 → 自分の座席・対戦相手が表示
3. テーブル一覧・順位表・対戦履歴をリアルタイムで確認

---

## 機能一覧

### マッチング
- スコアベースの自動マッチング（同グループ+5点、対戦済み+10点/回）
- ブラケット機能（同ブラケット内でのみマッチング）
- 少人数卓の連続回避
- 点数差を考慮したマッチング（VP有効時）
- 席移動の最小化（8卓以下は全順列探索）
- 仮マッチプレビュー → 個別確定/取消

### プレイヤー管理
- グループ（A-E + カスタム）— 同グループ同士を避ける
- ブラケット — 同ブラケット内でのみマッチング
- ステータス管理（待機/対戦中/除外）
- Excel/CSV一括インポート

### テーブル管理
- 2〜8人テーブル対応
- キャンバス上でドラッグ配置（グリッドスナップ）
- 部屋オブジェクト（壁・モニター等）の配置

### 点数・順位
- 対戦中テーブルにVP入力欄
- 累計点数による順位表
- CSVエクスポート

### イベント共有 (Supabase)
- 4桁参加コード + QRコード
- Supabase Realtimeでリアルタイム同期
- admin_keyによるセキュアな更新（RPC関数経由）
- 14日後に自動削除 (pg_cron)
- Google Sheetsへの日次バックアップ (GAS)

### その他
- ダーク/ライトテーマ
- Ctrl+Z で元に戻す（最大30件）
- localStorageに自動保存

---

## 技術構成

```
管理画面 (admin.html)  ← GitHub Pages で配信
    ↓ Supabase JS SDK
Supabase (PostgreSQL)  ← データ共有・リアルタイム同期
    ↑ REST API
参加者ビュー (view.html)  ← GitHub Pages で配信
```

### ファイル構成

```
index.html              トップページ（イベント作成・参加コード入力）
admin.html              管理画面（単一ファイル）
view.html               参加者ビューページ
src/
  store.js              localStorage CRUD（テスト用参照実装）
  matching.js           マッチングアルゴリズム
  layout.js             ドラッグ&ドロップ
tests/
  store.test.js         データ永続化テスト (38件)
  matching.test.js      マッチングアルゴリズムテスト (52件)
  layout.test.js        レイアウトテスト (16件)
e2e/
  app.spec.js           管理画面E2Eテスト (19件)
  share.spec.js         イベント共有E2Eテスト (3件)
  view.spec.js          参加者ビューE2Eテスト (8件)
gas-backup/
  Code.gs               GASバックアップスクリプト
  appsscript.json       GAS設定
```

### 外部サービス

| サービス | 用途 | 無料枠 |
|----------|------|--------|
| GitHub Pages | 静的ホスティング | 無制限 |
| Supabase | DB + リアルタイム同期 | 500MB / 200同時接続 |
| Google Sheets + GAS | バックアップ | 無制限 |
| Lucide Icons (CDN) | アイコン | - |

---

## 開発

```bash
npm install             # 依存インストール
npx vite                # 開発サーバー
npx vitest run          # 単体テスト (106件)
npx playwright test     # E2Eテスト (30件)
npx eslint .            # リンター
```

### Supabase DB スキーマ

```sql
create table tournaments (
  id text primary key default gen_random_uuid()::text,
  data jsonb not null default '{}',
  admin_key text not null default gen_random_uuid()::text,
  short_code text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

RPC関数: `create_tournament`, `update_tournament`, `delete_tournament`, `find_tournament_by_code`, `cleanup_old_tournaments`

---

## 免責事項

- 本アプリは **現状のまま (AS IS)** で提供されます。動作の完全性、正確性、信頼性について一切の保証はありません。
- 本アプリの使用により生じた **いかなる損害**（データの消失、イベント運営上のトラブル、その他一切の直接的・間接的損害を含む）についても、開発者は責任を負いません。
- データは **ブラウザの localStorage** および **外部サービス (Supabase)** に保存されます。ブラウザのデータ消去、サービスの障害・仕様変更等によりデータが失われる可能性があります。重要なデータは別途バックアップを取ることを推奨します。
- 外部サービス (Supabase, Google Sheets, CDN等) の可用性・無料枠の継続について、開発者は保証しません。
- 共有URLや参加コードを知る **誰もが閲覧可能** です。個人情報や機密情報をプレイヤー名等に含めないでください。
- 本アプリは個人開発のオープンソースプロジェクトであり、サポートや継続的なメンテナンスを保証するものではありません。

---

## 支援

このアプリが役に立ったら、開発を支援していただけると嬉しいです。

- [ほしいものリスト (Amazon)](https://www.amazon.jp/hz/wishlist/ls/1Z0X9ZM1D65A7?ref_=wl_share)
- [Amazon で支援](https://amzn.to/4dB8wlz)

> Amazonのアソシエイトとして、本プロジェクトの運営者は適格販売により収入を得ています。

---

## ライセンス

MIT - (c) そういちろう [@black777cat](https://x.com/black777cat)
