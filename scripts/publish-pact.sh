#!/bin/bash

# Publishes pact files to the Pact Broker.
#
# Usage: ./scripts/publish-pact.sh
#
# Requires: pact-broker CLI (npm install -D @pact-foundation/pact-cli)

# -e: exit on error  -u: error on undefined vars  -o pipefail: fail if any pipe segment fails
set -euo pipefail

# Load environment variables
. ./scripts/env-setup.sh

# CUSTOMIZE: Set the path to your pact files directory
PACT_DIR="./pacts"

# Defense-in-depth: sort `.interactions[]` by (providerStates, description)
# before publishing. The Pact Rust FFI appends interactions in the order the
# V4 builders resolve, which can be non-deterministic under parallel test
# files or the "two addInteraction chains in one `it`" anti-pattern. When
# that happens, CI re-runs on the same commit produce differing pact JSON
# and PactFlow rejects the re-publish with:
#   "Cannot change the content of the pact for <consumer> version <sha>..."
#
# Sorting here makes the artifact byte-stable regardless of test scheduling.
# Requires jq (pre-installed on GitHub-hosted ubuntu-latest runners).
#
# This is belt-and-braces; fix the root cause first (one pact.addInteraction()
# per `it` block, fileParallelism: false in vitest config, or use
# `pactjs-utils check-determinism` in CI before publishing).
if command -v jq >/dev/null 2>&1; then
    for pact_file in "$PACT_DIR"/*.json; do
        [ -f "$pact_file" ] || continue
        tmp="${pact_file}.sorted"
        jq '.interactions |= (if . == null then null else sort_by(
            (.providerStates // [] | map(.name) | join("|")) + "::" + (.description // "")
        ) end)' "$pact_file" > "$tmp"
        mv "$tmp" "$pact_file"
    done
else
    echo "warning: jq not found, skipping pact normalization" >&2
fi

pact-broker publish "$PACT_DIR" \
    --consumer-app-version="$GITHUB_SHA" \
    --branch="$GITHUB_BRANCH" \
    --broker-base-url="$PACT_BROKER_BASE_URL" \
    --broker-token="$PACT_BROKER_TOKEN"
