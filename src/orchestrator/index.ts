/**
 * BlockLife AI - Orchestrator
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * The main loop and coordinator for the BlockLife simulation.
 */

import {
  AppConfig,
  OrchestratorStats,
  AiBotBatchRequest,
  TimeOfDay,
  ThreatLevel,
  Bot,
  Village,
  CivilizationState
} from '../types';
import { BotManager, getBotManager } from '../bots/bot-manager';
import { BotAgent } from '../bots/bot-agent';
import { SimEngine, getSimEngine, initializeSimEngine } from '../simulation/sim-engine';
import { AiCoreClient, getAiClient, initializeAiClient, getDecisionCache } from '../mind/ai-client';
import { StorageLayer, getStorage, initializeStorage } from '../persistence/storage';
import { getPerformanceMonitor } from '../utils/performance';
import { loadConfig, getConfig, ensureDataDirectories } from '../utils/config';
import { createLogger, configureLogger } from '../utils/logger';

const logger = createLogger('orchestrator');

/**
 * Orchestrator - the heart of BlockLife
 */
export class Orchestrator {
  private config: AppConfig;
  private botManager: BotManager;
  private simEngine: SimEngine;
  private aiClient: AiCoreClient;
  private storage: StorageLayer;
  private perfMonitor = getPerformanceMonitor();
  
  private running: boolean = false;
  private tickTimer: NodeJS.Timeout | null = null;
  private saveTimer: NodeJS.Timeout | null = null;
  private lastTickTime: number = Date.now();
  private tickCount: number = 0;
  private aiCallCount: number = 0;
  private lastAiCallTime: number = 0;
  
  private startTime: number = 0;

  constructor(configPath?: string) {
    // Load configuration
    this.config = loadConfig(configPath);
    
    // Configure logger
    configureLogger({
      level: this.config.logging.level,
      categories: this.config.logging.categories,
      file: this.config.logging.file
    });
    
    // Ensure data directories exist
    ensureDataDirectories();
    
    // Initialize components
    this.storage = initializeStorage(this.config.data);
    this.botManager = getBotManager();
    this.aiClient = initializeAiClient(this.config.ai);
    this.simEngine = getSimEngine();
    
    logger.info('Orchestrator initialized');
    this.logConfig();
  }

  /**
   * Log current configuration
   */
  private logConfig(): void {
    logger.info('Configuration:', {
      performanceMode: this.config.simulation.performanceMode,
      maxBots: this.config.simulation.maxBots,
      tickRateMs: this.config.simulation.tickRateMs,
      aiEnabled: this.config.simulation.aiEnabled
    });
  }

  /**
   * Start the orchestrator
   */
  async start(): Promise<void> {
    if (this.running) {
      logger.warn('Orchestrator already running');
      return;
    }

    logger.info('Starting BlockLife...');
    logger.info('Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill');
    
    this.startTime = Date.now();
    this.running = true;

    // Try to load existing state
    await this.loadState();

    // If no villages exist, create initial village with bots
    if (this.simEngine.getAllVillages().length === 0) {
      logger.info('No existing data found, creating initial civilization...');
      await this.createInitialCivilization();
    }

    // Start main tick loop
    this.startTickLoop();

    // Start autosave if enabled
    if (this.config.simulation.autoSave) {
      this.startAutoSave();
    }

    logger.info('BlockLife is now running!');
    this.printStatus();
  }

  /**
   * Stop the orchestrator
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    logger.info('Stopping BlockLife...');
    this.running = false;

    // Stop timers
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }

    // Final save
    await this.saveState();

    logger.info('BlockLife stopped');
  }

  /**
   * Check if orchestrator is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Create initial civilization
   */
  private async createInitialCivilization(): Promise<void> {
    // Create first village at origin
    const village = this.simEngine.createVillage(
      { x: 0, y: 64, z: 0 },
      []
    );

    // Create initial bots
    const initialBotCount = Math.min(10, this.config.simulation.maxBots);
    const founders: string[] = [];

    for (let i = 0; i < initialBotCount; i++) {
      const bot = this.botManager.createBot({
        villageId: village.id,
        position: {
          x: Math.random() * 20 - 10,
          y: 64,
          z: Math.random() * 20 - 10
        }
      });
      founders.push(bot.id);
      this.simEngine.addBotToVillage(bot.id, village.id);
    }

    // Update village founders
    village.founderIds = founders;
    village.memberIds = founders;
    village.leaderId = founders[0];

    // Assign initial roles
    this.simEngine.assignRoles(village.id);

    // Record births
    for (let i = 0; i < initialBotCount; i++) {
      this.simEngine.recordBirth();
    }

    logger.info(`Created initial civilization: ${village.name} with ${initialBotCount} bots`);
  }

  /**
   * Start the main tick loop
   */
  private startTickLoop(): void {
    const tickRate = this.config.simulation.tickRateMs;
    
    this.tickTimer = setInterval(() => {
      this.tick();
    }, tickRate);
    
    logger.debug(`Tick loop started at ${tickRate}ms interval`);
  }

  /**
   * Start autosave timer
   */
  private startAutoSave(): void {
    const interval = this.config.simulation.saveIntervalMs;
    
    this.saveTimer = setInterval(async () => {
      await this.saveState();
    }, interval);
    
    logger.debug(`Autosave started at ${interval}ms interval`);
  }

  /**
   * Main tick function
   */
  private tick(): void {
    const tickStart = Date.now();
    const deltaMs = tickStart - this.lastTickTime;
    this.lastTickTime = tickStart;
    this.tickCount++;

    try {
      // 1. Update bot needs and states
      this.botManager.updateAllBots(deltaMs);

      // 2. Update bot contexts
      this.botManager.updateBotContexts(
        (pos) => this.simEngine.getLocationTag(pos),
        (pos) => this.simEngine.getThreatLevel(pos),
        (villageId) => this.simEngine.getResourceContext(villageId)
      );

      // 3. Run simulation tick
      this.simEngine.tick(deltaMs);

      // 4. Process AI decisions (if enabled and due)
      if (this.config.simulation.aiEnabled) {
        this.processAiDecisions();
      }

      // 5. Record performance
      const tickDuration = Date.now() - tickStart;
      this.perfMonitor.recordTick(tickDuration);
      this.perfMonitor.setActiveBots(this.botManager.getLivingBotCount());

      // 6. Auto-adjust performance if needed
      if (this.config.simulation.performanceMode === 'AUTO') {
        this.perfMonitor.autoAdjust();
      }

    } catch (error) {
      logger.error('Error in tick', error);
    }
  }

  /**
   * Process AI decisions for bots that need them
   */
  private async processAiDecisions(): Promise<void> {
    const now = Date.now();
    const minInterval = this.config.ai.decisionIntervalMs;
    
    // Rate limit AI calls
    if (now - this.lastAiCallTime < minInterval / 2) {
      return;
    }

    const botsNeedingDecision = this.botManager.getBotsNeedingDecision();
    
    if (botsNeedingDecision.length === 0) {
      return;
    }

    // Batch bots for AI
    const batchSize = Math.min(
      botsNeedingDecision.length,
      this.config.ai.maxBatchSize
    );
    
    if (batchSize < this.config.ai.minBatchSize && botsNeedingDecision.length < this.config.ai.minBatchSize) {
      // Not enough bots for a batch, use cache or fallback
      return;
    }

    const batch = botsNeedingDecision.slice(0, batchSize);
    const contexts = batch.map(bot => bot.buildAiContext());

    // Check cache first
    const cache = getDecisionCache();
    const uncached: typeof contexts = [];
    const cachedDecisions: Map<string, string> = new Map();

    for (const ctx of contexts) {
      const key = cache.generateKey(ctx);
      const cached = cache.get(key);
      if (cached) {
        cachedDecisions.set(ctx.id, cached);
      } else {
        uncached.push(ctx);
      }
    }

    // Apply cached decisions
    for (const [botId, intent] of cachedDecisions) {
      const bot = this.botManager.getBot(botId);
      if (bot) {
        bot.applyDecision({ id: botId, intent: intent as any });
      }
    }

    // Get AI decisions for uncached
    if (uncached.length >= this.config.ai.minBatchSize) {
      try {
        const request: AiBotBatchRequest = {
          mode: 'BOT_BATCH_DECISION',
          world: {
            timeOfDay: this.getCurrentTimeOfDay(),
            era: this.simEngine.getState().era,
            globalThreatLevel: ThreatLevel.LOW // TODO: Calculate actual
          },
          bots: uncached
        };

        const startTime = Date.now();
        const response = await this.aiClient.getBotBatchDecisions(request);
        const latency = Date.now() - startTime;
        
        this.perfMonitor.recordAiLatency(latency);
        this.aiCallCount++;
        this.lastAiCallTime = now;

        // Apply decisions and cache them
        for (const decision of response.decisions) {
          const bot = this.botManager.getBot(decision.id);
          if (bot) {
            bot.applyDecision(decision);
            
            // Cache the decision
            const ctx = uncached.find(c => c.id === decision.id);
            if (ctx) {
              const key = cache.generateKey(ctx);
              cache.set(key, decision.intent);
            }
          }
        }

      } catch (error) {
        logger.error('AI decision error', error);
        // Apply fallback decisions
        for (const ctx of uncached) {
          const bot = this.botManager.getBot(ctx.id);
          if (bot) {
            bot.applyDecision({
              id: ctx.id,
              intent: 'IDLE',
              details: { fallback: true }
            });
          }
        }
      }
    }
  }

  /**
   * Get current time of day (simplified)
   */
  private getCurrentTimeOfDay(): TimeOfDay {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return TimeOfDay.DAY;
    if (hour >= 12 && hour < 18) return TimeOfDay.DAY;
    if (hour >= 18 && hour < 21) return TimeOfDay.DUSK;
    if (hour >= 21 || hour < 5) return TimeOfDay.NIGHT;
    return TimeOfDay.DAWN;
  }

  /**
   * Save current state
   */
  async saveState(): Promise<void> {
    try {
      // Save bots
      const bots = this.botManager.serializeAll();
      await this.storage.saveBots(bots);

      // Save villages
      const villages = this.simEngine.getAllVillages();
      await this.storage.saveVillages(villages);

      // Save civilization state
      const civState = this.simEngine.serialize();
      await this.storage.saveCivState(civState);

      logger.debug(`State saved: ${bots.length} bots, ${villages.length} villages`);
    } catch (error) {
      logger.error('Failed to save state', error);
    }
  }

  /**
   * Load saved state
   */
  async loadState(): Promise<boolean> {
    try {
      // Load civilization state
      const civState = await this.storage.loadCivState();
      if (civState) {
        initializeSimEngine(civState);
        this.simEngine = getSimEngine();
      }

      // Load bots
      const bots = await this.storage.loadAllBots();
      if (bots.length > 0) {
        this.botManager.loadBots(bots);
      }

      if (civState && bots.length > 0) {
        logger.info(`State loaded: ${bots.length} bots, ${civState.villages.length} villages`);
        return true;
      }
    } catch (error) {
      logger.error('Failed to load state', error);
    }
    return false;
  }

  /**
   * Create a snapshot
   */
  async createSnapshot(name?: string): Promise<string> {
    await this.saveState();
    return await this.storage.createSnapshot(name);
  }

  /**
   * Load a snapshot
   */
  async loadSnapshot(name: string): Promise<boolean> {
    const success = await this.storage.loadSnapshot(name);
    if (success) {
      await this.loadState();
    }
    return success;
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): OrchestratorStats {
    const metrics = this.perfMonitor.getMetrics();
    
    return {
      tickRate: this.config.simulation.tickRateMs,
      lastTickDurationMs: metrics.tickDurationMs,
      activeBots: this.botManager.getLivingBotCount(),
      queuedAiRequests: this.botManager.getBotsNeedingDecision().length,
      avgAiLatencyMs: this.aiClient.getAverageLatency(),
      cpuLoadEstimate: metrics.cpuUsage,
      memoryUsageMb: metrics.memoryUsageMb,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Print current status
   */
  printStatus(): void {
    const stats = this.getStats();
    const civState = this.simEngine.getState();
    const botStats = this.botManager.getStats();

    console.log('\n========================================');
    console.log('         BLOCKLIFE STATUS');
    console.log('========================================');
    console.log(`Uptime: ${Math.floor(stats.uptime / 60000)}m ${Math.floor((stats.uptime % 60000) / 1000)}s`);
    console.log(`Tick: ${this.tickCount} | AI Calls: ${this.aiCallCount}`);
    console.log('----------------------------------------');
    console.log(`Era: ${civState.era}`);
    console.log(`Villages: ${civState.villages.length}`);
    for (const v of civState.villages) {
      console.log(`  - ${v.name}: ${v.memberIds.length} bots, ${v.techAge}, prosperity ${v.prosperity}`);
    }
    console.log('----------------------------------------');
    console.log(`Bots: ${botStats.living} living, ${botStats.dead} dead`);
    console.log(`  - Idle: ${botStats.idle}`);
    console.log(`  - Needing decision: ${botStats.needingDecision}`);
    console.log(`  - In danger: ${botStats.inDanger}`);
    console.log('----------------------------------------');
    console.log(`Performance: ${this.perfMonitor.getSummary()}`);
    console.log('========================================\n');
  }
}

// Export singleton management
let orchestratorInstance: Orchestrator | null = null;

/**
 * Get or create the orchestrator singleton
 */
export function getOrchestrator(configPath?: string): Orchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new Orchestrator(configPath);
  }
  return orchestratorInstance;
}

/**
 * Reset the orchestrator singleton
 */
export function resetOrchestrator(): void {
  if (orchestratorInstance) {
    orchestratorInstance.stop();
  }
  orchestratorInstance = null;
}

export default Orchestrator;
