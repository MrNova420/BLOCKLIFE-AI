/**
 * BlockLife AI - Bot Consciousness System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * INDIVIDUAL BOT AI MINDS
 * Each bot has its own consciousness that:
 * - Makes independent decisions based on personality, needs, and environment
 * - Processes its own circumstances (hunger, danger, tasks, goals)
 * - Can be building while another is farming while another is exploring
 * - Runs from the same AI model but with individual context/state
 * 
 * This enables truly autonomous, parallel behavior across all bots.
 */

import { Bot, Role, BotIntent, Position, Village, PersonalityTraits } from '../types';
import { getMinecraftDataSource } from '../knowledge/minecraft-data-source';
import { getMinecraftKnowledge, SkillLevel, KnowledgeCategory } from './minecraft-knowledge';
import { createLogger } from '../utils/logger';

const logger = createLogger('bot-consciousness');

// ============================================================================
// CONSCIOUSNESS TYPES
// ============================================================================

export enum ThoughtPriority {
  CRITICAL = 1,    // Life-threatening (drowning, on fire, very low health)
  URGENT = 2,      // Needs attention soon (hunger, hostile mob nearby)
  HIGH = 3,        // Important (assigned task, building project)
  NORMAL = 4,      // Regular activities (socializing, exploring)
  LOW = 5,         // Can wait (decoration, optimization)
  IDLE = 6         // Nothing pressing (rest, wander)
}

export interface Thought {
  id: string;
  priority: ThoughtPriority;
  category: 'SURVIVAL' | 'WORK' | 'SOCIAL' | 'EXPLORATION' | 'COMBAT' | 'REST' | 'GOAL';
  content: string;
  action?: BotIntent;
  target?: string;
  position?: Position;
  createdAt: number;
  expiresAt?: number;
}

export interface Memory {
  id: string;
  type: 'LOCATION' | 'PERSON' | 'EVENT' | 'RESOURCE' | 'DANGER' | 'SKILL';
  subject: string;
  details: Record<string, any>;
  importance: number;  // 0-100
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
}

export interface Goal {
  id: string;
  description: string;
  type: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM' | 'LIFE_GOAL';
  progress: number;  // 0-100
  steps: { description: string; completed: boolean }[];
  priority: number;
  createdAt: number;
  deadline?: number;
}

export interface Perception {
  nearbyEntities: { name: string; type: string; distance: number; hostile: boolean }[];
  nearbyBlocks: { name: string; position: Position; distance: number }[];
  nearbyPlayers: { name: string; distance: number }[];
  currentBiome: string;
  timeOfDay: 'DAWN' | 'DAY' | 'DUSK' | 'NIGHT';
  weather: 'CLEAR' | 'RAIN' | 'THUNDER';
  lightLevel: number;
  isUnderground: boolean;
  isInWater: boolean;
  isOnFire: boolean;
}

export interface BotState {
  health: number;
  hunger: number;
  position: Position;
  inventory: { item: string; count: number }[];
  equipment: { slot: string; item: string | null }[];
  effects: { name: string; duration: number; level: number }[];
  experience: number;
  currentAction: string | null;
}

// ============================================================================
// BOT CONSCIOUSNESS CLASS
// ============================================================================

export class BotConsciousness {
  private botId: string;
  private botName: string;
  private role: Role;
  private personality: PersonalityTraits;
  
  // Mental state
  private thoughts: Thought[] = [];
  private memories: Memory[] = [];
  private goals: Goal[] = [];
  private currentThought: Thought | null = null;
  
  // State tracking
  private lastState: BotState | null = null;
  private lastPerception: Perception | null = null;
  private lastDecisionTime: number = 0;
  private decisionCooldown: number = 1000; // ms between decisions
  
  // Personality modifiers (derived from PersonalityTraits)
  private bravery: number = 50;      // 0=coward, 100=fearless
  private diligence: number = 50;    // 0=lazy, 100=workaholic
  private curiosityLevel: number = 50;    // 0=homebody, 100=explorer
  private sociabilityLevel: number = 50;  // 0=loner, 100=social butterfly
  private creativityLevel: number = 50;   // 0=practical, 100=artistic
  
  // Knowledge reference
  private mcData = getMinecraftDataSource();
  private knowledge = getMinecraftKnowledge();
  
  constructor(bot: Bot) {
    this.botId = bot.id;
    this.botName = bot.name;
    this.role = bot.role;
    this.personality = bot.personality;
    
    this.initializePersonality();
    this.initializeGoals();
    
    logger.debug(`Consciousness initialized for ${this.botName} (${this.role})`);
  }

  /**
   * Initialize personality based on PersonalityTraits
   */
  private initializePersonality(): void {
    // Map PersonalityTraits to our consciousness modifiers
    this.bravery = this.personality.bravery;
    this.diligence = this.personality.industry;
    this.curiosityLevel = this.personality.curiosity;
    this.sociabilityLevel = this.personality.sociability;
    this.creativityLevel = this.personality.creativity;
  }

  /**
   * Initialize default goals based on role
   */
  private initializeGoals(): void {
    // Universal goals
    this.goals.push({
      id: 'survive',
      description: 'Stay alive and healthy',
      type: 'LIFE_GOAL',
      progress: 100,
      steps: [
        { description: 'Maintain food supply', completed: false },
        { description: 'Avoid dangers', completed: false },
        { description: 'Have shelter', completed: false }
      ],
      priority: 1,
      createdAt: Date.now()
    });

    // Role-specific goals
    switch (this.role) {
      case Role.MINER:
        this.goals.push({
          id: 'mine_resources',
          description: 'Gather valuable ores for the village',
          type: 'LONG_TERM',
          progress: 0,
          steps: [
            { description: 'Find a mine location', completed: false },
            { description: 'Mine coal for torches', completed: false },
            { description: 'Mine iron for tools', completed: false },
            { description: 'Find diamonds', completed: false }
          ],
          priority: 2,
          createdAt: Date.now()
        });
        break;
        
      case Role.FARMER:
        this.goals.push({
          id: 'establish_farms',
          description: 'Create sustainable food production',
          type: 'LONG_TERM',
          progress: 0,
          steps: [
            { description: 'Prepare farmland', completed: false },
            { description: 'Plant crops', completed: false },
            { description: 'Set up irrigation', completed: false },
            { description: 'Harvest regularly', completed: false }
          ],
          priority: 2,
          createdAt: Date.now()
        });
        break;
        
      case Role.BUILDER:
        this.goals.push({
          id: 'build_village',
          description: 'Construct buildings for the village',
          type: 'LONG_TERM',
          progress: 0,
          steps: [
            { description: 'Gather building materials', completed: false },
            { description: 'Build shelters', completed: false },
            { description: 'Create storage facilities', completed: false },
            { description: 'Build defensive walls', completed: false }
          ],
          priority: 2,
          createdAt: Date.now()
        });
        break;
        
      case Role.GUARD:
        this.goals.push({
          id: 'protect_village',
          description: 'Keep the village safe from threats',
          type: 'LONG_TERM',
          progress: 0,
          steps: [
            { description: 'Patrol the perimeter', completed: false },
            { description: 'Eliminate nearby threats', completed: false },
            { description: 'Train combat skills', completed: false },
            { description: 'Equip better armor', completed: false }
          ],
          priority: 2,
          createdAt: Date.now()
        });
        break;
        
      case Role.SCOUT:
        this.goals.push({
          id: 'explore_world',
          description: 'Discover new areas and resources',
          type: 'LONG_TERM',
          progress: 0,
          steps: [
            { description: 'Map nearby biomes', completed: false },
            { description: 'Find villages', completed: false },
            { description: 'Locate dungeons/structures', completed: false },
            { description: 'Discover rare resources', completed: false }
          ],
          priority: 2,
          createdAt: Date.now()
        });
        break;

      default:
        this.goals.push({
          id: 'contribute',
          description: 'Help the village in any way possible',
          type: 'LONG_TERM',
          progress: 0,
          steps: [
            { description: 'Follow instructions', completed: false },
            { description: 'Learn skills', completed: false },
            { description: 'Assist others', completed: false }
          ],
          priority: 2,
          createdAt: Date.now()
        });
    }
  }

  // ============================================================================
  // PERCEPTION
  // ============================================================================

  /**
   * Process environmental input and update perception
   */
  updatePerception(perception: Perception): void {
    this.lastPerception = perception;
    
    // Generate thoughts based on perception
    this.processEnvironment(perception);
  }

  /**
   * Update bot state
   */
  updateState(state: BotState): void {
    this.lastState = state;
    
    // Generate thoughts based on state changes
    this.processNeeds(state);
  }

  /**
   * Process environmental stimuli
   */
  private processEnvironment(perception: Perception): void {
    // Check for immediate dangers
    const hostiles = perception.nearbyEntities.filter(e => e.hostile && e.distance < 10);
    if (hostiles.length > 0) {
      const closest = hostiles.sort((a, b) => a.distance - b.distance)[0];
      
      if (this.bravery > 60 || (this.role === Role.GUARD && this.bravery > 30)) {
        this.addThought({
          id: `combat_${closest.name}_${Date.now()}`,
          priority: ThoughtPriority.URGENT,
          category: 'COMBAT',
          content: `${closest.name} is nearby (${closest.distance.toFixed(1)} blocks). I should fight it.`,
          action: 'DEFEND_LOCATION',
          target: closest.name
        });
      } else {
        this.addThought({
          id: `flee_${closest.name}_${Date.now()}`,
          priority: ThoughtPriority.CRITICAL,
          category: 'SURVIVAL',
          content: `${closest.name} is too close! I need to run!`,
          action: 'FLEE_TO_SAFETY',
          target: closest.name
        });
      }
    }

    // Fire/water danger
    if (perception.isOnFire) {
      this.addThought({
        id: `fire_${Date.now()}`,
        priority: ThoughtPriority.CRITICAL,
        category: 'SURVIVAL',
        content: 'I\'m on fire! Need to find water!',
        action: 'FLEE_TO_SAFETY'
      });
    }

    if (perception.isInWater && this.lastState && this.lastState.health < 10) {
      this.addThought({
        id: `drowning_${Date.now()}`,
        priority: ThoughtPriority.CRITICAL,
        category: 'SURVIVAL',
        content: 'I might drown! Need to get to surface!',
        action: 'FLEE_TO_SAFETY'
      });
    }

    // Night time considerations
    if (perception.timeOfDay === 'NIGHT' && !perception.isUnderground) {
      if (this.bravery < 40) {
        this.addThought({
          id: `night_shelter_${Date.now()}`,
          priority: ThoughtPriority.HIGH,
          category: 'SURVIVAL',
          content: 'It\'s dark outside. I should find shelter.',
          action: 'FLEE_TO_SAFETY'
        });
      }
    }

    // Exploration opportunities
    if (this.curiosityLevel > 60 && perception.nearbyBlocks.length > 0) {
      const interestingBlocks = perception.nearbyBlocks.filter(b => 
        b.name.includes('ore') || b.name.includes('chest') || b.name.includes('spawner')
      );
      
      if (interestingBlocks.length > 0) {
        const target = interestingBlocks[0];
        this.addThought({
          id: `explore_${target.name}_${Date.now()}`,
          priority: ThoughtPriority.NORMAL,
          category: 'EXPLORATION',
          content: `I see ${target.name}! I should check it out.`,
          action: 'EXPLORE_TERRAIN',
          position: target.position
        });
      }
    }

    // Store location memories
    this.rememberLocation(perception);
  }

  /**
   * Process internal needs
   */
  private processNeeds(state: BotState): void {
    // Health check
    if (state.health < 6) {
      this.addThought({
        id: `low_health_${Date.now()}`,
        priority: ThoughtPriority.CRITICAL,
        category: 'SURVIVAL',
        content: 'My health is critical! I need to heal!',
        action: 'FLEE_TO_SAFETY'
      });
    } else if (state.health < 14) {
      this.addThought({
        id: `heal_${Date.now()}`,
        priority: ThoughtPriority.URGENT,
        category: 'SURVIVAL',
        content: 'I\'m hurt. Should find food or safety.',
        action: 'EAT'
      });
    }

    // Hunger check
    if (state.hunger < 6) {
      this.addThought({
        id: `starving_${Date.now()}`,
        priority: ThoughtPriority.CRITICAL,
        category: 'SURVIVAL',
        content: 'I\'m starving! Must find food immediately!',
        action: 'EAT'
      });
    } else if (state.hunger < 12) {
      this.addThought({
        id: `hungry_${Date.now()}`,
        priority: ThoughtPriority.URGENT,
        category: 'SURVIVAL',
        content: 'Getting hungry. Should eat soon.',
        action: 'EAT'
      });
    }

    // Check if we have food
    const food = state.inventory.find(item => {
      const foodData = this.mcData.getFood(item.item);
      return foodData !== undefined;
    });
    
    if (!food && state.hunger < 16) {
      this.addThought({
        id: `need_food_${Date.now()}`,
        priority: ThoughtPriority.HIGH,
        category: 'SURVIVAL',
        content: 'I have no food in my inventory. Need to find some.',
        action: 'CHOP_WOOD'
      });
    }
  }

  // ============================================================================
  // THINKING & DECISION MAKING
  // ============================================================================

  /**
   * Main thinking loop - called each tick
   */
  think(): BotIntent {
    const now = Date.now();
    
    // Don't make decisions too frequently
    if (now - this.lastDecisionTime < this.decisionCooldown) {
      return this.currentThought?.action || 'IDLE';
    }
    
    this.lastDecisionTime = now;
    
    // Clean up expired thoughts
    this.thoughts = this.thoughts.filter(t => !t.expiresAt || t.expiresAt > now);
    
    // Sort thoughts by priority
    this.thoughts.sort((a, b) => a.priority - b.priority);
    
    // Select the most important thought
    if (this.thoughts.length > 0) {
      this.currentThought = this.thoughts[0];
      
      // If this thought has an action, remove it (it's being acted on)
      if (this.currentThought.action) {
        this.thoughts.shift();
      }
      
      logger.debug(`${this.botName} thinking: ${this.currentThought.content}`);
      return this.currentThought.action || this.getDefaultAction();
    }
    
    // No urgent thoughts - use role-based default behavior
    return this.getDefaultAction();
  }

  /**
   * Get default action based on role
   */
  private getDefaultAction(): BotIntent {
    // Weighted random based on personality
    const rand = Math.random() * 100;
    
    // High diligence = more work
    if (this.diligence > rand) {
      switch (this.role) {
        case Role.MINER: return 'MINE_RESOURCES';
        case Role.FARMER: return 'TEND_FARM';
        case Role.BUILDER: return 'BUILD_STRUCTURE';
        case Role.GUARD: return 'PATROL_AREA';
        case Role.SCOUT: return 'EXPLORE_TERRAIN';
        default: return 'CRAFT_ITEM';
      }
    }
    
    // High sociability = more socializing
    if (this.sociabilityLevel > rand) {
      return 'SOCIALIZE';
    }
    
    // High curiosity = more exploration
    if (this.curiosityLevel > rand) {
      return 'EXPLORE_TERRAIN';
    }
    
    // Default: wander or rest
    return rand > 50 ? 'IDLE' : 'SLEEP';
  }

  /**
   * Add a new thought
   */
  private addThought(thought: Omit<Thought, 'createdAt'>): void {
    const fullThought: Thought = {
      ...thought,
      createdAt: Date.now()
    };
    
    // Don't add duplicate thoughts
    const existing = this.thoughts.find(t => t.id === thought.id);
    if (!existing) {
      this.thoughts.push(fullThought);
    }
  }

  // ============================================================================
  // MEMORY SYSTEM
  // ============================================================================

  /**
   * Remember a location
   */
  private rememberLocation(perception: Perception): void {
    if (!this.lastState) return;
    
    // Remember biome location
    const biomeMemory = this.memories.find(m => 
      m.type === 'LOCATION' && m.subject === perception.currentBiome
    );
    
    if (!biomeMemory) {
      this.memories.push({
        id: `biome_${perception.currentBiome}_${Date.now()}`,
        type: 'LOCATION',
        subject: perception.currentBiome,
        details: { position: this.lastState.position },
        importance: 30,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 1
      });
    }
    
    // Remember valuable blocks
    for (const block of perception.nearbyBlocks) {
      if (block.name.includes('ore') || block.name.includes('chest')) {
        this.memories.push({
          id: `resource_${block.name}_${Date.now()}`,
          type: 'RESOURCE',
          subject: block.name,
          details: { position: block.position },
          importance: block.name.includes('diamond') ? 100 : 50,
          createdAt: Date.now(),
          lastAccessed: Date.now(),
          accessCount: 1
        });
      }
    }
    
    // Remember dangerous locations
    const dangers = perception.nearbyEntities.filter(e => e.hostile);
    for (const danger of dangers) {
      this.memories.push({
        id: `danger_${danger.name}_${Date.now()}`,
        type: 'DANGER',
        subject: danger.name,
        details: { position: this.lastState.position, type: danger.type },
        importance: 70,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 1
      });
    }
    
    // Limit memories (forget old, less important ones)
    if (this.memories.length > 100) {
      this.memories.sort((a, b) => {
        // Score based on importance and recency
        const aScore = a.importance + (a.accessCount * 5) - ((Date.now() - a.lastAccessed) / 60000);
        const bScore = b.importance + (b.accessCount * 5) - ((Date.now() - b.lastAccessed) / 60000);
        return bScore - aScore;
      });
      this.memories = this.memories.slice(0, 100);
    }
  }

  /**
   * Recall memories about a subject
   */
  recallMemories(subject: string): Memory[] {
    return this.memories.filter(m => 
      m.subject.toLowerCase().includes(subject.toLowerCase())
    ).map(m => {
      m.lastAccessed = Date.now();
      m.accessCount++;
      return m;
    });
  }

  /**
   * Get memories of a type
   */
  getMemoriesByType(type: Memory['type']): Memory[] {
    return this.memories.filter(m => m.type === type);
  }

  // ============================================================================
  // GOAL MANAGEMENT
  // ============================================================================

  /**
   * Add a new goal
   */
  addGoal(goal: Omit<Goal, 'id' | 'createdAt'>): void {
    this.goals.push({
      ...goal,
      id: `goal_${Date.now()}`,
      createdAt: Date.now()
    });
  }

  /**
   * Update goal progress
   */
  updateGoalProgress(goalId: string, progress: number): void {
    const goal = this.goals.find(g => g.id === goalId);
    if (goal) {
      goal.progress = Math.min(100, Math.max(0, progress));
    }
  }

  /**
   * Complete a goal step
   */
  completeGoalStep(goalId: string, stepIndex: number): void {
    const goal = this.goals.find(g => g.id === goalId);
    if (goal && goal.steps[stepIndex]) {
      goal.steps[stepIndex].completed = true;
      
      // Calculate progress
      const completed = goal.steps.filter(s => s.completed).length;
      goal.progress = (completed / goal.steps.length) * 100;
    }
  }

  /**
   * Get active goals
   */
  getActiveGoals(): Goal[] {
    return this.goals.filter(g => g.progress < 100);
  }

  // ============================================================================
  // EXTERNAL COMMANDS
  // ============================================================================

  /**
   * Receive a command from the AI Commander
   */
  receiveCommand(command: string, priority: ThoughtPriority = ThoughtPriority.HIGH): void {
    // Parse command into action
    const action = this.parseCommand(command);
    
    this.addThought({
      id: `command_${Date.now()}`,
      priority: priority,
      category: 'WORK',
      content: `I've been told to: ${command}`,
      action: action.intent,
      target: action.target,
      position: action.position
    });
    
    logger.info(`${this.botName} received command: ${command}`);
  }

  /**
   * Parse a command string into an action
   */
  private parseCommand(command: string): { intent: BotIntent; target?: string; position?: Position } {
    const lower = command.toLowerCase();
    
    if (lower.includes('mine') || lower.includes('dig')) {
      const match = lower.match(/mine (?:for )?(\w+)/);
      return { intent: 'MINE_RESOURCES', target: match?.[1] };
    }
    
    if (lower.includes('build') || lower.includes('construct')) {
      const match = lower.match(/build (?:a )?(\w+)/);
      return { intent: 'BUILD_STRUCTURE', target: match?.[1] };
    }
    
    if (lower.includes('farm') || lower.includes('plant') || lower.includes('harvest')) {
      return { intent: 'TEND_FARM' };
    }
    
    if (lower.includes('explore') || lower.includes('scout')) {
      return { intent: 'EXPLORE_TERRAIN' };
    }
    
    if (lower.includes('attack') || lower.includes('fight') || lower.includes('kill')) {
      const match = lower.match(/(?:attack|fight|kill) (?:the )?(\w+)/);
      return { intent: 'DEFEND_LOCATION', target: match?.[1] };
    }
    
    if (lower.includes('defend') || lower.includes('protect') || lower.includes('guard')) {
      return { intent: 'PATROL_AREA' };
    }
    
    if (lower.includes('gather') || lower.includes('collect')) {
      const match = lower.match(/(?:gather|collect) (\w+)/);
      return { intent: 'CHOP_WOOD', target: match?.[1] };
    }
    
    if (lower.includes('eat') || lower.includes('food')) {
      return { intent: 'EAT' };
    }
    
    if (lower.includes('rest') || lower.includes('sleep')) {
      return { intent: 'SLEEP' };
    }
    
    if (lower.includes('socialize') || lower.includes('talk')) {
      return { intent: 'SOCIALIZE' };
    }
    
    return { intent: 'CRAFT_ITEM' };
  }

  // ============================================================================
  // INTROSPECTION
  // ============================================================================

  /**
   * Get current mental state summary
   */
  getMentalState(): {
    currentThought: string | null;
    thoughts: number;
    memories: number;
    goals: Goal[];
    personality: {
      bravery: number;
      diligence: number;
      curiosity: number;
      sociability: number;
      creativity: number;
    };
  } {
    return {
      currentThought: this.currentThought?.content || null,
      thoughts: this.thoughts.length,
      memories: this.memories.length,
      goals: this.goals,
      personality: {
        bravery: this.bravery,
        diligence: this.diligence,
        curiosity: this.curiosityLevel,
        sociability: this.sociabilityLevel,
        creativity: this.creativityLevel
      }
    };
  }

  /**
   * Get bot info
   */
  getBotInfo(): { id: string; name: string; role: Role } {
    return {
      id: this.botId,
      name: this.botName,
      role: this.role
    };
  }

  /**
   * Generate a status message from this bot's perspective
   */
  getStatusMessage(): string {
    const state = this.lastState;
    const thought = this.currentThought;
    
    let message = `I'm ${this.botName}, a ${this.role}. `;
    
    if (state) {
      message += `Health: ${state.health}/20, Hunger: ${state.hunger}/20. `;
    }
    
    if (thought) {
      message += `Currently thinking: "${thought.content}" `;
    }
    
    const activeGoals = this.getActiveGoals();
    if (activeGoals.length > 0) {
      message += `Working towards: ${activeGoals[0].description} (${activeGoals[0].progress.toFixed(0)}%)`;
    }
    
    return message;
  }
}

// ============================================================================
// CONSCIOUSNESS MANAGER
// ============================================================================

/**
 * Manages all bot consciousnesses
 */
export class ConsciousnessManager {
  private consciousnesses: Map<string, BotConsciousness> = new Map();
  private tickInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    logger.info('Consciousness Manager initialized');
  }

  /**
   * Create consciousness for a bot
   */
  createConsciousness(bot: Bot): BotConsciousness {
    if (this.consciousnesses.has(bot.id)) {
      return this.consciousnesses.get(bot.id)!;
    }
    
    const consciousness = new BotConsciousness(bot);
    this.consciousnesses.set(bot.id, consciousness);
    
    logger.info(`Created consciousness for ${bot.name}`);
    return consciousness;
  }

  /**
   * Get consciousness for a bot
   */
  getConsciousness(botId: string): BotConsciousness | undefined {
    return this.consciousnesses.get(botId);
  }

  /**
   * Remove consciousness when bot dies
   */
  removeConsciousness(botId: string): void {
    this.consciousnesses.delete(botId);
  }

  /**
   * Update all consciousnesses with new perception/state
   */
  updateAll(updates: Map<string, { state?: BotState; perception?: Perception }>): void {
    for (const [botId, update] of updates) {
      const consciousness = this.consciousnesses.get(botId);
      if (consciousness) {
        if (update.state) {
          consciousness.updateState(update.state);
        }
        if (update.perception) {
          consciousness.updatePerception(update.perception);
        }
      }
    }
  }

  /**
   * Get decisions for all bots
   */
  getDecisions(): Map<string, BotIntent> {
    const decisions: Map<string, BotIntent> = new Map();
    
    for (const [botId, consciousness] of this.consciousnesses) {
      decisions.set(botId, consciousness.think());
    }
    
    return decisions;
  }

  /**
   * Send command to specific bot
   */
  sendCommand(botId: string, command: string): boolean {
    const consciousness = this.consciousnesses.get(botId);
    if (consciousness) {
      consciousness.receiveCommand(command);
      return true;
    }
    return false;
  }

  /**
   * Send command to all bots
   */
  broadcastCommand(command: string): void {
    for (const consciousness of this.consciousnesses.values()) {
      consciousness.receiveCommand(command);
    }
  }

  /**
   * Get all bot statuses
   */
  getAllStatuses(): string[] {
    return Array.from(this.consciousnesses.values())
      .map(c => c.getStatusMessage());
  }

  /**
   * Get count of managed bots
   */
  getCount(): number {
    return this.consciousnesses.size;
  }

  /**
   * Clear all consciousnesses
   */
  clear(): void {
    this.consciousnesses.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let managerInstance: ConsciousnessManager | null = null;

export function getConsciousnessManager(): ConsciousnessManager {
  if (!managerInstance) {
    managerInstance = new ConsciousnessManager();
  }
  return managerInstance;
}

export function resetConsciousnessManager(): void {
  if (managerInstance) {
    managerInstance.clear();
  }
  managerInstance = null;
}

export default BotConsciousness;
