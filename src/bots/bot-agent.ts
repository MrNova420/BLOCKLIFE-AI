/**
 * BlockLife AI - Bot Agent
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Individual bot agent that represents a single villager in the simulation.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Bot,
  BotFlags,
  Position,
  NeedsState,
  PersonalityTraits,
  SkillSet,
  Task,
  Memory,
  Relationship,
  Location,
  InventorySlot,
  LifeStage,
  Gender,
  Role,
  Mood,
  AiBotContext,
  AiBotDecision,
  BotIntent,
  ThreatLevel
} from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('bot');

// Name lists for generating bot names
const FIRST_NAMES_MALE = [
  'Marcus', 'Erik', 'Jonas', 'Otto', 'Karl', 'Henrik', 'Lars', 'Sven',
  'Bjorn', 'Ragnar', 'Leif', 'Olaf', 'Finn', 'Gunnar', 'Torsten', 'Axel'
];

const FIRST_NAMES_FEMALE = [
  'Astrid', 'Freya', 'Ingrid', 'Sigrid', 'Helga', 'Greta', 'Elsa', 'Kara',
  'Luna', 'Vera', 'Nora', 'Ida', 'Maja', 'Liv', 'Saga', 'Thyra'
];

const LAST_NAMES = [
  'Stone', 'Wood', 'Iron', 'Hill', 'River', 'Field', 'Forest', 'Mountain',
  'Hammer', 'Shield', 'Spear', 'Axe', 'Wolf', 'Bear', 'Eagle', 'Oak'
];

/**
 * Generate a random name for a bot
 */
function generateName(gender: Gender): string {
  const firstNames = gender === Gender.MALE ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE;
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${firstName} ${lastName}`;
}

/**
 * Generate random personality traits
 */
function generatePersonality(parentA?: PersonalityTraits, parentB?: PersonalityTraits): PersonalityTraits {
  const randomTrait = (parentValA?: number, parentValB?: number): number => {
    if (parentValA !== undefined && parentValB !== undefined) {
      // Inherit from parents with variation
      const avg = (parentValA + parentValB) / 2;
      const variation = (Math.random() - 0.5) * 30; // ±15
      return Math.max(0, Math.min(100, Math.round(avg + variation)));
    }
    // Random generation
    return Math.floor(Math.random() * 100);
  };

  return {
    bravery: randomTrait(parentA?.bravery, parentB?.bravery),
    curiosity: randomTrait(parentA?.curiosity, parentB?.curiosity),
    sociability: randomTrait(parentA?.sociability, parentB?.sociability),
    industry: randomTrait(parentA?.industry, parentB?.industry),
    creativity: randomTrait(parentA?.creativity, parentB?.creativity),
    aggression: randomTrait(parentA?.aggression, parentB?.aggression),
    loyalty: randomTrait(parentA?.loyalty, parentB?.loyalty),
    wisdom: randomTrait(parentA?.wisdom, parentB?.wisdom)
  };
}

/**
 * Generate initial skills (mostly low for new bots)
 */
function generateSkills(isChild: boolean = true): SkillSet {
  const baseLevel = isChild ? 5 : 20;
  const variation = isChild ? 5 : 15;
  
  const randomSkill = (): number => {
    return Math.max(0, Math.min(100, baseLevel + Math.floor(Math.random() * variation)));
  };

  return {
    mining: randomSkill(),
    farming: randomSkill(),
    building: randomSkill(),
    combat: randomSkill(),
    crafting: randomSkill(),
    trading: randomSkill(),
    leadership: randomSkill(),
    scholarship: randomSkill()
  };
}

/**
 * Generate initial needs (start reasonably satisfied)
 */
function generateNeeds(): NeedsState {
  return {
    hunger: Math.floor(Math.random() * 30),
    energy: Math.floor(Math.random() * 20),
    safety: Math.floor(Math.random() * 20),
    social: Math.floor(Math.random() * 40),
    purpose: Math.floor(Math.random() * 50)
  };
}

export interface BotAgentOptions {
  villageId: string;
  position: Position;
  parentA?: Bot;
  parentB?: Bot;
  gender?: Gender;
  name?: string;
}

/**
 * Bot Agent class - represents a single villager
 */
export class BotAgent {
  private data: Bot;
  private locationTag: string = 'UNKNOWN';
  private nearbyThreatLevel: ThreatLevel = ThreatLevel.NONE;
  private resourceContext: string[] = [];
  private recentEventDescriptions: string[] = [];

  constructor(options: BotAgentOptions) {
    const gender = options.gender ?? (Math.random() > 0.5 ? Gender.MALE : Gender.FEMALE);
    const isChild = !!options.parentA;
    const now = Date.now();

    this.data = {
      id: uuidv4(),
      name: options.name ?? generateName(gender),
      
      age: isChild ? 0 : Math.floor(Math.random() * 40) + 20,
      lifeStage: isChild ? LifeStage.CHILD : LifeStage.ADULT,
      gender,
      
      parentIds: [],
      childIds: [],
      partnerId: undefined,
      
      villageId: options.villageId,
      factionId: undefined,
      role: Role.UNASSIGNED,
      
      personality: generatePersonality(options.parentA?.personality, options.parentB?.personality),
      skills: generateSkills(isChild),
      needs: generateNeeds(),
      mood: Mood.NEUTRAL,
      memories: [],
      relationships: [],
      
      health: 100,
      position: { ...options.position },
      inventory: [],
      
      knownLocations: [],
      
      currentTask: undefined,
      taskQueue: [],
      lastDecisionAt: now,
      
      flags: {
        isDead: false,
        isIdle: true,
        isInDanger: false,
        needsAiDecision: true,
        isBackground: false
      },
      
      createdAt: now,
      updatedAt: now,
      deathCause: undefined
    };

    // Set up parent relationships
    if (options.parentA) {
      this.data.parentIds.push(options.parentA.id);
    }
    if (options.parentB) {
      this.data.parentIds.push(options.parentB.id);
    }

    logger.debug(`Created bot: ${this.data.name} (${this.data.id})`);
  }

  /**
   * Get bot ID
   */
  get id(): string {
    return this.data.id;
  }

  /**
   * Get bot name
   */
  get name(): string {
    return this.data.name;
  }

  /**
   * Get full bot data
   */
  getData(): Bot {
    return { ...this.data };
  }

  /**
   * Get bot position
   */
  getPosition(): Position {
    return { ...this.data.position };
  }

  /**
   * Set bot position
   */
  setPosition(position: Position): void {
    this.data.position = { ...position };
    this.data.updatedAt = Date.now();
  }

  /**
   * Get bot needs
   */
  getNeeds(): NeedsState {
    return { ...this.data.needs };
  }

  /**
   * Get bot role
   */
  getRole(): Role {
    return this.data.role;
  }

  /**
   * Set bot role
   */
  setRole(role: Role): void {
    if (this.data.role !== role) {
      logger.debug(`${this.data.name} role changed: ${this.data.role} -> ${role}`);
      this.data.role = role;
      this.data.updatedAt = Date.now();
    }
  }

  /**
   * Check if bot is dead
   */
  isDead(): boolean {
    return this.data.flags.isDead;
  }

  /**
   * Check if bot needs an AI decision
   */
  needsAiDecision(): boolean {
    return this.data.flags.needsAiDecision && !this.data.flags.isDead;
  }

  /**
   * Check if bot is idle
   */
  isIdle(): boolean {
    return this.data.flags.isIdle;
  }

  /**
   * Check if bot is in danger
   */
  isInDanger(): boolean {
    return this.data.flags.isInDanger;
  }

  /**
   * Update the bot's needs based on time passed
   */
  updateNeeds(deltaMs: number): void {
    const minutesPassed = deltaMs / 60000;
    
    // Hunger increases over time
    this.data.needs.hunger = Math.min(100, this.data.needs.hunger + 2 * minutesPassed);
    
    // Energy decreases when active, increases when resting
    if (this.data.flags.isIdle) {
      this.data.needs.energy = Math.max(0, this.data.needs.energy - 1 * minutesPassed);
    } else {
      this.data.needs.energy = Math.min(100, this.data.needs.energy + 1 * minutesPassed);
    }
    
    // Social need increases when alone
    this.data.needs.social = Math.min(100, this.data.needs.social + 0.5 * minutesPassed);
    
    // Purpose increases when idle
    if (this.data.flags.isIdle) {
      this.data.needs.purpose = Math.min(100, this.data.needs.purpose + 0.3 * minutesPassed);
    }

    // Update mood based on needs
    this.updateMood();
    
    this.data.updatedAt = Date.now();
  }

  /**
   * Update mood based on current needs
   */
  private updateMood(): void {
    const needs = this.data.needs;
    const avgNeed = (needs.hunger + needs.energy + needs.safety + needs.social + needs.purpose) / 5;
    
    if (needs.safety > 70) {
      this.data.mood = Mood.AFRAID;
    } else if (avgNeed > 70) {
      this.data.mood = Mood.STRESSED;
    } else if (avgNeed < 30) {
      this.data.mood = Mood.HAPPY;
    } else {
      this.data.mood = Mood.NEUTRAL;
    }
  }

  /**
   * Set context information for AI decisions
   */
  setContext(
    locationTag: string, 
    threatLevel: ThreatLevel, 
    resources: string[]
  ): void {
    this.locationTag = locationTag;
    this.nearbyThreatLevel = threatLevel;
    this.resourceContext = resources;
    this.data.flags.isInDanger = threatLevel === ThreatLevel.HIGH || threatLevel === ThreatLevel.MEDIUM;
  }

  /**
   * Add a recent event description
   */
  addRecentEvent(event: string): void {
    this.recentEventDescriptions.unshift(event);
    if (this.recentEventDescriptions.length > 5) {
      this.recentEventDescriptions.pop();
    }
  }

  /**
   * Build context for AI decision
   */
  buildAiContext(): AiBotContext {
    return {
      id: this.data.id,
      role: this.data.role,
      lifeStage: this.data.lifeStage,
      needs: { ...this.data.needs },
      mood: this.data.mood,
      locationTag: this.locationTag,
      nearbyThreatLevel: this.nearbyThreatLevel,
      resourceContext: [...this.resourceContext],
      recentEvents: [...this.recentEventDescriptions],
      currentTaskType: this.data.currentTask?.type
    };
  }

  /**
   * Apply an AI decision
   */
  applyDecision(decision: AiBotDecision): void {
    logger.debug(`${this.data.name} received decision: ${decision.intent}`);
    
    // Convert intent to task
    const task = this.intentToTask(decision.intent, decision.details);
    
    if (task) {
      this.data.currentTask = task;
      this.data.flags.isIdle = false;
    }
    
    this.data.flags.needsAiDecision = false;
    this.data.lastDecisionAt = Date.now();
    this.data.updatedAt = Date.now();
  }

  /**
   * Convert a bot intent to a task
   */
  private intentToTask(intent: BotIntent, details?: Record<string, unknown>): Task | undefined {
    const now = Date.now();
    
    switch (intent) {
      case 'IDLE':
        this.data.flags.isIdle = true;
        return undefined;
        
      case 'SLEEP':
        return {
          id: uuidv4(),
          type: 'SLEEP',
          startedAt: now,
          progress: 0,
          priority: 1,
          data: details
        };
        
      case 'EAT':
        return {
          id: uuidv4(),
          type: 'EAT',
          startedAt: now,
          progress: 0,
          priority: 2,
          data: details
        };
        
      case 'TEND_FARM':
      case 'HARVEST_CROPS':
        return {
          id: uuidv4(),
          type: 'FARMING',
          startedAt: now,
          progress: 0,
          priority: 3,
          data: { subType: intent, ...details }
        };
        
      case 'MINE_RESOURCES':
        return {
          id: uuidv4(),
          type: 'MINING',
          startedAt: now,
          progress: 0,
          priority: 3,
          data: details
        };
        
      case 'CHOP_WOOD':
        return {
          id: uuidv4(),
          type: 'WOODCUTTING',
          startedAt: now,
          progress: 0,
          priority: 3,
          data: details
        };
        
      case 'BUILD_STRUCTURE':
        return {
          id: uuidv4(),
          type: 'BUILDING',
          startedAt: now,
          progress: 0,
          priority: 3,
          data: details
        };
        
      case 'PATROL_AREA':
        return {
          id: uuidv4(),
          type: 'PATROL',
          startedAt: now,
          progress: 0,
          priority: 2,
          data: details
        };
        
      case 'DEFEND_LOCATION':
        return {
          id: uuidv4(),
          type: 'DEFEND',
          startedAt: now,
          progress: 0,
          priority: 1,
          data: details
        };
        
      case 'FLEE_TO_SAFETY':
        return {
          id: uuidv4(),
          type: 'FLEE',
          startedAt: now,
          progress: 0,
          priority: 0, // Highest priority
          data: details
        };
        
      case 'SOCIALIZE':
      case 'VISIT_FAMILY':
        return {
          id: uuidv4(),
          type: 'SOCIAL',
          startedAt: now,
          progress: 0,
          priority: 4,
          data: { subType: intent, ...details }
        };
        
      case 'EXPLORE_TERRAIN':
        return {
          id: uuidv4(),
          type: 'EXPLORE',
          startedAt: now,
          progress: 0,
          priority: 5,
          data: details
        };
        
      default:
        logger.warn(`Unknown intent: ${intent}`);
        return undefined;
    }
  }

  /**
   * Update task progress
   */
  updateTask(deltaMs: number): void {
    if (!this.data.currentTask) {
      this.data.flags.isIdle = true;
      this.data.flags.needsAiDecision = true;
      return;
    }

    // Simple progress simulation
    const progressRate = 100 / 30000; // Complete in 30 seconds
    this.data.currentTask.progress = Math.min(100, 
      this.data.currentTask.progress + progressRate * deltaMs);

    // Task complete
    if (this.data.currentTask.progress >= 100) {
      this.completeTask();
    }
  }

  /**
   * Complete the current task
   */
  private completeTask(): void {
    if (!this.data.currentTask) return;

    const task = this.data.currentTask;
    logger.debug(`${this.data.name} completed task: ${task.type}`);

    // Apply task effects
    switch (task.type) {
      case 'EAT':
        this.data.needs.hunger = Math.max(0, this.data.needs.hunger - 50);
        break;
      case 'SLEEP':
        this.data.needs.energy = Math.max(0, this.data.needs.energy - 60);
        break;
      case 'SOCIAL':
        this.data.needs.social = Math.max(0, this.data.needs.social - 40);
        break;
      case 'FARMING':
      case 'MINING':
      case 'WOODCUTTING':
      case 'BUILDING':
        this.data.needs.purpose = Math.max(0, this.data.needs.purpose - 30);
        break;
    }

    // Clear task and request new decision
    this.data.currentTask = undefined;
    this.data.flags.isIdle = true;
    this.data.flags.needsAiDecision = true;
    this.data.updatedAt = Date.now();
  }

  /**
   * Add a memory
   */
  addMemory(memory: Omit<Memory, 'id'>): void {
    const fullMemory: Memory = {
      ...memory,
      id: uuidv4()
    };
    
    this.data.memories.push(fullMemory);
    
    // Keep only the most significant memories (limit to 50)
    if (this.data.memories.length > 50) {
      this.data.memories.sort((a, b) => b.significance - a.significance);
      this.data.memories = this.data.memories.slice(0, 50);
    }
  }

  /**
   * Kill the bot
   */
  die(cause: string): void {
    if (this.data.flags.isDead) return;
    
    logger.info(`${this.data.name} died: ${cause}`);
    this.data.flags.isDead = true;
    this.data.deathCause = cause;
    this.data.health = 0;
    this.data.updatedAt = Date.now();
  }

  /**
   * Age the bot
   */
  incrementAge(amount: number = 1): void {
    this.data.age += amount;
    
    // Update life stage based on age
    // Assuming max lifespan of 100 simulation units
    const agePercent = (this.data.age / 100) * 100;
    
    if (agePercent < 20) {
      this.data.lifeStage = LifeStage.CHILD;
    } else if (agePercent < 35) {
      this.data.lifeStage = LifeStage.TEEN;
    } else if (agePercent < 80) {
      this.data.lifeStage = LifeStage.ADULT;
    } else {
      this.data.lifeStage = LifeStage.ELDER;
    }
    
    // Check for death by old age
    if (this.data.age > 100) {
      const deathChance = (this.data.age - 100) * 0.1; // 10% per unit over 100
      if (Math.random() < deathChance) {
        this.die('old age');
      }
    }
    
    this.data.updatedAt = Date.now();
  }

  /**
   * Serialize bot data for persistence
   */
  serialize(): Bot {
    return { ...this.data };
  }

  /**
   * Load bot data from serialized state
   */
  static deserialize(data: Bot): BotAgent {
    const agent = new BotAgent({
      villageId: data.villageId,
      position: data.position
    });
    agent.data = { ...data };
    return agent;
  }
}

export default BotAgent;
