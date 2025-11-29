/**
 * BlockLife AI - AI Providers
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Multiple AI provider implementations for bot decision-making.
 * Supports local models (llama.cpp), Ollama, OpenAI, and custom APIs.
 */

import {
  AiBotBatchRequest,
  AiBotBatchResponse,
  AiBotContext,
  AiBotDecision,
  AiCivContext,
  AiCivAdvice,
  BotIntent,
  AiConfig
} from '../types';
import { AiCoreClient } from './ai-client';
import { createLogger } from '../utils/logger';

const logger = createLogger('ai-provider');

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

/**
 * System prompt for bot decision-making
 */
const BOT_SYSTEM_PROMPT = `You are the AI brain for BlockLife, a Minecraft civilization simulation.
You make decisions for individual villager bots based on their current state.

Each bot has:
- A role (FARMER, MINER, BUILDER, GUARD, etc.)
- Needs (hunger, energy, safety, social, purpose) from 0-100 (higher = more urgent)
- A mood (HAPPY, NEUTRAL, STRESSED, AFRAID, ANGRY)
- Current location and threat level

Respond with ONLY the intent name from this list:
IDLE, SLEEP, EAT, TEND_FARM, HARVEST_CROPS, MINE_RESOURCES, CHOP_WOOD,
BUILD_STRUCTURE, CRAFT_ITEM, SOCIALIZE, VISIT_FAMILY, ATTEND_GATHERING,
TRADE, PATROL_AREA, DEFEND_LOCATION, FLEE_TO_SAFETY, RAISE_ALARM,
EXPLORE_TERRAIN, RESEARCH_TECH, TEACH_SKILL, LEAD_MEETING

Decision priority:
1. SURVIVAL: If high threat or danger, prioritize safety (FLEE_TO_SAFETY, DEFEND_LOCATION)
2. CRITICAL NEEDS: If hunger > 80, choose EAT. If energy > 80, choose SLEEP.
3. ROLE DUTIES: Match the bot's assigned role
4. SOCIAL: If social need > 60, consider SOCIALIZE or VISIT_FAMILY
5. PURPOSE: Keep bots productive when needs are met`;

/**
 * Build context prompt for a single bot
 */
function buildBotPrompt(ctx: AiBotContext): string {
  return `Bot ${ctx.id}:
- Role: ${ctx.role}
- Life Stage: ${ctx.lifeStage}
- Mood: ${ctx.mood}
- Location: ${ctx.locationTag}
- Threat Level: ${ctx.nearbyThreatLevel}
- Needs: Hunger=${ctx.needs.hunger}, Energy=${ctx.needs.energy}, Safety=${ctx.needs.safety}, Social=${ctx.needs.social}, Purpose=${ctx.needs.purpose}
- Resources: ${ctx.resourceContext.join(', ') || 'none'}
- Recent Events: ${ctx.recentEvents.join('; ') || 'none'}
- Current Task: ${ctx.currentTaskType || 'none'}

What should this bot do? Respond with only the intent name.`;
}

/**
 * Build batch prompt for multiple bots
 */
function buildBatchPrompt(bots: AiBotContext[]): string {
  const botContexts = bots.map((ctx, i) => `[Bot ${i + 1}] Role: ${ctx.role}, Needs: H${ctx.needs.hunger}/E${ctx.needs.energy}/S${ctx.needs.safety}, Threat: ${ctx.nearbyThreatLevel}, Mood: ${ctx.mood}`).join('\n');
  
  return `Decide actions for these ${bots.length} bots. Respond with one intent per line, in order.

${botContexts}

Respond with ${bots.length} intents, one per line (e.g., "TEND_FARM\\nMINE_RESOURCES\\nPATROL_AREA"):`;
}

/**
 * Parse AI response into intents
 */
function parseIntents(response: string, count: number): BotIntent[] {
  const validIntents: BotIntent[] = [
    'IDLE', 'SLEEP', 'EAT', 'TEND_FARM', 'HARVEST_CROPS', 'MINE_RESOURCES',
    'CHOP_WOOD', 'BUILD_STRUCTURE', 'CRAFT_ITEM', 'SOCIALIZE', 'VISIT_FAMILY',
    'ATTEND_GATHERING', 'TRADE', 'PATROL_AREA', 'DEFEND_LOCATION', 'FLEE_TO_SAFETY',
    'RAISE_ALARM', 'EXPLORE_TERRAIN', 'RESEARCH_TECH', 'TEACH_SKILL', 'LEAD_MEETING'
  ];
  
  const lines = response.trim().split('\n').map(l => l.trim().toUpperCase());
  const intents: BotIntent[] = [];
  
  for (let i = 0; i < count; i++) {
    const line = lines[i] || '';
    // Find matching intent
    const intent = validIntents.find(v => line.includes(v)) || 'IDLE';
    intents.push(intent);
  }
  
  return intents;
}

// ============================================================================
// OLLAMA PROVIDER
// ============================================================================

/**
 * Ollama AI provider - connects to local Ollama instance
 */
export class OllamaAiClient implements AiCoreClient {
  private config: AiConfig;
  private latencies: number[] = [];
  private available: boolean = true;
  private baseUrl: string;

  constructor(config: AiConfig) {
    this.config = config;
    const host = config.ollama?.host || 'localhost';
    const port = config.ollama?.port || 11434;
    this.baseUrl = `http://${host}:${port}`;
    
    logger.info(`Ollama client configured: ${this.baseUrl}, model: ${config.model}`);
  }

  async getBotBatchDecisions(request: AiBotBatchRequest): Promise<AiBotBatchResponse> {
    const startTime = Date.now();
    
    try {
      const prompt = buildBatchPrompt(request.bots);
      const response = await this.generate(prompt, BOT_SYSTEM_PROMPT);
      const intents = parseIntents(response, request.bots.length);
      
      const decisions: AiBotDecision[] = request.bots.map((bot, i) => ({
        id: bot.id,
        intent: intents[i],
        details: { source: 'ollama', model: this.config.model }
      }));
      
      this.recordLatency(Date.now() - startTime);
      return { decisions };
      
    } catch (error) {
      logger.error(`Ollama error: ${error}`);
      this.available = false;
      throw error;
    }
  }

  async getCivilizationAdvice(context: AiCivContext): Promise<AiCivAdvice> {
    const prompt = `Analyze this civilization state and provide advice:
Era: ${context.era}
Villages: ${context.villages.map(v => `${v.name} (pop: ${v.population}, prosperity: ${v.prosperity})`).join(', ')}
Recent Events: ${context.recentGlobalEvents.join('; ')}
Resources: Food=${context.resources.food}, Wood=${context.resources.wood}, Stone=${context.resources.stone}

Provide 3 priorities, 3 suggestions, and any warnings. Format as JSON:
{"priorities": [...], "suggestions": [...], "warnings": [...]}`;

    try {
      const response = await this.generate(prompt);
      const parsed = JSON.parse(response);
      return {
        priorities: parsed.priorities || [],
        suggestions: parsed.suggestions || [],
        warnings: parsed.warnings || []
      };
    } catch (error) {
      logger.error(`Ollama civ advice error: ${error}`);
      return { priorities: [], suggestions: [], warnings: ['AI unavailable'] };
    }
  }

  private async generate(prompt: string, system?: string): Promise<string> {
    const body: any = {
      model: this.config.model,
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 256
      }
    };
    
    if (system) {
      body.system = system;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { response?: string };
      this.available = true;
      return data.response || '';
      
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  getAverageLatency(): number {
    if (this.latencies.length === 0) return 0;
    return this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
  }

  private recordLatency(latency: number): void {
    this.latencies.push(latency);
    if (this.latencies.length > 50) this.latencies.shift();
  }
}

// ============================================================================
// OPENAI PROVIDER
// ============================================================================

/**
 * OpenAI AI provider - connects to OpenAI API or compatible endpoints
 */
export class OpenAiClient implements AiCoreClient {
  private config: AiConfig;
  private latencies: number[] = [];
  private available: boolean = true;
  private baseUrl: string;
  private apiKey: string;

  constructor(config: AiConfig) {
    this.config = config;
    this.baseUrl = config.openai?.baseUrl || 'https://api.openai.com/v1';
    this.apiKey = config.openai?.apiKey || '';
    
    if (!this.apiKey) {
      logger.warn('OpenAI API key not configured');
    }
    
    logger.info(`OpenAI client configured: ${this.baseUrl}, model: ${config.model}`);
  }

  async getBotBatchDecisions(request: AiBotBatchRequest): Promise<AiBotBatchResponse> {
    const startTime = Date.now();
    
    try {
      const prompt = buildBatchPrompt(request.bots);
      const response = await this.chat([
        { role: 'system', content: BOT_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ]);
      
      const intents = parseIntents(response, request.bots.length);
      
      const decisions: AiBotDecision[] = request.bots.map((bot, i) => ({
        id: bot.id,
        intent: intents[i],
        details: { source: 'openai', model: this.config.model }
      }));
      
      this.recordLatency(Date.now() - startTime);
      return { decisions };
      
    } catch (error) {
      logger.error(`OpenAI error: ${error}`);
      this.available = false;
      throw error;
    }
  }

  async getCivilizationAdvice(context: AiCivContext): Promise<AiCivAdvice> {
    const prompt = `Analyze this civilization and provide strategic advice:
Era: ${context.era}
Villages: ${JSON.stringify(context.villages)}
Resources: ${JSON.stringify(context.resources)}
Recent Events: ${context.recentGlobalEvents.join('; ')}

Respond with JSON: {"priorities": [], "suggestions": [], "warnings": []}`;

    try {
      const response = await this.chat([
        { role: 'system', content: 'You are a civilization advisor. Respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ]);
      
      const parsed = JSON.parse(response);
      return {
        priorities: parsed.priorities || [],
        suggestions: parsed.suggestions || [],
        warnings: parsed.warnings || []
      };
    } catch (error) {
      logger.error(`OpenAI civ advice error: ${error}`);
      return { priorities: [], suggestions: [], warnings: ['AI unavailable'] };
    }
  }

  private async chat(messages: Array<{role: string, content: string}>): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...(this.config.openai?.organization && {
            'OpenAI-Organization': this.config.openai.organization
          })
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: 256,
          temperature: 0.7
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI error: ${response.status} - ${error}`);
      }

      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      this.available = true;
      return data.choices?.[0]?.message?.content || '';
      
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  getAverageLatency(): number {
    if (this.latencies.length === 0) return 0;
    return this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
  }

  private recordLatency(latency: number): void {
    this.latencies.push(latency);
    if (this.latencies.length > 50) this.latencies.shift();
  }
}

// ============================================================================
// REMOTE/CUSTOM API PROVIDER
// ============================================================================

/**
 * Generic remote API provider - for custom AI endpoints
 */
export class RemoteAiClient implements AiCoreClient {
  private config: AiConfig;
  private latencies: number[] = [];
  private available: boolean = true;

  constructor(config: AiConfig) {
    this.config = config;
    logger.info(`Remote AI client configured: ${config.remote?.apiUrl}, model: ${config.model}`);
  }

  async getBotBatchDecisions(request: AiBotBatchRequest): Promise<AiBotBatchResponse> {
    const startTime = Date.now();
    
    if (!this.config.remote?.apiUrl) {
      throw new Error('Remote API URL not configured');
    }

    try {
      const prompt = buildBatchPrompt(request.bots);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

      const response = await fetch(this.config.remote.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.remote.apiKey && {
            'Authorization': `Bearer ${this.config.remote.apiKey}`
          }),
          ...this.config.remote.headers
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          system: BOT_SYSTEM_PROMPT,
          max_tokens: 256
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Remote API error: ${response.status}`);
      }

      const data = await response.json() as { response?: string; text?: string; output?: string; choices?: Array<{ text?: string }> };
      const text = data.response || data.text || data.output || data.choices?.[0]?.text || '';
      const intents = parseIntents(text, request.bots.length);
      
      const decisions: AiBotDecision[] = request.bots.map((bot, i) => ({
        id: bot.id,
        intent: intents[i],
        details: { source: 'remote', model: this.config.model }
      }));
      
      this.recordLatency(Date.now() - startTime);
      this.available = true;
      return { decisions };
      
    } catch (error) {
      logger.error(`Remote API error: ${error}`);
      this.available = false;
      throw error;
    }
  }

  async getCivilizationAdvice(context: AiCivContext): Promise<AiCivAdvice> {
    // Simplified implementation
    return {
      priorities: ['Continue development'],
      suggestions: ['Expand villages'],
      warnings: []
    };
  }

  isAvailable(): boolean {
    return this.available;
  }

  getAverageLatency(): number {
    if (this.latencies.length === 0) return 0;
    return this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
  }

  private recordLatency(latency: number): void {
    this.latencies.push(latency);
    if (this.latencies.length > 50) this.latencies.shift();
  }
}

// ============================================================================
// LOCAL MODEL PROVIDER (llama.cpp bindings)
// ============================================================================

/**
 * Local model provider using llama.cpp via node-llama-cpp
 * Requires: npm install node-llama-cpp
 */
export class LocalModelClient implements AiCoreClient {
  private config: AiConfig;
  private latencies: number[] = [];
  private available: boolean = false;
  private model: any = null;
  private context: any = null;

  constructor(config: AiConfig) {
    this.config = config;
    logger.info(`Local model client configured: ${config.local?.modelPath || 'not set'}`);
  }

  /**
   * Initialize the local model
   */
  async initialize(): Promise<void> {
    if (!this.config.local?.modelPath) {
      logger.warn('Local model path not configured');
      return;
    }

    try {
      // Dynamic import for node-llama-cpp
      const { LlamaModel, LlamaContext, LlamaChatSession } = await import('node-llama-cpp');
      
      logger.info(`Loading local model from: ${this.config.local.modelPath}`);
      
      this.model = new LlamaModel({
        modelPath: this.config.local.modelPath,
        gpuLayers: this.config.local.gpuLayers || 0
      });
      
      this.context = new LlamaContext({
        model: this.model,
        contextSize: this.config.local.contextSize || 2048,
        threads: this.config.local.threads || 4
      });
      
      this.available = true;
      logger.info('Local model loaded successfully');
      
    } catch (error) {
      logger.error(`Failed to load local model: ${error}`);
      this.available = false;
    }
  }

  async getBotBatchDecisions(request: AiBotBatchRequest): Promise<AiBotBatchResponse> {
    const startTime = Date.now();
    
    if (!this.available || !this.context) {
      throw new Error('Local model not available');
    }

    try {
      const { LlamaChatSession } = await import('node-llama-cpp');
      
      const session = new LlamaChatSession({
        context: this.context,
        systemPrompt: BOT_SYSTEM_PROMPT
      });
      
      const prompt = buildBatchPrompt(request.bots);
      const response = await session.prompt(prompt);
      const intents = parseIntents(response, request.bots.length);
      
      const decisions: AiBotDecision[] = request.bots.map((bot, i) => ({
        id: bot.id,
        intent: intents[i],
        details: { source: 'local', model: this.config.model }
      }));
      
      this.recordLatency(Date.now() - startTime);
      return { decisions };
      
    } catch (error) {
      logger.error(`Local model error: ${error}`);
      throw error;
    }
  }

  async getCivilizationAdvice(context: AiCivContext): Promise<AiCivAdvice> {
    return {
      priorities: ['Continue operations'],
      suggestions: ['Expand when ready'],
      warnings: []
    };
  }

  isAvailable(): boolean {
    return this.available;
  }

  getAverageLatency(): number {
    if (this.latencies.length === 0) return 0;
    return this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
  }

  private recordLatency(latency: number): void {
    this.latencies.push(latency);
    if (this.latencies.length > 50) this.latencies.shift();
  }

  /**
   * Unload the model to free memory
   */
  async unload(): Promise<void> {
    if (this.context) {
      // Context cleanup
      this.context = null;
    }
    if (this.model) {
      // Model cleanup
      this.model = null;
    }
    this.available = false;
    logger.info('Local model unloaded');
  }
}

// ============================================================================
// FALLBACK-WRAPPED PROVIDER
// ============================================================================

/**
 * Wraps any AI provider with fallback logic
 */
export class FallbackWrappedClient implements AiCoreClient {
  private primary: AiCoreClient;
  private fallback: AiCoreClient;
  private useFallback: boolean = false;
  private failureCount: number = 0;
  private readonly maxFailures: number = 3;
  private readonly recoveryTime: number = 60000; // 1 minute
  private lastFailure: number = 0;

  constructor(primary: AiCoreClient, fallback: AiCoreClient) {
    this.primary = primary;
    this.fallback = fallback;
  }

  async getBotBatchDecisions(request: AiBotBatchRequest): Promise<AiBotBatchResponse> {
    // Check if we should try primary again
    if (this.useFallback && Date.now() - this.lastFailure > this.recoveryTime) {
      logger.info('Attempting to recover primary AI provider');
      this.useFallback = false;
      this.failureCount = 0;
    }

    if (!this.useFallback) {
      try {
        const result = await this.primary.getBotBatchDecisions(request);
        this.failureCount = 0; // Reset on success
        return result;
      } catch (error) {
        this.failureCount++;
        this.lastFailure = Date.now();
        logger.warn(`Primary AI failed (${this.failureCount}/${this.maxFailures}): ${error}`);
        
        if (this.failureCount >= this.maxFailures) {
          logger.warn('Switching to fallback AI provider');
          this.useFallback = true;
        }
      }
    }

    // Use fallback
    return this.fallback.getBotBatchDecisions(request);
  }

  async getCivilizationAdvice(context: AiCivContext): Promise<AiCivAdvice> {
    if (!this.useFallback) {
      try {
        return await this.primary.getCivilizationAdvice(context);
      } catch (error) {
        logger.warn(`Primary AI civ advice failed: ${error}`);
      }
    }
    return this.fallback.getCivilizationAdvice(context);
  }

  isAvailable(): boolean {
    return this.primary.isAvailable() || this.fallback.isAvailable();
  }

  getAverageLatency(): number {
    return this.useFallback 
      ? this.fallback.getAverageLatency() 
      : this.primary.getAverageLatency();
  }

  /**
   * Force switch to primary
   */
  forcePrimary(): void {
    this.useFallback = false;
    this.failureCount = 0;
  }

  /**
   * Check if using fallback
   */
  isUsingFallback(): boolean {
    return this.useFallback;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  OllamaAiClient,
  OpenAiClient,
  RemoteAiClient,
  LocalModelClient,
  FallbackWrappedClient,
  buildBotPrompt,
  buildBatchPrompt,
  parseIntents
};
