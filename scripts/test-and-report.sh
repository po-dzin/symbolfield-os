#!/bin/bash

# Usage: ./scripts/test-and-report.sh "Feature Name" [spec-file]

FEATURE_NAME="$1"
SPEC_FILE="$2"

if [ -z "$FEATURE_NAME" ]; then
    echo "Usage: $0 \"Feature Name\" [spec-file]"
    exit 1
fi

# Define Python Command (use venv if available)
if [ -f ".venv/bin/python" ]; then
    PYTHON_CMD=".venv/bin/python"
    echo "🐍 Using venv python: $PYTHON_CMD"
else
    PYTHON_CMD="python3"
    echo "🐍 Using system python: $PYTHON_CMD"
fi

echo "🚀 Starting Pipeline for feature: $FEATURE_NAME"

# 1. Run Smoke Tests (Critical Path)
echo "💨 Running Smoke Tests..."
npx playwright test tests/smoke.spec.js
SMOKE_STATUS=$?

if [ $SMOKE_STATUS -ne 0 ]; then
    echo "❌ Smoke Tests Failed! Aborting pipeline."
    # Optionally report failure to Notion immediately
    $PYTHON_CMD symbolfield-crew/report_to_notion.py "$FEATURE_NAME" "test-results.json"
    exit 1
fi

echo "✅ Smoke Tests Passed"

# 2. Run Feature/Regression Tests
if [ -n "$SPEC_FILE" ]; then
    echo "🔬 Running Feature Test: $SPEC_FILE"
    npx playwright test "$SPEC_FILE"
else
    echo "🔬 Running Full Regression Suite"
    npx playwright test tests/regression.spec.js
fi

TEST_STATUS=$?

# 3. Report to Notion
echo "📊 Reporting to Notion..."
$PYTHON_CMD symbolfield-crew/report_to_notion.py "$FEATURE_NAME" "test-results.json"

if [ $TEST_STATUS -eq 0 ]; then
    echo "🎉 Pipeline Success!"
    exit 0
else
    echo "⚠️ Tests Failed (reported to Notion)."
    exit 1
fi
