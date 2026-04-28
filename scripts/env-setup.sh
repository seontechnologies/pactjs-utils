#!/bin/bash

# Environment setup for Pact Broker CLI commands.
# Sources .env file and exports git-derived variables.
#
# Usage: . ./scripts/env-setup.sh
#
# Required .env variables:
#   PACT_BROKER_BASE_URL  — Your Pact Broker URL
#   PACT_BROKER_TOKEN     — Your Pact Broker API token

# -e: exit on error, -u: error on undefined vars (catches typos/missing env vars in CI)
set -eu

# Load environment variables from .env if it exists
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Set Git-related environment variables (preserve CI-provided values)
export GITHUB_SHA="${GITHUB_SHA:-$(git rev-parse --short HEAD)}"
export GITHUB_BRANCH="${GITHUB_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"
