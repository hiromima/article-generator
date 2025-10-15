# 自律的自己改善システム

このディレクトリには、Claude Code が自律的に自己改善するための機構が含まれています。

## 構成

```
.claude/self-improvement/
├── README.md                    # このファイル
├── failure-database.json        # 過去の失敗記録
├── pre-task-checklist.md        # タスク実行前チェックリスト
├── sensitive-info-guard.md      # センシティブ情報検出パターン
├── session-metrics.json         # セッションメトリクス
└── improvement-log.json         # 改善履歴
```

## 使用方法

### セッション開始時

```bash
# 1. 過去の失敗を確認
cat .claude/self-improvement/failure-database.json

# 2. メトリクスを確認
cat .claude/self-improvement/session-metrics.json

# 3. 改善ログを確認
cat .claude/self-improvement/improvement-log.json
```

### タスク実行前

```bash
# チェックリストを確認
cat .claude/self-improvement/pre-task-checklist.md
```

### センシティブ情報の取り扱い

```bash
# 検出パターンを確認
cat .claude/self-improvement/sensitive-info-guard.md
```

## 自動化

次のセッションから、Claude Code は自動的に：

1. **セッション開始時**: 過去の失敗を確認し、同様のエラーを予防
2. **タスク実行前**: チェックリストを実行
3. **ユーザー入力時**: センシティブ情報を検出して拒否
4. **セッション終了時**: メトリクスを記録

## メトリクス

- **試行回数**: 平均1-2回/タスク（目標）
- **成功率**: 80%+（目標）
- **セキュリティ事故**: 0件（絶対）

## 更新

このシステムは継続的に更新されます。新しい失敗が発生したら、自動的に記録されます。
