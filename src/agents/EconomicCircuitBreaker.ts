import 'dotenv/config';

/**
 * API 使用状況
 */
export interface ApiUsage {
  requestCount: number;
  totalCost: number;
  windowStart: Date;
  windowEnd: Date;
}

/**
 * サーキットブレーカー設定
 */
export interface CircuitBreakerConfig {
  maxCostPerHour: number;        // 1時間あたりの最大コスト (USD)
  maxRequestsPerHour: number;    // 1時間あたりの最大リクエスト数
  cooldownMinutes: number;       // サーキットブレーク後のクールダウン時間 (分)
  warningThreshold: number;      // 警告しきい値 (0.0 - 1.0)
}

/**
 * サーキットブレーカー状態
 */
export enum CircuitState {
  CLOSED = 'CLOSED',       // 正常動作
  OPEN = 'OPEN',           // 遮断中
  HALF_OPEN = 'HALF_OPEN'  // テスト中
}

/**
 * API リクエスト記録
 */
interface RequestRecord {
  timestamp: Date;
  cost: number;
  model: string;
  tokens: number;
}

/**
 * EconomicCircuitBreaker - API コスト監視とレート制限
 *
 * Anthropic API の使用量を監視し、設定されたしきい値を超えた場合に
 * 自動的にサーキットブレークを実行する
 *
 * 機能:
 * - 1時間単位のコスト監視
 * - リクエスト数制限
 * - 自動サーキットブレーク
 * - 警告通知
 * - クールダウン管理
 */
export class EconomicCircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState;
  private requestHistory: RequestRecord[];
  private circuitOpenedAt: Date | null;

  /**
   * デフォルト設定
   */
  private static readonly DEFAULT_CONFIG: CircuitBreakerConfig = {
    maxCostPerHour: 10.0,           // $10/hour
    maxRequestsPerHour: 100,        // 100 requests/hour
    cooldownMinutes: 15,            // 15分のクールダウン
    warningThreshold: 0.8           // 80%で警告
  };

  /**
   * Anthropic API 価格表 (USD per 1M tokens)
   * https://www.anthropic.com/pricing
   */
  private static readonly PRICING = {
    'claude-sonnet-4-20250514': {
      input: 3.0,    // $3 per 1M input tokens
      output: 15.0   // $15 per 1M output tokens
    },
    'claude-3-5-sonnet-20241022': {
      input: 3.0,
      output: 15.0
    },
    'claude-3-opus-20240229': {
      input: 15.0,
      output: 75.0
    }
  };

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      ...EconomicCircuitBreaker.DEFAULT_CONFIG,
      ...config
    };
    this.state = CircuitState.CLOSED;
    this.requestHistory = [];
    this.circuitOpenedAt = null;

    // 環境変数からの設定上書き
    if (process.env.MAX_COST_PER_HOUR) {
      this.config.maxCostPerHour = parseFloat(process.env.MAX_COST_PER_HOUR);
    }
    if (process.env.MAX_REQUESTS_PER_HOUR) {
      this.config.maxRequestsPerHour = parseInt(process.env.MAX_REQUESTS_PER_HOUR, 10);
    }
  }

  /**
   * リクエスト前のチェック
   *
   * @returns リクエスト可能かどうか
   * @throws Error サーキットブレーク中の場合
   */
  async checkBeforeRequest(): Promise<boolean> {
    // サーキット状態の更新
    this.updateCircuitState();

    if (this.state === CircuitState.OPEN) {
      const timeRemaining = this.getTimeUntilCooldownEnd();
      throw new Error(
        `Circuit breaker is OPEN. API requests are blocked. ` +
        `Time remaining: ${Math.ceil(timeRemaining / 60000)} minutes`
      );
    }

    // 現在の使用状況を取得
    const usage = this.getCurrentUsage();

    // コスト制限チェック
    const costRatio = usage.totalCost / this.config.maxCostPerHour;
    if (costRatio >= 1.0) {
      this.openCircuit();
      throw new Error(
        `Cost limit exceeded: $${usage.totalCost.toFixed(2)} / $${this.config.maxCostPerHour} per hour`
      );
    }

    // リクエスト数制限チェック
    const requestRatio = usage.requestCount / this.config.maxRequestsPerHour;
    if (requestRatio >= 1.0) {
      this.openCircuit();
      throw new Error(
        `Request limit exceeded: ${usage.requestCount} / ${this.config.maxRequestsPerHour} per hour`
      );
    }

    // 警告しきい値チェック
    if (costRatio >= this.config.warningThreshold || requestRatio >= this.config.warningThreshold) {
      console.warn(
        `⚠️ Warning: Approaching limits - ` +
        `Cost: ${(costRatio * 100).toFixed(1)}%, ` +
        `Requests: ${(requestRatio * 100).toFixed(1)}%`
      );
    }

    return true;
  }

  /**
   * リクエスト後の記録
   *
   * @param model - 使用したモデル名
   * @param inputTokens - 入力トークン数
   * @param outputTokens - 出力トークン数
   */
  recordRequest(model: string, inputTokens: number, outputTokens: number): void {
    const cost = this.calculateCost(model, inputTokens, outputTokens);

    const record: RequestRecord = {
      timestamp: new Date(),
      cost,
      model,
      tokens: inputTokens + outputTokens
    };

    this.requestHistory.push(record);

    // 古い記録を削除 (1時間以上前)
    this.cleanupOldRecords();

    console.log(
      `📊 API Usage: Model=${model}, Tokens=${inputTokens + outputTokens}, Cost=$${cost.toFixed(4)}`
    );
  }

  /**
   * コスト計算
   *
   * @param model - モデル名
   * @param inputTokens - 入力トークン数
   * @param outputTokens - 出力トークン数
   * @returns コスト (USD)
   */
  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = EconomicCircuitBreaker.PRICING[model as keyof typeof EconomicCircuitBreaker.PRICING];

    if (!pricing) {
      console.warn(`⚠️ Unknown model: ${model}. Using Claude Sonnet 4 pricing.`);
      return this.calculateCost('claude-sonnet-4-20250514', inputTokens, outputTokens);
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
  }

  /**
   * 現在の使用状況を取得
   *
   * @returns 1時間以内の使用状況
   */
  getCurrentUsage(): ApiUsage {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentRecords = this.requestHistory.filter(
      record => record.timestamp >= oneHourAgo
    );

    const totalCost = recentRecords.reduce((sum, record) => sum + record.cost, 0);
    const requestCount = recentRecords.length;

    return {
      requestCount,
      totalCost,
      windowStart: oneHourAgo,
      windowEnd: now
    };
  }

  /**
   * サーキット状態を更新
   */
  private updateCircuitState(): void {
    if (this.state === CircuitState.OPEN && this.circuitOpenedAt) {
      const timeSinceOpen = Date.now() - this.circuitOpenedAt.getTime();
      const cooldownMs = this.config.cooldownMinutes * 60 * 1000;

      if (timeSinceOpen >= cooldownMs) {
        console.log('🔄 Circuit breaker transitioning to HALF_OPEN');
        this.state = CircuitState.HALF_OPEN;
      }
    }

    // HALF_OPEN 状態で成功したリクエストがあれば CLOSED に戻す
    if (this.state === CircuitState.HALF_OPEN) {
      const usage = this.getCurrentUsage();
      const costRatio = usage.totalCost / this.config.maxCostPerHour;
      const requestRatio = usage.requestCount / this.config.maxRequestsPerHour;

      if (costRatio < this.config.warningThreshold && requestRatio < this.config.warningThreshold) {
        console.log('✅ Circuit breaker transitioning to CLOSED');
        this.state = CircuitState.CLOSED;
        this.circuitOpenedAt = null;
      }
    }
  }

  /**
   * サーキットを開く (遮断)
   */
  private openCircuit(): void {
    console.error('🚨 Circuit breaker OPEN - API requests blocked');
    this.state = CircuitState.OPEN;
    this.circuitOpenedAt = new Date();
  }

  /**
   * クールダウン終了までの時間を取得
   *
   * @returns ミリ秒
   */
  private getTimeUntilCooldownEnd(): number {
    if (!this.circuitOpenedAt) {
      return 0;
    }

    const cooldownMs = this.config.cooldownMinutes * 60 * 1000;
    const elapsed = Date.now() - this.circuitOpenedAt.getTime();
    return Math.max(0, cooldownMs - elapsed);
  }

  /**
   * 古い記録を削除 (1時間以上前)
   */
  private cleanupOldRecords(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.requestHistory = this.requestHistory.filter(
      record => record.timestamp >= oneHourAgo
    );
  }

  /**
   * サーキット状態を取得
   */
  getState(): CircuitState {
    this.updateCircuitState();
    return this.state;
  }

  /**
   * 設定を取得
   */
  getConfig(): CircuitBreakerConfig {
    return { ...this.config };
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): {
    usage: ApiUsage;
    state: CircuitState;
    costUtilization: number;
    requestUtilization: number;
    timeUntilReset: number;
  } {
    const usage = this.getCurrentUsage();
    const costUtilization = usage.totalCost / this.config.maxCostPerHour;
    const requestUtilization = usage.requestCount / this.config.maxRequestsPerHour;
    const timeUntilReset = this.getTimeUntilCooldownEnd();

    return {
      usage,
      state: this.getState(),
      costUtilization,
      requestUtilization,
      timeUntilReset
    };
  }

  /**
   * リセット (テスト用)
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.requestHistory = [];
    this.circuitOpenedAt = null;
  }
}
