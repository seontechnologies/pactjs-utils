#!/bin/bash

# Records a deployment to the Pact Broker.
# Only runs on the main branch to track production deployments.
#
# Usage: npm run record-deployment --env=dev
#
# Requires: pact-broker CLI (npm install -g @pact-foundation/pact-cli)

# -e: exit on error  -u: error on undefined vars  -o pipefail: fail if any pipe segment fails
set -euo pipefail

# Load environment variables
. ./scripts/templates/env-setup.sh

# CUSTOMIZE: Set your pacticipant name
PACTICIPANT="YourServiceName"

# Only record deployment on main branch
if [ "$GITHUB_BRANCH" = "main" ]; then
  pact-broker record-deployment \
    --pacticipant "$PACTICIPANT" \
    --version "$GITHUB_SHA" \
    --environment "${npm_config_env:-dev}"
else
  echo "Skipping record-deployment: not on main branch (current: $GITHUB_BRANCH)"
fi
