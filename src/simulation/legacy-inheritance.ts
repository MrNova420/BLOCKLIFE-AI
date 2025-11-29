/**
 * BlockLife AI - Legacy and Inheritance System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Tracks lineages, inherited traits, family legacies, and the
 * lasting impact of bots across generations.
 */

import { v4 as uuidv4 } from 'uuid';
import { Bot, PersonalityTraits, SkillSet, Village } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('legacy');

/**
 * Types of inheritance
 */
export enum InheritanceType {
  TRAIT = 'TRAIT',               // Personality trait
  SKILL = 'SKILL',               // Skill aptitude
  PHYSICAL = 'PHYSICAL',         // Physical characteristic
  TITLE = 'TITLE',               // Hereditary title
  PROPERTY = 'PROPERTY',         // Ownership
  REPUTATION = 'REPUTATION',     // Family reputation
  CURSE = 'CURSE',               // Negative inheritance
  BLESSING = 'BLESSING'          // Positive inheritance
}

/**
 * An inherited characteristic
 */
export interface Inheritance {
  id: string;
  type: InheritanceType;
  name: string;
  description: string;
  value: number | string;
  originBotId: string;           // Who started this inheritance
  currentHolderId?: string;      // Current holder
  passedThrough: string[];       // Bot IDs in inheritance chain
  strength: number;              // 0-100, how strong the inheritance is
  mutated: boolean;              // Has it changed over time
  createdAt: number;
}

/**
 * Family lineage record
 */
export interface Lineage {
  id: string;
  familyName: string;
  founderId: string;
  currentHeadId?: string;
  members: LineageMember[];
  inheritances: string[];        // Inheritance IDs
  motto?: string;
  colors?: string[];             // Family colors
  achievements: string[];
  reputation: number;            // -100 to 100
  generationCount: number;
  villageId: string;
  createdAt: number;
}

/**
 * A member in a lineage
 */
export interface LineageMember {
  botId: string;
  generation: number;
  relation: 'FOUNDER' | 'DESCENDANT' | 'SPOUSE' | 'ADOPTED';
  parentIds: string[];
  childIds: string[];
  status: 'ALIVE' | 'DECEASED';
  joinedAt: number;
  leftAt?: number;
  notable: boolean;
  notableReason?: string;
}

/**
 * Legacy event - something that affects family history
 */
export interface LegacyEvent {
  id: string;
  lineageId: string;
  type: 'ACHIEVEMENT' | 'SHAME' | 'ALLIANCE' | 'FEUD' | 'MILESTONE' | 'TRAGEDY';
  description: string;
  involvedBotIds: string[];
  impactOnReputation: number;    // -50 to 50
  timestamp: number;
  remembered: boolean;           // Is this still talked about
}

/**
 * Family feud between lineages
 */
export interface FamilyFeud {
  id: string;
  lineage1Id: string;
  lineage2Id: string;
  cause: string;
  severity: number;              // 1-10
  startedAt: number;
  resolvedAt?: number;
  casualties: string[];          // Bot IDs
  events: string[];              // LegacyEvent IDs
  status: 'ACTIVE' | 'COOLING' | 'RESOLVED' | 'FORGOTTEN';
}

/**
 * Marriage alliance between families
 */
export interface MarriageAlliance {
  id: string;
  lineage1Id: string;
  lineage2Id: string;
  bot1Id: string;
  bot2Id: string;
  formedAt: number;
  status: 'ACTIVE' | 'DISSOLVED' | 'WIDOWED';
  childrenIds: string[];
  politicalValue: number;        // 0-100
}

/**
 * Hereditary title
 */
export interface HereditaryTitle {
  id: string;
  name: string;
  description: string;
  currentHolderId?: string;
  lineageId: string;
  successionRule: 'PRIMOGENITURE' | 'ULTIMOGENITURE' | 'MERIT' | 'ELECTION';
  privileges: string[];
  responsibilities: string[];
  previousHolders: { botId: string; heldFrom: number; heldUntil: number }[];
  createdAt: number;
}

/**
 * Legacy Manager
 */
export class LegacyManager {
  private inheritances: Map<string, Inheritance> = new Map();
  private lineages: Map<string, Lineage> = new Map();
  private legacyEvents: Map<string, LegacyEvent> = new Map();
  private feuds: Map<string, FamilyFeud> = new Map();
  private alliances: Map<string, MarriageAlliance> = new Map();
  private titles: Map<string, HereditaryTitle> = new Map();
  
  // Configuration
  private readonly TRAIT_INHERITANCE_CHANCE = 0.7;
  private readonly SKILL_INHERITANCE_MODIFIER = 0.3;
  private readonly MUTATION_CHANCE = 0.1;
  
  constructor() {
    logger.info('Legacy Manager initialized');
  }

  /**
   * Create or update lineage for a bot
   */
  ensureLineage(bot: Bot): Lineage {
    // Check if bot is already in a lineage
    for (const lineage of this.lineages.values()) {
      if (lineage.members.some(m => m.botId === bot.id)) {
        return lineage;
      }
    }
    
    // Check if parents have a lineage
    for (const parentId of bot.parentIds) {
      for (const lineage of this.lineages.values()) {
        if (lineage.members.some(m => m.botId === parentId)) {
          // Add to parent's lineage
          this.addToLineage(lineage.id, bot, 'DESCENDANT');
          return lineage;
        }
      }
    }
    
    // Create new lineage
    return this.createLineage(bot);
  }

  /**
   * Create a new lineage
   */
  createLineage(founder: Bot): Lineage {
    const lastName = founder.name.split(' ')[1] || founder.name;
    
    const lineage: Lineage = {
      id: uuidv4(),
      familyName: lastName,
      founderId: founder.id,
      currentHeadId: founder.id,
      members: [{
        botId: founder.id,
        generation: 1,
        relation: 'FOUNDER',
        parentIds: [],
        childIds: founder.childIds,
        status: founder.flags?.isDead ? 'DECEASED' : 'ALIVE',
        joinedAt: Date.now(),
        notable: true,
        notableReason: 'Founder of the family line'
      }],
      inheritances: [],
      motto: this.generateMotto(),
      colors: this.generateFamilyColors(),
      achievements: [],
      reputation: 50,
      generationCount: 1,
      villageId: founder.villageId,
      createdAt: Date.now()
    };
    
    this.lineages.set(lineage.id, lineage);
    
    // Create founding inheritance
    this.createInheritance(
      InheritanceType.REPUTATION,
      `${lastName} Family Honor`,
      `The reputation of the ${lastName} family`,
      50,
      founder.id
    );
    
    logger.info(`Lineage created: ${lastName} family`);
    
    return lineage;
  }

  /**
   * Add a bot to an existing lineage
   */
  addToLineage(
    lineageId: string,
    bot: Bot,
    relation: LineageMember['relation']
  ): void {
    const lineage = this.lineages.get(lineageId);
    if (!lineage) return;
    
    // Determine generation
    let generation = 1;
    if (relation === 'DESCENDANT') {
      const parentGen = lineage.members
        .filter(m => bot.parentIds.includes(m.botId))
        .map(m => m.generation);
      generation = Math.max(...parentGen, 0) + 1;
      lineage.generationCount = Math.max(lineage.generationCount, generation);
    }
    
    const member: LineageMember = {
      botId: bot.id,
      generation,
      relation,
      parentIds: bot.parentIds,
      childIds: bot.childIds,
      status: bot.flags?.isDead ? 'DECEASED' : 'ALIVE',
      joinedAt: Date.now(),
      notable: false
    };
    
    lineage.members.push(member);
    
    // Process inheritance for descendants
    if (relation === 'DESCENDANT') {
      this.processInheritanceForNewMember(lineageId, bot);
    }
  }

  /**
   * Process inheritances for a new family member
   */
  private processInheritanceForNewMember(lineageId: string, bot: Bot): void {
    const lineage = this.lineages.get(lineageId);
    if (!lineage) return;
    
    for (const inheritanceId of lineage.inheritances) {
      const inheritance = this.inheritances.get(inheritanceId);
      if (!inheritance) continue;
      
      // Check if inheritance passes to this bot
      if (Math.random() < this.TRAIT_INHERITANCE_CHANCE * (inheritance.strength / 100)) {
        // Possibly mutate
        let mutated = false;
        let newValue = inheritance.value;
        
        if (Math.random() < this.MUTATION_CHANCE) {
          mutated = true;
          if (typeof newValue === 'number') {
            newValue = newValue + (Math.random() - 0.5) * 20;
          }
        }
        
        inheritance.passedThrough.push(bot.id);
        inheritance.currentHolderId = bot.id;
        inheritance.mutated = inheritance.mutated || mutated;
        inheritance.strength = Math.max(10, inheritance.strength - 5);  // Weakens over time
      }
    }
  }

  /**
   * Create an inheritance
   */
  createInheritance(
    type: InheritanceType,
    name: string,
    description: string,
    value: number | string,
    originBotId: string
  ): Inheritance {
    const inheritance: Inheritance = {
      id: uuidv4(),
      type,
      name,
      description,
      value,
      originBotId,
      currentHolderId: originBotId,
      passedThrough: [originBotId],
      strength: 100,
      mutated: false,
      createdAt: Date.now()
    };
    
    this.inheritances.set(inheritance.id, inheritance);
    
    // Add to bot's lineage
    for (const lineage of this.lineages.values()) {
      if (lineage.members.some(m => m.botId === originBotId)) {
        lineage.inheritances.push(inheritance.id);
        break;
      }
    }
    
    return inheritance;
  }

  /**
   * Calculate inherited traits for a child
   */
  calculateInheritedTraits(
    parent1Traits: PersonalityTraits,
    parent2Traits: PersonalityTraits
  ): Partial<PersonalityTraits> {
    const inherited: Partial<PersonalityTraits> = {};
    const traitKeys = Object.keys(parent1Traits) as (keyof PersonalityTraits)[];
    
    for (const trait of traitKeys) {
      const p1Value = parent1Traits[trait];
      const p2Value = parent2Traits[trait];
      
      // Average with random variation
      const avg = (p1Value + p2Value) / 2;
      const variation = (Math.random() - 0.5) * 30;
      
      inherited[trait] = Math.max(0, Math.min(100, Math.round(avg + variation)));
    }
    
    return inherited;
  }

  /**
   * Calculate inherited skill aptitudes
   */
  calculateInheritedSkills(
    parent1Skills: SkillSet,
    parent2Skills: SkillSet
  ): Partial<SkillSet> {
    const aptitudes: Partial<SkillSet> = {};
    const skillKeys = Object.keys(parent1Skills) as (keyof SkillSet)[];
    
    for (const skill of skillKeys) {
      const p1Value = parent1Skills[skill];
      const p2Value = parent2Skills[skill];
      
      // Children start lower but inherit aptitude
      const maxParent = Math.max(p1Value, p2Value);
      const baseValue = maxParent * this.SKILL_INHERITANCE_MODIFIER;
      const variation = (Math.random() - 0.5) * 10;
      
      aptitudes[skill] = Math.max(0, Math.round(baseValue + variation));
    }
    
    return aptitudes;
  }

  /**
   * Record a legacy event
   */
  recordLegacyEvent(
    lineageId: string,
    type: LegacyEvent['type'],
    description: string,
    involvedBotIds: string[],
    impactOnReputation: number
  ): LegacyEvent {
    const event: LegacyEvent = {
      id: uuidv4(),
      lineageId,
      type,
      description,
      involvedBotIds,
      impactOnReputation,
      timestamp: Date.now(),
      remembered: true
    };
    
    this.legacyEvents.set(event.id, event);
    
    // Update lineage reputation
    const lineage = this.lineages.get(lineageId);
    if (lineage) {
      lineage.reputation = Math.max(-100, Math.min(100, lineage.reputation + impactOnReputation));
      
      if (type === 'ACHIEVEMENT') {
        lineage.achievements.push(description);
      }
    }
    
    logger.debug(`Legacy event recorded: ${type} for ${lineageId}`);
    
    return event;
  }

  /**
   * Start a family feud
   */
  startFeud(
    lineage1Id: string,
    lineage2Id: string,
    cause: string,
    severity: number = 5
  ): FamilyFeud {
    const feud: FamilyFeud = {
      id: uuidv4(),
      lineage1Id,
      lineage2Id,
      cause,
      severity,
      startedAt: Date.now(),
      casualties: [],
      events: [],
      status: 'ACTIVE'
    };
    
    this.feuds.set(feud.id, feud);
    
    // Record events for both lineages
    this.recordLegacyEvent(lineage1Id, 'FEUD', `Feud started with another family: ${cause}`, [], -10);
    this.recordLegacyEvent(lineage2Id, 'FEUD', `Feud started with another family: ${cause}`, [], -10);
    
    logger.info(`Family feud started: ${cause}`);
    
    return feud;
  }

  /**
   * Resolve a feud
   */
  resolveFeud(feudId: string, resolution: string): void {
    const feud = this.feuds.get(feudId);
    if (feud && feud.status === 'ACTIVE') {
      feud.status = 'RESOLVED';
      feud.resolvedAt = Date.now();
      
      // Improve reputations slightly
      const lineage1 = this.lineages.get(feud.lineage1Id);
      const lineage2 = this.lineages.get(feud.lineage2Id);
      
      if (lineage1) lineage1.reputation = Math.min(100, lineage1.reputation + 5);
      if (lineage2) lineage2.reputation = Math.min(100, lineage2.reputation + 5);
      
      logger.info(`Feud resolved: ${resolution}`);
    }
  }

  /**
   * Create a marriage alliance
   */
  createMarriageAlliance(
    lineage1Id: string,
    lineage2Id: string,
    bot1Id: string,
    bot2Id: string
  ): MarriageAlliance {
    const alliance: MarriageAlliance = {
      id: uuidv4(),
      lineage1Id,
      lineage2Id,
      bot1Id,
      bot2Id,
      formedAt: Date.now(),
      status: 'ACTIVE',
      childrenIds: [],
      politicalValue: 50
    };
    
    this.alliances.set(alliance.id, alliance);
    
    // Record events
    this.recordLegacyEvent(lineage1Id, 'ALLIANCE', 'Marriage alliance formed', [bot1Id, bot2Id], 10);
    this.recordLegacyEvent(lineage2Id, 'ALLIANCE', 'Marriage alliance formed', [bot1Id, bot2Id], 10);
    
    logger.info(`Marriage alliance formed between families`);
    
    return alliance;
  }

  /**
   * Create a hereditary title
   */
  createTitle(
    name: string,
    lineageId: string,
    successionRule: HereditaryTitle['successionRule'],
    holderId: string
  ): HereditaryTitle {
    const title: HereditaryTitle = {
      id: uuidv4(),
      name,
      description: `The hereditary title of ${name}`,
      currentHolderId: holderId,
      lineageId,
      successionRule,
      privileges: [],
      responsibilities: [],
      previousHolders: [],
      createdAt: Date.now()
    };
    
    this.titles.set(title.id, title);
    
    return title;
  }

  /**
   * Pass a title to successor
   */
  passTitle(titleId: string, newHolderId: string): void {
    const title = this.titles.get(titleId);
    if (title && title.currentHolderId) {
      title.previousHolders.push({
        botId: title.currentHolderId,
        heldFrom: title.createdAt,
        heldUntil: Date.now()
      });
      title.currentHolderId = newHolderId;
      
      logger.info(`Title ${title.name} passed to new holder`);
    }
  }

  /**
   * Mark a bot as notable in their lineage
   */
  markAsNotable(botId: string, reason: string): void {
    for (const lineage of this.lineages.values()) {
      const member = lineage.members.find(m => m.botId === botId);
      if (member) {
        member.notable = true;
        member.notableReason = reason;
        break;
      }
    }
  }

  /**
   * Update member status (e.g., when a bot dies)
   */
  updateMemberStatus(botId: string, status: LineageMember['status']): void {
    for (const lineage of this.lineages.values()) {
      const member = lineage.members.find(m => m.botId === botId);
      if (member) {
        member.status = status;
        if (status === 'DECEASED') {
          member.leftAt = Date.now();
          
          // If head of family, pass leadership
          if (lineage.currentHeadId === botId) {
            this.selectNewFamilyHead(lineage.id);
          }
        }
        break;
      }
    }
  }

  /**
   * Select a new family head
   */
  private selectNewFamilyHead(lineageId: string): void {
    const lineage = this.lineages.get(lineageId);
    if (!lineage) return;
    
    // Find oldest living member
    const livingMembers = lineage.members.filter(m => m.status === 'ALIVE');
    if (livingMembers.length === 0) {
      lineage.currentHeadId = undefined;
      return;
    }
    
    // Prefer descendants over spouses, earlier generations
    livingMembers.sort((a, b) => {
      if (a.relation !== b.relation) {
        if (a.relation === 'DESCENDANT') return -1;
        if (b.relation === 'DESCENDANT') return 1;
      }
      return a.generation - b.generation;
    });
    
    lineage.currentHeadId = livingMembers[0].botId;
  }

  /**
   * Generate a family motto
   */
  private generateMotto(): string {
    const mottos = [
      'Through hardship to the stars',
      'Strength in unity',
      'Honor above all',
      'We endure',
      'Building tomorrow',
      'Forever vigilant',
      'By craft and courage',
      'The harvest never fails',
      'Stone hearts, steady hands',
      'From blocks we rise'
    ];
    
    return mottos[Math.floor(Math.random() * mottos.length)];
  }

  /**
   * Generate family colors
   */
  private generateFamilyColors(): string[] {
    const colorSets = [
      ['blue', 'gold'],
      ['red', 'black'],
      ['green', 'white'],
      ['purple', 'silver'],
      ['orange', 'brown'],
      ['teal', 'cream']
    ];
    
    return colorSets[Math.floor(Math.random() * colorSets.length)];
  }

  // Public getters

  /**
   * Get lineage by ID
   */
  getLineage(lineageId: string): Lineage | undefined {
    return this.lineages.get(lineageId);
  }

  /**
   * Get lineage for a bot
   */
  getBotLineage(botId: string): Lineage | undefined {
    for (const lineage of this.lineages.values()) {
      if (lineage.members.some(m => m.botId === botId)) {
        return lineage;
      }
    }
    return undefined;
  }

  /**
   * Get all lineages
   */
  getAllLineages(): Lineage[] {
    return Array.from(this.lineages.values());
  }

  /**
   * Get lineages in a village
   */
  getVillageLineages(villageId: string): Lineage[] {
    return Array.from(this.lineages.values()).filter(l => l.villageId === villageId);
  }

  /**
   * Get active feuds
   */
  getActiveFeud(): FamilyFeud[] {
    return Array.from(this.feuds.values()).filter(f => f.status === 'ACTIVE');
  }

  /**
   * Get family tree for display
   */
  getFamilyTree(lineageId: string): { members: LineageMember[]; connections: { from: string; to: string; type: string }[] } {
    const lineage = this.lineages.get(lineageId);
    if (!lineage) return { members: [], connections: [] };
    
    const connections: { from: string; to: string; type: string }[] = [];
    
    for (const member of lineage.members) {
      for (const parentId of member.parentIds) {
        if (lineage.members.some(m => m.botId === parentId)) {
          connections.push({ from: parentId, to: member.botId, type: 'parent-child' });
        }
      }
    }
    
    return { members: lineage.members, connections };
  }

  /**
   * Serialize for persistence
   */
  serialize(): {
    inheritances: Inheritance[];
    lineages: Lineage[];
    legacyEvents: LegacyEvent[];
    feuds: FamilyFeud[];
    alliances: MarriageAlliance[];
    titles: HereditaryTitle[];
  } {
    return {
      inheritances: Array.from(this.inheritances.values()),
      lineages: Array.from(this.lineages.values()),
      legacyEvents: Array.from(this.legacyEvents.values()),
      feuds: Array.from(this.feuds.values()),
      alliances: Array.from(this.alliances.values()),
      titles: Array.from(this.titles.values())
    };
  }

  /**
   * Load from persistence
   */
  load(data: {
    inheritances?: Inheritance[];
    lineages?: Lineage[];
    legacyEvents?: LegacyEvent[];
    feuds?: FamilyFeud[];
    alliances?: MarriageAlliance[];
    titles?: HereditaryTitle[];
  }): void {
    this.inheritances.clear();
    this.lineages.clear();
    this.legacyEvents.clear();
    this.feuds.clear();
    this.alliances.clear();
    this.titles.clear();
    
    for (const inheritance of data.inheritances || []) {
      this.inheritances.set(inheritance.id, inheritance);
    }
    
    for (const lineage of data.lineages || []) {
      this.lineages.set(lineage.id, lineage);
    }
    
    for (const event of data.legacyEvents || []) {
      this.legacyEvents.set(event.id, event);
    }
    
    for (const feud of data.feuds || []) {
      this.feuds.set(feud.id, feud);
    }
    
    for (const alliance of data.alliances || []) {
      this.alliances.set(alliance.id, alliance);
    }
    
    for (const title of data.titles || []) {
      this.titles.set(title.id, title);
    }
    
    logger.info('Legacy data loaded');
  }
}

// Singleton
let legacyManagerInstance: LegacyManager | null = null;

export function getLegacyManager(): LegacyManager {
  if (!legacyManagerInstance) {
    legacyManagerInstance = new LegacyManager();
  }
  return legacyManagerInstance;
}

export function resetLegacyManager(): void {
  legacyManagerInstance = null;
}

export default LegacyManager;
