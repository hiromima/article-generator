#!/bin/bash
# Record Self-Healing Agent metrics
# Usage: record-metrics.sh <issue_number> <status> <start_time> <end_time> <workflow_name>
# Outputs: Appends metrics to issue comment

set -euo pipefail
trap 'echo "::error::Failed to record metrics at line $LINENO"' ERR

# Input validation
if [ $# -ne 5 ]; then
    echo "::error::Usage: $0 <issue_number> <status> <start_time> <end_time> <workflow_name>"
    exit 1
fi

ISSUE_NUMBER="$1"
STATUS="$2"
START_TIME="$3"
END_TIME="$4"
WORKFLOW_NAME="$5"

# Calculate duration
DURATION=$((END_TIME - START_TIME))
DURATION_MIN=$((DURATION / 60))
DURATION_SEC=$((DURATION % 60))

# Get current date
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M:%S UTC')

# Determine emoji based on status
if [ "$STATUS" = "success" ]; then
    EMOJI="✅"
    STATUS_TEXT="成功"
elif [ "$STATUS" = "failure" ]; then
    EMOJI="❌"
    STATUS_TEXT="失敗"
else
    EMOJI="⚠️"
    STATUS_TEXT="不明"
fi

# Create metrics comment
cat > /tmp/metrics_comment.md << EOF
---

## 📊 Self-Healing Metrics

**タイムスタンプ**: ${TIMESTAMP}
**ワークフロー**: \`${WORKFLOW_NAME}\`
**ステータス**: ${EMOJI} ${STATUS_TEXT}
**実行時間**: ${DURATION_MIN}分${DURATION_SEC}秒

### 詳細

| 項目 | 値 |
|------|-----|
| 開始時刻 | $(date -u -r "${START_TIME}" '+%Y-%m-%d %H:%M:%S UTC') |
| 終了時刻 | $(date -u -r "${END_TIME}" '+%Y-%m-%d %H:%M:%S UTC') |
| 実行時間 | ${DURATION}秒 |

EOF

# Append metrics to issue
if [ -n "${GH_TOKEN:-}" ]; then
    gh issue comment "${ISSUE_NUMBER}" --body-file /tmp/metrics_comment.md || {
        echo "::warning::Failed to add metrics comment to issue #${ISSUE_NUMBER}"
        exit 0
    }
    echo "::notice::Metrics recorded to issue #${ISSUE_NUMBER}"
else
    echo "::warning::GH_TOKEN not set, metrics not recorded"
    cat /tmp/metrics_comment.md
fi
