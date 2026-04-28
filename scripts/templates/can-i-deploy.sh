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

pact-broker can-i-deploy \
    --pacticipant "$PACTICIPANT" \
    --version="$GITHUB_SHA" \
    --to-environment "$ENVIRONMENT" \
    --retry-while-unknown=10
