'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
  AlertCircle,
  FileText,
  Server,
  Cloud,
  Shield,
  WifiOff,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Terminal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { detectHardware, type HardwareInfo } from '@/lib/hardware-check';

// ─── Утилиты ──────────────────────────────────────────────────────────

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getCompressionColor(percent: number): string {
  if (percent <= 30) return 'text-emerald-600 dark:text-emerald-400';
  if (percent <= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
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

function getScoreBarColor(score: number): string {
  if (score < 40) return 'bg-red-500';
  if (score <= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getScoreTextColor(score: number): string {
  if (score < 40) return 'text-red-600 dark:text-red-400';
  if (score <= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

function getScoreLabel(info: HardwareInfo): string {
  if (info.isWeak) return 'Слабая';
  if (info.isMedium) return 'Средняя';
  return 'Мощная';
}

function getModelDisplayName(model: string): string {
  if (model === 'qwen') return 'Qwen 2.5 1.5B';
  return 'Mistral 7B Instruct';
}

// ─── Компонент ────────────────────────────────────────────────────────

export default function Home() {
  const [url, setUrl] = useState('');
  const [compressionPercent, setCompressionPercent] = useState(30);
  const [model, setModel] = useState<'qwen' | 'mistral'>('qwen');
  const [backend, setBackend] = useState<'local' | 'cloud'>('local');
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [serverOnline, setServerOnline] = useState(false);
  const [serverLoading, setServerLoading] = useState(false);
  const [hwExpanded, setHwExpanded] = useState(false);

  const [summary, setSummary] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [originalWordCount, setOriginalWordCount] = useState(0);
  const [summaryWordCount, setSummaryWordCount] = useState(0);
  const [usedModel, setUsedModel] = useState('');
  const [usedTokens, setUsedTokens] = useState({ prompt: 0, generated: 0 });

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'fetching' | 'summarizing'>('fetching');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const urlValid = url.trim().length > 0 && isValidUrl(url.trim());
  const canSummarize = backend === 'cloud' || serverOnline;

  // ─── Инициализация ─────────────────────────────────────────────────
  useEffect(() => {
    const hw = detectHardware();
    setHardware(hw);
    setModel(hw.recommendedModel);
  }, []);

  // FIX: Правильный URL для health-check inference-сервера
  const checkServer = useCallback(async () => {
    setServerLoading(true);
    try {
      const res = await fetch('/health?XTransformPort=8081', {
        signal: AbortSignal.timeout(3000),
      });
      setServerOnline(res.ok);
    } catch {
      setServerOnline(false);
    } finally {
      setServerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (backend === 'local') checkServer();
    else setServerOnline(false);
  }, [backend, checkServer]);

  useEffect(() => {
    if (backend !== 'local') return;
    const interval = setInterval(checkServer, 15000);
    return () => clearInterval(interval);
  }, [backend, checkServer]);

  const compressionColor = useMemo(() => getCompressionColor(compressionPercent), [compressionPercent]);
  const compressionBgColor = useMemo(() => getCompressionBgColor(compressionPercent), [compressionPercent]);
  const compressionLabel = useMemo(() => getCompressionLabel(compressionPercent), [compressionPercent]);
  const compressionDesc = useMemo(() => getCompressionDescription(compressionPercent), [compressionPercent]);

  // ─── Суммаризация ───────────────────────────────────────────────────
  const handleSummarize = useCallback(async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      toast({ title: 'Ошибка', description: 'Вставьте ссылку на статью', variant: 'destructive' });
      inputRef.current?.focus();
      return;
    }
    if (!isValidUrl(trimmedUrl)) {
      toast({ title: 'Ошибка', description: 'Некорректный формат URL (нужен http:// или https://)', variant: 'destructive' });
      return;
    }
    if (backend === 'local' && !serverOnline) {
      toast({ title: 'Ошибка', description: 'Inference-сервер не запущен. Запустите его через терминал.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setError('');
    setSummary('');
    setPageTitle('');
    setOriginalWordCount(0);
    setSummaryWordCount(0);
    setUsedModel('');
    setUsedTokens({ prompt: 0, generated: 0 });
    setLoadingStage('fetching');

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl, compressionPercent, model, backend }),
      });

      setLoadingStage('summarizing');
      const data = await response.json();

      if (!response.ok) {
        const errMsg = data.error || 'Произошла ошибка';
        setError(errMsg);
        toast({ title: 'Ошибка', description: errMsg, variant: 'destructive' });
        return;
      }

      setSummary(data.summary);
      setPageTitle(data.title || '');
      setOriginalWordCount(data.originalWordCount || 0);
      setSummaryWordCount(data.summaryWordCount || 0);
      setUsedModel(data.model || '');
      setUsedTokens({
        prompt: data.tokensPrompt || 0,
        generated: data.tokensGenerated || 0,
      });
    } catch {
      setError('Не удалось подключиться к серверу');
      toast({ title: 'Ошибка', description: 'Сервер недоступен', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [url, compressionPercent, model, backend, serverOnline, toast]);

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

  const handleReset = useCallback(() => {
    setUrl('');
    setSummary('');
    setPageTitle('');
    setError('');
    setOriginalWordCount(0);
    setSummaryWordCount(0);
    setUsedModel('');
    setUsedTokens({ prompt: 0, generated: 0 });
    setCopied(false);
    inputRef.current?.focus();
  }, []);

  // FIX: Ctrl+Enter только с фокусом на input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSummarize();
      }
    },
    [handleSummarize]
  );

  const compressionRatio =
    originalWordCount > 0 && summaryWordCount > 0
      ? Math.round((1 - summaryWordCount / originalWordCount) * 100)
      : 0;

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden select-none">
      {/* ─── Header ─── */}
      <header className="h-12 border-b flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-emerald-100 dark:bg-emerald-900/40">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-sm font-bold tracking-tight">TextForge</h1>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">AI Суммаризатор</span>
        </div>
        <div className="flex items-center gap-2">
          {backend === 'local' && (
            <Badge
              variant={serverOnline ? 'secondary' : 'destructive'}
              className="text-[10px] gap-1 px-2 h-5"
            >
              {serverLoading ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              ) : serverOnline ? (
                <Server className="w-2.5 h-2.5" />
              ) : (
                <WifiOff className="w-2.5 h-2.5" />
              )}
              {serverOnline ? 'Локальный ИИ' : 'Сервер выключен'}
            </Badge>
          )}
          {backend === 'cloud' && (
            <Badge variant="secondary" className="text-[10px] gap-1 px-2 h-5">
              <Cloud className="w-2.5 h-2.5" />
              Cloud
            </Badge>
          )}
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="flex-1 flex overflow-hidden">
        {/* ─── Left Panel ─── */}
        <aside className="w-[360px] shrink-0 border-r flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

            {/* URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Link className="w-3 h-3" />
                Ссылка на статью
              </Label>
              <div className="flex gap-1.5">
                <Input
                  ref={inputRef}
                  type="url"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`h-9 text-xs ${url.trim().length > 0 && !urlValid ? 'border-red-500 focus-visible:ring-red-500/30' : ''}`}
                  disabled={isLoading}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReset}
                  disabled={isLoading}
                  className="h-9 w-9 shrink-0"
                  title="Очистить"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </div>
              {url.trim().length > 0 && !urlValid && (
                <p className="text-[10px] text-red-500">Некорректный URL</p>
              )}
            </div>

            {/* Action Button */}
            <Button
              onClick={handleSummarize}
              disabled={isLoading || !urlValid || !canSummarize}
              className="w-full h-10 text-xs font-semibold gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {loadingStage === 'fetching' ? 'Загружаю страницу...' : 'Анализирую текст...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Загрузить и суммаризировать
                </>
              )}
            </Button>

            {backend === 'local' && !serverOnline && !isLoading && (
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed">
                  <p className="font-medium mb-0.5">Inference-сервер не запущен</p>
                  <code className="block bg-amber-100 dark:bg-amber-900/40 rounded px-1.5 py-0.5 font-mono text-[9px]">
                    cd mini-services/inference-server<br />
                    python3 server.py
                  </code>
                </div>
              </div>
            )}

            <Separator />

            {/* Backend */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Shield className="w-3 h-3" />
                Бэкенд ИИ
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setBackend('local')}
                  className={`flex items-center justify-center gap-1.5 h-8 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                    backend === 'local'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-accent'
                  }`}
                  disabled={isLoading}
                >
                  <Server className="w-3 h-3" />
                  Локальный
                </button>
                <button
                  onClick={() => setBackend('cloud')}
                  className={`flex items-center justify-center gap-1.5 h-8 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                    backend === 'cloud'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-accent'
                  }`}
                  disabled={isLoading}
                >
                  <Cloud className="w-3 h-3" />
                  Cloud
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {backend === 'local'
                  ? 'GGUF-модели на вашем ПК. Приватность 100%.'
                  : 'Cloud API через интернет. Без локальных ресурсов.'}
              </p>
            </div>

            <Separator />

            {/* Compression */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Сжатие</Label>
                <span className={`text-lg font-bold tabular-nums ${compressionColor}`}>
                  {compressionPercent}%
                </span>
              </div>
              <Slider
                value={[compressionPercent]}
                onValueChange={(v) => setCompressionPercent(v[0])}
                min={10}
                max={90}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground px-0.5">
                <span className="text-emerald-500 font-medium">10% Мин</span>
                <span className="text-amber-500 font-medium">50%</span>
                <span className="text-red-500 font-medium">90% Макс</span>
              </div>
              <motion.div
                key={compressionPercent}
                initial={{ opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12 }}
                className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${compressionBgColor} shrink-0`} />
                <div>
                  <p className={`text-[11px] font-semibold ${compressionColor}`}>{compressionLabel}</p>
                  <p className="text-[10px] text-muted-foreground">{compressionDesc}</p>
                </div>
              </motion.div>
            </div>

            <Separator />

            {/* Model Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">AI Модель</Label>
              <div className="space-y-1.5">
                {(['qwen', 'mistral'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setModel(m)}
                    className={`w-full flex items-center gap-2 h-10 rounded-md text-left px-3 border transition-colors cursor-pointer ${
                      model === m
                        ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20'
                        : 'border-border hover:bg-accent/50'
                    }`}
                    disabled={isLoading}
                  >
                    <Zap className={`w-3 h-3 shrink-0 ${m === 'qwen' ? 'text-amber-500' : 'text-purple-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium">{getModelDisplayName(m)}</span>
                        <span className="text-[9px] text-muted-foreground">
                          {m === 'qwen' ? 'Q4_K_M, ~1.1 ГБ' : 'Q4_K_M, ~4.1 ГБ'}
                        </span>
                      </div>
                    </div>
                    {hardware?.recommendedModel === m && (
                      <Badge variant="outline" className="text-[8px] px-1 h-4 text-emerald-600 border-emerald-300 shrink-0">
                        Рек.
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
              {hardware && model !== hardware.recommendedModel && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Рекомендуется: {getModelDisplayName(hardware.recommendedModel)}
                </p>
              )}
            </div>

            <Separator />

            {/* Hardware (collapsible) */}
            {hardware && (
              <div className="space-y-1.5">
                <button
                  onClick={() => setHwExpanded(!hwExpanded)}
                  className="flex items-center gap-1.5 w-full text-xs font-medium text-left cursor-pointer hover:text-foreground/80"
                >
                  {hwExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  <Monitor className="w-3 h-3" />
                  Железо
                  <Badge variant="outline" className="text-[9px] px-1 h-4 ml-auto gap-0.5">
                    <Cpu className="w-2 h-2" />
                    {hardware.score}
                  </Badge>
                </button>
                <AnimatePresence>
                  {hwExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1.5 p-2.5 rounded-md bg-muted/30 border border-border text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">CPU</span>
                          <span className="font-medium">{hardware.cpuCores} ядер</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">RAM</span>
                          <span className="font-medium">{hardware.deviceMemory} ГБ</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">GPU</span>
                          <span className="font-medium text-right max-w-[180px] truncate" title={hardware.gpuRenderer}>
                            {hardware.gpuRenderer !== 'Unknown'
                              ? hardware.gpuRenderer.split('/').pop()?.split('(')[0]?.trim() || hardware.gpuRenderer
                              : 'Не определено'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-border">
                          <span className="text-muted-foreground">Оценка</span>
                          <div className="flex items-center gap-2">
                            <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${getScoreBarColor(hardware.score)}`}
                                style={{ width: `${hardware.score}%` }}
                              />
                            </div>
                            <span className={`font-semibold text-[10px] ${getScoreTextColor(hardware.score)}`}>
                              {getScoreLabel(hardware)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Left panel footer */}
          <div className="px-4 py-2 border-t shrink-0">
            <p className="text-[9px] text-muted-foreground text-center flex items-center justify-center gap-1">
              <kbd className="px-1 py-px rounded bg-muted border text-[8px] font-mono">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-1 py-px rounded bg-muted border text-[8px] font-mono">Enter</kbd>
              <span>— суммаризировать</span>
            </p>
          </div>
        </aside>

        {/* ─── Right Panel ─── */}
        <section className="flex-1 overflow-y-auto">
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
                  <div className="flex-1 p-6 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                      {loadingStage === 'fetching' ? 'Загружаю страницу...' : 'Анализирую текст...'}
                      <span className="text-[10px] text-muted-foreground/50">
                        ({backend === 'local' ? 'локально' : 'cloud'})
                      </span>
                    </div>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-[95%]" />
                    <Skeleton className="h-3.5 w-[88%]" />
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-[82%]" />
                    <Skeleton className="h-3.5 w-[70%]" />
                    <div className="h-2" />
                    <Skeleton className="h-3.5 w-[92%]" />
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-[85%]" />
                    <Skeleton className="h-3.5 w-[60%]" />
                  </div>
                </motion.div>
              ) : error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex items-center justify-center p-6"
                >
                  <div className="flex flex-col items-center text-center gap-2.5 max-w-sm">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
                    <Button variant="outline" size="sm" onClick={handleSummarize} className="text-[11px] h-7">
                      Попробовать снова
                    </Button>
                  </div>
                </motion.div>
              ) : summary ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col"
                >
                  {/* Header */}
                  <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3 shrink-0">
                    <div className="min-w-0 flex-1">
                      {pageTitle && (
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                          <p className="text-xs font-medium text-foreground truncate" title={pageTitle}>
                            {pageTitle}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 gap-0.5">
                          {backend === 'local' ? <Server className="w-2 h-2" /> : <Cloud className="w-2 h-2" />}
                          {usedModel}
                        </Badge>
                        {usedTokens.generated > 0 && (
                          <span>{usedTokens.prompt}+{usedTokens.generated} токенов</span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-[10px] gap-1 shrink-0">
                      {copied ? (
                        <><Check className="w-3 h-3 text-emerald-500" /> Скопировано</>
                      ) : (
                        <><Copy className="w-3 h-3" /> Копировать</>
                      )}
                    </Button>
                  </div>
                  <Separator />
                  {/* Text */}
                  <div className="flex-1 p-5 select-text">
                    <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words max-w-none">
                      {summary}
                    </div>
                  </div>
                  <Separator />
                  {/* Stats */}
                  <div className="px-5 py-2 flex items-center gap-3 shrink-0 bg-muted/20">
                    <span className="text-[10px] text-muted-foreground">
                      {originalWordCount} → {summaryWordCount} слов
                    </span>
                    {compressionRatio > 0 && (
                      <Badge variant="outline" className="text-[10px] h-4">
                        -{compressionRatio}%
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] h-4 gap-0.5 ml-auto">
                      <Shield className="w-2.5 h-2.5" />
                      anti-halluc
                    </Badge>
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
                  <div className="flex flex-col items-center text-center gap-3 select-none">
                    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                      <Link className="w-7 h-7 text-muted-foreground/30" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Вставьте ссылку на статью
                      </p>
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                        Приложение загрузит содержимое и создаст краткий пересказ
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="h-7 border-t flex items-center justify-between px-5 shrink-0">
        <p className="text-[10px] text-muted-foreground">
          TextForge v1.0
        </p>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Terminal className="w-2.5 h-2.5" />
          GGUF + Anti-Hallucination
        </p>
      </footer>
    </div>
  );
}
