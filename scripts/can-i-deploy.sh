#!/bin/bash

# Checks if a pacticipant version is safe to deploy.
# Required CI gate — blocks deployment if contracts are incompatible.
#
# Usage: PACTICIPANT=MyService ./scripts/can-i-deploy.sh
# Usage: PACTICIPANT=MyService ENVIRONMENT=staging ./scripts/can-i-deploy.sh
#
# Requires: pact-broker CLI (npm install -D @pact-foundation/pact-cli)

# -e: exit on error  -u: error on undefined vars  -o pipefail: fail if any pipe segment fails
set -euo pipefail

# Load environment variables
. ./scripts/env-setup.sh

PACTICIPANT="${PACTICIPANT:?PACTICIPANT env var is required}"
ENVIRONMENT="${ENVIRONMENT:-dev}"

# PR-only override: when a provider-branch override is set (via the
# detect-provider-branch action reading "Pact provider branch: <name>" from
# the PR body) and a PROVIDER_PACTICIPANT is configured, --ignore that one
# provider in the environment-wide check and verify it separately against
# its branch tip instead. This keeps the environment check a real,
# unconditional gate against every OTHER dependency PACTICIPANT has -- only
# the one known in-flight provider gets the weaker (but still real,
# against-actual-code) branch-tip check instead of an environment check it
# can't pass yet. Genuinely additive: neither call needs to swallow the
# other's failure, so both run under the script's normal set -e.
#
# (Not implemented with a conditionally-built args array: bash 3.2, still
# the default /bin/bash on macOS, throws "unbound variable" on
# "${empty_array[@]}" under set -u. Two explicit branches avoids that.)
if [ -n "${PACT_PROVIDER_BRANCH:-}" ] && [ -n "${PROVIDER_PACTICIPANT:-}" ]; then
    pact-broker can-i-deploy \
        --pacticipant "$PACTICIPANT" \
        --version="$GITHUB_SHA" \
        --to-environment "$ENVIRONMENT" \
        --ignore "$PROVIDER_PACTICIPANT" \
        --retry-while-unknown=10 \
        --retry-interval=30

    echo "Also checking compatibility against provider branch: $PACT_PROVIDER_BRANCH"
    pact-broker can-i-deploy \
        --pacticipant "$PACTICIPANT" \
        --version="$GITHUB_SHA" \
        --pacticipant "$PROVIDER_PACTICIPANT" \
        --branch="$PACT_PROVIDER_BRANCH" \
        --retry-while-unknown=10 \
        --retry-interval=30
else
    pact-broker can-i-deploy \
        --pacticipant "$PACTICIPANT" \
        --version="$GITHUB_SHA" \
        --to-environment "$ENVIRONMENT" \
        --retry-while-unknown=10 \
        --retry-interval=30
fi
