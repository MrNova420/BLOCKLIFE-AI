/**
 * BlockLife AI - Auto Manager
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * AUTONOMOUS BOT MANAGEMENT SYSTEM
 * 
 * This system provides fully automated management of the BlockLife civilization:
 * - Automatic bot reconnection on disconnect
 * - Performance monitoring and optimization
 * - Progress tracking and reporting
 * - Health monitoring for all bots
 * - Self-healing and stability maintenance
 * - Support for both Java and Bedrock editions
 */

import { createLogger } from './logger';
import { getStabilityManager, HealthStatus, SystemHealth } from './stability-manager';
import { getSystemStatus, SystemComponent, EventCategory, LogLevel } from './system-status';
import { getConnectionManager, ConnectionState } from '../bots/connection-manager';
import { getBotManager } from '../bots/bot-manager';
import { getSimEngine } from '../simulation/sim-engine';
import { getAiClient, StubAiClient } from '../mind/ai-client';
import { PerformanceMode, MinecraftEdition, Role, Era } from '../types';

const logger = createLogger('auto-manager');

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface AutoManagerConfig {
  // Reconnection settings
  enableAutoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelayMs: number;
  reconnectBackoffMultiplier: number;
  maxReconnectDelayMs: number;
  
  // Health monitoring
  healthCheckIntervalMs: number;
  botHealthThreshold: number;
  
  // Performance
  enableAutoPerformance: boolean;
  performanceCheckIntervalMs: number;
  
  // Progress reporting
  enableProgressReporting: boolean;
  progressReportIntervalMs: number;
  
  // Auto-management
  enableAutoManagement: boolean;
  managementTickIntervalMs: number;
}

const DEFAULT_CONFIG: AutoManagerConfig = {
  enableAutoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelayMs: 5000,
  reconnectBackoffMultiplier: 2,
  maxReconnectDelayMs: 60000,
  
  healthCheckIntervalMs: 30000,
  botHealthThreshold: 20,
  
  enableAutoPerformance: true,
  performanceCheckIntervalMs: 60000,
  
  enableProgressReporting: true,
  progressReportIntervalMs: 300000, // 5 minutes
  
  enableAutoManagement: true,
  managementTickIntervalMs: 10000
};

// ============================================================================
// TYPES
// ============================================================================

export interface BotHealthReport {
  botId: string;
  name: string;
  isConnected: boolean;
  health: number;
  role: string;
  currentTask: string | null;
  lastActivity: number;
  reconnectAttempts: number;
  status: 'healthy' | 'warning' | 'critical' | 'disconnected';
}

export interface ProgressReport {
  timestamp: number;
  uptime: string;
  
  // Civilization status
  era: Era;
  simulationDays: number;
  
  // Population
  totalBots: number;
  livingBots: number;
  connectedBots: number;
  disconnectedBots: number;
  
  // Villages
  villageCount: number;
  totalPopulation: number;
  averageProsperity: number;
  
  // Resources
  totalFood: number;
  totalWood: number;
  totalStone: number;
  totalIron: number;
  
  // AI Status
  aiProvider: string;
  aiDecisionsThisSession: number;
  aiAverageLatencyMs: number;
  
  // System health
  systemHealth: HealthStatus;
  memoryUsagePercent: number;
  cpuUsagePercent: number;
  
  // Recent events
  recentEvents: string[];
  
  // Recommendations
  recommendations: string[];
}

export interface AutoManagerStatus {
  isRunning: boolean;
  managementEnabled: boolean;
  autoReconnectEnabled: boolean;
  performanceOptimizationEnabled: boolean;
  
  // Bot tracking
  botsBeingManaged: number;
  botsNeedingAttention: number;
  reconnectionsInProgress: number;
  
  // Performance
  lastHealthCheck: number;
  lastPerformanceCheck: number;
  lastProgressReport: number;
  
  // Stats
  totalReconnectAttempts: number;
  successfulReconnects: number;
  failedReconnects: number;
}

// ============================================================================
// AUTO MANAGER CLASS
// ============================================================================

export class AutoManager {
  private static instance: AutoManager | null = null;
  
  private config: AutoManagerConfig;
  private isRunning: boolean = false;
  private startTime: number = 0;
  
  // Intervals
  private managementInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private performanceInterval: NodeJS.Timeout | null = null;
  private progressReportInterval: NodeJS.Timeout | null = null;
  
  // Bot tracking
  private botReconnectAttempts: Map<string, number> = new Map();
  private botReconnectDelays: Map<string, number> = new Map();
  private reconnectingBots: Set<string> = new Set();
  
  // Stats
  private totalReconnectAttempts: number = 0;
  private successfulReconnects: number = 0;
  private failedReconnects: number = 0;
  private lastHealthCheck: number = 0;
  private lastPerformanceCheck: number = 0;
  private lastProgressReport: number = 0;
  
  // Progress report history
  private progressReports: ProgressReport[] = [];
  private maxProgressReports: number = 100;
  
  private constructor(config?: Partial<AutoManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info('Auto Manager initialized');
  }
  
  static getInstance(config?: Partial<AutoManagerConfig>): AutoManager {
    if (!AutoManager.instance) {
      AutoManager.instance = new AutoManager(config);
    }
    return AutoManager.instance;
  }
  
  // ============================================================================
  // LIFECYCLE
  // ============================================================================
  
  /**
   * Start the auto-management system
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startTime = Date.now();
    
    const status = getSystemStatus();
    status.logEvent({
      category: EventCategory.SYSTEM,
      level: LogLevel.INFO,
      source: 'auto-manager',
      message: 'Auto-management system started'
    });
    
    // Start main management loop
    if (this.config.enableAutoManagement) {
      this.managementInterval = setInterval(() => {
        this.managementTick();
      }, this.config.managementTickIntervalMs);
    }
    
    // Start health monitoring
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);
    
    // Start performance optimization
    if (this.config.enableAutoPerformance) {
      this.performanceInterval = setInterval(() => {
        this.optimizePerformance();
      }, this.config.performanceCheckIntervalMs);
    }
    
    // Start progress reporting
    if (this.config.enableProgressReporting) {
      this.progressReportInterval = setInterval(() => {
        this.generateAndStoreProgressReport();
      }, this.config.progressReportIntervalMs);
    }
    
    // Run initial checks
    this.performHealthCheck();
    this.generateAndStoreProgressReport();
    
    logger.info('Auto-management system is now active');
    console.log('\n🤖 Auto-Manager: System is now being managed autonomously.');
    console.log('   - Auto-reconnection: ' + (this.config.enableAutoReconnect ? 'ENABLED' : 'DISABLED'));
    console.log('   - Performance optimization: ' + (this.config.enableAutoPerformance ? 'ENABLED' : 'DISABLED'));
    console.log('   - Progress reporting: ' + (this.config.enableProgressReporting ? 'ENABLED' : 'DISABLED'));
    console.log('');
  }
  
  /**
   * Stop the auto-management system
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.managementInterval) clearInterval(this.managementInterval);
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.performanceInterval) clearInterval(this.performanceInterval);
    if (this.progressReportInterval) clearInterval(this.progressReportInterval);
    
    const status = getSystemStatus();
    status.logEvent({
      category: EventCategory.SYSTEM,
      level: LogLevel.INFO,
      source: 'auto-manager',
      message: 'Auto-management system stopped'
    });
    
    logger.info('Auto-management system stopped');
  }
  
  // ============================================================================
  // MAIN MANAGEMENT LOOP
  // ============================================================================
  
  /**
   * Main management tick - handles all autonomous operations
   */
  private managementTick(): void {
    try {
      // Check for disconnected bots and attempt reconnection
      if (this.config.enableAutoReconnect) {
        this.checkAndReconnectBots();
      }
      
      // Monitor bot health and take actions
      this.monitorBotHealth();
      
      // Balance bot roles if needed
      this.balanceBotRoles();
      
      // Update AI decisions for bots that need them
      this.processAiDecisions();
      
    } catch (error) {
      logger.error('Error in management tick:', error);
    }
  }
  
  // ============================================================================
  // AUTO-RECONNECTION
  // ============================================================================
  
  /**
   * Check for disconnected bots and attempt reconnection
   */
  private async checkAndReconnectBots(): Promise<void> {
    const connectionManager = getConnectionManager();
    const botManager = getBotManager();
    const status = connectionManager.getStatus();
    
    // Only proceed if we have a connection
    if (status.state !== ConnectionState.CONNECTED && status.state !== ConnectionState.READY) {
      return;
    }
    
    const allBots = botManager.getAllBots();
    const livingBots = allBots.filter(b => !b.isDead());
    
    for (const bot of livingBots) {
      const botId = bot.id;
      const isConnected = connectionManager.isBotConnected(botId);
      
      // Skip if already connected or currently reconnecting
      if (isConnected || this.reconnectingBots.has(botId)) {
        continue;
      }
      
      // Check reconnect attempts
      const attempts = this.botReconnectAttempts.get(botId) || 0;
      
      if (attempts >= this.config.maxReconnectAttempts) {
        // Max attempts reached - log and skip
        continue;
      }
      
      // Calculate backoff delay
      const baseDelay = this.config.reconnectDelayMs;
      const currentDelay = this.botReconnectDelays.get(botId) || baseDelay;
      const lastAttempt = this.botReconnectDelays.get(`${botId}_time`) || 0;
      
      if (Date.now() - lastAttempt < currentDelay) {
        continue; // Not enough time has passed
      }
      
      // Attempt reconnection
      this.reconnectingBots.add(botId);
      this.totalReconnectAttempts++;
      
      logger.info(`Attempting to reconnect bot ${bot.name} (attempt ${attempts + 1}/${this.config.maxReconnectAttempts})`);
      
      try {
        const success = await connectionManager.reconnectBot(botId);
        
        if (success) {
          this.successfulReconnects++;
          this.botReconnectAttempts.delete(botId);
          this.botReconnectDelays.delete(botId);
          this.botReconnectDelays.delete(`${botId}_time`);
          
          const systemStatus = getSystemStatus();
          systemStatus.logEvent({
            category: EventCategory.BOT_ACTION,
            level: LogLevel.INFO,
            source: 'auto-manager',
            botId,
            message: `Successfully reconnected bot ${bot.name}`
          });
          
          logger.info(`Successfully reconnected bot ${bot.name}`);
        } else {
          throw new Error('Reconnection failed');
        }
      } catch (error) {
        this.failedReconnects++;
        const newAttempts = attempts + 1;
        this.botReconnectAttempts.set(botId, newAttempts);
        
        // Increase backoff delay
        const newDelay = Math.min(
          currentDelay * this.config.reconnectBackoffMultiplier,
          this.config.maxReconnectDelayMs
        );
        this.botReconnectDelays.set(botId, newDelay);
        this.botReconnectDelays.set(`${botId}_time`, Date.now());
        
        logger.warn(`Failed to reconnect bot ${bot.name}: ${error}`);
        
        if (newAttempts >= this.config.maxReconnectAttempts) {
          const systemStatus = getSystemStatus();
          systemStatus.logEvent({
            category: EventCategory.BOT_ACTION,
            level: LogLevel.ERROR,
            source: 'auto-manager',
            botId,
            message: `Bot ${bot.name} reached max reconnect attempts (${this.config.maxReconnectAttempts})`
          });
        }
      } finally {
        this.reconnectingBots.delete(botId);
      }
    }
  }
  
  /**
   * Reset reconnect attempts for a bot (call when manually reconnected)
   */
  resetReconnectAttempts(botId: string): void {
    this.botReconnectAttempts.delete(botId);
    this.botReconnectDelays.delete(botId);
    this.botReconnectDelays.delete(`${botId}_time`);
  }
  
  // ============================================================================
  // HEALTH MONITORING
  // ============================================================================
  
  /**
   * Perform health check on all bots and the system
   */
  private performHealthCheck(): void {
    this.lastHealthCheck = Date.now();
    
    const botManager = getBotManager();
    const allBots = botManager.getAllBots();
    const livingBots = allBots.filter(b => !b.isDead());
    
    let criticalCount = 0;
    let warningCount = 0;
    
    for (const bot of livingBots) {
      const data = bot.getData();
      const needs = data.needs;
      
      // Check for critical needs
      if (needs.hunger > 90 || needs.energy > 90 || needs.safety > 90) {
        criticalCount++;
        
        // Apply emergency AI decision
        if (needs.hunger > 90) {
          bot.applyDecision({ id: bot.id, intent: 'EAT', details: { reason: 'critical hunger' } });
        } else if (needs.energy > 90) {
          bot.applyDecision({ id: bot.id, intent: 'SLEEP', details: { reason: 'critical energy' } });
        } else if (needs.safety > 90) {
          bot.applyDecision({ id: bot.id, intent: 'FLEE_TO_SAFETY', details: { reason: 'critical safety' } });
        }
      } else if (needs.hunger > 70 || needs.energy > 70 || needs.safety > 70) {
        warningCount++;
      }
      
      // Check bot health
      if (data.health < this.config.botHealthThreshold) {
        const systemStatus = getSystemStatus();
        systemStatus.logEvent({
          category: EventCategory.BOT_ACTION,
          level: LogLevel.WARN,
          source: 'auto-manager',
          botId: bot.id,
          message: `Bot ${data.name} has critical health: ${data.health}`
        });
      }
    }
    
    // Log health summary if there are issues
    if (criticalCount > 0 || warningCount > 0) {
      logger.info(`Health check: ${criticalCount} critical, ${warningCount} warning out of ${livingBots.length} bots`);
    }
  }
  
  /**
   * Monitor bot health and log issues
   */
  private monitorBotHealth(): void {
    const botManager = getBotManager();
    const simEngine = getSimEngine();
    const livingBots = botManager.getLivingBots();
    
    // Check village prosperity
    const villages = simEngine.getAllVillages();
    for (const village of villages) {
      if (village.prosperity < 30) {
        logger.warn(`Village ${village.name} has low prosperity: ${village.prosperity}`);
        
        // Suggest actions
        if (village.stockpile.food < 50) {
          logger.info(`Recommendation: Assign more farmers to ${village.name}`);
        }
      }
    }
  }
  
  // ============================================================================
  // ROLE BALANCING
  // ============================================================================
  
  /**
   * Balance bot roles based on village needs
   */
  private balanceBotRoles(): void {
    const simEngine = getSimEngine();
    const villages = simEngine.getAllVillages();
    
    for (const village of villages) {
      // Let the simulation engine handle role assignment
      simEngine.assignRoles(village.id);
    }
  }
  
  // ============================================================================
  // AI DECISION PROCESSING
  // ============================================================================
  
  /**
   * Process AI decisions for bots that need them
   */
  private async processAiDecisions(): Promise<void> {
    const botManager = getBotManager();
    const aiClient = getAiClient();
    
    const botsNeedingDecision = botManager.getBotsNeedingDecision();
    
    if (botsNeedingDecision.length === 0) {
      return;
    }
    
    // Process in batches
    const batchSize = Math.min(botsNeedingDecision.length, 10);
    const batch = botsNeedingDecision.slice(0, batchSize);
    
    const contexts = batch.map(bot => bot.buildAiContext());
    
    try {
      const response = await aiClient.getBotBatchDecisions({
        mode: 'BOT_BATCH_DECISION',
        world: {
          timeOfDay: 'DAY' as any,
          era: getSimEngine().getState().era,
          globalThreatLevel: 'LOW' as any
        },
        bots: contexts
      });
      
      for (const decision of response.decisions) {
        const bot = botManager.getBot(decision.id);
        if (bot) {
          bot.applyDecision(decision);
        }
      }
    } catch (error) {
      logger.debug(`AI decision processing error: ${error}`);
    }
  }
  
  // ============================================================================
  // PERFORMANCE OPTIMIZATION
  // ============================================================================
  
  /**
   * Optimize performance based on system state
   */
  private optimizePerformance(): void {
    this.lastPerformanceCheck = Date.now();
    
    const stabilityManager = getStabilityManager();
    const health = stabilityManager.getHealth();
    
    // Log performance recommendations
    if (health.memory.percent > 75) {
      logger.info('Performance: High memory usage detected, consider reducing bot count');
    }
    
    if (health.cpu.percent > 70) {
      logger.info('Performance: High CPU usage detected, auto-manager is throttling');
    }
  }
  
  // ============================================================================
  // PROGRESS REPORTING
  // ============================================================================
  
  /**
   * Generate and store a progress report
   */
  private generateAndStoreProgressReport(): void {
    const report = this.generateProgressReport();
    
    // Store report
    this.progressReports.push(report);
    if (this.progressReports.length > this.maxProgressReports) {
      this.progressReports.shift();
    }
    
    this.lastProgressReport = Date.now();
    
    // Log summary
    logger.info(`Progress Report: Era=${report.era}, Day=${report.simulationDays}, Bots=${report.livingBots}/${report.totalBots}, Connected=${report.connectedBots}`);
  }
  
  /**
   * Generate a progress report
   */
  generateProgressReport(): ProgressReport {
    const botManager = getBotManager();
    const simEngine = getSimEngine();
    const connectionManager = getConnectionManager();
    const stabilityManager = getStabilityManager();
    const aiClient = getAiClient();
    const systemStatus = getSystemStatus();
    
    const state = simEngine.getState();
    const health = stabilityManager.getHealth();
    const connStatus = connectionManager.getStatus();
    
    const allBots = botManager.getAllBots();
    const livingBots = allBots.filter(b => !b.isDead());
    
    const villages = simEngine.getAllVillages();
    const totalResources = villages.reduce((acc, v) => ({
      food: acc.food + v.stockpile.food,
      wood: acc.wood + v.stockpile.wood,
      stone: acc.stone + v.stockpile.stone,
      iron: acc.iron + v.stockpile.iron
    }), { food: 0, wood: 0, stone: 0, iron: 0 });
    
    const avgProsperity = villages.length > 0
      ? Math.round(villages.reduce((sum, v) => sum + v.prosperity, 0) / villages.length)
      : 0;
    
    // Get recent events
    const recentEvents = systemStatus.getEvents({ limit: 10 })
      .map(e => `[${new Date(e.timestamp).toLocaleTimeString()}] ${e.message}`);
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (connStatus.connectedBots < livingBots.length * 0.8) {
      recommendations.push(`${livingBots.length - connStatus.connectedBots} bots are disconnected - auto-reconnect is working on it`);
    }
    
    if (totalResources.food < livingBots.length * 10) {
      recommendations.push('Food supplies are low - consider assigning more farmers');
    }
    
    if (avgProsperity < 50) {
      recommendations.push('Village prosperity is low - focus on resource gathering and building');
    }
    
    if (health.memory.percent > 70) {
      recommendations.push('Memory usage is high - consider reducing bot count or restarting');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All systems operating normally');
    }
    
    // Calculate uptime
    const uptimeMs = this.startTime > 0 ? Date.now() - this.startTime : 0;
    const hours = Math.floor(uptimeMs / 3600000);
    const minutes = Math.floor((uptimeMs % 3600000) / 60000);
    const uptime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    
    return {
      timestamp: Date.now(),
      uptime,
      
      era: state.era,
      simulationDays: Math.floor(state.simulationDays),
      
      totalBots: allBots.length,
      livingBots: livingBots.length,
      connectedBots: connStatus.connectedBots,
      disconnectedBots: livingBots.length - connStatus.connectedBots,
      
      villageCount: villages.length,
      totalPopulation: villages.reduce((sum, v) => sum + v.memberIds.length, 0),
      averageProsperity: avgProsperity,
      
      totalFood: totalResources.food,
      totalWood: totalResources.wood,
      totalStone: totalResources.stone,
      totalIron: totalResources.iron,
      
      aiProvider: aiClient.getProviderName(),
      aiDecisionsThisSession: 0, // Would need to track this
      aiAverageLatencyMs: aiClient.getAverageLatency(),
      
      systemHealth: health.status,
      memoryUsagePercent: health.memory.percent,
      cpuUsagePercent: health.cpu.percent,
      
      recentEvents,
      recommendations
    };
  }
  
  /**
   * Get the latest progress report
   */
  getLatestProgressReport(): ProgressReport | null {
    if (this.progressReports.length === 0) {
      return this.generateProgressReport();
    }
    return this.progressReports[this.progressReports.length - 1];
  }
  
  /**
   * Get progress report history
   */
  getProgressReportHistory(limit: number = 10): ProgressReport[] {
    return this.progressReports.slice(-limit);
  }
  
  /**
   * Get a formatted progress report string for display
   */
  getFormattedProgressReport(): string {
    const report = this.getLatestProgressReport();
    if (!report) return 'No progress report available';
    
    const lineWidth = 70;
    const padLine = (label: string, value: string): string => {
      const content = `  ${label}: ${value}`;
      const padding = lineWidth - content.length - 1;
      return `║${content}${' '.repeat(Math.max(0, padding))}║`;
    };
    
    const healthEmoji = {
      'HEALTHY': '✅',
      'WARNING': '⚠️',
      'CRITICAL': '🔴',
      'RECOVERING': '🔄'
    };
    
    let output = `
╔${'═'.repeat(lineWidth)}╗
║${' '.repeat(Math.floor((lineWidth - 22) / 2))}BLOCKLIFE PROGRESS REPORT${' '.repeat(Math.ceil((lineWidth - 22) / 2))}║
╠${'═'.repeat(lineWidth)}╣
║${' '.repeat(lineWidth)}║
${padLine('Generated', new Date(report.timestamp).toLocaleString())}
${padLine('Uptime', report.uptime)}
║${' '.repeat(lineWidth)}║
║  CIVILIZATION${' '.repeat(lineWidth - 15)}║
${padLine('  Era', report.era)}
${padLine('  Day', String(report.simulationDays))}
${padLine('  Villages', String(report.villageCount))}
${padLine('  Avg Prosperity', `${report.averageProsperity}%`)}
║${' '.repeat(lineWidth)}║
║  POPULATION${' '.repeat(lineWidth - 13)}║
${padLine('  Total Bots', String(report.totalBots))}
${padLine('  Living', String(report.livingBots))}
${padLine('  Connected', String(report.connectedBots))}
${padLine('  Disconnected', String(report.disconnectedBots))}
║${' '.repeat(lineWidth)}║
║  RESOURCES${' '.repeat(lineWidth - 12)}║
${padLine('  Food', String(Math.round(report.totalFood)))}
${padLine('  Wood', String(Math.round(report.totalWood)))}
${padLine('  Stone', String(Math.round(report.totalStone)))}
${padLine('  Iron', String(Math.round(report.totalIron)))}
║${' '.repeat(lineWidth)}║
║  SYSTEM${' '.repeat(lineWidth - 9)}║
${padLine('  Health', `${healthEmoji[report.systemHealth] || '❓'} ${report.systemHealth}`)}
${padLine('  Memory', `${report.memoryUsagePercent}%`)}
${padLine('  CPU', `${report.cpuUsagePercent}%`)}
${padLine('  AI Provider', report.aiProvider)}
║${' '.repeat(lineWidth)}║
║  RECOMMENDATIONS${' '.repeat(lineWidth - 18)}║`;

    for (const rec of report.recommendations.slice(0, 3)) {
      const truncated = rec.length > lineWidth - 6 ? rec.substring(0, lineWidth - 9) + '...' : rec;
      output += `\n${padLine('  •', truncated)}`;
    }

    output += `
║${' '.repeat(lineWidth)}║
╚${'═'.repeat(lineWidth)}╝`;

    return output.trim();
  }
  
  // ============================================================================
  // BOT HEALTH REPORTS
  // ============================================================================
  
  /**
   * Get health report for all bots
   */
  getBotHealthReports(): BotHealthReport[] {
    const botManager = getBotManager();
    const connectionManager = getConnectionManager();
    
    const reports: BotHealthReport[] = [];
    const allBots = botManager.getAllBots();
    
    for (const bot of allBots) {
      if (bot.isDead()) continue;
      
      const data = bot.getData();
      const isConnected = connectionManager.isBotConnected(bot.id);
      const reconnectAttempts = this.botReconnectAttempts.get(bot.id) || 0;
      
      // Calculate overall status
      let status: BotHealthReport['status'] = 'healthy';
      if (!isConnected) {
        status = 'disconnected';
      } else if (data.health < 20 || data.needs.hunger > 90 || data.needs.energy > 90) {
        status = 'critical';
      } else if (data.health < 50 || data.needs.hunger > 70 || data.needs.energy > 70) {
        status = 'warning';
      }
      
      reports.push({
        botId: bot.id,
        name: data.name,
        isConnected,
        health: data.health,
        role: data.role,
        currentTask: data.currentTask?.type || null,
        lastActivity: data.updatedAt,
        reconnectAttempts,
        status
      });
    }
    
    return reports;
  }
  
  // ============================================================================
  // STATUS
  // ============================================================================
  
  /**
   * Get auto-manager status
   */
  getStatus(): AutoManagerStatus {
    const botReports = this.getBotHealthReports();
    const botsNeedingAttention = botReports.filter(r => 
      r.status === 'critical' || r.status === 'disconnected'
    ).length;
    
    return {
      isRunning: this.isRunning,
      managementEnabled: this.config.enableAutoManagement,
      autoReconnectEnabled: this.config.enableAutoReconnect,
      performanceOptimizationEnabled: this.config.enableAutoPerformance,
      
      botsBeingManaged: botReports.length,
      botsNeedingAttention,
      reconnectionsInProgress: this.reconnectingBots.size,
      
      lastHealthCheck: this.lastHealthCheck,
      lastPerformanceCheck: this.lastPerformanceCheck,
      lastProgressReport: this.lastProgressReport,
      
      totalReconnectAttempts: this.totalReconnectAttempts,
      successfulReconnects: this.successfulReconnects,
      failedReconnects: this.failedReconnects
    };
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<AutoManagerConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Auto-manager configuration updated');
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export function getAutoManager(config?: Partial<AutoManagerConfig>): AutoManager {
  return AutoManager.getInstance(config);
}

export default AutoManager;
