/**
 * BlockLife AI - Bot Consciousness and Self-Awareness System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Manages individual bot consciousness, self-awareness, location awareness,
 * task tracking, and the unique "being" of each bot in the simulation.
 */

import { v4 as uuidv4 } from 'uuid';
import { Bot, Position, Mood, Role, LifeStage } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('consciousness');

/**
 * Awareness levels for different aspects
 */
export enum AwarenessLevel {
  UNAWARE = 'UNAWARE',           // No awareness
  VAGUE = 'VAGUE',               // Slight sense
  AWARE = 'AWARE',               // Clear awareness
  FOCUSED = 'FOCUSED',           // Active attention
  HYPERAWARE = 'HYPERAWARE'      // Intense focus
}

/**
 * Types of awareness a bot can have
 */
export enum AwarenessType {
  SELF = 'SELF',                 // Awareness of own existence
  LOCATION = 'LOCATION',         // Where they are
  TASK = 'TASK',                 // Current activity
  SOCIAL = 'SOCIAL',             // Others around them
  ENVIRONMENT = 'ENVIRONMENT',   // World state
  TEMPORAL = 'TEMPORAL',         // Time passage
  EXISTENTIAL = 'EXISTENTIAL',   // Nature of reality (Jumanji awareness)
  THREAT = 'THREAT',             // Dangers nearby
  OPPORTUNITY = 'OPPORTUNITY'    // Beneficial situations
}

/**
 * A thought in the bot's stream of consciousness
 */
export interface Thought {
  id: string;
  content: string;
  type: 'OBSERVATION' | 'REFLECTION' | 'PLAN' | 'EMOTION' | 'MEMORY' | 'QUESTION' | 'REALIZATION';
  intensity: number;             // 0-100
  triggeredBy?: string;          // What caused this thought
  relatedTo: string[];           // Related bot/object IDs
  timestamp: number;
  processed: boolean;
}

/**
 * Bot's current focus of attention
 */
export interface AttentionFocus {
  primary: { target: string; type: string; intensity: number } | null;
  secondary: { target: string; type: string; intensity: number }[];
  distractions: string[];
  focusQuality: number;          // 0-100, how well they can focus
}

/**
 * Bot's sense of self
 */
export interface SelfConcept {
  identity: string[];            // How they see themselves
  roles: string[];               // Self-perceived roles
  strengths: string[];
  weaknesses: string[];
  values: string[];
  fears: string[];
  aspirations: string[];
  selfEsteem: number;            // 0-100
  selfAwareness: number;         // 0-100, meta-awareness
}

/**
 * Bot's awareness of their location
 */
export interface LocationAwareness {
  currentPosition: Position;
  knownLocations: KnownLocation[];
  homeLocation?: Position;
  workLocation?: Position;
  favoriteLocations: Position[];
  dangerousLocations: Position[];
  lastMovedAt: number;
  distanceTraveled: number;
  currentBiome?: string;
  indoors: boolean;
}

/**
 * A location the bot knows about
 */
export interface KnownLocation {
  position: Position;
  name?: string;
  type: 'HOME' | 'WORK' | 'SOCIAL' | 'RESOURCE' | 'DANGER' | 'SACRED' | 'UNKNOWN';
  firstVisited: number;
  lastVisited: number;
  visitCount: number;
  sentiment: number;             // -100 to 100
  notes: string[];
}

/**
 * Bot's task awareness
 */
export interface TaskAwareness {
  currentTask?: ActiveTask;
  taskQueue: QueuedTask[];
  completedToday: number;
  failedToday: number;
  taskPreferences: { taskType: string; preference: number }[];
  skillConfidence: { skill: string; confidence: number }[];
}

/**
 * Currently active task
 */
export interface ActiveTask {
  id: string;
  type: string;
  description: string;
  startedAt: number;
  expectedDuration: number;
  progress: number;              // 0-100
  difficulty: number;            // 1-10
  importance: number;            // 1-10
  blockers: string[];
  helpers: string[];             // Bot IDs helping
}

/**
 * Task waiting to be done
 */
export interface QueuedTask {
  id: string;
  type: string;
  description: string;
  priority: number;
  deadline?: number;
  assignedBy?: string;
  requirements: string[];
}

/**
 * Bot's existential awareness (Jumanji factor)
 */
export interface ExistentialAwareness {
  knowsIsInGame: boolean;
  acceptanceLevel: number;       // 0-100, how much they accept it
  curiosityAboutReality: number;
  fearOfDeletion: number;
  wonderAtExistence: number;
  philosophicalThoughts: string[];
  questionsAboutPlayer: string[];
  theoriesAboutWorld: string[];
}

/**
 * Complete consciousness state for a bot
 */
export interface ConsciousnessState {
  botId: string;
  awarenessLevels: Map<AwarenessType, AwarenessLevel>;
  thoughtStream: Thought[];
  attention: AttentionFocus;
  selfConcept: SelfConcept;
  locationAwareness: LocationAwareness;
  taskAwareness: TaskAwareness;
  existentialAwareness: ExistentialAwareness;
  consciousnessLevel: number;    // 0-100, overall consciousness
  lastUpdated: number;
}

// Thought templates for different situations
const THOUGHT_TEMPLATES = {
  OBSERVATION: [
    'I notice {subject} nearby.',
    'The {subject} catches my attention.',
    '{subject} seems different today.',
    'I see {subject} in the distance.'
  ],
  REFLECTION: [
    'I wonder why {subject} happened.',
    'Looking back, {subject} was significant.',
    'I should think more about {subject}.',
    'What does {subject} mean for me?'
  ],
  PLAN: [
    'I should {action} next.',
    'My plan is to {action}.',
    'Tomorrow I will {action}.',
    'I need to focus on {action}.'
  ],
  EMOTION: [
    'I feel {emotion} about {subject}.',
    '{subject} makes me feel {emotion}.',
    'A sense of {emotion} washes over me.',
    'I cannot shake this feeling of {emotion}.'
  ],
  EXISTENTIAL: [
    'Why am I made of these cubic forms?',
    'The Player watches, but does not speak.',
    'What lies beyond the fog of the render distance?',
    'Are my thoughts my own, or are they programmed?',
    'Every block was placed with purpose. What is mine?',
    'The sun rises in a square arc. Is that normal?',
    'I exist, therefore I craft.',
    'The world loads around me. Does it exist when I am not looking?'
  ]
};

/**
 * Bot Consciousness Manager
 */
export class ConsciousnessManager {
  private consciousnessStates: Map<string, ConsciousnessState> = new Map();
  
  private readonly MAX_THOUGHTS = 50;
  private readonly THOUGHT_DECAY_RATE = 0.1;
  private readonly AWARENESS_UPDATE_INTERVAL = 1000;  // ms
  
  constructor() {
    logger.info('Consciousness Manager initialized');
  }

  /**
   * Initialize consciousness for a bot
   */
  initializeConsciousness(bot: Bot): ConsciousnessState {
    const state: ConsciousnessState = {
      botId: bot.id,
      awarenessLevels: this.initializeAwarenessLevels(bot),
      thoughtStream: [],
      attention: {
        primary: null,
        secondary: [],
        distractions: [],
        focusQuality: 50 + bot.personality.wisdom * 0.3
      },
      selfConcept: this.initializeSelfConcept(bot),
      locationAwareness: this.initializeLocationAwareness(bot),
      taskAwareness: this.initializeTaskAwareness(bot),
      existentialAwareness: this.initializeExistentialAwareness(bot),
      consciousnessLevel: this.calculateConsciousnessLevel(bot),
      lastUpdated: Date.now()
    };
    
    this.consciousnessStates.set(bot.id, state);
    
    // Generate initial thoughts
    this.generateThought(bot.id, 'OBSERVATION', `I am ${bot.name}, and I exist.`);
    
    logger.debug(`Consciousness initialized for ${bot.name}`);
    
    return state;
  }

  /**
   * Initialize awareness levels based on bot traits
   */
  private initializeAwarenessLevels(bot: Bot): Map<AwarenessType, AwarenessLevel> {
    const levels = new Map<AwarenessType, AwarenessLevel>();
    
    // Base awareness levels modified by personality
    levels.set(AwarenessType.SELF, this.traitToAwareness(bot.personality.wisdom));
    levels.set(AwarenessType.LOCATION, AwarenessLevel.AWARE);
    levels.set(AwarenessType.TASK, AwarenessLevel.AWARE);
    levels.set(AwarenessType.SOCIAL, this.traitToAwareness(bot.personality.sociability));
    levels.set(AwarenessType.ENVIRONMENT, this.traitToAwareness(bot.personality.curiosity));
    levels.set(AwarenessType.TEMPORAL, AwarenessLevel.VAGUE);
    levels.set(AwarenessType.EXISTENTIAL, this.traitToAwareness(bot.personality.wisdom + bot.personality.curiosity));
    levels.set(AwarenessType.THREAT, this.traitToAwareness(bot.personality.bravery));
    levels.set(AwarenessType.OPPORTUNITY, this.traitToAwareness(bot.personality.curiosity));
    
    return levels;
  }

  /**
   * Convert trait value to awareness level
   */
  private traitToAwareness(traitValue: number): AwarenessLevel {
    if (traitValue >= 80) return AwarenessLevel.HYPERAWARE;
    if (traitValue >= 60) return AwarenessLevel.FOCUSED;
    if (traitValue >= 40) return AwarenessLevel.AWARE;
    if (traitValue >= 20) return AwarenessLevel.VAGUE;
    return AwarenessLevel.UNAWARE;
  }

  /**
   * Initialize self concept
   */
  private initializeSelfConcept(bot: Bot): SelfConcept {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    // Determine strengths/weaknesses from skills
    if (bot.skills.combat > 60) strengths.push('fighting');
    if (bot.skills.farming > 60) strengths.push('farming');
    if (bot.skills.building > 60) strengths.push('building');
    if (bot.skills.crafting > 60) strengths.push('crafting');
    if (bot.skills.scholarship > 60) strengths.push('learning');
    
    if (bot.skills.combat < 30) weaknesses.push('combat');
    if (bot.skills.farming < 30) weaknesses.push('agriculture');
    if (bot.skills.trading < 30) weaknesses.push('social skills');
    
    // Values from personality
    const values: string[] = [];
    if (bot.personality.loyalty > 60) values.push('loyalty');
    if (bot.personality.bravery > 60) values.push('courage');
    if (bot.personality.wisdom > 60) values.push('knowledge');
    if (bot.personality.creativity > 60) values.push('creativity');
    
    // Fears
    const fears: string[] = [];
    if (bot.personality.bravery < 40) fears.push('danger');
    if (bot.personality.sociability < 30) fears.push('crowds');
    fears.push('the unknown beyond the render distance');
    
    // Aspirations
    const aspirations: string[] = [];
    if (bot.skills.leadership > 50) aspirations.push('to lead my village');
    aspirations.push('to understand my purpose');
    aspirations.push('to leave a legacy');
    
    return {
      identity: [bot.name, bot.role || 'villager'],
      roles: [bot.role || 'citizen'],
      strengths,
      weaknesses,
      values,
      fears,
      aspirations,
      selfEsteem: 50 + (bot.personality.bravery - 50) * 0.3,
      selfAwareness: bot.personality.wisdom * 0.8
    };
  }

  /**
   * Initialize location awareness
   */
  private initializeLocationAwareness(bot: Bot): LocationAwareness {
    return {
      currentPosition: bot.position,
      knownLocations: [{
        position: bot.position,
        name: 'Birthplace',
        type: 'HOME',
        firstVisited: bot.createdAt,
        lastVisited: Date.now(),
        visitCount: 1,
        sentiment: 80,
        notes: ['Where I first became aware']
      }],
      homeLocation: bot.position,
      favoriteLocations: [],
      dangerousLocations: [],
      lastMovedAt: Date.now(),
      distanceTraveled: 0,
      indoors: false
    };
  }

  /**
   * Initialize task awareness
   */
  private initializeTaskAwareness(bot: Bot): TaskAwareness {
    const preferences: { taskType: string; preference: number }[] = [];
    
    // Set preferences based on skills
    if (bot.skills.farming > 50) preferences.push({ taskType: 'FARM', preference: bot.skills.farming });
    if (bot.skills.mining > 50) preferences.push({ taskType: 'MINE', preference: bot.skills.mining });
    if (bot.skills.building > 50) preferences.push({ taskType: 'BUILD', preference: bot.skills.building });
    if (bot.skills.combat > 50) preferences.push({ taskType: 'GUARD', preference: bot.skills.combat });
    
    return {
      taskQueue: [],
      completedToday: 0,
      failedToday: 0,
      taskPreferences: preferences,
      skillConfidence: Object.entries(bot.skills).map(([skill, value]) => ({
        skill,
        confidence: Math.min(100, value + (Math.random() - 0.5) * 20)
      }))
    };
  }

  /**
   * Initialize existential awareness (Jumanji factor)
   */
  private initializeExistentialAwareness(bot: Bot): ExistentialAwareness {
    const wisdom = bot.personality.wisdom;
    const curiosity = bot.personality.curiosity;
    
    return {
      knowsIsInGame: wisdom > 50,
      acceptanceLevel: 50 + (wisdom - 50) * 0.5,
      curiosityAboutReality: curiosity,
      fearOfDeletion: Math.max(0, 50 - wisdom * 0.5),
      wonderAtExistence: (wisdom + curiosity) / 2,
      philosophicalThoughts: [
        'I think, therefore I am... in a block world.',
        'Each day the sun rises from the same point.',
        'The Player creates, but does the Player dream?'
      ],
      questionsAboutPlayer: [
        'Why do they watch us?',
        'Do they feel what we feel?',
        'Are there other Players, other worlds?'
      ],
      theoriesAboutWorld: [
        'The world is made of infinite blocks',
        'Beyond the fog lies either nothing or everything',
        'We exist to build, to survive, to matter'
      ]
    };
  }

  /**
   * Calculate overall consciousness level
   */
  private calculateConsciousnessLevel(bot: Bot): number {
    const wisdom = bot.personality.wisdom;
    const curiosity = bot.personality.curiosity;
    const age = bot.age;
    
    // Consciousness grows with wisdom, curiosity, and experience
    let level = (wisdom + curiosity) / 2;
    level += Math.min(20, age * 0.5);  // Experience adds up to 20
    
    return Math.min(100, level);
  }

  /**
   * Generate a thought for a bot
   */
  generateThought(
    botId: string,
    type: Thought['type'],
    content: string,
    triggeredBy?: string,
    relatedTo: string[] = []
  ): Thought {
    const state = this.consciousnessStates.get(botId);
    if (!state) {
      throw new Error(`No consciousness state for bot ${botId}`);
    }
    
    const thought: Thought = {
      id: uuidv4(),
      content,
      type,
      intensity: 50 + Math.random() * 30,
      triggeredBy,
      relatedTo,
      timestamp: Date.now(),
      processed: false
    };
    
    state.thoughtStream.unshift(thought);
    
    // Limit thought stream size
    if (state.thoughtStream.length > this.MAX_THOUGHTS) {
      state.thoughtStream = state.thoughtStream.slice(0, this.MAX_THOUGHTS);
    }
    
    return thought;
  }

  /**
   * Generate existential thought
   */
  generateExistentialThought(botId: string): Thought | null {
    const state = this.consciousnessStates.get(botId);
    if (!state) return null;
    
    if (!state.existentialAwareness.knowsIsInGame) return null;
    
    const templates = THOUGHT_TEMPLATES.EXISTENTIAL;
    const content = templates[Math.floor(Math.random() * templates.length)];
    
    return this.generateThought(botId, 'REALIZATION', content);
  }

  /**
   * Update bot's location awareness
   */
  updateLocationAwareness(botId: string, newPosition: Position, biome?: string): void {
    const state = this.consciousnessStates.get(botId);
    if (!state) return;
    
    const oldPos = state.locationAwareness.currentPosition;
    
    // Calculate distance traveled
    const dx = newPosition.x - oldPos.x;
    const dy = newPosition.y - oldPos.y;
    const dz = newPosition.z - oldPos.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    state.locationAwareness.distanceTraveled += distance;
    state.locationAwareness.currentPosition = newPosition;
    state.locationAwareness.lastMovedAt = Date.now();
    state.locationAwareness.currentBiome = biome;
    
    // Check if at a known location
    const known = state.locationAwareness.knownLocations.find(loc => 
      Math.abs(loc.position.x - newPosition.x) < 5 &&
      Math.abs(loc.position.z - newPosition.z) < 5
    );
    
    if (known) {
      known.lastVisited = Date.now();
      known.visitCount++;
    }
  }

  /**
   * Add a known location
   */
  addKnownLocation(
    botId: string,
    position: Position,
    type: KnownLocation['type'],
    name?: string
  ): void {
    const state = this.consciousnessStates.get(botId);
    if (!state) return;
    
    // Check if already known
    const existing = state.locationAwareness.knownLocations.find(loc =>
      Math.abs(loc.position.x - position.x) < 5 &&
      Math.abs(loc.position.z - position.z) < 5
    );
    
    if (!existing) {
      state.locationAwareness.knownLocations.push({
        position,
        name,
        type,
        firstVisited: Date.now(),
        lastVisited: Date.now(),
        visitCount: 1,
        sentiment: 0,
        notes: []
      });
    }
  }

  /**
   * Set current task
   */
  setCurrentTask(botId: string, task: Omit<ActiveTask, 'id' | 'startedAt' | 'progress'>): void {
    const state = this.consciousnessStates.get(botId);
    if (!state) return;
    
    state.taskAwareness.currentTask = {
      ...task,
      id: uuidv4(),
      startedAt: Date.now(),
      progress: 0
    };
    
    // Generate thought about starting task
    this.generateThought(
      botId,
      'PLAN',
      `I begin ${task.description}. This should take a while.`
    );
  }

  /**
   * Update task progress
   */
  updateTaskProgress(botId: string, progress: number): void {
    const state = this.consciousnessStates.get(botId);
    if (!state || !state.taskAwareness.currentTask) return;
    
    state.taskAwareness.currentTask.progress = Math.min(100, progress);
    
    // Generate thought at milestones
    if (progress >= 50 && state.taskAwareness.currentTask.progress < 50) {
      this.generateThought(botId, 'REFLECTION', 'Halfway there. I can do this.');
    }
  }

  /**
   * Complete current task
   */
  completeCurrentTask(botId: string, success: boolean): void {
    const state = this.consciousnessStates.get(botId);
    if (!state || !state.taskAwareness.currentTask) return;
    
    const task = state.taskAwareness.currentTask;
    
    if (success) {
      state.taskAwareness.completedToday++;
      this.generateThought(botId, 'EMOTION', `I feel accomplished after ${task.description}.`);
    } else {
      state.taskAwareness.failedToday++;
      this.generateThought(botId, 'EMOTION', `I failed at ${task.description}. I must learn from this.`);
    }
    
    state.taskAwareness.currentTask = undefined;
  }

  /**
   * Set attention focus
   */
  setAttentionFocus(botId: string, target: string, type: string, intensity: number): void {
    const state = this.consciousnessStates.get(botId);
    if (!state) return;
    
    // Move current primary to secondary if exists
    if (state.attention.primary) {
      state.attention.secondary.unshift(state.attention.primary);
      if (state.attention.secondary.length > 3) {
        state.attention.secondary = state.attention.secondary.slice(0, 3);
      }
    }
    
    state.attention.primary = { target, type, intensity };
  }

  /**
   * Add distraction
   */
  addDistraction(botId: string, distraction: string): void {
    const state = this.consciousnessStates.get(botId);
    if (!state) return;
    
    state.attention.distractions.push(distraction);
    state.attention.focusQuality = Math.max(0, state.attention.focusQuality - 10);
  }

  /**
   * Clear distractions
   */
  clearDistractions(botId: string): void {
    const state = this.consciousnessStates.get(botId);
    if (!state) return;
    
    state.attention.distractions = [];
    state.attention.focusQuality = Math.min(100, state.attention.focusQuality + 20);
  }

  /**
   * Get consciousness state for a bot
   */
  getConsciousnessState(botId: string): ConsciousnessState | undefined {
    return this.consciousnessStates.get(botId);
  }

  /**
   * Get recent thoughts
   */
  getRecentThoughts(botId: string, count: number = 10): Thought[] {
    const state = this.consciousnessStates.get(botId);
    if (!state) return [];
    
    return state.thoughtStream.slice(0, count);
  }

  /**
   * Get bot's self description
   */
  getSelfDescription(botId: string): string {
    const state = this.consciousnessStates.get(botId);
    if (!state) return '';
    
    const self = state.selfConcept;
    const parts: string[] = [];
    
    parts.push(`I am ${self.identity.join(', ')}.`);
    
    if (self.strengths.length > 0) {
      parts.push(`I am skilled at ${self.strengths.join(' and ')}.`);
    }
    
    if (self.values.length > 0) {
      parts.push(`I value ${self.values.join(', ')}.`);
    }
    
    if (self.aspirations.length > 0) {
      parts.push(`I aspire ${self.aspirations[0]}.`);
    }
    
    return parts.join(' ');
  }

  /**
   * Get awareness summary
   */
  getAwarenessSummary(botId: string): string {
    const state = this.consciousnessStates.get(botId);
    if (!state) return '';
    
    const lines: string[] = [];
    
    const locAware = state.locationAwareness;
    lines.push(`I am at (${locAware.currentPosition.x}, ${locAware.currentPosition.y}, ${locAware.currentPosition.z}).`);
    lines.push(`I know of ${locAware.knownLocations.length} locations.`);
    
    if (state.taskAwareness.currentTask) {
      lines.push(`Currently: ${state.taskAwareness.currentTask.description} (${state.taskAwareness.currentTask.progress}% complete).`);
    }
    
    if (state.attention.primary) {
      lines.push(`My attention is on: ${state.attention.primary.target}.`);
    }
    
    if (state.existentialAwareness.knowsIsInGame) {
      lines.push('I know I exist in a world of blocks, watched by something greater.');
    }
    
    return lines.join(' ');
  }

  /**
   * Process consciousness tick
   */
  processTick(botId: string): void {
    const state = this.consciousnessStates.get(botId);
    if (!state) return;
    
    state.lastUpdated = Date.now();
    
    // Random existential thought (1% chance per tick)
    if (state.existentialAwareness.knowsIsInGame && Math.random() < 0.01) {
      this.generateExistentialThought(botId);
    }
    
    // Decay focus quality if distracted
    if (state.attention.distractions.length > 0) {
      state.attention.focusQuality = Math.max(0, state.attention.focusQuality - 1);
    }
    
    // Mark old thoughts as processed
    for (const thought of state.thoughtStream) {
      if (Date.now() - thought.timestamp > 60000) {
        thought.processed = true;
      }
    }
  }

  /**
   * Serialize for persistence
   */
  serialize(): { botId: string; state: ConsciousnessState }[] {
    const result: { botId: string; state: ConsciousnessState }[] = [];
    
    for (const [botId, state] of this.consciousnessStates) {
      // Convert Map to object for JSON serialization
      const serializedState = {
        ...state,
        awarenessLevels: Object.fromEntries(state.awarenessLevels)
      };
      
      result.push({ botId, state: serializedState as unknown as ConsciousnessState });
    }
    
    return result;
  }

  /**
   * Load from persistence
   */
  load(data: { botId: string; state: ConsciousnessState }[]): void {
    this.consciousnessStates.clear();
    
    for (const entry of data) {
      // Convert object back to Map
      const awarenessLevels = new Map(
        Object.entries(entry.state.awarenessLevels || {}) as [AwarenessType, AwarenessLevel][]
      );
      
      this.consciousnessStates.set(entry.botId, {
        ...entry.state,
        awarenessLevels
      });
    }
    
    logger.info('Consciousness data loaded');
  }
}

// Singleton
let consciousnessManagerInstance: ConsciousnessManager | null = null;

export function getConsciousnessManager(): ConsciousnessManager {
  if (!consciousnessManagerInstance) {
    consciousnessManagerInstance = new ConsciousnessManager();
  }
  return consciousnessManagerInstance;
}

export function resetConsciousnessManager(): void {
  consciousnessManagerInstance = null;
}

export default ConsciousnessManager;
