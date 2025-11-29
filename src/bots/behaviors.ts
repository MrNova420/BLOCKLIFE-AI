/**
 * BlockLife AI - Bot Behaviors
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Defines detailed behavior patterns and state machines for bots.
 */

import { 
  Bot, 
  Role, 
  Mood, 
  Position, 
  Task, 
  NeedsState,
  ThreatLevel,
  LifeStage,
  PersonalityTraits
} from '../types';
import { BotAgent } from './bot-agent';
import { createLogger } from '../utils/logger';

const logger = createLogger('behaviors');

/**
 * Behavior state
 */
export enum BehaviorState {
  IDLE = 'IDLE',
  WORKING = 'WORKING',
  TRAVELING = 'TRAVELING',
  RESTING = 'RESTING',
  EATING = 'EATING',
  SOCIALIZING = 'SOCIALIZING',
  FLEEING = 'FLEEING',
  FIGHTING = 'FIGHTING',
  EXPLORING = 'EXPLORING',
  GATHERING = 'GATHERING',
  BUILDING = 'BUILDING',
  CRAFTING = 'CRAFTING',
  TRADING = 'TRADING',
  PATROLLING = 'PATROLLING',
  TEACHING = 'TEACHING',
  LEARNING = 'LEARNING'
}

/**
 * Behavior priority
 */
export enum BehaviorPriority {
  CRITICAL = 0,    // Life-threatening
  URGENT = 1,      // Immediate needs
  HIGH = 2,        // Important tasks
  NORMAL = 3,      // Regular work
  LOW = 4,         // Optional activities
  BACKGROUND = 5   // When nothing else to do
}

/**
 * Behavior definition
 */
export interface BehaviorDefinition {
  id: string;
  name: string;
  state: BehaviorState;
  priority: BehaviorPriority;
  canInterrupt: boolean;
  duration?: { min: number; max: number };  // In ticks
  prerequisites?: (bot: Bot) => boolean;
  effects?: (bot: Bot) => Partial<NeedsState>;
  onStart?: (bot: Bot) => void;
  onComplete?: (bot: Bot) => void;
  onInterrupt?: (bot: Bot) => void;
}

/**
 * Behavior context for decision making
 */
export interface BehaviorContext {
  bot: Bot;
  timeOfDay: 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK';
  threatLevel: ThreatLevel;
  nearbyBots: Bot[];
  nearbyResources: string[];
  villageNeeds: string[];
  currentTask?: Task;
}

/**
 * Standard behaviors
 */
const BEHAVIORS: Record<string, BehaviorDefinition> = {
  // Critical behaviors
  FLEE: {
    id: 'FLEE',
    name: 'Flee from danger',
    state: BehaviorState.FLEEING,
    priority: BehaviorPriority.CRITICAL,
    canInterrupt: false,
    duration: { min: 10, max: 30 },
    prerequisites: (bot) => bot.flags.isInDanger || bot.needs.safety > 80,
    effects: () => ({ safety: -50 })
  },
  
  FIGHT: {
    id: 'FIGHT',
    name: 'Fight threat',
    state: BehaviorState.FIGHTING,
    priority: BehaviorPriority.CRITICAL,
    canInterrupt: false,
    duration: { min: 5, max: 20 },
    prerequisites: (bot) => bot.personality.bravery > 60 && bot.flags.isInDanger
  },
  
  // Urgent behaviors
  EAT: {
    id: 'EAT',
    name: 'Eat food',
    state: BehaviorState.EATING,
    priority: BehaviorPriority.URGENT,
    canInterrupt: true,
    duration: { min: 3, max: 8 },
    prerequisites: (bot) => bot.needs.hunger > 60,
    effects: () => ({ hunger: -60 })
  },
  
  SLEEP: {
    id: 'SLEEP',
    name: 'Sleep',
    state: BehaviorState.RESTING,
    priority: BehaviorPriority.URGENT,
    canInterrupt: true,
    duration: { min: 20, max: 50 },
    prerequisites: (bot) => bot.needs.energy > 70,
    effects: () => ({ energy: -80 })
  },
  
  // High priority behaviors
  FARM: {
    id: 'FARM',
    name: 'Farm crops',
    state: BehaviorState.WORKING,
    priority: BehaviorPriority.HIGH,
    canInterrupt: true,
    duration: { min: 30, max: 60 },
    prerequisites: (bot) => bot.role === Role.FARMER,
    effects: () => ({ purpose: -20 })
  },
  
  MINE: {
    id: 'MINE',
    name: 'Mine resources',
    state: BehaviorState.WORKING,
    priority: BehaviorPriority.HIGH,
    canInterrupt: true,
    duration: { min: 40, max: 80 },
    prerequisites: (bot) => bot.role === Role.MINER,
    effects: () => ({ purpose: -20, energy: 15 })
  },
  
  BUILD: {
    id: 'BUILD',
    name: 'Build structure',
    state: BehaviorState.BUILDING,
    priority: BehaviorPriority.HIGH,
    canInterrupt: true,
    duration: { min: 50, max: 100 },
    prerequisites: (bot) => bot.role === Role.BUILDER,
    effects: () => ({ purpose: -30 })
  },
  
  GUARD: {
    id: 'GUARD',
    name: 'Guard duty',
    state: BehaviorState.PATROLLING,
    priority: BehaviorPriority.HIGH,
    canInterrupt: true,
    duration: { min: 60, max: 120 },
    prerequisites: (bot) => bot.role === Role.GUARD,
    effects: () => ({ purpose: -15 })
  },
  
  // Normal priority behaviors
  CHOP_WOOD: {
    id: 'CHOP_WOOD',
    name: 'Chop wood',
    state: BehaviorState.GATHERING,
    priority: BehaviorPriority.NORMAL,
    canInterrupt: true,
    duration: { min: 20, max: 40 },
    prerequisites: (bot) => bot.role === Role.LUMBERJACK,
    effects: () => ({ purpose: -15, energy: 10 })
  },
  
  CRAFT: {
    id: 'CRAFT',
    name: 'Craft items',
    state: BehaviorState.CRAFTING,
    priority: BehaviorPriority.NORMAL,
    canInterrupt: true,
    duration: { min: 15, max: 30 },
    prerequisites: (bot) => bot.role === Role.TOOLMAKER || bot.role === Role.ARTISAN,
    effects: () => ({ purpose: -20 })
  },
  
  TRADE: {
    id: 'TRADE',
    name: 'Trade goods',
    state: BehaviorState.TRADING,
    priority: BehaviorPriority.NORMAL,
    canInterrupt: true,
    duration: { min: 10, max: 20 },
    prerequisites: (bot) => bot.role === Role.TRADER,
    effects: () => ({ social: -10 })
  },
  
  HEAL: {
    id: 'HEAL',
    name: 'Heal others',
    state: BehaviorState.WORKING,
    priority: BehaviorPriority.NORMAL,
    canInterrupt: true,
    duration: { min: 15, max: 30 },
    prerequisites: (bot) => bot.role === Role.HEALER,
    effects: () => ({ purpose: -25, social: -15 })
  },
  
  // Low priority behaviors
  SOCIALIZE: {
    id: 'SOCIALIZE',
    name: 'Socialize',
    state: BehaviorState.SOCIALIZING,
    priority: BehaviorPriority.LOW,
    canInterrupt: true,
    duration: { min: 10, max: 25 },
    prerequisites: (bot) => bot.needs.social > 40,
    effects: () => ({ social: -40 })
  },
  
  EXPLORE: {
    id: 'EXPLORE',
    name: 'Explore area',
    state: BehaviorState.EXPLORING,
    priority: BehaviorPriority.LOW,
    canInterrupt: true,
    duration: { min: 30, max: 60 },
    prerequisites: (bot) => bot.personality.curiosity > 50,
    effects: () => ({ purpose: -10 })
  },
  
  TEACH: {
    id: 'TEACH',
    name: 'Teach skill',
    state: BehaviorState.TEACHING,
    priority: BehaviorPriority.LOW,
    canInterrupt: true,
    duration: { min: 20, max: 40 },
    prerequisites: (bot) => bot.lifeStage === LifeStage.ELDER || bot.role === Role.SCHOLAR,
    effects: () => ({ social: -20, purpose: -30 })
  },
  
  LEARN: {
    id: 'LEARN',
    name: 'Learn skill',
    state: BehaviorState.LEARNING,
    priority: BehaviorPriority.LOW,
    canInterrupt: true,
    duration: { min: 20, max: 40 },
    prerequisites: (bot) => bot.lifeStage === LifeStage.CHILD || bot.lifeStage === LifeStage.TEEN,
    effects: () => ({ purpose: -20 })
  },
  
  // Background behaviors
  IDLE: {
    id: 'IDLE',
    name: 'Idle',
    state: BehaviorState.IDLE,
    priority: BehaviorPriority.BACKGROUND,
    canInterrupt: true,
    duration: { min: 5, max: 15 }
  },
  
  WANDER: {
    id: 'WANDER',
    name: 'Wander around',
    state: BehaviorState.TRAVELING,
    priority: BehaviorPriority.BACKGROUND,
    canInterrupt: true,
    duration: { min: 10, max: 30 }
  }
};

/**
 * Get behavior by ID
 */
export function getBehavior(id: string): BehaviorDefinition | undefined {
  return BEHAVIORS[id];
}

/**
 * Get all behaviors
 */
export function getAllBehaviors(): BehaviorDefinition[] {
  return Object.values(BEHAVIORS);
}

/**
 * Behavior selector - chooses appropriate behavior based on context
 */
export class BehaviorSelector {
  /**
   * Select best behavior for a bot
   */
  selectBehavior(context: BehaviorContext): BehaviorDefinition {
    const eligible: BehaviorDefinition[] = [];
    
    // Get all behaviors the bot can perform
    for (const behavior of Object.values(BEHAVIORS)) {
      if (!behavior.prerequisites || behavior.prerequisites(context.bot)) {
        eligible.push(behavior);
      }
    }
    
    // Sort by priority (lower = more important)
    eligible.sort((a, b) => a.priority - b.priority);
    
    // Apply personality-based adjustments
    const adjusted = this.applyPersonalityWeight(eligible, context.bot.personality);
    
    // Return highest priority behavior
    return adjusted[0] || BEHAVIORS.IDLE;
  }

  /**
   * Apply personality weights to behavior selection
   */
  private applyPersonalityWeight(
    behaviors: BehaviorDefinition[], 
    personality: PersonalityTraits
  ): BehaviorDefinition[] {
    // Create weighted copy
    const weighted = behaviors.map(b => ({
      behavior: b,
      weight: this.calculateWeight(b, personality)
    }));
    
    // Sort by combined priority and weight
    weighted.sort((a, b) => {
      const priorityDiff = a.behavior.priority - b.behavior.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return b.weight - a.weight;  // Higher weight is better
    });
    
    return weighted.map(w => w.behavior);
  }

  /**
   * Calculate personality-based weight for a behavior
   */
  private calculateWeight(behavior: BehaviorDefinition, personality: PersonalityTraits): number {
    let weight = 50;  // Base weight
    
    switch (behavior.state) {
      case BehaviorState.EXPLORING:
        weight += personality.curiosity * 0.5;
        break;
      case BehaviorState.SOCIALIZING:
        weight += personality.sociability * 0.5;
        break;
      case BehaviorState.FIGHTING:
        weight += personality.bravery * 0.3 + personality.aggression * 0.3;
        break;
      case BehaviorState.FLEEING:
        weight += (100 - personality.bravery) * 0.3;
        break;
      case BehaviorState.WORKING:
        weight += personality.industry * 0.4;
        break;
      case BehaviorState.BUILDING:
      case BehaviorState.CRAFTING:
        weight += personality.creativity * 0.3 + personality.industry * 0.2;
        break;
      case BehaviorState.TEACHING:
      case BehaviorState.LEARNING:
        weight += personality.wisdom * 0.4;
        break;
    }
    
    return weight;
  }

  /**
   * Check if current behavior should be interrupted
   */
  shouldInterrupt(
    currentBehavior: BehaviorDefinition, 
    context: BehaviorContext
  ): BehaviorDefinition | null {
    if (!currentBehavior.canInterrupt) {
      return null;
    }
    
    // Check for higher priority behaviors
    for (const behavior of Object.values(BEHAVIORS)) {
      if (behavior.priority < currentBehavior.priority) {
        if (behavior.prerequisites && behavior.prerequisites(context.bot)) {
          return behavior;
        }
      }
    }
    
    return null;
  }
}

/**
 * Role-specific behavior patterns
 */
export const ROLE_BEHAVIOR_PATTERNS: Record<Role, string[]> = {
  [Role.FARMER]: ['FARM', 'GATHER', 'TRADE', 'SOCIALIZE'],
  [Role.MINER]: ['MINE', 'CRAFT', 'EXPLORE'],
  [Role.BUILDER]: ['BUILD', 'GATHER', 'CRAFT'],
  [Role.GUARD]: ['GUARD', 'FIGHT', 'PATROL'],
  [Role.HUNTER]: ['HUNT', 'EXPLORE', 'GATHER'],
  [Role.LUMBERJACK]: ['CHOP_WOOD', 'GATHER', 'BUILD'],
  [Role.FISHER]: ['FISH', 'TRADE', 'SOCIALIZE'],
  [Role.TOOLMAKER]: ['CRAFT', 'MINE', 'TRADE'],
  [Role.ARTISAN]: ['CRAFT', 'TRADE', 'SOCIALIZE'],
  [Role.HEALER]: ['HEAL', 'GATHER', 'SOCIALIZE'],
  [Role.CARETAKER]: ['TEACH', 'SOCIALIZE', 'GATHER'],
  [Role.CHIEF]: ['SOCIALIZE', 'TEACH', 'TRADE'],
  [Role.ELDER_ROLE]: ['TEACH', 'SOCIALIZE', 'REST'],
  [Role.SCHOLAR]: ['LEARN', 'TEACH', 'EXPLORE'],
  [Role.SCOUT]: ['EXPLORE', 'GUARD', 'HUNT'],
  [Role.TRADER]: ['TRADE', 'TRAVEL', 'SOCIALIZE'],
  [Role.UNASSIGNED]: ['IDLE', 'SOCIALIZE', 'GATHER']
};

/**
 * Life stage behavior modifiers
 */
export const LIFE_STAGE_MODIFIERS: Record<LifeStage, { allowed: string[]; forbidden: string[] }> = {
  [LifeStage.CHILD]: {
    allowed: ['LEARN', 'PLAY', 'SOCIALIZE', 'IDLE'],
    forbidden: ['GUARD', 'MINE', 'FIGHT', 'TRADE', 'CHIEF']
  },
  [LifeStage.TEEN]: {
    allowed: ['LEARN', 'WORK', 'SOCIALIZE', 'EXPLORE'],
    forbidden: ['CHIEF', 'TEACH']
  },
  [LifeStage.ADULT]: {
    allowed: [],  // All allowed
    forbidden: []
  },
  [LifeStage.ELDER]: {
    allowed: ['TEACH', 'SOCIALIZE', 'REST', 'CRAFT'],
    forbidden: ['MINE', 'FIGHT', 'GUARD']
  }
};

/**
 * Mood effect on behaviors
 */
export function getMoodBehaviorModifier(mood: Mood): { boost: string[]; suppress: string[] } {
  switch (mood) {
    case Mood.HAPPY:
      return { boost: ['SOCIALIZE', 'EXPLORE', 'TEACH'], suppress: ['FIGHT', 'FLEE'] };
    case Mood.STRESSED:
      return { boost: ['REST', 'EAT'], suppress: ['EXPLORE', 'SOCIALIZE'] };
    case Mood.AFRAID:
      return { boost: ['FLEE', 'HIDE'], suppress: ['FIGHT', 'EXPLORE'] };
    case Mood.ANGRY:
      return { boost: ['FIGHT', 'WORK'], suppress: ['SOCIALIZE', 'REST'] };
    case Mood.INSPIRED:
      return { boost: ['CRAFT', 'BUILD', 'TEACH'], suppress: ['REST', 'IDLE'] };
    default:
      return { boost: [], suppress: [] };
  }
}

// Singleton selector
let behaviorSelectorInstance: BehaviorSelector | null = null;

export function getBehaviorSelector(): BehaviorSelector {
  if (!behaviorSelectorInstance) {
    behaviorSelectorInstance = new BehaviorSelector();
  }
  return behaviorSelectorInstance;
}

export { BEHAVIORS };
export default BehaviorSelector;
