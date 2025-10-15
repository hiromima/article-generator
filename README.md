# article-generator

**Miyabi Framework v5.0** - Autonomous development powered by AI Agents

GitHub を OS として扱い、記事生成から投稿までを完全自動化する自律型開発環境。

## 🤖 AI Powered by Google Gemini

このプロジェクトは **Google Gemini API（無料）** を使用しています。

- **完全無料**: 60 requests/min, 1,000 requests/day
- **GitHub Actions 統合**: `google-github-actions/run-gemini-cli`
- **プロジェクトコンテキスト**: `GEMINI.md` で詳細な情報を提供

## 🚀 クイックスタート

### 環境構築

```bash
# リポジトリをクローン
git clone https://github.com/hiromima/article-generator.git
cd article-generator

# 依存関係をインストール
npm install

# TypeScript チェック
npm run typecheck

# テスト実行
npm test
```

### Gemini API セットアップ

1. **Google AI Studio** で無料 API キーを取得
   - https://ai.google.dev/gemini-api/docs/api-key

2. GitHub Secrets に追加
   ```bash
   # GitHub リポジトリ → Settings → Secrets → Actions
   # New repository secret
   # Name: GEMINI_API_KEY
   # Value: (あなたの API キー)
   ```

3. Gemini CLI をインストール（ローカル開発用）
   ```bash
   npm install -g @google/generative-ai-cli
   gemini /setup-github
   ```

## 🌸 Miyabi Framework

### 7つの自律型 Agent

1. **CoordinatorAgent** - タスク統括・並列実行制御
2. **CodeGenAgent** - AI 駆動コード生成
3. **ReviewAgent** - コード品質判定
4. **TestAgent** - テスト自動実行
5. **PRAgent** - Pull Request 自動作成
6. **DeploymentAgent** - CI/CD デプロイ自動化
7. **EconomicCircuitBreaker** - API コスト監視

### GitHub Actions 統合

**Gemini CLI** が以下の作業を自動化：

- 🔍 **PR レビュー**: コード品質、セキュリティ、パフォーマンスをチェック
- 🏷️ **Issue トリアージ**: 自動ラベル付け、タスク分解、優先度設定
- 💻 **コード生成**: Issue から自動的にコードと テストを生成
- 🤖 **オンデマンドサポート**: `@gemini-cli` でいつでも AI アシスタントを呼び出し

## 📋 npm scripts

```bash
# 開発
npm run dev                    # 開発サーバー起動

# Agent 実行（ローカル）
npm run coordinator:analyze    # タスク分析
npm run codegen:generate       # コード生成
npm run review                 # コード品質レビュー
npm run test:agent             # テスト実行
npm run pr:create              # PR 作成
npm run deploy                 # デプロイ

# 品質チェック
npm run typecheck              # TypeScript strict mode
npm run lint                   # ESLint
npm test                       # Jest テスト
npm run test:coverage          # カバレッジレポート
```

## 🏗️ プロジェクト構造

```
article-generator/
├── src/
│   └── agents/              # 自律型 Agent 実装
│       ├── CoordinatorAgent.ts
│       ├── CodeGenAgent.ts
│       ├── ReviewAgent.ts
│       ├── TestAgent.ts
│       ├── PRAgent.ts
│       ├── DeploymentAgent.ts
│       └── EconomicCircuitBreaker.ts
├── tests/                   # Jest テストコード
├── scripts/                 # CLI ツール
├── .github/
│   └── workflows/
│       ├── gemini-cli.yml   # Gemini AI 統合 ✨
│       ├── state-machine.yml
│       ├── economic-circuit-breaker.yml
│       └── autonomous-agent.yml
├── GEMINI.md                # Gemini プロジェクトコンテキスト
├── CLAUDE.md                # Claude Code コンテキスト
└── BUDGET.yml               # Economic Governance 設定
```

## 🎯 使用方法

### Gemini CLI で Issue を処理

1. Issue を作成
2. `agent:codegen` ラベルを付与
3. Gemini が自動的にコードを生成し、Draft PR を作成

または、コメントで `@gemini-cli` を呼び出し：

```
@gemini-cli この Issue を実装するためのタスクリストを作成してください
```

### ローカルで Agent を実行

```bash
# タスク分析
npm run coordinator:analyze -- --issue 16

# コード生成
npm run codegen:generate -- --issue 19 --files src/agents/NewAgent.ts

# PR 作成
npm run pr:create -- --issue 21 --ready
```

## 🔒 セキュリティ

### 環境変数

```bash
# 必須
GITHUB_TOKEN=your_github_token          # GitHub Personal Access Token
GEMINI_API_KEY=your_gemini_api_key      # Google AI Studio API Key

# オプション（デプロイ時）
FIREBASE_TOKEN=your_firebase_token      # Firebase CLI Token
```

### GitHub Secrets

以下を GitHub リポジトリの Secrets に追加：

- `GEMINI_API_KEY` - Gemini API キー（必須）
- `FIREBASE_TOKEN` - Firebase デプロイ用（オプション）

`GITHUB_TOKEN` は GitHub Actions で自動提供されます。

## 📊 品質基準

- ✅ TypeScript strict mode: 0 エラー必須
- ✅ ESLint: 0 警告推奨
- ✅ テストカバレッジ: 80%+ 目標
- ✅ コード品質スコア: 80+ で自動承認

## 💰 コスト

### Gemini API（完全無料）
- **無料枠**: 60 requests/min, 1,000 requests/day
- **月額**: ¥0

### GitHub Actions
- **Public リポジトリ**: 完全無料
- **Private リポジトリ**: 2,000 分/月（無料枠）

**実績**: 月間 ¥71（Gemini nano banana 画像生成含む）

## 📚 ドキュメント

- [GEMINI.md](./GEMINI.md) - Gemini プロジェクトコンテキスト
- [CLAUDE.md](./CLAUDE.md) - Claude Code コンテキスト
- [BUDGET.yml](./BUDGET.yml) - Economic Governance 設定

## 🤝 コントリビューション

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (Conventional Commits 準拠)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Gemini が自動的にレビューします！

## 📝 ライセンス

MIT

---

🌸 **Miyabi Framework v5.0** - Beauty in Autonomous Development

🤖 Powered by **Google Gemini API** (Free)
