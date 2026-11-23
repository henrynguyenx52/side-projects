#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
case "${1:-}" in
  artifacts)
    rm -rf "$ROOT/repo/.venv" "$ROOT/repo/models" "$ROOT/repo/sample_results" "$ROOT/models" "$ROOT/outputs" "$ROOT/logs"
    echo "Removed local environments, model weights, outputs, and logs."
    ;;
  all)
    echo "This removes the cloned repository at: $ROOT/repo"
    read -r -p "Type REMOVE to continue: " answer
    [[ "$answer" == "REMOVE" ]] || { echo "Cancelled."; exit 1; }
    rm -rf "$ROOT/repo"
    echo "Removed cloned repository and artifacts."
    ;;
  *)
    echo "Usage: $0 artifacts   # remove venv/models/outputs, keep source clone"
    echo "       $0 all         # remove the cloned repository after confirmation"
    exit 2
    ;;
esac
