/**
 * BlockLife AI - Progression Tracking System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * COMPREHENSIVE PROGRESSION TRACKING
 * Tracks and logs every aspect of progression:
 * - Individual bot progression (skills, achievements, life events)
 * - Village/Tribe progression (growth, tech, culture)
 * - Building progression (construction progress, upgrades)
 * - Resource progression (gathering, storage, usage)
 * - Technology progression (research, discoveries)
 * - Combat/War progression (battles, victories, casualties)
 * 
 * All accessible through dashboard and chat commands.
 */

import { createLogger } from '../utils/logger';
import { Bot, Village, Role, TechAge, Era } from '../types';

const logger = createLogger('progression');

// ============================================================================
// PROGRESSION TYPES
// ============================================================================

export interface ProgressionEntry {
  id: string;
  timestamp: number;
  timeFormatted: string;
  category: ProgressionCategory;
  subcategory: string;
  entityId: string;
  entityName: string;
  description: string;
  previousValue?: any;
  newValue?: any;
  change?: number | string;
  significance: 'MINOR' | 'NORMAL' | 'MAJOR' | 'MILESTONE' | 'HISTORIC';
  details?: Record<string, any>;
}

export enum ProgressionCategory {
  BOT = 'BOT',
  VILLAGE = 'VILLAGE',
  BUILDING = 'BUILDING',
  TECHNOLOGY = 'TECHNOLOGY',
  RESOURCE = 'RESOURCE',
  COMBAT = 'COMBAT',
  SOCIAL = 'SOCIAL',
  EXPLORATION = 'EXPLORATION',
  CIVILIZATION = 'CIVILIZATION'
}

// ============================================================================
// BOT PROGRESSION
// ============================================================================

export interface BotProgression {
  botId: string;
  botName: string;
  createdAt: number;
  
  // Life events
  birthDay: number;
  currentAge: number;
  lifeStage: string;
  deathDay?: number;
  deathCause?: string;
  
  // Skills progression (0-100 for each)
  skills: {
    skill: string;
    level: number;
    startedAt: number;
    lastLevelUp: number;
    totalXP: number;
    history: { level: number; achievedAt: number }[];
  }[];
  
  // Role history
  roleHistory: { role: Role; startedAt: number; endedAt?: number }[];
  currentRole: Role;
  
  // Achievements
  achievements: {
    id: string;
    name: string;
    description: string;
    achievedAt: number;
    category: string;
  }[];
  
  // Statistics
  stats: {
    blocksPlaced: number;
    blocksBroken: number;
    itemsCrafted: number;
    distanceTraveled: number;
    mobsKilled: number;
    deaths: number;
    tradesCompleted: number;
    structuresBuilt: number;
    cropsHarvested: number;
    oresMined: number;
    timesSlept: number;
    mealsEaten: number;
    socialInteractions: number;
    childrenHad: number;
  };
  
  // Relationships
  relationships: {
    botId: string;
    botName: string;
    type: string;
    strength: number;
    since: number;
  }[];
  
  // Key life events
  lifeEvents: {
    event: string;
    timestamp: number;
    description: string;
    significance: string;
  }[];
}

// ============================================================================
// VILLAGE PROGRESSION
// ============================================================================

export interface VillageProgression {
  villageId: string;
  villageName: string;
  foundedAt: number;
  founderNames: string[];
  
  // Population history
  populationHistory: { count: number; timestamp: number }[];
  currentPopulation: number;
  peakPopulation: number;
  peakPopulationDate: number;
  totalBirths: number;
  totalDeaths: number;
  
  // Tech age progression
  techAgeHistory: { age: TechAge; reachedAt: number }[];
  currentTechAge: TechAge;
  
  // Prosperity history
  prosperityHistory: { value: number; timestamp: number }[];
  currentProsperity: number;
  
  // Buildings
  buildings: {
    id: string;
    name: string;
    type: string;
    startedAt: number;
    completedAt?: number;
    progress: number;
    builders: string[];
  }[];
  totalBuildingsCompleted: number;
  
  // Resources over time
  resourceHistory: {
    timestamp: number;
    food: number;
    wood: number;
    stone: number;
    iron: number;
    gold: number;
  }[];
  
  // Wars and conflicts
  conflicts: {
    id: string;
    opponent: string;
    startedAt: number;
    endedAt?: number;
    outcome?: 'VICTORY' | 'DEFEAT' | 'TRUCE' | 'ONGOING';
    casualties: number;
    enemyCasualties: number;
  }[];
  
  // Cultural milestones
  culturalMilestones: {
    name: string;
    description: string;
    achievedAt: number;
  }[];
  
  // Leaders history
  leaderHistory: {
    leaderId: string;
    leaderName: string;
    startedAt: number;
    endedAt?: number;
    majorAccomplishments: string[];
  }[];
  
  // Key events
  keyEvents: {
    event: string;
    timestamp: number;
    description: string;
    impact: string;
  }[];
}

// ============================================================================
// BUILDING PROGRESSION
// ============================================================================

export interface BuildingProgression {
  buildingId: string;
  buildingName: string;
  buildingType: string;
  villageId: string;
  villageName: string;
  
  // Construction
  plannedAt: number;
  startedAt: number;
  completedAt?: number;
  progress: number;  // 0-100
  
  // Builders
  builders: {
    botId: string;
    botName: string;
    contribution: number;  // % of work done
    startedAt: number;
    lastWorkedAt: number;
  }[];
  
  // Materials
  materialsRequired: { item: string; count: number }[];
  materialsUsed: { item: string; count: number; timestamp: number }[];
  materialProgress: number;  // % of materials gathered
  
  // Construction log
  constructionLog: {
    timestamp: number;
    action: string;
    description: string;
    progressChange: number;
  }[];
  
  // Upgrades
  upgrades: {
    name: string;
    description: string;
    completedAt: number;
  }[];
  
  // Usage stats (after completion)
  usageStats?: {
    totalVisits: number;
    uniqueVisitors: string[];
    itemsStored?: number;
    itemsProduced?: number;
    lastUsed: number;
  };
}

// ============================================================================
// CIVILIZATION PROGRESSION
// ============================================================================

export interface CivilizationProgression {
  civilizationId: string;
  startedAt: number;
  
  // Era progression
  eraHistory: { era: Era; reachedAt: number }[];
  currentEra: Era;
  
  // Overall stats
  totalBotsEverLived: number;
  totalVillagesEverFounded: number;
  totalBuildingsEverBuilt: number;
  totalWarsEverFought: number;
  
  // Timeline of major events
  timeline: {
    timestamp: number;
    event: string;
    description: string;
    category: string;
    significance: string;
  }[];
  
  // Records
  records: {
    largestVillage: { name: string; population: number; date: number };
    longestLivedBot: { name: string; age: number; date: number };
    mostProsperous: { name: string; prosperity: number; date: number };
    greatestBuilder: { name: string; structures: number };
    greatestWarrior: { name: string; kills: number };
    greatestExplorer: { name: string; distance: number };
  };
  
  // Milestones
  milestones: {
    name: string;
    description: string;
    achievedAt: number;
    achievedBy?: string;
  }[];
}

// ============================================================================
// PROGRESSION TRACKER
// ============================================================================

export class ProgressionTracker {
  private static instance: ProgressionTracker | null = null;
  
  // All progression logs
  private progressionLog: ProgressionEntry[] = [];
  
  // Entity-specific progressions
  private botProgressions: Map<string, BotProgression> = new Map();
  private villageProgressions: Map<string, VillageProgression> = new Map();
  private buildingProgressions: Map<string, BuildingProgression> = new Map();
  private civilizationProgression: CivilizationProgression | null = null;
  
  // Settings
  private maxLogEntries: number = 50000;
  private autoSaveInterval: number = 60000; // 1 minute
  
  private constructor() {
    this.initializeCivilization();
    logger.info('Progression Tracker initialized');
  }
  
  static getInstance(): ProgressionTracker {
    if (!ProgressionTracker.instance) {
      ProgressionTracker.instance = new ProgressionTracker();
    }
    return ProgressionTracker.instance;
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  private initializeCivilization(): void {
    this.civilizationProgression = {
      civilizationId: `civ_${Date.now()}`,
      startedAt: Date.now(),
      eraHistory: [{ era: Era.DAWN, reachedAt: Date.now() }],
      currentEra: Era.DAWN,
      totalBotsEverLived: 0,
      totalVillagesEverFounded: 0,
      totalBuildingsEverBuilt: 0,
      totalWarsEverFought: 0,
      timeline: [{
        timestamp: Date.now(),
        event: 'Civilization Founded',
        description: 'A new civilization begins its journey',
        category: 'CIVILIZATION',
        significance: 'HISTORIC'
      }],
      records: {
        largestVillage: { name: 'None', population: 0, date: 0 },
        longestLivedBot: { name: 'None', age: 0, date: 0 },
        mostProsperous: { name: 'None', prosperity: 0, date: 0 },
        greatestBuilder: { name: 'None', structures: 0 },
        greatestWarrior: { name: 'None', kills: 0 },
        greatestExplorer: { name: 'None', distance: 0 }
      },
      milestones: []
    };
  }
  
  // ============================================================================
  // BOT PROGRESSION
  // ============================================================================
  
  initializeBotProgression(bot: Bot): void {
    const progression: BotProgression = {
      botId: bot.id,
      botName: bot.name,
      createdAt: Date.now(),
      birthDay: 1,
      currentAge: bot.age,
      lifeStage: bot.lifeStage,
      skills: [
        { skill: 'mining', level: bot.skills.mining, startedAt: Date.now(), lastLevelUp: Date.now(), totalXP: 0, history: [] },
        { skill: 'farming', level: bot.skills.farming, startedAt: Date.now(), lastLevelUp: Date.now(), totalXP: 0, history: [] },
        { skill: 'building', level: bot.skills.building, startedAt: Date.now(), lastLevelUp: Date.now(), totalXP: 0, history: [] },
        { skill: 'combat', level: bot.skills.combat, startedAt: Date.now(), lastLevelUp: Date.now(), totalXP: 0, history: [] },
        { skill: 'crafting', level: bot.skills.crafting, startedAt: Date.now(), lastLevelUp: Date.now(), totalXP: 0, history: [] },
        { skill: 'trading', level: bot.skills.trading, startedAt: Date.now(), lastLevelUp: Date.now(), totalXP: 0, history: [] }
      ],
      roleHistory: [{ role: bot.role, startedAt: Date.now() }],
      currentRole: bot.role,
      achievements: [],
      stats: {
        blocksPlaced: 0,
        blocksBroken: 0,
        itemsCrafted: 0,
        distanceTraveled: 0,
        mobsKilled: 0,
        deaths: 0,
        tradesCompleted: 0,
        structuresBuilt: 0,
        cropsHarvested: 0,
        oresMined: 0,
        timesSlept: 0,
        mealsEaten: 0,
        socialInteractions: 0,
        childrenHad: 0
      },
      relationships: [],
      lifeEvents: [{
        event: 'Born',
        timestamp: Date.now(),
        description: `${bot.name} was born into the world`,
        significance: 'MAJOR'
      }]
    };
    
    this.botProgressions.set(bot.id, progression);
    
    if (this.civilizationProgression) {
      this.civilizationProgression.totalBotsEverLived++;
    }
    
    this.logProgression({
      category: ProgressionCategory.BOT,
      subcategory: 'BIRTH',
      entityId: bot.id,
      entityName: bot.name,
      description: `${bot.name} was born`,
      significance: 'MAJOR',
      details: { role: bot.role, lifeStage: bot.lifeStage }
    });
  }
  
  recordBotSkillUp(botId: string, skill: string, newLevel: number, xpGained: number): void {
    const progression = this.botProgressions.get(botId);
    if (!progression) return;
    
    const skillData = progression.skills.find(s => s.skill === skill);
    if (skillData) {
      const oldLevel = skillData.level;
      skillData.level = newLevel;
      skillData.lastLevelUp = Date.now();
      skillData.totalXP += xpGained;
      skillData.history.push({ level: newLevel, achievedAt: Date.now() });
      
      this.logProgression({
        category: ProgressionCategory.BOT,
        subcategory: 'SKILL_UP',
        entityId: botId,
        entityName: progression.botName,
        description: `${progression.botName}'s ${skill} increased to level ${newLevel}`,
        previousValue: oldLevel,
        newValue: newLevel,
        change: newLevel - oldLevel,
        significance: newLevel % 10 === 0 ? 'MILESTONE' : 'NORMAL'
      });
      
      // Check for achievements
      if (newLevel >= 50) {
        this.recordBotAchievement(botId, `${skill}_journeyman`, `${skill} Journeyman`, `Reached level 50 in ${skill}`, 'SKILL');
      }
      if (newLevel >= 75) {
        this.recordBotAchievement(botId, `${skill}_expert`, `${skill} Expert`, `Reached level 75 in ${skill}`, 'SKILL');
      }
      if (newLevel >= 100) {
        this.recordBotAchievement(botId, `${skill}_master`, `${skill} Master`, `Mastered ${skill} at level 100`, 'SKILL');
      }
    }
  }
  
  recordBotAchievement(botId: string, achievementId: string, name: string, description: string, category: string): void {
    const progression = this.botProgressions.get(botId);
    if (!progression) return;
    
    // Check if already has achievement
    if (progression.achievements.find(a => a.id === achievementId)) return;
    
    progression.achievements.push({
      id: achievementId,
      name,
      description,
      achievedAt: Date.now(),
      category
    });
    
    progression.lifeEvents.push({
      event: 'Achievement Unlocked',
      timestamp: Date.now(),
      description: `Earned "${name}": ${description}`,
      significance: 'MAJOR'
    });
    
    this.logProgression({
      category: ProgressionCategory.BOT,
      subcategory: 'ACHIEVEMENT',
      entityId: botId,
      entityName: progression.botName,
      description: `${progression.botName} earned achievement: ${name}`,
      significance: 'MAJOR',
      details: { achievementId, category }
    });
  }
  
  recordBotStat(botId: string, stat: keyof BotProgression['stats'], amount: number = 1): void {
    const progression = this.botProgressions.get(botId);
    if (!progression) return;
    
    progression.stats[stat] += amount;
    
    // Check for stat-based achievements
    this.checkStatAchievements(botId, progression);
  }
  
  private checkStatAchievements(botId: string, progression: BotProgression): void {
    const { stats } = progression;
    
    if (stats.blocksPlaced >= 1000) {
      this.recordBotAchievement(botId, 'builder_1000', 'Builder', 'Placed 1000 blocks', 'BUILDING');
    }
    if (stats.oresMined >= 500) {
      this.recordBotAchievement(botId, 'miner_500', 'Miner', 'Mined 500 ores', 'MINING');
    }
    if (stats.mobsKilled >= 100) {
      this.recordBotAchievement(botId, 'warrior_100', 'Warrior', 'Killed 100 mobs', 'COMBAT');
    }
    if (stats.distanceTraveled >= 10000) {
      this.recordBotAchievement(botId, 'explorer_10000', 'Explorer', 'Traveled 10000 blocks', 'EXPLORATION');
    }
    if (stats.childrenHad >= 5) {
      this.recordBotAchievement(botId, 'parent_5', 'Parent', 'Had 5 children', 'SOCIAL');
    }
  }
  
  recordBotRoleChange(botId: string, newRole: Role): void {
    const progression = this.botProgressions.get(botId);
    if (!progression) return;
    
    const oldRole = progression.currentRole;
    
    // End previous role
    const currentRoleEntry = progression.roleHistory.find(r => !r.endedAt);
    if (currentRoleEntry) {
      currentRoleEntry.endedAt = Date.now();
    }
    
    // Start new role
    progression.roleHistory.push({ role: newRole, startedAt: Date.now() });
    progression.currentRole = newRole;
    
    progression.lifeEvents.push({
      event: 'Role Change',
      timestamp: Date.now(),
      description: `Changed role from ${oldRole} to ${newRole}`,
      significance: 'NORMAL'
    });
    
    this.logProgression({
      category: ProgressionCategory.BOT,
      subcategory: 'ROLE_CHANGE',
      entityId: botId,
      entityName: progression.botName,
      description: `${progression.botName} became a ${newRole}`,
      previousValue: oldRole,
      newValue: newRole,
      significance: 'NORMAL'
    });
  }
  
  recordBotDeath(botId: string, cause: string): void {
    const progression = this.botProgressions.get(botId);
    if (!progression) return;
    
    progression.deathDay = Date.now();
    progression.deathCause = cause;
    progression.stats.deaths++;
    
    progression.lifeEvents.push({
      event: 'Death',
      timestamp: Date.now(),
      description: `Died: ${cause}`,
      significance: 'HISTORIC'
    });
    
    this.logProgression({
      category: ProgressionCategory.BOT,
      subcategory: 'DEATH',
      entityId: botId,
      entityName: progression.botName,
      description: `${progression.botName} died: ${cause}`,
      significance: 'MAJOR',
      details: { cause, age: progression.currentAge }
    });
    
    // Check for longest lived record
    if (this.civilizationProgression && progression.currentAge > this.civilizationProgression.records.longestLivedBot.age) {
      this.civilizationProgression.records.longestLivedBot = {
        name: progression.botName,
        age: progression.currentAge,
        date: Date.now()
      };
    }
  }
  
  getBotProgression(botId: string): BotProgression | undefined {
    return this.botProgressions.get(botId);
  }
  
  getAllBotProgressions(): BotProgression[] {
    return Array.from(this.botProgressions.values());
  }
  
  // ============================================================================
  // VILLAGE PROGRESSION
  // ============================================================================
  
  initializeVillageProgression(village: Village): void {
    const progression: VillageProgression = {
      villageId: village.id,
      villageName: village.name,
      foundedAt: Date.now(),
      founderNames: [], // Will be filled from village data
      populationHistory: [{ count: village.memberIds.length, timestamp: Date.now() }],
      currentPopulation: village.memberIds.length,
      peakPopulation: village.memberIds.length,
      peakPopulationDate: Date.now(),
      totalBirths: 0,
      totalDeaths: 0,
      techAgeHistory: [{ age: village.techAge, reachedAt: Date.now() }],
      currentTechAge: village.techAge,
      prosperityHistory: [{ value: village.prosperity, timestamp: Date.now() }],
      currentProsperity: village.prosperity,
      buildings: [],
      totalBuildingsCompleted: 0,
      resourceHistory: [{
        timestamp: Date.now(),
        food: village.stockpile.food,
        wood: village.stockpile.wood,
        stone: village.stockpile.stone,
        iron: village.stockpile.iron,
        gold: village.stockpile.gold
      }],
      conflicts: [],
      culturalMilestones: [],
      leaderHistory: [],
      keyEvents: [{
        event: 'Village Founded',
        timestamp: Date.now(),
        description: `${village.name} was founded`,
        impact: 'A new community begins'
      }]
    };
    
    this.villageProgressions.set(village.id, progression);
    
    if (this.civilizationProgression) {
      this.civilizationProgression.totalVillagesEverFounded++;
      this.civilizationProgression.timeline.push({
        timestamp: Date.now(),
        event: 'Village Founded',
        description: `${village.name} was founded`,
        category: 'VILLAGE',
        significance: 'MAJOR'
      });
    }
    
    this.logProgression({
      category: ProgressionCategory.VILLAGE,
      subcategory: 'FOUNDED',
      entityId: village.id,
      entityName: village.name,
      description: `Village ${village.name} was founded`,
      significance: 'MAJOR'
    });
  }
  
  recordVillagePopulationChange(villageId: string, newPopulation: number, reason: string): void {
    const progression = this.villageProgressions.get(villageId);
    if (!progression) return;
    
    const oldPopulation = progression.currentPopulation;
    progression.currentPopulation = newPopulation;
    progression.populationHistory.push({ count: newPopulation, timestamp: Date.now() });
    
    if (newPopulation > progression.peakPopulation) {
      progression.peakPopulation = newPopulation;
      progression.peakPopulationDate = Date.now();
    }
    
    if (reason === 'birth') {
      progression.totalBirths++;
    } else if (reason === 'death') {
      progression.totalDeaths++;
    }
    
    const change = newPopulation - oldPopulation;
    const significance = Math.abs(change) >= 5 ? 'MAJOR' : 'NORMAL';
    
    this.logProgression({
      category: ProgressionCategory.VILLAGE,
      subcategory: 'POPULATION',
      entityId: villageId,
      entityName: progression.villageName,
      description: `${progression.villageName} population ${change > 0 ? 'grew' : 'decreased'} to ${newPopulation}`,
      previousValue: oldPopulation,
      newValue: newPopulation,
      change,
      significance,
      details: { reason }
    });
    
    // Check for population milestones
    const milestones = [10, 25, 50, 100, 200, 500];
    for (const milestone of milestones) {
      if (oldPopulation < milestone && newPopulation >= milestone) {
        progression.culturalMilestones.push({
          name: `Population ${milestone}`,
          description: `Village reached ${milestone} inhabitants`,
          achievedAt: Date.now()
        });
        
        this.logProgression({
          category: ProgressionCategory.VILLAGE,
          subcategory: 'MILESTONE',
          entityId: villageId,
          entityName: progression.villageName,
          description: `${progression.villageName} reached ${milestone} inhabitants!`,
          significance: 'MILESTONE'
        });
      }
    }
  }
  
  recordVillageTechAgeAdvance(villageId: string, newAge: TechAge): void {
    const progression = this.villageProgressions.get(villageId);
    if (!progression) return;
    
    const oldAge = progression.currentTechAge;
    progression.currentTechAge = newAge;
    progression.techAgeHistory.push({ age: newAge, reachedAt: Date.now() });
    
    progression.keyEvents.push({
      event: 'Tech Age Advance',
      timestamp: Date.now(),
      description: `Advanced from ${oldAge} to ${newAge} age`,
      impact: 'New technologies and capabilities unlocked'
    });
    
    this.logProgression({
      category: ProgressionCategory.VILLAGE,
      subcategory: 'TECH_ADVANCE',
      entityId: villageId,
      entityName: progression.villageName,
      description: `${progression.villageName} advanced to ${newAge} age!`,
      previousValue: oldAge,
      newValue: newAge,
      significance: 'MILESTONE'
    });
    
    if (this.civilizationProgression) {
      this.civilizationProgression.timeline.push({
        timestamp: Date.now(),
        event: 'Tech Advancement',
        description: `${progression.villageName} entered the ${newAge} age`,
        category: 'TECHNOLOGY',
        significance: 'MILESTONE'
      });
    }
  }
  
  recordVillageBuildingStarted(villageId: string, buildingId: string, buildingName: string, buildingType: string): void {
    const progression = this.villageProgressions.get(villageId);
    if (!progression) return;
    
    progression.buildings.push({
      id: buildingId,
      name: buildingName,
      type: buildingType,
      startedAt: Date.now(),
      progress: 0,
      builders: []
    });
    
    this.logProgression({
      category: ProgressionCategory.BUILDING,
      subcategory: 'STARTED',
      entityId: buildingId,
      entityName: buildingName,
      description: `Construction of ${buildingName} started in ${progression.villageName}`,
      significance: 'NORMAL',
      details: { villageId, buildingType }
    });
  }
  
  recordVillageBuildingCompleted(villageId: string, buildingId: string): void {
    const progression = this.villageProgressions.get(villageId);
    if (!progression) return;
    
    const building = progression.buildings.find(b => b.id === buildingId);
    if (!building) return;
    
    building.completedAt = Date.now();
    building.progress = 100;
    progression.totalBuildingsCompleted++;
    
    progression.keyEvents.push({
      event: 'Building Completed',
      timestamp: Date.now(),
      description: `${building.name} construction completed`,
      impact: 'New structure available for use'
    });
    
    this.logProgression({
      category: ProgressionCategory.BUILDING,
      subcategory: 'COMPLETED',
      entityId: buildingId,
      entityName: building.name,
      description: `${building.name} completed in ${progression.villageName}!`,
      significance: 'MAJOR',
      details: { villageId, buildingType: building.type }
    });
    
    if (this.civilizationProgression) {
      this.civilizationProgression.totalBuildingsEverBuilt++;
    }
  }
  
  getVillageProgression(villageId: string): VillageProgression | undefined {
    return this.villageProgressions.get(villageId);
  }
  
  getAllVillageProgressions(): VillageProgression[] {
    return Array.from(this.villageProgressions.values());
  }
  
  // ============================================================================
  // BUILDING PROGRESSION
  // ============================================================================
  
  initializeBuildingProgression(
    buildingId: string,
    buildingName: string,
    buildingType: string,
    villageId: string,
    villageName: string,
    materialsRequired: { item: string; count: number }[]
  ): void {
    const progression: BuildingProgression = {
      buildingId,
      buildingName,
      buildingType,
      villageId,
      villageName,
      plannedAt: Date.now(),
      startedAt: Date.now(),
      progress: 0,
      builders: [],
      materialsRequired,
      materialsUsed: [],
      materialProgress: 0,
      constructionLog: [{
        timestamp: Date.now(),
        action: 'PLANNED',
        description: 'Construction planned',
        progressChange: 0
      }],
      upgrades: []
    };
    
    this.buildingProgressions.set(buildingId, progression);
  }
  
  recordBuildingProgress(buildingId: string, newProgress: number, workerId: string, workerName: string): void {
    const progression = this.buildingProgressions.get(buildingId);
    if (!progression) return;
    
    const oldProgress = progression.progress;
    progression.progress = newProgress;
    
    // Update builder contribution
    let builder = progression.builders.find(b => b.botId === workerId);
    if (!builder) {
      builder = {
        botId: workerId,
        botName: workerName,
        contribution: 0,
        startedAt: Date.now(),
        lastWorkedAt: Date.now()
      };
      progression.builders.push(builder);
    }
    builder.contribution += newProgress - oldProgress;
    builder.lastWorkedAt = Date.now();
    
    progression.constructionLog.push({
      timestamp: Date.now(),
      action: 'PROGRESS',
      description: `${workerName} worked on construction`,
      progressChange: newProgress - oldProgress
    });
    
    // Log milestone progress
    const milestones = [25, 50, 75, 100];
    for (const milestone of milestones) {
      if (oldProgress < milestone && newProgress >= milestone) {
        this.logProgression({
          category: ProgressionCategory.BUILDING,
          subcategory: 'PROGRESS',
          entityId: buildingId,
          entityName: progression.buildingName,
          description: `${progression.buildingName} is ${milestone}% complete`,
          previousValue: oldProgress,
          newValue: newProgress,
          significance: milestone === 100 ? 'MAJOR' : 'NORMAL'
        });
      }
    }
  }
  
  getBuildingProgression(buildingId: string): BuildingProgression | undefined {
    return this.buildingProgressions.get(buildingId);
  }
  
  // ============================================================================
  // CIVILIZATION PROGRESSION
  // ============================================================================
  
  recordEraChange(newEra: Era): void {
    if (!this.civilizationProgression) return;
    
    const oldEra = this.civilizationProgression.currentEra;
    this.civilizationProgression.currentEra = newEra;
    this.civilizationProgression.eraHistory.push({ era: newEra, reachedAt: Date.now() });
    
    this.civilizationProgression.timeline.push({
      timestamp: Date.now(),
      event: 'Era Change',
      description: `The civilization entered the ${newEra} era`,
      category: 'CIVILIZATION',
      significance: 'HISTORIC'
    });
    
    this.civilizationProgression.milestones.push({
      name: `${newEra} Era`,
      description: `Entered the ${newEra} era`,
      achievedAt: Date.now()
    });
    
    this.logProgression({
      category: ProgressionCategory.CIVILIZATION,
      subcategory: 'ERA_CHANGE',
      entityId: this.civilizationProgression.civilizationId,
      entityName: 'Civilization',
      description: `The civilization entered the ${newEra} era!`,
      previousValue: oldEra,
      newValue: newEra,
      significance: 'HISTORIC'
    });
  }
  
  getCivilizationProgression(): CivilizationProgression | null {
    return this.civilizationProgression;
  }
  
  // ============================================================================
  // GENERAL LOGGING
  // ============================================================================
  
  private logProgression(entry: Omit<ProgressionEntry, 'id' | 'timestamp' | 'timeFormatted'>): void {
    const now = Date.now();
    const fullEntry: ProgressionEntry = {
      ...entry,
      id: `prog_${now}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now,
      timeFormatted: new Date(now).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
    
    this.progressionLog.push(fullEntry);
    
    // Trim if too large
    if (this.progressionLog.length > this.maxLogEntries) {
      this.progressionLog = this.progressionLog.slice(-this.maxLogEntries);
    }
    
    // Log to standard logger for important events
    if (entry.significance === 'MILESTONE' || entry.significance === 'HISTORIC') {
      logger.info(`[${entry.category}] ${entry.description}`);
    }
  }
  
  getProgressionLog(options?: {
    category?: ProgressionCategory;
    entityId?: string;
    significance?: string;
    limit?: number;
    since?: number;
  }): ProgressionEntry[] {
    let entries = [...this.progressionLog];
    
    if (options?.category) {
      entries = entries.filter(e => e.category === options.category);
    }
    if (options?.entityId) {
      entries = entries.filter(e => e.entityId === options.entityId);
    }
    if (options?.significance) {
      entries = entries.filter(e => e.significance === options.significance);
    }
    if (options?.since) {
      const since = options.since;
      entries = entries.filter(e => e.timestamp >= since);
    }
    if (options?.limit) {
      entries = entries.slice(-options.limit);
    }
    
    return entries;
  }
  
  // ============================================================================
  // SUMMARY & REPORTS
  // ============================================================================
  
  getProgressionSummary(): {
    civilization: CivilizationProgression | null;
    totalBots: number;
    totalVillages: number;
    totalBuildings: number;
    recentEvents: ProgressionEntry[];
    milestones: ProgressionEntry[];
  } {
    return {
      civilization: this.civilizationProgression,
      totalBots: this.botProgressions.size,
      totalVillages: this.villageProgressions.size,
      totalBuildings: this.buildingProgressions.size,
      recentEvents: this.getProgressionLog({ limit: 20 }),
      milestones: this.getProgressionLog({ significance: 'MILESTONE', limit: 10 })
    };
  }
  
  generateProgressionReport(): string {
    const civ = this.civilizationProgression;
    const bots = this.getAllBotProgressions();
    const villages = this.getAllVillageProgressions();
    
    const currentTime = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    let report = `
╔══════════════════════════════════════════════════════════════════════════╗
║                    BLOCKLIFE PROGRESSION REPORT                          ║
║                    ${currentTime}
╠══════════════════════════════════════════════════════════════════════════╣

CIVILIZATION STATUS
  Current Era: ${civ?.currentEra || 'Unknown'}
  Total Bots Ever: ${civ?.totalBotsEverLived || 0}
  Total Villages: ${civ?.totalVillagesEverFounded || 0}
  Total Buildings: ${civ?.totalBuildingsEverBuilt || 0}

VILLAGES (${villages.length})
`;
    
    for (const v of villages) {
      report += `
  ${v.villageName}
    Population: ${v.currentPopulation} (Peak: ${v.peakPopulation})
    Tech Age: ${v.currentTechAge}
    Prosperity: ${v.currentProsperity}
    Buildings: ${v.totalBuildingsCompleted}
    Births: ${v.totalBirths} | Deaths: ${v.totalDeaths}
`;
    }
    
    report += `
ACTIVE BOTS (${bots.filter(b => !b.deathDay).length} alive, ${bots.filter(b => b.deathDay).length} deceased)
`;
    
    const topBots = bots
      .filter(b => !b.deathDay)
      .sort((a, b) => b.achievements.length - a.achievements.length)
      .slice(0, 5);
    
    for (const b of topBots) {
      report += `
  ${b.botName} (${b.currentRole})
    Age: ${b.currentAge} | Achievements: ${b.achievements.length}
    Blocks Placed: ${b.stats.blocksPlaced} | Mobs Killed: ${b.stats.mobsKilled}
`;
    }
    
    report += `
╚══════════════════════════════════════════════════════════════════════════╝
`;
    
    return report;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export function getProgressionTracker(): ProgressionTracker {
  return ProgressionTracker.getInstance();
}

export default ProgressionTracker;
