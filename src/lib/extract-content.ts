import * as cheerio from 'cheerio';

export async function extractContentFromUrl(url: string): Promise<{
  title: string;
  text: string;
  wordCount: number;
  error?: string;
}> {
  // Validate URL format
  if (!url || typeof url !== 'string') {
    return { title: '', text: '', wordCount: 0, error: 'URL не указан' };
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return { title: '', text: '', wordCount: 0, error: 'URL должен начинаться с http:// или https://' };
  }

  try {
    new URL(trimmedUrl);
  } catch {
    return { title: '', text: '', wordCount: 0, error: 'Некорректный формат URL' };
  }

  try {
    const response = await fetch(trimmedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TextForge/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return { title: '', text: '', wordCount: 0, error: `Не удалось загрузить страницу (HTTP ${response.status})` };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return { title: '', text: '', wordCount: 0, error: 'Страница не является HTML-документом' };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    const removeSelectors = [
      'script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript', 'svg',
      '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
      '.ad', '.ads', '.advertisement', '.sidebar', '.comment', '.comments',
      '.share', '.social', '.newsletter', '.popup', '.modal', '.cookie',
    ];
    removeSelectors.forEach(selector => {
      $(selector).remove();
    });

    // Try to find main content
    const contentSelectors = [
      'article', 'main', '[role="main"]',
      '.post-content', '.article-content', '.entry-content',
      '.content', '#content',
    ];

    let contentElement: cheerio.Cheerio<cheerio.Element> | null = null;
    for (const selector of contentSelectors) {
      const el = $(selector);
      if (el.length > 0) {
        contentElement = el.first();
        break;
      }
    }

    const textSource = contentElement || $('body');

    // Extract and clean text
    let text = textSource.text() || '';
    text = text
      .replace(/\s+/g, ' ')  // Multiple whitespace → single space
      .replace(/\n\s*\n/g, '\n\n')  // Multiple newlines → double newline
      .trim();

    // Extract title
    let title = '';
    const h1 = $('h1').first().text().trim();
    const titleTag = $('title').text().trim();
    title = h1 || titleTag || '';

    if (!text || text.length < 50) {
      return { title, text: '', wordCount: 0, error: 'Не удалось извлечь содержимое из страницы. Возможно, страница требует JavaScript или защищена.' };
    }

    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

    return { title, text, wordCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
    if (message.includes('timeout') || message.includes('Timeout') || message.includes('abort')) {
      return { title: '', text: '', wordCount: 0, error: 'Превышено время ожидания при загрузке страницы' };
    }
    return { title: '', text: '', wordCount: 0, error: `Ошибка при загрузке страницы: ${message}` };
  }
}
