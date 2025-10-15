# トラブルシューティングガイド

Self-Healing Agent で発生する可能性のある問題と解決方法をまとめています。

## 📋 目次

- [起動に関する問題](#起動に関する問題)
- [API エラー](#api-エラー)
- [PR 作成の問題](#pr-作成の問題)
- [自動マージの問題](#自動マージの問題)
- [スクリプトエラー](#スクリプトエラー)
- [デバッグ方法](#デバッグ方法)

## 起動に関する問題

### 問題 1: Self-Healing Agent が起動しない

**症状**:
```
ワークフローが失敗しても Self-Healing Agent が実行されない
```

**原因**:
1. `workflow_run` トリガーの設定が正しくない
2. ワークフロー名が一致していない
3. permissions が不足している

**解決方法**:

#### 1. ワークフロー名の確認

```bash
# 全ワークフローの名前を確認
gh api /repos/{owner}/{repo}/actions/workflows | jq '.workflows[].name'

# 出力例:
# "Test Self-Healing Agent"
# "Gemini CLI - AI Code Assistant"
```

`.github/workflows/self-healing.yml` の `on.workflow_run.workflows` と完全一致する必要があります:

```yaml
on:
  workflow_run:
    workflows:
      - "Test Self-Healing Agent"  # ← この名前が正確に一致
    types: [completed]
```

#### 2. トリガー条件の確認

Self-Healing Agent は失敗時のみ実行されます:

```yaml
jobs:
  detect-and-heal:
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}  # ← 失敗時のみ
```

成功したワークフローでは起動しません。

#### 3. permissions の確認

`.github/workflows/self-healing.yml` で必要な権限が設定されているか確認:

```yaml
permissions:
  contents: write       # ✅ 必須
  issues: write         # ✅ 必須
  pull-requests: write  # ✅ 必須
  actions: write        # ✅ 必須
```

### 問題 2: workflow_run イベントが発火しない

**症状**:
```
監視対象ワークフローが失敗しても Self-Healing Agent のログが表示されない
```

**原因**:
- `workflow_run` は main ブランチのワークフローのみをトリガーします
- feature ブランチでは動作しません

**解決方法**:

```bash
# 1. main ブランチに Self-Healing Agent がマージされているか確認
git branch --contains $(git rev-parse HEAD:.github/workflows/self-healing.yml)

# 2. main ブランチで実行されたワークフローか確認
gh run list --workflow=test-self-healing-scripts.yml --branch=main
```

> **重要**: `workflow_run` イベントは main ブランチ（またはデフォルトブランチ）のワークフローでのみ機能します。

## API エラー

### 問題 3: Gemini API エラー

**症状**:
```
Error: Failed to analyze with Gemini
```

**原因**:
1. `GEMINI_API_KEY` が設定されていない
2. API キーが無効
3. API レート制限超過

**解決方法**:

#### 1. Secret の確認

```bash
# GitHub Secrets を確認
gh secret list

# GEMINI_API_KEY が存在するか確認
# 出力に "GEMINI_API_KEY" が含まれていること
```

Secret が存在しない場合:

```bash
# Google AI Studio で API キーを取得
# https://ai.google.dev/gemini-api/docs/api-key

# GitHub CLI で追加
gh secret set GEMINI_API_KEY

# または GitHub UI で追加
# Settings → Secrets and variables → Actions → New repository secret
```

#### 2. API キーの検証

```bash
# API キーが有効か確認
curl -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY"

# 正常な場合:
# {
#   "candidates": [...]
# }

# エラーの場合:
# {
#   "error": {
#     "code": 400,
#     "message": "API key not valid"
#   }
# }
```

#### 3. レート制限の確認

Gemini API 無料枠:
- **60 requests/min**
- **1,000 requests/day**

レート制限超過時のエラー:

```json
{
  "error": {
    "code": 429,
    "message": "Resource has been exhausted"
  }
}
```

解決方法:
- 待機してから再実行
- API キーをアップグレード（有料プラン）

### 問題 4: GitHub API エラー

**症状**:
```
Error: Failed to fetch workflow logs
```

**原因**:
1. `GITHUB_TOKEN` の権限不足
2. API レート制限超過
3. リポジトリへのアクセス権限なし

**解決方法**:

#### 1. Token 権限の確認

```bash
# GITHUB_TOKEN の権限を確認
gh api /repos/{owner}/{repo} --jq '.permissions'

# 必要な権限:
# - admin: true または
# - maintain: true または
# - write: true
```

#### 2. レート制限の確認

```bash
# GitHub API レート制限を確認
gh api /rate_limit

# 出力例:
# {
#   "resources": {
#     "core": {
#       "limit": 5000,
#       "remaining": 4999,
#       "reset": 1234567890
#     }
#   }
# }
```

レート制限超過時は reset 時刻まで待機。

## PR 作成の問題

### 問題 5: PR 作成に失敗

**症状**:
```
Error: Failed to create pull request
```

**原因**:
1. `PAT_TOKEN` が設定されていない
2. Token のスコープが不足
3. ブランチ保護ルールに抵触

**解決方法**:

#### 1. PAT_TOKEN の設定

```bash
# PAT_TOKEN が設定されているか確認
gh secret list | grep PAT_TOKEN

# 存在しない場合:
# 1. GitHub Settings → Developer settings → Personal access tokens
# 2. Generate new token (classic)
# 3. 必要なスコープを選択:
#    - repo (Full control)
#    - workflow (Update workflows)
#    - write:discussion

# GitHub CLI で追加
gh secret set PAT_TOKEN
```

#### 2. スコープの確認

PAT_TOKEN に必要なスコープ:
- ✅ `repo` - リポジトリへのフルアクセス
- ✅ `workflow` - ワークフローの更新
- ✅ `write:discussion` - Discussion への書き込み

#### 3. ブランチ保護ルールの確認

```bash
# main ブランチの保護ルールを確認
gh api /repos/{owner}/{repo}/branches/main/protection

# PR 作成を妨げる設定:
# - required_pull_request_reviews.required_approving_review_count > 0
# - required_status_checks.strict: true
```

代替策: PAT_TOKEN に `admin` 権限を付与

### 問題 6: PR が Draft として作成されない

**症状**:
```
PR が即座にレビュー可能な状態で作成される
```

**原因**:
- `peter-evans/create-pull-request` の `draft` パラメータが `false`

**解決方法**:

`.github/workflows/self-healing.yml` を確認:

```yaml
- name: Create Pull Request
  uses: peter-evans/create-pull-request@v6
  with:
    draft: false  # ← true に変更
```

## 自動マージの問題

### 問題 7: Auto-merge が有効にならない

**症状**:
```
PR は作成されるが Auto-merge が有効にならない
```

**原因**:
1. リポジトリで Auto-merge が無効
2. ブランチ保護ルールが不十分
3. `gh pr merge --auto` が失敗

**解決方法**:

#### 1. Auto-merge の有効化

```bash
# リポジトリ設定を確認
gh api /repos/{owner}/{repo} --jq '.allow_auto_merge'

# false の場合、有効化:
# GitHub UI: Settings → General → Allow auto-merge
```

#### 2. ブランチ保護ルールの設定

Auto-merge には以下が必要:

```bash
# main ブランチ保護ルールを設定
# Settings → Branches → Add branch protection rule

必要な設定:
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Status checks: (テストワークフロー名)
```

#### 3. 手動で Auto-merge を有効化

```bash
# PR 番号を確認
gh pr list

# Auto-merge を手動で有効化
gh pr merge <pr_number> --auto --squash
```

### 問題 8: テストが失敗して Auto-merge されない

**症状**:
```
PR は作成されるが、テスト失敗により Auto-merge されない
```

**原因**:
- 生成された修復コードにエラーがある

**解決方法**:

#### 1. テスト結果を確認

```bash
# PR のチェック結果を確認
gh pr checks <pr_number>

# 失敗したチェックの詳細を表示
gh run view <run_id> --log
```

#### 2. ローカルで修正

```bash
# PR のブランチをチェックアウト
gh pr checkout <pr_number>

# 型チェック
npm run typecheck

# テスト実行
npm test

# 修正後コミット
git add .
git commit -m "fix: Resolve test failures"
git push
```

#### 3. Gemini プロンプトの改善

修復が繰り返し失敗する場合、`.github/workflows/self-healing.yml` の Gemini プロンプトを改善:

```yaml
- name: Analyze and Fix with Gemini
  uses: google-github-actions/run-gemini-cli@v0.1.13
  with:
    prompt: |
      # より詳細なコンテキストを提供
      ## プロジェクト情報
      - TypeScript strict mode: 有効
      - テストフレームワーク: Jest
      - Node.js バージョン: 20

      ## エラー情報
      ${{ steps.get-logs.outputs.error_summary }}

      # 具体的な指示を追加
      - テストがパスすることを確認
      - 型エラーがないことを確認
```

## スクリプトエラー

### 問題 9: get-workflow-path.sh が失敗

**症状**:
```
Error: Workflow file not found
```

**原因**:
- ワークフロー名が `.github/workflows/*.yml` の `name:` と一致しない

**解決方法**:

```bash
# ワークフロー名を確認
grep "^name:" .github/workflows/*.yml

# 出力例:
# .github/workflows/test-self-healing-scripts.yml:name: Test Self-Healing Scripts

# Self-Healing Agent の workflow_run.workflows と一致させる
```

### 問題 10: get-workflow-logs.sh が失敗

**症状**:
```
Error: Failed to fetch workflow logs
```

**原因**:
1. Run ID が無効
2. Repository 形式が正しくない
3. GitHub API エラー

**解決方法**:

```bash
# Run ID を確認
gh run list --workflow=<workflow_name>

# Repository 形式を確認 (owner/repo)
gh repo view --json nameWithOwner --jq '.nameWithOwner'

# スクリプトを手動実行してデバッグ
export GITHUB_OUTPUT=/tmp/test.txt
export GH_TOKEN=<your_token>

bash scripts/self-healing/get-workflow-logs.sh <run_id> <owner/repo>
cat /tmp/test.txt
```

## デバッグ方法

### ローカルでのスクリプトテスト

```bash
# 環境変数を設定
export GITHUB_OUTPUT=/tmp/test-output.txt

# 各スクリプトを個別に実行
bash scripts/self-healing/get-workflow-path.sh "Test Workflow"
cat /tmp/test-output.txt

bash scripts/self-healing/get-workflow-logs.sh "12345" "owner/repo"
cat /tmp/test-output.txt

bash scripts/self-healing/read-workflow.sh ".github/workflows/test.yml"
cat /tmp/test-output.txt
```

### 単体テストの実行

```bash
# 全テスト実行
bats tests/self-healing/*.bats

# 特定のテストのみ
bats tests/self-healing/get-workflow-path.bats

# デバッグ出力付き
bats --tap tests/self-healing/*.bats
```

### GitHub Actions のログ確認

```bash
# Self-Healing Agent の実行履歴
gh run list --workflow=self-healing.yml

# 特定の run の詳細ログ
gh run view <run_id> --log

# 失敗したステップのみ表示
gh run view <run_id> --log-failed
```

### Workflow の手動実行

```bash
# GitHub UI から実行
# Actions → 🔧 Self-Healing Agent → Run workflow

# または CLI から
gh workflow run self-healing.yml
```

## サポート

問題が解決しない場合:

1. **Issue を作成**: https://github.com/hiromima/article-generator/issues
2. **ログを添付**: `gh run view <run_id> --log > debug.log`
3. **環境情報を記載**:
   - OS/ブラウザ
   - Node.js バージョン
   - npm/bats バージョン

---

📘 [README に戻る](./README.md) | 🏗️ [アーキテクチャ](./ARCHITECTURE.md)
