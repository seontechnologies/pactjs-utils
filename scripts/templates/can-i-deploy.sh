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

pact-broker can-i-deploy \
    --pacticipant "$PACTICIPANT" \
    --version="$GITHUB_SHA" \
    --to-environment "$ENVIRONMENT" \
    --retry-while-unknown=10

# Additive, PR-only check: when a provider-branch override is set (via the
# detect-provider-branch action reading "Pact provider branch: <name>" from
# the PR body), also verify against that branch's tip. --branch is strictly
# weaker than --to-environment (branch tip vs. actually-running version), so
# it never replaces the check above, only supplements it.
if [ -n "${PACT_PROVIDER_BRANCH:-}" ] && [ -n "$PROVIDER_PACTICIPANT" ]; then
    echo "Also checking compatibility against provider branch: $PACT_PROVIDER_BRANCH"
    pact-broker can-i-deploy \
        --pacticipant "$PACTICIPANT" \
        --version="$GITHUB_SHA" \
        --pacticipant "$PROVIDER_PACTICIPANT" \
        --branch="$PACT_PROVIDER_BRANCH" \
        --retry-while-unknown=10
fi
