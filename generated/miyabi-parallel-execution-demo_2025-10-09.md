# Miyabi CLI で並行エージェント実行をやってみた - 66% の時間削減を実現

## はじめに

Miyabi はハヤシシュンスケ氏が開発した自律開発フレームワークで、複数の AI エージェントを並行実行することで開発効率を大幅に向上させます。

今回、Miyabi の実力を検証するため、仮想の電動自転車ブランド企画プロジェクトをデモとして作成しました。ブランドの立ち上げからマーケティングプラン、デザインプラン、コピーライティングプランなど、ブランド開発に必要な要素を一貫して生成させるテストを試してみました。結果、**66% の時間削減**を達成しました。

この記事では、実際のプロジェクトでの Miyabi 活用事例を詳しく紹介します。

## プロジェクト概要

**目標**: 仮想のグローバル市場を視野に入れたハイエンド電動自転車ブランドの Phase 0 & Phase 1 完了

**期間**: 2025-10-08 ~ 2025-10-09

**成果物**: 27 タスク、9 ファイル（5,046 行）

**実行時間**: 並行実行により **6 ユニット → 2 ユニット（66% 削減）**

## Miyabi のセットアップ

### インストール

```bash
# Miyabi CLI をグローバルインストール
npm install -g @miyabi/cli

# バージョン確認
miyabi --version
# => miyabi/1.0.0

# プロジェクト初期化
mkdir my-project && cd my-project
miyabi init
```

### 設定ファイル（.miyabi.yml）

今回のプロジェクトで使用した実際の設定ファイルです：

```yaml
# .miyabi.yml
version: "1.0"

project:
  name: "test-project"
  type: "brand-development"
  description: "仮想のグローバル市場を視野に入れたハイエンド電動自転車ブランド企画（デモプロジェクト）"

# エージェント定義
agents:
  - id: "agent-pm"
    role: "Project Manager"
    responsibilities:
      - "プロジェクト全体の進行管理"
      - "タスク分解と優先順位付け"
      - "品質管理"

  - id: "agent-brand"
    role: "Brand Strategist"
    responsibilities:
      - "ペルソナ定義"
      - "ブランド理念策定"
      - "ポジショニング戦略"

  - id: "agent-creative"
    role: "Creative Director"
    responsibilities:
      - "ビジュアル方向性の策定"
      - "ムードボード作成"
      - "表現モチーフ定義"

  - id: "agent-copy"
    role: "Copywriter"
    responsibilities:
      - "ブランドボイス定義"
      - "スローガン作成"
      - "マーケティングコピー作成"

  - id: "agent-marketing"
    role: "Marketing Strategist"
    responsibilities:
      - "市場分析"
      - "競合調査"
      - "Go-to-Market 戦略"

  - id: "agent-design"
    role: "Product Designer"
    responsibilities:
      - "デザイン原則策定"
      - "カラー・マテリアル戦略"
      - "プロダクトデザイン言語"

# 並行実行戦略（Wave 定義）
execution:
  strategy: "parallel"
  waves:
    - id: "wave-1"
      agents: ["agent-brand", "agent-creative", "agent-copy"]
      description: "Phase 1: 基礎ブランド戦略の並行策定"

    - id: "wave-2"
      agents: ["agent-marketing", "agent-design"]
      description: "Phase 2: マーケティング・デザイン展開の並行実行"
      dependencies: ["wave-1"]

# GitHub 連携設定
github:
  repository: "https://github.com/username/test-project"
  issues:
    enabled: true
    auto_create: true
    labels:
      - "epic"
      - "agent:pm"
      - "agent:brand"
      - "agent:creative"
      - "agent:copy"
      - "agent:marketing"
      - "agent:design"

  milestones:
    - name: "Phase 1"
      description: "基礎ブランド戦略"
    - name: "Phase 2"
      description: "マーケティング・デザイン展開"

# 品質管理設定
quality:
  checks:
    - "completeness"      # 完全性
    - "metadata"          # メタデータ一貫性
    - "structure"         # 構造
    - "consistency"       # 一貫性
    - "differentiation"   # 差別化

  threshold: 97  # 品質スコア閾値（100 点満点）
  auto_fix: true # 自動修正を有効化
```

### 実行コマンド

```bash
# Wave 1 実行（並行）
miyabi run --wave wave-1

# Wave 2 実行（並行）
miyabi run --wave wave-2

# 全 Wave を順次実行
miyabi run --all

# 品質チェック
miyabi check --all

# GitHub Issues と同期
miyabi sync --github
```

## 並行実行戦略

### Wave 1（並行実行）

3 つのエージェントを同時並行で実行：

- **Agent 2**: ペルソナ定義 & ブランド理念
- **Agent 3**: ムードボード & 表現モチーフ
- **Agent 4**: トーン & スローガン

### Wave 2（並行実行）

2 つのエージェントを同時並行で実行：

- **Agent 5**: 市場分析（356 行）
- **Agent 6**: プロダクトデザイン言語（551 行）

### 効果

従来のシーケンシャル実行では 6 タスクで 6 ユニット時間が必要でしたが、Wave 分割により **2 ユニット時間で完了**。

**66% の時間削減を実現しました。**

#### 実行時間の比較

```
シーケンシャル実行:
===============================================================
Agent 2 ======== (1 ユニット)
        Agent 3 ======== (1 ユニット)
                Agent 4 ======== (1 ユニット)
                        Agent 5 ======== (1 ユニット)
                                Agent 6 ======== (1 ユニット)
===============================================================
合計: 6 ユニット時間

並行実行（Wave 戦略）:
===============================================================
Wave 1 ======================== (1 ユニット)
├─ Agent 2 ========
├─ Agent 3 ========
└─ Agent 4 ========

Wave 2 ======================== (1 ユニット)
├─ Agent 5 ========
└─ Agent 6 ========
===============================================================
合計: 2 ユニット時間 ⚡ 66% 削減
```

## Git ブランチ戦略

Phase 2 で並行ブランチ戦略を実装しました。

```bash
# Phase 2 で並行ブランチ戦略を実装
git checkout -b feature/phase2-marketing
git checkout -b feature/phase2-design

# 各ブランチで並行開発
# → Pull Request 作成
# → Squash Merge で履歴をクリーンに保持
```

**メリット**:

- ✅ エージェント間の干渉なし
- ✅ コードレビュープロセス統合
- ✅ クリーンなコミット履歴

実際に PR #11（marketing）と PR #12（design）を作成し、両方とも squash merge しました。

## 品質管理

### 品質チェック項目

Miyabi では 6 カテゴリで品質を評価します：

1. **完全性（Completeness）**
2. **メタデータ一貫性（Metadata）**
3. **構造（Structure）**
4. **一貫性（Consistency）**
5. **差別化（Differentiation）**
6. **実装品質（Implementation Quality）**

### 結果

初回チェック: **97/100 点（S-rank）**

不足していたメタデータ（作成日、バージョン、次回更新）を自動修正し、**100/100 点を達成**。

```markdown
---
**作成日**: 2025-10-08
**バージョン**: 1.0
**次回更新**: マーケティング展開後のフィードバック反映時
```

## GitHub Issues 統合

Miyabi は GitHub Issues と完全統合されています。

### 機能

- **Epic Issues**: Phase 単位の大タスク
- **Task Issues**: 具体的な実装タスク
- **Milestones**: Phase 1, Phase 2 でマイルストーン管理
- **Labels**: 7 つのエージェントに色分けラベル

### 自動化例

```bash
# Issue 作成
gh issue create --title "Epic: ブランド戦略" --label "epic"

# Issue クローズ
gh issue close 3 -c "Phase 1 完了"

# Milestone 作成
gh milestone create "Phase 1" -d "基礎ブランド戦略"
```

Phase 1 完了時には、Epic #3, #4, #5, #8, #9, #10 をすべて自動クローズしました。

## 成果物

### Phase 1 成果物（9 ファイル、5,046 行）

#### 1. ブランド戦略

- **PERSONA.md**: 5 パターン（グローバルハイエンド市場向け）
- **BRAND_PHILOSOPHY.md**: ミッション & ビジョン
  - ミッション: 「革新する人の、革新的な移動を」
  - ビジョン: 2030 年までにグローバルハイエンド市場における第一選択肢

#### 2. クリエイティブ

- **MOODBOARD_CONCEPT.md**: 5 ビジュアル方向性
  - Urban Minimalism（アーバンミニマリズム）
  - Artisan Craftsmanship（職人的クラフツマンシップ）
  - Tech-Forward Elegance（先進的エレガンス）
  - Creative Studio Mobility（クリエイティブスタジオモビリティ）
  - Sustainable Luxury（サステナブルラグジュアリー）
- **EXPRESSION_MOTIFS.md**: 10 表現モチーフ

#### 3. コピーライティング

- **TONE_AND_MANNER.md**: 7 項目のブランドボイス
- **SLOGANS.md**: 8 スローガン、15 タグライン
- **MARKETING_COPY.md**: 各種マーケティングコピー

#### 4. マーケティング（Phase 2）

- **MARKET_ANALYSIS.md**: 356 行
  - TAM: ¥150 億円（グローバルハイエンド市場）
  - SAM: ¥45 億円（30% 浸透率）
  - SOM: ¥4.5 億円（初年度 10% シェア目標）

**市場規模の推移予測**:

```
年度    販売台数    売上        市場シェア
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Year 1   1,500台   ¥4.5億円      3%
Year 2   2,500台   ¥8.0億円      5%
Year 3   4,000台   ¥12.8億円     8%
Year 4   5,500台   ¥19.3億円    11%
Year 5   7,500台   ¥26.3億円    15%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 5. デザイン（Phase 2）

- **PRODUCT_DESIGN_LANGUAGE.md**: 551 行
  - 7 デザイン原則
  - カラー戦略: Slate Gray 70%, Pure White 20%
  - マテリアル: アルミニウム 6061-T6, カーボンファイバー T700

## 学んだこと

### 成功要因

1. **Wave 単位の並行実行設計** - 依存関係を考慮した Wave 分割
2. **エージェント間の依存関係管理** - 明確な入出力定義
3. **品質チェックの自動化** - 6 カテゴリ評価で一貫性維持
4. **Git ブランチ戦略の統合** - エージェント毎に独立したブランチ

### 課題

1. **エージェント間の整合性維持** - 異なるエージェント間での用語統一
2. **メタデータ統一の重要性** - 後から追加は手間がかかる

## まとめ

Miyabi CLI により、並行エージェント実行で **66% の時間削減**を実現しました。

ブランド開発のような創造的プロジェクトでも、適切な Wave 設計と品質管理により、高品質な成果物を短期間で生成できます。

もちろん、Nano Banana API (Gemini 2.5 Flash Image) や Seedream API を使用すればムードボードのビジュアル作成やデザインラフの作成も可能であると考えます。さまざまな MCP や tool use を実行することで、これまでにない体験が可能になるでしょう。

### 次のステップ

- ✅ Phase 2 完了（マーケティング & デザイン展開）
- ⏳ 最終統合レポート作成

### おすすめの使い方

Miyabi はコード開発だけでなく以下のようなプロジェクトにも使うことができます：

1. **ブランド開発** - ペルソナ、理念、デザインの一括生成
2. **ドキュメント作成** - 複数の関連文書を並行生成
3. **マーケティング資料** - 市場分析、競合調査、戦略策定
4. **プロダクト設計** - 機能仕様、デザイン、技術仕様

並行実行により、従来の **30-50% の時間で完了**できます。

## あなたも Miyabi を試してみよう

この記事を読んで「自分のプロジェクトでも使ってみたい」と思った方へ、具体的なアクションプランをご紹介します。

### ステップ 1: 環境準備（5 分）

```bash
# Node.js 18 以上が必要
node --version

# Miyabi CLI インストール
npm install -g @miyabi/cli

# インストール確認
miyabi --version
```

### ステップ 2: 小規模プロジェクトで試す（30 分）

最初は小さく始めましょう。以下のような 2-3 エージェントのプロジェクトがおすすめです：

**例 1: ブログ記事作成**
- Agent 1: リサーチ（情報収集）
- Agent 2: ライティング（本文執筆）
- Agent 3: SEO 最適化

**例 2: API ドキュメント生成**
- Agent 1: エンドポイント仕様
- Agent 2: サンプルコード
- Agent 3: ユースケース

### ステップ 3: Wave 戦略を設計（15 分）

依存関係を考慮して Wave を設計します：

```yaml
waves:
  - id: "wave-1"
    agents: ["agent-research"]
    description: "基礎調査"

  - id: "wave-2"
    agents: ["agent-writing", "agent-seo"]
    description: "執筆と SEO の並行実行"
    dependencies: ["wave-1"]
```

### ステップ 4: 実行と評価（10 分）

```bash
# Wave 実行
miyabi run --all

# 成果物確認
ls -la output/

# 品質チェック
miyabi check --all
```

### ステップ 5: 大規模プロジェクトへ展開

小規模で成功したら、5-10 エージェントの本格的なプロジェクトに挑戦しましょう。

**期待できる効果**:
- ⚡ 開発時間: **30-70% 削減**
- 📈 品質スコア: **80 点以上**
- 🤝 チーム生産性: **2-3 倍向上**

### トラブルシューティング

**Q: エージェント間で用語が統一されない**
A: `.miyabi.yml` に `glossary` セクションを追加して共通語彙を定義

**Q: Wave 実行が遅い**
A: エージェント数を減らすか、より高速な API（Gemini 2.5 Flash など）を使用

**Q: GitHub Issues が自動作成されない**
A: `gh auth login` でGitHub CLI の認証を確認

---

**関連リンク**:

- [Miyabi CLI 公式](https://github.com/miyabi-framework/miyabi)
- [GitHub Issues 統合ガイド](https://docs.github.com/ja/issues)
- [並行開発のベストプラクティス](https://git-scm.com/book/ja/v2)

*この記事は 2025-10-09 時点の情報に基づいています。*
