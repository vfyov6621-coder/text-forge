import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, percent } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Текст не может быть пустым" },
        { status: 400 }
      );
    }

    if (!percent || typeof percent !== "number" || percent < 1 || percent > 100) {
      return NextResponse.json(
        { error: "Процент сжатия должен быть от 1 до 100" },
        { status: 400 }
      );
    }

    // Build the prompt
    let prompt =
      "Ты профессиональный аналитик текстов. Твоя задача — сделать пересказ предоставленного текста.\n" +
      "СТРОГО СОБЛЮДАЙ ПРАВИЛА:\n" +
      "1. Никаких вводных слов (не пиши 'В данном тексте рассказывается о...', сразу к делу).\n" +
      "2. Не придумывай факты от себя, используй только информацию из текста.\n" +
      "3. Сохраняй оригинальный язык текста.\n";

    // Adapt based on percent (compression level)
    if (percent <= 20) {
      prompt +=
        "4. УРОВЕНЬ СЖАТИЯ: УЛЬТРА-КОРОТКИЙ. Выдай только самую суть в виде 3-5 коротких тезисов (маркированный список).\n";
    } else if (percent <= 40) {
      prompt +=
        "4. УРОВЕНЬ СЖАТИЯ: СРЕДНИЙ. Кратко опиши основные события и аргументы, убрав воду. Используй абзацы.\n";
    } else if (percent <= 70) {
      prompt +=
        "4. УРОВЕНЬ СЖАТИЯ: ПОДРОБНЫЙ. Перескажи текст подробно, сохраняя большинство важных деталей и примеров.\n";
    } else {
      prompt +=
        "4. УРОВЕНЬ СЖАТИЯ: МИНИМАЛЬНЫЙ. Слегка перефразируй текст, убрав только откровенный мусор, но сохранив почти все детали.\n";
    }

    const wordCount = text.split(/\s+/).length;
    const targetWords = Math.round(wordCount * (percent / 100));

    prompt += `5. ОРИЕНТИРОВОЧНЫЙ ОБЪЕМ: примерно ${targetWords} слов.\n\nТЕКСТ ДЛЯ ПЕРЕСКАЗА:\n${text}`;

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0.3,
    });

    const summary = completion.choices[0]?.message?.content;

    if (!summary) {
      return NextResponse.json(
        { error: "Не удалось получить пересказ от ИИ" },
        { status: 500 }
      );
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Summarization error:", error);
    return NextResponse.json(
      { error: "Произошла ошибка при обработке запроса" },
      { status: 500 }
    );
  }
}
