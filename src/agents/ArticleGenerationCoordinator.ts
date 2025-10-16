import { CoordinatorAgent, TaskNode, DAGResult } from './CoordinatorAgent';
import { ReviewAgent } from './ReviewAgent';
import type { ArticleQualityScore } from './ArticleQualityScorer';

/**
 * 記事生成タスクの種類
 */
export enum ArticleAgentType {
  InfoGathering = 'C0_InfoGathering',    // C0: 情報収集
  Structuring = 'C1_Structuring',        // C1: 構造化
  Analysis = 'C2_Analysis',              // C2: 分析
  Optimization = 'C3_Optimization',      // C3: 最適化
  SEO = 'C4_SEO',                        // C4: SEO戦略
  Instruction = 'C5_Instruction',        // C5: 指示生成
  Writing = 'C6_Writing',                // C6: 執筆
  QualityControl = 'C7_QualityControl'   // C7: 品質管理
}

/**
 * 記事生成エージェント入力
 */
export interface ArticleGenerationInput {
  theme: string;                // 記事テーマ
  category?: string;            // カテゴリ（tech/design/business）
  targetLength?: number;        // 目標文字数
  keywords?: string[];          // SEOキーワード
  customInstructions?: string;  // カスタム指示
}

/**
 * 記事生成エージェント出力
 */
export interface ArticleGenerationOutput {
  content: string;              // 生成された記事（Markdown）
  title: string;                // 記事タイトル
  metadata: ArticleMetadata;    // メタデータ
  executionTime: number;        // 実行時間（ms）
  agentResults: Map<ArticleAgentType, AgentResult>;  // 各エージェントの結果
}

/**
 * 記事メタデータ
 */
export interface ArticleMetadata {
  wordCount: number;            // 文字数
  keywords: string[];           // 抽出されたキーワード
  seoScore: number;             // SEOスコア（0-100）
  qualityScore: number;         // 品質スコア（0-100）
  readingTime: number;          // 読了時間（分）
  generatedAt: Date;            // 生成日時
  qualityDetails?: ArticleQualityScore;  // 品質評価詳細（C7実行時のみ）
}

/**
 * エージェント実行結果
 */
export interface AgentResult {
  success: boolean;
  data: unknown;
  executionTime: number;
  error?: string;
}

/**
 * ArticleGenerationCoordinator
 *
 * 記事生成エージェント（C0-C7）を CoordinatorAgent で統合し、
 * 並列実行による高速化を実現する
 *
 * 実行フロー:
 * 1. CoordinatorAgent でタスクをDAG分解
 * 2. 並列実行可能なエージェントを特定
 * 3. Wave ベースで実行
 * 4. 品質チェック（ReviewAgent連携）
 *
 * 目標: 50%高速化（40秒 → 20秒）
 */
export class ArticleGenerationCoordinator {
  private coordinatorAgent: CoordinatorAgent;
  private reviewAgent: ReviewAgent;

  constructor() {
    this.coordinatorAgent = new CoordinatorAgent({
      issueNumber: 0  // ダミー
    });
    this.reviewAgent = new ReviewAgent({
      passingScore: 80  // 80点以上で自動承認
    });
  }

  /**
   * 記事生成タスクをDAG分解
   *
   * @param input - 記事生成入力
   * @returns DAG分解結果
   */
  async analyzeArticleGenerationTasks(input: ArticleGenerationInput): Promise<DAGResult> {
    console.log('🔍 Analyzing article generation tasks...');
    console.log(`Theme: ${input.theme}`);
    console.log('');

    // 記事生成タスクのDAGを構築
    const tasks = this.buildArticleGenerationDAG(input);

    // CoordinatorAgent でタスク分解
    const result = await this.coordinatorAgent.analyzeDAG(tasks);

    console.log(`✅ DAG analysis complete: ${result.totalTasks} tasks in ${result.waves.length} waves`);
    console.log(`⚡ Parallel efficiency: ${result.parallelEfficiency.toFixed(1)}%`);
    console.log('');

    return result;
  }

  /**
   * 記事生成タスクのDAGを構築
   *
   * @param input - 記事生成入力
   * @returns タスクノード配列
   */
  private buildArticleGenerationDAG(_input: ArticleGenerationInput): TaskNode[] {
    // C0-C7 エージェントのDAG構造
    //
    // Wave 1 (並列):
    //   C0: 情報収集
    //   C1: 構造化
    //   C2: 分析
    //
    // Wave 2 (並列):
    //   C3: 最適化 (依存: C0, C1, C2)
    //   C4: SEO (依存: C0, C1, C2)
    //
    // Wave 3 (順次):
    //   C5: 指示生成 (依存: C3, C4)
    //
    // Wave 4 (順次):
    //   C6: 執筆 (依存: C5)
    //
    // Wave 5 (順次):
    //   C7: 品質管理 (依存: C6)

    const tasks: TaskNode[] = [
      {
        id: ArticleAgentType.InfoGathering,
        description: '情報収集',
        dependencies: [],
        estimatedTime: 3,
        complexity: 'medium'
      },
      {
        id: ArticleAgentType.Structuring,
        description: '構造化',
        dependencies: [],
        estimatedTime: 3,
        complexity: 'medium'
      },
      {
        id: ArticleAgentType.Analysis,
        description: '分析',
        dependencies: [],
        estimatedTime: 3,
        complexity: 'medium'
      },
      {
        id: ArticleAgentType.Optimization,
        description: '最適化',
        dependencies: [
          ArticleAgentType.InfoGathering,
          ArticleAgentType.Structuring,
          ArticleAgentType.Analysis
        ],
        estimatedTime: 2,
        complexity: 'medium'
      },
      {
        id: ArticleAgentType.SEO,
        description: 'SEO戦略',
        dependencies: [
          ArticleAgentType.InfoGathering,
          ArticleAgentType.Structuring,
          ArticleAgentType.Analysis
        ],
        estimatedTime: 2,
        complexity: 'medium'
      },
      {
        id: ArticleAgentType.Instruction,
        description: '指示生成',
        dependencies: [
          ArticleAgentType.Optimization,
          ArticleAgentType.SEO
        ],
        estimatedTime: 2,
        complexity: 'medium'
      },
      {
        id: ArticleAgentType.Writing,
        description: '執筆',
        dependencies: [ArticleAgentType.Instruction],
        estimatedTime: 5,
        complexity: 'large'
      },
      {
        id: ArticleAgentType.QualityControl,
        description: '品質管理',
        dependencies: [ArticleAgentType.Writing],
        estimatedTime: 2,
        complexity: 'medium'
      }
    ];

    return tasks;
  }

  /**
   * 記事を生成（並列実行最適化）
   *
   * @param input - 記事生成入力
   * @returns 記事生成出力
   */
  async generateArticle(input: ArticleGenerationInput): Promise<ArticleGenerationOutput> {
    console.log('📝 Starting article generation...');
    console.log('');

    const startTime = Date.now();

    try {
      // 1. タスクをDAG分解
      const dagResult = await this.analyzeArticleGenerationTasks(input);

      // 2. Wave ベースで並列実行
      const agentResults = await this.executeWaves(dagResult, input);

      // 3. 結果を統合
      const content = await this.assembleArticle(agentResults);

      // 4. メタデータ生成
      const metadata = this.generateMetadata(content, agentResults);

      const executionTime = Date.now() - startTime;

      console.log('');
      console.log(`✅ Article generation complete in ${executionTime}ms`);
      console.log(`📊 Word count: ${metadata.wordCount}`);
      console.log(`⭐ Quality score: ${metadata.qualityScore}/100`);
      console.log('');

      return {
        content,
        title: this.extractTitle(content),
        metadata,
        executionTime,
        agentResults
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      throw new Error(`Article generation failed after ${executionTime}ms: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Wave ベースでエージェントを並列実行
   *
   * @param dagResult - DAG分解結果
   * @param input - 記事生成入力
   * @returns エージェント実行結果マップ
   */
  private async executeWaves(dagResult: DAGResult, input: ArticleGenerationInput): Promise<Map<ArticleAgentType, AgentResult>> {
    const results = new Map<ArticleAgentType, AgentResult>();

    for (let waveIndex = 0; waveIndex < dagResult.waves.length; waveIndex++) {
      const wave = dagResult.waves[waveIndex];
      console.log(`🌊 Wave ${waveIndex + 1}/${dagResult.waves.length}: Executing ${wave.length} tasks in parallel...`);

      // Wave 内のタスクを並列実行
      const wavePromises = wave.map(taskId =>
        this.executeAgent(taskId as ArticleAgentType, input, results)
      );

      const waveResults = await Promise.all(wavePromises);

      // 結果をマップに追加
      waveResults.forEach((result, index) => {
        results.set(wave[index] as ArticleAgentType, result);
      });

      console.log(`✅ Wave ${waveIndex + 1} complete`);
      console.log('');
    }

    return results;
  }

  /**
   * 個別エージェントを実行
   *
   * @param agentType - エージェントタイプ
   * @param input - 記事生成入力
   * @param previousResults - 前のエージェントの結果
   * @returns エージェント実行結果
   */
  private async executeAgent(
    agentType: ArticleAgentType,
    input: ArticleGenerationInput,
    previousResults: Map<ArticleAgentType, AgentResult>
  ): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      console.log(`  🤖 Executing ${agentType}...`);

      // C7 品質管理エージェント: ReviewAgentと統合
      if (agentType === ArticleAgentType.QualityControl) {
        return await this.executeQualityControl(input, previousResults, startTime);
      }

      // TODO: 他のエージェント実装と連携
      // 現時点ではスタブ実装
      await this.simulateAgentExecution(agentType);

      // スタブデータ
      const data = {
        agentType,
        status: 'completed',
        previousResultsCount: previousResults.size
      };

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        data: null,
        executionTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * C7 品質管理エージェントを実行
   *
   * @param input - 記事生成入力
   * @param previousResults - 前のエージェントの結果
   * @param startTime - 実行開始時刻
   * @returns エージェント実行結果
   */
  private async executeQualityControl(
    input: ArticleGenerationInput,
    previousResults: Map<ArticleAgentType, AgentResult>,
    startTime: number
  ): Promise<AgentResult> {
    // C6 Writing の結果から記事コンテンツを取得
    const writingResult = previousResults.get(ArticleAgentType.Writing);
    if (!writingResult || !writingResult.success) {
      throw new Error('Writing agent result not found or failed');
    }

    // 現時点ではスタブコンテンツを使用
    // TODO: 実際の記事コンテンツを取得
    const articleContent = await this.assembleArticle(previousResults);

    // ReviewAgent で品質評価
    const qualityScore = await this.reviewAgent.reviewArticle(
      articleContent,
      input.keywords || []
    );

    const executionTime = Date.now() - startTime;

    return {
      success: qualityScore.passed,
      data: {
        agentType: ArticleAgentType.QualityControl,
        status: qualityScore.passed ? 'passed' : 'failed',
        qualityScore,
        feedback: qualityScore.feedback
      },
      executionTime
    };
  }

  /**
   * エージェント実行をシミュレート（開発用）
   */
  private async simulateAgentExecution(agentType: ArticleAgentType): Promise<void> {
    // 各エージェントの実行時間をシミュレート
    const executionTimes: Record<ArticleAgentType, number> = {
      [ArticleAgentType.InfoGathering]: 3000,
      [ArticleAgentType.Structuring]: 3000,
      [ArticleAgentType.Analysis]: 3000,
      [ArticleAgentType.Optimization]: 2000,
      [ArticleAgentType.SEO]: 2000,
      [ArticleAgentType.Instruction]: 2000,
      [ArticleAgentType.Writing]: 5000,
      [ArticleAgentType.QualityControl]: 2000
    };

    const delay = executionTimes[agentType] || 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * エージェント結果から記事を組み立て
   *
   * @param agentResults - エージェント実行結果
   * @returns 記事コンテンツ（Markdown）
   */
  private async assembleArticle(_agentResults: Map<ArticleAgentType, AgentResult>): Promise<string> {
    // TODO: 実際のエージェント結果から記事を組み立て
    // 現時点ではスタブ実装

    return `# Sample Article

## Introduction

This is a sample article generated by ArticleGenerationCoordinator.

## Content

- Wave 1: Information gathering, structuring, and analysis completed in parallel
- Wave 2: Optimization and SEO completed in parallel
- Wave 3: Instruction generation completed
- Wave 4: Writing completed
- Wave 5: Quality control completed

## Conclusion

Article generation with parallel execution optimization.

---

🤖 Generated with ArticleGenerationCoordinator
`;
  }

  /**
   * メタデータを生成
   *
   * @param content - 記事コンテンツ
   * @param agentResults - エージェント実行結果
   * @returns 記事メタデータ
   */
  private generateMetadata(content: string, agentResults: Map<ArticleAgentType, AgentResult>): ArticleMetadata {
    const wordCount = content.length;
    const readingTime = Math.ceil(wordCount / 400); // 400文字/分

    // C7 QualityControl の結果から品質スコアを取得
    const qualityControlResult = agentResults.get(ArticleAgentType.QualityControl);
    let qualityScore = 80;  // デフォルト
    let seoScore = 85;      // デフォルト
    let qualityDetails: ArticleQualityScore | undefined;

    if (qualityControlResult && qualityControlResult.success) {
      const data = qualityControlResult.data as {
        qualityScore?: ArticleQualityScore;
      };

      if (data.qualityScore) {
        qualityDetails = data.qualityScore;
        qualityScore = data.qualityScore.overall;
        seoScore = data.qualityScore.seo.overall;
      }
    }

    return {
      wordCount,
      keywords: ['article', 'generation', 'coordinator'],
      seoScore,
      qualityScore,
      readingTime,
      generatedAt: new Date(),
      qualityDetails
    };
  }

  /**
   * 記事からタイトルを抽出
   *
   * @param content - 記事コンテンツ
   * @returns タイトル
   */
  private extractTitle(content: string): string {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1] : 'Untitled Article';
  }
}
