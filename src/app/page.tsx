'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  Loader2,
  ArrowRightLeft,
  BarChart3,
  RotateCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface CompressionLevel {
  label: string;
  description: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

function getCompressionLevel(percent: number): CompressionLevel {
  if (percent <= 20) {
    return {
      label: 'Ультра-короткий',
      description: 'Только главные тезисы',
      color: 'text-orange-600 dark:text-orange-400',
      textColor: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950/40',
      borderColor: 'border-orange-200 dark:border-orange-800',
    };
  } else if (percent <= 40) {
    return {
      label: 'Средний',
      description: 'Основные моменты',
      color: 'text-amber-600 dark:text-amber-400',
      textColor: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      borderColor: 'border-amber-200 dark:border-amber-800',
    };
  } else if (percent <= 70) {
    return {
      label: 'Подробный',
      description: 'С сохранением деталей',
      color: 'text-teal-600 dark:text-teal-400',
      textColor: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-50 dark:bg-teal-950/40',
      borderColor: 'border-teal-200 dark:border-teal-800',
    };
  } else {
    return {
      label: 'Минимальный',
      description: 'Лёгкая корректировка',
      color: 'text-emerald-600 dark:text-emerald-400',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
    };
  }
}

function getWordCount(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

export default function Home() {
  const [text, setText] = useState('');
  const [percent, setPercent] = useState(30);
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const level = getCompressionLevel(percent);
  const originalWordCount = getWordCount(text);
  const summaryWordCount = getWordCount(summary);
  const compressionRatio = originalWordCount > 0 && summaryWordCount > 0
    ? Math.round((1 - summaryWordCount / originalWordCount) * 100)
    : 0;

  const handleSummarize = useCallback(async () => {
    if (!text.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите текст для суммаризации',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError('');
    setSummary('');

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, percent }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Произошла ошибка');
        toast({
          title: 'Ошибка',
          description: data.error || 'Произошла ошибка при суммаризации',
          variant: 'destructive',
        });
        return;
      }

      setSummary(data.summary);
    } catch {
      setError('Не удалось подключиться к серверу');
      toast({
        title: 'Ошибка',
        description: 'Не удалось подключиться к серверу',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [text, percent, toast]);

  const handleCopy = useCallback(async () => {
    if (!summary) return;

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast({
        title: 'Скопировано!',
        description: 'Пересказ скопирован в буфер обмена',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Ошибка',
        description: 'Не удалось скопировать текст',
        variant: 'destructive',
      });
    }
  }, [summary, toast]);

  const handleReset = useCallback(() => {
    setText('');
    setSummary('');
    setError('');
    setPercent(30);
    setCopied(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSummarize();
      }
    },
    [handleSummarize]
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
              <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Суммаризатор текста
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Быстрый и точный пересказ текста с настраиваемым уровнем сжатия
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel — Input */}
          <div className="flex flex-col gap-4">
            {/* Input Card */}
            <Card className="flex-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Исходный текст
                  </CardTitle>
                  {originalWordCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {originalWordCount} слов
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Вставьте или введите текст для суммаризации..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[240px] sm:min-h-[320px] resize-none text-sm leading-relaxed"
                />
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  Ctrl+Enter для суммаризации
                </p>
              </CardContent>
            </Card>

            {/* Compression Control */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Уровень сжатия</Label>
                    <span className="text-2xl font-bold tabular-nums text-foreground">
                      {percent}%
                    </span>
                  </div>

                  <Slider
                    value={[percent]}
                    onValueChange={(value) => setPercent(value[0])}
                    min={10}
                    max={100}
                    step={10}
                    className="w-full"
                  />

                  <motion.div
                    key={level.label}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex items-center gap-2 p-3 rounded-lg border ${level.bgColor} ${level.borderColor}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${level.color} bg-current`} />
                    <div>
                      <p className={`text-sm font-semibold ${level.textColor}`}>
                        {level.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {level.description}
                      </p>
                    </div>
                  </motion.div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-1">
                    <Button
                      onClick={handleSummarize}
                      disabled={isLoading || !text.trim()}
                      className="flex-1 h-11 text-sm font-semibold"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Обработка...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Суммаризировать
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      disabled={isLoading}
                      className="h-11 px-3"
                      title="Очистить"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel — Output */}
          <div className="flex flex-col gap-4">
            <Card className="flex-1">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                    Результат
                  </CardTitle>
                  {summary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-8 text-xs gap-1.5"
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
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3 min-h-[240px] sm:min-h-[320px]"
                    >
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-[90%]" />
                      <Skeleton className="h-4 w-[95%]" />
                      <Skeleton className="h-4 w-[80%]" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-[85%]" />
                      <Skeleton className="h-4 w-[70%]" />
                      <Skeleton className="h-4 w-[92%]" />
                      <Skeleton className="h-4 w-[60%]" />
                      <div className="flex items-center justify-center pt-6">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          ИИ анализирует текст...
                        </div>
                      </div>
                    </motion.div>
                  ) : error ? (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center min-h-[240px] sm:min-h-[320px] text-center gap-3"
                    >
                      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                        <span className="text-destructive text-xl">!</span>
                      </div>
                      <p className="text-sm text-destructive font-medium">{error}</p>
                    </motion.div>
                  ) : summary ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="min-h-[240px] sm:min-h-[320px]">
                        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {summary}
                        </div>
                      </div>

                      <Separator />

                      {/* Stats */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>
                            {originalWordCount} → {summaryWordCount} слов
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-xs font-medium"
                        >
                          {compressionRatio > 0
                            ? `Сжатие: ${compressionRatio}%`
                            : 'Без сжатия'}
                        </Badge>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center min-h-[240px] sm:min-h-[320px] text-center gap-3"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                        <FileText className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Пересказ появится здесь
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Введите текст и нажмите «Суммаризировать»
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/80 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-muted-foreground text-center">
            Суммаризатор текста — работает на базе искусственного интеллекта
          </p>
        </div>
      </footer>
    </div>
  );
}
