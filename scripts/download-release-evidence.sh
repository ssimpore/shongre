#!/usr/bin/env bash

set -euo pipefail

kind="${1:-}"
release_sha="${2:-}"
destination="${3:-}"
case "$kind" in release) artifact_name="release-${release_sha}" ;; certification) artifact_name="staging-certification-${release_sha}" ;; *) echo "kind must be release or certification" >&2; exit 2 ;; esac
[[ "$release_sha" =~ ^[0-9a-f]{40}$ ]] || { echo "release SHA must be a full Git commit" >&2; exit 2; }
[[ -n "$destination" ]] || { echo "destination is required" >&2; exit 2; }
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${GH_TOKEN:?GH_TOKEN is required}"

run_id="$(gh api "repos/${GITHUB_REPOSITORY}/actions/artifacts?name=${artifact_name}&per_page=100" \
  --jq '.artifacts | map(select(.expired == false)) | sort_by(.created_at) | reverse | .[0].workflow_run.id // empty')"
[[ "$run_id" =~ ^[0-9]+$ ]] || { echo "No unexpired ${artifact_name} artifact exists." >&2; exit 1; }
conclusion="$(gh api "repos/${GITHUB_REPOSITORY}/actions/runs/${run_id}" --jq '.conclusion')"
[[ "$conclusion" == "success" ]] || { echo "Evidence run ${run_id} concluded ${conclusion}, not success." >&2; exit 1; }

mkdir -p "$destination"
gh run download "$run_id" --name "$artifact_name" --dir "$destination" >&2
printf '%s\n' "$run_id"
