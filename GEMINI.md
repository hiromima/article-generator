# Gemini CLI - Project Context

## プロジェクト概要

**article-generator** - Miyabi Framework v5.0 で構築された自律型開発プロジェクト

GitHub を OS として扱い、記事生成から投稿までを完全自動化する AI Agents システム。

## 技術スタック

### 言語・ランタイム
- **Node.js 20+**
- **TypeScript 5.7+** (strict mode 必須)
- **ESM** (type: "module")

### AI/ML
- **Google Gemini API** (無料枠利用)
- ~~Anthropic Claude Sonnet 4~~ (廃止)

### GitHub 統合
- @octokit/rest ^21.0.2
- @octokit/graphql ^8.1.1
- gh CLI

### テスト
- Jest ^30.2.0
- ts-jest ^29.4.5
- カバレッジ目標: 80%+

## コーディング規約

### TypeScript strict mode
```typescript
// ✅ Good
const value: string | undefined = getValue();
const result = value ?? 'default';

// ❌ Bad
const value = getValue(); // implicit any
const result = value || 'default'; // type unsafe
```

### エラーハンドリング
```typescript
// ✅ Good
try {
  await operation();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Operation failed:', message);
}

// ❌ Bad
try {
  await operation();
} catch (e) {
  console.error(e); // any type
}
```

### 未使用変数の削除
```typescript
// ✅ Good
const { stdout } = await execAsync(command);

// ❌ Bad
const { stdout, stderr } = await execAsync(command); // stderr unused
```

## プロジェクト構造

```
article-generator/
├── src/
│   └── agents/          # 自律型 Agent 実装
│       ├── CoordinatorAgent.ts
│       ├── CodeGenAgent.ts
│       ├── ReviewAgent.ts
│       ├── TestAgent.ts
│       ├── PRAgent.ts
│       ├── DeploymentAgent.ts
│       └── EconomicCircuitBreaker.ts
├── tests/               # Jest テストコード
├── scripts/             # CLI ツール
├── .github/workflows/   # GitHub Actions ワークフロー
└── .ai/                 # Agent 実行結果 (JSON)
```

## Miyabi Framework ラベル体系

### タスクラベル
- **type**: bug, feature, refactor, docs, test, chore, security
- **priority**: P0-Critical, P1-High, P2-Medium, P3-Low
- **state**: pending, analyzing, implementing, reviewing, testing, deploying, done
- **agent**: coordinator, codegen, review, pr, test, deployment
- **complexity**: small, medium, large, xlarge
- **effort**: 1h, 4h, 1d, 3d, 1w, 2w

## Agent の役割

### 1. CoordinatorAgent
- Issue を DAG (Directed Acyclic Graph) で分解
- Wave ベース並列実行計画を生成
- Critical Path を特定
- 50%+ 効率化目標

### 2. CodeGenAgent
- TypeScript strict mode 完全対応
- テストコード自動生成
- JSDoc コメント必須
- 既存パターンに準拠

### 3. ReviewAgent
- ESLint 静的解析
- TypeScript strict mode チェック
- npm audit セキュリティスキャン
- 品質スコア 80+ で承認

### 4. TestAgent
- Jest テスト実行
- カバレッジレポート生成 (80%+ 必須)
- 失敗テスト詳細レポート

### 5. PRAgent
- Draft PR 自動作成
- Conventional Commits 準拠
- AI による PR 説明文生成
- Issue 自動リンク

### 6. DeploymentAgent
- Firebase 自動デプロイ
- ヘルスチェック (5回リトライ)
- 失敗時の自動ロールバック

### 7. EconomicCircuitBreaker
- API コスト監視 (1時間スライディングウィンドウ)
- サーキットブレーカー (CLOSED → OPEN → HALF_OPEN)
- 80% 警告、100% でブロック

## コード生成ガイドライン

### 新しい Agent を作成する場合

1. **ファイル構成**
   - `src/agents/NewAgent.ts` - Agent 実装
   - `tests/NewAgent.test.ts` - テストコード
   - `scripts/new-cli.ts` - CLI ツール

2. **Agent クラス構造**
```typescript
import { Octokit } from '@octokit/rest';
import 'dotenv/config';

export interface NewAgentConfig {
  // 設定オプション
}

export interface NewAgentResult {
  success: boolean;
  // 結果フィールド
}

/**
 * NewAgent - 簡潔な説明
 *
 * 機能:
 * - 機能1
 * - 機能2
 */
export class NewAgent {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private config: Required<NewAgentConfig>;

  constructor(config: NewAgentConfig = {}) {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error('GITHUB_TOKEN is required');
    }

    this.octokit = new Octokit({ auth: githubToken });

    const repoInfo = process.env.GITHUB_REPOSITORY || 'hiromima/article-generator';
    [this.owner, this.repo] = repoInfo.split('/');

    this.config = {
      // デフォルト値設定
      ...config
    };
  }

  /**
   * メイン処理
   */
  async execute(): Promise<NewAgentResult> {
    // 実装
  }
}
```

3. **テストコード**
```typescript
import { describe, test, expect } from '@jest/globals';
import { NewAgent } from '../src/agents/NewAgent';

describe('NewAgent', () => {
  describe('初期化', () => {
    test('NewAgent インスタンスが作成できる', () => {
      const agent = new NewAgent();
      expect(agent).toBeInstanceOf(NewAgent);
    });

    test('GITHUB_TOKEN が必要', () => {
      const original = process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_TOKEN;
      expect(() => new NewAgent()).toThrow('GITHUB_TOKEN is required');
      process.env.GITHUB_TOKEN = original;
    });
  });

  describe('受け入れ基準', () => {
    test('機能が実装されている', () => {
      const agent = new NewAgent();
      expect(typeof agent.execute).toBe('function');
    });
  });
});
```

4. **CLI ツール**
```typescript
#!/usr/bin/env tsx
import { NewAgent } from '../src/agents/NewAgent';

async function main() {
  const args = process.argv.slice(2);

  console.log('🤖 NewAgent - Description');
  console.log('');

  try {
    const agent = new NewAgent();
    const result = await agent.execute();

    console.log('✅ Success');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
```

## 品質チェックリスト

- [ ] TypeScript strict mode: 0 エラー (`npm run typecheck`)
- [ ] ESLint: 0 エラー (`npm run lint`)
- [ ] テストカバレッジ: 80%+ (`npm run test:coverage`)
- [ ] JSDoc コメント: 全関数に記述
- [ ] エラーハンドリング: 適切な try-catch
- [ ] 環境変数検証: 起動時にチェック

## Conventional Commits

```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードフォーマット
refactor: リファクタリング
test: テスト追加
chore: ビルド・ツール変更
perf: パフォーマンス改善
ci: CI/CD 変更

例:
feat(agents): Add KnowledgeAgent for learning system
fix(review): Handle undefined coverage result
docs: Update README with Gemini integration
```

## 重要な注意事項

1. **AI プロバイダー**: Gemini API のみ使用 (Anthropic は廃止)
2. **課金回避**: ANTHROPIC_API_KEY は使用しない
3. **型安全性**: TypeScript strict mode 厳守
4. **テスト**: 80%+ カバレッジ必須
5. **エラー処理**: 全ての async 関数に try-catch

---

🤖 **Gemini CLI**: このファイルの情報を参考に、プロジェクトに最適なコードを生成してください。
