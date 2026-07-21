#!/usr/bin/env bash
# Drive Specboard work-item status from a pull request, via the CLI.
#   PR opened / updated  -> set each touched spec in_progress + link the PR
#   PR merged            -> set each touched spec done
#
# Uses `status --advance` so a spec several stages behind the target is walked
# through the intermediate statuses (e.g. in_progress from backlog goes via
# defining -> ready). Best-effort: if no legal path exists the step is logged
# and skipped, never fatal.
# Expects the env the CI workflow provides (SPECBOARDS_URL/TOKEN, BASE_SHA,
# HEAD_SHA, PR_NUMBER, PR_BODY, ACTION, MERGED).
set -uo pipefail

if [ -z "${SPECBOARDS_URL:-}" ] || [ -z "${SPECBOARDS_TOKEN:-}" ]; then
  echo "Specboard secrets not set; skipping sync."
  exit 0
fi

here="$(cd "$(dirname "$0")" && pwd)"
cli=(node apps/cli/dist/index.js)

ids="$(PR_BODY="${PR_BODY:-}" bash "$here/resolve-spec-ids.sh" "${BASE_SHA:-origin/main}" "${HEAD_SHA:-HEAD}")"
if [ -z "$ids" ]; then
  echo "No spec ids resolved for this PR; nothing to sync."
  exit 0
fi

while IFS= read -r id; do
  [ -n "$id" ] || continue
  if [ "${ACTION:-}" = "closed" ] && [ "${MERGED:-}" = "true" ]; then
    echo "==> $id: done"
    "${cli[@]}" status "$id" done --advance || echo "  (skip: no legal path to 'done' from current status)"
  else
    echo "==> $id: in_progress + link PR #${PR_NUMBER:-?}"
    "${cli[@]}" status "$id" in_progress --advance || echo "  (skip: no legal path to 'in_progress' from current status)"
    if [ -n "${PR_NUMBER:-}" ]; then
      "${cli[@]}" link "$id" --pr "$PR_NUMBER" || echo "  (skip: link failed, maybe already linked)"
    fi
  fi
done <<EOF
$ids
EOF
