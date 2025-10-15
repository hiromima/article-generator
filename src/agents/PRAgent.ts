import { Octokit } from '@octokit/rest';
import { Anthropic } from '@anthropic-ai/sdk';
import { exec } from 'child_process';
import { promisify } from 'util';
import 'dotenv/config';

const execAsync = promisify(exec);

/**
 * PR 作成リクエスト
 */
export interface PRRequest {
  issueNumber?: number;        // 関連 Issue 番号
  title?: string;               // PR タイトル
  branch?: string;              // ソースブランチ (デフォルト: 現在のブランチ)
  baseBranch?: string;          // ターゲットブランチ (デフォルト: main)
  draft?: boolean;              // Draft PR として作成
}

/**
 * PR 作成結果
 */
export interface PRResult {
  prNumber: number;
  prUrl: string;
  title: string;
  body: string;
  isDraft: boolean;
  commits: CommitInfo[];
}

/**
 * コミット情報
 */
export interface CommitInfo {
  sha: string;
  message: string;
  type: string;                 // feat, fix, docs, etc.
  scope?: string;
  breaking: boolean;
}

/**
 * PRAgent - Pull Request 自動作成
 *
 * Draft PR を自動作成し、Conventional Commits 準拠のコミットメッセージを解析して
 * PR 説明文を自動生成する
 *
 * 機能:
 * - Draft PR 自動作成
 * - Conventional Commits 準拠
 * - PR 説明自動生成 (Claude Sonnet 4)
 * - レビュアー自動アサイン
 * - Issue 自動リンク
 */
export class PRAgent {
  private octokit: Octokit;
  private anthropic: Anthropic;
  private owner: string;
  private repo: string;

  constructor() {
    const githubToken = process.env.GITHUB_TOKEN;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!githubToken) {
      throw new Error('GITHUB_TOKEN is required');
    }
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }

    this.octokit = new Octokit({ auth: githubToken });
    this.anthropic = new Anthropic({ apiKey });

    const repoInfo = process.env.GITHUB_REPOSITORY || 'hiromima/article-generator';
    [this.owner, this.repo] = repoInfo.split('/');
  }

  /**
   * PR を作成
   *
   * @param request - PR 作成リクエスト
   * @returns PR 作成結果
   */
  async createPR(request: PRRequest = {}): Promise<PRResult> {
    console.log('🔀 Creating Pull Request...');
    console.log('');

    // 現在のブランチを取得
    const branch = request.branch || await this.getCurrentBranch();
    const baseBranch = request.baseBranch || 'main';

    console.log(`📋 Branch: ${branch} → ${baseBranch}`);
    console.log('');

    // コミット履歴を取得
    const commits = await this.getCommits(branch, baseBranch);

    console.log(`📝 Found ${commits.length} commits`);
    console.log('');

    // PR タイトルと本文を生成
    const { title, body } = await this.generatePRContent(commits, request.issueNumber);

    // Draft PR を作成
    const isDraft = request.draft !== undefined ? request.draft : true;

    const pr = await this.octokit.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title: request.title || title,
      body,
      head: branch,
      base: baseBranch,
      draft: isDraft
    });

    console.log(`✅ PR created: #${pr.data.number}`);
    console.log(`🔗 URL: ${pr.data.html_url}`);
    console.log('');

    // Issue にリンク
    if (request.issueNumber) {
      await this.linkIssue(pr.data.number, request.issueNumber);
    }

    return {
      prNumber: pr.data.number,
      prUrl: pr.data.html_url,
      title: pr.data.title,
      body: pr.data.body || '',
      isDraft: pr.data.draft ?? false,
      commits
    };
  }

  /**
   * 現在のブランチを取得
   */
  private async getCurrentBranch(): Promise<string> {
    const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD');
    return stdout.trim();
  }

  /**
   * コミット履歴を取得
   */
  private async getCommits(branch: string, baseBranch: string): Promise<CommitInfo[]> {
    try {
      const { stdout } = await execAsync(
        `git log ${baseBranch}..${branch} --pretty=format:"%H|%s"`
      );

      const commits: CommitInfo[] = [];

      for (const line of stdout.split('\n').filter(l => l.trim())) {
        const [sha, message] = line.split('|');

        // Conventional Commits をパース
        const parsed = this.parseConventionalCommit(message);

        commits.push({
          sha,
          message,
          type: parsed.type,
          scope: parsed.scope,
          breaking: parsed.breaking
        });
      }

      return commits;
    } catch (error) {
      // ブランチ間の差分がない場合
      return [];
    }
  }

  /**
   * Conventional Commits をパース
   */
  private parseConventionalCommit(message: string): {
    type: string;
    scope?: string;
    breaking: boolean;
  } {
    // Format: type(scope)!: subject
    const conventionalRegex = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)/;
    const match = message.match(conventionalRegex);

    if (match) {
      return {
        type: match[1],
        scope: match[2],
        breaking: match[3] === '!'
      };
    }

    // デフォルト
    return {
      type: 'chore',
      breaking: false
    };
  }

  /**
   * PR コンテンツを生成
   */
  private async generatePRContent(
    commits: CommitInfo[],
    issueNumber?: number
  ): Promise<{ title: string; body: string }> {
    // Issue 情報を取得
    let issueTitle = '';
    let issueBody = '';

    if (issueNumber) {
      try {
        const issue = await this.octokit.issues.get({
          owner: this.owner,
          repo: this.repo,
          issue_number: issueNumber
        });

        issueTitle = issue.data.title;
        issueBody = issue.data.body || '';
      } catch {
        // Issue が見つからない場合は無視
      }
    }

    // コミットメッセージを整形
    const commitMessages = commits.map(c => c.message).join('\n');

    // Claude Sonnet 4 で PR 説明を生成
    const prompt = `以下のコミット履歴から、GitHub Pull Request のタイトルと説明文を生成してください。

${issueNumber ? `## 関連 Issue
#${issueNumber}: ${issueTitle}

${issueBody}

` : ''}## コミット履歴
${commitMessages}

# 要件

1. **タイトル**: Conventional Commits 準拠の簡潔なタイトル (50文字以内)
2. **説明文**: 以下の構造で記述
   - ## Summary: 変更内容の要約 (2-3文)
   - ## Changes: 変更点の箇条書き
   - ## Testing: テスト方法 (該当する場合)
   ${issueNumber ? '- Closes #' + issueNumber : ''}

# 出力形式

TITLE:
<タイトル>

BODY:
<説明文>`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // タイトルと本文を抽出
    const text = content.text;
    const titleMatch = text.match(/TITLE:\s*(.+)/);
    const bodyMatch = text.match(/BODY:\s*([\s\S]+)/);

    const title = titleMatch ? titleMatch[1].trim() : commits[0]?.message || 'Update';
    const body = bodyMatch ? bodyMatch[1].trim() : commitMessages;

    return { title, body };
  }

  /**
   * Issue にリンク
   */
  private async linkIssue(prNumber: number, issueNumber: number): Promise<void> {
    try {
      // PR に Issue へのコメントを追加
      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
        body: `Closes #${issueNumber}`
      });

      console.log(`🔗 Linked to Issue #${issueNumber}`);
    } catch (error) {
      console.warn(`⚠️ Could not link to Issue #${issueNumber}`);
    }
  }

  /**
   * PR を Draft から Ready に変更
   *
   * @param prNumber - PR 番号
   */
  async markReady(prNumber: number): Promise<void> {
    // GitHub GraphQL API を使用 (REST API では Draft 解除ができない)
    const mutation = `
      mutation {
        markPullRequestReadyForReview(input: { pullRequestId: $prId }) {
          pullRequest {
            number
            isDraft
          }
        }
      }
    `;

    // PR の GraphQL ID を取得
    const pr = await this.octokit.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber
    });

    // GraphQL の node_id を使用
    const prId = pr.data.node_id;

    await this.octokit.graphql(mutation, {
      prId
    });

    console.log(`✅ PR #${prNumber} marked as ready for review`);
  }

  /**
   * レビュアーをアサイン
   *
   * @param prNumber - PR 番号
   * @param reviewers - レビュアーのユーザー名配列
   */
  async assignReviewers(prNumber: number, reviewers: string[]): Promise<void> {
    await this.octokit.pulls.requestReviewers({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber,
      reviewers
    });

    console.log(`✅ Assigned reviewers: ${reviewers.join(', ')}`);
  }
}
