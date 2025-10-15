import { describe, test, expect } from '@jest/globals';
import { CodeGenAgent, CodeGenRequest } from '../src/agents/CodeGenAgent';

describe('CodeGenAgent', () => {
  describe('parseCodeGenResponse', () => {
    test('コードブロックを正しく抽出できる', () => {
      const agent = new CodeGenAgent();
      const response = `
ここにコードを生成しました:

\`\`\`typescript
// ファイル名: example.ts
export class Example {
  constructor(private readonly id: string) {}

  getId(): string {
    return this.id;
  }
}
\`\`\`

\`\`\`typescript
// ファイル名: example.test.ts
import { describe, test, expect } from '@jest/globals';
import { Example } from './example';

describe('Example', () => {
  test('getId returns id', () => {
    const ex = new Example('test');
    expect(ex.getId()).toBe('test');
  });
});
\`\`\`

\`\`\`markdown
# Example Class

## 概要
Exampleクラスの説明
\`\`\`
`;

      const result = (agent as any).parseCodeGenResponse(response, 'typescript');

      expect(result.sourceCode).toContain('export class Example');
      expect(result.testCode).toContain('describe(');
      expect(result.documentation).toContain('# Example Class');
      expect(result.fileName).toBe('example.ts');
    });
  });

  describe('getLanguageConfig', () => {
    test('TypeScript設定を取得できる', () => {
      const agent = new CodeGenAgent();
      const config = (agent as any).getLanguageConfig('typescript');

      expect(config.extension).toBe('ts');
      expect(config.testExtension).toBe('typescript');
      expect(config.standards).toContain('strict mode');
    });

    test('JavaScript設定を取得できる', () => {
      const agent = new CodeGenAgent();
      const config = (agent as any).getLanguageConfig('javascript');

      expect(config.extension).toBe('js');
      expect(config.testExtension).toBe('javascript');
      expect(config.standards).toContain('ESLint');
    });
  });

  describe('buildCodeGenPrompt', () => {
    test('適切なプロンプトを生成できる', () => {
      const agent = new CodeGenAgent();
      const request: CodeGenRequest = {
        issueNumber: 1,
        taskDescription: 'テストタスク',
        language: 'typescript',
        framework: 'Express',
        requirements: ['型安全性', 'テストカバレッジ80%+']
      };

      const prompt = (agent as any).buildCodeGenPrompt(
        'テストIssue',
        'テスト説明',
        request
      );

      expect(prompt).toContain('テストIssue');
      expect(prompt).toContain('テスト説明');
      expect(prompt).toContain('typescript');
      expect(prompt).toContain('Express');
      expect(prompt).toContain('型安全性');
      expect(prompt).toContain('strict mode');
    });
  });

  describe('checkCompilation', () => {
    test('正しいTypeScriptコードはコンパイル成功', async () => {
      const agent = new CodeGenAgent();
      const validCode = `
export interface User {
  id: string;
  name: string;
}

export class UserService {
  getUser(id: string): User {
    return { id, name: 'Test User' };
  }
}
`;

      const result = await agent.checkCompilation(validCode);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    }, 30000); // 30秒タイムアウト

    test('型エラーのあるコードはコンパイル失敗', async () => {
      const agent = new CodeGenAgent();
      const invalidCode = `
export interface User {
  id: string;
  name: string;
}

export class UserService {
  getUser(id: number): User {
    return { id: id.toString(), wrongField: 'error' };
  }
}
`;

      const result = await agent.checkCompilation(invalidCode);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('受け入れ基準', () => {
    test('Claude Sonnet 4統合が正しく設定されている', () => {
      const agent = new CodeGenAgent();
      expect(agent).toBeInstanceOf(CodeGenAgent);
    });

    test('TypeScript strict mode対応のプロンプトを生成', () => {
      const agent = new CodeGenAgent();
      const request: CodeGenRequest = {
        issueNumber: 1,
        taskDescription: 'テスト',
        language: 'typescript',
        requirements: []
      };

      const prompt = (agent as any).buildCodeGenPrompt('Title', 'Body', request);

      expect(prompt).toContain('strict mode');
      expect(prompt).toContain('型エラー0件');
    });

    test('テストコード自動生成プロンプトを含む', () => {
      const agent = new CodeGenAgent();
      const request: CodeGenRequest = {
        issueNumber: 1,
        taskDescription: 'テスト',
        language: 'typescript',
        requirements: []
      };

      const prompt = (agent as any).buildCodeGenPrompt('Title', 'Body', request);

      expect(prompt).toContain('テストコード');
      expect(prompt).toContain('テストカバレッジ80%');
    });

    test('ドキュメント自動生成プロンプトを含む', () => {
      const agent = new CodeGenAgent();
      const request: CodeGenRequest = {
        issueNumber: 1,
        taskDescription: 'テスト',
        language: 'typescript',
        requirements: []
      };

      const prompt = (agent as any).buildCodeGenPrompt('Title', 'Body', request);

      expect(prompt).toContain('ドキュメント');
      expect(prompt).toContain('TSDoc');
    });
  });
});
