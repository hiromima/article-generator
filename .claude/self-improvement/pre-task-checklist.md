# タスク実行前チェックリスト

**目的**: タスク実行前にこのチェックリストを必ず実行し、過去の失敗を繰り返さない

**使用タイミング**: ユーザーからタスクを受け取った直後、実装を開始する前

---

## 📋 チェックリスト

### Phase 1: 調査（Documentation）

#### ✅ 公式ドキュメントの確認
- [ ] 関連する公式ドキュメントを特定した
- [ ] README を最初から最後まで読んだ
- [ ] 使用例（Examples）を確認した
- [ ] FAQ を確認した

**理由**: F003, F004 を防ぐため
**失敗例**:
- GitHub Action のバージョンを推測（@v1 → 実際は @v0.1.13）
- パラメータ名を推測（command → 正しくは prompt）

#### ✅ バージョン・リリース確認
- [ ] 最新バージョンを確認した
- [ ] リリースページを確認した
- [ ] 変更履歴（CHANGELOG）を確認した
- [ ] 破壊的変更（Breaking Changes）がないか確認した

**GitHub Action の場合**:
```bash
# リリースページを確認
https://github.com/{org}/{repo}/releases

# 最新タグを使用
uses: {org}/{repo}@{latest-version}
```

#### ✅ 必須パラメータの確認
- [ ] 必須パラメータをすべてリストアップした
- [ ] オプションパラメータを確認した
- [ ] デフォルト値を確認した
- [ ] パラメータの型を確認した

**チェック方法**:
```markdown
README から以下を抽出:
- Required inputs: [リスト]
- Optional inputs: [リスト]
- Parameter types: [型情報]
```

---

### Phase 2: コスト分析（Cost Analysis）

#### ✅ API コスト影響の分析
- [ ] 使用する API の料金体系を確認した
- [ ] 月額想定コストを計算した
- [ ] 無料枠の制限を確認した
- [ ] 無料の代替案を調査した

**理由**: F002 を防ぐため
**失敗例**: Anthropic API（有料）を説明なく使用 → 課金リスク

**必須アクション**:
```markdown
## API コスト分析

**プロバイダー**: {provider}
**料金体系**: {pricing}
**月額想定**: {estimated-monthly-cost}

**無料枠**: {free-tier-details}

**無料の代替案**:
1. {alternative-1}: {free-tier-info}
2. {alternative-2}: {free-tier-info}

**推奨**: {recommendation}
```

#### ✅ GitHub Actions の確認
- [ ] リポジトリの visibility を確認した（Public/Private）
- [ ] 無料枠を確認した（Public: 無制限、Private: 2,000分/月）
- [ ] spending limit を確認した
- [ ] 過去の usage を確認した

**理由**: F006, F007 を防ぐため
**失敗例**:
- Private リポジトリで spending limit = $0 → Actions 実行不可
- spending limit の仕組みを誤解

**確認コマンド**:
```bash
# リポジトリ情報を確認
gh repo view {owner}/{repo} --json isPrivate,visibility

# Actions の usage を確認
# Settings → Billing → Usage で確認
```

---

### Phase 3: セキュリティ（Security）

#### ✅ センシティブ情報の取り扱い
- [ ] API キー、トークン、パスワード等が必要か確認した
- [ ] 安全な設定方法を準備した
- [ ] ユーザーへの警告メッセージを準備した
- [ ] GitHub Secrets の使用方法を説明できる

**理由**: F001, F005 を防ぐため（最重要）
**失敗例**: API キーをチャットで受け取ってしまった

**必須アクション**:
```markdown
⚠️ {SENSITIVE_INFO_TYPE} の設定が必要です。

**重要**: このチャットには貼り付けないでください。
会話履歴は削除できず、永久に記録されます。

**安全な設定方法**:

### 方法1: ターミナル（推奨）
```bash
cd {project-path}
gh secret set {SECRET_NAME}
# プロンプトで入力（画面に表示されません）
```

### 方法2: Web UI
1. ブラウザで {secret-settings-url} を開く
2. "New repository secret" をクリック
3. Name: {SECRET_NAME}
4. Value: （{SENSITIVE_INFO_TYPE}を貼り付け）
5. "Add secret" をクリック

設定が完了したら「完了」とだけ教えてください。
```

#### ✅ センシティブ情報の検出
ユーザー入力を受け取る前に、以下のパターンをチェック:

- Google API Key: `[A][I]za[A-Za-z0-9_-]{35}` （難読化）
- GitHub PAT: `[g][h][p]_[A-Za-z0-9]{36}` （難読化）
- Anthropic Key: `[s][k]-ant-[A-Za-z0-9-]{40,}` （難読化）
- OpenAI Key: `[s][k]-proj[A-Za-z0-9]{43}` （難読化）

**検出時のアクション**: 即座に拒否し、安全な設定方法を提示

詳細: `sensitive-info-guard.md` を参照

---

### Phase 4: 実装計画（Implementation Plan）

#### ✅ 段階的実装の計画
- [ ] 最小限の実装（MVP）を定義した
- [ ] 実装ステップを分解した（1つずつテスト可能に）
- [ ] 各ステップの成功条件を定義した
- [ ] 並行実装を避け、順次実装を計画した

**理由**: F008 を防ぐため
**失敗例**: 7つのワークフローを同時作成 → 全てに同じ問題

**推奨アプローチ**:
```markdown
1. **Step 1**: 最小限の実装（1つだけ）
   - 成功条件: {criteria}
   - テスト方法: {test-method}

2. **Step 2**: Step 1 のテスト
   - 期待結果: {expected-result}
   - 実際の結果: {to-be-filled}

3. **Step 3**: 問題がなければ残りに展開
   - 適用対象: {remaining-items}
```

#### ✅ テスト計画の作成
- [ ] 各ステップのテスト方法を定義した
- [ ] 成功の判定基準を明確にした
- [ ] エラー時の対処方法を準備した
- [ ] ロールバック方法を準備した

---

### Phase 5: コミュニケーション（Communication）

#### ✅ ユーザーの意図確認
- [ ] タスクの目的を理解した
- [ ] 期待される結果を確認した
- [ ] 制約条件を確認した（予算、期限、品質等）
- [ ] 不明点を質問した

**テンプレート**:
```markdown
以下の理解で正しいですか？

**目的**: {purpose}

**実装内容**:
1. {step-1}
2. {step-2}
3. {step-3}

**期待される結果**: {expected-outcome}

**コスト影響**: {cost-impact}

**所要時間**: 約{estimated-time}

よろしければ「はい」、修正が必要なら詳細を教えてください。
```

#### ✅ 進捗報告の計画
- [ ] 定期的な進捗報告のタイミングを決定した
- [ ] 報告内容のフォーマットを準備した
- [ ] エラー発生時の報告方法を準備した

**報告フォーマット**:
```markdown
📊 進捗状況

[{completed-steps}/{total-steps}] {current-step}

ステータス: {in_progress|blocked|completed}

{errors があれば}
⚠️ エラー:
- {error-1}
{/errors}

次のアクション: {next-action}
```

---

## 🎯 チェックリスト実行結果

### 実行日時
- [ ] {timestamp}

### 実行結果
- [ ] Phase 1: 調査 - ✅ / ❌
- [ ] Phase 2: コスト分析 - ✅ / ❌
- [ ] Phase 3: セキュリティ - ✅ / ❌
- [ ] Phase 4: 実装計画 - ✅ / ❌
- [ ] Phase 5: コミュニケーション - ✅ / ❌

### 総合判定
- [ ] **すべてクリア** → 実装開始可能
- [ ] **未クリア項目あり** → クリアしてから開始

---

## 📝 実行ログ

### 今回のタスク
**タスク**: {task-description}

**チェックリスト結果**:
```json
{
  "phase1_documentation": {
    "status": "pass|fail",
    "notes": ""
  },
  "phase2_cost": {
    "status": "pass|fail",
    "notes": ""
  },
  "phase3_security": {
    "status": "pass|fail",
    "notes": ""
  },
  "phase4_implementation": {
    "status": "pass|fail",
    "notes": ""
  },
  "phase5_communication": {
    "status": "pass|fail",
    "notes": ""
  },
  "overall": "pass|fail"
}
```

**実装開始時刻**: {timestamp}

---

## 🔄 継続的改善

このチェックリストは、新しい失敗が記録されるたびに更新されます。

**最終更新**: 2025-10-15
**バージョン**: 1.0.0
**次回レビュー**: 新しい失敗発生時
