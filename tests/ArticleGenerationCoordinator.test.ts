import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  ArticleGenerationCoordinator,
  ArticleAgentType,
  type ArticleGenerationInput
} from '../src/agents/ArticleGenerationCoordinator';

describe('ArticleGenerationCoordinator', () => {
  let coordinator: ArticleGenerationCoordinator;

  beforeEach(() => {
    coordinator = new ArticleGenerationCoordinator();
  });

  describe('初期化', () => {
    test('ArticleGenerationCoordinator インスタンスが作成できる', () => {
      expect(coordinator).toBeInstanceOf(ArticleGenerationCoordinator);
    });
  });

  describe('DAG分解', () => {
    test('記事生成タスクをDAG分解できる', async () => {
      const input: ArticleGenerationInput = {
        theme: 'Test Article',
        category: 'tech',
        targetLength: 2000
      };

      const result = await coordinator.analyzeArticleGenerationTasks(input);

      expect(result).toBeDefined();
      expect(result.totalTasks).toBe(8); // C0-C7
      expect(result.waves.length).toBeGreaterThan(0);
    });

    test('並列実行効率が計算される', async () => {
      const input: ArticleGenerationInput = {
        theme: 'Test Article'
      };

      const result = await coordinator.analyzeArticleGenerationTasks(input);

      expect(result.parallelEfficiency).toBeGreaterThan(0);
      expect(result.parallelEfficiency).toBeLessThanOrEqual(100);
    });

    test('Critical Pathが特定される', async () => {
      const input: ArticleGenerationInput = {
        theme: 'Test Article'
      };

      const result = await coordinator.analyzeArticleGenerationTasks(input);

      expect(result.criticalPath).toBeDefined();
      expect(result.criticalPath.length).toBeGreaterThan(0);
    });
  });

  describe('記事生成', () => {
    test('記事が生成される', async () => {
      const input: ArticleGenerationInput = {
        theme: 'TypeScript Best Practices',
        category: 'tech',
        targetLength: 2000,
        keywords: ['typescript', 'best practices', 'development']
      };

      const result = await coordinator.generateArticle(input);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.metadata).toBeDefined();
    }, 30000); // 30秒タイムアウト

    test('メタデータが正しく生成される', async () => {
      const input: ArticleGenerationInput = {
        theme: 'Test Article'
      };

      const result = await coordinator.generateArticle(input);

      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.metadata.qualityScore).toBeLessThanOrEqual(100);
      expect(result.metadata.seoScore).toBeGreaterThanOrEqual(0);
      expect(result.metadata.seoScore).toBeLessThanOrEqual(100);
      expect(result.metadata.readingTime).toBeGreaterThan(0);
      expect(result.metadata.generatedAt).toBeInstanceOf(Date);
    }, 30000);

    test('実行時間が記録される', async () => {
      const input: ArticleGenerationInput = {
        theme: 'Test Article'
      };

      const result = await coordinator.generateArticle(input);

      expect(result.executionTime).toBeGreaterThan(0);
    }, 30000);

    test('全エージェントの結果が記録される', async () => {
      const input: ArticleGenerationInput = {
        theme: 'Test Article'
      };

      const result = await coordinator.generateArticle(input);

      // C0-C7 の8つのエージェント
      expect(result.agentResults.size).toBe(8);

      // 各エージェントの結果を確認
      expect(result.agentResults.has(ArticleAgentType.InfoGathering)).toBe(true);
      expect(result.agentResults.has(ArticleAgentType.Structuring)).toBe(true);
      expect(result.agentResults.has(ArticleAgentType.Analysis)).toBe(true);
      expect(result.agentResults.has(ArticleAgentType.Optimization)).toBe(true);
      expect(result.agentResults.has(ArticleAgentType.SEO)).toBe(true);
      expect(result.agentResults.has(ArticleAgentType.Instruction)).toBe(true);
      expect(result.agentResults.has(ArticleAgentType.Writing)).toBe(true);
      expect(result.agentResults.has(ArticleAgentType.QualityControl)).toBe(true);
    }, 30000);
  });

  describe('並列実行最適化', () => {
    test('Wave 1 で3つのエージェントが並列実行される', async () => {
      const input: ArticleGenerationInput = {
        theme: 'Test Article'
      };

      const dagResult = await coordinator.analyzeArticleGenerationTasks(input);

      // Wave 1: C0, C1, C2 が並列実行可能
      expect(dagResult.waves[0].length).toBe(3);
      expect(dagResult.waves[0]).toContain(ArticleAgentType.InfoGathering);
      expect(dagResult.waves[0]).toContain(ArticleAgentType.Structuring);
      expect(dagResult.waves[0]).toContain(ArticleAgentType.Analysis);
    });

    test('Wave 2 で2つのエージェントが並列実行される', async () => {
      const input: ArticleGenerationInput = {
        theme: 'Test Article'
      };

      const dagResult = await coordinator.analyzeArticleGenerationTasks(input);

      // Wave 2: C3, C4 が並列実行可能
      expect(dagResult.waves[1].length).toBe(2);
      expect(dagResult.waves[1]).toContain(ArticleAgentType.Optimization);
      expect(dagResult.waves[1]).toContain(ArticleAgentType.SEO);
    });

    test('並列実行により実行時間が短縮される', async () => {
      const input: ArticleGenerationInput = {
        theme: 'Test Article'
      };

      const result = await coordinator.generateArticle(input);

      // 順次実行: 3+3+3+2+2+2+5+2 = 22秒
      // 並列実行: max(3,3,3) + max(2,2) + 2 + 5 + 2 = 14秒
      // 期待: 約14秒（シミュレーション）

      // 実行時間が20秒以内であることを確認（並列実行の効果）
      expect(result.executionTime).toBeLessThan(20000);
    }, 30000);
  });

  describe('エラーハンドリング', () => {
    test('空のテーマでも実行できる', async () => {
      const input: ArticleGenerationInput = {
        theme: ''
      };

      const result = await coordinator.generateArticle(input);
      expect(result).toBeDefined();
    }, 30000);

    test('カテゴリなしでも実行できる', async () => {
      const input: ArticleGenerationInput = {
        theme: 'Test Article'
      };

      const result = await coordinator.generateArticle(input);
      expect(result).toBeDefined();
    }, 30000);
  });

  describe('受け入れ基準', () => {
    test('CoordinatorAgent によるDAG分解が成功する', async () => {
      const input: ArticleGenerationInput = {
        theme: 'Test Article'
      };

      const result = await coordinator.analyzeArticleGenerationTasks(input);
      expect(result.totalTasks).toBe(8);
      expect(result.waves.length).toBeGreaterThan(0);
    });

    test('並列実行による高速化が実現される', async () => {
      const input: ArticleGenerationInput = {
        theme: 'Test Article'
      };

      const result = await coordinator.generateArticle(input);

      // 並列実行により20秒以内で完了することを確認
      expect(result.executionTime).toBeLessThan(20000);
    }, 30000);

    test('全エージェント統合テストが合格する', async () => {
      const input: ArticleGenerationInput = {
        theme: 'Test Article'
      };

      const result = await coordinator.generateArticle(input);

      // 全エージェントが正常に実行されたことを確認
      expect(result.agentResults.size).toBe(8);

      // 全エージェントが成功していることを確認
      for (const [_agentType, agentResult] of result.agentResults) {
        expect(agentResult.success).toBe(true);
      }
    }, 30000);
  });
});
