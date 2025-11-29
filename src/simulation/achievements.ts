/**
 * BlockLife AI - Achievement and Milestone System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Tracks accomplishments of bots and villages, providing goals
 * and recognition for significant achievements.
 */

import { v4 as uuidv4 } from 'uuid';
import { Bot, Village, Role, LifeStage, TechAge } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('achievements');

/**
 * Achievement categories
 */
export enum AchievementCategory {
  SURVIVAL = 'SURVIVAL',           // Staying alive
  SOCIAL = 'SOCIAL',               // Relationships
  WORK = 'WORK',                   // Job performance
  EXPLORATION = 'EXPLORATION',     // Discovery
  COMBAT = 'COMBAT',               // Fighting
  LEADERSHIP = 'LEADERSHIP',       // Village governance
  FAMILY = 'FAMILY',               // Family milestones
  CRAFTING = 'CRAFTING',           // Creating items
  BUILDING = 'BUILDING',           // Construction
  KNOWLEDGE = 'KNOWLEDGE',         // Learning/research
  LEGACY = 'LEGACY',               // Long-term impact
  SPECIAL = 'SPECIAL'              // Unique/rare achievements
}

/**
 * Achievement tier/difficulty
 */
export enum AchievementTier {
  COMMON = 'COMMON',               // Easy, frequent
  UNCOMMON = 'UNCOMMON',           // Moderate effort
  RARE = 'RARE',                   // Significant effort
  EPIC = 'EPIC',                   // Major accomplishment
  LEGENDARY = 'LEGENDARY'          // Exceptional, rare
}

/**
 * Achievement definition
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  icon: string;                    // Emoji representation
  requirement: AchievementRequirement;
  reward?: AchievementReward;
  secret: boolean;                 // Hidden until earned
}

/**
 * Requirements to earn an achievement
 */
export interface AchievementRequirement {
  type: 'COUNT' | 'THRESHOLD' | 'EVENT' | 'COMBINATION';
  target: number | string;
  current?: number;
  conditions?: string[];
}

/**
 * Rewards for earning achievements
 */
export interface AchievementReward {
  type: 'SKILL_BOOST' | 'TITLE' | 'REPUTATION' | 'TRAIT';
  value: string | number;
}

/**
 * Record of a bot earning an achievement
 */
export interface AchievementRecord {
  id: string;
  achievementId: string;
  earnedBy: string;                // Bot or village ID
  earnedAt: number;
  progress?: number;               // For progressive achievements
  witnessed?: string[];            // Bot IDs who saw it happen
}

/**
 * Milestone for village progress
 */
export interface Milestone {
  id: string;
  name: string;
  description: string;
  villageId: string;
  condition: string;
  reachedAt?: number;
  celebratedBy?: string[];         // Bots who celebrated
}

/**
 * Title earned through achievements
 */
export interface Title {
  id: string;
  name: string;
  description: string;
  requiresAchievement: string;     // Achievement ID
}

// Predefined achievements
export const ACHIEVEMENTS: Achievement[] = [
  // SURVIVAL
  {
    id: 'first_dawn',
    name: 'First Dawn',
    description: 'Survive your first night',
    category: AchievementCategory.SURVIVAL,
    tier: AchievementTier.COMMON,
    icon: '🌅',
    requirement: { type: 'EVENT', target: 'SURVIVED_NIGHT' },
    secret: false
  },
  {
    id: 'survivor',
    name: 'Survivor',
    description: 'Live for 100 game days',
    category: AchievementCategory.SURVIVAL,
    tier: AchievementTier.UNCOMMON,
    icon: '💪',
    requirement: { type: 'THRESHOLD', target: 100 },
    secret: false
  },
  {
    id: 'ancient_one',
    name: 'The Ancient One',
    description: 'Reach elder status',
    category: AchievementCategory.SURVIVAL,
    tier: AchievementTier.RARE,
    icon: '👴',
    requirement: { type: 'EVENT', target: 'BECAME_ELDER' },
    reward: { type: 'TITLE', value: 'Elder' },
    secret: false
  },
  {
    id: 'death_defier',
    name: 'Death Defier',
    description: 'Survive with less than 10 health',
    category: AchievementCategory.SURVIVAL,
    tier: AchievementTier.RARE,
    icon: '💀',
    requirement: { type: 'EVENT', target: 'NEAR_DEATH_SURVIVAL' },
    secret: true
  },
  
  // SOCIAL
  {
    id: 'friend_maker',
    name: 'Friend Maker',
    description: 'Form 5 friendships',
    category: AchievementCategory.SOCIAL,
    tier: AchievementTier.COMMON,
    icon: '🤝',
    requirement: { type: 'COUNT', target: 5 },
    secret: false
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Have 20+ relationships',
    category: AchievementCategory.SOCIAL,
    tier: AchievementTier.UNCOMMON,
    icon: '🦋',
    requirement: { type: 'THRESHOLD', target: 20 },
    secret: false
  },
  {
    id: 'beloved',
    name: 'Beloved',
    description: 'Have max trust with 3 bots',
    category: AchievementCategory.SOCIAL,
    tier: AchievementTier.RARE,
    icon: '❤️',
    requirement: { type: 'COUNT', target: 3 },
    reward: { type: 'REPUTATION', value: 10 },
    secret: false
  },
  {
    id: 'matchmaker',
    name: 'Matchmaker',
    description: 'Introduce bots who later partner',
    category: AchievementCategory.SOCIAL,
    tier: AchievementTier.RARE,
    icon: '💘',
    requirement: { type: 'EVENT', target: 'SUCCESSFUL_MATCHMAKING' },
    secret: true
  },
  
  // WORK
  {
    id: 'hard_worker',
    name: 'Hard Worker',
    description: 'Complete 50 tasks',
    category: AchievementCategory.WORK,
    tier: AchievementTier.COMMON,
    icon: '⚒️',
    requirement: { type: 'COUNT', target: 50 },
    secret: false
  },
  {
    id: 'master_craftsman',
    name: 'Master Craftsman',
    description: 'Reach 100 crafting skill',
    category: AchievementCategory.WORK,
    tier: AchievementTier.RARE,
    icon: '🔨',
    requirement: { type: 'THRESHOLD', target: 100 },
    reward: { type: 'TITLE', value: 'Master Craftsman' },
    secret: false
  },
  {
    id: 'jack_of_trades',
    name: 'Jack of All Trades',
    description: 'Have 50+ in all skills',
    category: AchievementCategory.WORK,
    tier: AchievementTier.EPIC,
    icon: '🃏',
    requirement: { type: 'COMBINATION', target: 'ALL_SKILLS_50' },
    secret: false
  },
  
  // FAMILY
  {
    id: 'parent',
    name: 'Parent',
    description: 'Have your first child',
    category: AchievementCategory.FAMILY,
    tier: AchievementTier.COMMON,
    icon: '👶',
    requirement: { type: 'COUNT', target: 1 },
    secret: false
  },
  {
    id: 'large_family',
    name: 'Large Family',
    description: 'Have 5+ children',
    category: AchievementCategory.FAMILY,
    tier: AchievementTier.UNCOMMON,
    icon: '👨‍👩‍👧‍👦',
    requirement: { type: 'COUNT', target: 5 },
    secret: false
  },
  {
    id: 'grandparent',
    name: 'Grandparent',
    description: 'Live to see grandchildren',
    category: AchievementCategory.FAMILY,
    tier: AchievementTier.RARE,
    icon: '👵',
    requirement: { type: 'EVENT', target: 'BECAME_GRANDPARENT' },
    secret: false
  },
  {
    id: 'dynasty_founder',
    name: 'Dynasty Founder',
    description: 'Have descendants spanning 3 generations',
    category: AchievementCategory.FAMILY,
    tier: AchievementTier.EPIC,
    icon: '👑',
    requirement: { type: 'THRESHOLD', target: 3 },
    reward: { type: 'TITLE', value: 'Patriarch' },
    secret: false
  },
  
  // LEADERSHIP
  {
    id: 'elected',
    name: 'Elected Official',
    description: 'Win your first election',
    category: AchievementCategory.LEADERSHIP,
    tier: AchievementTier.UNCOMMON,
    icon: '🗳️',
    requirement: { type: 'EVENT', target: 'WON_ELECTION' },
    secret: false
  },
  {
    id: 'village_leader',
    name: 'Village Leader',
    description: 'Become village leader',
    category: AchievementCategory.LEADERSHIP,
    tier: AchievementTier.RARE,
    icon: '🏛️',
    requirement: { type: 'EVENT', target: 'BECAME_LEADER' },
    reward: { type: 'TITLE', value: 'Chief' },
    secret: false
  },
  {
    id: 'golden_age',
    name: 'Golden Age',
    description: 'Lead village to 90+ prosperity',
    category: AchievementCategory.LEADERSHIP,
    tier: AchievementTier.EPIC,
    icon: '✨',
    requirement: { type: 'THRESHOLD', target: 90 },
    secret: false
  },
  
  // COMBAT
  {
    id: 'first_battle',
    name: 'Battle Hardened',
    description: 'Survive your first battle',
    category: AchievementCategory.COMBAT,
    tier: AchievementTier.COMMON,
    icon: '⚔️',
    requirement: { type: 'EVENT', target: 'SURVIVED_BATTLE' },
    secret: false
  },
  {
    id: 'monster_slayer',
    name: 'Monster Slayer',
    description: 'Kill 10 hostile mobs',
    category: AchievementCategory.COMBAT,
    tier: AchievementTier.UNCOMMON,
    icon: '🐉',
    requirement: { type: 'COUNT', target: 10 },
    secret: false
  },
  {
    id: 'hero',
    name: 'Hero',
    description: 'Save the village from an attack',
    category: AchievementCategory.COMBAT,
    tier: AchievementTier.RARE,
    icon: '🦸',
    requirement: { type: 'EVENT', target: 'SAVED_VILLAGE' },
    reward: { type: 'TITLE', value: 'Hero' },
    secret: false
  },
  {
    id: 'legend_slayer',
    name: 'Legend Slayer',
    description: 'Defeat a boss mob',
    category: AchievementCategory.COMBAT,
    tier: AchievementTier.LEGENDARY,
    icon: '💎',
    requirement: { type: 'EVENT', target: 'KILLED_BOSS' },
    reward: { type: 'TITLE', value: 'Dragonslayer' },
    secret: true
  },
  
  // EXPLORATION
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Visit 5 unique locations',
    category: AchievementCategory.EXPLORATION,
    tier: AchievementTier.COMMON,
    icon: '🗺️',
    requirement: { type: 'COUNT', target: 5 },
    secret: false
  },
  {
    id: 'cartographer',
    name: 'Cartographer',
    description: 'Map 20 locations',
    category: AchievementCategory.EXPLORATION,
    tier: AchievementTier.UNCOMMON,
    icon: '🧭',
    requirement: { type: 'COUNT', target: 20 },
    secret: false
  },
  {
    id: 'pioneer',
    name: 'Pioneer',
    description: 'Be first to discover a new biome',
    category: AchievementCategory.EXPLORATION,
    tier: AchievementTier.RARE,
    icon: '🏔️',
    requirement: { type: 'EVENT', target: 'FIRST_BIOME_DISCOVERY' },
    reward: { type: 'TITLE', value: 'Pioneer' },
    secret: false
  },
  
  // BUILDING
  {
    id: 'first_structure',
    name: 'Builder',
    description: 'Complete your first building',
    category: AchievementCategory.BUILDING,
    tier: AchievementTier.COMMON,
    icon: '🏠',
    requirement: { type: 'COUNT', target: 1 },
    secret: false
  },
  {
    id: 'architect',
    name: 'Architect',
    description: 'Design 10 structures',
    category: AchievementCategory.BUILDING,
    tier: AchievementTier.UNCOMMON,
    icon: '📐',
    requirement: { type: 'COUNT', target: 10 },
    reward: { type: 'TITLE', value: 'Architect' },
    secret: false
  },
  {
    id: 'wonder_builder',
    name: 'Wonder Builder',
    description: 'Build a temple or monument',
    category: AchievementCategory.BUILDING,
    tier: AchievementTier.EPIC,
    icon: '🏛️',
    requirement: { type: 'EVENT', target: 'BUILT_WONDER' },
    secret: false
  },
  
  // KNOWLEDGE
  {
    id: 'student',
    name: 'Student',
    description: 'Learn your first skill',
    category: AchievementCategory.KNOWLEDGE,
    tier: AchievementTier.COMMON,
    icon: '📚',
    requirement: { type: 'COUNT', target: 1 },
    secret: false
  },
  {
    id: 'scholar',
    name: 'Scholar',
    description: 'Reach 80 scholarship',
    category: AchievementCategory.KNOWLEDGE,
    tier: AchievementTier.UNCOMMON,
    icon: '🎓',
    requirement: { type: 'THRESHOLD', target: 80 },
    reward: { type: 'TITLE', value: 'Scholar' },
    secret: false
  },
  {
    id: 'researcher',
    name: 'Researcher',
    description: 'Complete a research project',
    category: AchievementCategory.KNOWLEDGE,
    tier: AchievementTier.RARE,
    icon: '🔬',
    requirement: { type: 'EVENT', target: 'COMPLETED_RESEARCH' },
    secret: false
  },
  
  // LEGACY
  {
    id: 'remembered',
    name: 'Remembered',
    description: 'Be mentioned in a story after death',
    category: AchievementCategory.LEGACY,
    tier: AchievementTier.RARE,
    icon: '📜',
    requirement: { type: 'EVENT', target: 'POSTHUMOUS_MENTION' },
    secret: true
  },
  {
    id: 'legend',
    name: 'Legend',
    description: 'Have a legend told about you',
    category: AchievementCategory.LEGACY,
    tier: AchievementTier.EPIC,
    icon: '⭐',
    requirement: { type: 'EVENT', target: 'LEGEND_CREATED' },
    reward: { type: 'TITLE', value: 'The Legendary' },
    secret: false
  },
  {
    id: 'immortal',
    name: 'Immortal',
    description: 'Be remembered for 10 generations',
    category: AchievementCategory.LEGACY,
    tier: AchievementTier.LEGENDARY,
    icon: '♾️',
    requirement: { type: 'THRESHOLD', target: 10 },
    secret: true
  },
  
  // SPECIAL
  {
    id: 'first_villager',
    name: 'First Villager',
    description: 'Be the founding member of a village',
    category: AchievementCategory.SPECIAL,
    tier: AchievementTier.RARE,
    icon: '🏴',
    requirement: { type: 'EVENT', target: 'FOUNDING_MEMBER' },
    reward: { type: 'TITLE', value: 'Founder' },
    secret: false
  },
  {
    id: 'peacemaker',
    name: 'Peacemaker',
    description: 'End a war through diplomacy',
    category: AchievementCategory.SPECIAL,
    tier: AchievementTier.EPIC,
    icon: '🕊️',
    requirement: { type: 'EVENT', target: 'ENDED_WAR_PEACEFULLY' },
    reward: { type: 'TITLE', value: 'The Peacemaker' },
    secret: false
  },
  {
    id: 'prophet',
    name: 'Prophet',
    description: 'Make a prophecy that comes true',
    category: AchievementCategory.SPECIAL,
    tier: AchievementTier.LEGENDARY,
    icon: '🔮',
    requirement: { type: 'EVENT', target: 'PROPHECY_FULFILLED' },
    reward: { type: 'TITLE', value: 'Prophet' },
    secret: true
  }
];

/**
 * Achievement Manager
 */
export class AchievementManager {
  private records: Map<string, AchievementRecord[]> = new Map();  // entityId -> records
  private milestones: Map<string, Milestone[]> = new Map();       // villageId -> milestones
  private titles: Map<string, string[]> = new Map();              // botId -> earned titles
  
  constructor() {
    logger.info('Achievement Manager initialized');
  }

  /**
   * Check and award an achievement
   */
  checkAndAward(entityId: string, event: string, value?: number): AchievementRecord | null {
    // Find matching achievements
    for (const achievement of ACHIEVEMENTS) {
      if (this.hasAchievement(entityId, achievement.id)) {
        continue;  // Already earned
      }
      
      let earned = false;
      
      switch (achievement.requirement.type) {
        case 'EVENT':
          earned = achievement.requirement.target === event;
          break;
        case 'COUNT':
          if (value !== undefined) {
            earned = value >= (achievement.requirement.target as number);
          }
          break;
        case 'THRESHOLD':
          if (value !== undefined) {
            earned = value >= (achievement.requirement.target as number);
          }
          break;
        case 'COMBINATION':
          // Complex requirements checked elsewhere
          break;
      }
      
      if (earned) {
        return this.awardAchievement(entityId, achievement.id);
      }
    }
    
    return null;
  }

  /**
   * Award a specific achievement
   */
  awardAchievement(entityId: string, achievementId: string, witnessed?: string[]): AchievementRecord | null {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return null;
    
    if (this.hasAchievement(entityId, achievementId)) {
      return null;  // Already has it
    }
    
    const record: AchievementRecord = {
      id: uuidv4(),
      achievementId,
      earnedBy: entityId,
      earnedAt: Date.now(),
      witnessed
    };
    
    if (!this.records.has(entityId)) {
      this.records.set(entityId, []);
    }
    this.records.get(entityId)!.push(record);
    
    // Grant rewards
    if (achievement.reward) {
      this.grantReward(entityId, achievement.reward);
    }
    
    logger.info(`Achievement earned: ${achievement.name} by ${entityId}`);
    
    return record;
  }

  /**
   * Grant achievement reward
   */
  private grantReward(entityId: string, reward: AchievementReward): void {
    if (reward.type === 'TITLE') {
      if (!this.titles.has(entityId)) {
        this.titles.set(entityId, []);
      }
      this.titles.get(entityId)!.push(reward.value as string);
    }
    // Other reward types would be handled by respective managers
  }

  /**
   * Check if entity has achievement
   */
  hasAchievement(entityId: string, achievementId: string): boolean {
    const records = this.records.get(entityId) || [];
    return records.some(r => r.achievementId === achievementId);
  }

  /**
   * Get all achievements for entity
   */
  getAchievements(entityId: string): AchievementRecord[] {
    return this.records.get(entityId) || [];
  }

  /**
   * Get achievement progress
   */
  getProgress(entityId: string): { earned: number; total: number; percentage: number } {
    const earned = this.getAchievements(entityId).length;
    const total = ACHIEVEMENTS.filter(a => !a.secret).length;
    return {
      earned,
      total,
      percentage: Math.round((earned / total) * 100)
    };
  }

  /**
   * Get titles for a bot
   */
  getTitles(botId: string): string[] {
    return this.titles.get(botId) || [];
  }

  /**
   * Get primary title (most impressive)
   */
  getPrimaryTitle(botId: string): string | null {
    const titles = this.getTitles(botId);
    if (titles.length === 0) return null;
    
    // Return the most recent/impressive title
    return titles[titles.length - 1];
  }

  /**
   * Add village milestone
   */
  addMilestone(villageId: string, name: string, description: string, condition: string): Milestone {
    const milestone: Milestone = {
      id: uuidv4(),
      name,
      description,
      villageId,
      condition
    };
    
    if (!this.milestones.has(villageId)) {
      this.milestones.set(villageId, []);
    }
    this.milestones.get(villageId)!.push(milestone);
    
    return milestone;
  }

  /**
   * Mark milestone as reached
   */
  reachMilestone(milestoneId: string, celebratedBy?: string[]): void {
    for (const [_villageId, milestones] of this.milestones) {
      const milestone = milestones.find(m => m.id === milestoneId);
      if (milestone && !milestone.reachedAt) {
        milestone.reachedAt = Date.now();
        milestone.celebratedBy = celebratedBy;
        logger.info(`Milestone reached: ${milestone.name}`);
        return;
      }
    }
  }

  /**
   * Get village milestones
   */
  getMilestones(villageId: string): Milestone[] {
    return this.milestones.get(villageId) || [];
  }

  /**
   * Get unreached milestones
   */
  getUnreachedMilestones(villageId: string): Milestone[] {
    return (this.milestones.get(villageId) || []).filter(m => !m.reachedAt);
  }

  /**
   * Get achievement by ID
   */
  getAchievementDefinition(achievementId: string): Achievement | undefined {
    return ACHIEVEMENTS.find(a => a.id === achievementId);
  }

  /**
   * Get achievements by category
   */
  getAchievementsByCategory(category: AchievementCategory): Achievement[] {
    return ACHIEVEMENTS.filter(a => a.category === category);
  }

  /**
   * Get achievements by tier
   */
  getAchievementsByTier(tier: AchievementTier): Achievement[] {
    return ACHIEVEMENTS.filter(a => a.tier === tier);
  }

  /**
   * Get recently earned achievements across all entities
   */
  getRecentAchievements(limit: number = 10): AchievementRecord[] {
    const allRecords: AchievementRecord[] = [];
    
    for (const records of this.records.values()) {
      allRecords.push(...records);
    }
    
    return allRecords
      .sort((a, b) => b.earnedAt - a.earnedAt)
      .slice(0, limit);
  }

  /**
   * Serialize for persistence
   */
  serialize(): {
    records: { entityId: string; records: AchievementRecord[] }[];
    milestones: { villageId: string; milestones: Milestone[] }[];
    titles: { botId: string; titles: string[] }[];
  } {
    return {
      records: Array.from(this.records.entries()).map(([entityId, records]) => ({
        entityId,
        records
      })),
      milestones: Array.from(this.milestones.entries()).map(([villageId, milestones]) => ({
        villageId,
        milestones
      })),
      titles: Array.from(this.titles.entries()).map(([botId, titles]) => ({
        botId,
        titles
      }))
    };
  }

  /**
   * Load from persistence
   */
  load(data: {
    records?: { entityId: string; records: AchievementRecord[] }[];
    milestones?: { villageId: string; milestones: Milestone[] }[];
    titles?: { botId: string; titles: string[] }[];
  }): void {
    this.records.clear();
    this.milestones.clear();
    this.titles.clear();
    
    for (const entry of data.records || []) {
      this.records.set(entry.entityId, entry.records);
    }
    
    for (const entry of data.milestones || []) {
      this.milestones.set(entry.villageId, entry.milestones);
    }
    
    for (const entry of data.titles || []) {
      this.titles.set(entry.botId, entry.titles);
    }
    
    logger.info('Achievement data loaded');
  }
}

// Singleton
let achievementManagerInstance: AchievementManager | null = null;

export function getAchievementManager(): AchievementManager {
  if (!achievementManagerInstance) {
    achievementManagerInstance = new AchievementManager();
  }
  return achievementManagerInstance;
}

export function resetAchievementManager(): void {
  achievementManagerInstance = null;
}

export default AchievementManager;
