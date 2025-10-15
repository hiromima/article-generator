#!/usr/bin/env tsx
/**
 * PRAgent CLI
 *
 * Usage:
 *   npm run pr:create -- [--issue <issue_number>] [--title "<title>"] [--branch <branch>] [--base <base>] [--ready]
 *   tsx scripts/pr-cli.ts [--issue <issue_number>] [--title "<title>"] [--branch <branch>] [--base <base>] [--ready]
 */

import { PRAgent } from '../src/agents/PRAgent';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const issueIndex = args.indexOf('--issue');
  const titleIndex = args.indexOf('--title');
  const branchIndex = args.indexOf('--branch');
  const baseIndex = args.indexOf('--base');
  const ready = args.includes('--ready');

  const issueNumber = issueIndex !== -1 && args[issueIndex + 1]
    ? parseInt(args[issueIndex + 1], 10)
    : undefined;

  const title = titleIndex !== -1 && args[titleIndex + 1]
    ? args[titleIndex + 1]
    : undefined;

  const branch = branchIndex !== -1 && args[branchIndex + 1]
    ? args[branchIndex + 1]
    : undefined;

  const baseBranch = baseIndex !== -1 && args[baseIndex + 1]
    ? args[baseIndex + 1]
    : 'main';

  console.log('🔀 PRAgent - Pull Request 自動作成');
  console.log('');

  if (issueNumber) {
    console.log(`📋 Issue: #${issueNumber}`);
  }
  if (title) {
    console.log(`📝 Title: ${title}`);
  }
  console.log(`🌿 Branch: ${branch || '(current)'} → ${baseBranch}`);
  console.log(`📊 Draft: ${ready ? 'No (Ready for review)' : 'Yes'}`);
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('');

  try {
    const agent = new PRAgent();

    // PR 作成
    const result = await agent.createPR({
      issueNumber,
      title,
      branch,
      baseBranch,
      draft: !ready
    });

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📊 PR Created');
    console.log('═══════════════════════════════════════');
    console.log('');

    console.log(`✅ PR #${result.prNumber}`);
    console.log(`🔗 URL: ${result.prUrl}`);
    console.log('');

    console.log(`📝 Title: ${result.title}`);
    console.log('');

    console.log('📋 Description:');
    console.log('─────────────────────────────────────');
    console.log(result.body.substring(0, 300));
    if (result.body.length > 300) {
      console.log('...(truncated)');
    }
    console.log('─────────────────────────────────────');
    console.log('');

    console.log(`📊 Status: ${result.isDraft ? 'Draft' : 'Ready for review'}`);
    console.log(`📝 Commits: ${result.commits.length}`);
    console.log('');

    // コミット一覧
    if (result.commits.length > 0) {
      console.log('📋 Commits:');
      for (const commit of result.commits.slice(0, 5)) {
        const typeEmoji = getTypeEmoji(commit.type);
        console.log(`  ${typeEmoji} ${commit.type}${commit.scope ? `(${commit.scope})` : ''}: ${commit.message.substring(0, 60)}`);
      }
      if (result.commits.length > 5) {
        console.log(`  ... and ${result.commits.length - 5} more commits`);
      }
      console.log('');
    }

    // JSON結果を保存
    const resultPath = join(process.cwd(), '.ai', `pr-${result.prNumber}.json`);
    writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf-8');

    console.log('💾 Results saved to:');
    console.log(`  ${resultPath}`);
    console.log('');

    // Ready for review に変更
    if (ready && result.isDraft) {
      console.log('📝 Marking PR as ready for review...');
      await agent.markReady(result.prNumber);
      console.log('');
    }

    console.log('═══════════════════════════════════════');
    console.log('🎉 PR Creation Complete!');
    console.log('═══════════════════════════════════════');

  } catch (error) {
    console.error('');
    console.error('❌ Error during PR creation:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    process.exit(1);
  }
}

function getTypeEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    feat: '✨',
    fix: '🐛',
    docs: '📚',
    style: '💄',
    refactor: '♻️',
    test: '✅',
    chore: '🔧',
    perf: '⚡',
    ci: '👷',
    build: '📦',
    revert: '⏪'
  };

  return emojiMap[type] || '📝';
}

main();
