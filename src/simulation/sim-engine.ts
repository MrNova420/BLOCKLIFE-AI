/**
 * BlockLife AI - Simulation Engine
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Core civilization simulation logic.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Village,
  CivilizationState,
  Era,
  TechAge,
  Position,
  ResourceStock,
  CivilizationStats,
  SimulationConfig,
  PerformanceMode,
  HistoricalEvent,
  Structure,
  ThreatZone,
  ThreatLevel,
  Role
} from '../types';
import { BotManager, getBotManager } from '../bots/bot-manager';
import { BotAgent } from '../bots/bot-agent';
import { createLogger } from '../utils/logger';

const logger = createLogger('sim');

// Village name parts for generation
const VILLAGE_PREFIXES = ['Oak', 'Stone', 'River', 'Hill', 'Sun', 'Moon', 'Star', 'Iron', 'Gold', 'Silver'];
const VILLAGE_SUFFIXES = ['ridge', 'haven', 'fall', 'dale', 'vale', 'watch', 'hold', 'ford', 'keep', 'port'];

/**
 * Generate a village name
 */
function generateVillageName(): string {
  const prefix = VILLAGE_PREFIXES[Math.floor(Math.random() * VILLAGE_PREFIXES.length)];
  const suffix = VILLAGE_SUFFIXES[Math.floor(Math.random() * VILLAGE_SUFFIXES.length)];
  return `${prefix}${suffix}`;
}

/**
 * Default resource stock for new village
 */
function createDefaultStock(): ResourceStock {
  return {
    food: 100,
    wood: 50,
    stone: 30,
    iron: 0,
    gold: 0,
    tools: 5,
    weapons: 2
  };
}

/**
 * Create default civilization stats
 */
function createDefaultStats(): CivilizationStats {
  return {
    totalBotsEverLived: 0,
    totalDeaths: 0,
    totalBirths: 0,
    warsWaged: 0,
    structuresBuilt: 0,
    maxPopulation: 0,
    currentPopulation: 0
  };
}

/**
 * Create default simulation config
 */
function createDefaultConfig(): SimulationConfig {
  return {
    performanceMode: PerformanceMode.NORMAL,
    maxBots: 50,
    tickRateMs: 300,
    aiEnabled: true,
    autoSave: true,
    saveIntervalMs: 60000
  };
}

/**
 * Simulation Engine - handles all civilization logic
 */
export class SimEngine {
  private state: CivilizationState;
  private botManager: BotManager;
  private threatZones: Map<string, ThreatZone> = new Map();
  private lastTickTime: number = Date.now();

  constructor(existingState?: CivilizationState) {
    this.botManager = getBotManager();
    
    if (existingState) {
      this.state = existingState;
    } else {
      this.state = this.createNewCivilization();
    }
    
    logger.info('Simulation Engine initialized');
  }

  /**
   * Create a fresh civilization state
   */
  private createNewCivilization(): CivilizationState {
    return {
      id: uuidv4(),
      startedAt: Date.now(),
      currentTick: 0,
      simulationDays: 0,
      villages: [],
      factions: [],
      era: Era.DAWN,
      globalEvents: [],
      threatZones: [],
      worldMythology: [],
      heroesOfLegend: [],
      config: createDefaultConfig(),
      stats: createDefaultStats()
    };
  }

  /**
   * Get current civilization state
   */
  getState(): CivilizationState {
    return { ...this.state };
  }

  /**
   * Create a new village
   */
  createVillage(position: Position, founderIds: string[] = []): Village {
    const village: Village = {
      id: uuidv4(),
      name: generateVillageName(),
      centerPosition: { ...position },
      territory: {
        min: { x: position.x - 50, y: position.y - 10, z: position.z - 50 },
        max: { x: position.x + 50, y: position.y + 50, z: position.z + 50 }
      },
      memberIds: [...founderIds],
      founderIds: [...founderIds],
      structures: [],
      stockpile: createDefaultStock(),
      techAge: TechAge.STONE,
      discoveries: [],
      prosperity: 50,
      defenseRating: 10,
      leaderId: founderIds[0],
      councilIds: [],
      laws: [],
      culturalTraits: [],
      traditions: [],
      legends: [],
      villageRelations: [],
      foundedAt: Date.now(),
      historicalEvents: []
    };

    this.state.villages.push(village);
    
    // Log historical event
    this.logEvent({
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'VILLAGE_FOUNDED',
      participants: founderIds,
      location: village.name,
      description: `${village.name} was founded`,
      significance: 100
    });

    logger.info(`Village created: ${village.name}`);
    return village;
  }

  /**
   * Get a village by ID
   */
  getVillage(villageId: string): Village | undefined {
    return this.state.villages.find(v => v.id === villageId);
  }

  /**
   * Get all villages
   */
  getAllVillages(): Village[] {
    return [...this.state.villages];
  }

  /**
   * Add a bot to a village
   */
  addBotToVillage(botId: string, villageId: string): void {
    const village = this.getVillage(villageId);
    if (village && !village.memberIds.includes(botId)) {
      village.memberIds.push(botId);
    }
  }

  /**
   * Remove a bot from a village
   */
  removeBotFromVillage(botId: string, villageId: string): void {
    const village = this.getVillage(villageId);
    if (village) {
      village.memberIds = village.memberIds.filter(id => id !== botId);
    }
  }

  /**
   * Get location tag for a position
   */
  getLocationTag(position: Position): string {
    // Check if in any village
    for (const village of this.state.villages) {
      if (this.isInTerritory(position, village)) {
        // Determine specific location within village
        const distToCenter = this.distance(position, village.centerPosition);
        if (distToCenter < 10) return `${village.name.toUpperCase()}_CENTER`;
        if (distToCenter < 30) return `${village.name.toUpperCase()}_INNER`;
        return `${village.name.toUpperCase()}_OUTER`;
      }
    }
    return 'WILDERNESS';
  }

  /**
   * Get threat level at a position
   */
  getThreatLevel(position: Position): ThreatLevel {
    let maxThreat = ThreatLevel.NONE;
    
    for (const zone of this.threatZones.values()) {
      const dist = this.distance(position, zone.position);
      if (dist < zone.radius) {
        if (zone.level === ThreatLevel.HIGH) return ThreatLevel.HIGH;
        if (zone.level === ThreatLevel.MEDIUM) {
          if (maxThreat === ThreatLevel.NONE || maxThreat === ThreatLevel.LOW) {
            maxThreat = ThreatLevel.MEDIUM;
          }
        }
        if (zone.level === ThreatLevel.LOW && maxThreat === ThreatLevel.NONE) {
          maxThreat = ThreatLevel.LOW;
        }
      }
    }
    
    return maxThreat;
  }

  /**
   * Get resource context for a village
   */
  getResourceContext(villageId: string): string[] {
    const village = this.getVillage(villageId);
    if (!village) return [];
    
    const context: string[] = [];
    const stock = village.stockpile;
    
    if (stock.food < 50) context.push('FOOD_STOCK_LOW');
    else if (stock.food > 200) context.push('FOOD_STOCK_HIGH');
    
    if (stock.wood < 20) context.push('WOOD_STOCK_LOW');
    else if (stock.wood > 100) context.push('WOOD_STOCK_HIGH');
    
    if (stock.stone < 10) context.push('STONE_STOCK_LOW');
    if (stock.iron > 0) context.push('HAS_IRON');
    if (stock.tools < 3) context.push('TOOLS_SCARCE');
    
    // Check housing
    const population = village.memberIds.length;
    const houses = village.structures.filter(s => s.type === 'HOUSE').length;
    if (population > houses * 4) context.push('HOUSING_SCARCE');
    
    return context;
  }

  /**
   * Run a simulation tick
   */
  tick(deltaMs: number): void {
    this.state.currentTick++;
    this.lastTickTime = Date.now();
    
    // Update simulation days (1 tick = roughly 1 minute of sim time)
    this.state.simulationDays += deltaMs / 60000 / 24; // Rough approximation
    
    // Update villages
    for (const village of this.state.villages) {
      this.updateVillage(village, deltaMs);
    }
    
    // Update stats
    this.updateStats();
    
    // Update era if needed
    this.checkEraProgression();
    
    // Clean up old threat zones
    this.cleanupThreatZones();
  }

  /**
   * Update a single village
   */
  private updateVillage(village: Village, deltaMs: number): void {
    // Consume resources based on population
    const population = village.memberIds.length;
    const foodConsumption = population * 0.01 * (deltaMs / 60000); // Per minute
    village.stockpile.food = Math.max(0, village.stockpile.food - foodConsumption);
    
    // Update prosperity
    village.prosperity = this.calculateProsperity(village);
    
    // Check for tech age advancement
    this.checkTechAdvancement(village);
  }

  /**
   * Calculate village prosperity
   */
  private calculateProsperity(village: Village): number {
    let prosperity = 50; // Base
    
    const stock = village.stockpile;
    const population = village.memberIds.length;
    
    // Food surplus
    if (stock.food > population * 10) prosperity += 20;
    else if (stock.food < population * 2) prosperity -= 30;
    
    // Resources
    if (stock.wood > 50) prosperity += 5;
    if (stock.stone > 30) prosperity += 5;
    if (stock.iron > 10) prosperity += 10;
    
    // Defense
    prosperity += Math.min(village.defenseRating, 20);
    
    // Structures
    prosperity += Math.min(village.structures.length * 2, 20);
    
    return Math.max(0, Math.min(100, prosperity));
  }

  /**
   * Check if village should advance tech age
   */
  private checkTechAdvancement(village: Village): void {
    const population = village.memberIds.length;
    const stock = village.stockpile;
    
    switch (village.techAge) {
      case TechAge.STONE:
        if (stock.iron > 0) {
          village.techAge = TechAge.IRON;
          this.logEvent({
            id: uuidv4(),
            timestamp: Date.now(),
            type: 'TECH_ADVANCEMENT',
            participants: village.memberIds,
            location: village.name,
            description: `${village.name} entered the Iron Age`,
            significance: 80
          });
        }
        break;
        
      case TechAge.IRON:
        if (stock.food > 300 || population > 15) {
          village.techAge = TechAge.AGRICULTURAL;
          this.logEvent({
            id: uuidv4(),
            timestamp: Date.now(),
            type: 'TECH_ADVANCEMENT',
            participants: village.memberIds,
            location: village.name,
            description: `${village.name} entered the Agricultural Age`,
            significance: 85
          });
        }
        break;
        
      case TechAge.AGRICULTURAL:
        if (population > 30 && village.structures.length > 10) {
          village.techAge = TechAge.SETTLEMENT;
          this.logEvent({
            id: uuidv4(),
            timestamp: Date.now(),
            type: 'TECH_ADVANCEMENT',
            participants: village.memberIds,
            location: village.name,
            description: `${village.name} entered the Settlement Age`,
            significance: 90
          });
        }
        break;
    }
  }

  /**
   * Update civilization stats
   */
  private updateStats(): void {
    const living = this.botManager.getLivingBotCount();
    this.state.stats.currentPopulation = living;
    this.state.stats.maxPopulation = Math.max(this.state.stats.maxPopulation, living);
  }

  /**
   * Check and update civilization era
   */
  private checkEraProgression(): void {
    const stats = this.state.stats;
    const villages = this.state.villages;
    
    if (this.state.era === Era.DAWN && stats.currentPopulation >= 10) {
      this.state.era = Era.GROWTH;
      logger.info('Civilization entered GROWTH era');
    }
    
    if (this.state.era === Era.GROWTH) {
      const avgProsperity = villages.reduce((sum, v) => sum + v.prosperity, 0) / (villages.length || 1);
      if (avgProsperity > 70 && stats.currentPopulation >= 30) {
        this.state.era = Era.GOLDEN;
        logger.info('Civilization entered GOLDEN era');
      }
    }
  }

  /**
   * Log a historical event
   */
  logEvent(event: HistoricalEvent): void {
    // Add to relevant village
    for (const village of this.state.villages) {
      if (event.location === village.name || 
          village.memberIds.some(id => event.participants.includes(id))) {
        village.historicalEvents.push(event);
        
        // Keep only recent events per village
        if (village.historicalEvents.length > 100) {
          village.historicalEvents = village.historicalEvents.slice(-100);
        }
      }
    }
  }

  /**
   * Add a threat zone
   */
  addThreatZone(zone: Omit<ThreatZone, 'id'>): ThreatZone {
    const fullZone: ThreatZone = {
      ...zone,
      id: uuidv4()
    };
    this.threatZones.set(fullZone.id, fullZone);
    return fullZone;
  }

  /**
   * Remove a threat zone
   */
  removeThreatZone(zoneId: string): void {
    this.threatZones.delete(zoneId);
  }

  /**
   * Clean up old threat zones
   */
  private cleanupThreatZones(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    for (const [id, zone] of this.threatZones.entries()) {
      if (now - zone.lastUpdated > maxAge) {
        this.threatZones.delete(id);
      }
    }
  }

  /**
   * Assign roles to bots in a village
   */
  assignRoles(villageId: string): void {
    const village = this.getVillage(villageId);
    if (!village) return;
    
    const bots = this.botManager.getBotsByVillage(villageId);
    const livingBots = bots.filter(b => !b.isDead());
    
    if (livingBots.length === 0) return;
    
    // Calculate desired role distribution
    const total = livingBots.length;
    const distribution = {
      [Role.FARMER]: Math.ceil(total * 0.35),
      [Role.BUILDER]: Math.ceil(total * 0.15),
      [Role.MINER]: Math.ceil(total * 0.15),
      [Role.GUARD]: Math.ceil(total * 0.15),
      [Role.LUMBERJACK]: Math.ceil(total * 0.10),
      [Role.CARETAKER]: Math.ceil(total * 0.05),
      [Role.SCHOLAR]: Math.ceil(total * 0.05)
    };
    
    // Adjust based on needs
    const stock = village.stockpile;
    if (stock.food < 50) {
      distribution[Role.FARMER] += 2;
    }
    if (stock.wood < 20) {
      distribution[Role.LUMBERJACK] += 1;
    }
    
    // Assign roles to unassigned bots
    const currentCounts: Partial<Record<Role, number>> = {};
    for (const bot of livingBots) {
      const role = bot.getRole();
      if (role !== Role.UNASSIGNED) {
        currentCounts[role] = (currentCounts[role] || 0) + 1;
      }
    }
    
    for (const bot of livingBots) {
      if (bot.getRole() === Role.UNASSIGNED) {
        // Find a needed role
        for (const [role, needed] of Object.entries(distribution)) {
          const current = currentCounts[role as Role] || 0;
          if (current < needed) {
            bot.setRole(role as Role);
            currentCounts[role as Role] = current + 1;
            break;
          }
        }
        
        // Default to farmer if no role assigned
        if (bot.getRole() === Role.UNASSIGNED) {
          bot.setRole(Role.FARMER);
        }
      }
    }
  }

  /**
   * Add a structure to a village
   */
  addStructure(villageId: string, structure: Omit<Structure, 'id'>): Structure | undefined {
    const village = this.getVillage(villageId);
    if (!village) return undefined;
    
    const fullStructure: Structure = {
      ...structure,
      id: uuidv4()
    };
    
    village.structures.push(fullStructure);
    this.state.stats.structuresBuilt++;
    
    return fullStructure;
  }

  /**
   * Helper: check if position is in village territory
   */
  private isInTerritory(position: Position, village: Village): boolean {
    const t = village.territory;
    return (
      position.x >= t.min.x && position.x <= t.max.x &&
      position.y >= t.min.y && position.y <= t.max.y &&
      position.z >= t.min.z && position.z <= t.max.z
    );
  }

  /**
   * Helper: calculate distance between positions
   */
  private distance(a: Position, b: Position): number {
    return Math.sqrt(
      Math.pow(a.x - b.x, 2) +
      Math.pow(a.y - b.y, 2) +
      Math.pow(a.z - b.z, 2)
    );
  }

  /**
   * Record a birth
   */
  recordBirth(): void {
    this.state.stats.totalBirths++;
    this.state.stats.totalBotsEverLived++;
  }

  /**
   * Record a death
   */
  recordDeath(): void {
    this.state.stats.totalDeaths++;
  }

  /**
   * Serialize state for persistence
   */
  serialize(): CivilizationState {
    return {
      ...this.state,
      threatZones: Array.from(this.threatZones.values())
    };
  }

  /**
   * Load state from persistence
   */
  loadState(state: CivilizationState): void {
    this.state = state;
    
    // Restore threat zones
    this.threatZones.clear();
    for (const zone of state.threatZones) {
      this.threatZones.set(zone.id, zone);
    }
    
    logger.info('Simulation state loaded');
  }
}

// Singleton instance
let simEngineInstance: SimEngine | null = null;

/**
 * Initialize the simulation engine
 */
export function initializeSimEngine(existingState?: CivilizationState): SimEngine {
  simEngineInstance = new SimEngine(existingState);
  return simEngineInstance;
}

/**
 * Get the simulation engine singleton
 */
export function getSimEngine(): SimEngine {
  if (!simEngineInstance) {
    simEngineInstance = new SimEngine();
  }
  return simEngineInstance;
}

/**
 * Reset simulation engine
 */
export function resetSimEngine(): void {
  simEngineInstance = null;
}

export default SimEngine;
