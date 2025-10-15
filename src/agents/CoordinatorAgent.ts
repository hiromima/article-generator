import { Anthropic } from '@anthropic-ai/sdk';
import { Octokit } from '@octokit/rest';
import 'dotenv/config';

/**
 * タスクの複雑度
 */
export type Complexity = 'small' | 'medium' | 'large' | 'xlarge';

/**
 * タスクの優先度
 */
export type Priority = 'P0-Critical' | 'P1-High' | 'P2-Medium' | 'P3-Low';

/**
 * エージェントの種類
 */
export type AgentType = 'coordinator' | 'codegen' | 'review' | 'pr' | 'test' | 'deployment';

/**
 * タスク構造
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  dependencies: string[];
  complexity: Complexity;
  effort: string;
  priority: Priority;
  agent: AgentType;
  acceptanceCriteria: string[];
}

/**
 * Wave（並列実行グループ）
 */
export interface Wave {
  id: number;
  tasks: Task[];
  dependencies: string[];
  estimatedDuration: string;
  canRunInParallel: boolean;
}

/**
 * DAG分析結果
 */
export interface DAGAnalysis {
  tasks: Task[];
  waves: Wave[];
  criticalPath: string[];
  totalDuration: string;
  efficiency: number;
}

/**
 * CoordinatorAgent - タスク統括・並列実行制御
 *
 * Issue を DAG（Directed Acyclic Graph）で分解し、Wave ベース並列実行を最適化する
 */
export class CoordinatorAgent {
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

    // リポジトリ情報を取得
    const repoInfo = process.env.GITHUB_REPOSITORY || 'hiromima/article-generator';
    [this.owner, this.repo] = repoInfo.split('/');
  }

  /**
   * Issue を分析してタスクに分解
   *
   * @param issueNumber - GitHub Issue番号
   * @returns タスクリスト
   */
  async analyzeIssue(issueNumber: number): Promise<Task[]> {
    // Issue の内容を取得
    const issue = await this.octokit.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber
    });

    const { title, body } = issue.data;

    // Claude Sonnet 4 でタスク分解
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: `あなたはプロジェクト管理エージェントです。以下のIssueをサブタスクに分解してください。

Issue #${issueNumber}: ${title}

${body}

以下の形式でJSON配列として返してください:

[
  {
    "id": "タスクID（例: 2.1, 2.2）",
    "title": "タスクタイトル",
    "description": "タスク説明",
    "dependencies": ["依存タスクID"],
    "complexity": "small|medium|large|xlarge",
    "effort": "1h|4h|1d|3d|1w|2w",
    "priority": "P0-Critical|P1-High|P2-Medium|P3-Low",
    "agent": "coordinator|codegen|review|pr|test|deployment",
    "acceptanceCriteria": ["受け入れ基準1", "受け入れ基準2"]
  }
]

重要:
- 依存関係を明確にする
- 複雑度と工数を現実的に見積もる
- 各タスクは単一責任を持つ
- 受け入れ基準は具体的で測定可能にする`
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // JSONを抽出（コードブロック内にある場合を考慮）
    const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/) ||
                     content.text.match(/\[[\s\S]*?\]/);

    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Claude response');
    }

    const tasks: Task[] = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    return tasks;
  }

  /**
   * DAG（有向非循環グラフ）を構築
   *
   * @param tasks - タスクリスト
   * @returns タスクマップ
   */
  buildDAG(tasks: Task[]): Map<string, Task> {
    const dag = new Map<string, Task>();

    // タスクをマップに追加
    for (const task of tasks) {
      dag.set(task.id, task);
    }

    // 循環依存をチェック
    this.detectCycles(dag);

    return dag;
  }

  /**
   * 循環依存を検出
   *
   * @param dag - タスクマップ
   * @throws 循環依存が見つかった場合
   */
  private detectCycles(dag: Map<string, Task>): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (taskId: string): boolean => {
      visited.add(taskId);
      recursionStack.add(taskId);

      const task = dag.get(taskId);
      if (!task) return false;

      for (const depId of task.dependencies) {
        if (!visited.has(depId)) {
          if (dfs(depId)) return true;
        } else if (recursionStack.has(depId)) {
          throw new Error(`Circular dependency detected: ${taskId} -> ${depId}`);
        }
      }

      recursionStack.delete(taskId);
      return false;
    };

    for (const taskId of dag.keys()) {
      if (!visited.has(taskId)) {
        dfs(taskId);
      }
    }
  }

  /**
   * Wave並列実行計画を生成
   *
   * @param dag - タスクマップ
   * @returns Wave配列
   */
  planWaves(dag: Map<string, Task>): Wave[] {
    const waves: Wave[] = [];
    const completed = new Set<string>();
    let waveId = 1;

    while (completed.size < dag.size) {
      // 実行可能なタスクを抽出（依存関係が全て完了しているタスク）
      const readyTasks: Task[] = [];

      for (const [taskId, task] of dag) {
        if (completed.has(taskId)) continue;

        const allDepsCompleted = task.dependencies.every(depId => completed.has(depId));
        if (allDepsCompleted) {
          readyTasks.push(task);
        }
      }

      if (readyTasks.length === 0) {
        throw new Error('No tasks ready to execute - possible deadlock');
      }

      // Waveを作成
      const wave: Wave = {
        id: waveId++,
        tasks: readyTasks,
        dependencies: this.collectDependencies(readyTasks),
        estimatedDuration: this.calculateWaveDuration(readyTasks),
        canRunInParallel: readyTasks.length > 1
      };

      waves.push(wave);

      // 完了済みに追加
      for (const task of readyTasks) {
        completed.add(task.id);
      }
    }

    return waves;
  }

  /**
   * Waveの依存関係を収集
   */
  private collectDependencies(tasks: Task[]): string[] {
    const deps = new Set<string>();
    for (const task of tasks) {
      for (const depId of task.dependencies) {
        deps.add(depId);
      }
    }
    return Array.from(deps);
  }

  /**
   * Waveの推定期間を計算（最長のタスクを採用）
   */
  private calculateWaveDuration(tasks: Task[]): string {
    const effortToHours: Record<string, number> = {
      '1h': 1,
      '4h': 4,
      '1d': 8,
      '3d': 24,
      '1w': 40,
      '2w': 80
    };

    let maxHours = 0;
    for (const task of tasks) {
      const hours = effortToHours[task.effort] || 0;
      if (hours > maxHours) {
        maxHours = hours;
      }
    }

    // 時間を読みやすい形式に変換
    if (maxHours >= 80) return '2週間';
    if (maxHours >= 40) return '1週間';
    if (maxHours >= 24) return '3日';
    if (maxHours >= 8) return '1日';
    if (maxHours >= 4) return '4時間';
    return '1時間';
  }

  /**
   * Critical Path（最長実行経路）を特定
   *
   * @param waves - Wave配列
   * @returns Critical Pathのタスクリスト
   */
  findCriticalPath(waves: Wave[]): string[] {
    const effortToHours: Record<string, number> = {
      '1h': 1,
      '4h': 4,
      '1d': 8,
      '3d': 24,
      '1w': 40,
      '2w': 80
    };

    let longestPath: string[] = [];
    let longestDuration = 0;

    const findPath = (currentPath: string[], currentDuration: number, waveIndex: number) => {
      if (waveIndex >= waves.length) {
        if (currentDuration > longestDuration) {
          longestDuration = currentDuration;
          longestPath = [...currentPath];
        }
        return;
      }

      const wave = waves[waveIndex];
      for (const task of wave.tasks) {
        const taskDuration = effortToHours[task.effort] || 0;
        findPath(
          [...currentPath, task.id],
          currentDuration + taskDuration,
          waveIndex + 1
        );
      }
    };

    findPath([], 0, 0);
    return longestPath;
  }

  /**
   * 並列実行による効率化率を計算
   *
   * @param waves - Wave配列
   * @returns 効率化率（0.0-1.0）
   */
  calculateEfficiency(waves: Wave[]): number {
    const effortToHours: Record<string, number> = {
      '1h': 1,
      '4h': 4,
      '1d': 8,
      '3d': 24,
      '1w': 40,
      '2w': 80
    };

    // 順次実行の場合の総時間
    let sequentialHours = 0;
    for (const wave of waves) {
      for (const task of wave.tasks) {
        sequentialHours += effortToHours[task.effort] || 0;
      }
    }

    // 並列実行の場合の総時間
    let parallelHours = 0;
    for (const wave of waves) {
      let maxHours = 0;
      for (const task of wave.tasks) {
        const hours = effortToHours[task.effort] || 0;
        if (hours > maxHours) {
          maxHours = hours;
        }
      }
      parallelHours += maxHours;
    }

    // 効率化率 = (順次実行 - 並列実行) / 順次実行
    return (sequentialHours - parallelHours) / sequentialHours;
  }

  /**
   * 完全なDAG分析を実行
   *
   * @param issueNumber - GitHub Issue番号
   * @returns DAG分析結果
   */
  async analyze(issueNumber: number): Promise<DAGAnalysis> {
    // 1. Issue を分析してタスク分解
    const tasks = await this.analyzeIssue(issueNumber);

    // 2. DAG を構築
    const dag = this.buildDAG(tasks);

    // 3. Wave 並列実行計画を生成
    const waves = this.planWaves(dag);

    // 4. Critical Path を特定
    const criticalPath = this.findCriticalPath(waves);

    // 5. 効率化率を計算
    const efficiency = this.calculateEfficiency(waves);

    // 6. 総実行時間を計算
    const totalDuration = this.calculateTotalDuration(waves);

    return {
      tasks,
      waves,
      criticalPath,
      totalDuration,
      efficiency
    };
  }

  /**
   * 総実行時間を計算
   */
  private calculateTotalDuration(waves: Wave[]): string {
    const effortToHours: Record<string, number> = {
      '1h': 1,
      '4h': 4,
      '1d': 8,
      '3d': 24,
      '1w': 40,
      '2w': 80
    };

    let totalHours = 0;
    for (const wave of waves) {
      let maxHours = 0;
      for (const task of wave.tasks) {
        const hours = effortToHours[task.effort] || 0;
        if (hours > maxHours) {
          maxHours = hours;
        }
      }
      totalHours += maxHours;
    }

    // 時間を読みやすい形式に変換
    const weeks = Math.floor(totalHours / 40);
    const days = Math.floor((totalHours % 40) / 8);

    if (weeks > 0 && days > 0) {
      return `約${weeks}週間${days}日`;
    } else if (weeks > 0) {
      return `約${weeks}週間`;
    } else if (days > 0) {
      return `約${days}日`;
    } else {
      return `約${totalHours}時間`;
    }
  }
}
