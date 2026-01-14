---
description: Automated feature testing and Notion reporting pipeline
---
// turbo-all
# Feature Deployment Pipeline

**Rule**: Every fix or feature MUST be accompanied by a test and reported to Notion.

## Steps

1. **Test Creation**: If this is a new feature, create/update a file in `tests/<feature>.spec.js`.
2. **Automated Verification**: Run smoke tests and feature tests.
3. **Notion Sync**: Upload results to the coverage matrix.

## Execution

```bash
# Usage: ./scripts/test-and-report.sh "Feature Name" [target-test-file]
./scripts/test-and-report.sh "Feature Name" tests/feature.spec.js
```

## Guardrails
- If smoke tests fail, the deployment is aborted.
- All coordinate-related fixes MUST pass `tests/interaction.spec.js`.

## Example: Verifying Interaction Fixes
```bash
./scripts/test-and-report.sh "Coordinate System" tests/interaction.spec.js
```
