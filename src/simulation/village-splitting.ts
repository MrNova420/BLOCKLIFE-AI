/**
 * BlockLife AI - Village Splitting System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Handles village growth, population pressure, and the creation
 * of new settlements through splitting.
 */

import { v4 as uuidv4 } from 'uuid';
import { Position, Village, TechAge } from '../types';
import { getVillageManager } from './villages';
import { getBotManager } from '../bots/bot-manager';
import { getTerritoryManager } from './territory-control';
import { createLogger } from '../utils/logger';

const logger = createLogger('splitting');

/**
 * Reasons for village splitting
 */
export enum SplitReason {
  OVERPOPULATION = 'OVERPOPULATION',
  RESOURCE_SCARCITY = 'RESOURCE_SCARCITY',
  CULTURAL_DRIFT = 'CULTURAL_DRIFT',
  POLITICAL_CONFLICT = 'POLITICAL_CONFLICT',
  EXPLORATION = 'EXPLORATION',
  RELIGIOUS_SCHISM = 'RELIGIOUS_SCHISM'
}

/**
 * Split proposal from village analysis
 */
export interface SplitProposal {
  id: string;
  sourceVillageId: string;
  reason: SplitReason;
  
  // Population division
  proposedMigrants: string[];     // Bot IDs to move
  remainingPopulation: string[];  // Bot IDs to stay
  
  // Leadership
  proposedLeaderId?: string;
  
  // Resources to transfer
  resourcesTransfer: {
    food: number;
    wood: number;
    stone: number;
    iron: number;
  };
  
  // Location
  proposedLocation: Position;
  searchRadius: number;
  
  // Scoring
  feasibilityScore: number;      // 0-100
  urgencyScore: number;          // 0-100
  factors: SplitFactor[];
  
  // Status
  status: 'PROPOSED' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'FAILED';
  createdAt: number;
  executedAt?: number;
  newVillageId?: string;
}

/**
 * Factor contributing to split decision
 */
export interface SplitFactor {
  type: string;
  description: string;
  weight: number;               // -100 to 100 (negative = against split)
  data?: Record<string, unknown>;
}

/**
 * Migration group for split execution
 */
export interface MigrationGroup {
  id: string;
  proposalId: string;
  botIds: string[];
  leaderBotId: string;
  destination: Position;
  status: 'FORMING' | 'TRAVELING' | 'SETTLING' | 'ESTABLISHED';
  departedAt?: number;
  arrivedAt?: number;
  currentPosition: Position;
}

/**
 * Historical record of splits
 */
export interface SplitRecord {
  id: string;
  sourceVillageId: string;
  newVillageId: string;
  reason: SplitReason;
  migrantCount: number;
  timestamp: number;
  success: boolean;
  aftermath: string;
}

/**
 * Village Splitting Manager
 */
export class VillageSplittingManager {
  private proposals: Map<string, SplitProposal> = new Map();
  private migrations: Map<string, MigrationGroup> = new Map();
  private splitHistory: SplitRecord[] = [];
  
  // Configuration
  private readonly MIN_POPULATION_FOR_SPLIT = 20;
  private readonly MAX_COMFORTABLE_POPULATION = 60;
  private readonly MIN_MIGRANTS = 8;
  private readonly MAX_MIGRANTS_PERCENT = 0.4;  // 40% max can leave
  private readonly MIN_SPLIT_INTERVAL_MS = 600000;  // 10 minutes between splits
  private readonly RESOURCE_SHARE_PERCENT = 0.3;   // 30% of resources to new village
  
  private lastSplitTime: Map<string, number> = new Map();  // Village ID -> last split time
  
  constructor() {
    logger.info('Village Splitting Manager initialized');
  }

  /**
   * Analyze a village for potential split
   */
  analyzeForSplit(villageId: string): SplitProposal | null {
    const villageManager = getVillageManager();
    const village = villageManager.getVillage(villageId);
    
    if (!village) return null;
    
    // Check if recently split
    const lastSplit = this.lastSplitTime.get(villageId) || 0;
    if (Date.now() - lastSplit < this.MIN_SPLIT_INTERVAL_MS) {
      return null;
    }
    
    // Check minimum population
    if (village.memberIds.length < this.MIN_POPULATION_FOR_SPLIT) {
      return null;
    }
    
    // Calculate factors
    const factors: SplitFactor[] = [];
    
    // Overpopulation factor
    const popPressure = (village.memberIds.length - this.MAX_COMFORTABLE_POPULATION) / this.MAX_COMFORTABLE_POPULATION;
    if (popPressure > 0) {
      factors.push({
        type: 'overpopulation',
        description: `Population exceeds comfortable limit by ${Math.round(popPressure * 100)}%`,
        weight: Math.min(50, popPressure * 100),
        data: { current: village.memberIds.length, comfortable: this.MAX_COMFORTABLE_POPULATION }
      });
    }
    
    // Resource scarcity factor
    const resourceHealth = this.assessResourceHealth(village);
    if (resourceHealth < 40) {
      factors.push({
        type: 'resource_scarcity',
        description: `Resources are strained (${resourceHealth}% health)`,
        weight: Math.min(40, (40 - resourceHealth)),
        data: { resourceHealth }
      });
    }
    
    // Cultural drift (check for personality clusters)
    const culturalDrift = this.assessCulturalDrift(village);
    if (culturalDrift > 30) {
      factors.push({
        type: 'cultural_drift',
        description: `Significant cultural divide detected (${culturalDrift}%)`,
        weight: culturalDrift * 0.5,
        data: { driftScore: culturalDrift }
      });
    }
    
    // Political conflict (check for competing leaders)
    const politicalTension = this.assessPoliticalTension(village);
    if (politicalTension > 40) {
      factors.push({
        type: 'political_conflict',
        description: `Political tension at ${politicalTension}%`,
        weight: politicalTension * 0.4,
        data: { tension: politicalTension }
      });
    }
    
    // Territory expansion desire
    const territoryManager = getTerritoryManager();
    if (!territoryManager.canVillageExpand(villageId)) {
      factors.push({
        type: 'territory_limit',
        description: 'Village has reached territorial limits',
        weight: 30,
        data: {}
      });
    }
    
    // Calculate scores
    const urgencyScore = factors.reduce((sum, f) => sum + Math.max(0, f.weight), 0) / Math.max(1, factors.length);
    const feasibilityScore = this.assessFeasibility(village);
    
    // Determine if split is warranted
    if (urgencyScore < 20 || feasibilityScore < 30) {
      return null;  // Not urgent or feasible enough
    }
    
    // Determine reason
    const topFactor = factors.reduce((top, f) => f.weight > top.weight ? f : top, factors[0]);
    const reason = this.factorTypeToReason(topFactor.type);
    
    // Select migrants
    const migrants = this.selectMigrants(village, reason);
    if (migrants.length < this.MIN_MIGRANTS) {
      return null;  // Not enough willing migrants
    }
    
    // Find suitable location
    const newLocation = this.findSuitableLocation(village);
    if (!newLocation) {
      return null;  // No suitable location found
    }
    
    // Create proposal
    const proposal: SplitProposal = {
      id: uuidv4(),
      sourceVillageId: villageId,
      reason,
      
      proposedMigrants: migrants,
      remainingPopulation: village.memberIds.filter(id => !migrants.includes(id)),
      
      proposedLeaderId: this.selectLeader(migrants),
      
      resourcesTransfer: {
        food: Math.floor(village.stockpile.food * this.RESOURCE_SHARE_PERCENT),
        wood: Math.floor(village.stockpile.wood * this.RESOURCE_SHARE_PERCENT),
        stone: Math.floor(village.stockpile.stone * this.RESOURCE_SHARE_PERCENT),
        iron: Math.floor(village.stockpile.iron * this.RESOURCE_SHARE_PERCENT)
      },
      
      proposedLocation: newLocation,
      searchRadius: 32,
      
      feasibilityScore,
      urgencyScore,
      factors,
      
      status: 'PROPOSED',
      createdAt: Date.now()
    };
    
    this.proposals.set(proposal.id, proposal);
    
    logger.info(`Split proposal created for village ${villageId}: ${reason}`);
    
    return proposal;
  }

  /**
   * Assess resource health of a village
   */
  private assessResourceHealth(village: Village): number {
    const pop = village.memberIds.length;
    const foodPerPerson = village.stockpile.food / Math.max(1, pop);
    const woodPerPerson = village.stockpile.wood / Math.max(1, pop);
    
    // Healthy: 10+ food per person, 5+ wood per person
    const foodScore = Math.min(100, (foodPerPerson / 10) * 100);
    const woodScore = Math.min(100, (woodPerPerson / 5) * 100);
    
    return (foodScore + woodScore) / 2;
  }

  /**
   * Assess cultural drift in a village
   */
  private assessCulturalDrift(village: Village): number {
    const botManager = getBotManager();
    const bots = village.memberIds.map(id => botManager.getBot(id)).filter(b => b !== undefined);
    
    if (bots.length < 5) return 0;
    
    // Check for personality clusters
    let aggressiveCount = 0;
    let peacefulCount = 0;
    
    for (const bot of bots) {
      if (!bot) continue;
      const data = bot.getData();
      if (data.personality.aggression > 60) aggressiveCount++;
      if (data.personality.aggression < 40) peacefulCount++;
    }
    
    // Large difference = cultural drift
    const drift = Math.abs(aggressiveCount - peacefulCount) / bots.length * 100;
    return Math.min(100, drift);
  }

  /**
   * Assess political tension in a village
   */
  private assessPoliticalTension(village: Village): number {
    const botManager = getBotManager();
    
    // Count potential leaders (high leadership skill)
    let potentialLeaders = 0;
    
    for (const botId of village.memberIds) {
      const bot = botManager.getBot(botId);
      if (bot) {
        const data = bot.getData();
        if (data.skills.leadership > 60) {
          potentialLeaders++;
        }
      }
    }
    
    // More potential leaders = more tension
    if (potentialLeaders <= 1) return 0;
    return Math.min(100, (potentialLeaders - 1) * 20);
  }

  /**
   * Assess feasibility of a split
   */
  private assessFeasibility(village: Village): number {
    let score = 50;  // Base score
    
    // Enough resources to share?
    if (village.stockpile.food > 100) score += 15;
    if (village.stockpile.wood > 50) score += 10;
    if (village.stockpile.stone > 30) score += 10;
    
    // Tech level helps
    const techScores: Record<TechAge, number> = {
      [TechAge.STONE]: 0,
      [TechAge.IRON]: 10,
      [TechAge.AGRICULTURAL]: 15,
      [TechAge.SETTLEMENT]: 20,
      [TechAge.REDSTONE]: 25
    };
    score += techScores[village.techAge] || 0;
    
    // Defense rating matters
    if (village.defenseRating > 50) score += 10;
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Convert factor type to split reason
   */
  private factorTypeToReason(factorType: string): SplitReason {
    const mapping: Record<string, SplitReason> = {
      'overpopulation': SplitReason.OVERPOPULATION,
      'resource_scarcity': SplitReason.RESOURCE_SCARCITY,
      'cultural_drift': SplitReason.CULTURAL_DRIFT,
      'political_conflict': SplitReason.POLITICAL_CONFLICT,
      'territory_limit': SplitReason.EXPLORATION
    };
    return mapping[factorType] || SplitReason.EXPLORATION;
  }

  /**
   * Select bots to migrate
   */
  private selectMigrants(village: Village, reason: SplitReason): string[] {
    const botManager = getBotManager();
    const migrants: string[] = [];
    const maxMigrants = Math.floor(village.memberIds.length * this.MAX_MIGRANTS_PERCENT);
    
    // Score each bot on likelihood to migrate
    const scores: { botId: string; score: number }[] = [];
    
    for (const botId of village.memberIds) {
      const bot = botManager.getBot(botId);
      if (!bot) continue;
      
      const data = bot.getData();
      let score = 0;
      
      // Younger bots more likely to migrate
      if (data.age < 50) score += 20;
      
      // Curious/adventurous types more likely
      score += data.personality.curiosity * 0.3;
      score += data.personality.bravery * 0.2;
      
      // Less socially tied bots more likely
      if (data.relationships.length < 3) score += 15;
      
      // No partner = more mobile
      if (!data.partnerId) score += 10;
      
      // No children = more mobile
      if (data.childIds.length === 0) score += 10;
      
      // Based on reason
      if (reason === SplitReason.POLITICAL_CONFLICT && data.skills.leadership > 50) {
        score += 20;  // Potential new leader
      }
      if (reason === SplitReason.CULTURAL_DRIFT) {
        // Score based on being in minority culture
        const villageAvgAggression = this.getVillageAverageAggression(village);
        if ((data.personality.aggression > 60 && villageAvgAggression < 50) ||
            (data.personality.aggression < 40 && villageAvgAggression > 50)) {
          score += 25;  // Cultural minority more likely to leave
        }
      }
      
      scores.push({ botId, score });
    }
    
    // Sort by score and select top migrants
    scores.sort((a, b) => b.score - a.score);
    
    for (const { botId, score } of scores) {
      if (migrants.length >= maxMigrants) break;
      if (score > 30) {  // Minimum willingness threshold
        migrants.push(botId);
      }
    }
    
    return migrants;
  }

  /**
   * Get average aggression of village
   */
  private getVillageAverageAggression(village: Village): number {
    const botManager = getBotManager();
    let total = 0;
    let count = 0;
    
    for (const botId of village.memberIds) {
      const bot = botManager.getBot(botId);
      if (bot) {
        total += bot.getData().personality.aggression;
        count++;
      }
    }
    
    return count > 0 ? total / count : 50;
  }

  /**
   * Select leader for new village
   */
  private selectLeader(migrants: string[]): string | undefined {
    const botManager = getBotManager();
    
    let bestLeader: string | undefined;
    let bestScore = 0;
    
    for (const botId of migrants) {
      const bot = botManager.getBot(botId);
      if (!bot) continue;
      
      const data = bot.getData();
      const score = data.skills.leadership + data.personality.wisdom * 0.5;
      
      if (score > bestScore) {
        bestScore = score;
        bestLeader = botId;
      }
    }
    
    return bestLeader;
  }

  /**
   * Find a suitable location for new village
   */
  private findSuitableLocation(sourceVillage: Village): Position | null {
    // Search in a ring around the current village
    const searchDistance = 100;  // Blocks from source
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    
    const basePos = sourceVillage.centerPosition;
    
    for (const angle of angles) {
      const radians = (angle / 180) * Math.PI;
      const pos: Position = {
        x: Math.round(basePos.x + Math.cos(radians) * searchDistance),
        y: basePos.y,
        z: Math.round(basePos.z + Math.sin(radians) * searchDistance)
      };
      
      // Check if position is valid (not in another village's territory)
      const territoryManager = getTerritoryManager();
      const existingZone = territoryManager.getZoneAtPosition(pos);
      
      if (!existingZone) {
        return pos;  // Found free space
      }
    }
    
    // Try further out
    for (const angle of angles) {
      const radians = (angle / 180) * Math.PI;
      const pos: Position = {
        x: Math.round(basePos.x + Math.cos(radians) * searchDistance * 2),
        y: basePos.y,
        z: Math.round(basePos.z + Math.sin(radians) * searchDistance * 2)
      };
      
      const territoryManager = getTerritoryManager();
      const existingZone = territoryManager.getZoneAtPosition(pos);
      
      if (!existingZone) {
        return pos;
      }
    }
    
    return null;  // No suitable location found
  }

  /**
   * Execute an approved split proposal
   */
  executeSplit(proposalId: string): boolean {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== 'APPROVED') {
      return false;
    }
    
    proposal.status = 'IN_PROGRESS';
    proposal.executedAt = Date.now();
    
    // Create migration group
    const migration: MigrationGroup = {
      id: uuidv4(),
      proposalId,
      botIds: proposal.proposedMigrants,
      leaderBotId: proposal.proposedLeaderId || proposal.proposedMigrants[0],
      destination: proposal.proposedLocation,
      status: 'FORMING',
      currentPosition: proposal.proposedLocation  // Start position (will update)
    };
    
    this.migrations.set(migration.id, migration);
    
    // Transfer resources from source village
    const villageManager = getVillageManager();
    const sourceVillage = villageManager.getVillage(proposal.sourceVillageId);
    
    if (sourceVillage) {
      sourceVillage.stockpile.food -= proposal.resourcesTransfer.food;
      sourceVillage.stockpile.wood -= proposal.resourcesTransfer.wood;
      sourceVillage.stockpile.stone -= proposal.resourcesTransfer.stone;
      sourceVillage.stockpile.iron -= proposal.resourcesTransfer.iron;
      
      // Remove migrants from source village
      sourceVillage.memberIds = sourceVillage.memberIds.filter(
        id => !proposal.proposedMigrants.includes(id)
      );
    }
    
    // Start migration
    migration.status = 'TRAVELING';
    migration.departedAt = Date.now();
    
    logger.info(`Split execution started: ${proposal.proposedMigrants.length} bots migrating`);
    
    return true;
  }

  /**
   * Complete a migration (called when bots arrive)
   */
  completeMigration(migrationId: string): Village | null {
    const migration = this.migrations.get(migrationId);
    if (!migration || migration.status !== 'TRAVELING') {
      return null;
    }
    
    migration.status = 'SETTLING';
    migration.arrivedAt = Date.now();
    
    const proposal = this.proposals.get(migration.proposalId);
    if (!proposal) return null;
    
    // Create new village
    const villageManager = getVillageManager();
    const newVillage = villageManager.createVillage(
      migration.destination,
      this.generateVillageName(proposal.sourceVillageId)
    );
    
    // Add migrants to new village
    for (const botId of migration.botIds) {
      const botManager = getBotManager();
      const bot = botManager.getBot(botId);
      if (bot) {
        const data = bot.getData();
        data.villageId = newVillage.id;
        newVillage.memberIds.push(botId);
      }
    }
    
    // Set leader
    if (proposal.proposedLeaderId) {
      newVillage.leaderId = proposal.proposedLeaderId;
    }
    
    // Transfer stockpile
    newVillage.stockpile.food = proposal.resourcesTransfer.food;
    newVillage.stockpile.wood = proposal.resourcesTransfer.wood;
    newVillage.stockpile.stone = proposal.resourcesTransfer.stone;
    newVillage.stockpile.iron = proposal.resourcesTransfer.iron;
    
    // Set founders
    newVillage.founderIds = [...migration.botIds];
    
    // Create territory
    const territoryManager = getTerritoryManager();
    territoryManager.createVillageTerritory(newVillage.id, migration.destination, 24);
    
    // Update statuses
    migration.status = 'ESTABLISHED';
    proposal.status = 'COMPLETED';
    proposal.newVillageId = newVillage.id;
    
    // Record split
    this.recordSplit(proposal, newVillage.id, true);
    
    // Update last split time
    this.lastSplitTime.set(proposal.sourceVillageId, Date.now());
    
    logger.info(`New village established: ${newVillage.name} with ${migration.botIds.length} members`);
    
    return newVillage;
  }

  /**
   * Generate a name for new village based on source
   */
  private generateVillageName(sourceVillageId: string): string {
    const prefixes = ['New', 'North', 'South', 'East', 'West', 'Far', 'Little'];
    const suffixes = ['ford', 'haven', 'hold', 'stead', 'dale', 'vale', 'ridge', 'brook'];
    
    const villageManager = getVillageManager();
    const sourceVillage = villageManager.getVillage(sourceVillageId);
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    if (sourceVillage && Math.random() > 0.5) {
      // Reference source village by deriving from its name
      // Remove trailing lowercase letter to allow suffix attachment (e.g., "Stone" -> "Ston" + "ford")
      const sourceName = sourceVillage.name.split(' ')[0].replace(/[a-z]$/i, '');
      return `${prefix} ${sourceName}${suffix}`;
    }
    
    const bases = ['Stone', 'Oak', 'Pine', 'Iron', 'River', 'Hill', 'Moon', 'Sun'];
    const base = bases[Math.floor(Math.random() * bases.length)];
    
    return `${base}${suffix}`;
  }

  /**
   * Record a split in history
   */
  private recordSplit(proposal: SplitProposal, newVillageId: string, success: boolean): void {
    const record: SplitRecord = {
      id: uuidv4(),
      sourceVillageId: proposal.sourceVillageId,
      newVillageId,
      reason: proposal.reason,
      migrantCount: proposal.proposedMigrants.length,
      timestamp: Date.now(),
      success,
      aftermath: success ? 'New village established successfully' : 'Split failed'
    };
    
    this.splitHistory.push(record);
    
    // Keep history limited
    if (this.splitHistory.length > 100) {
      this.splitHistory = this.splitHistory.slice(-100);
    }
  }

  /**
   * Approve a split proposal
   */
  approveProposal(proposalId: string): boolean {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== 'PROPOSED') {
      return false;
    }
    
    proposal.status = 'APPROVED';
    return true;
  }

  /**
   * Reject a split proposal
   */
  rejectProposal(proposalId: string, reason?: string): boolean {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== 'PROPOSED') {
      return false;
    }
    
    proposal.status = 'REJECTED';
    return true;
  }

  /**
   * Get pending proposals
   */
  getPendingProposals(): SplitProposal[] {
    return Array.from(this.proposals.values()).filter(p => p.status === 'PROPOSED');
  }

  /**
   * Get active migrations
   */
  getActiveMigrations(): MigrationGroup[] {
    return Array.from(this.migrations.values()).filter(
      m => m.status === 'TRAVELING' || m.status === 'SETTLING'
    );
  }

  /**
   * Get split history for a village
   */
  getVillageSplitHistory(villageId: string): SplitRecord[] {
    return this.splitHistory.filter(
      r => r.sourceVillageId === villageId || r.newVillageId === villageId
    );
  }

  /**
   * Serialize for persistence
   */
  serialize(): {
    proposals: SplitProposal[];
    migrations: MigrationGroup[];
    splitHistory: SplitRecord[];
    lastSplitTimes: { villageId: string; time: number }[];
  } {
    return {
      proposals: Array.from(this.proposals.values()),
      migrations: Array.from(this.migrations.values()),
      splitHistory: this.splitHistory,
      lastSplitTimes: Array.from(this.lastSplitTime.entries()).map(([villageId, time]) => ({ villageId, time }))
    };
  }

  /**
   * Load from persistence
   */
  load(data: {
    proposals?: SplitProposal[];
    migrations?: MigrationGroup[];
    splitHistory?: SplitRecord[];
    lastSplitTimes?: { villageId: string; time: number }[];
  }): void {
    this.proposals.clear();
    this.migrations.clear();
    this.lastSplitTime.clear();
    
    for (const proposal of data.proposals || []) {
      this.proposals.set(proposal.id, proposal);
    }
    
    for (const migration of data.migrations || []) {
      this.migrations.set(migration.id, migration);
    }
    
    this.splitHistory = data.splitHistory || [];
    
    for (const entry of data.lastSplitTimes || []) {
      this.lastSplitTime.set(entry.villageId, entry.time);
    }
    
    logger.info('Village splitting data loaded');
  }
}

// Singleton
let splittingManagerInstance: VillageSplittingManager | null = null;

export function getSplittingManager(): VillageSplittingManager {
  if (!splittingManagerInstance) {
    splittingManagerInstance = new VillageSplittingManager();
  }
  return splittingManagerInstance;
}

export function resetSplittingManager(): void {
  splittingManagerInstance = null;
}

export default VillageSplittingManager;
