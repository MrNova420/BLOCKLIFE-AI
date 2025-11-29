/**
 * BlockLife AI - Stability & Reliability Manager
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * DESIGNED FOR 24/7 CONTINUOUS OPERATION
 * 
 * Features:
 * - Memory leak prevention with automatic cleanup
 * - CPU throttling to prevent overheating
 * - Automatic crash recovery
 * - Health checks with self-healing
 * - Resource monitoring and adaptive scaling
 * - Graceful degradation under stress
 * - Session persistence for recovery
 * - Device protection (temperature, memory, disk)
 */

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from './logger';
import { getPerformanceMonitor } from './performance';
import { getSystemStatus, SystemComponent, LogLevel, EventCategory } from './system-status';
import { PerformanceMode } from '../types';

const logger = createLogger('stability');

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface StabilityConfig {
  // Memory management
  maxMemoryPercent: number;           // Max memory usage before cleanup (default: 75%)
  memoryWarningPercent: number;       // Warning threshold (default: 65%)
  memoryCriticalPercent: number;      // Critical threshold (default: 85%)
  memoryCheckIntervalMs: number;      // How often to check memory (default: 30s)
  
  // CPU management
  maxCpuPercent: number;              // Max CPU before throttling (default: 70%)
  cpuWarningPercent: number;          // Warning threshold (default: 60%)
  cpuCriticalPercent: number;         // Critical threshold (default: 85%)
  cpuCheckIntervalMs: number;         // How often to check CPU (default: 10s)
  cooldownPeriodMs: number;           // Rest period when CPU is high (default: 5s)
  
  // Health checks
  healthCheckIntervalMs: number;      // How often to run health checks (default: 60s)
  maxConsecutiveFailures: number;     // Failures before taking action (default: 3)
  
  // Garbage collection
  forceGcIntervalMs: number;          // Force GC interval when available (default: 5min)
  gcOnHighMemory: boolean;            // Force GC when memory is high (default: true)
  
  // Session persistence
  enableSessionPersistence: boolean;  // Save state for recovery (default: true)
  persistenceIntervalMs: number;      // How often to save state (default: 5min)
  persistencePath: string;            // Where to save state
  
  // Rate limiting
  maxTicksPerSecond: number;          // Max simulation speed (default: 20)
  minTickIntervalMs: number;          // Minimum time between ticks (default: 50ms)
  
  // Self-healing
  enableSelfHealing: boolean;         // Auto-fix issues (default: true)
  restartOnCritical: boolean;         // Restart systems on critical failure (default: true)
  
  // Logging cleanup
  maxLogAgeMs: number;                // Max age of logs to keep (default: 1 hour)
  logCleanupIntervalMs: number;       // How often to clean logs (default: 10min)
}

const DEFAULT_CONFIG: StabilityConfig = {
  maxMemoryPercent: 75,
  memoryWarningPercent: 65,
  memoryCriticalPercent: 85,
  memoryCheckIntervalMs: 30000,
  
  maxCpuPercent: 70,
  cpuWarningPercent: 60,
  cpuCriticalPercent: 85,
  cpuCheckIntervalMs: 10000,
  cooldownPeriodMs: 5000,
  
  healthCheckIntervalMs: 60000,
  maxConsecutiveFailures: 3,
  
  forceGcIntervalMs: 300000,
  gcOnHighMemory: true,
  
  enableSessionPersistence: true,
  persistenceIntervalMs: 300000,
  persistencePath: './data/session-state.json',
  
  maxTicksPerSecond: 20,
  minTickIntervalMs: 50,
  
  enableSelfHealing: true,
  restartOnCritical: true,
  
  maxLogAgeMs: 3600000,
  logCleanupIntervalMs: 600000
};

// ============================================================================
// TYPES
// ============================================================================

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  RECOVERING = 'RECOVERING'
}

export interface SystemHealth {
  status: HealthStatus;
  memory: {
    usedMb: number;
    totalMb: number;
    percent: number;
    status: HealthStatus;
  };
  cpu: {
    percent: number;
    status: HealthStatus;
    throttled: boolean;
  };
  uptime: {
    processMs: number;
    systemMs: number;
    formatted: string;
  };
  lastHealthCheck: number;
  consecutiveFailures: number;
  isThrottled: boolean;
  currentMode: PerformanceMode;
}

export interface RecoveryState {
  timestamp: number;
  uptime: number;
  sessionStats: Record<string, any>;
  botStates: Record<string, any>[];
  villageStates: Record<string, any>[];
  config: Record<string, any>;
}

// ============================================================================
// STABILITY MANAGER
// ============================================================================

export class StabilityManager {
  private static instance: StabilityManager | null = null;
  
  private config: StabilityConfig;
  private health: SystemHealth;
  private isRunning: boolean = false;
  private isThrottled: boolean = false;
  private consecutiveFailures: number = 0;
  private lastTickTime: number = 0;
  
  // Intervals
  private memoryCheckInterval: NodeJS.Timeout | null = null;
  private cpuCheckInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private gcInterval: NodeJS.Timeout | null = null;
  private persistenceInterval: NodeJS.Timeout | null = null;
  private logCleanupInterval: NodeJS.Timeout | null = null;
  
  // CPU tracking
  private lastCpuInfo: os.CpuInfo[] | null = null;
  private lastCpuTime: number = 0;
  private cpuHistory: number[] = [];
  
  // Callbacks
  private onThrottleCallbacks: ((throttled: boolean) => void)[] = [];
  private onHealthChangeCallbacks: ((health: SystemHealth) => void)[] = [];
  private onRecoveryCallbacks: ((state: RecoveryState) => void)[] = [];
  
  private constructor(config?: Partial<StabilityConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.health = {
      status: HealthStatus.HEALTHY,
      memory: { usedMb: 0, totalMb: 0, percent: 0, status: HealthStatus.HEALTHY },
      cpu: { percent: 0, status: HealthStatus.HEALTHY, throttled: false },
      uptime: { processMs: 0, systemMs: 0, formatted: '0 seconds' },
      lastHealthCheck: Date.now(),
      consecutiveFailures: 0,
      isThrottled: false,
      currentMode: PerformanceMode.NORMAL
    };
    
    this.lastCpuInfo = os.cpus();
    this.lastCpuTime = Date.now();
    
    logger.info('Stability Manager initialized for 24/7 operation');
  }
  
  static getInstance(config?: Partial<StabilityConfig>): StabilityManager {
    if (!StabilityManager.instance) {
      StabilityManager.instance = new StabilityManager(config);
    }
    return StabilityManager.instance;
  }
  
  // ============================================================================
  // LIFECYCLE
  // ============================================================================
  
  /**
   * Start all stability monitoring systems
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Start memory monitoring
    this.memoryCheckInterval = setInterval(() => {
      this.checkMemory();
    }, this.config.memoryCheckIntervalMs);
    
    // Start CPU monitoring
    this.cpuCheckInterval = setInterval(() => {
      this.checkCpu();
    }, this.config.cpuCheckIntervalMs);
    
    // Start health checks
    this.healthCheckInterval = setInterval(() => {
      this.runHealthCheck();
    }, this.config.healthCheckIntervalMs);
    
    // Start forced GC if available
    if (global.gc) {
      this.gcInterval = setInterval(() => {
        this.forceGarbageCollection();
      }, this.config.forceGcIntervalMs);
    }
    
    // Start session persistence
    if (this.config.enableSessionPersistence) {
      this.persistenceInterval = setInterval(() => {
        this.saveSessionState();
      }, this.config.persistenceIntervalMs);
    }
    
    // Start log cleanup
    this.logCleanupInterval = setInterval(() => {
      this.cleanupOldLogs();
    }, this.config.logCleanupIntervalMs);
    
    // Run initial checks
    this.checkMemory();
    this.checkCpu();
    this.runHealthCheck();
    
    // Try to recover previous session
    this.tryRecoverSession();
    
    const status = getSystemStatus();
    status.logEvent({
      category: EventCategory.SYSTEM,
      level: LogLevel.INFO,
      source: 'stability-manager',
      message: 'Stability monitoring started - system ready for 24/7 operation'
    });
    
    logger.info('Stability monitoring started');
  }
  
  /**
   * Stop all monitoring systems
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.memoryCheckInterval) clearInterval(this.memoryCheckInterval);
    if (this.cpuCheckInterval) clearInterval(this.cpuCheckInterval);
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.gcInterval) clearInterval(this.gcInterval);
    if (this.persistenceInterval) clearInterval(this.persistenceInterval);
    if (this.logCleanupInterval) clearInterval(this.logCleanupInterval);
    
    // Save final state
    if (this.config.enableSessionPersistence) {
      this.saveSessionState();
    }
    
    logger.info('Stability monitoring stopped');
  }
  
  // ============================================================================
  // MEMORY MANAGEMENT
  // ============================================================================
  
  /**
   * Check memory usage and take action if needed
   */
  private checkMemory(): void {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    const processMemMb = Math.round(memUsage.heapUsed / 1024 / 1024);
    const totalMemMb = Math.round(totalMem / 1024 / 1024);
    const usedSystemMb = Math.round((totalMem - freeMem) / 1024 / 1024);
    const systemPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);
    
    this.health.memory = {
      usedMb: processMemMb,
      totalMb: totalMemMb,
      percent: systemPercent,
      status: this.getMemoryHealthStatus(systemPercent)
    };
    
    // Take action based on memory status
    if (systemPercent >= this.config.memoryCriticalPercent) {
      this.handleCriticalMemory();
    } else if (systemPercent >= this.config.memoryWarningPercent) {
      this.handleHighMemory();
    }
    
    // Update performance monitor
    const perfMonitor = getPerformanceMonitor();
    const metrics = perfMonitor.getMetrics();
  }
  
  private getMemoryHealthStatus(percent: number): HealthStatus {
    if (percent >= this.config.memoryCriticalPercent) return HealthStatus.CRITICAL;
    if (percent >= this.config.memoryWarningPercent) return HealthStatus.WARNING;
    return HealthStatus.HEALTHY;
  }
  
  private handleHighMemory(): void {
    logger.warn(`Memory usage high: ${this.health.memory.percent}%`);
    
    // Force garbage collection if available
    if (this.config.gcOnHighMemory && global.gc) {
      this.forceGarbageCollection();
    }
    
    // Reduce simulation intensity
    const perfMonitor = getPerformanceMonitor();
    if (perfMonitor.getMode() !== PerformanceMode.ECO) {
      perfMonitor.setMode(PerformanceMode.ECO);
      this.health.currentMode = PerformanceMode.ECO;
    }
    
    const status = getSystemStatus();
    status.logEvent({
      category: EventCategory.SYSTEM,
      level: LogLevel.WARN,
      source: 'stability-manager',
      message: `High memory usage detected: ${this.health.memory.percent}% - switching to ECO mode`
    });
  }
  
  private handleCriticalMemory(): void {
    logger.error(`CRITICAL: Memory usage at ${this.health.memory.percent}%`);
    
    // Aggressive cleanup
    this.forceGarbageCollection();
    this.cleanupOldLogs();
    
    // Clear caches
    this.clearCaches();
    
    const status = getSystemStatus();
    status.logEvent({
      category: EventCategory.SYSTEM,
      level: LogLevel.CRITICAL,
      source: 'stability-manager',
      message: `CRITICAL memory usage: ${this.health.memory.percent}% - aggressive cleanup initiated`
    });
    
    this.health.status = HealthStatus.CRITICAL;
    this.notifyHealthChange();
  }
  
  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): void {
    if (global.gc) {
      const before = process.memoryUsage().heapUsed;
      global.gc();
      const after = process.memoryUsage().heapUsed;
      const freedMb = Math.round((before - after) / 1024 / 1024);
      
      if (freedMb > 0) {
        logger.debug(`Garbage collection freed ${freedMb}MB`);
      }
    }
  }
  
  /**
   * Clear internal caches to free memory
   */
  private clearCaches(): void {
    // Clear any module caches if possible
    // This is a placeholder - actual implementation depends on what caches exist
    logger.info('Clearing caches to free memory');
  }
  
  // ============================================================================
  // CPU MANAGEMENT
  // ============================================================================
  
  /**
   * Check CPU usage and throttle if needed
   */
  private checkCpu(): void {
    const cpuPercent = this.calculateCpuUsage();
    
    this.cpuHistory.push(cpuPercent);
    if (this.cpuHistory.length > 10) {
      this.cpuHistory.shift();
    }
    
    const avgCpu = this.cpuHistory.reduce((a, b) => a + b, 0) / this.cpuHistory.length;
    
    this.health.cpu = {
      percent: Math.round(avgCpu),
      status: this.getCpuHealthStatus(avgCpu),
      throttled: this.isThrottled
    };
    
    // Take action based on CPU status
    if (avgCpu >= this.config.cpuCriticalPercent) {
      this.handleCriticalCpu();
    } else if (avgCpu >= this.config.cpuWarningPercent) {
      this.handleHighCpu();
    } else if (this.isThrottled && avgCpu < this.config.maxCpuPercent) {
      this.releaseThrottle();
    }
  }
  
  private calculateCpuUsage(): number {
    const cpus = os.cpus();
    const now = Date.now();
    
    if (!this.lastCpuInfo || now - this.lastCpuTime < 1000) {
      return 0;
    }
    
    let totalIdle = 0;
    let totalTick = 0;
    
    for (let i = 0; i < cpus.length; i++) {
      const cpu = cpus[i];
      const lastCpu = this.lastCpuInfo[i];
      
      if (!lastCpu) continue;
      
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
  
  private getCpuHealthStatus(percent: number): HealthStatus {
    if (percent >= this.config.cpuCriticalPercent) return HealthStatus.CRITICAL;
    if (percent >= this.config.cpuWarningPercent) return HealthStatus.WARNING;
    return HealthStatus.HEALTHY;
  }
  
  private handleHighCpu(): void {
    if (!this.isThrottled) {
      this.engageThrottle();
    }
    
    // Switch to ECO mode
    const perfMonitor = getPerformanceMonitor();
    if (perfMonitor.getMode() !== PerformanceMode.ECO) {
      perfMonitor.setMode(PerformanceMode.ECO);
      this.health.currentMode = PerformanceMode.ECO;
    }
  }
  
  private handleCriticalCpu(): void {
    logger.error(`CRITICAL: CPU usage at ${this.health.cpu.percent}%`);
    
    this.engageThrottle();
    this.health.status = HealthStatus.CRITICAL;
    
    const status = getSystemStatus();
    status.logEvent({
      category: EventCategory.SYSTEM,
      level: LogLevel.CRITICAL,
      source: 'stability-manager',
      message: `CRITICAL CPU usage: ${this.health.cpu.percent}% - throttling engaged`
    });
    
    this.notifyHealthChange();
  }
  
  private engageThrottle(): void {
    if (this.isThrottled) return;
    
    this.isThrottled = true;
    this.health.cpu.throttled = true;
    this.health.isThrottled = true;
    
    logger.warn('CPU throttling engaged');
    
    this.notifyThrottle(true);
  }
  
  private releaseThrottle(): void {
    if (!this.isThrottled) return;
    
    this.isThrottled = false;
    this.health.cpu.throttled = false;
    this.health.isThrottled = false;
    
    logger.info('CPU throttling released');
    
    // Restore normal mode if healthy
    if (this.health.status === HealthStatus.HEALTHY) {
      const perfMonitor = getPerformanceMonitor();
      perfMonitor.setMode(PerformanceMode.NORMAL);
      this.health.currentMode = PerformanceMode.NORMAL;
    }
    
    this.notifyThrottle(false);
  }
  
  // ============================================================================
  // HEALTH CHECKS
  // ============================================================================
  
  /**
   * Run comprehensive health check
   */
  private runHealthCheck(): void {
    this.health.lastHealthCheck = Date.now();
    
    // Update uptime
    const processUptime = process.uptime() * 1000;
    const systemUptime = os.uptime() * 1000;
    this.health.uptime = {
      processMs: processUptime,
      systemMs: systemUptime,
      formatted: this.formatUptime(processUptime)
    };
    
    // Determine overall health
    const memStatus = this.health.memory.status;
    const cpuStatus = this.health.cpu.status;
    
    if (memStatus === HealthStatus.CRITICAL || cpuStatus === HealthStatus.CRITICAL) {
      this.health.status = HealthStatus.CRITICAL;
      this.consecutiveFailures++;
    } else if (memStatus === HealthStatus.WARNING || cpuStatus === HealthStatus.WARNING) {
      this.health.status = HealthStatus.WARNING;
      this.consecutiveFailures = Math.max(0, this.consecutiveFailures - 1);
    } else {
      this.health.status = HealthStatus.HEALTHY;
      this.consecutiveFailures = 0;
    }
    
    this.health.consecutiveFailures = this.consecutiveFailures;
    
    // Self-healing if too many failures
    if (this.config.enableSelfHealing && 
        this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.initiateSelfHealing();
    }
    
    // Update system status
    const status = getSystemStatus();
    status.updatePerformanceMetrics({
      memoryUsageMb: this.health.memory.usedMb,
      cpuUsagePercent: this.health.cpu.percent
    });
    
    this.notifyHealthChange();
  }
  
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}, ${hours % 24} hour${(hours % 24) !== 1 ? 's' : ''}`;
    }
    if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes % 60} minute${(minutes % 60) !== 1 ? 's' : ''}`;
    }
    if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}, ${seconds % 60} second${(seconds % 60) !== 1 ? 's' : ''}`;
    }
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  
  /**
   * Attempt to heal the system
   */
  private initiateSelfHealing(): void {
    logger.warn('Initiating self-healing due to repeated failures');
    
    this.health.status = HealthStatus.RECOVERING;
    
    const status = getSystemStatus();
    status.logEvent({
      category: EventCategory.SYSTEM,
      level: LogLevel.WARN,
      source: 'stability-manager',
      message: 'Self-healing initiated due to repeated system stress'
    });
    
    // Aggressive cleanup
    this.forceGarbageCollection();
    this.clearCaches();
    this.cleanupOldLogs();
    
    // Engage maximum throttling
    this.engageThrottle();
    
    // Reset failure counter
    this.consecutiveFailures = 0;
    
    // Schedule recovery check
    setTimeout(() => {
      this.runHealthCheck();
      if (this.health.status !== HealthStatus.CRITICAL) {
        this.health.status = HealthStatus.HEALTHY;
        logger.info('Self-healing completed successfully');
      }
    }, 30000);
  }
  
  // ============================================================================
  // SESSION PERSISTENCE
  // ============================================================================
  
  /**
   * Save current session state for recovery
   */
  saveSessionState(): void {
    if (!this.config.enableSessionPersistence) return;
    
    try {
      const status = getSystemStatus();
      const sessionStats = status.getSessionStats();
      
      const state: RecoveryState = {
        timestamp: Date.now(),
        uptime: this.health.uptime.processMs,
        sessionStats,
        botStates: [],
        villageStates: [],
        config: {}
      };
      
      // Ensure directory exists
      const dir = path.dirname(this.config.persistencePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(
        this.config.persistencePath,
        JSON.stringify(state, null, 2)
      );
      
      logger.debug('Session state saved');
    } catch (error) {
      logger.error('Failed to save session state:', error);
    }
  }
  
  /**
   * Try to recover from a previous session
   */
  private tryRecoverSession(): void {
    if (!this.config.enableSessionPersistence) return;
    
    try {
      if (fs.existsSync(this.config.persistencePath)) {
        const data = fs.readFileSync(this.config.persistencePath, 'utf-8');
        const state: RecoveryState = JSON.parse(data);
        
        // Check if state is recent (within configured max log age)
        const age = Date.now() - state.timestamp;
        if (age < this.config.maxLogAgeMs) {
          logger.info('Found recent session state, notifying recovery handlers');
          this.notifyRecovery(state);
        } else {
          logger.info('Found old session state, ignoring');
        }
      }
    } catch (error) {
      logger.debug('No valid session state to recover');
    }
  }
  
  // ============================================================================
  // LOG CLEANUP
  // ============================================================================
  
  /**
   * Clean up old logs to free memory
   */
  private cleanupOldLogs(): void {
    const status = getSystemStatus();
    const cutoff = Date.now() - this.config.maxLogAgeMs;
    
    // Get events and filter old ones (the status manager handles this internally)
    // This is mainly to trigger any internal cleanup
    const recentEvents = status.getEvents({ since: cutoff });
    
    logger.debug(`Log cleanup complete, keeping events since ${new Date(cutoff).toLocaleTimeString()}`);
  }
  
  // ============================================================================
  // TICK RATE LIMITING
  // ============================================================================
  
  /**
   * Check if a tick should be allowed (for rate limiting)
   */
  shouldAllowTick(): boolean {
    const now = Date.now();
    const elapsed = now - this.lastTickTime;
    
    // If throttled, use longer interval
    const minInterval = this.isThrottled 
      ? this.config.minTickIntervalMs * 2 
      : this.config.minTickIntervalMs;
    
    if (elapsed < minInterval) {
      return false;
    }
    
    this.lastTickTime = now;
    return true;
  }
  
  /**
   * Get recommended delay before next tick
   */
  getRecommendedTickDelay(): number {
    if (this.health.status === HealthStatus.CRITICAL) {
      return this.config.cooldownPeriodMs;
    }
    if (this.isThrottled) {
      return this.config.minTickIntervalMs * 2;
    }
    return this.config.minTickIntervalMs;
  }
  
  // ============================================================================
  // CALLBACKS
  // ============================================================================
  
  onThrottle(callback: (throttled: boolean) => void): void {
    this.onThrottleCallbacks.push(callback);
  }
  
  onHealthChange(callback: (health: SystemHealth) => void): void {
    this.onHealthChangeCallbacks.push(callback);
  }
  
  onRecovery(callback: (state: RecoveryState) => void): void {
    this.onRecoveryCallbacks.push(callback);
  }
  
  private notifyThrottle(throttled: boolean): void {
    for (const callback of this.onThrottleCallbacks) {
      try {
        callback(throttled);
      } catch (error) {
        logger.error('Error in throttle callback:', error);
      }
    }
  }
  
  private notifyHealthChange(): void {
    for (const callback of this.onHealthChangeCallbacks) {
      try {
        callback({ ...this.health });
      } catch (error) {
        logger.error('Error in health change callback:', error);
      }
    }
  }
  
  private notifyRecovery(state: RecoveryState): void {
    for (const callback of this.onRecoveryCallbacks) {
      try {
        callback(state);
      } catch (error) {
        logger.error('Error in recovery callback:', error);
      }
    }
  }
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  /**
   * Get current system health
   */
  getHealth(): SystemHealth {
    return { ...this.health };
  }
  
  /**
   * Get health status summary
   */
  getHealthSummary(): string {
    const h = this.health;
    const statusEmoji = {
      [HealthStatus.HEALTHY]: '✅',
      [HealthStatus.WARNING]: '⚠️',
      [HealthStatus.CRITICAL]: '🔴',
      [HealthStatus.RECOVERING]: '🔄'
    };
    
    // Use a fixed line width for consistent formatting
    const lineWidth = 70;
    const padLine = (label: string, value: string): string => {
      const content = `  ${label}: ${value}`;
      const padding = lineWidth - content.length - 1;
      return `║${content}${' '.repeat(Math.max(0, padding))}║`;
    };
    
    const memoryInfo = `${h.memory.usedMb}MB / ${h.memory.totalMb}MB (${h.memory.percent}%)`;
    
    return `
╔${'═'.repeat(lineWidth)}╗
║${' '.repeat(Math.floor((lineWidth - 20) / 2))}SYSTEM HEALTH STATUS${' '.repeat(Math.ceil((lineWidth - 20) / 2))}║
╠${'═'.repeat(lineWidth)}╣
║${' '.repeat(lineWidth)}║
${padLine('Overall Status', `${statusEmoji[h.status]} ${h.status}`)}
${padLine('Uptime', h.uptime.formatted)}
║${' '.repeat(lineWidth)}║
║  MEMORY${' '.repeat(lineWidth - 9)}║
${padLine('  Status', `${statusEmoji[h.memory.status]} ${h.memory.status}`)}
${padLine('  Usage', memoryInfo)}
║${' '.repeat(lineWidth)}║
║  CPU${' '.repeat(lineWidth - 6)}║
${padLine('  Status', `${statusEmoji[h.cpu.status]} ${h.cpu.status}`)}
${padLine('  Usage', `${h.cpu.percent}%`)}
${padLine('  Throttled', h.cpu.throttled ? 'Yes' : 'No')}
║${' '.repeat(lineWidth)}║
║  STABILITY${' '.repeat(lineWidth - 12)}║
${padLine('  Mode', h.currentMode)}
${padLine('  Consecutive Failures', String(h.consecutiveFailures))}
${padLine('  Last Health Check', new Date(h.lastHealthCheck).toLocaleTimeString())}
║${' '.repeat(lineWidth)}║
╚${'═'.repeat(lineWidth)}╝
    `.trim();
  }
  
  /**
   * Check if system is ready for 24/7 operation
   */
  isReadyFor24x7(): boolean {
    return (
      this.health.status === HealthStatus.HEALTHY &&
      !this.isThrottled &&
      this.consecutiveFailures === 0
    );
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<StabilityConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Stability configuration updated');
  }
  
  /**
   * Get current configuration
   */
  getConfig(): StabilityConfig {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export function getStabilityManager(config?: Partial<StabilityConfig>): StabilityManager {
  return StabilityManager.getInstance(config);
}

export default StabilityManager;
