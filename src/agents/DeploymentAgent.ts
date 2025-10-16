import { Octokit } from '@octokit/rest';
import { exec } from 'child_process';
import { promisify } from 'util';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  notePostingEnabled?: boolean;      // note.com投稿有効化（デフォルト: false）
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
  notePostResult?: NotePostResult;   // note.com投稿結果
  error?: string;
}

/**
 * note.com投稿結果
 */
export interface NotePostResult {
  success: boolean;
  noteUrl?: string;                  // 投稿されたnoteのURL
  postTime: number;                  // 投稿時間（ms）
  generatedImages?: GeneratedImage[]; // 生成された画像
  error?: string;
}

/**
 * 生成画像情報
 */
export interface GeneratedImage {
  type: 'eyecatch' | 'section';      // 画像タイプ
  prompt: string;                     // 生成プロンプト
  url?: string;                       // 画像URL（ローカルパス）
  base64Data?: string;                // Base64エンコード画像データ
  sectionIndex?: number;              // セクションインデックス（section画像の場合）
  generationTime: number;             // 生成時間（ms）
  success: boolean;
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
  private _genAI: GoogleGenerativeAI;  // 将来のGemini Image API統合用

  constructor(config: DeploymentConfig = {}) {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error('GITHUB_TOKEN is required');
    }

    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (!googleApiKey) {
      throw new Error('GOOGLE_API_KEY is required for image generation');
    }

    this.octokit = new Octokit({ auth: githubToken });
    this._genAI = new GoogleGenerativeAI(googleApiKey);

    const repoInfo = process.env.GITHUB_REPOSITORY || 'hiromima/article-generator';
    [this.owner, this.repo] = repoInfo.split('/');

    this.config = {
      healthCheckUrl: config.healthCheckUrl || '',
      healthCheckRetries: config.healthCheckRetries ?? 5,
      healthCheckTimeout: config.healthCheckTimeout ?? 10000,
      rollbackOnFailure: config.rollbackOnFailure ?? true,
      buildCommand: config.buildCommand || 'npm run build',
      deployCommand: config.deployCommand || 'firebase deploy --only hosting',
      notePostingEnabled: config.notePostingEnabled ?? false
    };
  }

  /**
   * 記事から画像を生成（nano banana）
   *
   * @param articleContent - 記事コンテンツ（Markdown形式）
   * @param title - 記事タイトル
   * @returns 生成された画像配列
   */
  async generateArticleImages(articleContent: string, title: string): Promise<GeneratedImage[]> {
    console.log('🎨 Generating images with Gemini 2.5 Flash (nano banana)...');
    console.log('');

    const images: GeneratedImage[] = [];

    try {
      // 1. アイキャッチ画像を生成
      console.log('🖼️ Generating eyecatch image...');
      const eyecatchImage = await this.generateEyecatchImage(title, articleContent);
      images.push(eyecatchImage);

      if (eyecatchImage.success) {
        console.log(`✅ Eyecatch image generated in ${eyecatchImage.generationTime}ms`);
      } else {
        console.log(`❌ Eyecatch image generation failed: ${eyecatchImage.error}`);
      }

      // 2. セクション画像を生成
      const sections = this.extractSections(articleContent);
      console.log(`📝 Found ${sections.length} sections`);

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        console.log(`🎨 Generating section ${i + 1}/${sections.length} image...`);

        const sectionImage = await this.generateSectionImage(section, i);
        images.push(sectionImage);

        if (sectionImage.success) {
          console.log(`✅ Section ${i + 1} image generated in ${sectionImage.generationTime}ms`);
        } else {
          console.log(`❌ Section ${i + 1} image generation failed: ${sectionImage.error}`);
        }
      }

      const successCount = images.filter(img => img.success).length;
      console.log('');
      console.log(`🎨 Image generation complete: ${successCount}/${images.length} successful`);

      return images;

    } catch (error) {
      console.error('❌ Image generation failed:', error instanceof Error ? error.message : String(error));
      return images;
    }
  }

  /**
   * アイキャッチ画像を生成
   *
   * @param title - 記事タイトル
   * @param articleContent - 記事コンテンツ
   * @returns 生成画像情報
   */
  private async generateEyecatchImage(title: string, articleContent: string): Promise<GeneratedImage> {
    const startTime = Date.now();

    try {
      // 記事の要約を生成してプロンプトに使用
      const summary = this.summarizeArticle(articleContent);

      const prompt = `Create a professional and eye-catching hero image for an article titled "${title}".
The article is about: ${summary}

Style: Modern, clean, professional
Focus: Visual representation of the main concept
Quality: High-resolution, suitable for article header
Mood: Engaging and informative`;

      // Gemini 2.5 Flash Image API を使用
      const model = this._genAI.getGenerativeModel({
        model: 'models/gemini-2.5-flash-image'
      });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const response = result.response;
      const generationTime = Date.now() - startTime;

      // 画像データを取得
      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        return {
          type: 'eyecatch',
          prompt,
          generationTime,
          success: false,
          error: 'No candidates returned from Gemini Image API'
        };
      }

      const parts = candidates[0].content?.parts;
      if (!parts || parts.length === 0) {
        return {
          type: 'eyecatch',
          prompt,
          generationTime,
          success: false,
          error: 'No parts in response'
        };
      }

      // 画像データを探す（base64またはinlineData形式）
      const imagePart = parts.find((part: any) => part.inlineData || part.image);
      if (!imagePart) {
        return {
          type: 'eyecatch',
          prompt,
          generationTime,
          success: false,
          error: 'No image data in response'
        };
      }

      // Base64データを取得
      const base64Data = (imagePart as any).inlineData?.data || (imagePart as any).image?.data;
      if (!base64Data) {
        return {
          type: 'eyecatch',
          prompt,
          generationTime,
          success: false,
          error: 'Could not extract base64 data from image part'
        };
      }

      return {
        type: 'eyecatch',
        prompt,
        base64Data,
        generationTime,
        success: true
      };

    } catch (error) {
      const generationTime = Date.now() - startTime;
      return {
        type: 'eyecatch',
        prompt: `Eyecatch image for "${title}"`,
        generationTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * セクション画像を生成
   *
   * @param section - セクション情報
   * @param index - セクションインデックス
   * @returns 生成画像情報
   */
  private async generateSectionImage(section: { title: string; content: string }, index: number): Promise<GeneratedImage> {
    const startTime = Date.now();

    try {
      const prompt = `Create an illustrative image for a section titled "${section.title}".
Content summary: ${section.content.substring(0, 200)}...

Style: Modern, clean, relevant to the content
Focus: Visual support for the section content
Quality: High-resolution, suitable for inline article image
Mood: Educational and professional`;

      // Gemini 2.5 Flash Image API を使用
      const model = this._genAI.getGenerativeModel({
        model: 'models/gemini-2.5-flash-image'
      });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const response = result.response;
      const generationTime = Date.now() - startTime;

      // 画像データを取得
      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) {
        return {
          type: 'section',
          prompt,
          sectionIndex: index,
          generationTime,
          success: false,
          error: 'No candidates returned from Gemini Image API'
        };
      }

      const parts = candidates[0].content?.parts;
      if (!parts || parts.length === 0) {
        return {
          type: 'section',
          prompt,
          sectionIndex: index,
          generationTime,
          success: false,
          error: 'No parts in response'
        };
      }

      // 画像データを探す（base64またはinlineData形式）
      const imagePart = parts.find((part: any) => part.inlineData || part.image);
      if (!imagePart) {
        return {
          type: 'section',
          prompt,
          sectionIndex: index,
          generationTime,
          success: false,
          error: 'No image data in response'
        };
      }

      // Base64データを取得
      const base64Data = (imagePart as any).inlineData?.data || (imagePart as any).image?.data;
      if (!base64Data) {
        return {
          type: 'section',
          prompt,
          sectionIndex: index,
          generationTime,
          success: false,
          error: 'Could not extract base64 data from image part'
        };
      }

      return {
        type: 'section',
        prompt,
        base64Data,
        sectionIndex: index,
        generationTime,
        success: true
      };

    } catch (error) {
      const generationTime = Date.now() - startTime;
      return {
        type: 'section',
        prompt: `Section image for "${section.title}"`,
        sectionIndex: index,
        generationTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 記事からセクションを抽出
   *
   * @param articleContent - 記事コンテンツ
   * @returns セクション配列
   */
  private extractSections(articleContent: string): Array<{ title: string; content: string }> {
    const sections: Array<{ title: string; content: string }> = [];

    // H2見出しでセクションを分割
    const h2Regex = /^## (.+)$/gm;
    const matches = Array.from(articleContent.matchAll(h2Regex));

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const title = match[1];
      const startIndex = match.index! + match[0].length;
      const endIndex = i < matches.length - 1 ? matches[i + 1].index! : articleContent.length;

      const content = articleContent.substring(startIndex, endIndex).trim();

      sections.push({ title, content });
    }

    return sections;
  }

  /**
   * 記事を要約
   *
   * @param articleContent - 記事コンテンツ
   * @returns 要約文
   */
  private summarizeArticle(articleContent: string): string {
    // 最初の段落を抽出して要約として使用
    const firstParagraph = articleContent
      .split('\n\n')
      .find(para => para.trim().length > 50 && !para.startsWith('#'));

    return firstParagraph?.substring(0, 300) || 'Article summary not available';
  }

  /**
   * note.comへ記事を投稿
   *
   * @param articleContent - 記事コンテンツ（Markdown形式）
   * @param title - 記事タイトル
   * @param images - 生成された画像（オプション）
   * @returns 投稿結果
   */
  async postToNote(articleContent: string, title: string, images?: GeneratedImage[]): Promise<NotePostResult> {
    if (!this.config.notePostingEnabled) {
      return {
        success: false,
        postTime: 0,
        error: 'note.com posting is not enabled'
      };
    }

    console.log('📝 Posting article to note.com...');
    const startTime = Date.now();

    try {
      // 1. 画像生成（画像が提供されていない場合）
      let generatedImages = images;
      if (!generatedImages) {
        console.log('');
        generatedImages = await this.generateArticleImages(articleContent, title);
        console.log('');
      }

      // 2. note.com投稿（Playwright使用）
      // TODO: Playwright を使用したnote.com自動投稿
      // TODO: クリップボード経由の投稿
      // TODO: 既存セッションの利用
      // TODO: 画像アップロード統合

      const postTime = Date.now() - startTime;

      // スタブ実装: 実際の投稿は未実装
      console.log('⚠️ note.com posting is not fully implemented yet');
      console.log('📌 Will be implemented in Issue #52');

      return {
        success: false,
        postTime,
        generatedImages,
        error: 'Not implemented - see Issue #52'
      };

    } catch (error) {
      const postTime = Date.now() - startTime;
      return {
        success: false,
        postTime,
        generatedImages: images,
        error: error instanceof Error ? error.message : String(error)
      };
    }
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
