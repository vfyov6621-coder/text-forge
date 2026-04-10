"""
TextForge Inference Server — локальный сервер для GGUF-моделей.
Запускает llama.cpp через llama-cpp-python и предоставляет HTTP API.

Модели:
  - qwen2.5-1.5b-instruct-q4_k_m.gguf  (слабые ПК)
  - Mistral-7B-Instruct-v0.3-Q4_K_M.gguf (мощные ПК)

Использование:
  python server.py [--model qwen|mistral] [--port 8081]
"""

import os
import sys
import argparse
import time
import threading
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# ─── Конфигурация путей ───────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = PROJECT_ROOT / "models"

MODEL_PATHS = {
    "qwen": str(MODELS_DIR / "qwen2.5-1.5b-instruct-q4_k_m.gguf"),
    "mistral": str(MODELS_DIR / "Mistral-7B-Instruct-v0.3-Q4_K_M.gguf"),
}

MODEL_DISPLAY = {
    "qwen": "Qwen 2.5 1.5B Instruct (Q4_K_M)",
    "mistral": "Mistral 7B Instruct v0.3 (Q4_K_M)",
}

# ─── Pydantic-модели ───────────────────────────────────────────────────
class LoadRequest(BaseModel):
    model: str

class SummarizeRequest(BaseModel):
    model: str | None = None
    system_prompt: str | None = None
    user_prompt: str = ""

class HealthResponse(BaseModel):
    status: str
    current_model: str | None
    loaded_models: list[str]
    models_available: list[str]

# ─── FastAPI ────────────────────────────────────────────────────────────
app = FastAPI(title="TextForge Inference Server", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Глобальное хранилище загруженных моделей
_models: dict = {}
_current_model: str | None = None
_loading = False
_load_error: str | None = None


def _load_model(model_name: str):
    """Загрузка GGUF-модели в память."""
    global _current_model, _loading, _load_error

    if model_name in _models:
        _current_model = model_name
        return

    if model_name not in MODEL_PATHS:
        raise ValueError(f"Неизвестная модель: {model_name}. Доступные: {list(MODEL_PATHS.keys())}")

    model_path = MODEL_PATHS[model_name]
    if not os.path.isfile(model_path):
        raise FileNotFoundError(f"Файл модели не найден: {model_path}")

    _loading = True
    _load_error = None
    try:
        from llama_cpp import Llama

        print(f"[INFO] Загрузка модели: {MODEL_DISPLAY.get(model_name, model_name)}...")
        start = time.time()

        llm = Llama(
            model_path=model_path,
            n_ctx=4096,
            n_threads=max(2, os.cpu_count() or 4),
            verbose=False,
            use_mlock=True,
        )

        elapsed = time.time() - start
        print(f"[INFO] Модель загружена за {elapsed:.1f}с")

        _models[model_name] = llm
        _current_model = model_name
    except Exception as e:
        _load_error = str(e)
        print(f"[ERROR] Ошибка загрузки модели: {e}")
        raise
    finally:
        _loading = False


def _unload_model(model_name: str):
    """Выгрузка модели из памяти."""
    global _current_model
    if model_name in _models:
        try:
            # llama-cpp-python не имеет явного unload, но мы можем удалить объект
            del _models[model_name]
            if _current_model == model_name:
                _current_model = None
            print(f"[INFO] Модель {model_name} выгружена")
        except Exception as e:
            print(f"[WARN] Ошибка выгрузки: {e}")


# ─── Эндпоинты ──────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="loading" if _loading else "ok",
        current_model=_current_model,
        loaded_models=list(_models.keys()),
        models_available=list(MODEL_PATHS.keys()),
    )


@app.post("/load")
async def load(req: LoadRequest):
    """Загрузить модель (lazy loading)."""
    try:
        _load_model(req.model)
        return {"status": "loaded", "model": req.model, "display": MODEL_DISPLAY.get(req.model)}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.post("/unload")
async def unload(req: LoadRequest):
    """Выгрузить модель из памяти."""
    _unload_model(req.model)
    return {"status": "unloaded", "model": req.model}


@app.post("/summarize")
async def summarize(req: SummarizeRequest):
    """Суммаризация текста через загруженную модель."""
    model_name = req.model or _current_model
    if not model_name:
        return {"error": "Модель не загружена. Вызовите /load сначала."}

    if model_name not in _models:
        try:
            _load_model(model_name)
        except Exception as e:
            return {"error": f"Не удалось загрузить модель {model_name}: {e}"}

    llm = _models[model_name]
    system_prompt = req.system_prompt or "Ты профессиональный аналитик текстов."

    try:
        response = llm.create_chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": req.user_prompt},
            ],
            max_tokens=800,
            temperature=0.1,
            top_p=0.9,
            repeat_penalty=1.1,
        )

        summary = response["choices"][0]["message"]["content"].strip()
        usage = response.get("usage", {})

        return {
            "summary": summary,
            "model": model_name,
            "model_display": MODEL_DISPLAY.get(model_name),
            "tokens_prompt": usage.get("prompt_tokens", 0),
            "tokens_generated": usage.get("completion_tokens", 0),
        }
    except Exception as e:
        return {"error": f"Ошибка генерации: {e}"}


# ─── Точка входа ────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TextForge Inference Server")
    parser.add_argument("--model", default="qwen", choices=["qwen", "mistral"],
                        help="Модель по умолчанию (qwen для слабых ПК, mistral для мощных)")
    parser.add_argument("--port", type=int, default=8081, help="Порт сервера")
    parser.add_argument("--host", default="0.0.0.0", help="Хост сервера")
    args = parser.parse_args()

    # Проверяем наличие файлов моделей
    for name, path in MODEL_PATHS.items():
        exists = os.path.isfile(path)
        size_mb = os.path.getsize(path) / (1024 * 1024) if exists else 0
        print(f"  [{'OK' if exists else 'MISSING'}] {MODEL_DISPLAY[name]}: {size_mb:.0f} MB" if exists
              else f"  [MISSING] {MODEL_DISPLAY[name]}: файл не найден ({path})")

    # Загружаем модель по умолчанию
    try:
        _load_model(args.model)
    except Exception as e:
        print(f"[FATAL] Не удалось загрузить модель по умолчанию: {e}")
        print("Сервер запущен, но модель не загружена. Используйте /load для загрузки.")

    print(f"\n[INFO] TextForge Inference Server запущен на http://{args.host}:{args.port}")
    print(f"[INFO] Модель по умолчанию: {MODEL_DISPLAY[args.model]}")

    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")
