#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# SoulX FlashHead — Apple Silicon Setup Script
# ─────────────────────────────────────────────────────────────
# This script does a ONE-TIME setup:
#   1. Checks prerequisites (brew, git, Python 3.11+)
#   2. Creates a Python virtual environment
#   3. Installs all dependencies (MPS-optimized, no CUDA-only packages)
#   4. Downloads model weights via hf download
#
# Run:  chmod +x setup.sh && ./setup.sh
# ─────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MODEL_DIR="$SCRIPT_DIR/models"
VENV_DIR="$SCRIPT_DIR/.venv"

# ── Colors ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}ℹ${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
err()   { echo -e "${RED}✗${NC} $1"; }

# ────────────────────────────────────────
# 1. Prerequisites
# ────────────────────────────────────────
echo ""
echo -e "${CYAN}══════════════════════════════════════════${NC}"
echo -e "${CYAN}  SoulX FlashHead — Apple Silicon Setup${NC}"
echo -e "${CYAN}══════════════════════════════════════════${NC}"
echo ""

# Python 3.11+
PYTHON=$(command -v python3 || true)
if [ -z "$PYTHON" ]; then
    err "Python 3 not found. Install it from https://www.python.org/downloads/ or 'brew install python'"
    exit 1
fi
PY_VER=$("$PYTHON" --version 2>&1 | grep -oE '[0-9]+\.[0-9]+')
info "Python $PY_VER detected"

# Check for Apple Silicon
ARCH=$(uname -m)
if [ "$ARCH" != "arm64" ]; then
    warn "Not running on Apple Silicon (arm64). MPS backend may not be available."
fi

# Homebrew
if ! command -v brew &>/dev/null; then
    warn "Homebrew not found. Installing system deps may fail."
    warn "Install Homebrew: https://brew.sh/"
fi

# Git
if ! command -v git &>/dev/null; then
    err "git not found. Install Xcode Command Line Tools: xcode-select --install"
    exit 1
fi

# ────────────────────────────────────────
# 2. System Dependencies (brew)
# ────────────────────────────────────────
echo ""
info "Checking system dependencies..."

if command -v brew &>/dev/null; then
    for pkg in ffmpeg; do
        if brew list "$pkg" &>/dev/null 2>&1; then
            ok "$pkg already installed"
        else
            info "Installing $pkg via Homebrew..."
            brew install "$pkg"
            ok "$pkg installed"
        fi
    done
fi

# ────────────────────────────────────────
# 3. Code already in repo (flattened)
# ────────────────────────────────────────
echo ""
info "Code is already in the project root (flattened structure)"

# ────────────────────────────────────────
# 3. Python Virtual Environment
# ────────────────────────────────────────
echo ""
info "Creating Python virtual environment..."

if [ -d "$VENV_DIR" ]; then
    info "Virtual environment exists — updating pip..."
else
    "$PYTHON" -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
ok "Virtual env: $VENV_DIR"

# Upgrade pip
pip install --upgrade pip setuptools wheel

# ────────────────────────────────────────
# 4. Install Python Dependencies
# ────────────────────────────────────────
echo ""
info "Installing Python dependencies (this may take a few minutes)..."

# Install PyTorch with MPS support (macOS ARM64 default wheel)
pip install torch torchvision torchaudio

# Install everything else
pip install -r "$SCRIPT_DIR/requirements.txt"

ok "All Python dependencies installed"

# ────────────────────────────────────────
# 5. Download Models
# ────────────────────────────────────────
echo ""
info "Downloading model weights (~2.6 GB total, this will take a while)..."

mkdir -p "$MODEL_DIR/SoulX-FlashHead-1_3B" "$MODEL_DIR/wav2vec2-base-960h"

# FlashHead 1.3B model
if [ -z "$(ls -A "$MODEL_DIR/SoulX-FlashHead-1_3B" 2>/dev/null)" ]; then
    info "Downloading SoulX-FlashHead-1_3B..."
    hf download Soul-AILab/SoulX-FlashHead-1_3B \
        --local-dir "$MODEL_DIR/SoulX-FlashHead-1_3B"
    ok "SoulX-FlashHead-1_3B downloaded"
else
    ok "SoulX-FlashHead-1_3B already present"
fi

# wav2vec2 model
if [ -z "$(ls -A "$MODEL_DIR/wav2vec2-base-960h" 2>/dev/null)" ]; then
    info "Downloading wav2vec2-base-960h..."
    hf download facebook/wav2vec2-base-960h \
        --local-dir "$MODEL_DIR/wav2vec2-base-960h"
    ok "wav2vec2-base-960h downloaded"
else
    ok "wav2vec2-base-960h already present"
fi

# ────────────────────────────────────────
# Done
# ────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo ""
echo "  To launch the Gradio interface:"
echo ""
echo "    cd $SCRIPT_DIR"
echo "    ./run.sh"
echo ""
echo "  Or manually:"
echo "    source $VENV_DIR/bin/activate"
echo "    cd $SCRIPT_DIR && python gradio_app.py"
echo ""
