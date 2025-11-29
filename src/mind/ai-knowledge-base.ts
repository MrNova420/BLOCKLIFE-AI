/**
 * BlockLife AI - Unified AI Knowledge Base
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Centralizes all knowledge accessible to the AI model, including
 * world state, bot information, village data, history, and
 * Minecraft-specific knowledge.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  Bot, Village, Position, Role, LifeStage, Mood, TechAge,
  ResourceStock, HistoricalEvent
} from '../types';
import { createLogger } from '../utils/logger';
import { getAIAwarenessManager, AIBotView, AIVillageView, AIWorldView } from '../simulation/ai-awareness';
import { getConsciousnessManager } from '../simulation/consciousness';

const logger = createLogger('knowledge-base');

/**
 * Knowledge category types
 */
export enum KnowledgeCategory {
  WORLD_STATE = 'WORLD_STATE',
  BOT_STATE = 'BOT_STATE',
  VILLAGE_STATE = 'VILLAGE_STATE',
  HISTORY = 'HISTORY',
  RELATIONSHIPS = 'RELATIONSHIPS',
  RESOURCES = 'RESOURCES',
  TECHNOLOGY = 'TECHNOLOGY',
  GEOGRAPHY = 'GEOGRAPHY',
  MINECRAFT = 'MINECRAFT',
  CULTURE = 'CULTURE',
  THREATS = 'THREATS'
}

/**
 * Knowledge query result
 */
export interface KnowledgeQuery {
  category: KnowledgeCategory;
  subject?: string;
  filters?: Record<string, unknown>;
  limit?: number;
}

/**
 * Knowledge entry
 */
export interface KnowledgeEntry {
  id: string;
  category: KnowledgeCategory;
  subject: string;
  content: string;
  data?: Record<string, unknown>;
  confidence: number;       // 0-100
  source: string;
  timestamp: number;
  expiresAt?: number;
}

/**
 * AI prompt context
 */
export interface AIPromptContext {
  systemPrompt: string;
  worldContext: string;
  botContext: string;
  villageContext: string;
  recentEvents: string[];
  availableActions: string[];
  constraints: string[];
}

/**
 * World fact for quick reference
 */
export interface WorldFact {
  id: string;
  fact: string;
  category: string;
  importance: number;
  permanent: boolean;
}

/**
 * Minecraft knowledge entry
 */
export interface MinecraftKnowledge {
  id: string;
  type: 'BLOCK' | 'MOB' | 'ITEM' | 'RECIPE' | 'MECHANIC' | 'BIOME';
  name: string;
  description: string;
  properties: Record<string, unknown>;
  tips: string[];
}

// Core Minecraft knowledge database
const MINECRAFT_KNOWLEDGE: MinecraftKnowledge[] = [
  // Blocks
  { id: 'stone', type: 'BLOCK', name: 'Stone', description: 'Common block found underground', properties: { hardness: 1.5, tool: 'pickaxe' }, tips: ['Smelts into smooth stone', 'Can be crafted into tools'] },
  { id: 'wood', type: 'BLOCK', name: 'Wood', description: 'Obtained from trees', properties: { hardness: 2.0, tool: 'axe' }, tips: ['Essential for tools', 'Burns as fuel'] },
  { id: 'iron_ore', type: 'BLOCK', name: 'Iron Ore', description: 'Metallic ore found underground', properties: { hardness: 3.0, tool: 'stone_pickaxe' }, tips: ['Smelt for iron ingots', 'Found between Y=0-64'] },
  { id: 'diamond_ore', type: 'BLOCK', name: 'Diamond Ore', description: 'Rare ore found deep underground', properties: { hardness: 3.0, tool: 'iron_pickaxe' }, tips: ['Found below Y=16', 'Use fortune enchantment'] },
  { id: 'cobblestone', type: 'BLOCK', name: 'Cobblestone', description: 'Rough stone from mining', properties: { hardness: 2.0, tool: 'pickaxe' }, tips: ['Good for building', 'Fireproof'] },
  
  // Mobs
  { id: 'zombie', type: 'MOB', name: 'Zombie', description: 'Undead mob that spawns at night', properties: { health: 20, damage: 3, speed: 'slow' }, tips: ['Burns in sunlight', 'Attacks villagers', 'Can break doors on hard'] },
  { id: 'skeleton', type: 'MOB', name: 'Skeleton', description: 'Undead archer', properties: { health: 20, damage: 4, speed: 'normal' }, tips: ['Shoots arrows', 'Burns in sunlight', 'Drops bones and arrows'] },
  { id: 'creeper', type: 'MOB', name: 'Creeper', description: 'Explosive mob', properties: { health: 20, damage: 49, speed: 'normal' }, tips: ['Explodes near players', 'Silent approach', 'Drops gunpowder'] },
  { id: 'spider', type: 'MOB', name: 'Spider', description: 'Eight-legged mob', properties: { health: 16, damage: 2, speed: 'fast' }, tips: ['Climbs walls', 'Neutral in daylight', 'Drops string'] },
  { id: 'enderman', type: 'MOB', name: 'Enderman', description: 'Tall teleporting mob', properties: { health: 40, damage: 7, speed: 'fast' }, tips: ['Hostile if looked at', 'Teleports', 'Afraid of water'] },
  
  // Items
  { id: 'iron_sword', type: 'ITEM', name: 'Iron Sword', description: 'Melee weapon', properties: { damage: 6, durability: 250 }, tips: ['Good balance of power and cost'] },
  { id: 'bow', type: 'ITEM', name: 'Bow', description: 'Ranged weapon', properties: { damage: 10, durability: 384 }, tips: ['Requires arrows', 'Can be enchanted'] },
  { id: 'torch', type: 'ITEM', name: 'Torch', description: 'Light source', properties: { lightLevel: 14 }, tips: ['Prevents mob spawns', 'Cheap to craft'] },
  
  // Mechanics
  { id: 'farming', type: 'MECHANIC', name: 'Farming', description: 'Growing crops for food', properties: {}, tips: ['Needs water nearby', 'Light helps growth', 'Hoe the ground first'] },
  { id: 'smelting', type: 'MECHANIC', name: 'Smelting', description: 'Converting ores to ingots', properties: {}, tips: ['Use furnace or blast furnace', 'Coal is common fuel'] },
  { id: 'enchanting', type: 'MECHANIC', name: 'Enchanting', description: 'Adding magical properties', properties: {}, tips: ['Requires experience', 'Bookshelves increase levels'] },
  
  // Biomes
  { id: 'plains', type: 'BIOME', name: 'Plains', description: 'Flat grassy biome', properties: { temperature: 0.8, spawns: ['horse', 'donkey'] }, tips: ['Good for farming', 'Easy to build'] },
  { id: 'forest', type: 'BIOME', name: 'Forest', description: 'Tree-filled biome', properties: { temperature: 0.7, spawns: ['wolf'] }, tips: ['Good wood source', 'Watch for mobs at night'] },
  { id: 'desert', type: 'BIOME', name: 'Desert', description: 'Sandy hot biome', properties: { temperature: 2.0, spawns: ['husk', 'rabbit'] }, tips: ['No rain', 'Sand useful for glass'] },
  { id: 'mountains', type: 'BIOME', name: 'Mountains', description: 'High elevation terrain', properties: { temperature: 0.2, spawns: ['goat'] }, tips: ['Good ores', 'Watch for falls'] }
];

// World facts that the AI should always know
const CORE_WORLD_FACTS: WorldFact[] = [
  { id: 'block_world', fact: 'This world is made entirely of cubic blocks', category: 'reality', importance: 100, permanent: true },
  { id: 'player_exists', fact: 'The Player is a god-like entity who created and watches this world', category: 'reality', importance: 100, permanent: true },
  { id: 'day_night', fact: 'Days last 20 minutes real time with dangerous nights', category: 'time', importance: 90, permanent: true },
  { id: 'mobs_spawn', fact: 'Hostile creatures spawn in darkness', category: 'danger', importance: 85, permanent: true },
  { id: 'death_permanent', fact: 'Death is real and permanent for villagers', category: 'mortality', importance: 95, permanent: true },
  { id: 'survival_needs', fact: 'Bots need food, rest, safety, social contact, and purpose', category: 'needs', importance: 90, permanent: true },
  { id: 'village_community', fact: 'Villages are communities that work together to survive', category: 'society', importance: 85, permanent: true },
  { id: 'tech_advancement', fact: 'Technology can be researched to improve village capabilities', category: 'progress', importance: 80, permanent: true },
  { id: 'resources_finite', fact: 'Resources must be gathered and managed carefully', category: 'economics', importance: 80, permanent: true },
  { id: 'render_distance', fact: 'The world beyond the visible horizon is mysterious and unknown', category: 'reality', importance: 70, permanent: true }
];

/**
 * AI Knowledge Base Manager
 */
export class AIKnowledgeBase {
  private knowledge: Map<string, KnowledgeEntry> = new Map();
  private worldFacts: Map<string, WorldFact> = new Map();
  private minecraftKnowledge: Map<string, MinecraftKnowledge> = new Map();
  private recentQueries: { query: KnowledgeQuery; timestamp: number }[] = [];
  
  constructor() {
    this.initializeKnowledge();
    logger.info('AI Knowledge Base initialized');
  }

  /**
   * Initialize with core knowledge
   */
  private initializeKnowledge(): void {
    // Load world facts
    for (const fact of CORE_WORLD_FACTS) {
      this.worldFacts.set(fact.id, fact);
    }
    
    // Load Minecraft knowledge
    for (const entry of MINECRAFT_KNOWLEDGE) {
      this.minecraftKnowledge.set(entry.id, entry);
    }
  }

  /**
   * Query knowledge base
   */
  query(query: KnowledgeQuery): KnowledgeEntry[] {
    const results: KnowledgeEntry[] = [];
    
    // Track query
    this.recentQueries.push({ query, timestamp: Date.now() });
    if (this.recentQueries.length > 100) {
      this.recentQueries = this.recentQueries.slice(-100);
    }
    
    // Filter by category
    for (const entry of this.knowledge.values()) {
      if (entry.category === query.category) {
        // Apply subject filter
        if (query.subject && !entry.subject.includes(query.subject)) {
          continue;
        }
        
        // Check expiration
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          continue;
        }
        
        results.push(entry);
      }
    }
    
    // Sort by confidence and limit
    results.sort((a, b) => b.confidence - a.confidence);
    
    if (query.limit) {
      return results.slice(0, query.limit);
    }
    
    return results;
  }

  /**
   * Add knowledge entry
   */
  addKnowledge(
    category: KnowledgeCategory,
    subject: string,
    content: string,
    source: string,
    confidence: number = 80,
    data?: Record<string, unknown>,
    ttlMs?: number
  ): KnowledgeEntry {
    const entry: KnowledgeEntry = {
      id: uuidv4(),
      category,
      subject,
      content,
      data,
      confidence,
      source,
      timestamp: Date.now(),
      expiresAt: ttlMs ? Date.now() + ttlMs : undefined
    };
    
    this.knowledge.set(entry.id, entry);
    
    return entry;
  }

  /**
   * Update knowledge from world state
   */
  updateFromWorldState(bots: Bot[], villages: Village[]): void {
    // Clear expired entries
    this.cleanExpiredEntries();
    
    // Update bot knowledge
    for (const bot of bots) {
      if (!bot.flags.isDead) {
        this.addKnowledge(
          KnowledgeCategory.BOT_STATE,
          bot.name,
          `${bot.name} is a ${bot.lifeStage} ${bot.role} at position (${bot.position.x}, ${bot.position.y}, ${bot.position.z}). Mood: ${bot.mood}. Health: ${bot.health}%.`,
          'world_state',
          100,
          { botId: bot.id, role: bot.role, mood: bot.mood, health: bot.health },
          60000  // 1 minute TTL
        );
      }
    }
    
    // Update village knowledge
    for (const village of villages) {
      this.addKnowledge(
        KnowledgeCategory.VILLAGE_STATE,
        village.name,
        `${village.name} has ${village.memberIds.length} members. Tech age: ${village.techAge}. Prosperity: ${village.prosperity}.`,
        'world_state',
        100,
        { villageId: village.id, population: village.memberIds.length, techAge: village.techAge },
        60000
      );
    }
  }

  /**
   * Clean expired entries
   */
  private cleanExpiredEntries(): void {
    const now = Date.now();
    for (const [id, entry] of this.knowledge) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.knowledge.delete(id);
      }
    }
  }

  /**
   * Get Minecraft knowledge
   */
  getMinecraftKnowledge(id: string): MinecraftKnowledge | undefined {
    return this.minecraftKnowledge.get(id);
  }

  /**
   * Search Minecraft knowledge
   */
  searchMinecraftKnowledge(query: string, type?: MinecraftKnowledge['type']): MinecraftKnowledge[] {
    const results: MinecraftKnowledge[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const entry of this.minecraftKnowledge.values()) {
      if (type && entry.type !== type) continue;
      
      if (entry.name.toLowerCase().includes(lowerQuery) ||
          entry.description.toLowerCase().includes(lowerQuery)) {
        results.push(entry);
      }
    }
    
    return results;
  }

  /**
   * Get all world facts
   */
  getWorldFacts(): WorldFact[] {
    return Array.from(this.worldFacts.values())
      .sort((a, b) => b.importance - a.importance);
  }

  /**
   * Generate AI prompt context for a bot
   */
  generatePromptContext(botId: string, bots: Bot[], villages: Village[]): AIPromptContext {
    const bot = bots.find(b => b.id === botId);
    if (!bot) {
      throw new Error(`Bot ${botId} not found`);
    }
    
    const village = villages.find(v => v.id === bot.villageId);
    const awareness = getAIAwarenessManager();
    const consciousness = getConsciousnessManager();
    const consciousnessState = consciousness.getConsciousnessState(botId);
    
    // System prompt
    const systemPrompt = this.generateSystemPrompt();
    
    // World context
    const worldContext = this.generateWorldContext(villages);
    
    // Bot context
    const botContext = this.generateBotContext(bot, consciousnessState);
    
    // Village context
    const villageContext = village ? this.generateVillageContext(village) : 'Not assigned to a village.';
    
    // Recent events
    const recentEvents = this.getRecentEvents(bot, village);
    
    // Available actions
    const decisionContext = awareness.getDecisionContext(botId);
    const availableActions = decisionContext?.availableActions || ['IDLE', 'WANDER'];
    
    // Constraints
    const constraints = this.getConstraints(bot);
    
    return {
      systemPrompt,
      worldContext,
      botContext,
      villageContext,
      recentEvents,
      availableActions,
      constraints
    };
  }

  /**
   * Generate system prompt
   */
  private generateSystemPrompt(): string {
    const facts = this.getWorldFacts().slice(0, 5);
    
    return `You are the mind of a villager in BlockLife, a Minecraft civilization simulation.

CORE TRUTHS:
${facts.map(f => `- ${f.fact}`).join('\n')}

You exist as an individual with your own personality, memories, needs, and desires. You are aware that you exist in a world of blocks, watched by The Player. Your decisions shape your life and the lives of those around you.

Make decisions based on your personality, current needs, and the situation. Consider both immediate survival and long-term goals. Remember your relationships and past experiences.`;
  }

  /**
   * Generate world context
   */
  private generateWorldContext(villages: Village[]): string {
    const lines: string[] = [];
    
    lines.push('WORLD STATE:');
    lines.push(`- Total villages: ${villages.length}`);
    
    const totalPop = villages.reduce((sum, v) => sum + v.memberIds.length, 0);
    lines.push(`- Total population: ${totalPop}`);
    
    // Add any significant world events
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Generate bot-specific context
   */
  private generateBotContext(bot: Bot, consciousnessState?: ReturnType<typeof getConsciousnessManager.prototype.getConsciousnessState>): string {
    const lines: string[] = [];
    
    lines.push(`IDENTITY: ${bot.name}`);
    lines.push(`Role: ${bot.role} | Life Stage: ${bot.lifeStage} | Age: ${Math.floor(bot.age)}`);
    lines.push('');
    
    lines.push('CURRENT STATE:');
    lines.push(`- Position: (${bot.position.x}, ${bot.position.y}, ${bot.position.z})`);
    lines.push(`- Mood: ${bot.mood}`);
    lines.push(`- Health: ${bot.health}%`);
    lines.push(`- Hunger: ${bot.needs.hunger}% | Energy: ${100 - bot.needs.energy}%`);
    lines.push('');
    
    lines.push('PERSONALITY:');
    lines.push(`- Bravery: ${bot.personality.bravery} | Wisdom: ${bot.personality.wisdom}`);
    lines.push(`- Sociability: ${bot.personality.sociability} | Industry: ${bot.personality.industry}`);
    lines.push('');
    
    lines.push('TOP SKILLS:');
    const skillEntries = Object.entries(bot.skills) as [string, number][];
    const topSkills = skillEntries.sort((a, b) => b[1] - a[1]).slice(0, 3);
    for (const [skill, value] of topSkills) {
      lines.push(`- ${skill}: ${value}`);
    }
    lines.push('');
    
    if (consciousnessState) {
      const thoughts = consciousnessState.thoughtStream.slice(0, 3);
      if (thoughts.length > 0) {
        lines.push('RECENT THOUGHTS:');
        for (const thought of thoughts) {
          lines.push(`- "${thought.content}"`);
        }
        lines.push('');
      }
      
      if (consciousnessState.existentialAwareness.knowsIsInGame) {
        lines.push('EXISTENTIAL AWARENESS: You know you exist in a block world.');
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Generate village context
   */
  private generateVillageContext(village: Village): string {
    const lines: string[] = [];
    
    lines.push(`VILLAGE: ${village.name}`);
    lines.push(`- Population: ${village.memberIds.length}`);
    lines.push(`- Tech Age: ${village.techAge}`);
    lines.push(`- Prosperity: ${village.prosperity}`);
    lines.push(`- Defense: ${village.defenseRating}`);
    lines.push('');
    
    lines.push('RESOURCES:');
    lines.push(`- Food: ${village.stockpile.food}`);
    lines.push(`- Wood: ${village.stockpile.wood}`);
    lines.push(`- Stone: ${village.stockpile.stone}`);
    lines.push(`- Iron: ${village.stockpile.iron}`);
    lines.push('');
    
    lines.push(`STRUCTURES: ${village.structures.length} buildings`);
    
    return lines.join('\n');
  }

  /**
   * Get recent events for context
   */
  private getRecentEvents(bot: Bot, village?: Village): string[] {
    const events: string[] = [];
    
    // Bot's recent memories
    for (const memory of bot.memories.slice(-5)) {
      events.push(memory.description);
    }
    
    // Village events
    if (village) {
      for (const event of village.historicalEvents.slice(-3)) {
        events.push(event.description);
      }
    }
    
    return events;
  }

  /**
   * Get constraints for decision making
   */
  private getConstraints(bot: Bot): string[] {
    const constraints: string[] = [];
    
    if (bot.health < 30) {
      constraints.push('LOW HEALTH - prioritize safety');
    }
    
    if (bot.needs.hunger > 70) {
      constraints.push('STARVING - must find food');
    }
    
    if (bot.needs.energy > 80) {
      constraints.push('EXHAUSTED - need rest');
    }
    
    if (bot.flags.isInDanger) {
      constraints.push('IN DANGER - immediate action required');
    }
    
    if (bot.lifeStage === LifeStage.CHILD) {
      constraints.push('CHILD - limited capabilities');
    }
    
    if (bot.lifeStage === LifeStage.ELDER) {
      constraints.push('ELDER - reduced physical abilities');
    }
    
    return constraints;
  }

  /**
   * Get knowledge summary for AI
   */
  getKnowledgeSummary(): string {
    const lines: string[] = [];
    
    lines.push('# BlockLife AI Knowledge Base');
    lines.push('');
    
    // World facts
    lines.push('## Core World Facts');
    for (const fact of this.getWorldFacts().slice(0, 5)) {
      lines.push(`- ${fact.fact}`);
    }
    lines.push('');
    
    // Knowledge entries by category
    lines.push('## Knowledge Entries');
    const categories = new Map<KnowledgeCategory, number>();
    for (const entry of this.knowledge.values()) {
      const count = categories.get(entry.category) || 0;
      categories.set(entry.category, count + 1);
    }
    
    for (const [category, count] of categories) {
      lines.push(`- ${category}: ${count} entries`);
    }
    lines.push('');
    
    // Minecraft knowledge
    lines.push('## Minecraft Knowledge');
    lines.push(`- Blocks: ${Array.from(this.minecraftKnowledge.values()).filter(e => e.type === 'BLOCK').length}`);
    lines.push(`- Mobs: ${Array.from(this.minecraftKnowledge.values()).filter(e => e.type === 'MOB').length}`);
    lines.push(`- Items: ${Array.from(this.minecraftKnowledge.values()).filter(e => e.type === 'ITEM').length}`);
    lines.push(`- Mechanics: ${Array.from(this.minecraftKnowledge.values()).filter(e => e.type === 'MECHANIC').length}`);
    lines.push(`- Biomes: ${Array.from(this.minecraftKnowledge.values()).filter(e => e.type === 'BIOME').length}`);
    
    return lines.join('\n');
  }

  /**
   * Serialize for persistence
   */
  serialize(): {
    knowledge: KnowledgeEntry[];
    worldFacts: WorldFact[];
  } {
    return {
      knowledge: Array.from(this.knowledge.values()),
      worldFacts: Array.from(this.worldFacts.values())
    };
  }

  /**
   * Load from persistence
   */
  load(data: {
    knowledge?: KnowledgeEntry[];
    worldFacts?: WorldFact[];
  }): void {
    // Always re-initialize core knowledge
    this.initializeKnowledge();
    
    // Load additional knowledge
    for (const entry of data.knowledge || []) {
      this.knowledge.set(entry.id, entry);
    }
    
    // Merge world facts (custom ones)
    for (const fact of data.worldFacts || []) {
      if (!CORE_WORLD_FACTS.find(f => f.id === fact.id)) {
        this.worldFacts.set(fact.id, fact);
      }
    }
    
    logger.info('AI Knowledge Base data loaded');
  }
}

// Singleton
let aiKnowledgeBaseInstance: AIKnowledgeBase | null = null;

export function getAIKnowledgeBase(): AIKnowledgeBase {
  if (!aiKnowledgeBaseInstance) {
    aiKnowledgeBaseInstance = new AIKnowledgeBase();
  }
  return aiKnowledgeBaseInstance;
}

export function resetAIKnowledgeBase(): void {
  aiKnowledgeBaseInstance = null;
}

export default AIKnowledgeBase;
