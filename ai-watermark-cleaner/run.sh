#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export HF_HOME="$DIR/.cache/huggingface"
export TORCH_HOME="$DIR/.cache/torch"

exec "$DIR/.venv/bin/remove-ai-watermarks" "$@"
