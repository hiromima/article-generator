#!/usr/bin/env tsx
/**
 * CoordinatorAgent CLI
 *
 * Usage:
 *   npm run coordinator:analyze -- --issue <issue_number>
 *   tsx scripts/coordinator-cli.ts --issue <issue_number>
 */

import { CoordinatorAgent } from '../src/agents/CoordinatorAgent';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const issueIndex = args.indexOf('--issue');
  if (issueIndex === -1 || !args[issueIndex + 1]) {
    console.error('❌ Error: Missing required argument: --issue <issue_number>');
    console.error('');
    console.error('Usage:');
    console.error('  npm run coordinator:analyze -- --issue <issue_number>');
    console.error('  tsx scripts/coordinator-cli.ts --issue <issue_number>');
    console.error('');
    console.error('Example:');
    console.error('  npm run coordinator:analyze -- --issue 16');
    process.exit(1);
  }

  const issueNumber = parseInt(args[issueIndex + 1], 10);
  if (isNaN(issueNumber)) {
    console.error('❌ Error: Issue number must be a valid number');
    process.exit(1);
  }

  console.log('🤖 CoordinatorAgent - DAGベースタスク分解');
  console.log('');
  console.log(`📋 Analyzing Issue #${issueNumber}...`);
  console.log('');

  try {
    const agent = new CoordinatorAgent();

    // 完全なDAG分析を実行
    const analysis = await agent.analyze(issueNumber);

    // 結果を表示
    console.log('✅ Analysis Complete!');
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📊 DAG Analysis Results');
    console.log('═══════════════════════════════════════');
    console.log('');

    // タスク一覧
    console.log(`📋 Total Tasks: ${analysis.tasks.length}`);
    console.log('');
    for (const task of analysis.tasks) {
      const depsStr = task.dependencies.length > 0
        ? ` (depends on: ${task.dependencies.join(', ')})`
        : ' (no dependencies)';
      console.log(`  ${task.id}: ${task.title}${depsStr}`);
      console.log(`      Agent: ${task.agent} | Complexity: ${task.complexity} | Effort: ${task.effort}`);
    }
    console.log('');

    // Wave並列実行計画
    console.log(`🌊 Waves: ${analysis.waves.length}`);
    console.log('');
    for (const wave of analysis.waves) {
      const parallelStr = wave.canRunInParallel ? '✅ Parallel' : '⏱️ Sequential';
      console.log(`  Wave ${wave.id} (${parallelStr}) - ${wave.estimatedDuration}`);
      for (const task of wave.tasks) {
        console.log(`    - ${task.id}: ${task.title}`);
      }
      if (wave.dependencies.length > 0) {
        console.log(`    Dependencies: ${wave.dependencies.join(', ')}`);
      }
      console.log('');
    }

    // Critical Path
    console.log('🎯 Critical Path:');
    console.log(`  ${analysis.criticalPath.join(' → ')}`);
    console.log('');

    // 効率化分析
    const efficiencyPercent = (analysis.efficiency * 100).toFixed(1);
    console.log('📈 Efficiency Analysis:');
    console.log(`  Total Duration: ${analysis.totalDuration}`);
    console.log(`  Efficiency: ${efficiencyPercent}% reduction (parallel vs sequential)`);
    console.log('');

    // 受け入れ基準チェック
    console.log('✅ Acceptance Criteria:');
    console.log(`  ✅ Issue分解: ${analysis.tasks.length} tasks`);
    console.log(`  ✅ DAG構築: Completed`);
    console.log(`  ✅ Wave計画: ${analysis.waves.length} waves`);
    console.log(`  ✅ Critical Path: ${analysis.criticalPath.length} tasks`);
    console.log(`  ${analysis.efficiency >= 0.5 ? '✅' : '❌'} 効率化率: ${efficiencyPercent}% ${analysis.efficiency >= 0.5 ? '(目標50%達成)' : '(目標50%未達)'}`);
    console.log('');

    // JSONファイルに保存
    const outputPath = join(process.cwd(), '.ai', `coordinator-issue-${issueNumber}.json`);
    writeFileSync(outputPath, JSON.stringify(analysis, null, 2), 'utf-8');

    console.log('💾 Results saved to:');
    console.log(`  ${outputPath}`);
    console.log('');

    console.log('═══════════════════════════════════════');
    console.log('🎉 CoordinatorAgent Analysis Complete!');
    console.log('═══════════════════════════════════════');

  } catch (error) {
    console.error('');
    console.error('❌ Error during analysis:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    process.exit(1);
  }
}

main();
