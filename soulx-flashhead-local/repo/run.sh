#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# SoulX FlashHead — Launch Script (Apple Silicon)
# ─────────────────────────────────────────────────────────────
# Sources the venv and runs the patched Gradio interface.
# The app starts on http://127.0.0.1:7860 with a public share link.
#
# Usage:  ./run.sh
# ─────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"

# ── Colors ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

# ── Check prerequisites ──
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${RED}✗${NC} Virtual environment not found. Run ./setup.sh first."
    exit 1
fi

if [ ! -f "$SCRIPT_DIR/gradio_app.py" ]; then
    echo -e "${RED}✗${NC} gradio_app.py not found. Run ./setup.sh first."
    exit 1
fi

# ── Activate venv ──
source "$VENV_DIR/bin/activate"

# ── macOS OpenMP fix (libomp from brew) ──
if [ -d /opt/homebrew/lib ]; then
    export DYLD_LIBRARY_PATH="${DYLD_LIBRARY_PATH:-}:/opt/homebrew/lib"
fi

# ── Launch ──
echo ""
echo -e "${CYAN}══════════════════════════════════════════${NC}"
echo -e "${CYAN}  SoulX FlashHead - AI Talking Head${NC}"
echo -e "${CYAN}  Apple Silicon (MPS) Edition${NC}"
echo -e "${CYAN}══════════════════════════════════════════${NC}"
echo ""
echo -e "  Repo:  ${GREEN}$SCRIPT_DIR${NC}"
echo -e "  Env:   ${GREEN}$VENV_DIR${NC}"
echo ""
echo -e "  ${YELLOW}⏳ Launching Gradio...${NC}"
echo -e "  ${YELLOW}   Local URL:  http://127.0.0.1:7860${NC}"
echo -e "  ${YELLOW}   Share URL:  will appear in logs${NC}"
echo ""

cd "$SCRIPT_DIR"
python gradio_app.py

echo ""
echo -e "${RED}Gradio exited.${NC}"
