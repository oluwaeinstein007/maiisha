#!/usr/bin/env bash
# Serializes `docker compose` invocations against this repo (e.g. two
# terminals/sessions both running `build`/`up --build` at once) using a
# file lock, so overlapping builds can't interleave and corrupt each
# other's image layers. Not a substitute for giving dev/prod variants
# distinct image tags (see docker-compose.dev.yml) — that fix prevents
# them from *overwriting* each other; this one prevents them from
# *racing* while either is mid-build.
#
# Usage: identical to `docker compose`, e.g.
#   scripts/docker-compose.sh up -d --build
#   scripts/docker-compose.sh -f docker-compose.yml -f docker-compose.dev.yml build
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
lock_file="${repo_root}/.docker-compose.lock"

exec flock "$lock_file" docker compose "$@"
