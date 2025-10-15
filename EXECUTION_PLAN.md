# 🎯 Miyabi Framework Phase 2/3 実行計画

**作成日**: 2025-10-15
**CoordinatorAgent**: DAGベース並列実行計画
**総タスク数**: 14個
**推定期間**: 約4週間（並列実行）

---

## 📊 サブIssue一覧

| Issue# | タイトル | Agent | Complexity | Effort | Priority | Wave |
|--------|---------|-------|-----------|--------|----------|------|
| #17 | CoordinatorAgent 完全実装 | coordinator | xlarge | 1w | P0 | 1 |
| #18 | CodeGenAgent 実装 | codegen | xlarge | 1w | P0 | 1 |
| #23 | Economic Circuit Breaker 強化 | codegen | medium | 3d | P1 | 1 |
| #19 | ReviewAgent 実装 | review | large | 4d | P0 | 2 |
| #21 | TestAgent 実装 | test | large | 4d | P1 | 2 |
| #20 | PRAgent 実装 | pr | medium | 3d | P1 | 3 |
| #22 | DeploymentAgent 実装 | deployment | large | 4d | P1 | 3 |
| #24 | GitHub Actions ワークフロー統合 | coordinator | large | 4d | P1 | 4 |
| #25 | IncidentCommanderAgent 実装 | codegen | xlarge | 1w | P2 | 5 |
| #26 | Knowledge Persistence Layer 実装 | codegen | xlarge | 2w | P2 | 5 |
| #27 | 記事生成エージェントのMiyabi統合 | codegen | medium | 3d | P2 | 5 |
| #28 | 記事品質チェックのReviewAgent統合 | review | medium | 3d | P2 | 6 |
| #29 | note.com投稿のDeploymentAgent統合 | deployment | medium | 3d | P2 | 6 |

---

## 🌊 Wave実行計画

### Wave 1: 基盤実装（前提条件なし）

**並列実行可能**: 3タスク
**推定期間**: 1週間

```
┌─────────────────────────────────────────────┐
│ Wave 1: 基盤実装（並列実行）                │
├─────────────────────────────────────────────┤
│ #17 CoordinatorAgent 完全実装 (1w)          │
│ #18 CodeGenAgent 実装 (1w)                  │
│ #23 Economic Circuit Breaker 強化 (3d)      │
└─────────────────────────────────────────────┘
```

**タスク詳細**:

#### #17 CoordinatorAgent 完全実装
- **Agent**: coordinator
- **Dependencies**: なし
- **実装内容**:
  - Issue を DAG で分解
  - Wave 並列実行計画生成
  - Critical Path 特定
  - 50%+ 効率化達成

#### #18 CodeGenAgent 実装
- **Agent**: codegen
- **Dependencies**: なし
- **実装内容**:
  - Claude Sonnet 4 統合
  - TypeScript strict mode 対応
  - テストコード自動生成
  - ドキュメント自動生成

#### #23 Economic Circuit Breaker 強化
- **Agent**: codegen
- **Dependencies**: なし
- **実装内容**:
  - Anthropic Billing API 統合
  - Firebase Billing API 統合
  - 1時間ごとの監視に変更

---

### Wave 2: 品質管理・テスト（Wave 1完了後）

**並列実行可能**: 2タスク
**推定期間**: 4日
**Dependencies**: #18 (CodeGenAgent)

```
┌─────────────────────────────────────────────┐
│ Wave 2: 品質管理・テスト（並列実行）        │
├─────────────────────────────────────────────┤
│ #19 ReviewAgent 実装 (4d)                   │
│ #21 TestAgent 実装 (4d)                     │
└─────────────────────────────────────────────┘
    ↑
    │ Depends on
    ↓
  #18 CodeGenAgent
```

**タスク詳細**:

#### #19 ReviewAgent 実装
- **Agent**: review
- **Dependencies**: #18
- **実装内容**:
  - ESLint 静的解析
  - TypeScript コンパイルチェック
  - npm audit セキュリティスキャン
  - 100点満点で品質スコアリング
  - 80点以上で自動承認

#### #21 TestAgent 実装
- **Agent**: test
- **Dependencies**: #18
- **実装内容**:
  - 全テスト自動実行
  - カバレッジレポート生成
  - 80%+ カバレッジ目標
  - 失敗時の詳細レポート

---

### Wave 3: PR・デプロイ（Wave 2完了後）

**並列実行可能**: 2タスク
**推定期間**: 4日
**Dependencies**: #18, #19, #21

```
┌─────────────────────────────────────────────┐
│ Wave 3: PR・デプロイ（並列実行）            │
├─────────────────────────────────────────────┤
│ #20 PRAgent 実装 (3d)                       │
│ #22 DeploymentAgent 実装 (4d)               │
└─────────────────────────────────────────────┘
    ↑
    │ Depends on
    ↓
  #18 CodeGenAgent
  #19 ReviewAgent
  #21 TestAgent
```

**タスク詳細**:

#### #20 PRAgent 実装
- **Agent**: pr
- **Dependencies**: #18, #19
- **実装内容**:
  - Draft PR 自動生成
  - Conventional Commits 準拠
  - 変更サマリー自動生成
  - レビュアー自動アサイン

#### #22 DeploymentAgent 実装
- **Agent**: deployment
- **Dependencies**: #18, #19, #21
- **実装内容**:
  - Firebase Hosting 自動デプロイ
  - ヘルスチェック（5回リトライ）
  - 失敗時の自動ロールバック

---

### Wave 4: GitHub Actions統合（Wave 3完了後）

**タスク数**: 1タスク
**推定期間**: 4日
**Dependencies**: #17, #18, #19, #20, #21, #22（全Agent実装完了）

```
┌─────────────────────────────────────────────┐
│ Wave 4: GitHub Actions統合                  │
├─────────────────────────────────────────────┤
│ #24 GitHub Actions ワークフロー統合 (4d)    │
└─────────────────────────────────────────────┘
    ↑
    │ Depends on
    ↓
  #17 CoordinatorAgent
  #18 CodeGenAgent
  #19 ReviewAgent
  #20 PRAgent
  #21 TestAgent
  #22 DeploymentAgent
```

**タスク詳細**:

#### #24 GitHub Actions ワークフロー統合
- **Agent**: coordinator
- **Dependencies**: #17-#22（全Agent実装完了）
- **実装内容**:
  - autonomous-agent.yml に CoordinatorAgent 統合
  - CodeGenAgent 実行ワークフロー
  - ReviewAgent 実行ワークフロー
  - PRAgent 実行ワークフロー
  - TestAgent 実行ワークフロー
  - DeploymentAgent 実行ワークフロー

**Phase 2 完了**: ここまでで Phase 2 (AI Agents実装) が完了

---

### Wave 5: Phase 3 + 記事生成統合（Phase 2完了後）

**並列実行可能**: 3タスク
**推定期間**: 1-2週間
**Dependencies**: Phase 2 完了

```
┌─────────────────────────────────────────────┐
│ Wave 5: Phase 3 + 記事生成統合（並列実行）  │
├─────────────────────────────────────────────┤
│ #25 IncidentCommanderAgent 実装 (1w)        │
│ #26 Knowledge Persistence Layer 実装 (2w)   │
│ #27 記事生成エージェントのMiyabi統合 (3d)   │
└─────────────────────────────────────────────┘
    ↑
    │ Depends on
    ↓
  Phase 2 完了 (#17-#24)
```

**タスク詳細**:

#### #25 IncidentCommanderAgent 実装
- **Agent**: codegen
- **Dependencies**: Phase 2 完了
- **実装内容**:
  - 失敗パターン検出
  - 自動リトライ（3回まで）
  - Guardian 緊急 Issue 作成
  - システム縮退運転（Graceful Degradation）

#### #26 Knowledge Persistence Layer 実装
- **Agent**: codegen
- **Dependencies**: #17 (CoordinatorAgent)
- **実装内容**:
  - Vector Database 統合（Pinecone/Chroma）
  - 類似 Issue 検索機能
  - 成功パターンの保存・再利用
  - 失敗パターンの記録・回避

#### #27 記事生成エージェントのMiyabi統合
- **Agent**: codegen
- **Dependencies**: #17 (CoordinatorAgent)
- **実装内容**:
  - agent:article-generator ラベル作成
  - Issue トリガーで記事生成
  - OneStopPublisher 統合
  - ModularAgentChain 統合

---

### Wave 6: 記事生成最終統合（Wave 5完了後）

**並列実行可能**: 2タスク
**推定期間**: 3日
**Dependencies**: #19, #22, #27

```
┌─────────────────────────────────────────────┐
│ Wave 6: 記事生成最終統合（並列実行）        │
├─────────────────────────────────────────────┤
│ #28 記事品質チェックのReviewAgent統合 (3d)  │
│ #29 note.com投稿のDeploymentAgent統合 (3d)  │
└─────────────────────────────────────────────┘
    ↑
    │ Depends on
    ↓
  #19 ReviewAgent
  #22 DeploymentAgent
  #27 記事生成エージェント統合
```

**タスク詳細**:

#### #28 記事品質チェックのReviewAgent統合
- **Agent**: review
- **Dependencies**: #19, #27
- **実装内容**:
  - 総合スコア 80点以上で自動承認
  - リンク有効性 100% チェック
  - note.com ブロック構造対応確認
  - 品質レポート自動生成

#### #29 note.com投稿のDeploymentAgent統合
- **Agent**: deployment
- **Dependencies**: #22, #27, #28
- **実装内容**:
  - note.com 自動投稿
  - 投稿成功確認（ヘルスチェック）
  - 失敗時の記事削除/ロールバック
  - 投稿 URL の Issue コメント

**全システム完了**: ここまでで全システムが完成

---

## 📈 Critical Path（最長実行経路）

```
#18 CodeGenAgent (1w)
  ↓
#19 ReviewAgent (4d)
  ↓
#22 DeploymentAgent (4d)
  ↓
#24 GitHub Actions統合 (4d)
  ↓
#25 IncidentCommanderAgent (1w)

合計: 約4週間
```

**Critical Path の特徴**:
- CodeGenAgent がすべての起点
- ReviewAgent, DeploymentAgent が中核
- GitHub Actions 統合で Phase 2 完了
- IncidentCommanderAgent で Phase 3 完了

---

## 🎯 エージェント別タスク割り当て

### 🤖 agent:coordinator（2タスク）
- #17 CoordinatorAgent 完全実装 (Wave 1)
- #24 GitHub Actions ワークフロー統合 (Wave 4)

**役割**: タスク統括・並列実行制御

---

### 💻 agent:codegen（5タスク）
- #18 CodeGenAgent 実装 (Wave 1)
- #23 Economic Circuit Breaker 強化 (Wave 1)
- #25 IncidentCommanderAgent 実装 (Wave 5)
- #26 Knowledge Persistence Layer 実装 (Wave 5)
- #27 記事生成エージェントのMiyabi統合 (Wave 5)

**役割**: AI駆動コード生成

---

### 👀 agent:review（2タスク）
- #19 ReviewAgent 実装 (Wave 2)
- #28 記事品質チェックのReviewAgent統合 (Wave 6)

**役割**: コード品質判定

---

### 🔀 agent:pr（1タスク）
- #20 PRAgent 実装 (Wave 3)

**役割**: Pull Request自動作成

---

### 🧪 agent:test（1タスク）
- #21 TestAgent 実装 (Wave 2)

**役割**: テスト自動実行

---

### 🚀 agent:deployment（2タスク）
- #22 DeploymentAgent 実装 (Wave 3)
- #29 note.com投稿のDeploymentAgent統合 (Wave 6)

**役割**: CI/CDデプロイ自動化

---

## 📊 効率化分析

### 順次実行の場合

```
Wave 1: 1w + 1w + 3d = 2w + 3d
Wave 2: 4d + 4d = 8d
Wave 3: 3d + 4d = 7d
Wave 4: 4d
Wave 5: 1w + 2w + 3d = 3w + 3d
Wave 6: 3d + 3d = 6d

合計: 約8週間
```

### 並列実行の場合（CoordinatorAgent計画）

```
Wave 1: max(1w, 1w, 3d) = 1w
Wave 2: max(4d, 4d) = 4d
Wave 3: max(3d, 4d) = 4d
Wave 4: 4d
Wave 5: max(1w, 2w, 3d) = 2w
Wave 6: max(3d, 3d) = 3d

合計: 約4週間
```

### 効率化率

```
効率化率 = (8週間 - 4週間) / 8週間 = 50%
```

**目標達成**: ✅ 50%以上の効率化を達成

---

## 🎯 成功指標（KPI）

### Phase 2 完了時点（Wave 4終了）

| 指標 | 目標 | 測定方法 |
|-----|------|---------|
| Agent実装率 | 100% (6 agents) | #17-#22 全完了 |
| コード生成成功率 | 80%+ | CodeGenAgent 実行成功率 |
| 品質スコア | 80点+ | ReviewAgent 自動評価 |
| テストカバレッジ | 80%+ | TestAgent レポート |
| デプロイ成功率 | 95%+ | DeploymentAgent 実行成功率 |
| GitHub Actions成功率 | 95%+ | ワークフロー実行成功率 |

### Phase 3 完了時点（Wave 6終了）

| 指標 | 目標 | 測定方法 |
|-----|------|---------|
| 自律回復成功率 | 50%+ | IncidentCommanderAgent リトライ成功率 |
| パターン再利用率 | 70%+ | Knowledge Persistence Layer 活用率 |
| 記事生成成功率 | 90%+ | 記事生成エージェント実行成功率 |
| note.com投稿成功率 | 95%+ | DeploymentAgent 投稿成功率 |

---

## 📚 関連ファイル

- **マスターIssue**: #16
- **CoordinatorAgent分析**: `.ai/coordinator-analysis.json`
- **サブIssue**: #17-#30（14個）
- **実行計画**: このファイル

---

## 🚀 次のアクション

### 最優先（今週）- Wave 1開始

1. **#17 CoordinatorAgent 完全実装** を開始
2. **#18 CodeGenAgent 実装** を開始
3. **#23 Economic Circuit Breaker 強化** を開始

**並列実行**: 3タスクを同時に進める

### 中期（来週）- Wave 2-3

1. Wave 1 完了を確認
2. **#19 ReviewAgent** と **#21 TestAgent** を並列実行
3. Wave 2 完了後、**#20 PRAgent** と **#22 DeploymentAgent** を並列実行

### 長期（2-4週間後）- Wave 4-6

1. Wave 3 完了後、**#24 GitHub Actions統合**
2. Phase 2 完了を確認
3. **#25, #26, #27** を並列実行（Wave 5）
4. Wave 5 完了後、**#28, #29** を並列実行（Wave 6）
5. 全システム完成

---

**作成日**: 2025-10-15
**更新日**: 2025-10-15
**ステータス**: ✅ **計画完成 - Wave 1開始準備完了**

🌸 **Miyabi Framework - Beauty in Autonomous Development**

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
