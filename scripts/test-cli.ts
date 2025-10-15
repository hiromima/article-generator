#!/usr/bin/env tsx
/**
 * TestAgent CLI
 *
 * Usage:
 *   npm run test:agent -- [--pattern <pattern>] [--pr <pr_number>] [--no-coverage]
 *   tsx scripts/test-cli.ts [--pattern <pattern>] [--pr <pr_number>] [--no-coverage]
 */

import { TestAgent } from '../src/agents/TestAgent';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const patternIndex = args.indexOf('--pattern');
  const prIndex = args.indexOf('--pr');
  const noCoverage = args.includes('--no-coverage');

  const testPattern = patternIndex !== -1 && args[patternIndex + 1]
    ? args[patternIndex + 1]
    : undefined;

  const prNumber = prIndex !== -1 && args[prIndex + 1]
    ? parseInt(args[prIndex + 1], 10)
    : null;

  console.log('🧪 TestAgent - テスト自動実行');
  console.log('');
  if (testPattern) {
    console.log(`📋 Pattern: ${testPattern}`);
  }
  if (prNumber) {
    console.log(`🔀 PR: #${prNumber}`);
  }
  console.log(`📊 Coverage: ${noCoverage ? 'Disabled' : 'Enabled'}`);
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('');

  try {
    const agent = new TestAgent({
      coverageEnabled: !noCoverage,
      coverageThreshold: 80,
      timeout: 120000
    });

    // テスト実行
    const result = await agent.runTests(testPattern);

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📊 Test Results');
    console.log('═══════════════════════════════════════');
    console.log('');

    // 結果表示
    const statusIcon = result.passed ? '✅' : '❌';
    const statusText = result.passed ? 'PASSED' : 'FAILED';

    console.log(`${statusIcon} Overall: ${statusText}`);
    console.log('');

    console.log(`📋 Tests:`);
    console.log(`   Total:   ${result.totalTests}`);
    console.log(`   Passed:  ${result.passedTests}`);
    console.log(`   Failed:  ${result.failedTests}`);
    console.log(`   Skipped: ${result.skippedTests}`);
    console.log('');

    console.log(`⏱️  Duration: ${result.duration.toFixed(2)}s`);
    console.log('');

    // カバレッジ表示
    if (result.coverage) {
      console.log('📊 Coverage:');
      console.log(`   Lines:      ${result.coverage.lines.percentage.toFixed(2)}% (${result.coverage.lines.covered}/${result.coverage.lines.total})`);
      console.log(`   Statements: ${result.coverage.statements.percentage.toFixed(2)}% (${result.coverage.statements.covered}/${result.coverage.statements.total})`);
      console.log(`   Functions:  ${result.coverage.functions.percentage.toFixed(2)}% (${result.coverage.functions.covered}/${result.coverage.functions.total})`);
      console.log(`   Branches:   ${result.coverage.branches.percentage.toFixed(2)}% (${result.coverage.branches.covered}/${result.coverage.branches.total})`);
      console.log('');

      if (result.coverage.meetsThreshold) {
        console.log(`   ✅ Coverage threshold met (80%+)`);
      } else {
        console.log(`   ❌ Coverage below threshold (80%+)`);
      }
      console.log('');
    }

    // 失敗テスト表示
    if (result.failures.length > 0) {
      console.log(`❌ Failed Tests (${result.failures.length}):`);
      console.log('');

      for (const failure of result.failures.slice(0, 5)) {
        console.log(`   ${failure.testName}`);
        console.log(`   ${failure.errorMessage.split('\n')[0]}`);
        console.log('');
      }

      if (result.failures.length > 5) {
        console.log(`   ... and ${result.failures.length - 5} more failures`);
        console.log('');
      }
    }

    // JSON結果を保存
    const resultPath = join(process.cwd(), '.ai', `test-${Date.now()}.json`);
    writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf-8');

    console.log('💾 Results saved to:');
    console.log(`  ${resultPath}`);
    console.log('');

    // PR コメント投稿
    if (prNumber) {
      console.log(`📝 Posting test results to PR #${prNumber}...`);
      await agent.postTestComment(prNumber, result);
      console.log('');
    }

    console.log('═══════════════════════════════════════');
    console.log(`🎉 Test Complete - ${statusText}`);
    console.log('═══════════════════════════════════════');

    // テスト失敗時は exit code 1
    if (!result.passed) {
      console.log('');
      console.log('⚠️  Tests failed');
      console.log('   Please fix the failing tests before merging');
      process.exit(1);
    }

    // カバレッジしきい値未達成時も exit code 1
    if (result.coverage && !result.coverage.meetsThreshold) {
      console.log('');
      console.log('⚠️  Coverage below threshold (80%)');
      console.log('   Please add more tests to improve coverage');
      process.exit(1);
    }

  } catch (error) {
    console.error('');
    console.error('❌ Error during test execution:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    process.exit(1);
  }
}

main();
