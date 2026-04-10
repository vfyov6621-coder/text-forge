import { NextResponse } from "next/server";
import { extractContentFromUrl } from "@/lib/extract-content";

/**
 * TextForge Summarize API
 *
 * Поддерживает два бэкенда:
 * 1. Локальный inference-сервер (llama.cpp) — порт 8081
 * 2. z-ai-web-dev-sdk (cloud fallback)
 */

const INFERENCE_PORT = 8081;

interface SummarizeRequest {
  url: string;
  compressionPercent: number;
  model: "qwen" | "mistral";
  backend: "local" | "cloud";
}

export async function POST(request: Request) {
  try {
    const body: SummarizeRequest = await request.json();
    const { url, compressionPercent, model, backend } = body;

    // ─── Валидация ────────────────────────────────────────
    if (!url || typeof url !== "string" || url.trim().length === 0) {
      return NextResponse.json({ error: "URL не указан" }, { status: 400 });
    }

    if (
      typeof compressionPercent !== "number" ||
      compressionPercent < 10 ||
      compressionPercent > 90
    ) {
      return NextResponse.json(
        { error: "Уровень сжатия должен быть от 10 до 90" },
        { status: 400 }
      );
    }

    if (!model || !["qwen", "mistral"].includes(model)) {
      return NextResponse.json(
        { error: "Укажите модель: qwen или mistral" },
        { status: 400 }
      );
    }

    // ─── Извлечение контента из URL ───────────────────────
    const extracted = await extractContentFromUrl(url.trim());

    if (extracted.error) {
      return NextResponse.json({ error: extracted.error }, { status: 400 });
    }

    if (!extracted.text || extracted.wordCount === 0) {
      return NextResponse.json(
        { error: "Не удалось извлечь текст из страницы" },
        { status: 400 }
      );
    }

    // ─── Ограничение длины текста ────────────────────────
    let textForSummary = extracted.text;
    const MAX_CHARS = 30000;
    if (textForSummary.length > MAX_CHARS) {
      textForSummary = textForSummary.slice(0, MAX_CHARS);
    }

    // ─── Построение промта ────────────────────────────────
    const targetPercent = 100 - compressionPercent;
    const targetWords = Math.round(
      extracted.wordCount * (targetPercent / 100)
    );

    let compressionLevel: string;
    if (targetPercent >= 80) {
      compressionLevel =
        "МИНИМАЛЬНЫЙ. Слегка перефразируй, убрав мусор, сохранив почти все детали.";
    } else if (targetPercent >= 50) {
      compressionLevel =
        "ПОДРОБНЫЙ. Перескажи подробно, сохраняя важные детали.";
    } else if (targetPercent >= 30) {
      compressionLevel =
        "СРЕДНИЙ. Кратко опиши основные моменты, убрав воду.";
    } else {
      compressionLevel =
        "УЛЬТРА-КОРОТКИЙ. Только суть в виде 3-5 тезисов (маркированный список).";
    }

    const systemPrompt =
      "Ты профессиональный аналитик текстов. Твоя задача — сделать точный пересказ предоставленного текста.";

    const userPrompt = `СТРОГО СОБЛЮДАЙ ПРАВИЛА:
1. Никаких вводных слов — сразу к делу.
2. Используй ТОЛЬКО информацию из текста. Не добавляй, не предполагай, не интерпретируй.
3. Не придумывай цифры, даты, имена или факты, которых нет в исходном тексте.
4. Если в тексте нет данных по какому-то аспекту — просто не упоминай его.
5. Сохраняй оригинальный язык текста.
6. Не добавляй заключения, выводов или рекомендаций от себя.
7. Сохраняй точные формулировки для специфических терминов и названий.
8. УРОВЕНЬ СЖАТИЯ: ${compressionLevel}
9. ОРИЕНТИРОВОЧНЫЙ ОБЪЕМ: примерно ${targetWords} слов.

ТЕКСТ ДЛЯ ПЕРЕСКАЗА:
${textForSummary}`;

    // ─── Вызов ИИ ─────────────────────────────────────────
    let summary: string;
    let modelUsed: string;
    let tokensPrompt = 0;
    let tokensGenerated = 0;

    if (backend === "local") {
      const result = await callLocalInference(model, systemPrompt, userPrompt);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 502 });
      }
      summary = result.summary!;
      modelUsed = result.model_display || model;
      tokensPrompt = result.tokens_prompt || 0;
      tokensGenerated = result.tokens_generated || 0;
    } else {
      const result = await callCloudInference(model, systemPrompt, userPrompt);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 502 });
      }
      summary = result.summary!;
      modelUsed = result.model_display || model;
    }

    if (!summary) {
      return NextResponse.json(
        { error: "Не удалось получить пересказ от ИИ" },
        { status: 500 }
      );
    }

    const summaryWordCount = summary.split(/\s+/).filter((w) => w.length > 0).length;

    return NextResponse.json({
      summary,
      title: extracted.title,
      originalWordCount: extracted.wordCount,
      summaryWordCount,
      model: modelUsed,
      backend,
      tokensPrompt,
      tokensGenerated,
    });
  } catch (error) {
    console.error("Summarization error:", error);
    return NextResponse.json(
      { error: "Произошла ошибка при обработке запроса" },
      { status: 500 }
    );
  }
}

// ─── Локальный inference (llama.cpp) ──────────────────────────────────

async function callLocalInference(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{
  summary?: string;
  model_display?: string;
  tokens_prompt?: number;
  tokens_generated?: number;
  error?: string;
}> {
  try {
    // FIX: Правильный URL — XTransformPort как query-параметр
    const healthRes = await fetch(`/health?XTransformPort=${INFERENCE_PORT}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!healthRes.ok) {
      return { error: "Inference-сервер недоступен. Убедитесь, что он запущен (порт 8081)." };
    }

    const res = await fetch(`/summarize?XTransformPort=${INFERENCE_PORT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
      }),
      signal: AbortSignal.timeout(300000),
    });

    const data = await res.json();
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Не удалось подключиться к inference-серверу";
    return {
      error: `Локальный сервер: ${msg}. Запустите: cd mini-services/inference-server && python3 server.py`,
    };
  }
}

// ─── Cloud inference (z-ai-web-dev-sdk) ──────────────────────────────

async function callCloudInference(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{
  summary?: string;
  model_display?: string;
  error?: string;
}> {
  const cloudModelMap: Record<string, string> = {
    qwen: "qwen-plus",
    mistral: "mistral-large-latest",
  };

  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      model: cloudModelMap[model] || "qwen-plus",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.1,
    });

    const summary = completion.choices[0]?.message?.content;
    return {
      summary: summary || undefined,
      model_display: `${model} (cloud)`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Cloud API error";
    return { error: `Cloud API: ${msg}` };
  }
}
