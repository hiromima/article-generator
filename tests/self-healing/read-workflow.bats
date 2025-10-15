#!/usr/bin/env bats
# Unit tests for read-workflow.sh

# Setup: Create temporary test directory
setup() {
    export TEST_DIR="$(mktemp -d)"
    export GITHUB_OUTPUT="${TEST_DIR}/output.txt"

    # Create a test workflow file
    cat > "${TEST_DIR}/test-workflow.yml" << 'EOF'
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

@test "successfully reads workflow file" {
    run bash "${BATS_TEST_DIRNAME}/../../scripts/self-healing/read-workflow.sh" "${TEST_DIR}/test-workflow.yml"

    [ "$status" -eq 0 ]
    grep -q "workflow_content<<EOF" "${GITHUB_OUTPUT}"
    grep -q "name: Test Workflow" "${GITHUB_OUTPUT}"
    grep -q "on: push" "${GITHUB_OUTPUT}"
}

@test "handles missing argument" {
    run bash "${BATS_TEST_DIRNAME}/../../scripts/self-healing/read-workflow.sh"

    [ "$status" -eq 1 ]
    [[ "$output" == *"Usage"* ]]
}

@test "handles non-existent file" {
    run bash "${BATS_TEST_DIRNAME}/../../scripts/self-healing/read-workflow.sh" "${TEST_DIR}/non-existent.yml"

    [ "$status" -eq 1 ]
    [[ "$output" == *"does not exist"* ]]
}

@test "handles empty file" {
    touch "${TEST_DIR}/empty.yml"

    run bash "${BATS_TEST_DIRNAME}/../../scripts/self-healing/read-workflow.sh" "${TEST_DIR}/empty.yml"

    [ "$status" -eq 0 ]
    grep -q "workflow_content<<EOF" "${GITHUB_OUTPUT}"
}

@test "handles file with special characters" {
    cat > "${TEST_DIR}/special.yml" << 'EOF'
name: Test ${{ github.ref }}
env:
  SECRET: ${{ secrets.TOKEN }}
run: |
  echo "multi-line"
  echo "command"
EOF

    run bash "${BATS_TEST_DIRNAME}/../../scripts/self-healing/read-workflow.sh" "${TEST_DIR}/special.yml"

    [ "$status" -eq 0 ]
    grep -q 'name: Test ${{ github.ref }}' "${GITHUB_OUTPUT}"
    grep -q 'SECRET: ${{ secrets.TOKEN }}' "${GITHUB_OUTPUT}"
}

@test "handles large workflow file" {
    # Create a large workflow file (500 lines)
    {
        echo "name: Large Workflow"
        echo "on: push"
        echo "jobs:"
        for i in {1..100}; do
            echo "  job${i}:"
            echo "    runs-on: ubuntu-latest"
            echo "    steps:"
            echo "      - run: echo 'step ${i}'"
        done
    } > "${TEST_DIR}/large.yml"

    run bash "${BATS_TEST_DIRNAME}/../../scripts/self-healing/read-workflow.sh" "${TEST_DIR}/large.yml"

    [ "$status" -eq 0 ]
    grep -q "workflow_content<<EOF" "${GITHUB_OUTPUT}"
    grep -q "name: Large Workflow" "${GITHUB_OUTPUT}"
}
