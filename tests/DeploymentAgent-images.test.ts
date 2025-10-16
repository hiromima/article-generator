import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { DeploymentAgent, type GeneratedImage } from '../src/agents/DeploymentAgent';

// Mock @octokit/rest to avoid ESM issues
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    issues: {
      createComment: jest.fn()
    },
    rest: {}
  }))
}));

describe('DeploymentAgent - Image Generation', () => {
  let agent: DeploymentAgent;

  beforeEach(() => {
    // GOOGLE_API_KEY が必要
    if (!process.env.GOOGLE_API_KEY) {
      process.env.GOOGLE_API_KEY = 'test-api-key';
    }

    agent = new DeploymentAgent({
      notePostingEnabled: true
    });
  });

  describe('画像生成機能', () => {
    test('generateArticleImages でアイキャッチ+セクション画像が生成される', async () => {
      const articleContent = `# テスト記事

## セクション1

これはセクション1の内容です。テストのための十分な長さのコンテンツです。

## セクション2

これはセクション2の内容です。さらにテストのための十分な長さのコンテンツです。

## セクション3

これはセクション3の内容です。最後のセクションのコンテンツです。
`;

      const title = 'テスト記事タイトル';

      const images = await agent.generateArticleImages(articleContent, title);

      // アイキャッチ + 3セクション = 4画像
      expect(images).toHaveLength(4);

      // 最初の画像はアイキャッチ
      expect(images[0].type).toBe('eyecatch');
      expect(images[0].prompt).toContain(title);

      // 残りはセクション画像
      expect(images[1].type).toBe('section');
      expect(images[1].sectionIndex).toBe(0);

      expect(images[2].type).toBe('section');
      expect(images[2].sectionIndex).toBe(1);

      expect(images[3].type).toBe('section');
      expect(images[3].sectionIndex).toBe(2);
    }, 40000); // Increase timeout for API calls

    test('画像生成時間が記録される', async () => {
      const articleContent = `# テスト記事

## セクション

内容です。
`;

      const images = await agent.generateArticleImages(articleContent, 'テスト');

      images.forEach(img => {
        expect(img.generationTime).toBeGreaterThan(0);
      });
    }, 30000);

    test('セクションがない記事の場合はアイキャッチのみ生成される', async () => {
      const articleContent = `# テスト記事

これはセクションのない記事です。
`;

      const images = await agent.generateArticleImages(articleContent, 'テスト');

      expect(images).toHaveLength(1);
      expect(images[0].type).toBe('eyecatch');
    }, 30000);
  });

  describe('note.com投稿統合', () => {
    test('postToNote で画像生成が自動実行される', async () => {
      const articleContent = `# テスト記事

## セクション1

内容です。

## セクション2

さらに内容です。
`;

      const result = await agent.postToNote(articleContent, 'テスト記事');

      // 画像が生成されている
      expect(result.generatedImages).toBeDefined();
      expect(result.generatedImages).toHaveLength(3); // アイキャッチ + 2セクション
      // 画像生成成功として扱う
      expect(result.success).toBe(true);
    }, 40000);

    test('postToNote に画像を指定した場合は再生成されない', async () => {
      const articleContent = `# テスト記事

## セクション

内容です。
`;

      const preGeneratedImages: GeneratedImage[] = [
        {
          type: 'eyecatch',
          prompt: 'Test prompt',
          generationTime: 1000,
          success: true
        }
      ];

      const result = await agent.postToNote(articleContent, 'テスト', preGeneratedImages);

      // 指定した画像がそのまま使用される
      expect(result.generatedImages).toEqual(preGeneratedImages);
      // 画像生成成功として扱う
      expect(result.success).toBe(true);
    }, 30000);
  });

  describe('ヘルパーメソッド', () => {
    test('extractSections で見出しからセクションが抽出される', async () => {
      const articleContent = `# タイトル

イントロ

## セクション1

セクション1の内容

## セクション2

セクション2の内容

## セクション3

セクション3の内容
`;

      // private メソッドのテストのため、画像生成経由で確認
      const images = await agent.generateArticleImages(articleContent, 'テスト');

      // アイキャッチ + 3セクション
      expect(images).toHaveLength(4);

      const sectionImages = images.filter(img => img.type === 'section');
      expect(sectionImages).toHaveLength(3);
    }, 40000);

    test('summarizeArticle で記事要約が取得される', async () => {
      const articleContent = `# タイトル

これは記事の最初の段落です。この段落は要約として使用されます。十分な長さがあることを確認します。この段落は要約生成のために50文字以上必要です。

## セクション

以降の内容。
`;

      const images = await agent.generateArticleImages(articleContent, 'テスト');

      // アイキャッチ画像のプロンプトに要約が含まれる
      const eyecatchImage = images.find(img => img.type === 'eyecatch');
      expect(eyecatchImage).toBeDefined();
      // 要約が使用されているか、または "Article summary not available" でないことを確認
      expect(eyecatchImage!.prompt).not.toContain('Article summary not available');
    }, 30000);
  });

  describe('エラーハンドリング', () => {
    test('notePostingEnabled が false の場合はエラーを返す', async () => {
      const agentDisabled = new DeploymentAgent({
        notePostingEnabled: false
      });

      const result = await agentDisabled.postToNote('# テスト', 'テスト');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not enabled');
    });

    test('空の記事でも画像生成は実行される', async () => {
      const result = await agent.postToNote('# タイトル\n\n記事本文。', '空の記事');

      expect(result.generatedImages).toBeDefined();
      // アイキャッチのみ
      expect(result.generatedImages).toHaveLength(1);
      // 画像生成成功として扱う
      expect(result.success).toBe(true);
    }, 30000);
  });

  describe('受け入れ基準', () => {
    test('画像生成プロンプトが適切に生成される', async () => {
      const articleContent = `# TypeScript Best Practices

TypeScriptを使った開発のベストプラクティスを解説します。

## 型安全性

TypeScriptの型システムについて。

## モダンな機能

最新のTypeScript機能について。
`;

      const images = await agent.generateArticleImages(articleContent, 'TypeScript Best Practices');

      // アイキャッチ画像のプロンプト
      const eyecatch = images[0];
      expect(eyecatch.prompt).toContain('TypeScript Best Practices');
      expect(eyecatch.prompt).toContain('professional');

      // セクション画像のプロンプト
      const sectionImages = images.filter(img => img.type === 'section');
      expect(sectionImages[0].prompt).toContain('型安全性');
      expect(sectionImages[1].prompt).toContain('モダンな機能');
    }, 30000); // Increase timeout for API calls

    test('画像生成はGemini 2.5 Flash Image APIで成功する', async () => {
      const images = await agent.generateArticleImages('# テスト\n\nテスト記事の内容です。', 'テスト');

      // Gemini 2.5 Flash Image API で画像生成が成功
      images.forEach(img => {
        expect(img.success).toBe(true);
        expect(img.base64Data).toBeDefined();
        expect(img.base64Data).toBeTruthy();
      });
    }, 30000); // Increase timeout for API calls
  });
});
