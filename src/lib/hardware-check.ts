'use client';

export interface HardwareInfo {
  cpuCores: number;
  deviceMemory: number; // GB, from navigator.deviceMemory (may be undefined)
  gpuRenderer: string;
  isWeak: boolean;
  isMedium: boolean;
  isStrong: boolean;
  recommendedModel: 'qwen' | 'mistral';
  score: number; // 0-100
}

function detectGpuRenderer(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'Unknown';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return 'Unknown';
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    return renderer || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

function scoreGpu(renderer: string): number {
  const r = renderer.toLowerCase();

  // High-end keywords
  const highEndKeywords = [
    'rtx 4090', 'rtx 4080', 'rtx 4070', 'rtx 3090', 'rtx 3080', 'rtx 3070',
    'radeon rx 7900', 'radeon rx 6800', 'radeon rx 6900',
    'geforce rtx', 'nvidia geforce rtx',
    'apple m1 max', 'apple m2 max', 'apple m3 max', 'apple m1 ultra', 'apple m2 ultra',
    'apple m1 pro', 'apple m2 pro', 'apple m3 pro',
    'titan', 'firepro',
  ];

  // Mid-range keywords
  const midRangeKeywords = [
    'rtx 4060', 'rtx 3060', 'rtx 2060', 'gtx 1660', 'gtx 1080', 'gtx 1070',
    'radeon rx 6700', 'radeon rx 6600', 'radeon rx 5700', 'radeon rx 5600',
    'geforce gtx',
    'apple m1', 'apple m2', 'apple m3',
    'intel arc', 'iris xe', 'iris pro',
    'adreno 700', 'adreno 600', 'mali-g78', 'mali-g77',
  ];

  if (highEndKeywords.some(k => r.includes(k))) return 40;
  if (midRangeKeywords.some(k => r.includes(k))) return 20;
  return 0; // Basic/embedded
}

export function detectHardware(): HardwareInfo {
  if (typeof window === 'undefined') {
    return {
      cpuCores: 0,
      deviceMemory: 4,
      gpuRenderer: 'Unknown',
      isWeak: true,
      isMedium: false,
      isStrong: false,
      recommendedModel: 'qwen',
      score: 0,
    };
  }

  const cpuCores = navigator.hardwareConcurrency || 2;
  const deviceMemory = (navigator as Record<string, unknown>).deviceMemory as number | undefined || 4;
  const gpuRenderer = detectGpuRenderer();

  // CPU scoring
  let cpuScore = 0;
  if (cpuCores <= 2) cpuScore = 0;
  else if (cpuCores <= 4) cpuScore = 20;
  else if (cpuCores <= 8) cpuScore = 40;
  else cpuScore = 60;

  // RAM scoring
  let ramScore = 0;
  if (deviceMemory <= 4) ramScore = 0;
  else if (deviceMemory <= 8) ramScore = 20;
  else if (deviceMemory <= 16) ramScore = 30;
  else ramScore = 40;

  // GPU scoring
  const gpuScore = scoreGpu(gpuRenderer);

  const score = cpuScore + ramScore + gpuScore;

  let isWeak = false;
  let isMedium = false;
  let isStrong = false;
  let recommendedModel: 'qwen' | 'mistral';

  if (score < 40) {
    isWeak = true;
    recommendedModel = 'qwen';
  } else if (score <= 70) {
    isMedium = true;
    recommendedModel = 'mistral';
  } else {
    isStrong = true;
    recommendedModel = 'mistral';
  }

  return {
    cpuCores,
    deviceMemory,
    gpuRenderer,
    isWeak,
    isMedium,
    isStrong,
    recommendedModel,
    score: Math.min(score, 100),
  };
}
