import { Anthropic } from '@anthropic-ai/sdk';
import { Octokit } from '@octokit/rest';
import 'dotenv/config';

/**
 * コード生成リクエスト
 */
export interface CodeGenRequest {
  issueNumber: number;
  taskDescription: string;
  language: 'typescript' | 'javascript' | 'python';
  framework?: string;
  requirements: string[];
}

/**
 * コード生成結果
 */
export interface CodeGenResult {
  sourceCode: string;
  testCode: string;
  documentation: string;
  fileName: string;
  language: string;
  compilationSuccess: boolean;
  errors: string[];
}

/**
 * CodeGenAgent - AI駆動コード生成
 *
 * Claude Sonnet 4 による高品質コード生成を行う
 * TypeScript strict mode 完全対応、テスト・ドキュメント自動生成
 */
export class CodeGenAgent {
  private anthropic: Anthropic;
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const githubToken = process.env.GITHUB_TOKEN;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }
    if (!githubToken) {
      throw new Error('GITHUB_TOKEN is required');
    }

    this.anthropic = new Anthropic({ apiKey });
    this.octokit = new Octokit({ auth: githubToken });

    const repoInfo = process.env.GITHUB_REPOSITORY || 'hiromima/article-generator';
    [this.owner, this.repo] = repoInfo.split('/');
  }

  /**
   * Issue からコード生成
   *
   * @param request - コード生成リクエスト
   * @returns コード生成結果
   */
  async generateCode(request: CodeGenRequest): Promise<CodeGenResult> {
    // Issue の内容を取得
    const issue = await this.octokit.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number: request.issueNumber
    });

    const { title, body } = issue.data;

    // Claude Sonnet 4 でコード生成
    const prompt = this.buildCodeGenPrompt(title, body || '', request);
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // レスポンスからコードを抽出
    const result = this.parseCodeGenResponse(content.text, request.language);

    return result;
  }

  /**
   * コード生成プロンプトを構築
   */
  private buildCodeGenPrompt(
    title: string,
    body: string,
    request: CodeGenRequest
  ): string {
    const langConfig = this.getLanguageConfig(request.language);

    return `あなたは経験豊富なソフトウェアエンジニアです。以下の要件に基づいて、高品質なコードを生成してください。

# Issue情報
Title: ${title}
Description:
${body}

# タスク説明
${request.taskDescription}

# 技術要件
- 言語: ${request.language}
${request.framework ? `- フレームワーク: ${request.framework}` : ''}
- 要件:
${request.requirements.map(r => `  - ${r}`).join('\n')}

# コーディング規約

## ${request.language.toUpperCase()}
${langConfig.standards}

# 出力形式

以下の形式で3つのコードブロックを返してください:

\`\`\`${request.language}
// ファイル名: <ファイル名>
// 実装コード
${langConfig.example}
\`\`\`

\`\`\`${langConfig.testExtension}
// ファイル名: <ファイル名>.test.${langConfig.extension}
// テストコード
${langConfig.testExample}
\`\`\`

\`\`\`markdown
# ドキュメント

## 概要
...

## 使用方法
...

## API
...
\`\`\`

重要:
- TypeScript strict mode完全対応（型エラー0件）
- テストカバレッジ80%以上を目指す
- JSDoc/TSDocでドキュメント化
- エッジケースを考慮
- エラーハンドリング完備`;
  }

  /**
   * 言語設定を取得
   */
  private getLanguageConfig(language: string): {
    standards: string;
    example: string;
    testExample: string;
    extension: string;
    testExtension: string;
  } {
    if (language === 'typescript') {
      return {
        standards: `- strict mode必須
- 全変数・関数に型注釈
- any型禁止（unknown推奨）
- null/undefined明示的チェック
- TSDoc形式のドキュメント`,
        example: `export interface Example {
  id: string;
  name: string;
}

export class ExampleClass {
  constructor(private readonly id: string) {}

  getName(): string {
    return this.id;
  }
}`,
        testExample: `import { describe, test, expect } from '@jest/globals';
import { ExampleClass } from './example';

describe('ExampleClass', () => {
  test('getName returns id', () => {
    const example = new ExampleClass('test-id');
    expect(example.getName()).toBe('test-id');
  });
});`,
        extension: 'ts',
        testExtension: 'typescript'
      };
    }

    // デフォルトはJavaScript
    return {
      standards: `- ESLint準拠
- JSDoc形式のドキュメント
- const/let推奨（var禁止）
- アロー関数推奨`,
      example: `export class ExampleClass {
  constructor(id) {
    this.id = id;
  }

  getName() {
    return this.id;
  }
}`,
      testExample: `import { describe, test, expect } from '@jest/globals';
import { ExampleClass } from './example';

describe('ExampleClass', () => {
  test('getName returns id', () => {
    const example = new ExampleClass('test-id');
    expect(example.getName()).toBe('test-id');
  });
});`,
      extension: 'js',
      testExtension: 'javascript'
    };
  }

  /**
   * レスポンスからコードを抽出
   */
  private parseCodeGenResponse(responseText: string, language: string): CodeGenResult {
    // コードブロックを抽出
    const codeBlockRegex = /```(\w+)\n([\s\S]*?)```/g;
    const matches = [...responseText.matchAll(codeBlockRegex)];

    let sourceCode = '';
    let testCode = '';
    let documentation = '';
    let fileName = 'generated-code';

    for (const match of matches) {
      const lang = match[1].toLowerCase();
      const code = match[2];

      // ファイル名を抽出
      const fileNameMatch = code.match(/\/\/\s*ファイル名:\s*(.+)/);
      if (fileNameMatch && !fileName.includes('.')) {
        fileName = fileNameMatch[1].trim();
      }

      if (lang === language || lang === 'typescript' || lang === 'javascript') {
        if (code.includes('.test.') || code.includes('describe(')) {
          testCode = code;
        } else {
          sourceCode = code;
        }
      } else if (lang === 'markdown' || lang === 'md') {
        documentation = code;
      }
    }

    // ファイル名の拡張子確認
    if (!fileName.includes('.')) {
      const ext = language === 'typescript' ? 'ts' : 'js';
      fileName += `.${ext}`;
    }

    return {
      sourceCode,
      testCode,
      documentation,
      fileName,
      language,
      compilationSuccess: true, // 実際のコンパイルは別途実行
      errors: []
    };
  }

  /**
   * 生成されたコードをファイルに保存
   */
  async saveGeneratedCode(result: CodeGenResult, basePath: string): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    // ソースコードを保存
    if (result.sourceCode) {
      const sourcePath = path.join(basePath, result.fileName);
      await fs.writeFile(sourcePath, result.sourceCode, 'utf-8');
    }

    // テストコードを保存
    if (result.testCode) {
      const testFileName = result.fileName.replace(/\.(ts|js)$/, '.test.$1');
      const testPath = path.join(basePath, '..', 'tests', testFileName);
      await fs.mkdir(path.dirname(testPath), { recursive: true });
      await fs.writeFile(testPath, result.testCode, 'utf-8');
    }

    // ドキュメントを保存
    if (result.documentation) {
      const docFileName = result.fileName.replace(/\.(ts|js)$/, '.md');
      const docPath = path.join(basePath, '..', 'docs', docFileName);
      await fs.mkdir(path.dirname(docPath), { recursive: true });
      await fs.writeFile(docPath, result.documentation, 'utf-8');
    }
  }

  /**
   * TypeScriptコンパイルチェック
   */
  async checkCompilation(sourceCode: string): Promise<{ success: boolean; errors: string[] }> {
    // TypeScript Compiler APIを使用してコンパイルチェック
    // 簡易実装: tscコマンドを実行
    const fs = await import('fs/promises');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const tempFile = `/tmp/codegen-check-${Date.now()}.ts`;

    try {
      await fs.writeFile(tempFile, sourceCode, 'utf-8');

      const { stderr } = await execAsync(`npx tsc --noEmit --strict ${tempFile}`);

      if (stderr) {
        const errors = stderr.split('\n').filter(line => line.trim());
        return { success: false, errors };
      }

      return { success: true, errors: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, errors: [errorMessage] };
    } finally {
      // クリーンアップ
      try {
        await fs.unlink(tempFile);
      } catch {
        // ignore
      }
    }
  }

  /**
   * コード生成とコンパイルチェックを一括実行
   */
  async generateAndValidate(request: CodeGenRequest): Promise<CodeGenResult> {
    // 1. コード生成
    const result = await this.generateCode(request);

    // 2. TypeScriptの場合はコンパイルチェック
    if (request.language === 'typescript' && result.sourceCode) {
      const compilationResult = await this.checkCompilation(result.sourceCode);
      result.compilationSuccess = compilationResult.success;
      result.errors = compilationResult.errors;

      // コンパイルエラーがある場合は再生成を試みる（最大3回）
      if (!compilationResult.success) {
        console.warn('⚠️ Compilation errors detected. Attempting to fix...');

        for (let attempt = 1; attempt <= 3; attempt++) {
          const fixedResult = await this.fixCompilationErrors(result, compilationResult.errors);

          const recheck = await this.checkCompilation(fixedResult.sourceCode);
          if (recheck.success) {
            fixedResult.compilationSuccess = true;
            fixedResult.errors = [];
            return fixedResult;
          }

          result.errors = recheck.errors;
        }

        console.error('❌ Failed to fix compilation errors after 3 attempts');
      }
    }

    return result;
  }

  /**
   * コンパイルエラーを修正
   */
  private async fixCompilationErrors(
    result: CodeGenResult,
    errors: string[]
  ): Promise<CodeGenResult> {
    const prompt = `以下のTypeScriptコードにコンパイルエラーがあります。修正してください。

# 現在のコード
\`\`\`typescript
${result.sourceCode}
\`\`\`

# エラー
${errors.join('\n')}

# 修正後のコード
strict mode準拠、型エラー0件で修正してください。`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const fixedCode = this.extractCodeFromResponse(content.text);

    return {
      ...result,
      sourceCode: fixedCode
    };
  }

  /**
   * レスポンスからコードを抽出（シンプル版）
   */
  private extractCodeFromResponse(text: string): string {
    const match = text.match(/```(?:typescript|ts)\n([\s\S]*?)```/);
    return match ? match[1] : text;
  }
}
