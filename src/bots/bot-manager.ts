/**
 * BlockLife AI - Bot Manager
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Manages all bot agents in the simulation.
 */

import { Bot, Position, ThreatLevel, Role, LifeStage } from '../types';
import { BotAgent, BotAgentOptions } from './bot-agent';
import { createLogger } from '../utils/logger';

const logger = createLogger('bots');

/**
 * Bot Manager - handles all bot agents
 */
export class BotManager {
  private bots: Map<string, BotAgent> = new Map();
  private lastUpdateTime: number = Date.now();

  constructor() {
    logger.info('Bot Manager initialized');
  }

  /**
   * Create and register a new bot
   */
  createBot(options: BotAgentOptions): BotAgent {
    const bot = new BotAgent(options);
    this.bots.set(bot.id, bot);
    logger.info(`Bot created: ${bot.name} (${bot.id})`);
    return bot;
  }

  /**
   * Register an existing bot agent
   */
  registerBot(bot: BotAgent): void {
    this.bots.set(bot.id, bot);
  }

  /**
   * Remove a bot
   */
  removeBot(botId: string): boolean {
    const bot = this.bots.get(botId);
    if (bot) {
      logger.info(`Bot removed: ${bot.name} (${botId})`);
      return this.bots.delete(botId);
    }
    return false;
  }

  /**
   * Get a bot by ID
   */
  getBot(botId: string): BotAgent | undefined {
    return this.bots.get(botId);
  }

  /**
   * Get all bots
   */
  getAllBots(): BotAgent[] {
    return Array.from(this.bots.values());
  }

  /**
   * Get all living bots
   */
  getLivingBots(): BotAgent[] {
    return this.getAllBots().filter(bot => !bot.isDead());
  }

  /**
   * Get bots by village
   */
  getBotsByVillage(villageId: string): BotAgent[] {
    return this.getAllBots().filter(bot => bot.getData().villageId === villageId);
  }

  /**
   * Get bots by role
   */
  getBotsByRole(role: Role): BotAgent[] {
    return this.getAllBots().filter(bot => bot.getRole() === role);
  }

  /**
   * Get total bot count
   */
  getBotCount(): number {
    return this.bots.size;
  }

  /**
   * Get living bot count
   */
  getLivingBotCount(): number {
    return this.getLivingBots().length;
  }

  /**
   * Get bots that need AI decisions
   */
  getBotsNeedingDecision(): BotAgent[] {
    return this.getLivingBots().filter(bot => bot.needsAiDecision());
  }

  /**
   * Get bots for routine update
   */
  getBotsForRoutineUpdate(): BotAgent[] {
    return this.getLivingBots();
  }

  /**
   * Get bots near a position
   */
  getBotsNearPosition(position: Position, radius: number): BotAgent[] {
    return this.getLivingBots().filter(bot => {
      const pos = bot.getPosition();
      const distance = Math.sqrt(
        Math.pow(pos.x - position.x, 2) +
        Math.pow(pos.y - position.y, 2) +
        Math.pow(pos.z - position.z, 2)
      );
      return distance <= radius;
    });
  }

  /**
   * Update all bots for routine processing
   */
  updateAllBots(deltaMs: number): void {
    const bots = this.getBotsForRoutineUpdate();
    
    for (const bot of bots) {
      // Update needs
      bot.updateNeeds(deltaMs);
      
      // Update current task
      bot.updateTask(deltaMs);
    }
    
    this.lastUpdateTime = Date.now();
  }

  /**
   * Set context for bots based on world state
   */
  updateBotContexts(
    getLocationTag: (pos: Position) => string,
    getThreatLevel: (pos: Position) => ThreatLevel,
    getResources: (villageId: string) => string[]
  ): void {
    for (const bot of this.getLivingBots()) {
      const pos = bot.getPosition();
      const data = bot.getData();
      
      bot.setContext(
        getLocationTag(pos),
        getThreatLevel(pos),
        getResources(data.villageId)
      );
    }
  }

  /**
   * Get role distribution statistics
   */
  getRoleDistribution(): Record<Role, number> {
    const distribution: Partial<Record<Role, number>> = {};
    
    for (const bot of this.getLivingBots()) {
      const role = bot.getRole();
      distribution[role] = (distribution[role] || 0) + 1;
    }
    
    // Ensure all roles are present
    const roles = Object.values(Role);
    for (const role of roles) {
      if (!(role in distribution)) {
        distribution[role] = 0;
      }
    }
    
    return distribution as Record<Role, number>;
  }

  /**
   * Get life stage distribution
   */
  getLifeStageDistribution(): Record<LifeStage, number> {
    const distribution: Partial<Record<LifeStage, number>> = {};
    
    for (const bot of this.getLivingBots()) {
      const stage = bot.getData().lifeStage;
      distribution[stage] = (distribution[stage] || 0) + 1;
    }
    
    // Ensure all stages are present
    const stages = Object.values(LifeStage);
    for (const stage of stages) {
      if (!(stage in distribution)) {
        distribution[stage] = 0;
      }
    }
    
    return distribution as Record<LifeStage, number>;
  }

  /**
   * Get bots with urgent needs (need > threshold)
   */
  getBotsWithUrgentNeeds(threshold: number = 70): BotAgent[] {
    return this.getLivingBots().filter(bot => {
      const needs = bot.getNeeds();
      return (
        needs.hunger > threshold ||
        needs.energy > threshold ||
        needs.safety > threshold ||
        needs.social > threshold ||
        needs.purpose > threshold
      );
    });
  }

  /**
   * Get bots in danger
   */
  getBotsInDanger(): BotAgent[] {
    return this.getLivingBots().filter(bot => bot.isInDanger());
  }

  /**
   * Serialize all bots for persistence
   */
  serializeAll(): Bot[] {
    return this.getAllBots().map(bot => bot.serialize());
  }

  /**
   * Load bots from serialized data
   */
  loadBots(botsData: Bot[]): void {
    this.bots.clear();
    
    for (const data of botsData) {
      const agent = BotAgent.deserialize(data);
      this.bots.set(agent.id, agent);
    }
    
    logger.info(`Loaded ${botsData.length} bots`);
  }

  /**
   * Clear all bots
   */
  clear(): void {
    this.bots.clear();
    logger.info('All bots cleared');
  }

  /**
   * Get summary statistics
   */
  getStats(): {
    total: number;
    living: number;
    dead: number;
    needingDecision: number;
    inDanger: number;
    idle: number;
    roleDistribution: Record<Role, number>;
  } {
    const all = this.getAllBots();
    const living = this.getLivingBots();
    
    return {
      total: all.length,
      living: living.length,
      dead: all.length - living.length,
      needingDecision: this.getBotsNeedingDecision().length,
      inDanger: this.getBotsInDanger().length,
      idle: living.filter(b => b.isIdle()).length,
      roleDistribution: this.getRoleDistribution()
    };
  }
}

// Singleton instance
let instance: BotManager | null = null;

/**
 * Get the bot manager singleton
 */
export function getBotManager(): BotManager {
  if (!instance) {
    instance = new BotManager();
  }
  return instance;
}

/**
 * Reset the bot manager singleton
 */
export function resetBotManager(): void {
  if (instance) {
    instance.clear();
  }
  instance = null;
}

export default BotManager;
