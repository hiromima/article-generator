import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { EconomicCircuitBreaker, CircuitState } from '../src/agents/EconomicCircuitBreaker';

describe('EconomicCircuitBreaker', () => {
  let breaker: EconomicCircuitBreaker;

  beforeEach(() => {
    // テスト用の厳しい制限で初期化
    breaker = new EconomicCircuitBreaker({
      maxCostPerHour: 1.0,       // $1/hour
      maxRequestsPerHour: 10,    // 10 requests/hour
      cooldownMinutes: 1,        // 1分のクールダウン
      warningThreshold: 0.8      // 80%で警告
    });
  });

  describe('初期状態', () => {
    test('初期状態はCLOSED', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    test('設定が正しく適用される', () => {
      const config = breaker.getConfig();
      expect(config.maxCostPerHour).toBe(1.0);
      expect(config.maxRequestsPerHour).toBe(10);
      expect(config.cooldownMinutes).toBe(1);
      expect(config.warningThreshold).toBe(0.8);
    });

    test('初期使用状況は0', () => {
      const usage = breaker.getCurrentUsage();
      expect(usage.requestCount).toBe(0);
      expect(usage.totalCost).toBe(0);
    });
  });

  describe('リクエスト記録', () => {
    test('リクエストが正しく記録される', () => {
      breaker.recordRequest('claude-sonnet-4-20250514', 1000, 500);

      const usage = breaker.getCurrentUsage();
      expect(usage.requestCount).toBe(1);
      expect(usage.totalCost).toBeGreaterThan(0);
    });

    test('複数リクエストの記録', () => {
      breaker.recordRequest('claude-sonnet-4-20250514', 1000, 500);
      breaker.recordRequest('claude-sonnet-4-20250514', 2000, 1000);
      breaker.recordRequest('claude-sonnet-4-20250514', 1500, 750);

      const usage = breaker.getCurrentUsage();
      expect(usage.requestCount).toBe(3);
    });

    test('コスト計算が正しい', () => {
      // Claude Sonnet 4: input $3/1M, output $15/1M
      // 1000 input tokens = $0.003
      // 500 output tokens = $0.0075
      // Total = $0.0105
      breaker.recordRequest('claude-sonnet-4-20250514', 1000, 500);

      const usage = breaker.getCurrentUsage();
      expect(usage.totalCost).toBeCloseTo(0.0105, 4);
    });
  });

  describe('リクエスト前チェック', () => {
    test('通常時はリクエスト可能', async () => {
      const result = await breaker.checkBeforeRequest();
      expect(result).toBe(true);
    });

    test('コスト制限超過時にエラー', async () => {
      // $1制限に対して、大量トークンで超過させる
      // 100,000 input + 50,000 output = $0.3 + $0.75 = $1.05
      breaker.recordRequest('claude-sonnet-4-20250514', 100_000, 50_000);

      await expect(breaker.checkBeforeRequest()).rejects.toThrow('Cost limit exceeded');
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    test('リクエスト数制限超過時にエラー', async () => {
      // 10リクエスト制限を超過
      for (let i = 0; i < 10; i++) {
        breaker.recordRequest('claude-sonnet-4-20250514', 100, 50);
      }

      await expect(breaker.checkBeforeRequest()).rejects.toThrow('Request limit exceeded');
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    test('警告しきい値でログ出力', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // 80%しきい値に達する (8リクエスト)
      for (let i = 0; i < 8; i++) {
        breaker.recordRequest('claude-sonnet-4-20250514', 100, 50);
      }

      await breaker.checkBeforeRequest();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Warning: Approaching limits')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('サーキット状態遷移', () => {
    test('CLOSED → OPEN 遷移', async () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      // コスト制限超過
      breaker.recordRequest('claude-sonnet-4-20250514', 100_000, 50_000);

      await expect(breaker.checkBeforeRequest()).rejects.toThrow();
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    test('OPEN 状態ではリクエストブロック', async () => {
      // サーキットを開く
      breaker.recordRequest('claude-sonnet-4-20250514', 100_000, 50_000);
      await expect(breaker.checkBeforeRequest()).rejects.toThrow();

      // ブロックされることを確認
      await expect(breaker.checkBeforeRequest()).rejects.toThrow('Circuit breaker is OPEN');
    });

    test('OPEN → HALF_OPEN 遷移 (クールダウン後)', async () => {
      // サーキットを開く
      breaker.recordRequest('claude-sonnet-4-20250514', 100_000, 50_000);
      await expect(breaker.checkBeforeRequest()).rejects.toThrow();
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // 1分待機をシミュレート
      jest.useFakeTimers();
      jest.advanceTimersByTime(61 * 1000); // 61秒

      // HALF_OPEN に遷移
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      jest.useRealTimers();
    });

    test('HALF_OPEN → CLOSED 遷移 (使用率低下)', async () => {
      // サーキットを開く
      breaker.recordRequest('claude-sonnet-4-20250514', 100_000, 50_000);
      await expect(breaker.checkBeforeRequest()).rejects.toThrow();

      // クールダウン待機
      jest.useFakeTimers();
      jest.advanceTimersByTime(61 * 1000);

      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

      // 1時間経過で履歴がクリアされる
      jest.advanceTimersByTime(60 * 60 * 1000);

      // リセットして CLOSED に戻る
      breaker.reset();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      jest.useRealTimers();
    });
  });

  describe('統計情報', () => {
    test('統計情報が正しく取得できる', () => {
      breaker.recordRequest('claude-sonnet-4-20250514', 1000, 500);
      breaker.recordRequest('claude-sonnet-4-20250514', 2000, 1000);

      const stats = breaker.getStatistics();

      expect(stats.usage.requestCount).toBe(2);
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.costUtilization).toBeGreaterThan(0);
      expect(stats.costUtilization).toBeLessThan(1);
      expect(stats.requestUtilization).toBe(0.2); // 2/10
    });

    test('コスト利用率が正しく計算される', () => {
      // $1制限に対して$0.0105のコスト
      breaker.recordRequest('claude-sonnet-4-20250514', 1000, 500);

      const stats = breaker.getStatistics();
      expect(stats.costUtilization).toBeCloseTo(0.0105, 4);
    });

    test('リクエスト利用率が正しく計算される', () => {
      // 10リクエスト制限に対して5リクエスト
      for (let i = 0; i < 5; i++) {
        breaker.recordRequest('claude-sonnet-4-20250514', 100, 50);
      }

      const stats = breaker.getStatistics();
      expect(stats.requestUtilization).toBe(0.5); // 5/10
    });
  });

  describe('リセット機能', () => {
    test('リセットで初期状態に戻る', async () => {
      // サーキットを開く
      breaker.recordRequest('claude-sonnet-4-20250514', 100_000, 50_000);
      await expect(breaker.checkBeforeRequest()).rejects.toThrow();
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      // リセット
      breaker.reset();

      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.getCurrentUsage().requestCount).toBe(0);
      expect(breaker.getCurrentUsage().totalCost).toBe(0);
    });
  });

  describe('モデル別価格', () => {
    test('Claude Sonnet 4 の価格', () => {
      breaker.recordRequest('claude-sonnet-4-20250514', 1_000_000, 1_000_000);
      const usage = breaker.getCurrentUsage();
      // $3 (input) + $15 (output) = $18
      expect(usage.totalCost).toBeCloseTo(18.0, 2);
    });

    test('Claude Opus の価格', () => {
      breaker.recordRequest('claude-3-opus-20240229', 1_000_000, 1_000_000);
      const usage = breaker.getCurrentUsage();
      // $15 (input) + $75 (output) = $90
      expect(usage.totalCost).toBeCloseTo(90.0, 2);
    });

    test('未知のモデルは Sonnet 4 価格を使用', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      breaker.recordRequest('unknown-model', 1_000_000, 1_000_000);
      const usage = breaker.getCurrentUsage();

      expect(usage.totalCost).toBeCloseTo(18.0, 2);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown model')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('受け入れ基準', () => {
    test('API コスト上限設定が機能する', async () => {
      const strictBreaker = new EconomicCircuitBreaker({
        maxCostPerHour: 0.5,
        maxRequestsPerHour: 100,
        cooldownMinutes: 1,
        warningThreshold: 0.8
      });

      // $0.5制限を超えるリクエスト
      strictBreaker.recordRequest('claude-sonnet-4-20250514', 50_000, 25_000);

      await expect(strictBreaker.checkBeforeRequest()).rejects.toThrow('Cost limit exceeded');
    });

    test('リクエストレート制限が機能する', async () => {
      const strictBreaker = new EconomicCircuitBreaker({
        maxCostPerHour: 10.0,
        maxRequestsPerHour: 5,
        cooldownMinutes: 1,
        warningThreshold: 0.8
      });

      // 5リクエスト制限を超える
      for (let i = 0; i < 5; i++) {
        strictBreaker.recordRequest('claude-sonnet-4-20250514', 100, 50);
      }

      await expect(strictBreaker.checkBeforeRequest()).rejects.toThrow('Request limit exceeded');
    });

    test('自動サーキットブレークが機能する', async () => {
      // 制限超過でサーキットが開く
      breaker.recordRequest('claude-sonnet-4-20250514', 100_000, 50_000);
      await expect(breaker.checkBeforeRequest()).rejects.toThrow();

      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    test('1時間監視が機能する', () => {
      jest.useFakeTimers();

      // 現在時刻のリクエスト
      breaker.recordRequest('claude-sonnet-4-20250514', 1000, 500);
      expect(breaker.getCurrentUsage().requestCount).toBe(1);

      // 1時間後
      jest.advanceTimersByTime(61 * 60 * 1000);

      // 古いリクエストは除外される
      expect(breaker.getCurrentUsage().requestCount).toBe(0);

      jest.useRealTimers();
    });
  });
});
