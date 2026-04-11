# テスト概要

## 構成

| レイヤー | ツール | ファイル | 対象 |
|---------|--------|---------|------|
| Unit | vitest + jsdom | `tests/store.test.js` | データ永続化層 (22件) |
| Unit | vitest | `tests/matching.test.js` | マッチングアルゴリズム (40件) |
| Unit | vitest + jsdom | `tests/layout.test.js` | ドラッグ・座標管理 (10件) |
| E2E | Playwright | `e2e/app.spec.js` | 管理画面UI統合 (19件) |
| E2E | Playwright | `e2e/share.spec.js` | イベント共有機能 (3件) |
| E2E | Playwright | `e2e/view.spec.js` | 参加者ビュー (8件) |

## 実行方法

```bash
npx vitest run          # 単体テスト 72件
npx playwright test     # E2Eテスト 30件
npx eslint . --ext .js  # リンター
```

## Unit: store.test.js (22件)

### Players CRUD
- 追加でid/name/group/status設定、group省略→null、空文字→null
- bracket設定・解除（updatePlayer経由）
- 更新で既存フィールド保持、存在しないID→null
- 削除、他プレイヤーに影響なし

### Tables CRUD
- 追加でlabel/size/status/playerIds/座標設定、size省略→4
- sizeの境界値（2, 8）
- 更新、削除、存在しないID→null

### Matches
- 記録でtableId/playerIds/timestamp/scores(null)保存
- スコア記録・上書き・null戻し
- 全クリア（プレイヤー・テーブルに影響なし）

## Unit: matching.test.js (40件)

### pairPenalty
- 履歴なし→0、同グループ→+5、対戦n回→n×10
- VP差→floor(差/5)、VP差4→0（境界）、VP差5→1（境界）

### groupPenalty
- 2人/3人/4人グループでのペア合算

### generateMatching
- 空入力→空、基本配席、minFill境界
- グループ回避、対戦済み回避、VP差回避
- 20人(全探索上限)、21人以上(貪欲法)

### optimizeTableAssignment
- 席移動最小化、8卓(全順列)、9卓以上(貪欲法)

## Unit: layout.test.js (10件)

- マウスドラッグ、draggingクラス、.no-drag無効、destroy()

## E2E: app.spec.js (19件)

- マッチング基本フロー、ブラケット機能、ダイアログ操作
- レスポンシブ（PC/スマホ）、データ永続化
- イベント名設定→ヘッダー反映
- 新しいイベントを始める（テーブル維持、プレイヤーリセット）
- 解散ボタン確認ダイアログ
- 点数記録ON→VP入力欄表示

## E2E: share.spec.js (3件)

- イベント共有セクション表示
- 共有ボタンでID発行・URL表示
- 共有後にview.htmlでデータ表示

## E2E: view.spec.js (8件)

- IDなしでコード入力画面表示
- 存在しないIDでエラー表示
- タブ切替、名前検索・記憶、更新ボタン
- テーマ切替ボタン動作
- 座席バナー要素の存在確認
- コード入力→送信ボタン動作
