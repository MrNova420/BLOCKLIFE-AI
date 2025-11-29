/**
 * BlockLife AI - AI Client
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Interface to the AI brain service for bot decisions.
 */

import {
  AiBotBatchRequest,
  AiBotBatchResponse,
  AiBotContext,
  AiBotDecision,
  AiCivContext,
  AiCivAdvice,
  BotIntent,
  Role,
  ThreatLevel,
  AiConfig
} from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('ai');

/**
 * AI Core Client interface
 */
export interface AiCoreClient {
  /**
   * Get batch decisions for multiple bots
   */
  getBotBatchDecisions(request: AiBotBatchRequest): Promise<AiBotBatchResponse>;
  
  /**
   * Get civilization-level advice
   */
  getCivilizationAdvice(context: AiCivContext): Promise<AiCivAdvice>;
  
  /**
   * Check if AI is available
   */
  isAvailable(): boolean;
  
  /**
   * Get average latency in ms
   */
  getAverageLatency(): number;
}

/**
 * Fallback decision maker when AI is unavailable
 */
function getFallbackDecision(context: AiBotContext): BotIntent {
  // P0: Survival - immediate threats
  if (context.nearbyThreatLevel === ThreatLevel.HIGH) {
    return 'FLEE_TO_SAFETY';
  }
  
  if (context.needs.safety > 85) {
    return 'FLEE_TO_SAFETY';
  }
  
  if (context.needs.hunger > 85) {
    return 'EAT';
  }
  
  // P1: Critical needs
  if (context.needs.hunger > 70) {
    return 'EAT';
  }
  
  if (context.needs.energy > 80) {
    return 'SLEEP';
  }
  
  if (context.nearbyThreatLevel === ThreatLevel.MEDIUM) {
    if (context.role === Role.GUARD) {
      return 'DEFEND_LOCATION';
    }
    return 'FLEE_TO_SAFETY';
  }
  
  // P2: Role-based defaults
  switch (context.role) {
    case Role.FARMER:
      if (context.resourceContext.includes('CROPS_READY')) {
        return 'HARVEST_CROPS';
      }
      return 'TEND_FARM';
      
    case Role.MINER:
      return 'MINE_RESOURCES';
      
    case Role.LUMBERJACK:
      return 'CHOP_WOOD';
      
    case Role.BUILDER:
      return 'BUILD_STRUCTURE';
      
    case Role.GUARD:
      return 'PATROL_AREA';
      
    case Role.HUNTER:
      return 'EXPLORE_TERRAIN';
      
    case Role.SCHOLAR:
      return 'RESEARCH_TECH';
      
    case Role.TRADER:
      return 'TRADE';
      
    case Role.CARETAKER:
      return 'SOCIALIZE';
      
    default:
      break;
  }
  
  // P3: Social needs
  if (context.needs.social > 60) {
    return 'SOCIALIZE';
  }
  
  // P4: Purpose
  if (context.needs.purpose > 50) {
    // Find something to do based on personality
    if (context.resourceContext.includes('FOOD_STOCK_LOW')) {
      return 'TEND_FARM';
    }
    return 'EXPLORE_TERRAIN';
  }
  
  // P5: Idle
  return 'IDLE';
}

/**
 * Stub AI Client - uses rule-based fallbacks
 */
export class StubAiClient implements AiCoreClient {
  private latencies: number[] = [];
  private available: boolean = true;

  async getBotBatchDecisions(request: AiBotBatchRequest): Promise<AiBotBatchResponse> {
    const startTime = Date.now();
    
    logger.debug(`Processing batch decision for ${request.bots.length} bots`);
    
    // Simulate some processing time
    await this.simulateDelay(50, 200);
    
    const decisions: AiBotDecision[] = request.bots.map(botContext => {
      const intent = getFallbackDecision(botContext);
      
      return {
        id: botContext.id,
        intent,
        details: {
          source: 'fallback',
          reason: this.getDecisionReason(botContext, intent)
        }
      };
    });
    
    const latency = Date.now() - startTime;
    this.recordLatency(latency);
    
    logger.debug(`Batch decision completed in ${latency}ms`);
    
    return { decisions };
  }

  async getCivilizationAdvice(context: AiCivContext): Promise<AiCivAdvice> {
    const startTime = Date.now();
    
    logger.debug('Processing civilization advice request');
    
    await this.simulateDelay(100, 300);
    
    const priorities: string[] = [];
    const suggestions: string[] = [];
    const warnings: string[] = [];
    
    // Analyze context and generate advice
    for (const village of context.villages) {
      if (village.prosperity < 30) {
        warnings.push(`${village.name} has low prosperity`);
        priorities.push(`Focus on improving ${village.name}`);
      }
      
      if (village.threats.length > 0) {
        warnings.push(`${village.name} faces threats: ${village.threats.join(', ')}`);
        priorities.push(`Defend ${village.name}`);
      }
    }
    
    if (context.resources.food < 100) {
      priorities.push('Increase food production');
      suggestions.push('Assign more farmers');
    }
    
    if (priorities.length === 0) {
      priorities.push('Continue current operations');
      suggestions.push('Consider expansion');
    }
    
    const latency = Date.now() - startTime;
    this.recordLatency(latency);
    
    return { priorities, suggestions, warnings };
  }

  isAvailable(): boolean {
    return this.available;
  }

  getAverageLatency(): number {
    if (this.latencies.length === 0) return 0;
    return this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
  }

  private async simulateDelay(min: number, max: number): Promise<void> {
    const delay = min + Math.random() * (max - min);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private recordLatency(latency: number): void {
    this.latencies.push(latency);
    if (this.latencies.length > 50) {
      this.latencies.shift();
    }
  }

  private getDecisionReason(context: AiBotContext, intent: BotIntent): string {
    if (context.nearbyThreatLevel !== ThreatLevel.NONE) {
      return `threat level: ${context.nearbyThreatLevel}`;
    }
    
    if (context.needs.hunger > 70) {
      return 'high hunger';
    }
    
    if (context.needs.energy > 70) {
      return 'low energy';
    }
    
    if (context.needs.safety > 70) {
      return 'safety concern';
    }
    
    if (context.needs.social > 60) {
      return 'social need';
    }
    
    return `role: ${context.role}`;
  }
}

/**
 * Decision cache for reducing AI calls
 */
export class DecisionCache {
  private cache: Map<string, { decision: BotIntent; timestamp: number }> = new Map();
  private ttlMs: number;

  constructor(ttlMs: number = 30000) {
    this.ttlMs = ttlMs;
  }

  /**
   * Generate a cache key from bot context
   */
  generateKey(context: AiBotContext): string {
    // Create a key from the most important factors
    const needsBucket = (n: number) => Math.floor(n / 25) * 25; // Bucket by 25
    
    return [
      context.role,
      needsBucket(context.needs.hunger),
      needsBucket(context.needs.safety),
      context.locationTag,
      context.nearbyThreatLevel
    ].join(':');
  }

  /**
   * Get cached decision if available
   */
  get(key: string): BotIntent | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) return undefined;
    
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.decision;
  }

  /**
   * Cache a decision
   */
  set(key: string, decision: BotIntent): void {
    this.cache.set(key, {
      decision,
      timestamp: Date.now()
    });
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Singleton instance
let aiClient: AiCoreClient | null = null;
let decisionCache: DecisionCache | null = null;

/**
 * Initialize the AI client
 */
export function initializeAiClient(config: AiConfig): AiCoreClient {
  logger.info(`Initializing AI client with provider: ${config.provider}`);
  
  switch (config.provider) {
    case 'stub':
    default:
      aiClient = new StubAiClient();
      break;
  }
  
  decisionCache = new DecisionCache(config.decisionIntervalMs / 2);
  
  return aiClient;
}

/**
 * Get the AI client singleton
 */
export function getAiClient(): AiCoreClient {
  if (!aiClient) {
    aiClient = new StubAiClient();
  }
  return aiClient;
}

/**
 * Get the decision cache singleton
 */
export function getDecisionCache(): DecisionCache {
  if (!decisionCache) {
    decisionCache = new DecisionCache();
  }
  return decisionCache;
}

/**
 * Reset AI client
 */
export function resetAiClient(): void {
  aiClient = null;
  if (decisionCache) {
    decisionCache.clear();
  }
  decisionCache = null;
}

export default {
  initializeAiClient,
  getAiClient,
  getDecisionCache,
  resetAiClient,
  StubAiClient,
  DecisionCache,
  getFallbackDecision
};
