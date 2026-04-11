# コントリビューションガイド / Contributing Guide

## バグ報告 / Bug Reports

[Issues](https://github.com/soichirow/matching-kanri/issues) にて受け付けています。

報告時には以下を記載してください:
- 再現手順
- 期待する動作
- 実際の動作
- ブラウザ・OS・デバイス情報

## プルリクエスト / Pull Requests

1. フォークしてブランチを作成
2. 変更を加える
3. テストが通ることを確認: `npx vitest run && npx playwright test`
4. ESLintが通ることを確認: `npx eslint .`
5. プルリクエストを作成

### コードスタイル

- フレームワーク不使用（Vanilla JS）
- `admin.html` と `view.html` は単一ファイルで完結
- `src/` 内のモジュールはテスト用の参照実装
- ESLint の設定に従う

### コミットメッセージ

```
feat: 新機能の追加
fix: バグ修正
docs: ドキュメントの変更
test: テストの追加・修正
refactor: リファクタリング
cleanup: 不要コードの削除
security: セキュリティ関連の修正
chore: ビルド・依存関係・設定の変更
```

## ライセンス

コントリビューションは MIT ライセンスの下で提供されます。
