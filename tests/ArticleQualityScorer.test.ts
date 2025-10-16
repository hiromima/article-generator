import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  ArticleQualityScorer
} from '../src/agents/ArticleQualityScorer';

describe('ArticleQualityScorer', () => {
  let scorer: ArticleQualityScorer;

  beforeEach(() => {
    scorer = new ArticleQualityScorer(80);
  });

  describe('初期化', () => {
    test('ArticleQualityScorer インスタンスが作成できる', () => {
      expect(scorer).toBeInstanceOf(ArticleQualityScorer);
    });

    test('カスタム閾値で初期化できる', () => {
      const customScorer = new ArticleQualityScorer(90);
      expect(customScorer).toBeInstanceOf(ArticleQualityScorer);
    });
  });

  describe('構造評価', () => {
    test('適切な見出し階層の記事は高スコアを獲得', async () => {
      const content = `# メインタイトル

## セクション1

段落1の内容です。これは十分な長さの段落です。

## セクション2

段落2の内容です。

### サブセクション2-1

段落3の内容です。

## セクション3

段落4の内容です。

## セクション4

段落5の内容です。
`;

      const score = await scorer.evaluateArticle(content, []);
      expect(score.structure.score).toBeGreaterThan(70);
      expect(score.structure.details.h1Count).toBe(1);
      expect(score.structure.details.h2Count).toBeGreaterThanOrEqual(3);
    });

    test('見出しが不足している記事は低スコア', async () => {
      const content = `# タイトル

段落のみの内容です。
`;

      const score = await scorer.evaluateArticle(content, []);
      expect(score.structure.score).toBeLessThan(70);
      expect(score.structure.details.h2Count).toBeLessThan(3);
    });

    test('適切な段落長の記事は高評価', async () => {
      const content = `# タイトル

## セクション1

${'これは適切な長さの段落です。'.repeat(10)}

## セクション2

${'これも適切な長さの段落です。'.repeat(10)}

## セクション3

${'さらに適切な長さの段落です。'.repeat(10)}
`;

      const score = await scorer.evaluateArticle(content, []);
      expect(score.structure.paragraphLength).toBeGreaterThan(70);
    });

    test('リスト使用が適切な記事は高評価', async () => {
      const content = `# タイトル

## セクション1

段落です。

- リスト項目1
- リスト項目2
- リスト項目3

## セクション2

別の段落です。

- 別のリスト項目1
- 別のリスト項目2
`;

      const score = await scorer.evaluateArticle(content, []);
      expect(score.structure.listUsage).toBeGreaterThan(0);
      expect(score.structure.details.listCount).toBeGreaterThanOrEqual(2);
    });

    test('コードブロックを含む記事は高評価', async () => {
      const content = `# タイトル

## セクション1

\`\`\`typescript
const example = 'code';
\`\`\`

## セクション2

\`\`\`javascript
const another = 'example';
\`\`\`

## セクション3

\`\`\`python
example = "code"
\`\`\`
`;

      const score = await scorer.evaluateArticle(content, []);
      expect(score.structure.codeBlockUsage).toBeGreaterThan(90);
      expect(score.structure.details.codeBlockCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('コンテンツ評価', () => {
    test('十分な文字数の記事は高スコア', async () => {
      const longContent = `# タイトル

## セクション1

${'これは十分な長さの段落です。'.repeat(100)}

## セクション2

${'これも十分な長さの段落です。'.repeat(100)}

## セクション3

${'さらに十分な長さの段落です。'.repeat(100)}
`;

      const score = await scorer.evaluateArticle(longContent, []);
      expect(score.content.wordCount).toBeGreaterThanOrEqual(90);
      expect(score.content.details.totalWords).toBeGreaterThan(2000);
    });

    test('短い記事は低スコア', async () => {
      const shortContent = `# タイトル

短い段落です。
`;

      const score = await scorer.evaluateArticle(shortContent, []);
      expect(score.content.wordCount).toBeLessThan(50);
      expect(score.content.details.totalWords).toBeLessThan(500);
    });

    test('適切な可読性の記事は高評価', async () => {
      const content = `# タイトル

## セクション1

これは適切な長さの文です。読みやすさを重視しています。短すぎず長すぎない文章を心がけています。

## セクション2

別の適切な長さの文です。こちらも読みやすさを重視しています。バランスの取れた文章構成です。

## セクション3

さらに適切な長さの文です。一貫性のある文章スタイルを保っています。
`;

      const score = await scorer.evaluateArticle(content, []);
      expect(score.content.readability).toBeGreaterThan(70);
    });

    test('文が長すぎる記事は可読性スコアが低下', async () => {
      const longSentence = 'これは'.repeat(200);
      const content = `# タイトル

## セクション

${longSentence}非常に長い文です。
`;

      const score = await scorer.evaluateArticle(content, []);
      expect(score.content.readability).toBeLessThan(70);
    });
  });

  describe('SEO評価', () => {
    test('キーワード密度が適切な記事は高スコア', async () => {
      const content = `# TypeScript Best Practices

## Introduction to TypeScript

TypeScript is a powerful programming language. This article covers TypeScript best practices.

## TypeScript Features

TypeScript provides type safety and modern JavaScript features.

## Conclusion

TypeScript helps developers write better code.
`;

      const score = await scorer.evaluateArticle(content, ['typescript', 'best practices']);
      expect(score.seo.keywordDensity).toBeGreaterThan(70);
    });

    test('キーワードが過剰な記事はスコアが低下', async () => {
      const content = `# TypeScript

TypeScript TypeScript TypeScript TypeScript TypeScript TypeScript TypeScript TypeScript TypeScript TypeScript
`;

      const score = await scorer.evaluateArticle(content, ['typescript']);
      expect(score.seo.keywordDensity).toBeLessThan(100);
    });

    test('メタディスクリプションを含む記事は高評価', async () => {
      const content = `# タイトル

> この記事では、TypeScriptのベストプラクティスについて解説します。型安全性とモダンなJavaScript機能を活用して、より良いコードを書く方法を学びます。

## セクション1

内容です。
`;

      const score = await scorer.evaluateArticle(content, []);
      expect(score.seo.metaDescription).toBeGreaterThan(80);
    });

    test('内部リンクを含む記事は高評価', async () => {
      const content = `# タイトル

## セクション1

詳細は[こちら](/article/detail)をご覧ください。

## セクション2

関連記事: [記事A](/article/a)、[記事B](/article/b)

## セクション3

参考: [記事C](/article/c)
`;

      const score = await scorer.evaluateArticle(content, []);
      expect(score.seo.internalLinks).toBeGreaterThan(70);
      expect(score.seo.details.internalLinkCount).toBeGreaterThanOrEqual(3);
    });

    test('外部リンクも検出される', async () => {
      const content = `# タイトル

## セクション

参考: [外部サイト](https://example.com)
`;

      const score = await scorer.evaluateArticle(content, []);
      expect(score.links.details.externalLinks).toBeGreaterThanOrEqual(1);
    });
  });

  describe('リンク評価', () => {
    test('リンクを含む記事はリンクスコアを持つ', async () => {
      const content = `# タイトル

## セクション

[リンク1](https://example.com)
[リンク2](/internal/page)
`;

      const score = await scorer.evaluateArticle(content, []);
      expect(score.links).toBeDefined();
      expect(score.links.details.totalLinks).toBeGreaterThanOrEqual(2);
    });

    test('リンクがない記事はリンクスコアが低い', async () => {
      const content = `# タイトル

## セクション

リンクのない内容です。
`;

      const score = await scorer.evaluateArticle(content, []);
      expect(score.links.details.totalLinks).toBe(0);
    });
  });

  describe('総合評価', () => {
    test('高品質な記事は総合スコア80以上を獲得', async () => {
      const highQualityContent = `# TypeScript Best Practices: Complete Guide

> This comprehensive guide covers TypeScript best practices, helping you write better, more maintainable code with type safety.

## Introduction to TypeScript

TypeScript is a powerful superset of JavaScript that adds static typing to the language. In this article, we'll explore best practices for TypeScript development.

## Type Safety and Strict Mode

TypeScript's type system helps catch errors at compile time. Here are some best practices:

- Use strict mode for maximum type safety
- Avoid using \`any\` type whenever possible
- Leverage union types and type guards

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

function getUser(id: number): User | null {
  // Implementation
  return null;
}
\`\`\`

## Modern JavaScript Features

TypeScript supports all modern JavaScript features while adding type safety:

- Async/await for asynchronous operations
- Destructuring for cleaner code
- Optional chaining and nullish coalescing

\`\`\`typescript
const user = await getUser(1);
const email = user?.email ?? 'unknown';
\`\`\`

## Code Organization

Organize your TypeScript code for maintainability:

- Use modules and namespaces appropriately
- Follow consistent naming conventions
- Separate concerns with clear interfaces

For more details, see our [advanced TypeScript guide](/guides/advanced-typescript).

## Testing TypeScript Code

Testing is crucial for TypeScript projects:

\`\`\`typescript
import { describe, test, expect } from '@jest/globals';

describe('User', () => {
  test('should create user', () => {
    const user = createUser('John');
    expect(user.name).toBe('John');
  });
});
\`\`\`

## Conclusion

TypeScript best practices help you write better code. By following these guidelines, you can leverage TypeScript's full potential and create robust applications.

Additional resources: [TypeScript documentation](https://www.typescriptlang.org), [our TypeScript tutorials](/tutorials/typescript).
`;

      const score = await scorer.evaluateArticle(highQualityContent, ['typescript', 'best practices']);

      expect(score.overall).toBeGreaterThanOrEqual(80);
      expect(score.passed).toBe(true);
      expect(score.structure.score).toBeGreaterThan(70);
      expect(score.content.score).toBeGreaterThan(70);
      expect(score.seo.score).toBeGreaterThan(70);
    });

    test('低品質な記事は総合スコア80未満', async () => {
      const lowQualityContent = `# タイトル

短い内容です。
`;

      const score = await scorer.evaluateArticle(lowQualityContent, []);

      expect(score.overall).toBeLessThan(80);
      expect(score.passed).toBe(false);
    });

    test('総合スコアは4軸の平均値', async () => {
      const content = `# テスト記事

## セクション1

内容です。
`;

      const score = await scorer.evaluateArticle(content, []);

      const calculatedAverage = Math.round(
        (score.structure.score + score.content.score + score.seo.score + score.links.score) / 4
      );

      expect(score.overall).toBe(calculatedAverage);
    });
  });

  describe('フィードバック生成', () => {
    test('低品質な記事には改善提案が含まれる', async () => {
      const lowQualityContent = `# タイトル

短い内容です。
`;

      const score = await scorer.evaluateArticle(lowQualityContent, []);

      expect(score.feedback).toBeDefined();
      expect(score.feedback.length).toBeGreaterThan(0);
      expect(score.passed).toBe(false);
    });

    test('高品質な記事にはフィードバックが少ない', async () => {
      const highQualityContent = `# Comprehensive Article Title

> This article provides detailed information on the topic with proper structure and content.

## Section 1: Introduction

${'This is a well-written paragraph with sufficient length and detail. '.repeat(20)}

## Section 2: Main Content

${'Another well-structured paragraph with good content quality. '.repeat(20)}

Here's a helpful list:

- Point 1 with detailed explanation
- Point 2 with examples
- Point 3 with best practices

\`\`\`typescript
// Example code block
const example = 'well documented';
\`\`\`

## Section 3: Advanced Topics

${'More detailed content covering advanced aspects of the topic. '.repeat(20)}

\`\`\`typescript
// Another code example
function example() {
  return 'implementation';
}
\`\`\`

## Section 4: Best Practices

- Best practice 1
- Best practice 2
- Best practice 3

## Conclusion

${'A comprehensive conclusion summarizing the key points. '.repeat(10)}

For more information, see [related article](/related) and [documentation](/docs).
`;

      const score = await scorer.evaluateArticle(highQualityContent, ['article', 'content']);

      expect(score.feedback).toBeDefined();
      expect(score.passed).toBe(true);
    });

    test('見出し不足のフィードバック', async () => {
      const content = `# タイトル

${'内容です。'.repeat(100)}
`;

      const score = await scorer.evaluateArticle(content, []);

      const hasFeedback = score.feedback.some(f => f.includes('見出し'));
      expect(hasFeedback).toBe(true);
    });

    test('文字数不足のフィードバック', async () => {
      const shortContent = `# タイトル

## セクション1

短い内容。

## セクション2

これも短い。
`;

      const score = await scorer.evaluateArticle(shortContent, []);

      const hasFeedback = score.feedback.some(f => f.includes('文字数'));
      expect(hasFeedback).toBe(true);
    });
  });

  describe('受け入れ基準', () => {
    test('4軸評価が正しく機能する', async () => {
      const content = `# テスト

## セクション

内容です。
`;

      const score = await scorer.evaluateArticle(content, []);

      expect(score.structure).toBeDefined();
      expect(score.content).toBeDefined();
      expect(score.seo).toBeDefined();
      expect(score.links).toBeDefined();

      expect(typeof score.structure.score).toBe('number');
      expect(typeof score.content.score).toBe('number');
      expect(typeof score.seo.score).toBe('number');
      expect(typeof score.links.score).toBe('number');
    });

    test('閾値判定が正しく機能する', async () => {
      const customScorer = new ArticleQualityScorer(90);

      const content = `# 普通の記事

## セクション1

${'内容です。'.repeat(50)}

## セクション2

${'さらに内容です。'.repeat(50)}
`;

      const score = await customScorer.evaluateArticle(content, []);

      expect(score.threshold).toBe(90);

      if (score.overall >= 90) {
        expect(score.passed).toBe(true);
      } else {
        expect(score.passed).toBe(false);
      }
    });

    test('タイムスタンプが生成される', async () => {
      const content = `# テスト

内容です。
`;

      const before = new Date();
      const score = await scorer.evaluateArticle(content, []);
      const after = new Date();

      expect(score.timestamp).toBeInstanceOf(Date);
      expect(score.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(score.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
