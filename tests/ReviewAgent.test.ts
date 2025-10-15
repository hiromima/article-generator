import { describe, test, expect, beforeEach } from '@jest/globals';
import { ReviewAgent } from '../src/agents/ReviewAgent';

describe('ReviewAgent', () => {
  let agent: ReviewAgent;

  beforeEach(() => {
    agent = new ReviewAgent({
      passingScore: 80,
      eslintEnabled: true,
      typescriptEnabled: true,
      securityEnabled: true
    });
  });

  describe('初期化', () => {
    test('デフォルト設定で初期化できる', () => {
      const config = agent.getConfig();
      expect(config.passingScore).toBe(80);
      expect(config.eslintEnabled).toBe(true);
      expect(config.typescriptEnabled).toBe(true);
      expect(config.securityEnabled).toBe(true);
    });

    test('カスタム設定で初期化できる', () => {
      const customAgent = new ReviewAgent({
        passingScore: 90,
        eslintEnabled: false
      });

      const config = customAgent.getConfig();
      expect(config.passingScore).toBe(90);
      expect(config.eslintEnabled).toBe(false);
    });

    test('GITHUB_TOKEN が必要', () => {
      const originalToken = process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_TOKEN;

      expect(() => new ReviewAgent()).toThrow('GITHUB_TOKEN is required');

      process.env.GITHUB_TOKEN = originalToken;
    });
  });

  describe('設定取得', () => {
    test('設定を取得できる', () => {
      const config = agent.getConfig();

      expect(config).toHaveProperty('passingScore');
      expect(config).toHaveProperty('eslintEnabled');
      expect(config).toHaveProperty('typescriptEnabled');
      expect(config).toHaveProperty('securityEnabled');
    });

    test('設定の変更が外部に影響しない', () => {
      const config1 = agent.getConfig();
      config1.passingScore = 50;

      const config2 = agent.getConfig();
      expect(config2.passingScore).toBe(80);
    });
  });

  describe('レビュー実行', () => {
    test('review() が ReviewResult を返す', async () => {
      const result = await agent.review('src/');

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('recommendations');

      expect(typeof result.passed).toBe('boolean');
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }, 60000);

    test('checks に eslint, typescript, security が含まれる', async () => {
      const result = await agent.review('src/');

      expect(result.checks).toHaveProperty('eslint');
      expect(result.checks).toHaveProperty('typescript');
      expect(result.checks).toHaveProperty('security');

      expect(result.checks.eslint).toHaveProperty('passed');
      expect(result.checks.eslint).toHaveProperty('score');
      expect(result.checks.eslint).toHaveProperty('errors');
      expect(result.checks.eslint).toHaveProperty('warnings');
    }, 60000);
  });

  describe('スコア計算', () => {
    test('スコアは 0-100 の範囲', async () => {
      const result = await agent.review('src/');

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);

      expect(result.checks.eslint.score).toBeGreaterThanOrEqual(0);
      expect(result.checks.eslint.score).toBeLessThanOrEqual(100);

      expect(result.checks.typescript.score).toBeGreaterThanOrEqual(0);
      expect(result.checks.typescript.score).toBeLessThanOrEqual(100);

      expect(result.checks.security.score).toBeGreaterThanOrEqual(0);
      expect(result.checks.security.score).toBeLessThanOrEqual(100);
    }, 60000);

    test('合計スコアは各チェックの平均', async () => {
      const result = await agent.review('src/');

      const expectedScore = Math.round(
        (result.checks.eslint.score +
         result.checks.typescript.score +
         result.checks.security.score) / 3
      );

      expect(result.score).toBe(expectedScore);
    }, 60000);
  });

  describe('合格判定', () => {
    test('80点以上で passed = true', async () => {
      const result = await agent.review('src/');

      if (result.score >= 80) {
        expect(result.passed).toBe(true);
      } else {
        expect(result.passed).toBe(false);
      }
    }, 60000);
  });

  describe('推奨事項', () => {
    test('recommendations が配列', async () => {
      const result = await agent.review('src/');

      expect(Array.isArray(result.recommendations)).toBe(true);
    }, 60000);

    test('スコアに応じた推奨事項が含まれる', async () => {
      const result = await agent.review('src/');

      expect(result.recommendations.length).toBeGreaterThan(0);

      // 最後の推奨事項はスコアに基づく
      const lastRec = result.recommendations[result.recommendations.length - 1];

      if (result.score >= 90) {
        expect(lastRec).toContain('Excellent');
      } else if (result.score >= 80) {
        expect(lastRec).toContain('Good quality');
      } else {
        expect(lastRec).toContain('below passing threshold');
      }
    }, 60000);
  });

  describe('サマリー生成', () => {
    test('サマリーに必要な情報が含まれる', async () => {
      const result = await agent.review('src/');

      expect(result.summary).toContain('Quality Score');
      expect(result.summary).toContain('ESLint');
      expect(result.summary).toContain('TypeScript');
      expect(result.summary).toContain('Security');
    }, 60000);

    test('合格時は ✅、不合格時は ❌', async () => {
      const result = await agent.review('src/');

      if (result.passed) {
        expect(result.summary).toContain('✅');
        expect(result.summary).toContain('PASSED');
      } else {
        expect(result.summary).toContain('❌');
        expect(result.summary).toContain('FAILED');
      }
    }, 60000);
  });

  describe('チェック無効化', () => {
    test('ESLint 無効化', async () => {
      const disabledAgent = new ReviewAgent({
        eslintEnabled: false,
        typescriptEnabled: true,
        securityEnabled: true
      });

      const result = await disabledAgent.review('src/');

      expect(result.checks.eslint.passed).toBe(true);
      expect(result.checks.eslint.score).toBe(100);
      expect(result.checks.eslint.details).toContain('disabled');
    }, 60000);

    test('TypeScript 無効化', async () => {
      const disabledAgent = new ReviewAgent({
        eslintEnabled: true,
        typescriptEnabled: false,
        securityEnabled: true
      });

      const result = await disabledAgent.review('src/');

      expect(result.checks.typescript.passed).toBe(true);
      expect(result.checks.typescript.score).toBe(100);
      expect(result.checks.typescript.details).toContain('disabled');
    }, 60000);

    test('Security 無効化', async () => {
      const disabledAgent = new ReviewAgent({
        eslintEnabled: true,
        typescriptEnabled: true,
        securityEnabled: false
      });

      const result = await disabledAgent.review('src/');

      expect(result.checks.security.passed).toBe(true);
      expect(result.checks.security.score).toBe(100);
      expect(result.checks.security.details).toContain('disabled');
    }, 60000);
  });

  describe('受け入れ基準', () => {
    test('ESLint チェックが実行される', async () => {
      const result = await agent.review('src/');

      expect(result.checks.eslint).toBeDefined();
      expect(result.checks.eslint.details).toBeTruthy();
    }, 60000);

    test('TypeScript strict mode チェックが実行される', async () => {
      const result = await agent.review('src/');

      expect(result.checks.typescript).toBeDefined();
      expect(result.checks.typescript.details).toBeTruthy();
    }, 60000);

    test('npm audit セキュリティスキャンが実行される', async () => {
      const result = await agent.review('src/');

      expect(result.checks.security).toBeDefined();
      expect(result.checks.security.details).toBeTruthy();
    }, 60000);

    test('品質スコア 80 点以上で自動承認', async () => {
      const result = await agent.review('src/');

      if (result.score >= 80) {
        expect(result.passed).toBe(true);
      }
    }, 60000);

    test('品質スコア 80 点未満で却下', async () => {
      const strictAgent = new ReviewAgent({
        passingScore: 100  // 不可能な基準
      });

      const result = await strictAgent.review('src/');

      if (result.score < 100) {
        expect(result.passed).toBe(false);
      }
    }, 60000);
  });
});
