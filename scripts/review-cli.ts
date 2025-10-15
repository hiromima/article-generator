#!/usr/bin/env tsx
/**
 * ReviewAgent CLI
 *
 * Usage:
 *   npm run review -- [--path <path>] [--pr <pr_number>]
 *   tsx scripts/review-cli.ts [--path <path>] [--pr <pr_number>]
 */

import { ReviewAgent } from '../src/agents/ReviewAgent';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const pathIndex = args.indexOf('--path');
  const prIndex = args.indexOf('--pr');

  const targetPath = pathIndex !== -1 && args[pathIndex + 1]
    ? args[pathIndex + 1]
    : 'src/';

  const prNumber = prIndex !== -1 && args[prIndex + 1]
    ? parseInt(args[prIndex + 1], 10)
    : null;

  console.log('👀 ReviewAgent - コード品質判定');
  console.log('');
  console.log(`📂 Target Path: ${targetPath}`);
  if (prNumber) {
    console.log(`🔀 PR: #${prNumber}`);
  }
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('');

  try {
    const agent = new ReviewAgent({
      passingScore: 80,
      eslintEnabled: true,
      typescriptEnabled: true,
      securityEnabled: true
    });

    // レビュー実行
    const result = await agent.review(targetPath);

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📊 Review Results');
    console.log('═══════════════════════════════════════');
    console.log('');

    // スコア表示
    const statusIcon = result.passed ? '✅' : '❌';
    const statusText = result.passed ? 'PASSED' : 'FAILED';

    console.log(`${statusIcon} Overall: ${statusText}`);
    console.log(`🎯 Quality Score: ${result.score}/100`);
    console.log('');

    // 各チェック結果
    console.log('📋 Detailed Checks:');
    console.log('');

    console.log(`  🔧 ESLint: ${result.checks.eslint.score}/100`);
    console.log(`     ${result.checks.eslint.passed ? '✅' : '❌'} ${result.checks.eslint.details}`);
    if (result.checks.eslint.errors.length > 0) {
      console.log(`     Errors: ${result.checks.eslint.errors.length}`);
    }
    if (result.checks.eslint.warnings.length > 0) {
      console.log(`     Warnings: ${result.checks.eslint.warnings.length}`);
    }
    console.log('');

    console.log(`  📘 TypeScript: ${result.checks.typescript.score}/100`);
    console.log(`     ${result.checks.typescript.passed ? '✅' : '❌'} ${result.checks.typescript.details}`);
    if (result.checks.typescript.errors.length > 0) {
      console.log(`     Type Errors: ${result.checks.typescript.errors.length}`);
    }
    console.log('');

    console.log(`  🔒 Security: ${result.checks.security.score}/100`);
    console.log(`     ${result.checks.security.passed ? '✅' : '❌'} ${result.checks.security.details}`);
    if (result.checks.security.errors.length > 0) {
      console.log(`     Critical Issues: ${result.checks.security.errors.length}`);
    }
    if (result.checks.security.warnings.length > 0) {
      console.log(`     Warnings: ${result.checks.security.warnings.length}`);
    }
    console.log('');

    // 推奨事項
    if (result.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      console.log('');
      for (const rec of result.recommendations) {
        console.log(`  • ${rec}`);
      }
      console.log('');
    }

    // エラー詳細（最初の5件のみ）
    if (result.checks.eslint.errors.length > 0) {
      console.log('🔧 ESLint Errors (first 5):');
      console.log('');
      for (const error of result.checks.eslint.errors.slice(0, 5)) {
        console.log(`  - ${error}`);
      }
      if (result.checks.eslint.errors.length > 5) {
        console.log(`  ... and ${result.checks.eslint.errors.length - 5} more`);
      }
      console.log('');
    }

    if (result.checks.typescript.errors.length > 0) {
      console.log('📘 TypeScript Errors (first 5):');
      console.log('');
      for (const error of result.checks.typescript.errors.slice(0, 5)) {
        console.log(`  - ${error}`);
      }
      if (result.checks.typescript.errors.length > 5) {
        console.log(`  ... and ${result.checks.typescript.errors.length - 5} more`);
      }
      console.log('');
    }

    // JSON結果を保存
    const resultPath = join(process.cwd(), '.ai', `review-${Date.now()}.json`);
    writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf-8');

    console.log('💾 Results saved to:');
    console.log(`  ${resultPath}`);
    console.log('');

    // PR コメント投稿
    if (prNumber) {
      console.log(`📝 Posting review comment to PR #${prNumber}...`);
      await agent.postReviewComment(prNumber, result);
      console.log('');
    }

    console.log('═══════════════════════════════════════');
    console.log(`🎉 Review Complete - ${statusText}`);
    console.log('═══════════════════════════════════════');

    // 合格しなかった場合は exit code 1
    if (!result.passed) {
      console.log('');
      console.log('⚠️  Quality score below passing threshold (80)');
      console.log('   Please address the issues above before merging');
      process.exit(1);
    }

  } catch (error) {
    console.error('');
    console.error('❌ Error during review:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    process.exit(1);
  }
}

main();
