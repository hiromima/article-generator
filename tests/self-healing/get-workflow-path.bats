#!/usr/bin/env bats
# Unit tests for get-workflow-path.sh

# Setup: Create temporary test directory
setup() {
    export TEST_DIR="$(mktemp -d)"
    export GITHUB_OUTPUT="${TEST_DIR}/output.txt"
    mkdir -p "${TEST_DIR}/.github/workflows"

    # Create a test workflow file
    cat > "${TEST_DIR}/.github/workflows/test.yml" << 'EOF'
name: Test Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: echo "test"
EOF

    # Change to test directory
    cd "${TEST_DIR}"
}

# Teardown: Clean up
teardown() {
    rm -rf "${TEST_DIR}"
}

@test "finds existing workflow file" {
    run bash "${BATS_TEST_DIRNAME}/../../scripts/self-healing/get-workflow-path.sh" "Test Workflow"

    [ "$status" -eq 0 ]
    grep -q "workflow_file=.github/workflows/test.yml" "${GITHUB_OUTPUT}"
    grep -q "workflow_exists=true" "${GITHUB_OUTPUT}"
}

@test "handles non-existent workflow" {
    run bash "${BATS_TEST_DIRNAME}/../../scripts/self-healing/get-workflow-path.sh" "Non-existent Workflow"

    [ "$status" -eq 0 ]
    grep -q "workflow_file=.github/workflows/unknown.yml" "${GITHUB_OUTPUT}"
    grep -q "workflow_exists=false" "${GITHUB_OUTPUT}"
}

@test "handles missing argument" {
    run bash "${BATS_TEST_DIRNAME}/../../scripts/self-healing/get-workflow-path.sh"

    [ "$status" -eq 1 ]
    [[ "$output" == *"Usage"* ]]
}

@test "handles workflow name with spaces" {
    cat > "${TEST_DIR}/.github/workflows/spaced.yml" << 'EOF'
name: My Spaced Workflow
on: push
jobs:
  test:
    runs-on: ubuntu-latest
EOF

    run bash "${BATS_TEST_DIRNAME}/../../scripts/self-healing/get-workflow-path.sh" "My Spaced Workflow"

    [ "$status" -eq 0 ]
    grep -q "workflow_file=.github/workflows/spaced.yml" "${GITHUB_OUTPUT}"
    grep -q "workflow_exists=true" "${GITHUB_OUTPUT}"
}

@test "handles multiple workflow files with same name" {
    # Create second file with same workflow name
    cat > "${TEST_DIR}/.github/workflows/duplicate.yml" << 'EOF'
name: Test Workflow
on: pull_request
EOF

    run bash "${BATS_TEST_DIRNAME}/../../scripts/self-healing/get-workflow-path.sh" "Test Workflow"

    [ "$status" -eq 0 ]
    # Should return the first match
    grep -q "workflow_exists=true" "${GITHUB_OUTPUT}"
}
