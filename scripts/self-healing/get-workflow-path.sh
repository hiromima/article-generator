#!/bin/bash
# Get workflow file path by workflow name
# Usage: get-workflow-path.sh <workflow_name>
# Outputs: workflow_file and workflow_exists to GITHUB_OUTPUT

set -euo pipefail
trap 'echo "::error::Failed to get workflow file path at line $LINENO"' ERR

# Input validation
if [ $# -ne 1 ]; then
    echo "::error::Usage: $0 <workflow_name>"
    exit 1
fi

WORKFLOW_NAME="$1"

# Find workflow file
# Use grep -F for literal match and grep -w for whole word match
WORKFLOW_FILE=$(find .github/workflows \( -name "*.yml" -o -name "*.yaml" \) -print0 2>/dev/null | \
    xargs -0 grep -l "^name: ${WORKFLOW_NAME}$" 2>/dev/null | head -1 || echo "")

# Output results
if [ -z "$WORKFLOW_FILE" ]; then
    echo "::warning::Workflow file not found for: ${WORKFLOW_NAME}"
    echo "workflow_file=.github/workflows/unknown.yml" >> "${GITHUB_OUTPUT:-/dev/stdout}"
    echo "workflow_exists=false" >> "${GITHUB_OUTPUT:-/dev/stdout}"
else
    echo "::notice::Found workflow file: ${WORKFLOW_FILE}"
    echo "workflow_file=${WORKFLOW_FILE}" >> "${GITHUB_OUTPUT:-/dev/stdout}"
    echo "workflow_exists=true" >> "${GITHUB_OUTPUT:-/dev/stdout}"
fi
