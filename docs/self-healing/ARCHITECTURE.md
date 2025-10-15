# Self-Healing Agent アーキテクチャ

Self-Healing Agent の詳細なアーキテクチャ設計を説明します。

## 📋 目次

- [システム概要](#システム概要)
- [アーキテクチャ図](#アーキテクチャ図)
- [コンポーネント詳細](#コンポーネント詳細)
- [データフロー](#データフロー)
- [エラーハンドリング](#エラーハンドリング)
- [拡張性](#拡張性)

## システム概要

Self-Healing Agent は以下の設計原則に基づいて構築されています:

### 設計原則

1. **完全自律動作** - 人間の介入なしで動作
2. **モジュラー設計** - 各スクリプトは独立してテスト可能
3. **エラー透明性** - 全てのエラーをログとして記録
4. **段階的修復** - 失敗時は段階的にフォールバック
5. **テスタビリティ** - 100% テストカバレッジ

### システム構成要素

```
Self-Healing Agent
├── Trigger System (workflow_run)
├── Detection Layer (get-workflow-path, get-logs)
├── Analysis Layer (Gemini AI)
├── Repair Layer (Code Generation)
├── Validation Layer (Tests, Type Check)
└── Integration Layer (PR, Auto-merge)
```

## アーキテクチャ図

### 全体フロー

```
┌─────────────────────────────────────────────────────────────┐
│                    Monitored Workflows                       │
│  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐   │
│  │Test   │  │Gemini │  │Webhook│  │Agent  │  │State  │   │
│  │Self   │  │CLI    │  │Event  │  │Exec   │  │Machine│   │
│  └───┬───┘  └───┬───┘  └───┬───┘  └───┬───┘  └───┬───┘   │
└──────┼──────────┼──────────┼──────────┼──────────┼─────────┘
       │          │          │          │          │
       └──────────┴──────────┴──────────┴──────────┘
                         │ (failure)
                         ↓
       ┌─────────────────────────────────────────┐
       │     Self-Healing Agent (workflow_run)   │
       └─────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ↓               ↓               ↓
    ┌────────┐     ┌─────────┐    ┌──────────┐
    │Detect  │     │Analyze  │    │Repair    │
    │& Track │ →   │with AI  │ →  │& Validate│
    └────────┘     └─────────┘    └──────────┘
         │               │               │
         ↓               ↓               ↓
    ┌────────┐     ┌─────────┐    ┌──────────┐
    │Create  │     │Generate │    │Create PR │
    │Issue   │     │Fix Code │    │Auto-merge│
    └────────┘     └─────────┘    └──────────┘
```

### コンポーネント構成

```
┌─────────────────────────────────────────────────────────┐
│             .github/workflows/self-healing.yml          │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │                   Trigger Layer                  │  │
│  │  on:                                             │  │
│  │    workflow_run:                                 │  │
│  │      workflows: [...]                            │  │
│  │      types: [completed]                          │  │
│  │    if: conclusion == 'failure'                   │  │
│  └──────────────────────────────────────────────────┘  │
│                        ↓                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │                 Detection Layer                  │  │
│  │  ┌─────────────────────────────────────────┐    │  │
│  │  │ scripts/self-healing/                   │    │  │
│  │  │  ├── get-workflow-path.sh  (5 tests)   │    │  │
│  │  │  ├── get-workflow-logs.sh  (7 tests)   │    │  │
│  │  │  └── read-workflow.sh      (6 tests)   │    │  │
│  │  └─────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────┘  │
│                        ↓                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │                  Analysis Layer                  │  │
│  │  ┌─────────────────────────────────────────┐    │  │
│  │  │ google-github-actions/run-gemini-cli    │    │  │
│  │  │  - Error analysis                        │    │  │
│  │  │  - Root cause identification             │    │  │
│  │  │  - Fix strategy determination            │    │  │
│  │  └─────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────┘  │
│                        ↓                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │                  Repair Layer                    │  │
│  │  - npm install (dependencies)                    │  │
│  │  - npm run typecheck                             │  │
│  │  - npm test                                      │  │
│  └──────────────────────────────────────────────────┘  │
│                        ↓                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │                Integration Layer                 │  │
│  │  ┌─────────────────────────────────────────┐    │  │
│  │  │ peter-evans/create-pull-request         │    │  │
│  │  │  - Branch: self-healing/run-{id}        │    │  │
│  │  │  - Auto-merge: enabled                   │    │  │
│  │  │  - Issue reference: Fixes #{issue}      │    │  │
│  │  └─────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## コンポーネント詳細

### 1. Trigger System

**責務**: ワークフロー失敗を検知し Self-Healing Agent を起動

**実装**:
```yaml
on:
  workflow_run:
    workflows:
      - "Test Self-Healing Agent"
      - "Gemini CLI - AI Code Assistant"
      # ... other workflows
    types: [completed]

jobs:
  detect-and-heal:
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
```

**特徴**:
- `workflow_run` イベントを使用
- main ブランチのワークフローのみ監視
- 失敗時のみ実行（成功時はスキップ）

**制約**:
- デフォルトブランチ（main）のワークフローのみトリガー可能
- フォークからの PR では動作しない

### 2. Detection Layer

#### get-workflow-path.sh

**責務**: ワークフロー名からファイルパスを特定

**入力**:
- `WORKFLOW_NAME`: 失敗したワークフローの名前

**出力**:
- `workflow_file`: ワークフローファイルのパス
- `workflow_exists`: ファイルが存在するか（true/false）

**実装**: scripts/self-healing/get-workflow-path.sh:1

```bash
WORKFLOW_FILE=$(find .github/workflows \( -name "*.yml" -o -name "*.yaml" \) -print0 2>/dev/null | \
    xargs -0 grep -l "^name: ${WORKFLOW_NAME}$" 2>/dev/null | head -1 || echo "")
```

**エッジケース**:
- ワークフローが存在しない → `workflow_exists=false`
- 複数ファイルに同名ワークフロー → 最初のマッチを返す
- スペースを含むワークフロー名 → 正確にマッチ

**テストカバレッジ**: 5/5 tests ✅

#### get-workflow-logs.sh

**責務**: 失敗したワークフローのログを取得

**入力**:
- `RUN_ID`: ワークフロー実行 ID
- `REPOSITORY`: リポジトリ名（owner/repo）

**出力**:
- `logs_url`: ログの URL
- `error_summary`: エラーサマリー（20行まで）
- `/tmp/failed_jobs.json`: 失敗したジョブの詳細

**実装**: scripts/self-healing/get-workflow-logs.sh:1

```bash
FAILED_JOBS=$(gh api "/repos/${REPOSITORY}/actions/runs/${RUN_ID}/jobs" \
  --jq '.jobs[] | select(.conclusion == "failure") | {name: .name, steps: [...]}')
```

**エッジケース**:
- API エラー → exit 1
- 空のレスポンス → 空のサマリーを返す
- 20行超のログ → 先頭20行のみ

**テストカバレッジ**: 7/7 tests ✅

#### read-workflow.sh

**責務**: ワークフローファイルの内容を読み込み

**入力**:
- `WORKFLOW_FILE`: ワークフローファイルのパス

**出力**:
- `workflow_content`: ワークフローファイルの内容

**実装**: scripts/self-healing/read-workflow.sh:1

```bash
WORKFLOW_CONTENT=$(cat "$WORKFLOW_FILE")
```

**エッジケース**:
- ファイルが存在しない → exit 1
- 空のファイル → 空の内容を返す
- 大容量ファイル → 全て読み込み

**テストカバレッジ**: 6/6 tests ✅

### 3. Analysis Layer

#### Gemini AI Integration

**責務**: エラーを分析し修復方法を決定

**実装**:
```yaml
- name: Analyze and Fix with Gemini
  uses: google-github-actions/run-gemini-cli@v0.1.13
  with:
    gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
    prompt: |
      # エラー情報とワークフローファイルを提供
      # AI が修復方法を決定
```

**入力**:
- ワークフロー名
- エラーサマリー
- ワークフローファイル内容

**出力**:
- エラー原因
- 修復タイプ（workflow/code/dependency）
- 修正対象ファイルリスト
- テストコマンド

**AI プロンプト構造**:
1. **エラー情報** - 失敗したジョブとステップ
2. **ワークフローファイル** - 現在の設定
3. **ミッション** - 修復の具体的手順
4. **制約条件** - セキュリティ、既存機能保護
5. **出力形式** - JSON 形式での修復計画

### 4. Repair Layer

#### 依存関係インストール

```yaml
- name: Install dependencies
  run: npm ci
  continue-on-error: true
```

失敗しても継続（依存関係の問題が原因でない場合がある）

#### 型チェック

```yaml
- name: Run type check
  run: npm run typecheck
  continue-on-error: true
```

TypeScript strict mode での検証

#### テスト実行

```yaml
- name: Run tests
  run: npm test
  continue-on-error: true
```

全テストの実行とカバレッジ確認

### 5. Integration Layer

#### PR 作成

**責務**: 修復コードを含む PR を自動作成

**実装**:
```yaml
- name: Create Pull Request
  uses: peter-evans/create-pull-request@v6
  with:
    token: ${{ secrets.PAT_TOKEN || secrets.GITHUB_TOKEN }}
    branch: self-healing/run-${{ github.event.workflow_run.id }}
    title: "fix: Auto-heal ..."
    body: |
      ## 修復内容
      - エラー分析結果
      - 修正ファイル
      - テスト結果
```

**特徴**:
- Conventional Commits 準拠
- Issue 参照（Fixes #123）
- Draft PR として作成
- 自動削除ブランチ

#### Auto-merge

**責務**: テスト通過後に自動マージ

**実装**:
```yaml
- name: Auto-merge PR
  run: |
    gh pr merge "${PR_NUMBER}" \
      --auto \
      --squash \
      --delete-branch
```

**条件**:
- 全ステータスチェックがパス
- ブランチ保護ルール準拠
- Auto-merge 機能が有効

## データフロー

### 成功時のフロー

```
1. Workflow Failure
   ↓
2. workflow_run Event (conclusion: failure)
   ↓
3. Self-Healing Agent Start
   ↓
4. Get Workflow Path
   → workflow_file=".github/workflows/test.yml"
   → workflow_exists=true
   ↓
5. Get Workflow Logs
   → logs_url="https://github.com/..."
   → error_summary="..."
   → /tmp/failed_jobs.json
   ↓
6. Create Issue
   → issue-number=123
   ↓
7. Read Workflow File
   → workflow_content="..."
   ↓
8. Analyze with Gemini
   → error_cause="..."
   → fix_type="code"
   → files_to_modify=[...]
   ↓
9. Generate Fix Code (by Gemini)
   ↓
10. Install Dependencies
   → npm ci (success/continue)
   ↓
11. Run Type Check
   → npm run typecheck (success/continue)
   ↓
12. Run Tests
   → npm test (success/continue)
   ↓
13. Create PR
   → pull-request-number=456
   ↓
14. Wait for Checks
   → 30 seconds
   ↓
15. Enable Auto-merge
   → gh pr merge --auto
   ↓
16. Close Issue
   → gh issue close 123
   ↓
17. Success! 🎉
```

### エラー時のフロー

```
1. Workflow Failure
   ↓
2. Self-Healing Agent Start
   ↓
3. Detection Layer Error
   → Create Issue (if possible)
   → Notify Failure
   → Exit 1
```

各ステップで `trap` と `set -euo pipefail` によりエラーをキャッチ

## エラーハンドリング

### エラーハンドリング戦略

1. **Bash strict mode**
   ```bash
   set -euo pipefail
   trap 'echo "::error::Failed at line $LINENO"' ERR
   ```

2. **段階的フォールバック**
   - Step 1 失敗 → Issue 作成して通知
   - Step 2 失敗 → 既存 Issue に追記
   - Step 3 失敗 → 手動対応を促す

3. **continue-on-error**
   - 依存関係インストール: 失敗しても継続
   - 型チェック: 失敗しても継続
   - テスト: 失敗しても継続（PR は作成）

4. **通知メカニズム**
   ```yaml
   - name: Notify on failure
     if: failure()
     run: |
       gh issue comment "${ISSUE_NUMBER}" --body "❌ 自動修復に失敗しました"
   ```

### エラーログ形式

**GitHub Actions annotations**:
- `::error::` - エラーメッセージ
- `::warning::` - 警告メッセージ
- `::notice::` - 情報メッセージ

## 拡張性

### 新しいワークフローの追加

`.github/workflows/self-healing.yml` の `on.workflow_run.workflows` に追加:

```yaml
on:
  workflow_run:
    workflows:
      - "Existing Workflow"
      - "New Workflow Name"  # ← 追加
    types: [completed]
```

### 新しいスクリプトの追加

1. `scripts/self-healing/new-script.sh` を作成
2. `tests/self-healing/new-script.bats` でテスト
3. `.github/workflows/self-healing.yml` で呼び出し

```yaml
- name: Run new script
  run: bash scripts/self-healing/new-script.sh <args>
```

### カスタム AI プロンプトの追加

`.github/workflows/self-healing.yml` の Gemini プロンプトをカスタマイズ:

```yaml
- name: Analyze and Fix with Gemini
  uses: google-github-actions/run-gemini-cli@v0.1.13
  with:
    prompt: |
      # プロジェクト固有の情報を追加
      ## プロジェクトルール
      - コーディングスタイル: Prettier
      - テストフレームワーク: Jest
      - カバレッジ目標: 80%+

      # ... 既存のプロンプト
```

## パフォーマンス

### 実行時間

- **Detection Layer**: ~5秒
- **Analysis Layer**: ~15-30秒（Gemini API）
- **Repair Layer**: ~30-60秒（npm install, tests）
- **Integration Layer**: ~10秒

**合計**: 約 1-2 分

### API 使用量

- **GitHub API**: 5-10 requests/run
- **Gemini API**: 1-2 requests/run

**月間コスト**: ¥0（無料枠内）

## セキュリティ

### 機密情報の保護

1. **環境変数**
   - `GEMINI_API_KEY` - GitHub Secrets
   - `PAT_TOKEN` - GitHub Secrets
   - `GITHUB_TOKEN` - 自動提供（読み取り専用推奨）

2. **ワークフロー制約**
   - ワークフローファイル自体は変更禁止
   - アプリケーションコードのみ修正

3. **権限最小化**
   ```yaml
   permissions:
     contents: write        # コード変更のみ
     issues: write          # Issue 管理のみ
     pull-requests: write   # PR 管理のみ
     actions: write         # ワークフロー実行のみ
   ```

## まとめ

Self-Healing Agent は以下の特徴を持つモジュラーで拡張可能なシステムです:

- ✅ **完全自律動作** - 人間の介入不要
- ✅ **100% テストカバレッジ** - 全スクリプトがテスト済み
- ✅ **AI 駆動修復** - Gemini による根本原因分析
- ✅ **段階的エラーハンドリング** - 失敗時のフォールバック
- ✅ **拡張性** - 新ワークフロー・スクリプト追加が容易

---

📘 [README に戻る](./README.md) | 🔧 [トラブルシューティング](./TROUBLESHOOTING.md)
