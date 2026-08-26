#!/bin/bash

# Checks if a pacticipant version is safe to deploy.
# Required CI gate — blocks deployment if contracts are incompatible.
#
# Usage: ./scripts/templates/can-i-deploy.sh
#
# Requires: pact-broker CLI (npm install -g @pact-foundation/pact-cli)

# -e: exit on error  -u: error on undefined vars  -o pipefail: fail if any pipe segment fails
set -euo pipefail

# Load environment variables
. ./scripts/templates/env-setup.sh

# CUSTOMIZE: Set your pacticipant name
PACTICIPANT="YourServiceName"

# CUSTOMIZE: Set your target environment
ENVIRONMENT="dev"

# CUSTOMIZE: Set the name of the provider(s) this pacticipant depends on, to
# enable the additive provider-branch check below. Leave blank to skip it.
PROVIDER_PACTICIPANT="${PROVIDER_PACTICIPANT:-}"

# Captured, not let `set -e` abort here: the override below is meant to
# handle the case where this check legitimately fails/unknowns (the provider
# hasn't deployed its release branch to $ENVIRONMENT yet). Letting -e kill
# the script on a non-zero exit would mean the override never runs in the
# exact scenario it exists for.
ENV_STATUS=0
pact-broker can-i-deploy \
    --pacticipant "$PACTICIPANT" \
    --version="$GITHUB_SHA" \
    --to-environment "$ENVIRONMENT" \
    --retry-while-unknown=10 || ENV_STATUS=$?

# PR-only override: when a provider-branch override is set (via the
# detect-provider-branch action reading "Pact provider branch: <name>" from
# the PR body), check against that branch's tip instead. --branch proves
# compatibility with the tip of a branch, strictly weaker than
# --to-environment (which proves compatibility with what's actually
# running) -- but that's the tradeoff this override is for: substitute the
# weaker check during the in-flight window, rather than merely add to it.
# CUSTOMIZE: bound this substitution the way the source repo does -- only
# export PACT_PROVIDER_BRANCH from a PR-only detection step, never from a
# push/main build, so your push-to-main path always runs the unconditional
# --to-environment gate above on its own.
if [ -n "${PACT_PROVIDER_BRANCH:-}" ] && [ -n "$PROVIDER_PACTICIPANT" ]; then
    echo "Provider-branch override active; checking against $PACT_PROVIDER_BRANCH"
    pact-broker can-i-deploy \
        --pacticipant "$PACTICIPANT" \
        --version="$GITHUB_SHA" \
        --pacticipant "$PROVIDER_PACTICIPANT" \
        --branch="$PACT_PROVIDER_BRANCH" \
        --retry-while-unknown=10
    exit 0
fi

exit "$ENV_STATUS"
