'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Copy,
  Check,
  Loader2,
  Link,
  Cpu,
  HardDrive,
  Monitor,
  Zap,
  ExternalLink,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { detectHardware, type HardwareInfo } from '@/lib/hardware-check';

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getCompressionColor(percent: number): string {
  if (percent <= 30) return 'text-emerald-500';
  if (percent <= 60) return 'text-amber-500';
  return 'text-red-500';
}

function getCompressionBgColor(percent: number): string {
  if (percent <= 30) return 'bg-emerald-500';
  if (percent <= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

function getCompressionLabel(percent: number): string {
  if (percent <= 20) return 'Минимум';
  if (percent <= 40) return 'Лёгкий';
  if (percent <= 60) return 'Средний';
  if (percent <= 80) return 'Сильный';
  return 'Максимум';
}

function getCompressionDescription(percent: number): string {
  const target = 100 - percent;
  if (target >= 80) return 'С сохранением почти всех деталей';
  if (target >= 50) return 'Подробный пересказ с важными деталями';
  if (target >= 30) return 'Краткое описание основных моментов';
  return 'Только суть — 3-5 тезисов';
}

function getScoreColor(score: number): string {
  if (score < 40) return 'bg-red-500';
  if (score <= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getScoreLabel(info: HardwareInfo): string {
  if (info.isWeak) return 'Слабая';
  if (info.isMedium) return 'Средняя';
  return 'Мощная';
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [compressionPercent, setCompressionPercent] = useState(30);
  const [model, setModel] = useState<'qwen' | 'mistral'>('qwen');
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [summary, setSummary] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [originalWordCount, setOriginalWordCount] = useState(0);
  const [summaryWordCount, setSummaryWordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'fetching' | 'summarizing'>('fetching');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const urlValid = url.trim().length > 0 && isValidUrl(url.trim());

  // Detect hardware on mount
  useEffect(() => {
    const hw = detectHardware();
    setHardware(hw);
    setModel(hw.recommendedModel);
  }, []);

  const compressionColor = useMemo(() => getCompressionColor(compressionPercent), [compressionPercent]);
  const compressionBgColor = useMemo(() => getCompressionBgColor(compressionPercent), [compressionPercent]);
  const compressionLabel = useMemo(() => getCompressionLabel(compressionPercent), [compressionPercent]);
  const compressionDesc = useMemo(() => getCompressionDescription(compressionPercent), [compressionPercent]);

  const handleSummarize = useCallback(async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      toast({ title: 'Ошибка', description: 'Вставьте ссылку на статью', variant: 'destructive' });
      return;
    }
    if (!isValidUrl(trimmedUrl)) {
      toast({ title: 'Ошибка', description: 'Некорректный формат URL', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setError('');
    setSummary('');
    setPageTitle('');
    setOriginalWordCount(0);
    setSummaryWordCount(0);
    setLoadingStage('fetching');

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: trimmedUrl,
          compressionPercent,
          model,
        }),
      });

      setLoadingStage('summarizing');

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Произошла ошибка');
        toast({ title: 'Ошибка', description: data.error || 'Произошла ошибка', variant: 'destructive' });
        return;
      }

      setSummary(data.summary);
      setPageTitle(data.title || '');
      setOriginalWordCount(data.originalWordCount || 0);
      setSummaryWordCount(data.summaryWordCount || 0);
    } catch {
      setError('Не удалось подключиться к серверу');
      toast({ title: 'Ошибка', description: 'Не удалось подключиться к серверу', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [url, compressionPercent, model, toast]);

  const handleCopy = useCallback(async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast({ title: 'Скопировано!', description: 'Пересказ скопирован в буфер обмена' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось скопировать текст', variant: 'destructive' });
    }
  }, [summary, toast]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSummarize();
      }
    },
    [handleSummarize]
  );

  // Global Ctrl+Enter handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSummarize();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSummarize]);

  const compressionRatio = originalWordCount > 0 && summaryWordCount > 0
    ? Math.round((1 - summaryWordCount / originalWordCount) * 100)
    : 0;

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-none">TextForge</h1>
            <p className="text-[11px] text-muted-foreground leading-none mt-0.5">AI Суммаризатор ссылок</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hardware && (
            <Badge variant="outline" className="text-[11px] gap-1.5 px-2 py-0.5">
              <Cpu className="w-3 h-3" />
              {getScoreLabel(hardware)} ({hardware.score})
            </Badge>
          )}
          <Badge variant="secondary" className="text-[11px] gap-1 px-2 py-0.5 capitalize">
            <Zap className="w-3 h-3" />
            {model}
          </Badge>
        </div>
      </header>

      {/* Main Content — Two Column */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel — Controls */}
        <div className="w-[380px] shrink-0 border-r overflow-y-auto">
          <div className="p-5 space-y-6">
            {/* URL Input */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5" />
                Ссылка на статью
              </Label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`h-10 text-sm ${url.trim().length > 0 && !urlValid ? 'border-red-500 focus-visible:ring-red-500/30' : ''}`}
                  disabled={isLoading}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-10 w-10"
                  disabled={isLoading || !url.trim()}
                  title="Загрузить и суммаризировать"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
              {url.trim().length > 0 && !urlValid && (
                <p className="text-xs text-red-500">Некорректный формат URL</p>
              )}
            </div>

            {/* Main Action Button */}
            <Button
              onClick={handleSummarize}
              disabled={isLoading || !urlValid}
              className="w-full h-11 text-sm font-semibold gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {loadingStage === 'fetching' ? 'Загружаю страницу...' : 'Анализирую текст...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Загрузить и суммаризировать
                </>
              )}
            </Button>

            <Separator />

            {/* Compression Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Сжатие</Label>
                <span className={`text-2xl font-bold tabular-nums ${compressionColor}`}>
                  {compressionPercent}%
                </span>
              </div>

              <Slider
                value={[compressionPercent]}
                onValueChange={(value) => setCompressionPercent(value[0])}
                min={10}
                max={90}
                step={5}
                className="w-full"
              />

              <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                <span className="text-emerald-500 font-medium">10% Минимум</span>
                <span className="text-amber-500 font-medium">50%</span>
                <span className="text-red-500 font-medium">90% Максимум</span>
              </div>

              <motion.div
                key={compressionPercent}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border"
              >
                <div className={`w-2 h-2 rounded-full ${compressionBgColor} shrink-0`} />
                <div>
                  <p className={`text-xs font-semibold ${compressionColor}`}>
                    {compressionLabel}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {compressionDesc}
                  </p>
                </div>
              </motion.div>
            </div>

            <Separator />

            {/* Model Selector */}
            <div className="space-y-2.5">
              <Label className="text-sm font-medium">AI Модель</Label>
              <Tabs
                value={model}
                onValueChange={(v) => setModel(v as 'qwen' | 'mistral')}
                className="w-full"
              >
                <TabsList className="w-full h-10">
                  <TabsTrigger value="qwen" className="flex-1 gap-1.5 text-xs">
                    {model === 'qwen' && hardware?.recommendedModel === 'qwen' && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-emerald-600 border-emerald-300">★</Badge>
                    )}
                    Qwen Plus
                  </TabsTrigger>
                  <TabsTrigger value="mistral" className="flex-1 gap-1.5 text-xs">
                    {model === 'mistral' && hardware?.recommendedModel === 'mistral' && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-emerald-600 border-emerald-300">★</Badge>
                    )}
                    Mistral Large
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {hardware && model !== hardware.recommendedModel && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Рекомендуется: {hardware.recommendedModel === 'qwen' ? 'Qwen Plus' : 'Mistral Large'} (для вашего железа)
                </p>
              )}
            </div>

            <Separator />

            {/* Hardware Info */}
            {hardware && (
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5" />
                  Ваше железо
                </Label>
                <div className="space-y-2.5 p-3 rounded-lg bg-muted/30 border border-border text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" />
                      CPU
                    </span>
                    <span className="font-medium">{hardware.cpuCores} ядер</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5" />
                      RAM
                    </span>
                    <span className="font-medium">{hardware.deviceMemory} ГБ</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5" />
                      GPU
                    </span>
                    <span className="font-medium text-right max-w-[200px] truncate" title={hardware.gpuRenderer}>
                      {hardware.gpuRenderer !== 'Unknown' ? hardware.gpuRenderer.split('/').pop()?.split('(')[0]?.trim() || hardware.gpuRenderer : 'Не определено'}
                    </span>
                  </div>
                  <Separator className="my-1" />
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Оценка</span>
                      <span className={`font-semibold ${getScoreColor(hardware.score).replace('bg-', 'text-').replace('-500', '-600')}`}>
                        {hardware.score}/100
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getScoreColor(hardware.score)}`}
                        style={{ width: `${hardware.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel — Result */}
        <div className="flex-1 overflow-y-auto">
          <div className="h-full flex flex-col">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col"
                >
                  {/* Loading skeleton with status */}
                  <div className="flex-1 p-6 space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                      {loadingStage === 'fetching' ? 'Загружаю страницу...' : 'Анализирую текст...'}
                    </div>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[95%]" />
                    <Skeleton className="h-4 w-[90%]" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[85%]" />
                    <Skeleton className="h-4 w-[70%]" />
                    <Skeleton className="h-4 w-[92%]" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[88%]" />
                    <Skeleton className="h-4 w-[60%]" />
                    <div className="h-4" />
                    <Skeleton className="h-4 w-[95%]" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[75%]" />
                  </div>
                </motion.div>
              ) : error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex items-center justify-center p-6"
                >
                  <div className="flex flex-col items-center text-center gap-3 max-w-md">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
                    <p className="text-xs text-muted-foreground">
                      Проверьте ссылку и попробуйте снова
                    </p>
                  </div>
                </motion.div>
              ) : summary ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col"
                >
                  {/* Summary header */}
                  <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-4 shrink-0">
                    <div className="min-w-0 flex-1">
                      {pageTitle && (
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <p className="text-sm font-medium text-foreground truncate" title={pageTitle}>
                            {pageTitle}
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Пересказ создан моделью {model === 'qwen' ? 'Qwen Plus' : 'Mistral Large'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-8 text-xs gap-1.5 shrink-0"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          Скопировано
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Копировать
                        </>
                      )}
                    </Button>
                  </div>

                  <Separator />

                  {/* Summary text */}
                  <div className="flex-1 p-6">
                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words max-w-none">
                      {summary}
                    </div>
                  </div>

                  <Separator />

                  {/* Stats bar */}
                  <div className="px-6 py-3 flex items-center gap-4 shrink-0 bg-muted/20">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{originalWordCount} слов в оригинале</span>
                      <span>→</span>
                      <span>{summaryWordCount} слов в пересказе</span>
                    </div>
                    {compressionRatio > 0 && (
                      <Badge variant="outline" className="text-xs font-medium">
                        Сжатие: {compressionRatio}%
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex items-center justify-center p-6"
                >
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                      <Link className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Вставьте ссылку на статью...
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Приложение загрузит содержимое страницы и создаст краткий пересказ
                      </p>
                    </div>
                    <div className="text-[11px] text-muted-foreground/50 flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-mono">Ctrl</kbd>
                      <span>+</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-mono">Enter</kbd>
                      <span>— быстрый старт</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-8 border-t flex items-center justify-center shrink-0 bg-background/80">
        <p className="text-[11px] text-muted-foreground">
          TextForge © 2026
        </p>
      </footer>
    </div>
  );
}
