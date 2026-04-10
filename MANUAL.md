# TextForge — Руководство пользователя

## Описание

TextForge — десктопное приложение для автоматической суммаризации веб-страниц с помощью AI. Поддерживает два режима работы:

- **Локальный** — GGUF-модели (Qwen 2.5, Mistral 7B) работают на вашем ПК через `llama.cpp`. 100% приватность, данные не покидают ваш компьютер.
- **Cloud** — облачный API (z-ai-web-dev-sdk). Не требует локальных ресурсов, но данные отправляются на сервер.

---

## Системные требования

### Минимальные (Qwen 2.5 1.5B)

| Компонент | Требование |
|-----------|-----------|
| CPU | 2+ ядер |
| RAM | 4+ ГБ (свободно ~2 ГБ для модели) |
| Диск | ~1.5 ГБ свободного места |
| Python | 3.9+ |

### Рекомендуемые (Mistral 7B Instruct)

| Компонент | Требование |
|-----------|-----------|
| CPU | 4+ ядер |
| RAM | 8+ ГБ (свободно ~5 ГБ для модели) |
| Диск | ~5 ГБ свободного места |
| Python | 3.9+ |

---

## Установка

### 1. Клонирование репозитория

```bash
git clone https://github.com/vfyov6621-coder/text-forge.git
cd text-forge
```

### 2. Зависимости frontend

```bash
bun install
```

> Требуется [Bun](https://bun.sh/) 1.0+ или Node.js 18+.

### 3. Скачивание моделей

Создайте директорию `models/` и скачайте GGUF-модели:

```bash
mkdir -p models
cd models

# Qwen 2.5 1.5B (для слабых ПК, ~1.1 ГБ)
curl -L -o qwen2.5-1.5b-instruct-q4_k_m.gguf \
  "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf"

# Mistral 7B (для мощных ПК, ~4.1 ГБ)
curl -L -o Mistral-7B-Instruct-v0.3-Q4_K_M.gguf \
  "https://huggingface.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF/resolve/main/Mistral-7B-Instruct-v0.3-Q4_K_M.gguf"
```

### 4. Python-окружение для inference-сервера

Скрипт `start.sh` создаст venv автоматически, но можно создать вручную:

```bash
python3 -m venv llama-env
llama-env/bin/pip install "llama-cpp-python[server]"
```

---

## Запуск

### Inference-сервер (обязательно для локального режима)

```bash
cd mini-services/inference-server

# Qwen по умолчанию (слабые ПК)
python3 server.py

# Или Mistral (мощные ПК)
python3 server.py --model mistral

# Или через start.sh
bash start.sh
bash start.sh --model mistral
```

Сервер запустится на `http://localhost:8081`.

Проверка:
```bash
curl http://localhost:8081/health
# {"status":"ok","current_model":"qwen","loaded_models":["qwen"],"models_available":["qwen","mistral"]}
```

### Frontend (Next.js)

```bash
bun run dev
```

Приложение будет доступно на `http://localhost:3000`.

---

## Использование

### 1. Вставьте ссылку

Вставьте URL статьи в поле ввода. Поддерживаются HTTP и HTTPS ссылки. Приложение извлечёт текст из страницы, автоматически убрав рекламу, навигацию и другие элементы.

### 2. Выберите бэкенд

- **Локальный** — требует запущенный inference-сервер. Приватность 100%. Скорость зависит от вашего железа.
- **Cloud** — не требует локального сервера. Работает через интернет.

### 3. Настройте сжатие

Ползунок от 10% до 90%:

| Значение | Уровень | Описание |
|----------|---------|----------|
| 10-20% | Минимум | Слегка перефразирует, сохраняет почти все детали |
| 30-50% | Подробный | Сохраняет важные детали, убирает воду |
| 60-70% | Средний | Краткое описание основных моментов |
| 80-90% | Максимум | Только суть — 3-5 тезисов |

### 4. Выберите модель

- **Qwen 2.5 1.5B** — лёгкая (~1.1 ГБ RAM), быстрая. Подходит для слабых ПК.
- **Mistral 7B** — мощная (~4.1 ГБ RAM), качественный пересказ. Требует 8+ ГБ RAM.

Приложение автоматически определяет ваше железо и рекомендует подходящую модель (значок «Рек.»).

### 5. Суммаризируйте

Нажмите кнопку «Загрузить и суммаризировать» или нажмите `Ctrl+Enter`.

### Горячие клавиши

| Комбинация | Действие |
|-----------|----------|
| `Ctrl+Enter` | Суммаризировать |

---

## Структура проекта

```
text-forge/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── summarize/
│   │   │       └── route.ts        # API суммаризации (local + cloud)
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # UI (десктопный интерфейс)
│   │   └── globals.css              # Стили Tailwind
│   └── lib/
│       ├── extract-content.ts       # Извлечение текста из URL (cheerio)
│       └── hardware-check.ts        # Детектор железа (CPU/RAM/GPU)
├── mini-services/
│   └── inference-server/
│       ├── server.py                # FastAPI inference-сервер (llama.cpp)
│       └── start.sh                 # Скрипт запуска
├── models/                          # GGUF-модели (не в git)
├── next.config.ts                   # Конфигурация Next.js
├── MANUAL.md                        # Этот файл
└── package.json
```

---

## API inference-сервера

Сервер запускается на порту 8081 и предоставляет следующие эндпоинты:

### `GET /health`

Проверка состояния сервера.

**Ответ:**
```json
{
  "status": "ok",
  "current_model": "qwen",
  "loaded_models": ["qwen"],
  "models_available": ["qwen", "mistral"]
}
```

### `POST /summarize`

Суммаризация текста.

**Тело запроса:**
```json
{
  "model": "qwen",
  "system_prompt": "Ты аналитик текстов.",
  "user_prompt": "Перескажи: ..."
}
```

**Ответ:**
```json
{
  "summary": "Пересказ текста...",
  "model": "qwen",
  "model_display": "Qwen 2.5 1.5B Instruct (Q4_K_M)",
  "tokens_prompt": 523,
  "tokens_generated": 187
}
```

### `POST /load`

Загрузить модель в память (lazy loading).

```json
{ "model": "mistral" }
```

### `POST /unload`

Выгрузить модель из памяти.

```json
{ "model": "mistral" }
```

---

## Защита от галлюцинаций

TextForge использует несколько механизмов для минимизации галлюцинаций:

1. **Температура 0.1** — минимальная креативность, максимум фактов
2. **9 строгих правил в промте** — запрет на выдумки, цифры, даты имена, которые отсутствуют в исходном тексте
3. **repeat_penalty 1.1** — штраф за повторения
4. **top_p 0.9** — nucleus sampling для стабильности

---

## Решение проблем

### Сервер не запускается

```
ModuleNotFoundError: No module named 'llama_cpp'
```
Решение: установите зависимости Python.
```bash
llama-env/bin/pip install "llama-cpp-python[server]"
```

### Модель не найдена

```
FileNotFoundError: Файл модели не найден: .../models/qwen2.5-1.5b-instruct-q4_k_m.gguf
```
Решение: скачайте модели в директорию `models/` (см. раздел «Скачивание моделей»).

### Out of memory

При загрузке Mistral 7B не хватает RAM. Решения:
- Закройте другие приложения
- Используйте Qwen 2.5 1.5B (требует ~2 ГБ)
- Увеличите swap-файл

### Не удаётся извлечь текст из страницы

Возможные причины:
- Страница требует JavaScript (SPA) — TextForge использует server-side fetching
- Страница защищена Cloudflare/bot-защитой
- Страница возвращает non-HTML content

### Frontend не работает

```bash
bun run dev
# Ошибка: EADDRINUSE
```
Решение: убейте процесс на порту 3000.
```bash
fuser -k 3000/tcp
```

---

## Технологии

| Компонент | Технология |
|-----------|-----------|
| Frontend | Next.js 16, React, TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend API | Next.js API Routes |
| Content extraction | cheerio |
| Local inference | llama-cpp-python, FastAPI, uvicorn |
| Models | Qwen 2.5 1.5B Instruct (Q4_K_M), Mistral 7B Instruct v0.3 (Q4_K_M) |
| Cloud fallback | z-ai-web-dev-sdk |
