#!/bin/bash

# Test your GitHub Personal Access Token by creating an issue.
# If this works, the PactFlow webhook dispatch will also work.
#
# Usage: ./scripts/one-time-scripts/create-github-issue-test.sh

set -eu

# ── Fill in these values ─────────────────────────────────────────────
GITHUB_REPO_OWNER="seontechnologies"
GITHUB_REPO_NAME="pactjs-utils"
GITHUB_AUTH_TOKEN="Your_GitHub_Personal_Access_Token"
# ─────────────────────────────────────────────────────────────────────

ISSUE_TITLE="Test issue - webhook PAT verification"
ISSUE_BODY="This is a test issue created via API. You can close and delete this."

# Step 1: Verify the GitHub Token
echo "Verifying GitHub token..."
TOKEN_VERIFICATION_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $GITHUB_AUTH_TOKEN" \
  "https://api.github.com/users/$GITHUB_REPO_OWNER")

if [ "$TOKEN_VERIFICATION_RESPONSE" -ne 200 ]; then
  echo "Error: Bad credentials. Please check your GitHub token and ensure it has the required permissions."
  exit 1
else
  echo "GitHub token verified successfully."
fi

# Step 2: Create the issue
ISSUE_URL="https://api.github.com/repos/$GITHUB_REPO_OWNER/$GITHUB_REPO_NAME/issues"

echo "Creating a new GitHub issue..."
curl -X POST "$ISSUE_URL" \
    -H "Accept: application/vnd.github.v3+json" \
    -H "Authorization: Bearer $GITHUB_AUTH_TOKEN" \
    -d "{\"title\": \"$ISSUE_TITLE\", \"body\": \"$ISSUE_BODY\"}"

echo ""
echo "If an issue was created, your token works for webhook dispatch."
