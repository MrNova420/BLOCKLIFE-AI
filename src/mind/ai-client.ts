/**
 * BlockLife AI - AI Client
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * LOCAL AI MODEL SUPPORT
 * Uses Ollama to run AI models locally on your machine.
 * You can choose from multiple models via the dashboard.
 * 
 * Available models (install via Ollama):
 * - tinyllama (fastest, ~637MB, recommended for most)
 * - phi (balanced, ~1.7GB)
 * - mistral (high quality, ~4GB)
 * - llama2 (good general, ~3.8GB)
 * - gemma:2b (Google's model, ~1.4GB)
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
import { getSystemStatus, SystemComponent, AIStatus } from '../utils/system-status';

const logger = createLogger('ai');

/**
 * AI Core Client interface
 */
export interface AiCoreClient {
  getBotBatchDecisions(request: AiBotBatchRequest): Promise<AiBotBatchResponse>;
  getCivilizationAdvice(context: AiCivContext): Promise<AiCivAdvice>;
  isAvailable(): boolean;
  getAverageLatency(): number;
  getProviderName(): string;
}

/**
 * Fallback decision maker when AI is unavailable
 * Uses intelligent rules based on bot needs, role, and situation
 */
export function getFallbackDecision(context: AiBotContext): BotIntent {
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
    if (context.resourceContext.includes('FOOD_STOCK_LOW')) {
      return 'TEND_FARM';
    }
    return 'EXPLORE_TERRAIN';
  }
  
  // P5: Idle
  return 'IDLE';
}

/**
 * Stub AI Client - uses rule-based fallbacks (no AI needed)
 */
export class StubAiClient implements AiCoreClient {
  private latencies: number[] = [];
  private available: boolean = true;
  private decisionCount: number = 0;

  async getBotBatchDecisions(request: AiBotBatchRequest): Promise<AiBotBatchResponse> {
    const startTime = Date.now();
    
    logger.debug(`Processing batch decision for ${request.bots.length} bots (rule-based)`);
    
    // Simulate some processing time
    await this.simulateDelay(50, 150);
    
    const decisions: AiBotDecision[] = request.bots.map(botContext => {
      const intent = getFallbackDecision(botContext);
      this.decisionCount++;
      
      return {
        id: botContext.id,
        intent,
        details: {
          source: 'rules',
          reason: this.getDecisionReason(botContext, intent)
        }
      };
    });
    
    const latency = Date.now() - startTime;
    this.recordLatency(latency);
    
    // Update system status
    const status = getSystemStatus();
    status.updateAIStatus({
      status: AIStatus.RULES_ONLY,
      provider: 'rules',
      model: 'built-in',
      decisionsThisSession: this.decisionCount,
      fallbackDecisions: this.decisionCount,
      averageResponseMs: this.getAverageLatency(),
      lastDecisionAt: Date.now(),
      isProcessing: false,
      queueSize: 0
    });
    
    return { decisions };
  }

  async getCivilizationAdvice(context: AiCivContext): Promise<AiCivAdvice> {
    await this.simulateDelay(50, 100);
    
    const priorities: string[] = [];
    const suggestions: string[] = [];
    const warnings: string[] = [];
    
    for (const village of context.villages) {
      if (village.prosperity < 30) {
        warnings.push(`${village.name} has low prosperity`);
        priorities.push(`Focus on improving ${village.name}`);
      }
      
      if (village.threats.length > 0) {
        warnings.push(`${village.name} faces threats`);
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
    
    return { priorities, suggestions, warnings };
  }

  isAvailable(): boolean {
    return this.available;
  }

  getAverageLatency(): number {
    if (this.latencies.length === 0) return 0;
    return Math.round(this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length);
  }

  getProviderName(): string {
    return 'rules';
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
      return `threat: ${context.nearbyThreatLevel}`;
    }
    if (context.needs.hunger > 70) return 'hungry';
    if (context.needs.energy > 70) return 'tired';
    if (context.needs.safety > 70) return 'unsafe';
    if (context.needs.social > 60) return 'lonely';
    return `role: ${context.role}`;
  }
}

/**
 * Local Ollama AI Client - connects to locally running Ollama
 * User selects model via dashboard, this client uses that model
 */
export class OllamaClient implements AiCoreClient {
  private config: AiConfig;
  private latencies: number[] = [];
  private available: boolean = false;
  private baseUrl: string;
  private model: string;
  private decisionCount: number = 0;
  private fallbackDecisions: number = 0;
  private lastCheckTime: number = 0;
  private checkInterval: number = 15000;

  constructor(config: AiConfig) {
    this.config = config;
    const host = config.ollama?.host || 'localhost';
    const port = config.ollama?.port || 11434;
    this.baseUrl = `http://${host}:${port}`;
    this.model = config.model || 'tinyllama';
    
    logger.info(`Ollama client: ${this.baseUrl}, model: ${this.model}`);
    this.checkAvailability();
  }

  private async checkAvailability(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastCheckTime < this.checkInterval && this.lastCheckTime > 0) {
      return this.available;
    }
    
    this.lastCheckTime = now;
    
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        this.available = false;
        return false;
      }
      
      const tags = await response.json() as { models?: Array<{ name: string }> };
      const modelInstalled = tags.models?.some(m => 
        m.name === this.model || m.name.startsWith(`${this.model}:`)
      );
      
      if (!modelInstalled) {
        logger.warn(`Model '${this.model}' not installed. Run: ollama pull ${this.model}`);
        this.available = false;
        return false;
      }
      
      this.available = true;
      
      const status = getSystemStatus();
      status.updateComponentStatus(
        SystemComponent.AI_MODEL,
        'ONLINE',
        `Ollama: ${this.model}`
      );
      
      return true;
      
    } catch (error) {
      this.available = false;
      return false;
    }
  }

  async getBotBatchDecisions(request: AiBotBatchRequest): Promise<AiBotBatchResponse> {
    const startTime = Date.now();
    const isOnline = await this.checkAvailability();
    
    if (!isOnline) {
      return this.getFallbackDecisions(request);
    }
    
    try {
      const prompt = this.buildPrompt(request.bots);
      const response = await this.generate(prompt, this.getSystemPrompt());
      const intents = this.parseIntents(response, request.bots.length);
      
      const decisions: AiBotDecision[] = request.bots.map((bot, i) => {
        this.decisionCount++;
        return {
          id: bot.id,
          intent: intents[i],
          details: { source: 'ollama', model: this.model }
        };
      });
      
      this.recordLatency(Date.now() - startTime);
      this.updateStatus();
      
      return { decisions };
      
    } catch (error) {
      logger.error(`Ollama error: ${error}`);
      this.available = false;
      return this.getFallbackDecisions(request);
    }
  }

  private getFallbackDecisions(request: AiBotBatchRequest): AiBotBatchResponse {
    const decisions: AiBotDecision[] = request.bots.map(botContext => {
      this.fallbackDecisions++;
      return {
        id: botContext.id,
        intent: getFallbackDecision(botContext),
        details: { source: 'fallback', reason: 'AI unavailable' }
      };
    });
    this.updateStatus();
    return { decisions };
  }

  async getCivilizationAdvice(context: AiCivContext): Promise<AiCivAdvice> {
    if (!(await this.checkAvailability())) {
      return this.getBasicAdvice(context);
    }
    
    try {
      const prompt = `Civilization advice needed:
Era: ${context.era}
Villages: ${context.villages.map(v => `${v.name}(pop:${v.population})`).join(', ')}
Resources: Food=${context.resources.food}, Wood=${context.resources.wood}

Respond with JSON: {"priorities":[],"suggestions":[],"warnings":[]}`;

      const response = await this.generate(prompt);
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          priorities: parsed.priorities || [],
          suggestions: parsed.suggestions || [],
          warnings: parsed.warnings || []
        };
      }
    } catch (error) {
      logger.debug(`Civ advice error: ${error}`);
    }
    
    return this.getBasicAdvice(context);
  }

  private getBasicAdvice(context: AiCivContext): AiCivAdvice {
    const priorities: string[] = [];
    const warnings: string[] = [];
    
    if (context.resources.food < 100) priorities.push('Increase food production');
    if (context.resources.wood < 50) priorities.push('Gather more wood');
    
    for (const village of context.villages) {
      if (village.prosperity < 30) warnings.push(`${village.name} needs help`);
    }
    
    if (priorities.length === 0) priorities.push('Continue operations');
    
    return { priorities, suggestions: ['Consider expansion'], warnings };
  }

  private async generate(prompt: string, system?: string): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.model,
      prompt,
      stream: false,
      options: { temperature: 0.7, num_predict: 256 }
    };
    if (system) body.system = system;

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeoutMs || 30000)
    });

    if (!response.ok) {
      throw new Error(`Ollama: ${response.status}`);
    }

    const data = await response.json() as { response?: string };
    return data.response || '';
  }

  private getSystemPrompt(): string {
    return `You are the AI for BlockLife Minecraft civilization.
Decide actions for bots based on their needs and roles.

Respond with ONLY intent names, one per line:
IDLE, SLEEP, EAT, TEND_FARM, HARVEST_CROPS, MINE_RESOURCES, CHOP_WOOD,
BUILD_STRUCTURE, CRAFT_ITEM, SOCIALIZE, VISIT_FAMILY, TRADE, PATROL_AREA,
DEFEND_LOCATION, FLEE_TO_SAFETY, EXPLORE_TERRAIN, RESEARCH_TECH

Priority: Safety > Hunger > Energy > Role duties > Social`;
  }

  private buildPrompt(bots: AiBotContext[]): string {
    const ctx = bots.map((b, i) => 
      `${i+1}. ${b.role} H:${b.needs.hunger} E:${b.needs.energy} Threat:${b.nearbyThreatLevel}`
    ).join('\n');
    return `Decide for ${bots.length} bots:\n${ctx}\n\nIntents:`;
  }

  private parseIntents(response: string, count: number): BotIntent[] {
    const valid: BotIntent[] = [
      'IDLE', 'SLEEP', 'EAT', 'TEND_FARM', 'HARVEST_CROPS', 'MINE_RESOURCES',
      'CHOP_WOOD', 'BUILD_STRUCTURE', 'CRAFT_ITEM', 'SOCIALIZE', 'VISIT_FAMILY',
      'ATTEND_GATHERING', 'TRADE', 'PATROL_AREA', 'DEFEND_LOCATION', 'FLEE_TO_SAFETY',
      'RAISE_ALARM', 'EXPLORE_TERRAIN', 'RESEARCH_TECH', 'TEACH_SKILL', 'LEAD_MEETING'
    ];
    
    const lines = response.trim().split('\n').map(l => l.trim().toUpperCase());
    return Array.from({ length: count }, (_, i) => {
      const line = lines[i] || '';
      return valid.find(v => line.includes(v)) || 'IDLE';
    });
  }

  private updateStatus(): void {
    const status = getSystemStatus();
    status.updateAIStatus({
      status: this.available ? AIStatus.FULL_AI : AIStatus.RULES_ONLY,
      provider: 'ollama',
      model: this.model,
      decisionsThisSession: this.decisionCount,
      fallbackDecisions: this.fallbackDecisions,
      averageResponseMs: this.getAverageLatency(),
      lastDecisionAt: Date.now(),
      isProcessing: false,
      queueSize: 0
    });
  }

  isAvailable(): boolean {
    return this.available;
  }

  getAverageLatency(): number {
    if (this.latencies.length === 0) return 0;
    return Math.round(this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length);
  }

  getProviderName(): string {
    return `ollama:${this.model}`;
  }

  private recordLatency(latency: number): void {
    this.latencies.push(latency);
    if (this.latencies.length > 50) this.latencies.shift();
  }

  /** Change the model */
  setModel(model: string): void {
    this.model = model;
    this.lastCheckTime = 0;
    this.checkAvailability();
    logger.info(`Model changed to: ${model}`);
  }

  getModel(): string {
    return this.model;
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

  generateKey(context: AiBotContext): string {
    const bucket = (n: number) => Math.floor(n / 25) * 25;
    return [context.role, bucket(context.needs.hunger), bucket(context.needs.safety), context.nearbyThreatLevel].join(':');
  }

  get(key: string): BotIntent | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.decision;
  }

  set(key: string, decision: BotIntent): void {
    this.cache.set(key, { decision, timestamp: Date.now() });
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// SINGLETON MANAGEMENT
// ============================================================================

let aiClient: AiCoreClient | null = null;
let decisionCache: DecisionCache | null = null;

/**
 * Initialize the AI client based on config
 */
export function initializeAiClient(config: AiConfig): AiCoreClient {
  logger.info(`Initializing AI: provider=${config.provider}, model=${config.model}`);
  
  if (config.provider === 'ollama' || config.provider === 'local') {
    aiClient = new OllamaClient(config);
  } else {
    // Default to stub/rules-based
    aiClient = new StubAiClient();
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
  decisionCache?.clear();
  decisionCache = null;
}

/**
 * Change the current AI model (for dashboard use)
 */
export function setAiModel(model: string): void {
  if (aiClient && aiClient instanceof OllamaClient) {
    aiClient.setModel(model);
  }
}

export default {
  initializeAiClient,
  getAiClient,
  getDecisionCache,
  resetAiClient,
  setAiModel,
  StubAiClient,
  OllamaClient,
  DecisionCache,
  getFallbackDecision
};
