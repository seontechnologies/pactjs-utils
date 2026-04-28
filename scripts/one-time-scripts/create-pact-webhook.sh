#!/bin/bash

# One-time setup: Create a PactFlow webhook that triggers GitHub Actions
# when a consumer publishes a new pact requiring verification.
#
# Prerequisites:
#   - pact-broker CLI: https://github.com/pact-foundation/pact-ruby-standalone/releases
#     You may need: export PATH=$PATH:$(pwd)/pact/bin
#     Verify with: pact-broker version
#   - GitHub PAT with public_repo scope
#   - .github/workflows/contract-test-webhook.yml exists in the target repo
#
# Alternative: You can create the webhook manually in PactFlow UI:
#   Settings > Webhooks > Add Webhook
#   See README.md for the field values.

set -eu

# ── Fill in these values ─────────────────────────────────────────────
PACT_BROKER_BASE_URL="your-pact-broker-url"
PACT_BROKER_TOKEN="Your_Pact_Token"
GITHUB_AUTH_TOKEN="Your_GitHub_Personal_Access_Token"

DESCRIPTION="pactjs-utils provider verification on contract change"
CONSUMER_NAME="SampleAppConsumer"
PROVIDER_NAME="SampleMoviesAPI"
GITHUB_REPO_OWNER="seontechnologies"
GITHUB_REPO_NAME="pactjs-utils"
# ─────────────────────────────────────────────────────────────────────

REPO_DISPATCHES="https://api.github.com/repos/$GITHUB_REPO_OWNER/$GITHUB_REPO_NAME/dispatches"

echo "Pact Broker Base URL: $PACT_BROKER_BASE_URL"
echo "GitHub Dispatch Endpoint: $REPO_DISPATCHES"
echo "Consumer: $CONSUMER_NAME"
echo "Provider: $PROVIDER_NAME"
echo "Description: $DESCRIPTION"

# Step 1: Verify the Pact Broker URL
echo "Checking Pact Broker accessibility..."
PACT_BROKER_STATUS=$(curl -o /dev/null -s -w "%{http_code}" \
  -H "Authorization: Bearer $PACT_BROKER_TOKEN" \
  "$PACT_BROKER_BASE_URL")

if [ "$PACT_BROKER_STATUS" -ne 200 ]; then
  echo "Error: Pact Broker URL is not accessible. Status code: $PACT_BROKER_STATUS"
  echo "Please check the PACT_BROKER_BASE_URL & PACT_BROKER_TOKEN."
  exit 1
else
  echo "Pact Broker URL is accessible."
fi

# Step 2: Check if the GitHub dispatch endpoint is accessible
echo "Checking GitHub dispatch endpoint..."
RESPONSE_STATUS=$(curl -o /dev/null -s -w "%{http_code}" -X POST "$REPO_DISPATCHES" \
    -H "Authorization: Bearer $GITHUB_AUTH_TOKEN" \
    -H "Accept: application/vnd.github.everest-preview+json" \
    -d '{"event_type": "contract_requiring_verification_published"}')

if [ "$RESPONSE_STATUS" -ne 204 ]; then
  echo "Error: Unable to access GitHub dispatch endpoint. Status code: $RESPONSE_STATUS"
  echo "Please check your GitHub token and ensure contract-test-webhook.yml exists."
  exit 1
else
  echo "GitHub dispatch endpoint is accessible."
fi

# Step 3: Create the webhook
echo "Creating Pact webhook..."
pact-broker create-webhook "$REPO_DISPATCHES" \
    --request=POST \
    --header 'Content-Type: application/json' \
    --header 'Accept: application/vnd.github.everest-preview+json' \
    --header "Authorization: Bearer $GITHUB_AUTH_TOKEN" \
    --data '{
        "event_type": "contract_requiring_verification_published",
        "client_payload": {
            "pact_url": "${pactbroker.pactUrl}",
            "sha": "${pactbroker.providerVersionNumber}",
            "branch": "${pactbroker.providerVersionBranch}"
        }
    }' \
    --broker-base-url="$PACT_BROKER_BASE_URL" \
    --broker-token="$PACT_BROKER_TOKEN" \
    --consumer="$CONSUMER_NAME" \
    --provider="$PROVIDER_NAME" \
    --description="$DESCRIPTION" \
    --contract-requiring-verification-published

echo "Webhook created successfully."
