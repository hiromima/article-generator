#!/usr/bin/env tsx
import { Octokit } from '@octokit/rest';
import 'dotenv/config';

interface StateTransitionArgs {
  issue: number;
  to: string;
  reason: string;
}

const STATE_LABELS: Record<string, string> = {
  pending: '📥 state:pending',
  analyzing: '🔍 state:analyzing',
  implementing: '🏗️ state:implementing',
  reviewing: '👀 state:reviewing',
  testing: '🧪 state:testing',
  done: '✅ state:done',
  blocked: '🚫 state:blocked',
  paused: '⏸️ state:paused',
};

async function parseArgs(): Promise<StateTransitionArgs> {
  const args = process.argv.slice(2);
  const params: any = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      params[key] = value;
      i++;
    }
  }

  if (!params.issue || !params.to || !params.reason) {
    throw new Error('Missing required arguments: --issue, --to, --reason');
  }

  return {
    issue: parseInt(params.issue),
    to: params.to,
    reason: params.reason,
  };
}

async function main() {
  const args = await parseArgs();

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || process.env.GITHUB_OWNER + '/' + process.env.GITHUB_REPO || '').split('/');

  if (!token || !owner || !repo) {
    throw new Error('Missing environment variables: GITHUB_TOKEN, GITHUB_REPOSITORY');
  }

  const octokit = new Octokit({ auth: token });

  console.log(`🔄 State Transition for Issue #${args.issue}`);
  console.log(`   From: (current) → To: ${args.to}`);
  console.log(`   Reason: ${args.reason}`);

  // Get current labels
  const { data: issue } = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: args.issue,
  });

  const currentLabels = issue.labels.map((label: any) =>
    typeof label === 'string' ? label : label.name
  );

  // Remove all state labels
  const stateLabelsToRemove = currentLabels.filter((label: string) =>
    Object.values(STATE_LABELS).includes(label)
  );

  for (const label of stateLabelsToRemove) {
    await octokit.rest.issues.removeLabel({
      owner,
      repo,
      issue_number: args.issue,
      name: label,
    });
    console.log(`   🗑️  Removed: ${label}`);
  }

  // Add new state label
  const newLabel = STATE_LABELS[args.to];
  if (!newLabel) {
    throw new Error(`Invalid state: ${args.to}`);
  }

  await octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number: args.issue,
    labels: [newLabel],
  });

  console.log(`   ✅ Added: ${newLabel}`);

  // Add transition comment
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: args.issue,
    body: `## 🔄 State Transition

**New State**: \`${args.to}\`

**Reason**: ${args.reason}

---
*Automated by [State Machine](../.github/workflows/state-machine.yml)*`,
  });

  console.log(`✅ State transition complete`);
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
