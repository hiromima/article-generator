#!/usr/bin/env tsx
/**
 * CodeGenAgent CLI
 *
 * Usage:
 *   npm run codegen:generate -- --issue <issue_number> --task "<description>" --lang <typescript|javascript>
 *   tsx scripts/codegen-cli.ts --issue <issue_number> --task "<description>" --lang <typescript|javascript>
 */

import { CodeGenAgent, CodeGenRequest } from '../src/agents/CodeGenAgent';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const issueIndex = args.indexOf('--issue');
  const taskIndex = args.indexOf('--task');
  const langIndex = args.indexOf('--lang');

  if (issueIndex === -1 || !args[issueIndex + 1]) {
    console.error('❌ Error: Missing required argument: --issue <issue_number>');
    showUsage();
    process.exit(1);
  }

  if (taskIndex === -1 || !args[taskIndex + 1]) {
    console.error('❌ Error: Missing required argument: --task "<description>"');
    showUsage();
    process.exit(1);
  }

  const issueNumber = parseInt(args[issueIndex + 1], 10);
  if (isNaN(issueNumber)) {
    console.error('❌ Error: Issue number must be a valid number');
    process.exit(1);
  }

  const taskDescription = args[taskIndex + 1];
  const language = (args[langIndex + 1] || 'typescript') as 'typescript' | 'javascript';

  if (!['typescript', 'javascript'].includes(language)) {
    console.error('❌ Error: Language must be "typescript" or "javascript"');
    process.exit(1);
  }

  console.log('💻 CodeGenAgent - AI駆動コード生成');
  console.log('');
  console.log(`📋 Issue #${issueNumber}`);
  console.log(`🎯 Task: ${taskDescription}`);
  console.log(`🔧 Language: ${language}`);
  console.log('');
  console.log('🤖 Generating code with Claude Sonnet 4...');
  console.log('');

  try {
    const agent = new CodeGenAgent();

    const request: CodeGenRequest = {
      issueNumber,
      taskDescription,
      language,
      requirements: [
        'TypeScript strict mode完全対応',
        'テストカバレッジ80%以上',
        'TSDoc/JSDocドキュメント',
        'エラーハンドリング完備'
      ]
    };

    // コード生成と検証
    const result = await agent.generateAndValidate(request);

    console.log('✅ Code Generation Complete!');
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📊 Generation Results');
    console.log('═══════════════════════════════════════');
    console.log('');

    // ファイル名
    console.log(`📄 File Name: ${result.fileName}`);
    console.log(`🔧 Language: ${result.language}`);
    console.log('');

    // ソースコード
    if (result.sourceCode) {
      console.log('📝 Source Code:');
      console.log('─────────────────────────────────────');
      console.log(result.sourceCode.substring(0, 500));
      if (result.sourceCode.length > 500) {
        console.log('...(truncated)');
      }
      console.log('─────────────────────────────────────');
      console.log('');
    }

    // テストコード
    if (result.testCode) {
      console.log('✅ Test Code Generated');
      console.log('');
    }

    // ドキュメント
    if (result.documentation) {
      console.log('📚 Documentation Generated');
      console.log('');
    }

    // コンパイル結果
    if (language === 'typescript') {
      console.log('🔍 Compilation Check:');
      if (result.compilationSuccess) {
        console.log('  ✅ Compilation: SUCCESS');
        console.log('  ✅ Type Errors: 0');
      } else {
        console.log('  ❌ Compilation: FAILED');
        console.log('  ❌ Errors:');
        for (const error of result.errors) {
          console.log(`     - ${error}`);
        }
      }
      console.log('');
    }

    // 受け入れ基準チェック
    console.log('✅ Acceptance Criteria:');
    console.log(`  ${result.sourceCode ? '✅' : '❌'} ソースコード生成`);
    console.log(`  ${result.testCode ? '✅' : '❌'} テストコード生成`);
    console.log(`  ${result.documentation ? '✅' : '❌'} ドキュメント生成`);
    if (language === 'typescript') {
      console.log(`  ${result.compilationSuccess ? '✅' : '❌'} TypeScript strict mode対応（型エラー0件）`);
    }
    console.log('');

    // ファイル保存
    const outputDir = join(process.cwd(), '.ai', 'generated');
    await agent.saveGeneratedCode(result, join(outputDir, 'src'));

    console.log('💾 Files saved to:');
    console.log(`  Source: .ai/generated/src/${result.fileName}`);
    if (result.testCode) {
      const testFileName = result.fileName.replace(/\.(ts|js)$/, '.test.$1');
      console.log(`  Test: .ai/generated/tests/${testFileName}`);
    }
    if (result.documentation) {
      const docFileName = result.fileName.replace(/\.(ts|js)$/, '.md');
      console.log(`  Docs: .ai/generated/docs/${docFileName}`);
    }
    console.log('');

    // JSON結果を保存
    const resultPath = join(process.cwd(), '.ai', `codegen-issue-${issueNumber}.json`);
    writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf-8');

    console.log('💾 Results saved to:');
    console.log(`  ${resultPath}`);
    console.log('');

    console.log('═══════════════════════════════════════');
    console.log('🎉 CodeGenAgent Complete!');
    console.log('═══════════════════════════════════════');

    if (!result.compilationSuccess && language === 'typescript') {
      console.log('');
      console.log('⚠️  Warning: Compilation errors detected.');
      console.log('    Please review and fix the errors before using the code.');
      process.exit(1);
    }

  } catch (error) {
    console.error('');
    console.error('❌ Error during code generation:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    process.exit(1);
  }
}

function showUsage() {
  console.error('');
  console.error('Usage:');
  console.error('  npm run codegen:generate -- --issue <issue_number> --task "<description>" [--lang <language>]');
  console.error('  tsx scripts/codegen-cli.ts --issue <issue_number> --task "<description>" [--lang <language>]');
  console.error('');
  console.error('Arguments:');
  console.error('  --issue <number>      GitHub Issue number (required)');
  console.error('  --task "<text>"       Task description (required)');
  console.error('  --lang <language>     typescript or javascript (default: typescript)');
  console.error('');
  console.error('Example:');
  console.error('  npm run codegen:generate -- --issue 19 --task "Implement UserService class"');
  console.error('');
}

main();
