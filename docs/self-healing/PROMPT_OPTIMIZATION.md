# Gemini Prompt Optimization

Self-Healing Agent の Gemini AI プロンプト最適化に関するドキュメントです。

## 📋 目次

- [最適化の概要](#最適化の概要)
- [改善内容](#改善内容)
- [プロンプト構造](#プロンプト構造)
- [Few-Shot Examples](#few-shot-examples)
- [効果測定](#効果測定)

## 最適化の概要

### 最適化前の課題

1. **曖昧な指示**
   - エラー分析の手順が不明確
   - 修復戦略の選択基準が曖昧
   - 出力フォーマットが自由すぎる

2. **不十分なコンテキスト**
   - プロジェクト情報が不足
   - エラータイプの分類が不明確
   - 制約条件が抽象的

3. **一貫性の欠如**
   - 出力形式がバラバラ
   - 修復精度にばらつき
   - Few-shot examples がない

### 最適化後の改善

1. **明確な3ステッププロセス**
   - Step 1: Root Cause Analysis
   - Step 2: Fix Strategy Determination
   - Step 3: Generate Minimal Fix

2. **詳細なコンテキスト提供**
   - プロジェクトプロファイル（言語、テストフレームワーク、ツール）
   - エラータイプの分類（5種類）
   - 具体的な修復例

3. **厳密な出力フォーマット**
   - JSON Schema 準拠
   - 必須フィールド定義
   - バリデーション項目追加

## 改善内容

### 1. プロンプト構造の改善

#### Before (旧プロンプト)
```markdown
## あなたのミッション

1. **エラー原因を特定**
   - ログから具体的なエラーを抽出
   - 依存関係の問題か、設定ミスか、コードバグか判定

2. **修復方法を決定**
   - ワークフローファイル修正が必要か
   - コードファイル修正が必要か
   - 依存関係更新が必要か

3. **自動修復を実行**
   - 必要なファイルを編集
   - 修正内容を明確にコミットメッセージに記載
   - テストが通ることを確認
```

**問題点**:
- 各ステップの実行方法が不明確
- エラータイプの分類基準がない
- 具体例がない

#### After (新プロンプト)
```markdown
## 🎯 Your Mission (3-Step Process)

### Step 1: Root Cause Analysis
Analyze the error systematically:

1. **Extract Key Error Messages**
   - Identify the exact error type (syntax, type, runtime, dependency)
   - Locate the failing line/file
   - Determine the error category

2. **Classify Error Type**
   - `dependency`: npm package issues, version conflicts
   - `type`: TypeScript type errors, strict mode violations
   - `test`: Test failures, assertion errors
   - `config`: Configuration file issues
   - `code`: Logic bugs, runtime errors

3. **Identify Root Cause**
   - What is the underlying issue?
   - Why did this error occur?
   - What change triggered it?

### Step 2: Fix Strategy Determination
Choose the minimal, safest fix:

1. **For Dependency Errors**
   - Update package.json versions
   - Add missing dependencies
   - Fix lock file conflicts
   - **Example**: `npm install missing-package`

2. **For Type Errors**
   - Add proper type annotations
   - Fix type mismatches
   - Update interface definitions
   - **Example**: `const value: string = getValue()`

[... 他のエラータイプも同様 ...]
```

**改善点**:
- ✅ 各ステップに明確な手順
- ✅ エラータイプごとの対処法
- ✅ 具体的なコード例

### 2. コンテキスト情報の強化

#### Before
```markdown
## エラー情報

**ワークフロー名**: ${{ github.event.workflow_run.name }}
**Issue**: #${{ steps.create-issue.outputs.issue-number }}
**Run URL**: ${{ steps.get-logs.outputs.logs_url }}
```

#### After
```markdown
## 📊 Context Information

### Project Profile
- **Language**: TypeScript (strict mode enabled)
- **Test Framework**: Jest with 80%+ coverage target
- **Package Manager**: npm
- **Node.js Version**: 20.x
- **Code Style**: ESLint + Prettier

### Current Failure
- **Workflow**: `${{ github.event.workflow_run.name }}`
- **Issue**: #${{ steps.create-issue.outputs.issue-number }}
- **Run URL**: ${{ steps.get-logs.outputs.logs_url }}
- **Branch**: `${{ github.event.workflow_run.head_branch }}`
- **Commit**: `${{ github.event.workflow_run.head_sha }}`
```

**改善点**:
- ✅ プロジェクト固有の情報を追加
- ✅ 技術スタックを明示
- ✅ コンテキスト情報を拡充

### 3. 出力フォーマットの標準化

#### Before
```json
{
  "error_cause": "エラーの根本原因",
  "fix_type": "workflow|code|dependency",
  "files_to_modify": ["ファイルパスのリスト"],
  "fix_description": "修正内容の説明",
  "test_commands": ["テストコマンドのリスト"]
}
```

**問題点**:
- フィールドが少なすぎる
- バリデーション情報がない
- 修復理由が不明確

#### After
```json
{
  "analysis": {
    "error_type": "dependency|type|test|config|code",
    "error_message": "Exact error message from logs",
    "failed_file": "path/to/failing/file.ts",
    "failed_line": 123,
    "root_cause": "Clear explanation of why this error occurred"
  },
  "fix_strategy": {
    "approach": "Brief description of fix approach",
    "rationale": "Why this fix is correct and minimal",
    "files_to_modify": [
      {
        "path": "src/file.ts",
        "reason": "Fix type error on line 45"
      }
    ],
    "dependencies_to_add": [],
    "dependencies_to_update": []
  },
  "implementation": {
    "description": "Detailed description of changes made",
    "test_commands": [
      "npm run typecheck",
      "npm test",
      "npm run lint"
    ],
    "expected_outcome": "All tests pass, type check succeeds"
  },
  "validation": {
    "breaking_changes": false,
    "requires_manual_review": false,
    "confidence_level": "high|medium|low",
    "notes": "Any additional context or warnings"
  }
}
```

**改善点**:
- ✅ 構造化された分析情報
- ✅ 修復理由の説明
- ✅ バリデーション項目追加
- ✅ 信頼度レベルの明示

### 4. 制約条件の明確化

#### Before
```markdown
## 制約条件

- 既存機能を壊さない
- TypeScript strict mode 準拠
- 最小限の変更で修復
- セキュリティリスクを導入しない
```

#### After
```markdown
## 🚫 Critical Constraints

### Must Follow
- **Workflow files are READ-ONLY**: Never modify `.github/workflows/**/*.yml`
- **Security first**: No credentials, no unsafe dependencies
- **Minimal changes**: Fix only what's broken
- **Type safety**: Maintain TypeScript strict mode
- **Test coverage**: Don't reduce coverage below 80%

### Prohibited Actions
- ❌ Changing workflow files
- ❌ Disabling strict mode
- ❌ Skipping tests with `.skip` or `.only`
- ❌ Adding `@ts-ignore` or `@ts-nocheck`
- ❌ Using `any` type unnecessarily
- ❌ Installing unlisted dependencies without justification
```

**改善点**:
- ✅ 必須事項と禁止事項を明確に分離
- ✅ 具体的な禁止行為をリスト化
- ✅ 視覚的にわかりやすい

## プロンプト構造

最適化後のプロンプトは以下の構造を持ちます：

```
1. ロール定義
   "You are an expert DevOps engineer..."

2. コンテキスト情報
   - Project Profile
   - Current Failure

3. エラー分析
   - Failed Jobs and Steps
   - Workflow Configuration

4. ミッション (3-Step Process)
   - Step 1: Root Cause Analysis
   - Step 2: Fix Strategy Determination
   - Step 3: Generate Minimal Fix

5. 制約条件
   - Must Follow
   - Prohibited Actions

6. 出力フォーマット
   - JSON Schema

7. Few-Shot Examples
   - Example 1: Type Error
   - Example 2: Dependency Missing
   - Example 3: Test Failure

8. 実行指示
   "Begin Auto-Repair"
```

## Few-Shot Examples

### Example 1: TypeScript Type Error

**シナリオ**: `Property 'score' does not exist on type 'AnalysisResult'`

**対処法**:
- インターフェースに `score` プロパティを追加
- 最小限の変更（1行追加）
- 破壊的変更なし

**信頼度**: High

### Example 2: Dependency Missing

**シナリオ**: `Cannot find module '@types/node'`

**対処法**:
- `@types/node` を devDependencies に追加
- 標準的なパッケージなのでリスク低
- 破壊的変更なし

**信頼度**: High

### Example 3: Test Failure

**シナリオ**: `Expected: 80, Received: 75`

**対処法**:
- テストの期待値を更新
- ただし手動レビュー必要
- 実装が正しいか確認が必要

**信頼度**: Medium

## 効果測定

### 期待される改善

1. **修復精度の向上**
   - 明確な手順により一貫性のある分析
   - エラータイプ別の対処法により適切な修復
   - Few-shot examples により学習効果

2. **出力の一貫性**
   - 厳密な JSON フォーマット
   - 必須フィールドの強制
   - バリデーション情報の追加

3. **安全性の向上**
   - 明確な制約条件
   - 禁止事項のリスト化
   - 信頼度レベルの明示

### 測定指標

以下の指標で効果を測定：

1. **修復成功率**
   - テスト通過率
   - 自動マージ成功率

2. **出力品質**
   - JSON パースエラー率
   - 必須フィールド欠落率

3. **安全性**
   - 破壊的変更の発生率
   - 手動レビュー要求率

## まとめ

### 主な改善点

| 項目 | Before | After |
|------|--------|-------|
| プロンプト長 | ~50行 | ~300行 |
| エラータイプ分類 | なし | 5種類 |
| Few-shot examples | 0件 | 3件 |
| 出力フォーマット | 簡易JSON | 構造化JSON |
| 制約条件 | 4項目 | 10項目 |
| コンテキスト情報 | 最小限 | 詳細 |

### 期待される効果

- ✅ 修復精度の向上（一貫性のある分析）
- ✅ 出力の標準化（JSON Schema準拠）
- ✅ 安全性の向上（明確な制約）
- ✅ メンテナンス性の向上（構造化された設計）

---

📘 [README に戻る](./README.md) | 🏗️ [アーキテクチャ](./ARCHITECTURE.md)
