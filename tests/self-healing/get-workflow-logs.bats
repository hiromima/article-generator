#!/usr/bin/env bats
# Unit tests for get-workflow-logs.sh

# Setup: Create temporary test directory
setup() {
    export TEST_DIR="$(mktemp -d)"
    export GITHUB_OUTPUT="${TEST_DIR}/output.txt"

    # Mock gh command for testing
    export PATH="${TEST_DIR}/bin:${PATH}"
    mkdir -p "${TEST_DIR}/bin"

    # Change to test directory
    cd "${TEST_DIR}"
}

# Teardown: Clean up
teardown() {
    rm -rf "${TEST_DIR}"
}

# Helper: Create mock gh command
create_mock_gh() {
    local exit_code="${1:-0}"
    local output="${2:-}"

    cat > "${TEST_DIR}/bin/gh" << EOF
#!/bin/bash
if [ "\$1" = "api" ]; then
    if [ ${exit_code} -eq 0 ]; then
        echo '${output}'
        exit 0
    else
        echo "API error" >&2
        exit 1
    fi
fi
EOF
    chmod +x "${TEST_DIR}/bin/gh"
}

@test "successfully fetches workflow logs" {
    # Mock successful API response
    MOCK_OUTPUT='{"name":"test-job","steps":[{"name":"test-step","number":1}]}'
    create_mock_gh 0 "$MOCK_OUTPUT"

    run bash "${BATS_TEST_DIRNAME}/../../scripts/self-healing/get-workflow-logs.sh" "12345" "owner/repo"

    [ "$status" -eq 0 ]
    grep -q "logs_url=https://github.com/owner/repo/actions/runs/12345" "${GITHUB_OUTPUT}"
    grep -q "error_summary<<EOF" "${GITHUB_OUTPUT}"
    [ -f "/tmp/failed_jobs.json" ]
}

@test "handles missing arguments" {
    run bash "${BATS_TEST_DIRNAME}/../../scripts/self-healing/get-workflow-logs.sh"

    [ "$status" -eq 1 ]
    [[ "$output" == *"Usage"* ]]
}

@test "handles invalid run_id (non-numeric)" {
    run bash "${BATS_TEST_DIRNAME}/../../scripts/self-healing/get-workflow-logs.sh" "invalid" "owner/repo"

    [ "$status" -eq 1 ]
    [[ "$output" == *"Invalid run_id"* ]]
}

@test "handles invalid repository format" {
    run bash "${BATS_TEST_DIRNAME}/../../scripts/self-healing/get-workflow-logs.sh" "12345" "invalid-repo"

    [ "$status" -eq 1 ]
    [[ "$output" == *"Invalid repository format"* ]]
}

@test "handles API failure" {
    # Mock API failure
    create_mock_gh 1

    run bash "${BATS_TEST_DIRNAME}/../../scripts/self-healing/get-workflow-logs.sh" "12345" "owner/repo"

    [ "$status" -eq 1 ]
    [[ "$output" == *"Failed to fetch workflow logs"* ]]
}

@test "handles empty API response" {
    # Mock empty response
    create_mock_gh 0 ""

    run bash "${BATS_TEST_DIRNAME}/../../scripts/self-healing/get-workflow-logs.sh" "12345" "owner/repo"

    [ "$status" -eq 0 ]
    grep -q "logs_url=https://github.com/owner/repo/actions/runs/12345" "${GITHUB_OUTPUT}"
}

@test "correctly truncates error summary to 20 lines" {
    # Create mock response with more than 20 lines
    LONG_OUTPUT=$(printf '{"line":%d}\n' {1..25})
    create_mock_gh 0 "$LONG_OUTPUT"

    run bash "${BATS_TEST_DIRNAME}/../../scripts/self-healing/get-workflow-logs.sh" "12345" "owner/repo"

    [ "$status" -eq 0 ]

    # Extract error_summary from GITHUB_OUTPUT
    ERROR_LINES=$(sed -n '/error_summary<<EOF/,/^EOF$/p' "${GITHUB_OUTPUT}" | sed '1d;$d' | wc -l)
    [ "$ERROR_LINES" -eq 20 ]
}
