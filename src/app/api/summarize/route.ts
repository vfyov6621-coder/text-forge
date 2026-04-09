import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { extractContentFromUrl } from "@/lib/extract-content";

const modelMap = {
  qwen: 'qwen-plus',
  mistral: 'mistral-large-latest',
} as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, compressionPercent, model } = body;

    // Validate URL
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return NextResponse.json(
        { error: 'URL не указан' },
        { status: 400 }
      );
    }

    // Validate compressionPercent
    if (typeof compressionPercent !== 'number' || compressionPercent < 10 || compressionPercent > 90) {
      return NextResponse.json(
        { error: 'Уровень сжатия должен быть от 10 до 90' },
        { status: 400 }
      );
    }

    // Validate model
    if (!model || !['qwen', 'mistral'].includes(model)) {
      return NextResponse.json(
        { error: 'Укажите модель: qwen или mistral' },
        { status: 400 }
      );
    }

    // Extract content from URL
    const extracted = await extractContentFromUrl(url.trim());

    if (extracted.error) {
      return NextResponse.json(
        { error: extracted.error },
        { status: 400 }
      );
    }

    if (!extracted.text || extracted.wordCount === 0) {
      return NextResponse.json(
        { error: 'Не удалось извлечь текст из страницы' },
        { status: 400 }
      );
    }

    // Calculate target percentage (inverted)
    const targetPercent = 100 - compressionPercent;
    const targetWords = Math.round(extracted.wordCount * (targetPercent / 100));

    // Determine compression level label
    let compressionLevel: string;
    if (targetPercent >= 80) {
      compressionLevel = 'МИНИМАЛЬНЫЙ. Слегка перефразируй, убрав мусор, сохранив почти все детали.';
    } else if (targetPercent >= 50) {
      compressionLevel = 'ПОДРОБНЫЙ. Перескажи подробно, сохраняя важные детали.';
    } else if (targetPercent >= 30) {
      compressionLevel = 'СРЕДНИЙ. Кратко опиши основные моменты, убрав воду.';
    } else {
      compressionLevel = 'УЛЬТРА-КОРОТКИЙ. Только суть в виде 3-5 тезисов (маркированный список).';
    }

    const systemPrompt = `Ты профессиональный аналитик текстов. Твоя задача — сделать точный пересказ предоставленного текста.`;

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
${extracted.text}`;

    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      model: modelMap[model as keyof typeof modelMap],
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.1,
    });

    const summary = completion.choices[0]?.message?.content;

    if (!summary) {
      return NextResponse.json(
        { error: 'Не удалось получить пересказ от ИИ' },
        { status: 500 }
      );
    }

    const summaryWordCount = summary.split(/\s+/).filter(w => w.length > 0).length;

    return NextResponse.json({
      summary,
      title: extracted.title,
      originalWordCount: extracted.wordCount,
      summaryWordCount,
      model,
    });
  } catch (error) {
    console.error('Summarization error:', error);
    return NextResponse.json(
      { error: 'Произошла ошибка при обработке запроса' },
      { status: 500 }
    );
  }
}
