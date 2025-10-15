#!/bin/bash
# Read workflow file content
# Usage: read-workflow.sh <workflow_file>
# Outputs: workflow_content to GITHUB_OUTPUT

set -euo pipefail
trap 'echo "::error::Failed to read workflow file at line $LINENO"' ERR

# Input validation
if [ $# -ne 1 ]; then
    echo "::error::Usage: $0 <workflow_file>"
    exit 1
fi

WORKFLOW_FILE="$1"

# Validate file exists
if [ ! -f "$WORKFLOW_FILE" ]; then
    echo "::error::Workflow file does not exist: ${WORKFLOW_FILE}"
    exit 1
fi

# Read workflow content
WORKFLOW_CONTENT=$(cat "$WORKFLOW_FILE")
echo "::notice::Successfully read workflow file: ${WORKFLOW_FILE}"

# Output to GITHUB_OUTPUT
{
  echo "workflow_content<<EOF"
  echo "$WORKFLOW_CONTENT"
  echo "EOF"
} >> "${GITHUB_OUTPUT:-/dev/stdout}"
