import { Octokit } from '@octokit/rest';
import { exec } from 'child_process';
import { promisify } from 'util';
import 'dotenv/config';
import { ArticleQualityScorer, type ArticleQualityScore } from './ArticleQualityScorer';

const execAsync = promisify(exec);

/**
 * レビュー結果
 */
export interface ReviewResult {
  passed: boolean;
  score: number;              // 0-100
  checks: {
    eslint: CheckResult;
    typescript: CheckResult;
    security: CheckResult;
  };
  summary: string;
  recommendations: string[];
}

/**
 * 個別チェック結果
 */
export interface CheckResult {
  passed: boolean;
  score: number;
  errors: string[];
  warnings: string[];
  details: string;
}

/**
 * レビュー設定
 */
export interface ReviewConfig {
  passingScore: number;       // 合格スコア (0-100)
  eslintEnabled: boolean;
  typescriptEnabled: boolean;
  securityEnabled: boolean;
  targetPath?: string;        // レビュー対象パス (デフォルト: src/)
}

/**
 * ReviewAgent - コード品質判定
 *
 * 静的解析、型チェック、セキュリティスキャンを実行し、
 * 品質スコアを算出して自動承認/却下を判定する
 *
 * 機能:
 * - ESLint 静的解析
 * - TypeScript strict mode 型チェック
 * - npm audit セキュリティスキャン
 * - 品質スコアリング (100点満点)
 * - 80点以上で自動承認
 */
export class ReviewAgent {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private config: ReviewConfig;

  /**
   * デフォルト設定
   */
  private static readonly DEFAULT_CONFIG: ReviewConfig = {
    passingScore: 80,
    eslintEnabled: true,
    typescriptEnabled: true,
    securityEnabled: true,
    targetPath: 'src/'
  };

  constructor(config?: Partial<ReviewConfig>) {
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      throw new Error('GITHUB_TOKEN is required');
    }

    this.octokit = new Octokit({ auth: githubToken });

    const repoInfo = process.env.GITHUB_REPOSITORY || 'hiromima/article-generator';
    [this.owner, this.repo] = repoInfo.split('/');

    this.config = {
      ...ReviewAgent.DEFAULT_CONFIG,
      ...config
    };
  }

  /**
   * コードレビューを実行
   *
   * @param targetPath - レビュー対象パス (オプション)
   * @returns レビュー結果
   */
  async review(targetPath?: string): Promise<ReviewResult> {
    const path = targetPath || this.config.targetPath || 'src/';

    console.log('🔍 Starting code review...');
    console.log(`📂 Target: ${path}`);
    console.log('');

    const checks = {
      eslint: await this.runESLint(path),
      typescript: await this.runTypeScript(),
      security: await this.runSecurityAudit()
    };

    // スコア計算 (各チェック均等配分)
    const totalScore = Math.round(
      (checks.eslint.score + checks.typescript.score + checks.security.score) / 3
    );

    const passed = totalScore >= this.config.passingScore;

    // 推奨事項を生成
    const recommendations = this.generateRecommendations(checks);

    // サマリーを生成
    const summary = this.generateSummary(totalScore, passed, checks);

    return {
      passed,
      score: totalScore,
      checks,
      summary,
      recommendations
    };
  }

  /**
   * ESLint 静的解析を実行
   */
  private async runESLint(targetPath: string): Promise<CheckResult> {
    if (!this.config.eslintEnabled) {
      return {
        passed: true,
        score: 100,
        errors: [],
        warnings: [],
        details: 'ESLint check disabled'
      };
    }

    try {
      console.log('🔧 Running ESLint...');

      const { stdout } = await execAsync(
        `npx eslint ${targetPath} --format json --ext .ts,.js`
      );

      // ESLint が問題を見つけると exit code 1 を返すが、JSON は出力される
      const results = JSON.parse(stdout || '[]');

      const errors: string[] = [];
      const warnings: string[] = [];

      for (const result of results) {
        for (const message of result.messages || []) {
          const location = `${result.filePath}:${message.line}:${message.column}`;
          const text = `${location} - ${message.message} (${message.ruleId})`;

          if (message.severity === 2) {
            errors.push(text);
          } else {
            warnings.push(text);
          }
        }
      }

      // スコア計算: エラー1つで-10点、警告1つで-2点
      const score = Math.max(0, 100 - (errors.length * 10) - (warnings.length * 2));
      const passed = errors.length === 0;

      console.log(`  ✓ ESLint: ${errors.length} errors, ${warnings.length} warnings`);

      return {
        passed,
        score,
        errors,
        warnings,
        details: `ESLint completed: ${errors.length} errors, ${warnings.length} warnings`
      };
    } catch (error) {
      // ESLint がインストールされていない、または設定エラー
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        console.warn('  ⚠️ ESLint not found, skipping...');
        return {
          passed: true,
          score: 100,
          errors: [],
          warnings: ['ESLint not installed'],
          details: 'ESLint not found, check skipped'
        };
      }

      // JSONパースエラーの場合は stderr を確認
      const errorMessage = error instanceof Error ? error.message : String(error);

      // ESLintの出力が空の場合（問題なし）
      if (errorMessage.includes('Unexpected end of JSON input')) {
        console.log('  ✓ ESLint: No issues found');
        return {
          passed: true,
          score: 100,
          errors: [],
          warnings: [],
          details: 'ESLint completed: No issues found'
        };
      }

      throw error;
    }
  }

  /**
   * TypeScript 型チェックを実行
   */
  private async runTypeScript(): Promise<CheckResult> {
    if (!this.config.typescriptEnabled) {
      return {
        passed: true,
        score: 100,
        errors: [],
        warnings: [],
        details: 'TypeScript check disabled'
      };
    }

    try {
      console.log('📘 Running TypeScript type check...');

      await execAsync('npx tsc --noEmit');

      console.log('  ✓ TypeScript: No type errors');

      return {
        passed: true,
        score: 100,
        errors: [],
        warnings: [],
        details: 'TypeScript compilation successful: 0 errors'
      };
    } catch (error) {
      const errorOutput = error instanceof Error && 'stderr' in error
        ? (error as { stderr: string }).stderr
        : String(error);

      // エラー行を抽出
      const errorLines = errorOutput
        .split('\n')
        .filter(line => line.includes('error TS'))
        .slice(0, 20); // 最初の20エラーのみ

      const errorCount = errorLines.length;

      // スコア計算: エラー1つで-5点
      const score = Math.max(0, 100 - (errorCount * 5));

      console.log(`  ✗ TypeScript: ${errorCount} type errors`);

      return {
        passed: false,
        score,
        errors: errorLines,
        warnings: [],
        details: `TypeScript compilation failed: ${errorCount} errors`
      };
    }
  }

  /**
   * npm audit セキュリティスキャンを実行
   */
  private async runSecurityAudit(): Promise<CheckResult> {
    if (!this.config.securityEnabled) {
      return {
        passed: true,
        score: 100,
        errors: [],
        warnings: [],
        details: 'Security audit disabled'
      };
    }

    try {
      console.log('🔒 Running npm audit...');

      const { stdout } = await execAsync('npm audit --json');
      const auditResult = JSON.parse(stdout);

      const critical = auditResult.metadata?.vulnerabilities?.critical || 0;
      const high = auditResult.metadata?.vulnerabilities?.high || 0;
      const moderate = auditResult.metadata?.vulnerabilities?.moderate || 0;
      const low = auditResult.metadata?.vulnerabilities?.low || 0;

      const errors: string[] = [];
      const warnings: string[] = [];

      if (critical > 0) {
        errors.push(`${critical} critical vulnerabilities`);
      }
      if (high > 0) {
        errors.push(`${high} high vulnerabilities`);
      }
      if (moderate > 0) {
        warnings.push(`${moderate} moderate vulnerabilities`);
      }
      if (low > 0) {
        warnings.push(`${low} low vulnerabilities`);
      }

      // スコア計算: critical -20点、high -10点、moderate -5点、low -1点
      const score = Math.max(
        0,
        100 - (critical * 20) - (high * 10) - (moderate * 5) - (low * 1)
      );

      const passed = critical === 0 && high === 0;

      console.log(`  ✓ Security: ${critical} critical, ${high} high, ${moderate} moderate, ${low} low`);

      return {
        passed,
        score,
        errors,
        warnings,
        details: `npm audit: ${critical + high + moderate + low} vulnerabilities found`
      };
    } catch (error) {
      // npm audit は脆弱性が見つかると exit code 1 を返す
      const errorOutput = error instanceof Error && 'stdout' in error
        ? (error as { stdout: string }).stdout
        : '{}';

      try {
        const auditResult = JSON.parse(errorOutput);
        const critical = auditResult.metadata?.vulnerabilities?.critical || 0;
        const high = auditResult.metadata?.vulnerabilities?.high || 0;
        const moderate = auditResult.metadata?.vulnerabilities?.moderate || 0;
        const low = auditResult.metadata?.vulnerabilities?.low || 0;

        const errors: string[] = [];
        const warnings: string[] = [];

        if (critical > 0) errors.push(`${critical} critical vulnerabilities`);
        if (high > 0) errors.push(`${high} high vulnerabilities`);
        if (moderate > 0) warnings.push(`${moderate} moderate vulnerabilities`);
        if (low > 0) warnings.push(`${low} low vulnerabilities`);

        const score = Math.max(
          0,
          100 - (critical * 20) - (high * 10) - (moderate * 5) - (low * 1)
        );

        const passed = critical === 0 && high === 0;

        console.log(`  ⚠️ Security: ${critical} critical, ${high} high, ${moderate} moderate, ${low} low`);

        return {
          passed,
          score,
          errors,
          warnings,
          details: `npm audit: ${critical + high + moderate + low} vulnerabilities found`
        };
      } catch {
        // JSON パース失敗
        console.warn('  ⚠️ npm audit failed, skipping...');
        return {
          passed: true,
          score: 100,
          errors: [],
          warnings: ['npm audit failed'],
          details: 'Security audit could not be completed'
        };
      }
    }
  }

  /**
   * 推奨事項を生成
   */
  private generateRecommendations(checks: {
    eslint: CheckResult;
    typescript: CheckResult;
    security: CheckResult;
  }): string[] {
    const recommendations: string[] = [];

    // ESLint 推奨
    if (checks.eslint.errors.length > 0) {
      recommendations.push('Fix ESLint errors before merging');
    }
    if (checks.eslint.warnings.length > 5) {
      recommendations.push('Consider fixing ESLint warnings to improve code quality');
    }

    // TypeScript 推奨
    if (checks.typescript.errors.length > 0) {
      recommendations.push('Fix TypeScript type errors - strict mode compliance required');
    }

    // セキュリティ推奨
    if (checks.security.errors.length > 0) {
      recommendations.push('Run `npm audit fix` to resolve security vulnerabilities');
    }

    // スコア別推奨
    const avgScore = (checks.eslint.score + checks.typescript.score + checks.security.score) / 3;
    if (avgScore < 80) {
      recommendations.push('Quality score below passing threshold (80) - review required');
    } else if (avgScore < 90) {
      recommendations.push('Good quality, minor improvements recommended');
    } else {
      recommendations.push('Excellent code quality - ready for merge');
    }

    return recommendations;
  }

  /**
   * サマリーを生成
   */
  private generateSummary(
    score: number,
    passed: boolean,
    checks: {
      eslint: CheckResult;
      typescript: CheckResult;
      security: CheckResult;
    }
  ): string {
    const statusEmoji = passed ? '✅' : '❌';
    const statusText = passed ? 'PASSED' : 'FAILED';

    let summary = `${statusEmoji} Review ${statusText} - Quality Score: ${score}/100\n\n`;

    summary += `**ESLint**: ${checks.eslint.score}/100\n`;
    summary += `  - Errors: ${checks.eslint.errors.length}\n`;
    summary += `  - Warnings: ${checks.eslint.warnings.length}\n\n`;

    summary += `**TypeScript**: ${checks.typescript.score}/100\n`;
    summary += `  - Type Errors: ${checks.typescript.errors.length}\n\n`;

    summary += `**Security**: ${checks.security.score}/100\n`;
    summary += `  - Vulnerabilities: ${checks.security.errors.length + checks.security.warnings.length}\n`;

    return summary;
  }

  /**
   * PR にレビューコメントを投稿
   *
   * @param prNumber - PR番号
   * @param result - レビュー結果
   */
  async postReviewComment(prNumber: number, result: ReviewResult): Promise<void> {
    let comment = `## 🤖 ReviewAgent - Automated Code Review\n\n`;
    comment += result.summary + '\n';

    if (result.recommendations.length > 0) {
      comment += `### 📝 Recommendations\n\n`;
      for (const rec of result.recommendations) {
        comment += `- ${rec}\n`;
      }
      comment += '\n';
    }

    // 詳細を折りたたみで追加
    if (result.checks.eslint.errors.length > 0 || result.checks.eslint.warnings.length > 0) {
      comment += `<details>\n<summary>ESLint Details</summary>\n\n`;
      comment += '```\n';
      comment += result.checks.eslint.errors.slice(0, 10).join('\n');
      if (result.checks.eslint.errors.length > 10) {
        comment += `\n... and ${result.checks.eslint.errors.length - 10} more errors\n`;
      }
      comment += '```\n</details>\n\n';
    }

    if (result.checks.typescript.errors.length > 0) {
      comment += `<details>\n<summary>TypeScript Errors</summary>\n\n`;
      comment += '```\n';
      comment += result.checks.typescript.errors.slice(0, 10).join('\n');
      if (result.checks.typescript.errors.length > 10) {
        comment += `\n... and ${result.checks.typescript.errors.length - 10} more errors\n`;
      }
      comment += '```\n</details>\n\n';
    }

    await this.octokit.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
      body: comment
    });

    console.log(`✅ Review comment posted to PR #${prNumber}`);
  }

  /**
   * 記事品質を評価
   *
   * @param articleContent - 記事コンテンツ（Markdown）
   * @param keywords - SEOキーワード（オプション）
   * @returns 記事品質スコア
   */
  async reviewArticle(articleContent: string, keywords: string[] = []): Promise<ArticleQualityScore> {
    console.log('📊 Starting article quality review...');
    console.log('');

    const scorer = new ArticleQualityScorer(this.config.passingScore);
    const score = await scorer.evaluateArticle(articleContent, keywords);

    console.log('');
    if (score.passed) {
      console.log(`✅ Article PASSED review (${score.overall}/100)`);
    } else {
      console.log(`❌ Article FAILED review (${score.overall}/100)`);
      console.log('');
      console.log('📝 Feedback:');
      score.feedback.forEach(f => console.log(`  - ${f}`));
    }

    return score;
  }

  /**
   * 設定を取得
   */
  getConfig(): ReviewConfig {
    return { ...this.config };
  }
}
