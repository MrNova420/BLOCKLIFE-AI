/**
 * BlockLife AI - Performance Monitoring
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Monitors system performance and provides adaptive throttling.
 */

import * as os from 'os';
import { PerformanceMode } from '../types';
import { createLogger } from './logger';

const logger = createLogger('perf');

export interface PerformanceMetrics {
  cpuUsage: number;          // 0-100
  memoryUsageMb: number;
  memoryUsagePercent: number;
  tickDurationMs: number;
  avgTickDurationMs: number;
  aiLatencyMs: number;
  avgAiLatencyMs: number;
  activeBots: number;
  timestamp: number;
}

export interface PerformanceThresholds {
  maxCpuPercent: number;
  maxMemoryPercent: number;
  maxTickDurationMs: number;
  maxAiLatencyMs: number;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  maxCpuPercent: 70,
  maxMemoryPercent: 80,
  maxTickDurationMs: 100,
  maxAiLatencyMs: 3000
};

class PerformanceMonitor {
  private tickDurations: number[] = [];
  private aiLatencies: number[] = [];
  private lastCpuInfo: os.CpuInfo[] | null = null;
  private lastCpuTime: number = 0;
  private currentMode: PerformanceMode = PerformanceMode.NORMAL;
  private thresholds: PerformanceThresholds;
  private metricsHistory: PerformanceMetrics[] = [];
  private maxHistorySize = 60; // Keep 1 minute of data at 1/sec
  private activeBots = 0;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    this.lastCpuInfo = os.cpus();
    this.lastCpuTime = Date.now();
  }

  /**
   * Record a tick duration
   */
  recordTick(durationMs: number): void {
    this.tickDurations.push(durationMs);
    if (this.tickDurations.length > 100) {
      this.tickDurations.shift();
    }
  }

  /**
   * Record an AI call latency
   */
  recordAiLatency(latencyMs: number): void {
    this.aiLatencies.push(latencyMs);
    if (this.aiLatencies.length > 50) {
      this.aiLatencies.shift();
    }
  }

  /**
   * Update active bot count
   */
  setActiveBots(count: number): void {
    this.activeBots = count;
  }

  /**
   * Get current CPU usage estimate
   */
  private getCpuUsage(): number {
    const cpus = os.cpus();
    const now = Date.now();
    
    if (!this.lastCpuInfo || now - this.lastCpuTime < 1000) {
      // Not enough time passed for accurate reading
      return 0;
    }

    let totalIdle = 0;
    let totalTick = 0;

    for (let i = 0; i < cpus.length; i++) {
      const cpu = cpus[i];
      const lastCpu = this.lastCpuInfo[i];
      
      const idle = cpu.times.idle - lastCpu.times.idle;
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0) -
                    Object.values(lastCpu.times).reduce((a, b) => a + b, 0);
      
      totalIdle += idle;
      totalTick += total;
    }

    this.lastCpuInfo = cpus;
    this.lastCpuTime = now;

    if (totalTick === 0) return 0;
    return Math.round((1 - totalIdle / totalTick) * 100);
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): { usedMb: number; percent: number } {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    
    return {
      usedMb: Math.round(used / 1024 / 1024),
      percent: Math.round((used / total) * 100)
    };
  }

  /**
   * Calculate average of an array
   */
  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const memory = this.getMemoryUsage();
    const lastTick = this.tickDurations[this.tickDurations.length - 1] || 0;
    const lastAi = this.aiLatencies[this.aiLatencies.length - 1] || 0;
    
    const metrics: PerformanceMetrics = {
      cpuUsage: this.getCpuUsage(),
      memoryUsageMb: memory.usedMb,
      memoryUsagePercent: memory.percent,
      tickDurationMs: lastTick,
      avgTickDurationMs: Math.round(this.average(this.tickDurations)),
      aiLatencyMs: lastAi,
      avgAiLatencyMs: Math.round(this.average(this.aiLatencies)),
      activeBots: this.activeBots,
      timestamp: Date.now()
    };

    // Store in history
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    return metrics;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Check if system is under stress
   */
  isUnderStress(): boolean {
    const metrics = this.getMetrics();
    
    return (
      metrics.cpuUsage > this.thresholds.maxCpuPercent ||
      metrics.memoryUsagePercent > this.thresholds.maxMemoryPercent ||
      metrics.avgTickDurationMs > this.thresholds.maxTickDurationMs ||
      metrics.avgAiLatencyMs > this.thresholds.maxAiLatencyMs
    );
  }

  /**
   * Get recommended performance mode based on current metrics
   */
  getRecommendedMode(): PerformanceMode {
    const metrics = this.getMetrics();
    
    // Check for stress conditions
    if (
      metrics.cpuUsage > 85 ||
      metrics.memoryUsagePercent > 85 ||
      metrics.avgTickDurationMs > 150
    ) {
      return PerformanceMode.ECO;
    }
    
    if (
      metrics.cpuUsage > this.thresholds.maxCpuPercent ||
      metrics.memoryUsagePercent > this.thresholds.maxMemoryPercent ||
      metrics.avgTickDurationMs > this.thresholds.maxTickDurationMs
    ) {
      return PerformanceMode.NORMAL;
    }
    
    // System is healthy, can handle more
    if (
      metrics.cpuUsage < 40 &&
      metrics.memoryUsagePercent < 50 &&
      metrics.avgTickDurationMs < 50
    ) {
      return PerformanceMode.PERFORMANCE;
    }
    
    return PerformanceMode.NORMAL;
  }

  /**
   * Set current performance mode
   */
  setMode(mode: PerformanceMode): void {
    if (mode !== this.currentMode) {
      logger.info(`Performance mode changed: ${this.currentMode} -> ${mode}`);
      this.currentMode = mode;
    }
  }

  /**
   * Get current performance mode
   */
  getMode(): PerformanceMode {
    return this.currentMode;
  }

  /**
   * Auto-adjust mode based on metrics
   */
  autoAdjust(): PerformanceMode {
    const recommended = this.getRecommendedMode();
    this.setMode(recommended);
    return recommended;
  }

  /**
   * Get a summary string for display
   */
  getSummary(): string {
    const metrics = this.getMetrics();
    return [
      `CPU: ${metrics.cpuUsage}%`,
      `Memory: ${metrics.memoryUsageMb}MB (${metrics.memoryUsagePercent}%)`,
      `Tick: ${metrics.avgTickDurationMs}ms avg`,
      `AI: ${metrics.avgAiLatencyMs}ms avg`,
      `Bots: ${metrics.activeBots}`,
      `Mode: ${this.currentMode}`
    ].join(' | ');
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.tickDurations = [];
    this.aiLatencies = [];
    this.metricsHistory = [];
    this.activeBots = 0;
  }
}

// Singleton instance
let instance: PerformanceMonitor | null = null;

/**
 * Get the performance monitor singleton
 */
export function getPerformanceMonitor(thresholds?: Partial<PerformanceThresholds>): PerformanceMonitor {
  if (!instance) {
    instance = new PerformanceMonitor(thresholds);
  }
  return instance;
}

/**
 * Reset the performance monitor singleton
 */
export function resetPerformanceMonitor(): void {
  instance = null;
}

export default PerformanceMonitor;
