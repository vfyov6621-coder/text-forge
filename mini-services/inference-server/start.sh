#!/usr/bin/env bash
# ─── TextForge Inference Server — launcher ─────────────────────────────
# Usage:
#   bash start.sh              # Qwen (default, weak PCs)
#   bash start.sh --model mistral   # Mistral 7B (powerful PCs)
#   bash start.sh --port 9000       # Custom port

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")/.."
VENV_DIR="$PROJECT_ROOT/llama-env"

# ── Create venv if missing ────────────────────────────────────────────
if [ ! -d "$VENV_DIR" ]; then
    echo "[SETUP] Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
    "$VENV_DIR/bin/pip" install --quiet "llama-cpp-python[server]"
    echo "[SETUP] Done."
fi

# ── Check models ──────────────────────────────────────────────────────
MODELS_DIR="$PROJECT_ROOT/models"
if [ ! -d "$MODELS_DIR" ]; then
    echo "[ERROR] models/ directory not found at $MODELS_DIR"
    echo "        Download models first (see MANUAL.md)"
    exit 1
fi

found=0
for model_file in "$MODELS_DIR"/*.gguf; do
    if [ -f "$model_file" ]; then
        size=$(du -h "$model_file" | cut -f1)
        echo "  [OK] $(basename "$model_file") ($size)"
        found=$((found + 1))
    fi
done

if [ "$found" -eq 0 ]; then
    echo "[ERROR] No .gguf model files found in $MODELS_DIR"
    echo "        Download models first (see MANUAL.md)"
    exit 1
fi

echo ""
echo "[START] TextForge Inference Server..."
"$VENV_DIR/bin/python" "$SCRIPT_DIR/server.py" "$@"
