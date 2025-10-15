#!/usr/bin/env tsx
/**
 * DeploymentAgent CLI
 *
 * Usage:
 *   npm run deploy -- [--health-check <url>] [--retries <number>] [--timeout <ms>] [--no-rollback] [--pr <pr_number>]
 *   tsx scripts/deploy-cli.ts [--health-check <url>] [--retries <number>] [--timeout <ms>] [--no-rollback] [--pr <pr_number>]
 */

import { DeploymentAgent } from '../src/agents/DeploymentAgent';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const healthCheckIndex = args.indexOf('--health-check');
  const retriesIndex = args.indexOf('--retries');
  const timeoutIndex = args.indexOf('--timeout');
  const noRollback = args.includes('--no-rollback');
  const prIndex = args.indexOf('--pr');
  const buildCommandIndex = args.indexOf('--build-command');
  const deployCommandIndex = args.indexOf('--deploy-command');

  const healthCheckUrl = healthCheckIndex !== -1 && args[healthCheckIndex + 1]
    ? args[healthCheckIndex + 1]
    : undefined;

  const healthCheckRetries = retriesIndex !== -1 && args[retriesIndex + 1]
    ? parseInt(args[retriesIndex + 1], 10)
    : undefined;

  const healthCheckTimeout = timeoutIndex !== -1 && args[timeoutIndex + 1]
    ? parseInt(args[timeoutIndex + 1], 10)
    : undefined;

  const prNumber = prIndex !== -1 && args[prIndex + 1]
    ? parseInt(args[prIndex + 1], 10)
    : undefined;

  const buildCommand = buildCommandIndex !== -1 && args[buildCommandIndex + 1]
    ? args[buildCommandIndex + 1]
    : undefined;

  const deployCommand = deployCommandIndex !== -1 && args[deployCommandIndex + 1]
    ? args[deployCommandIndex + 1]
    : undefined;

  console.log('🚀 DeploymentAgent - CI/CD デプロイ自動化');
  console.log('');

  if (healthCheckUrl) {
    console.log(`🏥 Health Check: ${healthCheckUrl}`);
    console.log(`🔄 Retries: ${healthCheckRetries || 5}`);
    console.log(`⏱️  Timeout: ${healthCheckTimeout || 10000}ms`);
  } else {
    console.log('🏥 Health Check: Disabled');
  }

  console.log(`⏪ Auto Rollback: ${noRollback ? 'No' : 'Yes'}`);

  if (buildCommand) {
    console.log(`📦 Build Command: ${buildCommand}`);
  }
  if (deployCommand) {
    console.log(`🚀 Deploy Command: ${deployCommand}`);
  }

  if (prNumber) {
    console.log(`📝 PR Comment: #${prNumber}`);
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('');

  try {
    const agent = new DeploymentAgent({
      healthCheckUrl,
      healthCheckRetries,
      healthCheckTimeout,
      rollbackOnFailure: !noRollback,
      buildCommand,
      deployCommand
    });

    // デプロイ実行
    const result = await agent.deploy();

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('📊 Deployment Result');
    console.log('═══════════════════════════════════════');
    console.log('');

    if (result.success) {
      console.log('✅ Status: Successful');
      console.log('');
      console.log(`🔗 URL: ${result.deploymentUrl}`);
    } else {
      console.log('❌ Status: Failed');
      console.log('');
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
    }

    console.log('');
    console.log('📊 Build & Deploy Times:');
    console.log(`  ⏱️  Build: ${result.buildTime}ms`);
    console.log(`  ⏱️  Deploy: ${result.deployTime}ms`);
    console.log(`  ⏱️  Total: ${result.buildTime + result.deployTime}ms`);
    console.log('');

    if (result.healthCheckDetails) {
      console.log('🏥 Health Check:');
      console.log(`  🔗 URL: ${result.healthCheckDetails.url}`);
      console.log(`  ${result.healthCheckPassed ? '✅' : '❌'} Status: ${result.healthCheckPassed ? 'Passed' : 'Failed'}`);
      console.log(`  🔄 Attempts: ${result.healthCheckDetails.attempts}`);
      if (result.healthCheckDetails.statusCode) {
        console.log(`  📊 HTTP Status: ${result.healthCheckDetails.statusCode}`);
      }
      if (result.healthCheckDetails.responseTime) {
        console.log(`  ⏱️  Response Time: ${result.healthCheckDetails.responseTime}ms`);
      }
      if (result.healthCheckDetails.error) {
        console.log(`  ❌ Error: ${result.healthCheckDetails.error}`);
      }
      console.log('');
    }

    if (result.rollbackPerformed) {
      console.log('⏪ Rollback:');
      console.log('  Automatic rollback was performed due to deployment failure.');
      console.log('');
    }

    // JSON結果を保存
    const resultPath = join(process.cwd(), '.ai', `deployment-${result.deploymentId}.json`);
    writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf-8');

    console.log('💾 Results saved to:');
    console.log(`  ${resultPath}`);
    console.log('');

    // PR にコメント
    if (prNumber) {
      console.log('📝 Posting deployment result to PR...');
      await agent.commentOnPR(prNumber, result);
      console.log('');
    }

    console.log('═══════════════════════════════════════');
    if (result.success) {
      console.log('🎉 Deployment Complete!');
    } else {
      console.log('❌ Deployment Failed');
    }
    console.log('═══════════════════════════════════════');

    // 失敗時は exit code 1
    if (!result.success) {
      process.exit(1);
    }

  } catch (error) {
    console.error('');
    console.error('❌ Error during deployment:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');
    process.exit(1);
  }
}

main();
