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

pact-broker can-i-deploy \
    --pacticipant "$PACTICIPANT" \
    --version="$GITHUB_SHA" \
    --to-environment "$ENVIRONMENT" \
    --retry-while-unknown=10 \
    --retry-interval=30

# Additive, PR-only check: when a provider-branch override is set (via the
# detect-provider-branch action reading "Pact provider branch: <name>" from
# the PR body) and a PROVIDER_PACTICIPANT is configured, also verify against
# that branch's tip. This proves compatibility with the provider's in-flight
# release branch, which --to-environment can't see since it only resolves to
# what's currently deployed. --branch is strictly weaker than
# --to-environment (branch tip vs. actually-running version), so it never
# replaces the check above, only supplements it.
if [ -n "${PACT_PROVIDER_BRANCH:-}" ] && [ -n "${PROVIDER_PACTICIPANT:-}" ]; then
    echo "Also checking compatibility against provider branch: $PACT_PROVIDER_BRANCH"
    pact-broker can-i-deploy \
        --pacticipant "$PACTICIPANT" \
        --version="$GITHUB_SHA" \
        --pacticipant "$PROVIDER_PACTICIPANT" \
        --branch="$PACT_PROVIDER_BRANCH" \
        --retry-while-unknown=10 \
        --retry-interval=30
fi
