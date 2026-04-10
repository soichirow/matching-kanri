# テスト概要

## 構成

| レイヤー | ツール | ファイル | 対象 |
|---------|--------|---------|------|
| Unit | vitest + jsdom | `tests/store.test.js` | データ永続化層 |
| Unit | vitest | `tests/matching.test.js` | マッチングアルゴリズム |
| Unit | vitest + jsdom | `tests/layout.test.js` | ドラッグ・座標管理 |
| E2E | Playwright | `e2e/app.spec.js` | UI統合・ブラケット・レスポンシブ |

## Unit: store.test.js

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

## Unit: matching.test.js

### pairPenalty
- 履歴なし→0、同グループ→+5、対戦n回→n×10
- VP差→floor(差/5)、VP差4→0（境界）、VP差5→1（境界）
- group未設定→ペナルティなし、3要素全合算

### groupPenalty
- 2人/3人/4人グループでのペア合算

### generateMatching
- 空入力→空（待機0/テーブル0の両パターン）
- 基本: 4人1卓、8人2卓、異サイズ混合テーブル
- minFill: 境界(ちょうど/1人不足/未満)
- グループ回避、全員同グループ（回避不可能）
- 対戦済み回避、全員対戦済み
- VP差回避、shuffle動作
- ブラケット: フィルタ済みプール正常動作、少人数プール
- 20人(全探索上限)、21人以上(貪欲法)、プレイヤー超過

### optimizeTableAssignment
- 1卓→そのまま、席移動最小化
- 全員同テーブル(移動0)、全員別テーブル(最悪ケース)
- 8卓(全順列)、9卓以上(貪欲法)
- プレイヤー構成は不変

### buildScoreMap
- 空→空、scoresなしスキップ、累積加算（3試合以上）
- null→0扱い、部分データ

## Unit: layout.test.js

### enableDrag
- マウスドラッグで位置変更、draggingクラス付与・除去
- onMoveコールバック呼出、.no-dragからは不開始
- 負座標クランプ(min 0)、destroy()後は無効

### applyPosition / getPosition
- px形式設定・取得、0でも正常、未設定→{x:0,y:0}

## E2E: app.spec.js

### マッチング基本フロー
- プレイヤー追加→リスト表示
- テーブル追加→キャンバス表示
- マッチング→仮マッチプレビュー→全確定→対戦中→終了→待機復帰
- 対戦終了後に再マッチングで同卓回避

### ブラケット機能
- 設定ON→ダイアログにブラケット欄表示
- ブラケット付きプレイヤー同士でのみマッチング
- OFF時はブラケット無視で通常マッチング

### カスタムダイアログ
- 確認ダイアログ表示→OK→操作実行
- キャンセル/Escape→操作中止
- 全データリセットの二段階確認

### Excel貼り付け
- 3列(名前/グループ/ブラケット)インポート→ブラケット反映
- 重複スキップ

### レスポンシブ (PC: 1280px / スマホ: 375px)
- PC: タイトル・フッター・ズーム表示
- スマホ: 上記非表示、テーブルflex配置、ドラッグ無効

### データ永続化
- ページリロード後にデータが保持される
