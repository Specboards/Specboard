#!/usr/bin/env bash
# Point this repo's Git hooks at the versioned .githooks/ directory.
# Run once per clone: scripts/specboards/install-hooks.sh
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
git -C "$root" config core.hooksPath .githooks
chmod +x "$root"/.githooks/* 2>/dev/null || true

echo "Installed Specboard Git hooks (core.hooksPath=.githooks)."
echo "The pre-push hook only acts when the 'specboards' CLI is installed and"
echo "logged in. Set it up with:"
echo "  pnpm --filter @specboards/cli build && pnpm --filter @specboards/cli exec npm link"
echo "  specboards auth login --url https://app.specboards.ai"
