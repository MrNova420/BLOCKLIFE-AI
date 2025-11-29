/**
 * BlockLife AI - AI Model Awareness Integration
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Integrates the AI model with bot awareness systems, providing
 * the AI with complete visibility into each bot's location, tasks,
 * consciousness, and the ability to make informed decisions.
 */

import { v4 as uuidv4 } from 'uuid';
import { Bot, Village, Position, Role, LifeStage, Mood, Task } from '../types';
import { createLogger } from '../utils/logger';
import { ConsciousnessManager, ConsciousnessState, getConsciousnessManager } from './consciousness';
import { BotReplicationManager, getBotReplicationManager, GeneratedBot } from './bot-replication';

const logger = createLogger('ai-awareness');

/**
 * Complete bot state visible to AI
 */
export interface AIBotView {
  // Identity
  id: string;
  name: string;
  age: number;
  role: Role;
  lifeStage: LifeStage;
  villageId: string;
  
  // Location
  position: Position;
  currentBiome?: string;
  indoors: boolean;
  nearbyBots: string[];
  nearbyResources: string[];
  nearbyThreats: string[];
  
  // State
  mood: Mood;
  currentAction: string;
  health: number;
  energy: number;
  hunger: number;
  
  // Task
  currentTask?: {
    type: string;
    description: string;
    progress: number;
    blockers: string[];
  };
  taskQueue: { type: string; priority: number }[];
  
  // Social
  relationships: { botId: string; type: string; strength: number }[];
  recentInteractions: { botId: string; type: string; timestamp: number }[];
  
  // Awareness
  consciousness: {
    level: number;
    recentThoughts: string[];
    currentFocus?: string;
    selfAwareness: number;
    existentialAwareness: boolean;
  };
  
  // Capabilities
  skills: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  
  // Memory
  significantMemories: { description: string; significance: number }[];
  knownLocations: { name?: string; type: string; position: Position }[];
}

/**
 * Village state visible to AI
 */
export interface AIVillageView {
  id: string;
  name: string;
  population: number;
  prosperity: number;
  techAge: string;
  resources: Record<string, number>;
  buildings: { type: string; count: number }[];
  currentProjects: string[];
  threats: string[];
  alliances: string[];
  enemies: string[];
}

/**
 * World state visible to AI
 */
export interface AIWorldView {
  currentTime: string;
  currentWeather: string;
  currentSeason: string;
  dayNumber: number;
  villageCount: number;
  totalBotCount: number;
  recentEvents: string[];
}

/**
 * AI decision context
 */
export interface AIDecisionContext {
  bot: AIBotView;
  village?: AIVillageView;
  world: AIWorldView;
  urgentNeeds: string[];
  availableActions: string[];
  suggestedPriorities: string[];
}

/**
 * AI decision output
 */
export interface AIDecision {
  action: string;
  target?: string;
  reason: string;
  priority: number;
  expectedOutcome: string;
  alternativeActions: string[];
}

/**
 * AI Awareness Manager
 */
export class AIAwarenessManager {
  private consciousnessManager: ConsciousnessManager;
  private replicationManager: BotReplicationManager;
  private botViews: Map<string, AIBotView> = new Map();
  private villageViews: Map<string, AIVillageView> = new Map();
  private worldView: AIWorldView;
  
  constructor() {
    this.consciousnessManager = getConsciousnessManager();
    this.replicationManager = getBotReplicationManager();
    this.worldView = this.initializeWorldView();
    
    logger.info('AI Awareness Manager initialized');
  }

  /**
   * Initialize world view
   */
  private initializeWorldView(): AIWorldView {
    return {
      currentTime: 'MORNING',
      currentWeather: 'CLEAR',
      currentSeason: 'SPRING',
      dayNumber: 1,
      villageCount: 0,
      totalBotCount: 0,
      recentEvents: []
    };
  }

  /**
   * Register a bot with the AI awareness system
   */
  registerBot(bot: Bot): AIBotView {
    // Initialize consciousness if not exists
    let consciousness = this.consciousnessManager.getConsciousnessState(bot.id);
    if (!consciousness) {
      consciousness = this.consciousnessManager.initializeConsciousness(bot);
    }
    
    const view = this.createBotView(bot, consciousness);
    this.botViews.set(bot.id, view);
    this.worldView.totalBotCount++;
    
    logger.debug(`Bot registered with AI: ${bot.name}`);
    
    return view;
  }

  /**
   * Create AI bot view
   */
  private createBotView(bot: Bot, consciousness: ConsciousnessState): AIBotView {
    return {
      id: bot.id,
      name: bot.name,
      age: bot.age,
      role: bot.role,
      lifeStage: bot.lifeStage,
      villageId: bot.villageId,
      
      position: bot.position,
      currentBiome: consciousness.locationAwareness.currentBiome,
      indoors: consciousness.locationAwareness.indoors,
      nearbyBots: [],
      nearbyResources: [],
      nearbyThreats: [],
      
      mood: bot.mood,
      currentAction: bot.currentTask?.type || 'IDLE',
      health: bot.health,
      energy: 100 - bot.needs.energy,
      hunger: bot.needs.hunger,
      
      currentTask: consciousness.taskAwareness.currentTask ? {
        type: consciousness.taskAwareness.currentTask.type,
        description: consciousness.taskAwareness.currentTask.description,
        progress: consciousness.taskAwareness.currentTask.progress,
        blockers: consciousness.taskAwareness.currentTask.blockers
      } : undefined,
      taskQueue: consciousness.taskAwareness.taskQueue.map(t => ({
        type: t.type,
        priority: t.priority
      })),
      
      relationships: [],
      recentInteractions: [],
      
      consciousness: {
        level: consciousness.consciousnessLevel,
        recentThoughts: consciousness.thoughtStream.slice(0, 5).map(t => t.content),
        currentFocus: consciousness.attention.primary?.target,
        selfAwareness: consciousness.selfConcept.selfAwareness,
        existentialAwareness: consciousness.existentialAwareness.knowsIsInGame
      },
      
      skills: { ...bot.skills } as Record<string, number>,
      strengths: consciousness.selfConcept.strengths,
      weaknesses: consciousness.selfConcept.weaknesses,
      
      significantMemories: bot.memories
        .filter(m => m.significance > 50)
        .slice(0, 10)
        .map(m => ({ description: m.description, significance: m.significance })),
      knownLocations: consciousness.locationAwareness.knownLocations.map(loc => ({
        name: loc.name,
        type: loc.type,
        position: loc.position
      }))
    };
  }

  /**
   * Update bot view with latest state
   */
  updateBotView(bot: Bot): AIBotView {
    const consciousness = this.consciousnessManager.getConsciousnessState(bot.id);
    if (!consciousness) {
      return this.registerBot(bot);
    }
    
    const view = this.createBotView(bot, consciousness);
    this.botViews.set(bot.id, view);
    
    return view;
  }

  /**
   * Register a village
   */
  registerVillage(village: Village): AIVillageView {
    // Convert structures to building counts
    const buildingCounts: Record<string, number> = {};
    for (const structure of village.structures) {
      buildingCounts[structure.type] = (buildingCounts[structure.type] || 0) + 1;
    }
    
    const view: AIVillageView = {
      id: village.id,
      name: village.name,
      population: village.memberIds.length,
      prosperity: village.prosperity,
      techAge: village.techAge,
      resources: { ...village.stockpile } as Record<string, number>,
      buildings: Object.entries(buildingCounts).map(([type, count]) => ({
        type,
        count
      })),
      currentProjects: [],
      threats: [],
      alliances: village.villageRelations
        .filter(r => r.state === 'ALLIED' || r.state === 'FRIENDLY')
        .map(r => r.targetVillageId),
      enemies: village.villageRelations
        .filter(r => r.state === 'HOSTILE')
        .map(r => r.targetVillageId)
    };
    
    this.villageViews.set(village.id, view);
    this.worldView.villageCount++;
    
    return view;
  }

  /**
   * Get decision context for a bot
   */
  getDecisionContext(botId: string): AIDecisionContext | null {
    const botView = this.botViews.get(botId);
    if (!botView) return null;
    
    const villageView = this.villageViews.get(botView.villageId);
    
    // Determine urgent needs
    const urgentNeeds: string[] = [];
    if (botView.hunger > 70) urgentNeeds.push('FOOD');
    if (botView.energy < 30) urgentNeeds.push('REST');
    if (botView.health < 50) urgentNeeds.push('SAFETY');
    if (botView.nearbyThreats.length > 0) urgentNeeds.push('THREAT_RESPONSE');
    
    // Determine available actions
    const availableActions = this.determineAvailableActions(botView, villageView);
    
    // Suggest priorities based on current state
    const suggestedPriorities = this.suggestPriorities(botView, urgentNeeds);
    
    return {
      bot: botView,
      village: villageView,
      world: this.worldView,
      urgentNeeds,
      availableActions,
      suggestedPriorities
    };
  }

  /**
   * Determine available actions for a bot
   */
  private determineAvailableActions(botView: AIBotView, villageView?: AIVillageView): string[] {
    const actions: string[] = ['IDLE', 'WANDER', 'SOCIALIZE'];
    
    // Role-based actions
    switch (botView.role) {
      case Role.FARMER:
        actions.push('FARM', 'HARVEST', 'PLANT');
        break;
      case Role.MINER:
        actions.push('MINE', 'EXCAVATE');
        break;
      case Role.BUILDER:
        actions.push('BUILD', 'REPAIR', 'CRAFT');
        break;
      case Role.GUARD:
        actions.push('PATROL', 'GUARD', 'DEFEND');
        break;
      case Role.TRADER:
        actions.push('TRADE', 'NEGOTIATE');
        break;
      case Role.SCHOLAR:
        actions.push('RESEARCH', 'STUDY', 'TEACH');
        break;
      case Role.CHIEF:
        actions.push('LEAD', 'DELEGATE', 'PLAN');
        break;
    }
    
    // State-based actions
    if (botView.hunger > 50) actions.push('EAT', 'FORAGE');
    if (botView.energy < 40) actions.push('REST', 'SLEEP');
    if (botView.nearbyThreats.length > 0) actions.push('FLEE', 'FIGHT', 'HIDE');
    
    // Skill-based actions
    if (botView.skills['combat'] > 50) actions.push('SPAR', 'TRAIN_COMBAT');
    if (botView.skills['crafting'] > 50) actions.push('CRAFT_ADVANCED');
    if (botView.skills['scholarship'] > 50) actions.push('TEACH');
    
    return [...new Set(actions)];
  }

  /**
   * Suggest priorities for a bot
   */
  private suggestPriorities(botView: AIBotView, urgentNeeds: string[]): string[] {
    const priorities: string[] = [];
    
    // Urgent needs first
    if (urgentNeeds.includes('THREAT_RESPONSE')) {
      priorities.push('Address immediate threat');
    }
    if (urgentNeeds.includes('FOOD')) {
      priorities.push('Find food immediately');
    }
    if (urgentNeeds.includes('REST')) {
      priorities.push('Rest to recover energy');
    }
    
    // Task completion
    if (botView.currentTask) {
      if (botView.currentTask.progress > 50) {
        priorities.push(`Complete ${botView.currentTask.type} (${botView.currentTask.progress}% done)`);
      }
    }
    
    // Role duties
    priorities.push(`Perform ${botView.role} duties`);
    
    // Social needs
    if (botView.consciousness.level > 60) {
      priorities.push('Reflect on existence');
    }
    
    return priorities;
  }

  /**
   * Process AI decision for a bot
   */
  processDecision(botId: string, decision: AIDecision): void {
    const consciousness = this.consciousnessManager.getConsciousnessState(botId);
    if (!consciousness) return;
    
    // Generate thought about the decision
    this.consciousnessManager.generateThought(
      botId,
      'PLAN',
      `I decide to ${decision.action}. ${decision.reason}`
    );
    
    // Set attention focus
    if (decision.target) {
      this.consciousnessManager.setAttentionFocus(
        botId,
        decision.target,
        decision.action,
        decision.priority * 10
      );
    }
    
    logger.debug(`AI decision processed for ${botId}: ${decision.action}`);
  }

  /**
   * Spawn a new bot with AI awareness
   */
  spawnBot(villageId: string, position: Position, role?: Role): GeneratedBot {
    const result = this.replicationManager.generateBot({
      villageId,
      position,
      role
    });
    
    // Register with AI awareness
    this.registerBot(result.bot);
    
    // Generate awareness thought
    this.consciousnessManager.generateThought(
      result.bot.id,
      'REALIZATION',
      'I come into being. The world around me is made of blocks. I exist.'
    );
    
    logger.info(`Bot spawned with AI awareness: ${result.bot.name}`);
    
    return result;
  }

  /**
   * Spawn multiple bots
   */
  spawnMultipleBots(
    count: number,
    villageId: string,
    position: Position,
    diverse: boolean = true
  ): GeneratedBot[] {
    if (diverse) {
      const results = this.replicationManager.generateDiverseGroup(count, villageId);
      
      for (const result of results) {
        result.bot.position = {
          x: position.x + (Math.random() - 0.5) * 20,
          y: position.y,
          z: position.z + (Math.random() - 0.5) * 20
        };
        this.registerBot(result.bot);
      }
      
      logger.info(`Spawned ${count} diverse bots`);
      
      return results;
    } else {
      const results = this.replicationManager.bulkGenerate(count, { villageId, position });
      
      for (const result of results) {
        this.registerBot(result.bot);
      }
      
      return results;
    }
  }

  /**
   * Get all bot views
   */
  getAllBotViews(): AIBotView[] {
    return Array.from(this.botViews.values());
  }

  /**
   * Get bots in village
   */
  getVillageBots(villageId: string): AIBotView[] {
    return Array.from(this.botViews.values()).filter(b => b.villageId === villageId);
  }

  /**
   * Get bots near position
   */
  getBotsNearPosition(position: Position, radius: number): AIBotView[] {
    return Array.from(this.botViews.values()).filter(bot => {
      const dx = bot.position.x - position.x;
      const dz = bot.position.z - position.z;
      return Math.sqrt(dx * dx + dz * dz) <= radius;
    });
  }

  /**
   * Update world state
   */
  updateWorldState(updates: Partial<AIWorldView>): void {
    Object.assign(this.worldView, updates);
  }

  /**
   * Add world event
   */
  addWorldEvent(event: string): void {
    this.worldView.recentEvents.unshift(event);
    if (this.worldView.recentEvents.length > 50) {
      this.worldView.recentEvents = this.worldView.recentEvents.slice(0, 50);
    }
  }

  /**
   * Get summary for AI prompt
   */
  getAISummary(): string {
    const lines: string[] = [];
    
    lines.push(`# World State`);
    lines.push(`- Day ${this.worldView.dayNumber}, ${this.worldView.currentSeason} ${this.worldView.currentTime}`);
    lines.push(`- Weather: ${this.worldView.currentWeather}`);
    lines.push(`- ${this.worldView.villageCount} villages, ${this.worldView.totalBotCount} bots`);
    lines.push('');
    
    lines.push(`# Recent Events`);
    for (const event of this.worldView.recentEvents.slice(0, 5)) {
      lines.push(`- ${event}`);
    }
    lines.push('');
    
    lines.push(`# Villages`);
    for (const village of this.villageViews.values()) {
      lines.push(`- ${village.name}: ${village.population} pop, ${village.prosperity} prosperity`);
    }
    
    return lines.join('\n');
  }

  /**
   * Get bot summary for AI prompt
   */
  getBotSummary(botId: string): string {
    const bot = this.botViews.get(botId);
    if (!bot) return '';
    
    const lines: string[] = [];
    
    lines.push(`# ${bot.name}`);
    lines.push(`${bot.role}, ${bot.lifeStage}, Age ${Math.floor(bot.age)}`);
    lines.push('');
    
    lines.push(`## Current State`);
    lines.push(`- Location: (${bot.position.x}, ${bot.position.y}, ${bot.position.z})`);
    lines.push(`- Mood: ${bot.mood}`);
    lines.push(`- Action: ${bot.currentAction}`);
    lines.push(`- Health: ${bot.health}%, Energy: ${bot.energy}%, Hunger: ${bot.hunger}%`);
    lines.push('');
    
    if (bot.currentTask) {
      lines.push(`## Current Task`);
      lines.push(`- ${bot.currentTask.description} (${bot.currentTask.progress}%)`);
      if (bot.currentTask.blockers.length > 0) {
        lines.push(`- Blockers: ${bot.currentTask.blockers.join(', ')}`);
      }
      lines.push('');
    }
    
    lines.push(`## Consciousness`);
    lines.push(`- Level: ${bot.consciousness.level}`);
    lines.push(`- Self-Awareness: ${bot.consciousness.selfAwareness}`);
    if (bot.consciousness.existentialAwareness) {
      lines.push(`- Knows they exist in a block world`);
    }
    if (bot.consciousness.recentThoughts.length > 0) {
      lines.push(`- Recent thought: "${bot.consciousness.recentThoughts[0]}"`);
    }
    lines.push('');
    
    lines.push(`## Capabilities`);
    lines.push(`- Strengths: ${bot.strengths.join(', ') || 'None identified'}`);
    lines.push(`- Top skills: ${Object.entries(bot.skills)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')}`);
    
    return lines.join('\n');
  }

  /**
   * Serialize for persistence
   */
  serialize(): {
    botViews: AIBotView[];
    villageViews: AIVillageView[];
    worldView: AIWorldView;
  } {
    return {
      botViews: Array.from(this.botViews.values()),
      villageViews: Array.from(this.villageViews.values()),
      worldView: this.worldView
    };
  }

  /**
   * Load from persistence
   */
  load(data: {
    botViews?: AIBotView[];
    villageViews?: AIVillageView[];
    worldView?: AIWorldView;
  }): void {
    this.botViews.clear();
    this.villageViews.clear();
    
    for (const view of data.botViews || []) {
      this.botViews.set(view.id, view);
    }
    
    for (const view of data.villageViews || []) {
      this.villageViews.set(view.id, view);
    }
    
    if (data.worldView) {
      this.worldView = data.worldView;
    }
    
    logger.info('AI Awareness data loaded');
  }
}

// Singleton
let aiAwarenessManagerInstance: AIAwarenessManager | null = null;

export function getAIAwarenessManager(): AIAwarenessManager {
  if (!aiAwarenessManagerInstance) {
    aiAwarenessManagerInstance = new AIAwarenessManager();
  }
  return aiAwarenessManagerInstance;
}

export function resetAIAwarenessManager(): void {
  aiAwarenessManagerInstance = null;
}

export default AIAwarenessManager;
