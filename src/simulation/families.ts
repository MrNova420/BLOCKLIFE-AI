/**
 * BlockLife AI - Family System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Handles family relationships, reproduction, and inheritance.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  Bot, 
  Gender, 
  LifeStage, 
  PersonalityTraits, 
  SkillSet,
  Relationship 
} from '../types';
import { BotAgent } from '../bots/bot-agent';
import { getBotManager } from '../bots/bot-manager';
import { createLogger } from '../utils/logger';

const logger = createLogger('families');

/**
 * Family unit representing related bots
 */
export interface Family {
  id: string;
  name: string;
  founderIds: string[];
  memberIds: string[];
  generation: number;
  traits: string[];  // Inherited family traits
  reputation: number;  // 0-100
  createdAt: number;
}

/**
 * Marriage/partnership record
 */
export interface Partnership {
  id: string;
  partner1Id: string;
  partner2Id: string;
  formedAt: number;
  childrenIds: string[];
  status: 'ACTIVE' | 'DISSOLVED' | 'WIDOWED';
}

/**
 * Birth event data
 */
export interface BirthEvent {
  childId: string;
  parent1Id: string;
  parent2Id: string;
  villageId: string;
  timestamp: number;
}

/**
 * Compatibility factors for potential partners
 */
export interface CompatibilityResult {
  score: number;  // 0-100
  factors: {
    personality: number;
    age: number;
    relationship: number;
    village: number;
  };
  canPartner: boolean;
  reason?: string;
}

/**
 * Family Manager - handles all family-related logic
 */
export class FamilyManager {
  private families: Map<string, Family> = new Map();
  private partnerships: Map<string, Partnership> = new Map();
  private birthCooldowns: Map<string, number> = new Map();  // Bot ID -> last birth time
  
  private readonly MIN_ADULT_AGE = 35;  // Percentage of lifespan
  private readonly MAX_ELDER_BIRTH_AGE = 75;
  private readonly BIRTH_COOLDOWN_MS = 300000;  // 5 minutes between births
  private readonly MIN_RELATIONSHIP_FOR_PARTNERSHIP = 60;
  private readonly MIN_COMPATIBILITY_FOR_PARTNERSHIP = 40;

  constructor() {
    logger.info('Family Manager initialized');
  }

  /**
   * Check if two bots can form a partnership
   */
  canFormPartnership(bot1: Bot, bot2: Bot): CompatibilityResult {
    const result: CompatibilityResult = {
      score: 0,
      factors: {
        personality: 0,
        age: 0,
        relationship: 0,
        village: 0
      },
      canPartner: false
    };

    // Check basic requirements
    if (bot1.id === bot2.id) {
      result.reason = 'Cannot partner with self';
      return result;
    }

    if (bot1.partnerId || bot2.partnerId) {
      result.reason = 'Already has a partner';
      return result;
    }

    if (bot1.gender === bot2.gender) {
      // Allow same-gender partnerships but no children
      // Still calculate compatibility
    }

    // Check life stage
    const validStages = [LifeStage.ADULT];
    if (!validStages.includes(bot1.lifeStage) || !validStages.includes(bot2.lifeStage)) {
      result.reason = 'Both must be adults';
      return result;
    }

    // Check if they're related (no siblings/parent-child)
    if (this.areRelated(bot1, bot2)) {
      result.reason = 'Too closely related';
      return result;
    }

    // Calculate personality compatibility
    result.factors.personality = this.calculatePersonalityCompatibility(
      bot1.personality, 
      bot2.personality
    );

    // Calculate age compatibility (closer ages = higher score)
    const ageDiff = Math.abs(bot1.age - bot2.age);
    result.factors.age = Math.max(0, 100 - ageDiff * 5);

    // Check existing relationship
    const relationship = bot1.relationships.find(r => r.targetId === bot2.id);
    result.factors.relationship = relationship ? relationship.strength : 20;

    // Same village bonus
    result.factors.village = bot1.villageId === bot2.villageId ? 100 : 50;

    // Calculate overall score
    result.score = Math.round(
      result.factors.personality * 0.3 +
      result.factors.age * 0.2 +
      result.factors.relationship * 0.35 +
      result.factors.village * 0.15
    );

    result.canPartner = 
      result.score >= this.MIN_COMPATIBILITY_FOR_PARTNERSHIP &&
      result.factors.relationship >= this.MIN_RELATIONSHIP_FOR_PARTNERSHIP;

    if (!result.canPartner && !result.reason) {
      result.reason = `Compatibility too low (${result.score}%)`;
    }

    return result;
  }

  /**
   * Calculate personality compatibility between two bots
   */
  private calculatePersonalityCompatibility(p1: PersonalityTraits, p2: PersonalityTraits): number {
    // Some traits work better when similar, others when complementary
    const similarities: (keyof PersonalityTraits)[] = ['loyalty', 'wisdom', 'industry'];
    const complements: (keyof PersonalityTraits)[] = ['bravery', 'sociability', 'aggression'];
    
    let score = 50;  // Base score
    
    // Similar traits
    for (const trait of similarities) {
      const diff = Math.abs(p1[trait] - p2[trait]);
      score += (100 - diff) * 0.1;
    }
    
    // Complementary traits (moderate difference is good)
    for (const trait of complements) {
      const diff = Math.abs(p1[trait] - p2[trait]);
      // Sweet spot is around 20-40 difference
      if (diff >= 20 && diff <= 40) {
        score += 10;
      } else if (diff > 60) {
        score -= 10;
      }
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check if two bots are closely related
   */
  areRelated(bot1: Bot, bot2: Bot): boolean {
    // Siblings (share a parent)
    for (const parentId of bot1.parentIds) {
      if (bot2.parentIds.includes(parentId)) {
        return true;
      }
    }
    
    // Parent-child
    if (bot1.parentIds.includes(bot2.id) || bot2.parentIds.includes(bot1.id)) {
      return true;
    }
    
    // Child-parent
    if (bot1.childIds.includes(bot2.id) || bot2.childIds.includes(bot1.id)) {
      return true;
    }
    
    return false;
  }

  /**
   * Form a partnership between two bots
   */
  formPartnership(bot1Id: string, bot2Id: string): Partnership | null {
    const botManager = getBotManager();
    const agent1 = botManager.getBot(bot1Id);
    const agent2 = botManager.getBot(bot2Id);
    
    if (!agent1 || !agent2) {
      logger.warn('Cannot form partnership: bot not found');
      return null;
    }
    
    const bot1 = agent1.getData();
    const bot2 = agent2.getData();
    
    const compatibility = this.canFormPartnership(bot1, bot2);
    if (!compatibility.canPartner) {
      logger.debug(`Partnership rejected: ${compatibility.reason}`);
      return null;
    }
    
    const partnership: Partnership = {
      id: uuidv4(),
      partner1Id: bot1Id,
      partner2Id: bot2Id,
      formedAt: Date.now(),
      childrenIds: [],
      status: 'ACTIVE'
    };
    
    this.partnerships.set(partnership.id, partnership);
    
    // Update bot data (would need bot agent methods for this)
    // For now, log the event
    logger.info(`Partnership formed: ${bot1.name} and ${bot2.name}`);
    
    return partnership;
  }

  /**
   * Check if a couple can have a child
   */
  canHaveChild(partnership: Partnership): { can: boolean; reason?: string } {
    if (partnership.status !== 'ACTIVE') {
      return { can: false, reason: 'Partnership not active' };
    }
    
    const botManager = getBotManager();
    const agent1 = botManager.getBot(partnership.partner1Id);
    const agent2 = botManager.getBot(partnership.partner2Id);
    
    if (!agent1 || !agent2) {
      return { can: false, reason: 'Partner not found' };
    }
    
    const bot1 = agent1.getData();
    const bot2 = agent2.getData();
    
    // Check if both are alive
    if (bot1.flags.isDead || bot2.flags.isDead) {
      return { can: false, reason: 'Partner deceased' };
    }
    
    // Check life stages
    if (bot1.lifeStage === LifeStage.CHILD || bot1.lifeStage === LifeStage.TEEN ||
        bot2.lifeStage === LifeStage.CHILD || bot2.lifeStage === LifeStage.TEEN) {
      return { can: false, reason: 'Too young' };
    }
    
    // Check if elder is too old
    const agePercent1 = (bot1.age / 100) * 100;
    const agePercent2 = (bot2.age / 100) * 100;
    if (agePercent1 > this.MAX_ELDER_BIRTH_AGE || agePercent2 > this.MAX_ELDER_BIRTH_AGE) {
      return { can: false, reason: 'Too old' };
    }
    
    // Check gender (need different genders for biological children)
    if (bot1.gender === bot2.gender) {
      return { can: false, reason: 'Same gender partnership' };
    }
    
    // Check birth cooldown
    const cooldown1 = this.birthCooldowns.get(partnership.partner1Id) || 0;
    const cooldown2 = this.birthCooldowns.get(partnership.partner2Id) || 0;
    const now = Date.now();
    
    if (now - cooldown1 < this.BIRTH_COOLDOWN_MS || now - cooldown2 < this.BIRTH_COOLDOWN_MS) {
      return { can: false, reason: 'Birth cooldown active' };
    }
    
    // Check village resources
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const village = require('./villages').getVillageManager().getVillage(bot1.villageId);
    if (village && village.stockpile.food < 50) {
      return { can: false, reason: 'Insufficient food in village' };
    }
    
    return { can: true };
  }

  /**
   * Create a child from two parents
   */
  createChild(partnership: Partnership, villageId: string): BirthEvent | null {
    const check = this.canHaveChild(partnership);
    if (!check.can) {
      logger.debug(`Cannot create child: ${check.reason}`);
      return null;
    }
    
    const botManager = getBotManager();
    const parent1 = botManager.getBot(partnership.partner1Id);
    const parent2 = botManager.getBot(partnership.partner2Id);
    
    if (!parent1 || !parent2) {
      return null;
    }
    
    const p1Data = parent1.getData();
    const p2Data = parent2.getData();
    
    // Create child bot
    const child = botManager.createBot({
      villageId,
      position: p1Data.position,  // Born at parent's location
      parentA: p1Data,
      parentB: p2Data
    });
    
    // Record birth
    partnership.childrenIds.push(child.id);
    this.birthCooldowns.set(partnership.partner1Id, Date.now());
    this.birthCooldowns.set(partnership.partner2Id, Date.now());
    
    const birthEvent: BirthEvent = {
      childId: child.id,
      parent1Id: partnership.partner1Id,
      parent2Id: partnership.partner2Id,
      villageId,
      timestamp: Date.now()
    };
    
    logger.info(`Child born: ${child.name} to ${p1Data.name} and ${p2Data.name}`);
    
    return birthEvent;
  }

  /**
   * Inherit traits from parents
   */
  inheritTraits(parentTraits1: PersonalityTraits, parentTraits2: PersonalityTraits): PersonalityTraits {
    const inherit = (val1: number, val2: number): number => {
      // Average with random variation
      const avg = (val1 + val2) / 2;
      const variation = (Math.random() - 0.5) * 30;  // ±15
      return Math.max(0, Math.min(100, Math.round(avg + variation)));
    };
    
    return {
      bravery: inherit(parentTraits1.bravery, parentTraits2.bravery),
      curiosity: inherit(parentTraits1.curiosity, parentTraits2.curiosity),
      sociability: inherit(parentTraits1.sociability, parentTraits2.sociability),
      industry: inherit(parentTraits1.industry, parentTraits2.industry),
      creativity: inherit(parentTraits1.creativity, parentTraits2.creativity),
      aggression: inherit(parentTraits1.aggression, parentTraits2.aggression),
      loyalty: inherit(parentTraits1.loyalty, parentTraits2.loyalty),
      wisdom: inherit(parentTraits1.wisdom, parentTraits2.wisdom)
    };
  }

  /**
   * Inherit skills with potential bonus
   */
  inheritSkillPotential(parentSkills1: SkillSet, parentSkills2: SkillSet): SkillSet {
    // Children start with low skills but higher potential based on parents
    const inheritPotential = (val1: number, val2: number): number => {
      const parentMax = Math.max(val1, val2);
      // Start at 5-15, but potential bonus from parents
      const base = 5 + Math.floor(Math.random() * 10);
      const bonus = Math.floor(parentMax * 0.1);  // 10% of best parent's skill
      return Math.min(30, base + bonus);
    };
    
    return {
      mining: inheritPotential(parentSkills1.mining, parentSkills2.mining),
      farming: inheritPotential(parentSkills1.farming, parentSkills2.farming),
      building: inheritPotential(parentSkills1.building, parentSkills2.building),
      combat: inheritPotential(parentSkills1.combat, parentSkills2.combat),
      crafting: inheritPotential(parentSkills1.crafting, parentSkills2.crafting),
      trading: inheritPotential(parentSkills1.trading, parentSkills2.trading),
      leadership: inheritPotential(parentSkills1.leadership, parentSkills2.leadership),
      scholarship: inheritPotential(parentSkills1.scholarship, parentSkills2.scholarship)
    };
  }

  /**
   * Get or create a family for a bot
   */
  getOrCreateFamily(bot: Bot): Family {
    // Check if bot has a family through parents
    for (const parentId of bot.parentIds) {
      for (const family of this.families.values()) {
        if (family.memberIds.includes(parentId)) {
          // Add bot to existing family
          if (!family.memberIds.includes(bot.id)) {
            family.memberIds.push(bot.id);
          }
          return family;
        }
      }
    }
    
    // Create new family
    const family: Family = {
      id: uuidv4(),
      name: `${bot.name.split(' ')[1]} Family`,  // Use last name
      founderIds: [bot.id],
      memberIds: [bot.id],
      generation: 1,
      traits: this.deriveTraits(bot.personality),
      reputation: 50,
      createdAt: Date.now()
    };
    
    this.families.set(family.id, family);
    return family;
  }

  /**
   * Derive family traits from personality
   */
  private deriveTraits(personality: PersonalityTraits): string[] {
    const traits: string[] = [];
    
    if (personality.bravery > 70) traits.push('BRAVE');
    if (personality.wisdom > 70) traits.push('WISE');
    if (personality.industry > 70) traits.push('INDUSTRIOUS');
    if (personality.creativity > 70) traits.push('CREATIVE');
    if (personality.loyalty > 70) traits.push('LOYAL');
    if (personality.sociability > 70) traits.push('SOCIABLE');
    if (personality.aggression > 70) traits.push('FIERCE');
    if (personality.curiosity > 70) traits.push('CURIOUS');
    
    return traits;
  }

  /**
   * Get family tree for a bot
   */
  getFamilyTree(botId: string, depth: number = 3): object {
    const botManager = getBotManager();
    const agent = botManager.getBot(botId);
    
    if (!agent) {
      return {};
    }
    
    const bot = agent.getData();
    const tree: any = {
      id: bot.id,
      name: bot.name,
      lifeStage: bot.lifeStage,
      isDead: bot.flags.isDead
    };
    
    if (depth > 0) {
      // Parents
      tree.parents = bot.parentIds.map(parentId => {
        const parentAgent = botManager.getBot(parentId);
        if (parentAgent) {
          return this.getFamilyTree(parentId, depth - 1);
        }
        return { id: parentId, name: 'Unknown' };
      });
      
      // Children
      tree.children = bot.childIds.map(childId => {
        const childAgent = botManager.getBot(childId);
        if (childAgent) {
          return this.getFamilyTree(childId, depth - 1);
        }
        return { id: childId, name: 'Unknown' };
      });
      
      // Partner
      if (bot.partnerId) {
        const partnerAgent = botManager.getBot(bot.partnerId);
        if (partnerAgent) {
          const partnerData = partnerAgent.getData();
          tree.partner = {
            id: partnerData.id,
            name: partnerData.name,
            lifeStage: partnerData.lifeStage
          };
        }
      }
    }
    
    return tree;
  }

  /**
   * Handle death effects on partnerships
   */
  handleDeath(botId: string): void {
    // Find partnerships involving this bot
    for (const partnership of this.partnerships.values()) {
      if (partnership.partner1Id === botId || partnership.partner2Id === botId) {
        if (partnership.status === 'ACTIVE') {
          partnership.status = 'WIDOWED';
          logger.info(`Partnership ${partnership.id} widowed due to death`);
        }
      }
    }
  }

  /**
   * Get all partnerships
   */
  getAllPartnerships(): Partnership[] {
    return Array.from(this.partnerships.values());
  }

  /**
   * Get all families
   */
  getAllFamilies(): Family[] {
    return Array.from(this.families.values());
  }

  /**
   * Serialize for persistence
   */
  serialize(): {
    families: Family[];
    partnerships: Partnership[];
  } {
    return {
      families: Array.from(this.families.values()),
      partnerships: Array.from(this.partnerships.values())
    };
  }

  /**
   * Load from persistence
   */
  load(data: { families: Family[]; partnerships: Partnership[] }): void {
    this.families.clear();
    this.partnerships.clear();
    
    for (const family of data.families || []) {
      this.families.set(family.id, family);
    }
    
    for (const partnership of data.partnerships || []) {
      this.partnerships.set(partnership.id, partnership);
    }
    
    logger.info(`Loaded ${this.families.size} families, ${this.partnerships.size} partnerships`);
  }
}

// Singleton
let familyManagerInstance: FamilyManager | null = null;

export function getFamilyManager(): FamilyManager {
  if (!familyManagerInstance) {
    familyManagerInstance = new FamilyManager();
  }
  return familyManagerInstance;
}

export function resetFamilyManager(): void {
  familyManagerInstance = null;
}

export default FamilyManager;
