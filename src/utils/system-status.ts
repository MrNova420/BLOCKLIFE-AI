/**
 * BlockLife AI - System Status & Indicators
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * COMPREHENSIVE SYSTEM STATUS TRACKING
 * Tracks everything happening in the simulation:
 * - AI model usage (real AI vs fallback/hardcoded)
 * - Individual bot activities and decisions
 * - Resource gathering and consumption
 * - Building progress
 * - Combat events
 * - Memory system access
 * - Performance metrics
 * - All logs accessible through dashboard
 */

import { createLogger } from '../utils/logger';
import { Bot, Village, Role, BotIntent, Era, TechAge } from '../types';

const logger = createLogger('system-status');

// ============================================================================
// STATUS ENUMS
// ============================================================================

export enum AIStatus {
  FULL_AI = 'FULL_AI',           // Real AI model making all decisions
  PARTIAL_AI = 'PARTIAL_AI',     // AI for some, rules for others
  RULES_ONLY = 'RULES_ONLY',     // No AI, just rule-based
  OFFLINE = 'OFFLINE'            // AI not available
}

export enum SystemComponent {
  AI_MODEL = 'AI_MODEL',
  AI_ENGINE = 'AI_ENGINE',
  BOT_CONSCIOUSNESS = 'BOT_CONSCIOUSNESS',
  MINECRAFT_DATA = 'MINECRAFT_DATA',
  SIMULATION_ENGINE = 'SIMULATION_ENGINE',
  DASHBOARD = 'DASHBOARD',
  MINECRAFT_CONNECTION = 'MINECRAFT_CONNECTION',
  DATABASE = 'DATABASE',
  MEMORY_SYSTEM = 'MEMORY_SYSTEM'
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export enum EventCategory {
  AI_DECISION = 'AI_DECISION',
  BOT_ACTION = 'BOT_ACTION',
  RESOURCE = 'RESOURCE',
  BUILDING = 'BUILDING',
  COMBAT = 'COMBAT',
  SOCIAL = 'SOCIAL',
  BIRTH = 'BIRTH',
  DEATH = 'DEATH',
  DISCOVERY = 'DISCOVERY',
  TRADE = 'TRADE',
  TECHNOLOGY = 'TECHNOLOGY',
  SYSTEM = 'SYSTEM',
  USER_COMMAND = 'USER_COMMAND',
  MEMORY = 'MEMORY'
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface SystemStatusIndicator {
  component: SystemComponent;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'INITIALIZING';
  message: string;
  lastUpdated: number;
  details?: Record<string, any>;
}

export interface AIIndicator {
  status: AIStatus;
  provider: string;
  model: string;
  decisionsThisSession: number;
  fallbackDecisions: number;
  averageResponseMs: number;
  lastDecisionAt: number;
  isProcessing: boolean;
  queueSize: number;
}

export interface BotActivityLog {
  botId: string;
  botName: string;
  timestamp: number;
  action: BotIntent;
  category: EventCategory;
  description: string;
  position?: { x: number; y: number; z: number };
  result?: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS' | 'CANCELLED';
  details?: Record<string, any>;
}

export interface SystemEvent {
  id: string;
  timestamp: number;
  category: EventCategory;
  level: LogLevel;
  source: string;
  message: string;
  details?: Record<string, any>;
  botId?: string;
  villageId?: string;
}

export interface PerformanceMetrics {
  ticksPerSecond: number;
  averageTickDurationMs: number;
  memoryUsageMb: number;
  cpuUsagePercent: number;
  activeBots: number;
  backgroundBots: number;
  aiQueueDepth: number;
  dbQueryCount: number;
  networkLatencyMs: number;
}

export interface SessionStats {
  startedAt: number;
  totalTicks: number;
  totalBotDecisions: number;
  aiDecisions: number;
  ruleBasedDecisions: number;
  userCommands: number;
  births: number;
  deaths: number;
  structuresBuilt: number;
  resourcesGathered: Record<string, number>;
  battlesWon: number;
  battlesLost: number;
  tradesCompleted: number;
  technologiesResearched: number;
  memoriesCreated: number;
  memoriesAccessed: number;
}

export interface BotMemoryEntry {
  id: string;
  botId: string;
  botName: string;
  timestamp: number;
  type: 'LOCATION' | 'PERSON' | 'EVENT' | 'RESOURCE' | 'DANGER' | 'SKILL' | 'GOAL';
  subject: string;
  description: string;
  importance: number;
  accessCount: number;
  lastAccessed: number;
}

// ============================================================================
// SYSTEM STATUS MANAGER
// ============================================================================

export class SystemStatusManager {
  private static instance: SystemStatusManager | null = null;
  
  // Status indicators
  private componentStatus: Map<SystemComponent, SystemStatusIndicator> = new Map();
  private aiIndicator: AIIndicator;
  
  // Logs and events
  private eventLog: SystemEvent[] = [];
  private botActivityLog: BotActivityLog[] = [];
  private botMemories: Map<string, BotMemoryEntry[]> = new Map();
  
  // Stats
  private sessionStats: SessionStats;
  private performanceMetrics: PerformanceMetrics;
  
  // Config
  private maxLogEntries: number = 10000;
  private maxActivityEntries: number = 5000;
  private maxMemoriesPerBot: number = 500;
  
  private constructor() {
    // Initialize AI indicator
    this.aiIndicator = {
      status: AIStatus.OFFLINE,
      provider: 'none',
      model: 'none',
      decisionsThisSession: 0,
      fallbackDecisions: 0,
      averageResponseMs: 0,
      lastDecisionAt: 0,
      isProcessing: false,
      queueSize: 0
    };
    
    // Initialize session stats
    this.sessionStats = {
      startedAt: Date.now(),
      totalTicks: 0,
      totalBotDecisions: 0,
      aiDecisions: 0,
      ruleBasedDecisions: 0,
      userCommands: 0,
      births: 0,
      deaths: 0,
      structuresBuilt: 0,
      resourcesGathered: {},
      battlesWon: 0,
      battlesLost: 0,
      tradesCompleted: 0,
      technologiesResearched: 0,
      memoriesCreated: 0,
      memoriesAccessed: 0
    };
    
    // Initialize performance metrics
    this.performanceMetrics = {
      ticksPerSecond: 0,
      averageTickDurationMs: 0,
      memoryUsageMb: 0,
      cpuUsagePercent: 0,
      activeBots: 0,
      backgroundBots: 0,
      aiQueueDepth: 0,
      dbQueryCount: 0,
      networkLatencyMs: 0
    };
    
    // Initialize component status
    for (const component of Object.values(SystemComponent)) {
      this.componentStatus.set(component, {
        component,
        status: 'INITIALIZING',
        message: 'Starting up...',
        lastUpdated: Date.now()
      });
    }
    
    logger.info('System Status Manager initialized');
  }
  
  static getInstance(): SystemStatusManager {
    if (!SystemStatusManager.instance) {
      SystemStatusManager.instance = new SystemStatusManager();
    }
    return SystemStatusManager.instance;
  }
  
  // ============================================================================
  // COMPONENT STATUS
  // ============================================================================
  
  updateComponentStatus(
    component: SystemComponent,
    status: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'INITIALIZING',
    message: string,
    details?: Record<string, any>
  ): void {
    this.componentStatus.set(component, {
      component,
      status,
      message,
      lastUpdated: Date.now(),
      details
    });
    
    this.logEvent({
      category: EventCategory.SYSTEM,
      level: status === 'OFFLINE' ? LogLevel.ERROR : 
             status === 'DEGRADED' ? LogLevel.WARN : LogLevel.INFO,
      source: component,
      message: `${component}: ${message}`,
      details
    });
  }
  
  getComponentStatus(component: SystemComponent): SystemStatusIndicator | undefined {
    return this.componentStatus.get(component);
  }
  
  getAllComponentStatus(): SystemStatusIndicator[] {
    return Array.from(this.componentStatus.values());
  }
  
  isSystemHealthy(): boolean {
    for (const status of this.componentStatus.values()) {
      if (status.status === 'OFFLINE') return false;
    }
    return true;
  }
  
  // ============================================================================
  // AI STATUS
  // ============================================================================
  
  updateAIStatus(update: Partial<AIIndicator>): void {
    this.aiIndicator = { ...this.aiIndicator, ...update };
    
    // Update component status based on AI status
    this.updateComponentStatus(
      SystemComponent.AI_MODEL,
      this.aiIndicator.status === AIStatus.FULL_AI ? 'ONLINE' :
      this.aiIndicator.status === AIStatus.PARTIAL_AI ? 'DEGRADED' :
      this.aiIndicator.status === AIStatus.RULES_ONLY ? 'DEGRADED' : 'OFFLINE',
      `${this.aiIndicator.provider}/${this.aiIndicator.model} - ${this.aiIndicator.status}`,
      { ...this.aiIndicator }
    );
  }
  
  recordAIDecision(wasAI: boolean, responseTimeMs: number): void {
    this.sessionStats.totalBotDecisions++;
    
    if (wasAI) {
      this.sessionStats.aiDecisions++;
      this.aiIndicator.decisionsThisSession++;
      
      // Update average response time
      const total = this.aiIndicator.averageResponseMs * (this.aiIndicator.decisionsThisSession - 1);
      this.aiIndicator.averageResponseMs = (total + responseTimeMs) / this.aiIndicator.decisionsThisSession;
    } else {
      this.sessionStats.ruleBasedDecisions++;
      this.aiIndicator.fallbackDecisions++;
    }
    
    this.aiIndicator.lastDecisionAt = Date.now();
  }
  
  getAIIndicator(): AIIndicator {
    return { ...this.aiIndicator };
  }
  
  getAIUsagePercentage(): number {
    if (this.sessionStats.totalBotDecisions === 0) return 0;
    return (this.sessionStats.aiDecisions / this.sessionStats.totalBotDecisions) * 100;
  }
  
  // ============================================================================
  // EVENT LOGGING
  // ============================================================================
  
  logEvent(event: Omit<SystemEvent, 'id' | 'timestamp'>): void {
    const fullEvent: SystemEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    
    this.eventLog.push(fullEvent);
    
    // Trim log if too large
    if (this.eventLog.length > this.maxLogEntries) {
      this.eventLog = this.eventLog.slice(-this.maxLogEntries);
    }
    
    // Also log to standard logger
    switch (event.level) {
      case LogLevel.DEBUG:
        logger.debug(`[${event.category}] ${event.message}`);
        break;
      case LogLevel.INFO:
        logger.info(`[${event.category}] ${event.message}`);
        break;
      case LogLevel.WARN:
        logger.warn(`[${event.category}] ${event.message}`);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        logger.error(`[${event.category}] ${event.message}`);
        break;
    }
  }
  
  getEvents(options?: {
    category?: EventCategory;
    level?: LogLevel;
    since?: number;
    limit?: number;
    botId?: string;
    villageId?: string;
  }): SystemEvent[] {
    let events = [...this.eventLog];
    
    if (options?.category) {
      events = events.filter(e => e.category === options.category);
    }
    if (options?.level) {
      events = events.filter(e => e.level === options.level);
    }
    if (options?.since) {
      const since = options.since;
      events = events.filter(e => e.timestamp >= since);
    }
    if (options?.botId) {
      events = events.filter(e => e.botId === options.botId);
    }
    if (options?.villageId) {
      events = events.filter(e => e.villageId === options.villageId);
    }
    if (options?.limit) {
      events = events.slice(-options.limit);
    }
    
    return events;
  }
  
  getRecentEvents(count: number = 50): SystemEvent[] {
    return this.eventLog.slice(-count);
  }
  
  // ============================================================================
  // BOT ACTIVITY LOGGING
  // ============================================================================
  
  logBotActivity(activity: Omit<BotActivityLog, 'timestamp'>): void {
    const fullActivity: BotActivityLog = {
      ...activity,
      timestamp: Date.now()
    };
    
    this.botActivityLog.push(fullActivity);
    
    // Trim if too large
    if (this.botActivityLog.length > this.maxActivityEntries) {
      this.botActivityLog = this.botActivityLog.slice(-this.maxActivityEntries);
    }
    
    // Also log as event
    this.logEvent({
      category: activity.category,
      level: LogLevel.INFO,
      source: `bot:${activity.botName}`,
      message: activity.description,
      botId: activity.botId,
      details: activity.details
    });
  }
  
  getBotActivity(botId: string, limit?: number): BotActivityLog[] {
    let activities = this.botActivityLog.filter(a => a.botId === botId);
    if (limit) {
      activities = activities.slice(-limit);
    }
    return activities;
  }
  
  getAllBotActivity(limit?: number): BotActivityLog[] {
    if (limit) {
      return this.botActivityLog.slice(-limit);
    }
    return [...this.botActivityLog];
  }
  
  // ============================================================================
  // BOT MEMORY SYSTEM
  // ============================================================================
  
  recordBotMemory(memory: Omit<BotMemoryEntry, 'id' | 'timestamp' | 'accessCount' | 'lastAccessed'>): void {
    const fullMemory: BotMemoryEntry = {
      ...memory,
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now()
    };
    
    if (!this.botMemories.has(memory.botId)) {
      this.botMemories.set(memory.botId, []);
    }
    
    const memories = this.botMemories.get(memory.botId)!;
    memories.push(fullMemory);
    
    // Trim if too many memories
    if (memories.length > this.maxMemoriesPerBot) {
      // Keep most important and most recent
      memories.sort((a, b) => {
        const aScore = a.importance + (a.accessCount * 2);
        const bScore = b.importance + (b.accessCount * 2);
        return bScore - aScore;
      });
      this.botMemories.set(memory.botId, memories.slice(0, this.maxMemoriesPerBot));
    }
    
    this.sessionStats.memoriesCreated++;
    
    this.logEvent({
      category: EventCategory.MEMORY,
      level: LogLevel.DEBUG,
      source: `bot:${memory.botName}`,
      message: `Memory created: ${memory.type} - ${memory.subject}`,
      botId: memory.botId,
      details: { memory: fullMemory }
    });
  }
  
  getBotMemories(botId: string, type?: BotMemoryEntry['type']): BotMemoryEntry[] {
    const memories = this.botMemories.get(botId) || [];
    
    // Update access count
    memories.forEach(m => {
      m.accessCount++;
      m.lastAccessed = Date.now();
    });
    this.sessionStats.memoriesAccessed += memories.length;
    
    if (type) {
      return memories.filter(m => m.type === type);
    }
    return memories;
  }
  
  searchBotMemories(botId: string, query: string): BotMemoryEntry[] {
    const memories = this.botMemories.get(botId) || [];
    const lowerQuery = query.toLowerCase();
    
    return memories.filter(m =>
      m.subject.toLowerCase().includes(lowerQuery) ||
      m.description.toLowerCase().includes(lowerQuery)
    );
  }
  
  getAllMemories(): Map<string, BotMemoryEntry[]> {
    return new Map(this.botMemories);
  }
  
  // ============================================================================
  // SESSION STATS
  // ============================================================================
  
  recordTick(): void {
    this.sessionStats.totalTicks++;
  }
  
  recordBirth(): void {
    this.sessionStats.births++;
    this.logEvent({
      category: EventCategory.BIRTH,
      level: LogLevel.INFO,
      source: 'simulation',
      message: 'New bot born'
    });
  }
  
  recordDeath(botId: string, botName: string, cause: string): void {
    this.sessionStats.deaths++;
    this.logEvent({
      category: EventCategory.DEATH,
      level: LogLevel.INFO,
      source: 'simulation',
      message: `${botName} died: ${cause}`,
      botId
    });
  }
  
  recordStructureBuilt(name: string, botId?: string): void {
    this.sessionStats.structuresBuilt++;
    this.logEvent({
      category: EventCategory.BUILDING,
      level: LogLevel.INFO,
      source: 'building',
      message: `Structure built: ${name}`,
      botId
    });
  }
  
  recordResourceGathered(resource: string, amount: number): void {
    if (!this.sessionStats.resourcesGathered[resource]) {
      this.sessionStats.resourcesGathered[resource] = 0;
    }
    this.sessionStats.resourcesGathered[resource] += amount;
  }
  
  recordBattle(won: boolean): void {
    if (won) {
      this.sessionStats.battlesWon++;
    } else {
      this.sessionStats.battlesLost++;
    }
  }
  
  recordTrade(): void {
    this.sessionStats.tradesCompleted++;
  }
  
  recordTechResearch(techName: string): void {
    this.sessionStats.technologiesResearched++;
    this.logEvent({
      category: EventCategory.TECHNOLOGY,
      level: LogLevel.INFO,
      source: 'tech-tree',
      message: `Technology researched: ${techName}`
    });
  }
  
  recordUserCommand(command: string): void {
    this.sessionStats.userCommands++;
    this.logEvent({
      category: EventCategory.USER_COMMAND,
      level: LogLevel.INFO,
      source: 'user',
      message: `Command: ${command}`
    });
  }
  
  getSessionStats(): SessionStats {
    return { ...this.sessionStats };
  }
  
  // ============================================================================
  // PERFORMANCE METRICS
  // ============================================================================
  
  updatePerformanceMetrics(metrics: Partial<PerformanceMetrics>): void {
    this.performanceMetrics = { ...this.performanceMetrics, ...metrics };
  }
  
  getPerformanceMetrics(): PerformanceMetrics {
    // Update memory usage
    const memUsage = process.memoryUsage();
    this.performanceMetrics.memoryUsageMb = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    return { ...this.performanceMetrics };
  }
  
  // ============================================================================
  // COMPREHENSIVE STATUS REPORT
  // ============================================================================
  
  getFullStatusReport(): {
    systemHealth: boolean;
    components: SystemStatusIndicator[];
    ai: AIIndicator;
    session: SessionStats;
    performance: PerformanceMetrics;
    recentEvents: SystemEvent[];
    aiUsagePercent: number;
    uptime: number;
  } {
    return {
      systemHealth: this.isSystemHealthy(),
      components: this.getAllComponentStatus(),
      ai: this.getAIIndicator(),
      session: this.getSessionStats(),
      performance: this.getPerformanceMetrics(),
      recentEvents: this.getRecentEvents(20),
      aiUsagePercent: this.getAIUsagePercentage(),
      uptime: Date.now() - this.sessionStats.startedAt
    };
  }
  
  getStatusSummary(): string {
    const report = this.getFullStatusReport();
    const uptimeMs = report.uptime;
    const hours = Math.floor(uptimeMs / 3600000);
    const minutes = Math.floor((uptimeMs % 3600000) / 60000);
    const uptimeStr = hours > 0 ? `${hours} hours, ${minutes} minutes` : `${minutes} minutes`;
    
    // Get current local time
    const currentTime = new Date().toLocaleString('en-US', {
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    // Get session start time
    const startTime = new Date(this.sessionStats.startedAt).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    return `
╔══════════════════════════════════════════════════════════════════════╗
║                       BLOCKLIFE AI STATUS                            ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  Current Time: ${currentTime.padEnd(50)}║
║  Session Started: ${startTime.padEnd(47)}║
║  Running For: ${uptimeStr.padEnd(52)}║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║  SYSTEM HEALTH: ${(report.systemHealth ? '✅ All Systems Online' : '⚠️ Some Systems Degraded').padEnd(49)}║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  🤖 AI MODEL                                                         ║
║     Provider: ${report.ai.provider.padEnd(52)}║
║     Model: ${report.ai.model.padEnd(55)}║
║     Status: ${report.ai.status.padEnd(54)}║
║     AI Decisions: ${String(report.ai.decisionsThisSession).padEnd(48)}║
║     Fallback Decisions: ${String(report.ai.fallbackDecisions).padEnd(42)}║
║     AI Usage: ${(report.aiUsagePercent.toFixed(1) + '%').padEnd(52)}║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  📊 SESSION STATISTICS                                               ║
║     Total Simulation Ticks: ${String(report.session.totalTicks).padEnd(38)}║
║     Births: ${String(report.session.births).padEnd(55)}║
║     Deaths: ${String(report.session.deaths).padEnd(55)}║
║     Structures Built: ${String(report.session.structuresBuilt).padEnd(45)}║
║     Technologies Researched: ${String(report.session.technologiesResearched).padEnd(37)}║
║     User Commands Processed: ${String(report.session.userCommands).padEnd(37)}║
║     Memories Created: ${String(report.session.memoriesCreated).padEnd(45)}║
║     Memories Accessed: ${String(report.session.memoriesAccessed).padEnd(44)}║
║                                                                      ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  ⚡ PERFORMANCE                                                       ║
║     Ticks Per Second: ${String(report.performance.ticksPerSecond).padEnd(45)}║
║     Memory Usage: ${(report.performance.memoryUsageMb + ' MB').padEnd(48)}║
║     Active Bots: ${String(report.performance.activeBots).padEnd(49)}║
║     Background Bots: ${String(report.performance.backgroundBots).padEnd(45)}║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
    `.trim();
  }
  
  // ============================================================================
  // RESET
  // ============================================================================
  
  reset(): void {
    this.eventLog = [];
    this.botActivityLog = [];
    this.botMemories.clear();
    
    this.sessionStats = {
      startedAt: Date.now(),
      totalTicks: 0,
      totalBotDecisions: 0,
      aiDecisions: 0,
      ruleBasedDecisions: 0,
      userCommands: 0,
      births: 0,
      deaths: 0,
      structuresBuilt: 0,
      resourcesGathered: {},
      battlesWon: 0,
      battlesLost: 0,
      tradesCompleted: 0,
      technologiesResearched: 0,
      memoriesCreated: 0,
      memoriesAccessed: 0
    };
    
    logger.info('System Status Manager reset');
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export function getSystemStatus(): SystemStatusManager {
  return SystemStatusManager.getInstance();
}

export default SystemStatusManager;
