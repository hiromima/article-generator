import { Octokit } from '@octokit/rest';
import { exec } from 'child_process';
import { promisify } from 'util';
import 'dotenv/config';

const execAsync = promisify(exec);

/**
 * デプロイメント設定
 */
export interface DeploymentConfig {
  healthCheckUrl?: string;           // ヘルスチェック URL
  healthCheckRetries?: number;       // リトライ回数（デフォルト: 5）
  healthCheckTimeout?: number;       // タイムアウト（ms、デフォルト: 10000）
  rollbackOnFailure?: boolean;       // 失敗時の自動ロールバック（デフォルト: true）
  buildCommand?: string;             // ビルドコマンド（デフォルト: npm run build）
  deployCommand?: string;            // デプロイコマンド（デフォルト: firebase deploy）
}

/**
 * デプロイメント結果
 */
export interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  deploymentUrl?: string;
  buildTime: number;                 // ビルド時間（ms）
  deployTime: number;                // デプロイ時間（ms）
  healthCheckPassed: boolean;
  healthCheckDetails?: HealthCheckResult;
  rollbackPerformed: boolean;
  error?: string;
}

/**
 * ヘルスチェック結果
 */
export interface HealthCheckResult {
  url: string;
  attempts: number;
  passed: boolean;
  statusCode?: number;
  responseTime?: number;             // レスポンス時間（ms）
  error?: string;
}

/**
 * ロールバック結果
 */
export interface RollbackResult {
  success: boolean;
  previousDeploymentId?: string;
  error?: string;
}

/**
 * DeploymentAgent - CI/CD デプロイ自動化
 *
 * Firebase Hosting への自動デプロイ、ヘルスチェック、失敗時の自動ロールバックを実行する
 *
 * 機能:
 * - Firebase 自動デプロイ
 * - ビルドコマンド実行
 * - ヘルスチェック（5回リトライ）
 * - 失敗時の自動ロールバック
 * - PR へのデプロイ結果コメント
 */
export class DeploymentAgent {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private config: Required<DeploymentConfig>;

  constructor(config: DeploymentConfig = {}) {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error('GITHUB_TOKEN is required');
    }

    this.octokit = new Octokit({ auth: githubToken });

    const repoInfo = process.env.GITHUB_REPOSITORY || 'hiromima/article-generator';
    [this.owner, this.repo] = repoInfo.split('/');

    this.config = {
      healthCheckUrl: config.healthCheckUrl || '',
      healthCheckRetries: config.healthCheckRetries ?? 5,
      healthCheckTimeout: config.healthCheckTimeout ?? 10000,
      rollbackOnFailure: config.rollbackOnFailure ?? true,
      buildCommand: config.buildCommand || 'npm run build',
      deployCommand: config.deployCommand || 'firebase deploy --only hosting'
    };
  }

  /**
   * デプロイメントを実行
   *
   * @returns デプロイメント結果
   */
  async deploy(): Promise<DeploymentResult> {
    console.log('🚀 Starting deployment...');
    console.log('');

    const deploymentId = this.generateDeploymentId();
    let buildTime = 0;
    let deployTime = 0;
    let healthCheckPassed = false;
    let healthCheckDetails: HealthCheckResult | undefined;
    let rollbackPerformed = false;

    try {
      // 1. ビルド実行
      console.log('📦 Building project...');
      const buildStart = Date.now();
      await this.runBuild();
      buildTime = Date.now() - buildStart;
      console.log(`✅ Build completed in ${buildTime}ms`);
      console.log('');

      // 2. デプロイ実行
      console.log('🚀 Deploying to Firebase...');
      const deployStart = Date.now();
      const deploymentUrl = await this.runDeploy();
      deployTime = Date.now() - deployStart;
      console.log(`✅ Deployment completed in ${deployTime}ms`);
      console.log(`🔗 URL: ${deploymentUrl}`);
      console.log('');

      // 3. ヘルスチェック
      if (this.config.healthCheckUrl) {
        console.log('🏥 Running health check...');
        healthCheckDetails = await this.runHealthCheck(this.config.healthCheckUrl);
        healthCheckPassed = healthCheckDetails.passed;

        if (healthCheckPassed) {
          console.log(`✅ Health check passed`);
        } else {
          console.log(`❌ Health check failed: ${healthCheckDetails.error}`);

          // 4. 失敗時のロールバック
          if (this.config.rollbackOnFailure) {
            console.log('');
            console.log('⏪ Performing automatic rollback...');
            const rollbackResult = await this.rollback();
            rollbackPerformed = rollbackResult.success;

            if (rollbackResult.success) {
              console.log('✅ Rollback completed successfully');
            } else {
              console.log(`❌ Rollback failed: ${rollbackResult.error}`);
            }
          }
        }
        console.log('');
      }

      return {
        success: healthCheckPassed || !this.config.healthCheckUrl,
        deploymentId,
        deploymentUrl,
        buildTime,
        deployTime,
        healthCheckPassed,
        healthCheckDetails,
        rollbackPerformed
      };

    } catch (error) {
      console.error('❌ Deployment failed:', error instanceof Error ? error.message : String(error));

      // エラー時のロールバック
      if (this.config.rollbackOnFailure) {
        console.log('');
        console.log('⏪ Performing automatic rollback due to error...');
        const rollbackResult = await this.rollback();
        rollbackPerformed = rollbackResult.success;
      }

      return {
        success: false,
        deploymentId,
        buildTime,
        deployTime,
        healthCheckPassed: false,
        rollbackPerformed,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * ビルドを実行
   */
  private async runBuild(): Promise<void> {
    try {
      const { stderr } = await execAsync(this.config.buildCommand, {
        cwd: process.cwd(),
        env: process.env
      });

      if (stderr && !stderr.includes('npm WARN')) {
        console.log('Build warnings:', stderr);
      }
    } catch (error) {
      throw new Error(`Build failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * デプロイを実行
   *
   * @returns デプロイメント URL
   */
  private async runDeploy(): Promise<string> {
    try {
      const { stdout } = await execAsync(this.config.deployCommand, {
        cwd: process.cwd(),
        env: process.env
      });

      // Firebase デプロイ出力から URL を抽出
      const urlMatch = stdout.match(/Hosting URL: (https:\/\/[^\s]+)/);
      const deploymentUrl = urlMatch ? urlMatch[1] : 'https://deployment-url-not-found';

      return deploymentUrl;
    } catch (error) {
      throw new Error(`Deploy failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * ヘルスチェックを実行
   *
   * @param url - ヘルスチェック URL
   * @returns ヘルスチェック結果
   */
  private async runHealthCheck(url: string): Promise<HealthCheckResult> {
    let attempts = 0;
    let lastError: string | undefined;

    for (let i = 0; i < this.config.healthCheckRetries; i++) {
      attempts++;

      try {
        const start = Date.now();
        const response = await this.fetchWithTimeout(url, this.config.healthCheckTimeout);
        const responseTime = Date.now() - start;

        if (response.ok) {
          return {
            url,
            attempts,
            passed: true,
            statusCode: response.status,
            responseTime
          };
        } else {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }

      // リトライ前の待機（指数バックオフ: 1s, 2s, 4s, 8s, 16s）
      if (i < this.config.healthCheckRetries - 1) {
        const waitTime = Math.pow(2, i) * 1000;
        console.log(`⏳ Health check attempt ${attempts} failed, retrying in ${waitTime}ms...`);
        await this.sleep(waitTime);
      }
    }

    return {
      url,
      attempts,
      passed: false,
      error: lastError || 'Unknown error'
    };
  }

  /**
   * タイムアウト付き fetch
   */
  private async fetchWithTimeout(url: string, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * ロールバックを実行
   *
   * @returns ロールバック結果
   */
  async rollback(): Promise<RollbackResult> {
    try {
      // Firebase の前回のデプロイメントにロールバック
      await execAsync('firebase hosting:rollback', {
        cwd: process.cwd(),
        env: process.env
      });

      // 前回のデプロイメント ID を抽出（実際の実装では履歴から取得）
      const previousDeploymentId = 'previous-deployment-id';

      return {
        success: true,
        previousDeploymentId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * PR にデプロイ結果をコメント
   *
   * @param prNumber - PR 番号
   * @param result - デプロイメント結果
   */
  async commentOnPR(prNumber: number, result: DeploymentResult): Promise<void> {
    const { success, deploymentUrl, buildTime, deployTime, healthCheckPassed, healthCheckDetails, rollbackPerformed, error } = result;

    let body = `## 🚀 Deployment Result\n\n`;

    if (success) {
      body += `✅ **Status**: Successful\n\n`;
      body += `🔗 **URL**: ${deploymentUrl}\n\n`;
    } else {
      body += `❌ **Status**: Failed\n\n`;
      if (error) {
        body += `**Error**: ${error}\n\n`;
      }
    }

    body += `### Build & Deploy Times\n\n`;
    body += `- **Build**: ${buildTime}ms\n`;
    body += `- **Deploy**: ${deployTime}ms\n`;
    body += `- **Total**: ${buildTime + deployTime}ms\n\n`;

    if (healthCheckDetails) {
      body += `### Health Check\n\n`;
      body += `- **URL**: ${healthCheckDetails.url}\n`;
      body += `- **Status**: ${healthCheckPassed ? '✅ Passed' : '❌ Failed'}\n`;
      body += `- **Attempts**: ${healthCheckDetails.attempts}\n`;
      if (healthCheckDetails.statusCode) {
        body += `- **HTTP Status**: ${healthCheckDetails.statusCode}\n`;
      }
      if (healthCheckDetails.responseTime) {
        body += `- **Response Time**: ${healthCheckDetails.responseTime}ms\n`;
      }
      if (healthCheckDetails.error) {
        body += `- **Error**: ${healthCheckDetails.error}\n`;
      }
      body += `\n`;
    }

    if (rollbackPerformed) {
      body += `### Rollback\n\n`;
      body += `⏪ Automatic rollback was performed due to deployment failure.\n\n`;
    }

    body += `---\n\n`;
    body += `🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\n`;
    body += `Co-Authored-By: Claude <noreply@anthropic.com>`;

    try {
      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
        body
      });

      console.log(`✅ Posted deployment result to PR #${prNumber}`);
    } catch (error) {
      console.warn(`⚠️ Could not post comment to PR #${prNumber}:`, error);
    }
  }

  /**
   * デプロイメント ID を生成
   */
  private generateDeploymentId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(7);
    return `deploy-${timestamp}-${random}`;
  }

  /**
   * スリープ
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
