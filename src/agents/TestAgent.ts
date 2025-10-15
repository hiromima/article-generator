import { Octokit } from '@octokit/rest';
import { exec } from 'child_process';
import { promisify } from 'util';
import 'dotenv/config';

const execAsync = promisify(exec);

/**
 * テスト結果
 */
export interface TestResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;              // 秒
  coverage?: CoverageResult;
  failures: TestFailure[];
  summary: string;
}

/**
 * カバレッジ結果
 */
export interface CoverageResult {
  lines: CoverageMetric;
  statements: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
  meetsThreshold: boolean;
}

/**
 * カバレッジメトリクス
 */
export interface CoverageMetric {
  total: number;
  covered: number;
  percentage: number;
}

/**
 * テスト失敗情報
 */
export interface TestFailure {
  testName: string;
  errorMessage: string;
  stackTrace?: string;
}

/**
 * テスト設定
 */
export interface TestConfig {
  coverageEnabled: boolean;
  coverageThreshold: number;    // 0-100
  testPattern?: string;         // テストファイルのパターン
  timeout?: number;             // タイムアウト (ミリ秒)
}

/**
 * TestAgent - テスト自動実行
 *
 * Jest を使用してテストを自動実行し、カバレッジレポートを生成する
 *
 * 機能:
 * - Jest テスト自動実行
 * - カバレッジレポート生成
 * - 80%+ カバレッジ目標
 * - 失敗テストの詳細レポート
 * - PR コメント自動投稿
 */
export class TestAgent {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private config: TestConfig;

  /**
   * デフォルト設定
   */
  private static readonly DEFAULT_CONFIG: TestConfig = {
    coverageEnabled: true,
    coverageThreshold: 80,
    testPattern: undefined,
    timeout: 60000
  };

  constructor(config?: Partial<TestConfig>) {
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      throw new Error('GITHUB_TOKEN is required');
    }

    this.octokit = new Octokit({ auth: githubToken });

    const repoInfo = process.env.GITHUB_REPOSITORY || 'hiromima/article-generator';
    [this.owner, this.repo] = repoInfo.split('/');

    this.config = {
      ...TestAgent.DEFAULT_CONFIG,
      ...config
    };
  }

  /**
   * テストを実行
   *
   * @param testPattern - テストファイルのパターン (オプション)
   * @returns テスト結果
   */
  async runTests(testPattern?: string): Promise<TestResult> {
    console.log('🧪 Starting test execution...');
    console.log('');

    const pattern = testPattern || this.config.testPattern || '';
    const withCoverage = this.config.coverageEnabled;

    try {
      const startTime = Date.now();

      // Jest コマンドを構築
      let jestCommand = 'npx jest';

      if (pattern) {
        jestCommand += ` ${pattern}`;
      }

      if (withCoverage) {
        jestCommand += ' --coverage --json';
      } else {
        jestCommand += ' --json';
      }

      if (this.config.timeout) {
        jestCommand += ` --testTimeout=${this.config.timeout}`;
      }

      console.log(`📋 Running: ${jestCommand}`);
      console.log('');

      const { stdout } = await execAsync(jestCommand);
      const duration = (Date.now() - startTime) / 1000;

      // Jest の JSON 出力をパース
      const jestResult = JSON.parse(stdout);

      const result = this.parseJestResult(jestResult, duration);

      console.log(`✅ Test execution completed in ${duration.toFixed(2)}s`);
      console.log('');

      return result;
    } catch (error) {
      // Jest はテスト失敗時に exit code 1 を返す
      if (error instanceof Error && 'stdout' in error) {
        const stdout = (error as { stdout: string }).stdout;

        try {
          const jestResult = JSON.parse(stdout);
          const duration = 0; // エラー時は正確な時間が取れない

          const result = this.parseJestResult(jestResult, duration);

          console.log(`❌ Test execution completed with failures`);
          console.log('');

          return result;
        } catch {
          // JSON パース失敗
          throw new Error('Failed to parse Jest output');
        }
      }

      throw error;
    }
  }

  /**
   * Jest 結果をパース
   */
  private parseJestResult(jestResult: any, duration: number): TestResult {
    const numTotalTests = jestResult.numTotalTests || 0;
    const numPassedTests = jestResult.numPassedTests || 0;
    const numFailedTests = jestResult.numFailedTests || 0;
    const numPendingTests = jestResult.numPendingTests || 0;

    const passed = numFailedTests === 0;

    // 失敗テストを抽出
    const failures: TestFailure[] = [];

    if (jestResult.testResults) {
      for (const testFile of jestResult.testResults) {
        for (const assertionResult of testFile.assertionResults || []) {
          if (assertionResult.status === 'failed') {
            failures.push({
              testName: assertionResult.fullName || assertionResult.title,
              errorMessage: assertionResult.failureMessages?.join('\n') || 'Unknown error',
              stackTrace: assertionResult.failureMessages?.join('\n')
            });
          }
        }
      }
    }

    // カバレッジを抽出
    let coverage: CoverageResult | undefined;

    if (jestResult.coverageMap) {
      coverage = this.parseCoverage(jestResult.coverageMap);
    }

    // サマリーを生成
    const summary = this.generateSummary(passed, numTotalTests, numPassedTests, numFailedTests, coverage);

    return {
      passed,
      totalTests: numTotalTests,
      passedTests: numPassedTests,
      failedTests: numFailedTests,
      skippedTests: numPendingTests,
      duration,
      coverage,
      failures,
      summary
    };
  }

  /**
   * カバレッジ情報をパース
   */
  private parseCoverage(coverageMap: any): CoverageResult {
    // Jest の coverageMap から総計を計算
    const totals = {
      lines: { total: 0, covered: 0 },
      statements: { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 },
      branches: { total: 0, covered: 0 }
    };

    for (const filePath in coverageMap) {
      const fileCoverage = coverageMap[filePath];

      // Lines
      if (fileCoverage.l) {
        totals.lines.total += Object.keys(fileCoverage.l).length;
        totals.lines.covered += Object.values(fileCoverage.l).filter((count: any) => count > 0).length;
      }

      // Statements
      if (fileCoverage.s) {
        totals.statements.total += Object.keys(fileCoverage.s).length;
        totals.statements.covered += Object.values(fileCoverage.s).filter((count: any) => count > 0).length;
      }

      // Functions
      if (fileCoverage.f) {
        totals.functions.total += Object.keys(fileCoverage.f).length;
        totals.functions.covered += Object.values(fileCoverage.f).filter((count: any) => count > 0).length;
      }

      // Branches
      if (fileCoverage.b) {
        for (const branchId in fileCoverage.b) {
          const branches = fileCoverage.b[branchId];
          totals.branches.total += branches.length;
          totals.branches.covered += branches.filter((count: number) => count > 0).length;
        }
      }
    }

    const lines: CoverageMetric = {
      total: totals.lines.total,
      covered: totals.lines.covered,
      percentage: totals.lines.total > 0 ? (totals.lines.covered / totals.lines.total) * 100 : 0
    };

    const statements: CoverageMetric = {
      total: totals.statements.total,
      covered: totals.statements.covered,
      percentage: totals.statements.total > 0 ? (totals.statements.covered / totals.statements.total) * 100 : 0
    };

    const functions: CoverageMetric = {
      total: totals.functions.total,
      covered: totals.functions.covered,
      percentage: totals.functions.total > 0 ? (totals.functions.covered / totals.functions.total) * 100 : 0
    };

    const branches: CoverageMetric = {
      total: totals.branches.total,
      covered: totals.branches.covered,
      percentage: totals.branches.total > 0 ? (totals.branches.covered / totals.branches.total) * 100 : 0
    };

    const meetsThreshold =
      lines.percentage >= this.config.coverageThreshold &&
      statements.percentage >= this.config.coverageThreshold &&
      functions.percentage >= this.config.coverageThreshold &&
      branches.percentage >= this.config.coverageThreshold;

    return {
      lines,
      statements,
      functions,
      branches,
      meetsThreshold
    };
  }

  /**
   * サマリーを生成
   */
  private generateSummary(
    passed: boolean,
    total: number,
    passedCount: number,
    failedCount: number,
    coverage?: CoverageResult
  ): string {
    const statusEmoji = passed ? '✅' : '❌';
    const statusText = passed ? 'PASSED' : 'FAILED';

    let summary = `${statusEmoji} Tests ${statusText}\n\n`;
    summary += `**Results**: ${passedCount}/${total} tests passed`;

    if (failedCount > 0) {
      summary += `, ${failedCount} failed`;
    }

    summary += '\n\n';

    if (coverage) {
      summary += `**Coverage**:\n`;
      summary += `- Lines: ${coverage.lines.percentage.toFixed(2)}% (${coverage.lines.covered}/${coverage.lines.total})\n`;
      summary += `- Statements: ${coverage.statements.percentage.toFixed(2)}% (${coverage.statements.covered}/${coverage.statements.total})\n`;
      summary += `- Functions: ${coverage.functions.percentage.toFixed(2)}% (${coverage.functions.covered}/${coverage.functions.total})\n`;
      summary += `- Branches: ${coverage.branches.percentage.toFixed(2)}% (${coverage.branches.covered}/${coverage.branches.total})\n\n`;

      if (coverage.meetsThreshold) {
        summary += `✅ Coverage threshold met (${this.config.coverageThreshold}%+)`;
      } else {
        summary += `❌ Coverage below threshold (${this.config.coverageThreshold}%+)`;
      }
    }

    return summary;
  }

  /**
   * PR にテスト結果コメントを投稿
   *
   * @param prNumber - PR番号
   * @param result - テスト結果
   */
  async postTestComment(prNumber: number, result: TestResult): Promise<void> {
    let comment = `## 🧪 TestAgent - Automated Test Results\n\n`;
    comment += result.summary + '\n\n';

    if (result.failures.length > 0) {
      comment += `### ❌ Failed Tests (${result.failures.length})\n\n`;

      for (const failure of result.failures.slice(0, 5)) {
        comment += `<details>\n<summary>${failure.testName}</summary>\n\n`;
        comment += '```\n';
        comment += failure.errorMessage.slice(0, 500);
        if (failure.errorMessage.length > 500) {
          comment += '\n... (truncated)';
        }
        comment += '\n```\n</details>\n\n';
      }

      if (result.failures.length > 5) {
        comment += `... and ${result.failures.length - 5} more failures\n\n`;
      }
    }

    comment += `**Duration**: ${result.duration.toFixed(2)}s\n`;

    await this.octokit.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
      body: comment
    });

    console.log(`✅ Test comment posted to PR #${prNumber}`);
  }

  /**
   * 設定を取得
   */
  getConfig(): TestConfig {
    return { ...this.config };
  }
}
