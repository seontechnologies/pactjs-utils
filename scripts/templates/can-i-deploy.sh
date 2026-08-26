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

# PR-only override: when a provider-branch override is set (via the
# detect-provider-branch action reading "Pact provider branch: <name>" from
# the PR body), --ignore that provider in the environment-wide check and
# verify it separately against its branch tip instead. This keeps the
# environment check a real, unconditional gate against every OTHER
# dependency PACTICIPANT has -- only the one known in-flight provider gets
# the weaker (but still real) branch-tip check. Genuinely additive: neither
# call needs to swallow the other's failure.
#
# (Not implemented with a conditionally-built args array: bash 3.2, still
# the default /bin/bash on macOS, throws "unbound variable" on
# "${empty_array[@]}" under set -u. Two explicit branches avoids that.)
if [ -n "${PACT_PROVIDER_BRANCH:-}" ] && [ -n "$PROVIDER_PACTICIPANT" ]; then
    pact-broker can-i-deploy \
        --pacticipant "$PACTICIPANT" \
        --version="$GITHUB_SHA" \
        --to-environment "$ENVIRONMENT" \
        --ignore "$PROVIDER_PACTICIPANT" \
        --retry-while-unknown=10

    echo "Also checking compatibility against provider branch: $PACT_PROVIDER_BRANCH"
    pact-broker can-i-deploy \
        --pacticipant "$PACTICIPANT" \
        --version="$GITHUB_SHA" \
        --pacticipant "$PROVIDER_PACTICIPANT" \
        --branch="$PACT_PROVIDER_BRANCH" \
        --retry-while-unknown=10
else
    pact-broker can-i-deploy \
        --pacticipant "$PACTICIPANT" \
        --version="$GITHUB_SHA" \
        --to-environment "$ENVIRONMENT" \
        --retry-while-unknown=10
fi
