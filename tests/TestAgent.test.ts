import { describe, test, expect, beforeEach } from '@jest/globals';
import { TestAgent } from '../src/agents/TestAgent';

describe('TestAgent', () => {
  let agent: TestAgent;

  beforeEach(() => {
    agent = new TestAgent({
      coverageEnabled: true,
      coverageThreshold: 80,
      timeout: 60000
    });
  });

  describe('初期化', () => {
    test('デフォルト設定で初期化できる', () => {
      const config = agent.getConfig();
      expect(config.coverageEnabled).toBe(true);
      expect(config.coverageThreshold).toBe(80);
      expect(config.timeout).toBe(60000);
    });

    test('カスタム設定で初期化できる', () => {
      const customAgent = new TestAgent({
        coverageEnabled: false,
        coverageThreshold: 90
      });

      const config = customAgent.getConfig();
      expect(config.coverageEnabled).toBe(false);
      expect(config.coverageThreshold).toBe(90);
    });

    test('GITHUB_TOKEN が必要', () => {
      const originalToken = process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_TOKEN;

      expect(() => new TestAgent()).toThrow('GITHUB_TOKEN is required');

      process.env.GITHUB_TOKEN = originalToken;
    });
  });

  describe('設定取得', () => {
    test('設定を取得できる', () => {
      const config = agent.getConfig();

      expect(config).toHaveProperty('coverageEnabled');
      expect(config).toHaveProperty('coverageThreshold');
      expect(config).toHaveProperty('timeout');
    });

    test('設定の変更が外部に影響しない', () => {
      const config1 = agent.getConfig();
      config1.coverageThreshold = 50;

      const config2 = agent.getConfig();
      expect(config2.coverageThreshold).toBe(80);
    });
  });

  describe('受け入れ基準', () => {
    test('TestAgent インスタンスが作成できる', () => {
      expect(agent).toBeInstanceOf(TestAgent);
    });

    test('runTests() メソッドが存在する', () => {
      expect(typeof agent.runTests).toBe('function');
    });

    test('postTestComment() メソッドが存在する', () => {
      expect(typeof agent.postTestComment).toBe('function');
    });

    test('カバレッジ80%+目標が設定可能', () => {
      const config = agent.getConfig();
      expect(config.coverageThreshold).toBeGreaterThanOrEqual(80);
    });
  });
});
