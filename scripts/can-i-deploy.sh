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

# Captured, not let `set -e` abort here: the whole point of the override
# below is to handle the case where this check legitimately fails/unknowns
# (the provider hasn't deployed its release branch to $ENVIRONMENT yet). If
# we let -e kill the script on a non-zero exit, the override block below
# would never run in the exact scenario it exists for.
ENV_STATUS=0
pact-broker can-i-deploy \
    --pacticipant "$PACTICIPANT" \
    --version="$GITHUB_SHA" \
    --to-environment "$ENVIRONMENT" \
    --retry-while-unknown=10 \
    --retry-interval=30 || ENV_STATUS=$?

# PR-only override: when a provider-branch override is set (via the
# detect-provider-branch action reading "Pact provider branch: <name>" from
# the PR body) and a PROVIDER_PACTICIPANT is configured, check against that
# branch's tip instead. --branch proves compatibility with the tip of a
# branch, strictly weaker than --to-environment (which proves compatibility
# with what's actually running) -- but that's the tradeoff this override is
# for: during the in-flight window, --to-environment is expected to fail
# because the provider hasn't deployed the release branch to $ENVIRONMENT
# yet, so this substitutes the weaker check rather than merely adding to it.
#
# The substitution is bounded by design, not open-ended:
#   - detect-provider-branch only exports on `pull_request`, never on push.
#   - record-deployment (what makes --to-environment start passing for real)
#     only runs on push-to-main in contract-test-consumer.yml.
# So PR builds get the substitution; the push-to-main path that actually
# records a deployment never has the override set and always runs the
# unconditional --to-environment gate above on its own.
if [ -n "${PACT_PROVIDER_BRANCH:-}" ] && [ -n "${PROVIDER_PACTICIPANT:-}" ]; then
    echo "Provider-branch override active; checking against $PACT_PROVIDER_BRANCH"
    pact-broker can-i-deploy \
        --pacticipant "$PACTICIPANT" \
        --version="$GITHUB_SHA" \
        --pacticipant "$PROVIDER_PACTICIPANT" \
        --branch="$PACT_PROVIDER_BRANCH" \
        --retry-while-unknown=10 \
        --retry-interval=30
    exit 0
fi

exit "$ENV_STATUS"
