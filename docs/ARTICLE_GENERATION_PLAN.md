# 記事生成システム完成計画

## 📋 Executive Summary

**プロジェクト目標**: 高品質な記事をエージェントが協力して自律的に作り上げる

**現状**:
- 記事生成システム: 既存実装あり（agents/ディレクトリ、C0-C7エージェント）
- Miyabi Framework: 36%実装（5/14 issues完了）
- 統合状態: 未統合

**ゴール**: エージェント協力による記事品質向上を実現するため、既存記事生成システムとMiyabi Frameworkを完全統合

---

## 🎯 プロジェクトビジョン

### コアコンセプト

```
記事生成要求
    ↓
C0-C7 専門エージェント（並列協力）
    ↓
ReviewAgent による品質チェック（80点以上）
    ↓
TestAgent によるリンク・構造検証
    ↓
DeploymentAgent による note.com 自動投稿
    ↓
高品質記事の自律的公開
```

### 成功指標（KPI）

| 指標 | 現状 | 目標 | 測定方法 |
|------|------|------|----------|
| 記事品質スコア | 未測定 | 80点以上 | ReviewAgent 自動評価 |
| 生成速度 | - | 15-25秒 | 並列実行による高速化 |
| リンク有効性 | - | 100% | 自動検証・修正 |
| note.com 投稿成功率 | - | 95%以上 | DeploymentAgent 統合 |
| エージェント協力効率 | - | 50%向上 | CoordinatorAgent によるDAG最適化 |

---

## 📊 現状分析

### ✅ 既存システムの実装状況

#### 1. 記事生成エージェント（agents/ディレクトリ）

**場所**: `/agents/core/`, `/agents/base/`, `/agents/quality/`

**8つの専門エージェント** (C0-C7):

| ID | エージェント名 | 役割 | 状態 |
|----|---------------|------|------|
| C0 | InfoGatheringAgent | 情報収集 | ✅ 実装済み |
| C1 | StructuringAgent | 構造化 | ✅ 実装済み |
| C2 | AnalysisAgent | 分析 | ✅ 実装済み |
| C3 | OptimizationAgent | 最適化 | ✅ 実装済み |
| C4 | SEOAgent | SEO戦略 | ✅ 実装済み |
| C5 | InstructionAgent | 指示生成 | ✅ 実装済み |
| C6 | WritingAgent | 執筆 | ✅ 実装済み |
| C7 | QualityControlAgent | 品質管理 | ✅ 実装済み |

**実行システム**:
- `OneStopPublisher`: 記事生成から投稿まで一括処理
- `ModularAgentChain`: エージェント間連携・並列実行
- `UniversalArticleGenerator`: レガシー基本生成

**特徴**:
- ✅ 並列実行対応（15-25秒）
- ✅ 品質管理エージェント組み込み
- ✅ モジュラー設計
- ❌ Miyabi Framework未統合
- ❌ ReviewAgent未統合
- ❌ DeploymentAgent未統合

#### 2. Miyabi Framework エージェント（src/agents/）

**場所**: `/src/agents/`

**7つの自律エージェント** (5/7完了):

| Agent | Issue | Wave | ステータス | 実装率 |
|-------|-------|------|-----------|--------|
| CoordinatorAgent | #18 | Wave 1 | ✅ 完了 | 100% |
| CodeGenAgent | #19 | Wave 1 | ✅ 完了 | 100% |
| EconomicCircuitBreaker | #24 | Wave 1 | ✅ 完了 | 100% |
| ReviewAgent | #20 | Wave 2 | ✅ 完了 | 100% |
| TestAgent | #22 | Wave 2 | ✅ 完了 | 100% |
| PRAgent | #21 | Wave 3 | ✅ 完了 | 100% |
| DeploymentAgent | #23 | Wave 3 | ⏳ 未着手 | 0% |

**特徴**:
- ✅ TypeScript strict mode
- ✅ 品質スコアリング（80点以上で承認）
- ✅ テストカバレッジ（80%以上目標）
- ✅ Claude Sonnet 4 統合
- ❌ 記事生成システム未統合

### 🔍 ギャップ分析

#### 統合が必要な箇所

1. **記事生成 → ReviewAgent**
   - 現状: QualityControlAgent（C7）のみで品質管理
   - 目標: Miyabi ReviewAgent で総合品質評価（80点以上で承認）

2. **記事生成 → TestAgent**
   - 現状: リンク検証が個別実装
   - 目標: TestAgent による統一的なテスト実行

3. **記事生成 → DeploymentAgent**
   - 現状: note.com投稿が個別実装（note-simple-paste.js）
   - 目標: DeploymentAgent による統一的な投稿自動化

4. **記事生成 → CoordinatorAgent**
   - 現状: ModularAgentChain で独自実装
   - 目標: CoordinatorAgent によるDAGベース最適化

---

## 🎯 4段階マイルストーン

### Milestone 1: DeploymentAgent 実装（Wave 3完了）

**期間**: 1週間
**優先度**: 🔥 P0-Critical
**目標**: Miyabi Framework Wave 3 完了（50% → 100%）

**実装内容**:
1. **DeploymentAgent 基本実装**（Issue #23）
   - Firebase Hosting 自動デプロイ
   - Firestore セキュリティルール適用
   - ヘルスチェック（5回リトライ）
   - 失敗時の自動ロールバック

2. **note.com 投稿機能統合**
   - 既存 `note-simple-paste.js` の機能を取り込み
   - クリップボード経由投稿
   - 既存セッション利用
   - エラーハンドリング強化

**成功基準**:
- ✅ Issue #23 完了
- ✅ note.com 投稿成功率 95%以上
- ✅ テストカバレッジ 80%以上
- ✅ 品質スコア 80点以上

**サブイシュー**:
- #23-1: DeploymentAgent 基本実装
- #23-2: note.com 投稿統合
- #23-3: エラーハンドリング強化
- #23-4: テスト実装

---

### Milestone 2: 記事生成システムのMiyabi統合

**期間**: 2週間
**優先度**: 🔥 P0-Critical
**目標**: 記事生成（C0-C7）とMiyabi Framework（CoordinatorAgent, ReviewAgent, TestAgent, DeploymentAgent）の完全統合

**実装内容**:

#### 2.1 記事生成エージェントのMiyabi統合（Issue #28）

**目的**: C0-C7 エージェントを CoordinatorAgent で最適化

**実装タスク**:
1. **CoordinatorAgent 統合**
   - C0-C7 エージェントのDAGモデル化
   - Critical Path 特定
   - 並列実行最適化（目標: 50%高速化）

2. **エージェント間通信プロトコル**
   - 統一的なインターフェース定義
   - データフォーマット標準化
   - エラーハンドリング統一

3. **実行パイプライン構築**
   ```typescript
   記事生成要求
     ↓
   CoordinatorAgent (DAG分解)
     ↓
   [C0, C1, C2] 並列実行（情報収集・構造化・分析）
     ↓
   [C3, C4] 並列実行（最適化・SEO）
     ↓
   [C5] 指示生成
     ↓
   [C6] 執筆
     ↓
   [C7] 品質管理
     ↓
   ReviewAgent (総合評価)
   ```

**成功基準**:
- ✅ CoordinatorAgent によるDAG分解成功
- ✅ 並列実行による50%高速化達成
- ✅ 全エージェント統合テスト合格

**サブイシュー**:
- #28-1: CoordinatorAgent 統合設計
- #28-2: エージェント間通信プロトコル実装
- #28-3: 並列実行パイプライン構築
- #28-4: 統合テスト実装

---

#### 2.2 記事品質チェックのReviewAgent統合（Issue #29）

**目的**: 記事の総合品質評価を自動化

**実装タスク**:
1. **記事品質スコアリング**
   - 構造評価（見出し、段落、リスト）
   - コンテンツ評価（文字数、可読性、独自性）
   - SEO評価（キーワード密度、メタ情報）
   - リンク評価（有効性、関連性）

2. **ReviewAgent 拡張**
   - コード品質評価に加え、記事品質評価機能追加
   - 80点以上で自動承認
   - 不合格時のフィードバック生成

3. **C7 QualityControlAgent との統合**
   - C7の初期品質チェック
   - ReviewAgent の総合評価
   - 2段階品質保証体制

**スコアリング基準**:
```typescript
interface ArticleQualityScore {
  structure: number;    // 構造評価（0-100）
  content: number;      // コンテンツ評価（0-100）
  seo: number;          // SEO評価（0-100）
  links: number;        // リンク評価（0-100）
  overall: number;      // 総合評価（平均）
  threshold: 80;        // 合格ライン
  passed: boolean;      // 合否
  feedback: string[];   // 改善提案
}
```

**成功基準**:
- ✅ 記事品質スコアリング実装
- ✅ 80点以上の記事が自動承認
- ✅ 不合格記事に具体的フィードバック

**サブイシュー**:
- #29-1: 記事品質スコアリング設計
- #29-2: ReviewAgent 拡張実装
- #29-3: C7 QualityControlAgent 統合
- #29-4: フィードバック生成機能実装

---

#### 2.3 note.com投稿のDeploymentAgent統合（Issue #30）

**目的**: 記事投稿を自動化・高信頼化（画像生成統合含む）

**実装タスク**:
1. **DeploymentAgent 記事投稿機能**
   - note.com API 統合
   - クリップボード経由投稿
   - 既存セッション活用
   - マルチ投稿プラットフォーム対応（将来拡張）

2. **画像生成統合（nano banana）**
   - Gemini 2.5 Flash Image API 統合
   - 記事内容から自動的にプロンプト生成
   - アイキャッチ画像の自動生成
   - 記事内挿入画像の生成（見出しごと）
   - 生成画像の自動配置

3. **投稿前検証**
   - TestAgent によるリンク検証
   - 構造検証（note.com ブロック構造対応）
   - 画像検証（生成成功、適切なサイズ）
   - プレビュー生成

4. **投稿後確認**
   - 公開URL取得
   - ヘルスチェック（記事が正常に表示されるか）
   - 画像表示確認
   - メトリクス記録（投稿日時、URL、画像数）

5. **エラーハンドリング**
   - 5回リトライ
   - 画像生成失敗時のフォールバック
   - 失敗時のロールバック（下書き保存）
   - エラー通知

**投稿フロー**:
```typescript
記事生成完了
  ↓
画像生成（nano banana）
  - アイキャッチ画像
  - 見出しごとの挿入画像
  ↓
ReviewAgent (品質チェック: 80点以上)
  ↓
TestAgent (リンク・構造・画像検証)
  ↓
DeploymentAgent (投稿実行)
  ↓
ヘルスチェック（5回リトライ）
  - 記事表示確認
  - 画像表示確認
  ↓
成功: URL返却 / 失敗: ロールバック
```

**成功基準**:
- ✅ note.com 投稿成功率 95%以上
- ✅ リンク有効性 100%
- ✅ 画像生成成功率 90%以上
- ✅ 投稿後ヘルスチェック成功

**サブイシュー**:
- #30-1: DeploymentAgent 投稿機能実装
- #30-2: 画像生成統合（nano banana）
- #30-3: 投稿前検証統合（画像検証含む）
- #30-4: 投稿後確認実装（画像確認含む）
- #30-5: エラーハンドリング強化

---

### Milestone 3: エンドツーエンド自動化

**期間**: 1週間
**優先度**: 🟡 P1-High
**目標**: 記事生成から投稿までの完全自律実行

**実装内容**:

1. **統合パイプライン構築**
   - 記事生成要求 → 自動投稿までの完全自動化
   - GitHub Issue トリガー（`/generate-article` コマンド）
   - GitHub Actions ワークフロー統合

2. **モニタリング・ログ**
   - 各ステップの実行時間記録
   - エラーログ収集
   - 品質スコア履歴

3. **通知システム**
   - 投稿成功通知（GitHub Issue コメント）
   - 失敗時のエスカレーション
   - 品質低下アラート

**ワークフロー**:
```yaml
name: 🤖 Autonomous Article Generation

on:
  issues:
    types: [labeled]

jobs:
  generate-and-publish:
    if: contains(github.event.issue.labels.*.name, 'agent:article-gen')
    steps:
      - name: Parse article request
      - name: Generate article (C0-C7 + CoordinatorAgent)
      - name: Quality check (ReviewAgent)
      - name: Validation (TestAgent)
      - name: Publish to note.com (DeploymentAgent)
      - name: Post result comment
```

**成功基準**:
- ✅ GitHub Issue から完全自動実行
- ✅ 成功率 90%以上
- ✅ 平均実行時間 15-25秒

**サブイシュー**:
- #31-1: 統合パイプライン実装
- #31-2: GitHub Actions ワークフロー作成
- #31-3: モニタリング実装
- #31-4: 通知システム実装

---

### Milestone 4: 品質向上と最適化

**期間**: 2週間
**優先度**: 🟢 P2-Medium
**目標**: システムの安定化と品質向上

**実装内容**:

1. **学習システム構築**（KnowledgeAgent 統合）
   - 高品質記事のパターン学習
   - 失敗事例の分析
   - 品質スコアの継続的向上

2. **パフォーマンス最適化**
   - エージェント実行時間の削減
   - API コスト最適化（EconomicCircuitBreaker 統合）
   - キャッシュ戦略

3. **テストカバレッジ向上**
   - E2Eテスト実装
   - 統合テスト強化
   - カバレッジ 90%以上

4. **ドキュメント整備**
   - 使用方法ガイド
   - トラブルシューティング
   - アーキテクチャ図

**成功基準**:
- ✅ 記事品質スコア平均 85点以上
- ✅ テストカバレッジ 90%以上
- ✅ API コスト 30%削減
- ✅ 実行時間 20秒以内

**サブイシュー**:
- #32-1: 学習システム設計
- #32-2: パフォーマンス最適化
- #32-3: テストカバレッジ向上
- #32-4: ドキュメント整備

---

## 📋 Issue構造

### 親Issue（既存 Issue #16 更新）

**タイトル**: `🎯 [MASTER] 記事生成システム完成計画`

**内容**:
- プロジェクト概要
- 4段階マイルストーン
- 進捗トラッキング
- 成功指標（KPI）

---

### Wave 3 完了

**Issue #23**: `[Wave 3] DeploymentAgent 実装 + note.com統合`
- #23-1: DeploymentAgent 基本実装
- #23-2: note.com 投稿統合
- #23-3: エラーハンドリング強化
- #23-4: テスト実装

---

### Wave 4: 記事生成統合（新規）

**Issue #28**: `[Wave 4.1] 記事生成エージェントのMiyabi統合`
- #28-1: CoordinatorAgent 統合設計
- #28-2: エージェント間通信プロトコル実装
- #28-3: 並列実行パイプライン構築
- #28-4: 統合テスト実装

**Issue #29**: `[Wave 4.2] 記事品質チェックのReviewAgent統合`
- #29-1: 記事品質スコアリング設計
- #29-2: ReviewAgent 拡張実装
- #29-3: C7 QualityControlAgent 統合
- #29-4: フィードバック生成機能実装

**Issue #30**: `[Wave 4.3] note.com投稿のDeploymentAgent統合`
- #30-1: DeploymentAgent 投稿機能実装
- #30-2: 投稿前検証統合
- #30-3: 投稿後確認実装
- #30-4: エラーハンドリング強化

---

### Wave 5: エンドツーエンド自動化（新規）

**Issue #31**: `[Wave 5] エンドツーエンド自動化パイプライン`
- #31-1: 統合パイプライン実装
- #31-2: GitHub Actions ワークフロー作成
- #31-3: モニタリング実装
- #31-4: 通知システム実装

---

### Wave 6: 品質向上（新規）

**Issue #32**: `[Wave 6] 品質向上と最適化`
- #32-1: 学習システム設計
- #32-2: パフォーマンス最適化
- #32-3: テストカバレッジ向上
- #32-4: ドキュメント整備

---

## 🔄 依存関係とクリティカルパス

### DAG（Directed Acyclic Graph）

```
Milestone 1: DeploymentAgent実装
    ├── #23-1 (基本実装)
    ├── #23-2 (note.com統合) ← 依存: #23-1
    ├── #23-3 (エラーハンドリング) ← 依存: #23-2
    └── #23-4 (テスト) ← 依存: #23-3
         ↓
Milestone 2: Miyabi統合
    ├── #28 (CoordinatorAgent統合)
    │    ├── #28-1 (設計)
    │    ├── #28-2 (通信プロトコル) ← 依存: #28-1
    │    ├── #28-3 (パイプライン) ← 依存: #28-2
    │    └── #28-4 (テスト) ← 依存: #28-3
    │
    ├── #29 (ReviewAgent統合) ← 依存: #28
    │    ├── #29-1 (スコアリング設計)
    │    ├── #29-2 (ReviewAgent拡張) ← 依存: #29-1
    │    ├── #29-3 (C7統合) ← 依存: #29-2
    │    └── #29-4 (フィードバック) ← 依存: #29-3
    │
    └── #30 (DeploymentAgent統合) ← 依存: #23, #29
         ├── #30-1 (投稿機能)
         ├── #30-2 (投稿前検証) ← 依存: #30-1
         ├── #30-3 (投稿後確認) ← 依存: #30-2
         └── #30-4 (エラーハンドリング) ← 依存: #30-3
              ↓
Milestone 3: E2E自動化 ← 依存: #28, #29, #30
    ├── #31-1 (パイプライン)
    ├── #31-2 (ワークフロー) ← 依存: #31-1
    ├── #31-3 (モニタリング) ← 依存: #31-2
    └── #31-4 (通知) ← 依存: #31-3
         ↓
Milestone 4: 品質向上 ← 依存: #31
    ├── #32-1 (学習システム)
    ├── #32-2 (最適化)
    ├── #32-3 (テストカバレッジ)
    └── #32-4 (ドキュメント)
```

### Critical Path（最長経路）

```
#23-1 → #23-2 → #23-3 → #23-4 (1週間)
  ↓
#28-1 → #28-2 → #28-3 → #28-4 (1週間)
  ↓
#29-1 → #29-2 → #29-3 → #29-4 (5日)
  ↓
#30-1 → #30-2 → #30-3 → #30-4 (5日)
  ↓
#31-1 → #31-2 → #31-3 → #31-4 (1週間)
  ↓
#32-1 → #32-2 → #32-3 → #32-4 (2週間)
```

**合計**: 約6週間（並列実行なしの場合）

### 並列実行による最適化

**Wave 1** (1週間):
- #23-1 → #23-2 → #23-3 → #23-4

**Wave 2** (2週間):
- #28 と #29 を並列実行（5日で完了）
- #30 を続けて実行（5日で完了）

**Wave 3** (1週間):
- #31-1 → #31-2 → #31-3 → #31-4

**Wave 4** (2週間):
- #32 の全サブタスクを並列実行可能

**最適化後の合計**: 約4週間（33%高速化）

---

## 📈 成功指標とトラッキング

### KPI Dashboard

| 指標 | 現状 | Milestone 1 | Milestone 2 | Milestone 3 | Milestone 4 |
|------|------|-------------|-------------|-------------|-------------|
| 記事品質スコア | - | - | 80点 | 82点 | 85点 |
| 生成速度 | - | - | 20秒 | 18秒 | 15秒 |
| 投稿成功率 | - | 95% | 95% | 97% | 98% |
| リンク有効性 | - | - | 100% | 100% | 100% |
| 画像生成成功率 | - | - | 90% | 92% | 95% |
| テストカバレッジ | 80% | 80% | 85% | 88% | 90% |
| API コスト | ¥71/月 | ¥71/月 | ¥100/月 | ¥90/月 | ¥80/月 |

### 週次レビュー項目

1. **進捗確認**
   - 完了したサブイシュー数
   - 遅延しているタスク
   - ブロッカーの特定

2. **品質メトリクス**
   - テスト合格率
   - 品質スコア平均
   - エラー発生率

3. **パフォーマンス**
   - 実行時間の推移
   - API コストの推移
   - リソース使用率

4. **リスク管理**
   - 潜在的な問題
   - 技術的負債
   - 優先度の再評価

---

## 🛠️ 技術スタック

### 既存システム（継続使用）

**記事生成エージェント**:
- JavaScript/Node.js
- Google Gemini API
- Playwright (note.com自動化)

**Miyabi Framework**:
- TypeScript 5.7+ (strict mode)
- Node.js 20+
- Claude Sonnet 4 (@anthropic-ai/sdk)
- Jest (テスト)
- ESLint (品質チェック)

### 統合で追加するもの

**通信プロトコル**:
- gRPC または REST API
- JSON Schema によるデータ検証

**モニタリング**:
- GitHub Actions ログ
- カスタムメトリクス収集

---

## 🚀 実行計画

### Phase 1: 準備（即座実行）

1. ✅ Issue #16 を更新（マスターIssue）
2. ✅ Issue #23, #28-32 を作成
3. ✅ サブイシュー作成（#23-1 ~ #32-4）
4. ✅ ラベル付与（type, priority, wave, agent）

### Phase 2: 開発（Week 1）

1. DeploymentAgent 基本実装（#23-1）
2. note.com 投稿統合（#23-2）
3. エラーハンドリング（#23-3）
4. テスト実装（#23-4）

### Phase 3: 統合（Week 2-3）

1. CoordinatorAgent 統合（#28）
2. ReviewAgent 統合（#29）
3. DeploymentAgent 完全統合（#30）

### Phase 4: 自動化（Week 4）

1. E2Eパイプライン構築（#31）

### Phase 5: 最適化（Week 5-6）

1. 品質向上と最適化（#32）

---

## 📚 参考ドキュメント

### 既存ドキュメント
- `README.md` - プロジェクト概要
- `CLAUDE.md` - Claude Code コンテキスト
- `/Users/enhanced/.claude/CLAUDE.md` - グローバル設定（記事生成システム詳細）
- Issue #16 - マスターIssue

### 新規作成予定
- `docs/ARTICLE_AGENT_INTEGRATION.md` - 統合アーキテクチャ
- `docs/ARTICLE_QUALITY_SCORING.md` - 品質評価基準
- `docs/DEPLOYMENT_GUIDE.md` - 投稿システムガイド
- `docs/E2E_PIPELINE.md` - エンドツーエンドフロー

---

## 🎯 次のアクション

### 即座実行タスク

1. **Issue #16 更新** - マスターIssue に本計画を反映
2. **Issue #23 詳細化** - サブイシュー作成
3. **Issue #28-32 作成** - 新規Issueとサブイシュー作成
4. **GitHub Project 作成** - 進捗管理ボード
5. **Milestone 設定** - 4段階マイルストーン

### 開発開始（即座）

- Issue #23-1: DeploymentAgent 基本実装着手

---

**作成日**: 2025-10-16
**ステータス**: ✅ 計画完了、実行開始準備完了

🌸 **Miyabi Framework v5.0 - Beauty in Autonomous Development**

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
