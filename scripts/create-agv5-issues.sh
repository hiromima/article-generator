#!/bin/bash
# AGENTS.md v5.0 サブ Issue 一括作成スクリプト

set -euo pipefail

echo "🚀 Creating AGENTS.md v5.0 sub-issues..."
echo ""

# Epic #2 のサブ Issue (AGv5-1.2 - AGv5-1.4)

gh issue create \
  --title "[AGv5-1.2] CostMonitoringAgent 実装" \
  --label "📊 priority:P0-Critical,💰 economic-governance,🤖 agent:cost-monitoring" \
  --body "## タスク
1時間ごとに Billing API を叩き、コスト消費ペースを監視するエージェントを実装します。

## 実装詳細
\`\`\`javascript
// src/agents/cost-monitoring/CostMonitoringAgent.js
export class CostMonitor ingAgent extends BaseAgent {
  async execute() {
    // 1. BUDGET.yml を読み込み
    // 2. Anthropic Billing API をチェック
    // 3. Firebase Billing API をチェック
    // 4. 消費率を計算
    // 5. しきい値を超えた場合、経済的非常事態を宣言
  }
}
\`\`\`

## 成功基準
- ✅ エージェントが BUDGET.yml を読み込める
- ✅ 各サービスのコストを取得できる
- ✅ 消費率を正しく計算できる

**Epic**: #2
**依存**: #8
**推定工数**: 4 hours"

gh issue create \
  --title "[AGv5-1.3] Economic Circuit Breaker ワークフロー作成" \
  --label "📊 priority:P0-Critical,💰 economic-governance,🔄 workflow,🤖 agent:coordinator" \
  --body "## タスク
1時間ごとにコストをチェックし、予算超過時に全開発ワークフローを停止する GitHub Actions ワークフローを作成します。

## 実装
\`.github/workflows/economic-circuit-breaker.yml\`

\`\`\`yaml
name: Economic Circuit Breaker

on:
  schedule:
    - cron: '0 * * * *'  # 1時間ごと
  workflow_dispatch:

jobs:
  monitor-costs:
    runs-on: ubuntu-latest
    steps:
      - name: Check Billing
        run: node src/agents/cost-monitoring/CostMonitoringAgent.js

      - name: Declare Emergency if over budget
        if: steps.check-billing.outputs.is_over_budget == 'true'
        run: |
          gh api -X POST /repos/\${{ github.repository }}/actions/workflows/agent-runner.yml/disable
          gh issue create --title \"🤖🚨 Economic Circuit Breaker Triggered\" --label \"P0-Critical\"
\`\`\`

## 成功基準
- ✅ 1時間ごとに自動実行される
- ✅ 予算超過時にワークフローが停止される
- ✅ 緊急 Issue が自動作成される

**Epic**: #2
**依存**: #9
**推定工数**: 3 hours"

gh issue create \
  --title "[AGv5-1.4] コスト監視テストとドキュメント作成" \
  --label "⚠️ priority:P1-High,💰 economic-governance,📖 documentation" \
  --body "## タスク
コスト監視システムの動作テストとドキュメントを作成します。

## テスト項目
- ✅ BUDGET.yml の読み込み
- ✅ コスト取得の成功
- ✅ しきい値判定の正確性
- ✅ 緊急停止の動作確認

## ドキュメント
\`docs/ECONOMIC_GOVERNANCE.md\`
- コスト監視の仕組み
- 緊急停止の復旧方法
- 予算の変更手順

**Epic**: #2
**依存**: #10
**推定工数**: 2 hours"

echo "✅ Epic #2 sub-issues created"

# Epic #3 のサブ Issue (AGv5-2.1 - AGv5-2.4)

gh issue create \
  --title "[AGv5-2.1] ナレッジリポジトリ作成" \
  --label "⚠️ priority:P1-High,📚 knowledge-persistence,🏗️ infrastructure" \
  --body "## タスク
全てのインシデントレポート、ポストモーテム、RFC を保存する専用リポジトリを作成します。

## リポジトリ構造
\`\`\`
article-generator-knowledge/
├── incidents/
│   ├── 2025-10-01-api-timeout.md
│   └── 2025-10-05-cost-spike.md
├── postmortems/
│   └── 2025-10-06-deployment-failure.md
├── rfcs/
│   ├── 001-modular-architecture.md
│   └── 002-parallel-execution.md
└── README.md
\`\`\`

## 成功基準
- ✅ GitHub リポジトリ作成完了
- ✅ ディレクトリ構造設定済み
- ✅ README.md 作成済み

**Epic**: #3
**推定工数**: 1 hour"

gh issue create \
  --title "[AGv5-2.2] Vector Database セットアップ" \
  --label "⚠️ priority:P1-High,📚 knowledge-persistence,💾 database,🤖 agent:knowledge" \
  --body "## タスク
Markdown ファイルを Embedding 化し、類似検索を可能にする Vector Database をセットアップします。

## 技術選定
- **Option 1**: Pinecone (マネージド)
- **Option 2**: Weaviate (セルフホスト)
- **Option 3**: Firebase Extensions Vector Search

## 実装
\`\`\`javascript
export class VectorStore {
  async addDocument(content, metadata) {
    const embedding = await this.createEmbedding(content);
    await this.vectorDB.upsert({ id: metadata.id, values: embedding, metadata });
  }

  async search(query, topK = 5) {
    const queryEmbedding = await this.createEmbedding(query);
    return await this.vectorDB.query({ vector: queryEmbedding, topK });
  }
}
\`\`\`

## 成功基準
- ✅ Vector DB がセットアップ済み
- ✅ Embedding 作成が動作する
- ✅ 類似検索が動作する

**Epic**: #3
**依存**: #12
**推定工数**: 4 hours"

gh issue create \
  --title "[AGv5-2.3] 自動 Embedding ワークフロー作成" \
  --label "⚠️ priority:P1-High,📚 knowledge-persistence,🔄 workflow" \
  --body "## タスク
ナレッジリポジトリへの push をトリガーに、Markdown を自動で Embedding 化するワークフローを作成します。

## 実装
\`.github/workflows/knowledge-embedding.yml\`

\`\`\`yaml
name: Knowledge Embedding

on:
  push:
    branches: [main]
    paths:
      - 'incidents/**'
      - 'postmortems/**'
      - 'rfcs/**'

jobs:
  embed:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create embeddings
        run: node scripts/create-embeddings.js
\`\`\`

## 成功基準
- ✅ push 時に自動実行される
- ✅ 変更されたファイルのみ処理される
- ✅ Vector DB に自動保存される

**Epic**: #3
**依存**: #13
**推定工数**: 3 hours"

gh issue create \
  --title "[AGv5-2.4] Agent への類似事例検索機能統合" \
  --label "⚠️ priority:P1-High,📚 knowledge-persistence,🤖 agent:coordinator" \
  --body "## タスク
全 Agent に、処理開始時に類似事例を検索する機能を統合します。

## 実装
\`\`\`javascript
export class BaseAgent {
  async execute(input) {
    // 1. 類似事例を検索
    const similarCases = await this.searchKnowledge(input);

    // 2. 類似事例を参考に処理
    const result = await this.process(input, similarCases);

    return result;
  }

  async searchKnowledge(query) {
    const vectorStore = new VectorStore();
    return await vectorStore.search(query, 5);
  }
}
\`\`\`

## 成功基準
- ✅ 全 Agent が類似事例検索を実行
- ✅ 検索結果が処理に活用される
- ✅ 学習精度が向上している

**Epic**: #3
**依存**: #14
**推定工数**: 4 hours"

echo "✅ Epic #3 sub-issues created"

# 残りのサブ Issue を作成（Epic #4, #5, #6, #7）

echo ""
echo "🎉 All sub-issues created successfully!"
echo ""
echo "📊 Summary:"
echo "  - Epic #2 (AGv5-1): 4 sub-issues"
echo "  - Epic #3 (AGv5-2): 4 sub-issues"
echo "  - Total: 8 sub-issues (remaining 16 to be created manually or via additional scripts)"
