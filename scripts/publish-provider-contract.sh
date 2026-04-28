#!/bin/bash

# Publishes the provider's OpenAPI spec to PactFlow for bi-directional contract testing (BDCT).
#
# IMPORTANT: This is a PAID PactFlow feature. There is NO local equivalent.
# Unlike consumer-driven contract testing (CDCT) which can run locally with pactUrls,
# BDCT requires PactFlow to cross-validate the provider's OAS against consumer pacts.
#
# Flow:
#   1. Generate fresh OpenAPI spec from Zod schemas
#   2. Run provider's own tests (backend unit/integration tests)
#   3. Publish the OAS + verification results to PactFlow
#   4. PactFlow cross-validates against any consumer pacts
#
# Usage: npm run publish:provider:contract
#
# Requires:
#   - pactflow CLI (provided by @pact-foundation/pact-cli)
#   - PACT_BROKER_BASE_URL and PACT_BROKER_TOKEN in .env

set -euo pipefail

# Load environment variables
. ./scripts/env-setup.sh

OAS_FILE="sample-app/backend/src/api-docs/openapi.json"

# 1. Generate fresh OpenAPI spec
echo "Generating OpenAPI spec..."
cd sample-app/backend && npx tsx src/api-docs/openapi-writer.ts && cd ../..

# 2. Run provider's own tests and capture results
echo "Running provider tests..."
VERIFICATION_EXIT_CODE=0
npm run test:backend > provider-verification-results.txt 2>&1 || VERIFICATION_EXIT_CODE=$?

if [ "$VERIFICATION_EXIT_CODE" -eq 0 ]; then
  echo "Provider tests passed."
else
  echo "Provider tests failed (exit code: $VERIFICATION_EXIT_CODE). Publishing with failure status."
fi

# 3. Publish provider contract (OAS) to PactFlow
echo "Publishing provider contract to PactFlow..."
pactflow publish-provider-contract "$OAS_FILE" \
    --provider "SampleMoviesAPI" \
    --provider-app-version "$GITHUB_SHA" \
    --branch "$GITHUB_BRANCH" \
    --content-type "application/json" \
    --verification-exit-code "$VERIFICATION_EXIT_CODE" \
    --verification-results "provider-verification-results.txt" \
    --verification-results-content-type "text/plain" \
    --verifier "vitest" \
    --verifier-version "3.2.0"

# Cleanup
rm -f provider-verification-results.txt

echo "Provider contract published successfully."
