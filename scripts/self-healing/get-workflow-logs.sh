#!/bin/bash
# Get workflow logs for failed jobs
# Usage: get-workflow-logs.sh <run_id> <repository>
# Outputs: logs_url, error_summary, and saves failed_jobs.json to GITHUB_OUTPUT

set -euo pipefail
trap 'echo "::error::Failed to get workflow logs at line $LINENO"' ERR

# Input validation
if [ $# -ne 2 ]; then
    echo "::error::Usage: $0 <run_id> <repository>"
    exit 1
fi

RUN_ID="$1"
REPOSITORY="$2"

# Validate inputs
if ! [[ "$RUN_ID" =~ ^[0-9]+$ ]]; then
    echo "::error::Invalid run_id: ${RUN_ID} (must be numeric)"
    exit 1
fi

if ! [[ "$REPOSITORY" =~ ^[^/]+/[^/]+$ ]]; then
    echo "::error::Invalid repository format: ${REPOSITORY} (expected: owner/repo)"
    exit 1
fi

echo "::notice::Fetching logs for run ID: ${RUN_ID}"

# Get failed jobs with error handling
if ! FAILED_JOBS=$(gh api "/repos/${REPOSITORY}/actions/runs/${RUN_ID}/jobs" \
  --jq '.jobs[] | select(.conclusion == "failure") | {name: .name, steps: [.steps[] | select(.conclusion == "failure") | {name: .name, number: .number}]}' 2>&1); then
  echo "::error::Failed to fetch workflow logs: ${FAILED_JOBS}"
  exit 1
fi

# Save to file for Gemini
echo "$FAILED_JOBS" > /tmp/failed_jobs.json

# Get logs URL
LOGS_URL="https://github.com/${REPOSITORY}/actions/runs/${RUN_ID}"
echo "logs_url=${LOGS_URL}" >> "${GITHUB_OUTPUT:-/dev/stdout}"

# Extract error summary
ERROR_SUMMARY=$(echo "$FAILED_JOBS" | head -20)
{
  echo "error_summary<<EOF"
  echo "$ERROR_SUMMARY"
  echo "EOF"
} >> "${GITHUB_OUTPUT:-/dev/stdout}"

echo "::notice::Successfully extracted error summary"
