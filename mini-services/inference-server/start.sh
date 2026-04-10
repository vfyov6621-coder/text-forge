#!/usr/bin/env bash
# ─── TextForge Inference Server — скрипт запуска ───────────────────────
# Использование:
#   ./start.sh              # Запустить с Qwen (по умолчанию)
#   ./start.sh --model mistral  # Запустить с Mistral 7B
#   ./start.sh --port 9000      # Указать порт

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$(dirname "$SCRIPT_DIR")/../llama-env"

# Создаём venv если нет
if [ ! -d "$VENV_DIR" ]; then
    echo "[SETUP] Создаём виртуальное окружение..."
    python3 -m venv "$VENV_DIR"
    "$VENV_DIR/bin/pip" install --quiet "llama-cpp-python[server]"
fi

# Проверяем модели
MODELS_DIR="$(dirname "$SCRIPT_DIR")/../models"
for model_file in "$MODELS_DIR"/*.gguf; do
    if [ -f "$model_file" ]; then
        size=$(du -h "$model_file" | cut -f1)
        echo "  [OK] $(basename "$model_file") ($size)"
    fi
done

echo ""
echo "[START] TextForge Inference Server..."
"$VENV_DIR/bin/python" "$SCRIPT_DIR/server.py" "$@"
