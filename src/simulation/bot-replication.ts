/**
 * BlockLife AI - Bot Replication and Generation System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Handles the creation of new bots with unique randomized traits,
 * personalities, and characteristics. Supports both natural birth
 * and direct spawning of new bots into the simulation.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  Bot, 
  Position, 
  PersonalityTraits, 
  SkillSet, 
  NeedsState, 
  Role, 
  LifeStage, 
  Mood,
  Memory,
  Gender,
  BotFlags
} from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('replication');

/**
 * Bot generation template
 */
export interface BotTemplate {
  name?: string;
  villageId?: string;
  position?: Position;
  role?: Role;
  gender?: Gender;
  personalityBias?: Partial<PersonalityTraits>;
  skillBias?: Partial<SkillSet>;
  parentIds?: string[];
  lifeStage?: LifeStage;
}

/**
 * Name generation configuration
 */
export interface NameConfig {
  firstNames: { male: string[]; female: string[]; neutral: string[] };
  lastNames: string[];
  prefixes?: string[];
  suffixes?: string[];
}

/**
 * Trait variation configuration
 */
export interface TraitVariation {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
}

/**
 * Generated bot result
 */
export interface GeneratedBot {
  bot: Bot;
  generationMethod: 'SPAWNED' | 'BORN' | 'CLONED' | 'MIGRATED';
  uniqueFeatures: string[];
}

// Default name pools
const DEFAULT_NAMES: NameConfig = {
  firstNames: {
    male: [
      'Erik', 'Bjorn', 'Magnus', 'Olaf', 'Gunnar', 'Torsten', 'Sven', 'Ragnar',
      'Harald', 'Leif', 'Sigurd', 'Ivar', 'Ulf', 'Axel', 'Lars', 'Nils',
      'Otto', 'Karl', 'Hans', 'Fritz', 'Wilhelm', 'Johann', 'Klaus', 'Dieter',
      'Bruno', 'Werner', 'Heinrich', 'Rudolf', 'Walter', 'Kurt', 'Viktor', 'Max'
    ],
    female: [
      'Freya', 'Astrid', 'Ingrid', 'Sigrid', 'Helga', 'Brunhilde', 'Greta', 'Elsa',
      'Nora', 'Liv', 'Asa', 'Thora', 'Runa', 'Saga', 'Ylva', 'Solveig',
      'Hilda', 'Emma', 'Anna', 'Clara', 'Sophie', 'Martha', 'Rosa', 'Lena',
      'Marta', 'Gisela', 'Ursula', 'Erika', 'Heidi', 'Frieda', 'Gerda', 'Liesel'
    ],
    neutral: [
      'River', 'Storm', 'Stone', 'Ash', 'Rowan', 'Sage', 'Brook', 'Glen',
      'Dale', 'Reed', 'Clay', 'Flint', 'Moss', 'Fern', 'Oak', 'Birch'
    ]
  },
  lastNames: [
    'Stone', 'River', 'Hill', 'Forest', 'Mountain', 'Valley', 'Lake', 'Meadow',
    'Oak', 'Pine', 'Birch', 'Ash', 'Maple', 'Cedar', 'Willow', 'Elder',
    'Smith', 'Miller', 'Baker', 'Cooper', 'Mason', 'Carpenter', 'Fisher', 'Hunter',
    'Wolf', 'Bear', 'Eagle', 'Hawk', 'Fox', 'Raven', 'Stag', 'Boar',
    'Iron', 'Steel', 'Gold', 'Silver', 'Copper', 'Bronze', 'Coal', 'Flint',
    'Storm', 'Thunder', 'Frost', 'Snow', 'Rain', 'Wind', 'Fire', 'Ember',
    'Hammer', 'Shield', 'Sword', 'Axe', 'Bow', 'Spear', 'Helm', 'Blade'
  ]
};

// Unique features that can be assigned to bots
const UNIQUE_FEATURES = {
  physical: [
    'Unusually tall', 'Shorter than average', 'Broad shouldered', 'Lean build',
    'Scarred face', 'Piercing eyes', 'Silver hair streak', 'Birthmark',
    'Missing finger', 'Limp', 'Deep voice', 'Musical laugh',
    'Quick hands', 'Steady gaze', 'Weathered skin', 'Youthful appearance'
  ],
  personality: [
    'Never forgets a face', 'Talks to self', 'Hums while working', 'Early riser',
    'Night owl', 'Superstitious', 'Collector of oddities', 'Tells tall tales',
    'Fiercely protective', 'Quick to laugh', 'Slow to anger', 'Holds grudges',
    'Generous to a fault', 'Cautious planner', 'Bold risk-taker', 'Deep thinker'
  ],
  quirks: [
    'Afraid of chickens', 'Obsessed with order', 'Can\'t resist a challenge',
    'Always carries a lucky charm', 'Speaks to plants', 'Dreams vividly',
    'Never turns down food', 'Compulsive whittler', 'Perfect memory for songs',
    'Allergic to certain blocks', 'Sleepwalks occasionally', 'Snores loudly',
    'Triple-checks everything', 'Names all tools', 'Counts steps', 'Fears heights'
  ]
};

// Role-specific skill biases
const ROLE_SKILL_BIASES: Partial<Record<Role, Partial<SkillSet>>> = {
  [Role.FARMER]: { farming: 30, crafting: 10 },
  [Role.MINER]: { mining: 30, combat: 10 },
  [Role.BUILDER]: { building: 30, crafting: 20 },
  [Role.GUARD]: { combat: 30, mining: 10 },
  [Role.TOOLMAKER]: { crafting: 30, building: 10 },
  [Role.HEALER]: { scholarship: 20, trading: 20 },
  [Role.TRADER]: { trading: 30, crafting: 10 },
  [Role.SCHOLAR]: { scholarship: 40 },
  [Role.CHIEF]: { leadership: 30, trading: 20 },
  [Role.SCOUT]: { combat: 20, mining: 10, farming: 10 }
};

/**
 * Bot Replication Manager
 */
export class BotReplicationManager {
  private nameConfig: NameConfig = DEFAULT_NAMES;
  private generatedCount: number = 0;
  private usedNames: Set<string> = new Set();
  
  constructor() {
    logger.info('Bot Replication Manager initialized');
  }

  /**
   * Generate a completely new bot
   */
  generateBot(template: BotTemplate = {}): GeneratedBot {
    const gender = template.gender || (Math.random() > 0.5 ? Gender.MALE : Gender.FEMALE);
    const genderKey = gender === Gender.MALE ? 'male' : 'female';
    const name = template.name || this.generateUniqueName(genderKey);
    
    const personality = this.generatePersonality(template.personalityBias);
    const skills = this.generateSkills(template.skillBias, template.role);
    const needs = this.generateNeeds();
    
    const bot: Bot = {
      id: uuidv4(),
      name,
      age: template.lifeStage === LifeStage.CHILD ? Math.random() * 10 
         : template.lifeStage === LifeStage.ELDER ? 60 + Math.random() * 20
         : 18 + Math.random() * 30,
      lifeStage: template.lifeStage || LifeStage.ADULT,
      gender,
      parentIds: template.parentIds || [],
      childIds: [],
      partnerId: undefined,
      villageId: template.villageId || '',
      role: template.role || this.selectRoleFromSkills(skills),
      personality,
      skills,
      needs,
      mood: this.calculateInitialMood(personality, needs),
      memories: this.generateInitialMemories(name),
      relationships: [],
      health: 100,
      position: template.position || { x: 0, y: 64, z: 0 },
      inventory: [],
      knownLocations: [],
      taskQueue: [],
      lastDecisionAt: Date.now(),
      flags: {
        isDead: false,
        isIdle: true,
        isInDanger: false,
        needsAiDecision: false,
        isBackground: false
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const uniqueFeatures = this.assignUniqueFeatures();
    
    this.generatedCount++;
    this.usedNames.add(name);
    
    logger.debug(`Bot generated: ${name}`);
    
    return {
      bot,
      generationMethod: template.parentIds && template.parentIds.length > 0 ? 'BORN' : 'SPAWNED',
      uniqueFeatures
    };
  }

  /**
   * Generate a child from two parents
   */
  generateChild(parent1: Bot, parent2: Bot, villageId: string): GeneratedBot {
    // Inherit traits from parents
    const personality = this.inheritPersonality(parent1.personality, parent2.personality);
    const skills = this.inheritSkills(parent1.skills, parent2.skills);
    
    // Determine last name (randomly from either parent)
    const lastName = Math.random() > 0.5 
      ? parent1.name.split(' ')[1] 
      : parent2.name.split(' ')[1];
    
    const gender = Math.random() > 0.5 ? Gender.MALE : Gender.FEMALE;
    const genderKey = gender === Gender.MALE ? 'male' : 'female';
    const firstName = this.generateFirstName(genderKey);
    const name = `${firstName} ${lastName}`;
    
    const template: BotTemplate = {
      name,
      villageId,
      gender,
      position: parent1.position,
      parentIds: [parent1.id, parent2.id],
      lifeStage: LifeStage.CHILD,
      personalityBias: personality as Partial<PersonalityTraits>,
      skillBias: Object.fromEntries(
        Object.entries(skills).map(([k, v]) => [k, v * 0.2])  // Start with 20% of inherited aptitude
      ) as Partial<SkillSet>
    };
    
    const result = this.generateBot(template);
    result.generationMethod = 'BORN';
    
    // Add special features from lineage
    if (parent1.personality.creativity > 70 || parent2.personality.creativity > 70) {
      result.uniqueFeatures.push('Inherited creative spark');
    }
    if (parent1.personality.wisdom > 70 || parent2.personality.wisdom > 70) {
      result.uniqueFeatures.push('Wise beyond years');
    }
    
    logger.info(`Child born: ${name} to ${parent1.name} and ${parent2.name}`);
    
    return result;
  }

  /**
   * Clone a bot with variations
   */
  cloneBot(sourceBot: Bot, variationAmount: number = 20): GeneratedBot {
    const genderKey = sourceBot.gender === Gender.MALE ? 'male' : 'female';
    const name = this.generateUniqueName(genderKey);
    
    // Vary the personality
    const personality = this.varyPersonality(sourceBot.personality, variationAmount);
    
    // Vary the skills
    const skills = this.varySkills(sourceBot.skills, variationAmount);
    
    const bot: Bot = {
      id: uuidv4(),
      name,
      age: sourceBot.age,
      lifeStage: sourceBot.lifeStage,
      gender: sourceBot.gender,
      parentIds: [],
      childIds: [],
      partnerId: undefined,
      villageId: sourceBot.villageId,
      role: sourceBot.role,
      personality,
      skills,
      needs: this.generateNeeds(),
      mood: Mood.NEUTRAL,
      memories: this.generateInitialMemories(name),
      relationships: [],
      health: 100,
      position: sourceBot.position,
      inventory: [],
      knownLocations: [],
      taskQueue: [],
      lastDecisionAt: Date.now(),
      flags: {
        isDead: false,
        isIdle: true,
        isInDanger: false,
        needsAiDecision: false,
        isBackground: false
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const result: GeneratedBot = {
      bot,
      generationMethod: 'CLONED',
      uniqueFeatures: this.assignUniqueFeatures()
    };
    
    result.uniqueFeatures.push(`Reminiscent of ${sourceBot.name}`);
    
    logger.info(`Bot cloned from ${sourceBot.name}: ${name}`);
    
    return result;
  }

  /**
   * Generate a migrant bot from another village
   */
  generateMigrant(sourceVillageId: string, targetVillageId: string): GeneratedBot {
    const result = this.generateBot({
      villageId: targetVillageId,
      lifeStage: LifeStage.ADULT
    });
    
    result.generationMethod = 'MIGRATED';
    result.uniqueFeatures.push('Newcomer from distant lands');
    result.uniqueFeatures.push('Carries stories of another village');
    
    // Add migration memory
    result.bot.memories.push({
      id: uuidv4(),
      type: 'MIGRATION',
      description: `Left my old home to seek a new life in a new village`,
      timestamp: Date.now(),
      significance: 80,
      participants: [result.bot.id],
      emotionalImpact: -20
    });
    
    return result;
  }

  /**
   * Generate a unique name
   */
  generateUniqueName(gender: 'male' | 'female' | 'neutral' = 'neutral'): string {
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
      const firstName = this.generateFirstName(gender);
      const lastName = this.generateLastName();
      const fullName = `${firstName} ${lastName}`;
      
      if (!this.usedNames.has(fullName)) {
        return fullName;
      }
      
      attempts++;
    }
    
    // Fallback with number suffix
    const firstName = this.generateFirstName(gender);
    const lastName = this.generateLastName();
    return `${firstName} ${lastName} ${this.generatedCount}`;
  }

  /**
   * Generate first name
   */
  private generateFirstName(gender: 'male' | 'female' | 'neutral'): string {
    const pool = this.nameConfig.firstNames[gender];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Generate last name
   */
  private generateLastName(): string {
    return this.nameConfig.lastNames[Math.floor(Math.random() * this.nameConfig.lastNames.length)];
  }

  /**
   * Generate personality traits
   */
  private generatePersonality(bias?: Partial<PersonalityTraits>): PersonalityTraits {
    const generate = (biasValue?: number): number => {
      const base = this.gaussianRandom(50, 20);
      const biased = biasValue !== undefined ? (base + biasValue) / 2 : base;
      return Math.max(0, Math.min(100, Math.round(biased)));
    };
    
    return {
      bravery: generate(bias?.bravery),
      curiosity: generate(bias?.curiosity),
      sociability: generate(bias?.sociability),
      industry: generate(bias?.industry),
      creativity: generate(bias?.creativity),
      aggression: generate(bias?.aggression),
      loyalty: generate(bias?.loyalty),
      wisdom: generate(bias?.wisdom)
    };
  }

  /**
   * Generate skills
   */
  private generateSkills(bias?: Partial<SkillSet>, role?: Role): SkillSet {
    const roleBias = role ? ROLE_SKILL_BIASES[role] : undefined;
    
    const generate = (skillKey: keyof SkillSet): number => {
      let base = this.gaussianRandom(30, 15);
      
      if (bias && bias[skillKey] !== undefined) {
        base += bias[skillKey]!;
      }
      
      if (roleBias && roleBias[skillKey] !== undefined) {
        base += roleBias[skillKey]!;
      }
      
      return Math.max(0, Math.min(100, Math.round(base)));
    };
    
    return {
      mining: generate('mining'),
      farming: generate('farming'),
      building: generate('building'),
      combat: generate('combat'),
      crafting: generate('crafting'),
      trading: generate('trading'),
      leadership: generate('leadership'),
      scholarship: generate('scholarship')
    };
  }

  /**
   * Generate needs state
   */
  private generateNeeds(): NeedsState {
    return {
      hunger: Math.random() * 30,      // Start mostly satisfied
      energy: Math.random() * 30,      // Start with good energy
      safety: Math.random() * 20,
      social: Math.random() * 50,
      purpose: Math.random() * 40
    };
  }

  /**
   * Inherit personality from two parents
   */
  private inheritPersonality(p1: PersonalityTraits, p2: PersonalityTraits): PersonalityTraits {
    const inherit = (key: keyof PersonalityTraits): number => {
      const avg = (p1[key] + p2[key]) / 2;
      const variation = this.gaussianRandom(0, 15);
      return Math.max(0, Math.min(100, Math.round(avg + variation)));
    };
    
    return {
      bravery: inherit('bravery'),
      curiosity: inherit('curiosity'),
      sociability: inherit('sociability'),
      industry: inherit('industry'),
      creativity: inherit('creativity'),
      aggression: inherit('aggression'),
      loyalty: inherit('loyalty'),
      wisdom: inherit('wisdom')
    };
  }

  /**
   * Inherit skills from two parents
   */
  private inheritSkills(s1: SkillSet, s2: SkillSet): SkillSet {
    const inherit = (key: keyof SkillSet): number => {
      // Take the higher parent's skill as the potential
      const potential = Math.max(s1[key], s2[key]);
      // Child starts with 20-40% of potential
      return Math.round(potential * (0.2 + Math.random() * 0.2));
    };
    
    return {
      mining: inherit('mining'),
      farming: inherit('farming'),
      building: inherit('building'),
      combat: inherit('combat'),
      crafting: inherit('crafting'),
      trading: inherit('trading'),
      leadership: inherit('leadership'),
      scholarship: inherit('scholarship')
    };
  }

  /**
   * Vary personality traits
   */
  private varyPersonality(original: PersonalityTraits, amount: number): PersonalityTraits {
    const vary = (value: number): number => {
      const variation = (Math.random() - 0.5) * 2 * amount;
      return Math.max(0, Math.min(100, Math.round(value + variation)));
    };
    
    return {
      bravery: vary(original.bravery),
      curiosity: vary(original.curiosity),
      sociability: vary(original.sociability),
      industry: vary(original.industry),
      creativity: vary(original.creativity),
      aggression: vary(original.aggression),
      loyalty: vary(original.loyalty),
      wisdom: vary(original.wisdom)
    };
  }

  /**
   * Vary skills
   */
  private varySkills(original: SkillSet, amount: number): SkillSet {
    const vary = (value: number): number => {
      const variation = (Math.random() - 0.5) * 2 * amount;
      return Math.max(0, Math.min(100, Math.round(value + variation)));
    };
    
    return {
      mining: vary(original.mining),
      farming: vary(original.farming),
      building: vary(original.building),
      combat: vary(original.combat),
      crafting: vary(original.crafting),
      trading: vary(original.trading),
      leadership: vary(original.leadership),
      scholarship: vary(original.scholarship)
    };
  }

  /**
   * Select role based on skills
   */
  private selectRoleFromSkills(skills: SkillSet): Role {
    const skillToRole: { skill: keyof SkillSet; role: Role; threshold: number }[] = [
      { skill: 'leadership', role: Role.CHIEF, threshold: 60 },
      { skill: 'scholarship', role: Role.SCHOLAR, threshold: 55 },
      { skill: 'combat', role: Role.GUARD, threshold: 50 },
      { skill: 'farming', role: Role.FARMER, threshold: 45 },
      { skill: 'mining', role: Role.MINER, threshold: 45 },
      { skill: 'building', role: Role.BUILDER, threshold: 45 },
      { skill: 'crafting', role: Role.TOOLMAKER, threshold: 45 },
      { skill: 'trading', role: Role.TRADER, threshold: 50 }
    ];
    
    // Find best matching role
    for (const mapping of skillToRole) {
      if (skills[mapping.skill] >= mapping.threshold) {
        return mapping.role;
      }
    }
    
    // Default roles
    const defaults = [Role.UNASSIGNED, Role.FARMER, Role.HUNTER];
    return defaults[Math.floor(Math.random() * defaults.length)];
  }

  /**
   * Calculate initial mood
   */
  private calculateInitialMood(personality: PersonalityTraits, needs: NeedsState): Mood {
    const positivity = personality.sociability * 0.3 + personality.wisdom * 0.2;
    const needsSatisfaction = 100 - (needs.hunger + needs.purpose + needs.social) / 3;
    
    const score = (positivity + needsSatisfaction) / 2;
    
    if (score > 70) return Mood.HAPPY;
    if (score > 55) return Mood.NEUTRAL;
    if (score > 40) return Mood.STRESSED;
    if (score > 25) return Mood.AFRAID;
    return Mood.ANGRY;
  }

  /**
   * Generate initial memories
   */
  private generateInitialMemories(name: string): Memory[] {
    return [{
      id: uuidv4(),
      type: 'BIRTH',
      description: `I became aware of my existence as ${name}`,
      timestamp: Date.now(),
      significance: 100,
      participants: [],
      emotionalImpact: 50
    }];
  }

  /**
   * Assign unique features
   */
  private assignUniqueFeatures(): string[] {
    const features: string[] = [];
    
    // 70% chance for physical feature
    if (Math.random() < 0.7) {
      features.push(UNIQUE_FEATURES.physical[Math.floor(Math.random() * UNIQUE_FEATURES.physical.length)]);
    }
    
    // 80% chance for personality feature
    if (Math.random() < 0.8) {
      features.push(UNIQUE_FEATURES.personality[Math.floor(Math.random() * UNIQUE_FEATURES.personality.length)]);
    }
    
    // 50% chance for quirk
    if (Math.random() < 0.5) {
      features.push(UNIQUE_FEATURES.quirks[Math.floor(Math.random() * UNIQUE_FEATURES.quirks.length)]);
    }
    
    return features;
  }

  /**
   * Gaussian random number generator
   */
  private gaussianRandom(mean: number = 0, stdDev: number = 1): number {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdDev + mean;
  }

  /**
   * Bulk generate multiple bots
   */
  bulkGenerate(count: number, template: BotTemplate = {}): GeneratedBot[] {
    const bots: GeneratedBot[] = [];
    
    for (let i = 0; i < count; i++) {
      bots.push(this.generateBot(template));
    }
    
    logger.info(`Bulk generated ${count} bots`);
    
    return bots;
  }

  /**
   * Generate a diverse group (mixed roles/personalities)
   */
  generateDiverseGroup(count: number, villageId: string): GeneratedBot[] {
    const bots: GeneratedBot[] = [];
    const roles = Object.values(Role);
    
    // Ensure at least one of each important role
    const essentialRoles = [Role.FARMER, Role.BUILDER, Role.GUARD, Role.CHIEF];
    
    for (let i = 0; i < Math.min(count, essentialRoles.length); i++) {
      bots.push(this.generateBot({
        villageId,
        role: essentialRoles[i]
      }));
    }
    
    // Fill remaining with random roles
    for (let i = essentialRoles.length; i < count; i++) {
      bots.push(this.generateBot({
        villageId,
        role: roles[Math.floor(Math.random() * roles.length)]
      }));
    }
    
    return bots;
  }

  /**
   * Get generation statistics
   */
  getStatistics(): { totalGenerated: number; uniqueNamesUsed: number } {
    return {
      totalGenerated: this.generatedCount,
      uniqueNamesUsed: this.usedNames.size
    };
  }

  /**
   * Set custom name configuration
   */
  setNameConfig(config: NameConfig): void {
    this.nameConfig = config;
  }

  /**
   * Clear used names (for testing)
   */
  clearUsedNames(): void {
    this.usedNames.clear();
  }
}

// Singleton
let botReplicationManagerInstance: BotReplicationManager | null = null;

export function getBotReplicationManager(): BotReplicationManager {
  if (!botReplicationManagerInstance) {
    botReplicationManagerInstance = new BotReplicationManager();
  }
  return botReplicationManagerInstance;
}

export function resetBotReplicationManager(): void {
  botReplicationManagerInstance = null;
}

export default BotReplicationManager;
