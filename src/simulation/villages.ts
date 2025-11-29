/**
 * BlockLife AI - Village Manager
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Extended village management with economy, governance, and culture.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Village,
  Position,
  ResourceStock,
  Structure,
  Law,
  CulturalTrait,
  Tradition,
  TechAge,
  Role,
  BoundingBox
} from '../types';
import { getBotManager } from '../bots/bot-manager';
import { createLogger } from '../utils/logger';

const logger = createLogger('villages');

/**
 * Building blueprint for construction
 */
export interface BuildingBlueprint {
  type: string;
  name: string;
  requiredResources: Partial<ResourceStock>;
  size: { width: number; height: number; depth: number };
  buildTime: number;  // In ticks
  capacity?: number;  // For housing
  productionRate?: number;  // For production buildings
}

/**
 * Build queue item
 */
export interface BuildQueueItem {
  id: string;
  blueprint: BuildingBlueprint;
  position: Position;
  assignedBuilders: string[];
  progress: number;  // 0-100
  startedAt: number;
}

/**
 * Economic report for a village
 */
export interface EconomicReport {
  villageId: string;
  timestamp: number;
  population: number;
  foodProduction: number;
  foodConsumption: number;
  foodBalance: number;
  resourceTrends: Partial<Record<keyof ResourceStock, 'RISING' | 'STABLE' | 'FALLING'>>;
  prosperity: number;
  warnings: string[];
}

/**
 * Election for village leadership
 */
export interface Election {
  id: string;
  villageId: string;
  position: 'CHIEF' | 'COUNCIL';
  candidates: string[];
  votes: Map<string, string>;  // Voter ID -> Candidate ID
  startedAt: number;
  endsAt: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  winnerId?: string;
}

// Building blueprints
const BLUEPRINTS: Record<string, BuildingBlueprint> = {
  HUT: {
    type: 'HOUSE',
    name: 'Wooden Hut',
    requiredResources: { wood: 20 },
    size: { width: 5, height: 4, depth: 5 },
    buildTime: 100,
    capacity: 2
  },
  HOUSE: {
    type: 'HOUSE',
    name: 'Stone House',
    requiredResources: { wood: 10, stone: 30 },
    size: { width: 7, height: 5, depth: 7 },
    buildTime: 200,
    capacity: 4
  },
  FARM: {
    type: 'FARM',
    name: 'Farm Plot',
    requiredResources: { wood: 10 },
    size: { width: 10, height: 2, depth: 10 },
    buildTime: 50,
    productionRate: 5
  },
  STORAGE: {
    type: 'STORAGE',
    name: 'Storage Barn',
    requiredResources: { wood: 40, stone: 10 },
    size: { width: 8, height: 6, depth: 8 },
    buildTime: 150
  },
  WALL_SECTION: {
    type: 'DEFENSE',
    name: 'Wall Section',
    requiredResources: { stone: 25 },
    size: { width: 5, height: 4, depth: 1 },
    buildTime: 80
  },
  WATCHTOWER: {
    type: 'DEFENSE',
    name: 'Watchtower',
    requiredResources: { wood: 30, stone: 20 },
    size: { width: 4, height: 10, depth: 4 },
    buildTime: 200
  },
  WORKSHOP: {
    type: 'PRODUCTION',
    name: 'Crafting Workshop',
    requiredResources: { wood: 35, stone: 15 },
    size: { width: 6, height: 5, depth: 6 },
    buildTime: 180
  },
  MINE_ENTRANCE: {
    type: 'PRODUCTION',
    name: 'Mine Entrance',
    requiredResources: { wood: 40, stone: 20 },
    size: { width: 5, height: 6, depth: 8 },
    buildTime: 250,
    productionRate: 3
  },
  TOWN_HALL: {
    type: 'CIVIC',
    name: 'Town Hall',
    requiredResources: { wood: 60, stone: 80 },
    size: { width: 12, height: 8, depth: 12 },
    buildTime: 500
  },
  MARKET: {
    type: 'COMMERCE',
    name: 'Market Square',
    requiredResources: { wood: 30, stone: 40 },
    size: { width: 15, height: 3, depth: 15 },
    buildTime: 200
  }
};

/**
 * Village Manager - handles all village operations
 */
export class VillageManager {
  private villages: Map<string, Village> = new Map();
  private buildQueues: Map<string, BuildQueueItem[]> = new Map();
  private elections: Map<string, Election> = new Map();
  private economicHistory: Map<string, EconomicReport[]> = new Map();
  
  private readonly FOOD_CONSUMPTION_PER_BOT = 1;  // Per minute
  private readonly RESOURCE_PRODUCTION_BASE = 2;
  private readonly MAX_ECONOMIC_HISTORY = 60;  // Keep 1 hour of reports

  constructor() {
    logger.info('Village Manager initialized');
  }

  /**
   * Register an existing village
   */
  registerVillage(village: Village): void {
    this.villages.set(village.id, village);
    this.buildQueues.set(village.id, []);
    this.economicHistory.set(village.id, []);
  }

  /**
   * Create a new village
   */
  createVillage(center: Position, name?: string): Village {
    const village: Village = {
      id: uuidv4(),
      name: name || this.generateVillageName(),
      centerPosition: center,
      territory: {
        min: { x: center.x - 32, y: center.y - 10, z: center.z - 32 },
        max: { x: center.x + 32, y: center.y + 50, z: center.z + 32 }
      },
      memberIds: [],
      founderIds: [],
      structures: [],
      stockpile: {
        food: 50,
        wood: 30,
        stone: 20,
        iron: 5,
        gold: 0,
        tools: 5,
        weapons: 2
      },
      techAge: TechAge.STONE,
      discoveries: [],
      prosperity: 30,
      defenseRating: 10,
      leaderId: undefined,
      councilIds: [],
      laws: [],
      culturalTraits: [],
      traditions: [],
      legends: [],
      villageRelations: [],
      foundedAt: Date.now(),
      historicalEvents: [{
        id: uuidv4(),
        timestamp: Date.now(),
        type: 'VILLAGE_FOUNDED',
        participants: [],
        location: `${center.x}, ${center.y}, ${center.z}`,
        description: `The village of ${name || 'Unknown'} was founded`,
        significance: 100
      }]
    };

    this.registerVillage(village);
    logger.info(`Village created: ${village.name}`);
    
    return village;
  }

  /**
   * Generate a random village name
   */
  private generateVillageName(): string {
    const prefixes = ['Oak', 'Pine', 'Stone', 'Iron', 'River', 'Hill', 'Moon', 'Sun', 'Golden', 'Silver'];
    const suffixes = ['ford', 'haven', 'hold', 'stead', 'dale', 'vale', 'ridge', 'brook', 'ville', 'ton'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix}${suffix}`;
  }

  /**
   * Get a village by ID
   */
  getVillage(villageId: string): Village | undefined {
    return this.villages.get(villageId);
  }

  /**
   * Get all villages
   */
  getAllVillages(): Village[] {
    return Array.from(this.villages.values());
  }

  /**
   * Update village economy (called each tick)
   */
  updateEconomy(villageId: string, deltaMs: number): void {
    const village = this.villages.get(villageId);
    if (!village) return;
    
    const botManager = getBotManager();
    const members = botManager.getBotsByVillage(villageId);
    const livingMembers = members.filter(m => !m.isDead());
    
    const minutesPassed = deltaMs / 60000;
    
    // Food consumption
    const foodConsumed = livingMembers.length * this.FOOD_CONSUMPTION_PER_BOT * minutesPassed;
    village.stockpile.food = Math.max(0, village.stockpile.food - foodConsumed);
    
    // Production based on workers
    const farmers = livingMembers.filter(m => m.getRole() === Role.FARMER).length;
    const miners = livingMembers.filter(m => m.getRole() === Role.MINER).length;
    const lumberjacks = livingMembers.filter(m => m.getRole() === Role.LUMBERJACK).length;
    
    // Add resources based on workers
    const farms = village.structures.filter(s => s.type === 'FARM').length;
    const foodProduction = farmers * this.RESOURCE_PRODUCTION_BASE * (1 + farms * 0.5) * minutesPassed;
    village.stockpile.food += foodProduction;
    
    village.stockpile.stone += miners * this.RESOURCE_PRODUCTION_BASE * 0.5 * minutesPassed;
    village.stockpile.iron += miners * this.RESOURCE_PRODUCTION_BASE * 0.1 * minutesPassed;
    village.stockpile.wood += lumberjacks * this.RESOURCE_PRODUCTION_BASE * minutesPassed;
  }

  /**
   * Generate economic report
   */
  generateEconomicReport(villageId: string): EconomicReport {
    const village = this.villages.get(villageId);
    if (!village) {
      throw new Error(`Village ${villageId} not found`);
    }
    
    const botManager = getBotManager();
    const members = botManager.getBotsByVillage(villageId);
    const livingMembers = members.filter(m => !m.isDead());
    
    const farmers = livingMembers.filter(m => m.getRole() === Role.FARMER).length;
    const farms = village.structures.filter(s => s.type === 'FARM').length;
    
    const foodProduction = farmers * this.RESOURCE_PRODUCTION_BASE * (1 + farms * 0.5);
    const foodConsumption = livingMembers.length * this.FOOD_CONSUMPTION_PER_BOT;
    
    const warnings: string[] = [];
    
    if (village.stockpile.food < 50) {
      warnings.push('Food supplies critically low!');
    }
    if (foodConsumption > foodProduction) {
      warnings.push('Food consumption exceeds production');
    }
    if (livingMembers.length > village.structures.filter(s => s.type === 'HOUSE').length * 4) {
      warnings.push('Housing shortage');
    }
    
    // Calculate trends by comparing to previous report
    const history = this.economicHistory.get(villageId) || [];
    const lastReport = history[history.length - 1];
    
    const getTrend = (current: number, previous?: number): 'RISING' | 'STABLE' | 'FALLING' => {
      if (!previous) return 'STABLE';
      const change = current - previous;
      if (change > 5) return 'RISING';
      if (change < -5) return 'FALLING';
      return 'STABLE';
    };
    
    const report: EconomicReport = {
      villageId,
      timestamp: Date.now(),
      population: livingMembers.length,
      foodProduction,
      foodConsumption,
      foodBalance: foodProduction - foodConsumption,
      resourceTrends: {
        food: getTrend(village.stockpile.food, lastReport?.prosperity),
        wood: getTrend(village.stockpile.wood),
        stone: getTrend(village.stockpile.stone)
      },
      prosperity: village.prosperity,
      warnings
    };
    
    // Store in history
    history.push(report);
    if (history.length > this.MAX_ECONOMIC_HISTORY) {
      history.shift();
    }
    this.economicHistory.set(villageId, history);
    
    return report;
  }

  /**
   * Queue a building for construction
   */
  queueBuilding(villageId: string, blueprintKey: string, position: Position): BuildQueueItem | null {
    const village = this.villages.get(villageId);
    if (!village) return null;
    
    const blueprint = BLUEPRINTS[blueprintKey];
    if (!blueprint) {
      logger.warn(`Unknown blueprint: ${blueprintKey}`);
      return null;
    }
    
    // Check resources
    const required = blueprint.requiredResources;
    for (const [resource, amount] of Object.entries(required)) {
      const available = village.stockpile[resource as keyof ResourceStock] || 0;
      if (available < (amount || 0)) {
        logger.debug(`Insufficient ${resource} for ${blueprint.name}`);
        return null;
      }
    }
    
    // Deduct resources
    for (const [resource, amount] of Object.entries(required)) {
      village.stockpile[resource as keyof ResourceStock] -= (amount || 0);
    }
    
    const item: BuildQueueItem = {
      id: uuidv4(),
      blueprint,
      position,
      assignedBuilders: [],
      progress: 0,
      startedAt: Date.now()
    };
    
    const queue = this.buildQueues.get(villageId) || [];
    queue.push(item);
    this.buildQueues.set(villageId, queue);
    
    logger.info(`Queued ${blueprint.name} for construction in ${village.name}`);
    return item;
  }

  /**
   * Progress building construction
   */
  progressConstruction(villageId: string, deltaMs: number): Structure[] {
    const village = this.villages.get(villageId);
    if (!village) return [];
    
    const queue = this.buildQueues.get(villageId) || [];
    const completed: Structure[] = [];
    
    for (const item of queue) {
      if (item.assignedBuilders.length === 0) continue;
      
      // Progress based on builder count
      const progressRate = item.assignedBuilders.length * 0.5 * (deltaMs / 1000);
      item.progress = Math.min(100, item.progress + progressRate);
      
      if (item.progress >= 100) {
        // Create structure
        const structure: Structure = {
          id: uuidv4(),
          type: item.blueprint.type,
          name: item.blueprint.name,
          position: item.position,
          size: {
            min: item.position,
            max: {
              x: item.position.x + item.blueprint.size.width,
              y: item.position.y + item.blueprint.size.height,
              z: item.position.z + item.blueprint.size.depth
            }
          },
          builtBy: item.assignedBuilders,
          builtAt: Date.now(),
          condition: 100
        };
        
        village.structures.push(structure);
        completed.push(structure);
        logger.info(`Completed construction: ${structure.name} in ${village.name}`);
      }
    }
    
    // Remove completed items from queue
    const remaining = queue.filter(item => item.progress < 100);
    this.buildQueues.set(villageId, remaining);
    
    return completed;
  }

  /**
   * Assign a builder to a construction project
   */
  assignBuilder(villageId: string, builderId: string): boolean {
    const queue = this.buildQueues.get(villageId) || [];
    
    // Find first unfinished project with room for builders
    for (const item of queue) {
      if (item.progress < 100 && !item.assignedBuilders.includes(builderId)) {
        item.assignedBuilders.push(builderId);
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get build queue for a village
   */
  getBuildQueue(villageId: string): BuildQueueItem[] {
    return this.buildQueues.get(villageId) || [];
  }

  /**
   * Enact a new law
   */
  enactLaw(villageId: string, name: string, description: string, enactedBy: string): Law | null {
    const village = this.villages.get(villageId);
    if (!village) return null;
    
    // Check if leader
    if (village.leaderId !== enactedBy) {
      logger.debug('Only leader can enact laws');
      return null;
    }
    
    const law: Law = {
      id: uuidv4(),
      name,
      description,
      enactedAt: Date.now(),
      enactedBy
    };
    
    village.laws.push(law);
    logger.info(`New law enacted in ${village.name}: ${name}`);
    
    return law;
  }

  /**
   * Start an election
   */
  startElection(villageId: string, position: 'CHIEF' | 'COUNCIL', candidates: string[]): Election | null {
    const village = this.villages.get(villageId);
    if (!village) return null;
    
    if (candidates.length < 2) {
      logger.debug('Need at least 2 candidates for election');
      return null;
    }
    
    const election: Election = {
      id: uuidv4(),
      villageId,
      position,
      candidates,
      votes: new Map(),
      startedAt: Date.now(),
      endsAt: Date.now() + 300000,  // 5 minute election
      status: 'ACTIVE'
    };
    
    this.elections.set(election.id, election);
    logger.info(`Election started in ${village.name} for ${position}`);
    
    return election;
  }

  /**
   * Cast a vote
   */
  castVote(electionId: string, voterId: string, candidateId: string): boolean {
    const election = this.elections.get(electionId);
    if (!election || election.status !== 'ACTIVE') return false;
    
    if (!election.candidates.includes(candidateId)) return false;
    
    election.votes.set(voterId, candidateId);
    return true;
  }

  /**
   * Conclude an election
   */
  concludeElection(electionId: string): string | null {
    const election = this.elections.get(electionId);
    if (!election || election.status !== 'ACTIVE') return null;
    
    // Count votes
    const voteCounts: Map<string, number> = new Map();
    for (const candidateId of election.votes.values()) {
      voteCounts.set(candidateId, (voteCounts.get(candidateId) || 0) + 1);
    }
    
    // Find winner
    let winnerId: string | null = null;
    let maxVotes = 0;
    for (const [candidateId, votes] of voteCounts.entries()) {
      if (votes > maxVotes) {
        maxVotes = votes;
        winnerId = candidateId;
      }
    }
    
    election.status = 'COMPLETED';
    election.winnerId = winnerId || undefined;
    
    // Update village leadership
    if (winnerId) {
      const village = this.villages.get(election.villageId);
      if (village) {
        if (election.position === 'CHIEF') {
          village.leaderId = winnerId;
        } else if (election.position === 'COUNCIL') {
          if (!village.councilIds.includes(winnerId)) {
            village.councilIds.push(winnerId);
          }
        }
        logger.info(`Election concluded: ${winnerId} elected as ${election.position}`);
      }
    }
    
    return winnerId;
  }

  /**
   * Add a cultural trait
   */
  addCulturalTrait(villageId: string, traitType: CulturalTrait['type']): void {
    const village = this.villages.get(villageId);
    if (!village) return;
    
    const existing = village.culturalTraits.find(t => t.type === traitType);
    if (existing) {
      existing.strength = Math.min(100, existing.strength + 10);
    } else {
      village.culturalTraits.push({
        id: uuidv4(),
        name: traitType,
        type: traitType,
        strength: 30
      });
    }
  }

  /**
   * Create a tradition
   */
  createTradition(villageId: string, name: string, description: string, frequency: number): Tradition | null {
    const village = this.villages.get(villageId);
    if (!village) return null;
    
    const tradition: Tradition = {
      id: uuidv4(),
      name,
      description,
      frequency,
      lastOccurred: Date.now()
    };
    
    village.traditions.push(tradition);
    return tradition;
  }

  /**
   * Calculate defense rating
   */
  calculateDefenseRating(villageId: string): number {
    const village = this.villages.get(villageId);
    if (!village) return 0;
    
    let rating = 10;  // Base rating
    
    // Add for defensive structures
    rating += village.structures.filter(s => s.type === 'DEFENSE').length * 10;
    
    // Add for guards
    const botManager = getBotManager();
    const guards = botManager.getBotsByRole(Role.GUARD)
      .filter(g => g.getData().villageId === villageId)
      .length;
    rating += guards * 5;
    
    // Add for walls
    const walls = village.structures.filter(s => s.name.includes('Wall')).length;
    rating += walls * 3;
    
    // Cap at 100
    village.defenseRating = Math.min(100, rating);
    return village.defenseRating;
  }

  /**
   * Find suitable building position
   */
  findBuildPosition(villageId: string, blueprintKey: string): Position | null {
    const village = this.villages.get(villageId);
    if (!village) return null;
    
    const blueprint = BLUEPRINTS[blueprintKey];
    if (!blueprint) return null;
    
    // Simple spiral search from village center
    const center = village.centerPosition;
    const maxRadius = 50;
    
    for (let radius = 5; radius < maxRadius; radius += 5) {
      for (let angle = 0; angle < 360; angle += 45) {
        const rad = (angle * Math.PI) / 180;
        const x = Math.round(center.x + Math.cos(rad) * radius);
        const z = Math.round(center.z + Math.sin(rad) * radius);
        const position = { x, y: center.y, z };
        
        // Check if position is clear
        if (!this.isPositionOccupied(village, position, blueprint.size)) {
          return position;
        }
      }
    }
    
    return null;
  }

  /**
   * Check if a position is occupied by existing structures
   */
  private isPositionOccupied(
    village: Village, 
    position: Position, 
    size: { width: number; height: number; depth: number }
  ): boolean {
    const newBounds: BoundingBox = {
      min: position,
      max: {
        x: position.x + size.width,
        y: position.y + size.height,
        z: position.z + size.depth
      }
    };
    
    for (const structure of village.structures) {
      if (this.boundsOverlap(newBounds, structure.size)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if two bounding boxes overlap
   */
  private boundsOverlap(a: BoundingBox, b: BoundingBox): boolean {
    return (
      a.min.x <= b.max.x && a.max.x >= b.min.x &&
      a.min.y <= b.max.y && a.max.y >= b.min.y &&
      a.min.z <= b.max.z && a.max.z >= b.min.z
    );
  }

  /**
   * Get available blueprints for a tech age
   */
  getAvailableBlueprints(techAge: TechAge): BuildingBlueprint[] {
    const available: string[] = [];
    
    switch (techAge) {
      case TechAge.STONE:
        available.push('HUT', 'FARM');
        break;
      case TechAge.IRON:
        available.push('HUT', 'HOUSE', 'FARM', 'STORAGE', 'WALL_SECTION');
        break;
      case TechAge.AGRICULTURAL:
        available.push('HUT', 'HOUSE', 'FARM', 'STORAGE', 'WALL_SECTION', 'WATCHTOWER', 'WORKSHOP');
        break;
      case TechAge.SETTLEMENT:
        available.push(...Object.keys(BLUEPRINTS));
        break;
      case TechAge.REDSTONE:
        available.push(...Object.keys(BLUEPRINTS));
        break;
    }
    
    return available.map(key => BLUEPRINTS[key]);
  }

  /**
   * Serialize for persistence
   */
  serialize(): {
    villages: Village[];
    buildQueues: { villageId: string; items: BuildQueueItem[] }[];
  } {
    const buildQueuesArray: { villageId: string; items: BuildQueueItem[] }[] = [];
    for (const [villageId, items] of this.buildQueues.entries()) {
      buildQueuesArray.push({ villageId, items });
    }
    
    return {
      villages: Array.from(this.villages.values()),
      buildQueues: buildQueuesArray
    };
  }

  /**
   * Load from persistence
   */
  load(data: {
    villages: Village[];
    buildQueues?: { villageId: string; items: BuildQueueItem[] }[];
  }): void {
    this.villages.clear();
    this.buildQueues.clear();
    
    for (const village of data.villages || []) {
      this.villages.set(village.id, village);
      this.buildQueues.set(village.id, []);
      this.economicHistory.set(village.id, []);
    }
    
    for (const queue of data.buildQueues || []) {
      this.buildQueues.set(queue.villageId, queue.items);
    }
    
    logger.info(`Loaded ${this.villages.size} villages`);
  }
}

// Singleton
let villageManagerInstance: VillageManager | null = null;

export function getVillageManager(): VillageManager {
  if (!villageManagerInstance) {
    villageManagerInstance = new VillageManager();
  }
  return villageManagerInstance;
}

export function resetVillageManager(): void {
  villageManagerInstance = null;
}

export { BLUEPRINTS };
export default VillageManager;
