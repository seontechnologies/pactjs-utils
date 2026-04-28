#!/bin/bash

# Runs a pact generation command N times and asserts every generated pact
# file is byte-identical across runs. Catches three classes of non-determinism
# the Pact Rust FFI is known to emit:
#
#   1. Dropped interactions — two pact.addInteraction() chains in a single
#      `it` block collide on their default-empty description; one overwrites
#      the other non-deterministically.
#   2. Re-ordering — fileParallelism: true in vitest config races files to
#      write to the shared pact JSON.
#   3. Content drift — shared mutable test data (counters in .given() params)
#      changes interaction payloads between runs.
#
# PactFlow rejects re-publishes of the same consumer version with different
# pact bytes ("Cannot change the content of the pact for <consumer> version
# <sha>..."). Wire this script into CI before `pact-broker publish` and that
# broker error can never reach you — non-determinism fails the PR first.
#
# Usage:
#   ./scripts/check-pact-determinism.sh "<cmd>" [runs] [pact-dir]
#
# Example:
#   ./scripts/check-pact-determinism.sh "npm run test:pact:consumer" 3 ./pacts
#
# Requires: jq (pre-installed on GitHub-hosted ubuntu-latest runners).

set -euo pipefail

CMD="${1:?usage: ./scripts/check-pact-determinism.sh \"<cmd>\" [runs] [pact-dir]}"
RUNS="${2:-3}"
PACT_DIR="${3:-./pacts}"

if ! command -v jq >/dev/null 2>&1; then
    echo "error: jq is required (sudo apt-get install -y jq)" >&2
    exit 2
fi

if [ "$RUNS" -lt 2 ]; then
    echo "error: runs must be >= 2 to compare anything (got $RUNS)" >&2
    exit 2
fi

# Normalized hash of a single pact file: sort interactions, strip whitespace,
# then md5. Ensures interaction re-ordering counts as "same" and only real
# content drift (drops, mutations) surfaces as a failure.
hash_pact_file() {
    jq -c '
        if .interactions then
            .interactions |= sort_by(
                (.providerStates // [] | map(.name) | join("|"))
                + "::" + (.description // "")
            )
        else
            .
        end
    ' "$1" | md5sum | awk '{print $1}'
}

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "check-pact-determinism: $RUNS runs of [$CMD] against $PACT_DIR"

for run in $(seq 1 "$RUNS"); do
    rm -f "$PACT_DIR"/*.json 2>/dev/null || true
    echo "  run $run/$RUNS..."
    if ! eval "$CMD" >"$TMP_DIR/run-$run.log" 2>&1; then
        echo "error: command failed on run $run; log:" >&2
        cat "$TMP_DIR/run-$run.log" >&2
        exit 1
    fi
    for pact_file in "$PACT_DIR"/*.json; do
        [ -f "$pact_file" ] || continue
        name=$(basename "$pact_file")
        hash=$(hash_pact_file "$pact_file")
        count=$(jq '.interactions // [] | length' "$pact_file")
        echo "$name $hash $count" >> "$TMP_DIR/run-$run.hashes"
    done
    # Record the set of filenames produced this run for missing-across-runs detection.
    if [ -f "$TMP_DIR/run-$run.hashes" ]; then
        awk '{print $1}' "$TMP_DIR/run-$run.hashes" | sort -u > "$TMP_DIR/run-$run.files"
    else
        : > "$TMP_DIR/run-$run.files"
    fi
done

# Aggregate: per file, list (hash, count) across every run.
ALL_FILES=$(cat "$TMP_DIR"/run-*.files | sort -u)
FAIL=0

if [ -z "$ALL_FILES" ]; then
    echo "error: no pact files were generated in $PACT_DIR" >&2
    exit 1
fi

echo ""
echo "Pact determinism report ($RUNS runs):"
for name in $ALL_FILES; do
    hashes=$(for run in $(seq 1 "$RUNS"); do
        awk -v n="$name" '$1 == n {print $2}' "$TMP_DIR/run-$run.hashes" || true
    done)
    counts=$(for run in $(seq 1 "$RUNS"); do
        awk -v n="$name" '$1 == n {print $3}' "$TMP_DIR/run-$run.hashes" || true
    done)
    # count how many runs observed this file
    observed=$(printf '%s\n' $hashes | grep -c . || true)
    unique=$(printf '%s\n' $hashes | sort -u | grep -c . || true)
    unique_counts=$(printf '%s\n' $counts | sort -u | tr '\n' ',' | sed 's/,$//')

    if [ "$observed" -lt "$RUNS" ]; then
        echo "  $name: MISSING in $((RUNS - observed))/$RUNS runs — interactions likely dropped"
        FAIL=1
    elif [ "$unique" -gt 1 ]; then
        echo "  $name: UNSTABLE — $unique distinct hashes, interaction counts: [$unique_counts]"
        FAIL=1
    else
        echo "  $name: stable — $unique_counts interactions"
    fi
done

if [ "$FAIL" -ne 0 ]; then
    echo ""
    echo "Most likely causes, in priority order:"
    echo "  1. Two or more pact.addInteraction() chains in a single \`it\` block"
    echo "  2. fileParallelism: true in vitest config"
    echo "  3. Conditional interactions (if/else around addInteraction)"
    echo "  4. Shared mutable data in .given() params or request bodies"
    exit 1
fi

echo ""
echo "PASS"
