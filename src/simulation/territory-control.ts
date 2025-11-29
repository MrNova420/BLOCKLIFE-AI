/**
 * BlockLife AI - Territory Control System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Manages village territories, expansion, and resource zones.
 */

import { v4 as uuidv4 } from 'uuid';
import { Position, BoundingBox } from '../types';
import { getVillageManager } from './villages';
import { createLogger } from '../utils/logger';

const logger = createLogger('territory');

/**
 * Territory zone types
 */
export enum ZoneType {
  CORE = 'CORE',               // Village center, most protected
  RESIDENTIAL = 'RESIDENTIAL', // Housing areas
  AGRICULTURAL = 'AGRICULTURAL', // Farms and food production
  INDUSTRIAL = 'INDUSTRIAL',   // Mining, crafting, workshops
  DEFENSIVE = 'DEFENSIVE',     // Walls, watchtowers, guard posts
  EXPANSION = 'EXPANSION',     // Areas being developed
  BUFFER = 'BUFFER',           // Border zones
  WILDERNESS = 'WILDERNESS'    // Unclaimed but patrolled
}

/**
 * Territory zone with detailed information
 */
export interface TerritoryZone {
  id: string;
  villageId: string;
  type: ZoneType;
  name: string;
  bounds: BoundingBox;
  center: Position;
  
  // Zone status
  development: number;         // 0-100, how developed
  safety: number;              // 0-100, how safe
  productivity: number;        // 0-100, resource output
  
  // Resources
  resources: {
    wood: number;
    stone: number;
    iron: number;
    food: number;
    water: boolean;
  };
  
  // Structures in zone
  structureIds: string[];
  
  // Patrol info
  patrolRoute: Position[];
  assignedGuards: string[];
  
  // Status
  status: 'ACTIVE' | 'DEVELOPING' | 'CONTESTED' | 'ABANDONED';
  claimedAt: number;
  updatedAt: number;
}

/**
 * Territorial claim dispute
 */
export interface TerritoryDispute {
  id: string;
  zone1Id: string;
  zone2Id: string;
  village1Id: string;
  village2Id: string;
  overlappingArea: BoundingBox;
  severity: number;            // 0-100
  status: 'ACTIVE' | 'RESOLVED' | 'ESCALATED';
  createdAt: number;
  resolvedAt?: number;
  resolution?: 'SPLIT' | 'VILLAGE1_WIN' | 'VILLAGE2_WIN' | 'SHARED';
}

/**
 * Resource deposit for mining/gathering
 */
export interface ResourceDeposit {
  id: string;
  position: Position;
  type: 'IRON_VEIN' | 'COAL_DEPOSIT' | 'STONE_QUARRY' | 'FOREST' | 'WATER_SOURCE' | 'FERTILE_SOIL';
  richness: number;            // 0-100
  remainingYield: number;      // How much left
  maxYield: number;
  renewable: boolean;
  regenerationRate: number;    // Per tick
  claimedByVillage?: string;
  discoveredAt: number;
}

/**
 * Expansion request from village
 */
export interface ExpansionRequest {
  id: string;
  villageId: string;
  direction: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'UP' | 'DOWN';
  targetArea: BoundingBox;
  reason: string;
  priority: number;            // 1-10
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  createdAt: number;
  processedAt?: number;
}

/**
 * Territory Control Manager
 */
export class TerritoryManager {
  private zones: Map<string, TerritoryZone> = new Map();
  private disputes: Map<string, TerritoryDispute> = new Map();
  private deposits: Map<string, ResourceDeposit> = new Map();
  private expansionRequests: Map<string, ExpansionRequest> = new Map();
  
  private readonly MIN_ZONE_SIZE = 16;
  private readonly MAX_VILLAGE_TERRITORY = 256;
  private readonly BUFFER_ZONE_SIZE = 8;
  private readonly DISPUTE_THRESHOLD = 0.3;  // 30% overlap triggers dispute
  
  constructor() {
    logger.info('Territory Manager initialized');
  }

  /**
   * Create initial territory for a new village
   */
  createVillageTerritory(villageId: string, center: Position, radius: number = 32): TerritoryZone {
    const coreZone: TerritoryZone = {
      id: uuidv4(),
      villageId,
      type: ZoneType.CORE,
      name: 'Village Core',
      bounds: {
        min: { x: center.x - radius, y: center.y - 10, z: center.z - radius },
        max: { x: center.x + radius, y: center.y + 50, z: center.z + radius }
      },
      center,
      
      development: 10,
      safety: 50,
      productivity: 30,
      
      resources: {
        wood: 50,
        stone: 50,
        iron: 20,
        food: 30,
        water: true
      },
      
      structureIds: [],
      patrolRoute: this.generatePatrolRoute(center, radius),
      assignedGuards: [],
      
      status: 'ACTIVE',
      claimedAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.zones.set(coreZone.id, coreZone);
    
    // Create surrounding zones
    this.createSurroundingZones(villageId, center, radius);
    
    logger.info(`Territory created for village ${villageId}`);
    
    return coreZone;
  }

  /**
   * Create surrounding zones for a village
   */
  private createSurroundingZones(villageId: string, center: Position, coreRadius: number): void {
    const directions = [
      { name: 'North Farm', dx: 0, dz: -1, type: ZoneType.AGRICULTURAL },
      { name: 'South Farm', dx: 0, dz: 1, type: ZoneType.AGRICULTURAL },
      { name: 'East Woods', dx: 1, dz: 0, type: ZoneType.INDUSTRIAL },
      { name: 'West Woods', dx: -1, dz: 0, type: ZoneType.INDUSTRIAL }
    ];
    
    const zoneRadius = coreRadius * 0.6;
    const distance = coreRadius + zoneRadius + 4;
    
    for (const dir of directions) {
      const zoneCenter: Position = {
        x: center.x + dir.dx * distance,
        y: center.y,
        z: center.z + dir.dz * distance
      };
      
      const zone: TerritoryZone = {
        id: uuidv4(),
        villageId,
        type: dir.type,
        name: dir.name,
        bounds: {
          min: { x: zoneCenter.x - zoneRadius, y: zoneCenter.y - 10, z: zoneCenter.z - zoneRadius },
          max: { x: zoneCenter.x + zoneRadius, y: zoneCenter.y + 30, z: zoneCenter.z + zoneRadius }
        },
        center: zoneCenter,
        
        development: 0,
        safety: 30,
        productivity: 0,
        
        resources: {
          wood: dir.type === ZoneType.INDUSTRIAL ? 80 : 30,
          stone: dir.type === ZoneType.INDUSTRIAL ? 60 : 20,
          iron: dir.type === ZoneType.INDUSTRIAL ? 30 : 5,
          food: dir.type === ZoneType.AGRICULTURAL ? 80 : 10,
          water: Math.random() > 0.5
        },
        
        structureIds: [],
        patrolRoute: this.generatePatrolRoute(zoneCenter, zoneRadius),
        assignedGuards: [],
        
        status: 'DEVELOPING',
        claimedAt: Date.now(),
        updatedAt: Date.now()
      };
      
      this.zones.set(zone.id, zone);
    }
  }

  /**
   * Generate a patrol route around a position
   */
  private generatePatrolRoute(center: Position, radius: number): Position[] {
    const points: Position[] = [];
    const numPoints = 8;
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      points.push({
        x: Math.round(center.x + Math.cos(angle) * radius * 0.9),
        y: center.y,
        z: Math.round(center.z + Math.sin(angle) * radius * 0.9)
      });
    }
    
    return points;
  }

  /**
   * Get all zones for a village
   */
  getVillageZones(villageId: string): TerritoryZone[] {
    return Array.from(this.zones.values()).filter(z => z.villageId === villageId);
  }

  /**
   * Get zone at a specific position
   */
  getZoneAtPosition(position: Position): TerritoryZone | undefined {
    for (const zone of this.zones.values()) {
      if (this.isPositionInBounds(position, zone.bounds)) {
        return zone;
      }
    }
    return undefined;
  }

  /**
   * Check if position is within bounds
   */
  private isPositionInBounds(pos: Position, bounds: BoundingBox): boolean {
    return pos.x >= bounds.min.x && pos.x <= bounds.max.x &&
           pos.y >= bounds.min.y && pos.y <= bounds.max.y &&
           pos.z >= bounds.min.z && pos.z <= bounds.max.z;
  }

  /**
   * Request territory expansion
   */
  requestExpansion(
    villageId: string,
    direction: ExpansionRequest['direction'],
    reason: string,
    priority: number = 5
  ): ExpansionRequest {
    const villageZones = this.getVillageZones(villageId);
    if (villageZones.length === 0) {
      throw new Error('Village has no territory');
    }
    
    // Find the edge zone in that direction
    const edgeZone = this.findEdgeZone(villageZones, direction);
    
    // Calculate target area
    const targetArea = this.calculateExpansionArea(edgeZone, direction);
    
    const request: ExpansionRequest = {
      id: uuidv4(),
      villageId,
      direction,
      targetArea,
      reason,
      priority,
      status: 'PENDING',
      createdAt: Date.now()
    };
    
    this.expansionRequests.set(request.id, request);
    
    logger.info(`Expansion requested: ${villageId} -> ${direction}`);
    
    return request;
  }

  /**
   * Find the zone at the edge in a direction
   */
  private findEdgeZone(zones: TerritoryZone[], direction: string): TerritoryZone {
    return zones.reduce((edge, zone) => {
      switch (direction) {
        case 'NORTH': return zone.center.z < edge.center.z ? zone : edge;
        case 'SOUTH': return zone.center.z > edge.center.z ? zone : edge;
        case 'EAST': return zone.center.x > edge.center.x ? zone : edge;
        case 'WEST': return zone.center.x < edge.center.x ? zone : edge;
        default: return edge;
      }
    });
  }

  /**
   * Calculate expansion area based on direction
   */
  private calculateExpansionArea(edgeZone: TerritoryZone, direction: string): BoundingBox {
    const size = this.MIN_ZONE_SIZE;
    const offset = size + 4;
    
    const center = { ...edgeZone.center };
    
    switch (direction) {
      case 'NORTH': center.z -= offset; break;
      case 'SOUTH': center.z += offset; break;
      case 'EAST': center.x += offset; break;
      case 'WEST': center.x -= offset; break;
    }
    
    return {
      min: { x: center.x - size, y: center.y - 10, z: center.z - size },
      max: { x: center.x + size, y: center.y + 30, z: center.z + size }
    };
  }

  /**
   * Process pending expansion requests
   */
  processExpansionRequests(): void {
    const pending = Array.from(this.expansionRequests.values())
      .filter(r => r.status === 'PENDING')
      .sort((a, b) => b.priority - a.priority);
    
    for (const request of pending) {
      // Check for conflicts
      const conflict = this.checkExpansionConflict(request);
      
      if (conflict) {
        // Create dispute or reject
        if (conflict.severity > this.DISPUTE_THRESHOLD * 100) {
          this.createDispute(request.villageId, conflict.conflictingVillageId, request.targetArea);
          request.status = 'REJECTED';
        } else {
          // Minor conflict, can still expand
          request.status = 'APPROVED';
        }
      } else {
        request.status = 'APPROVED';
      }
      
      request.processedAt = Date.now();
      
      // Execute approved expansions
      if (request.status === 'APPROVED') {
        this.executeExpansion(request);
      }
    }
  }

  /**
   * Check if expansion conflicts with another village
   */
  private checkExpansionConflict(request: ExpansionRequest): { conflictingVillageId: string; severity: number } | null {
    for (const zone of this.zones.values()) {
      if (zone.villageId === request.villageId) continue;
      
      const overlap = this.calculateOverlap(request.targetArea, zone.bounds);
      if (overlap > 0) {
        return {
          conflictingVillageId: zone.villageId,
          severity: overlap
        };
      }
    }
    return null;
  }

  /**
   * Calculate percentage overlap between two bounding boxes
   */
  private calculateOverlap(a: BoundingBox, b: BoundingBox): number {
    const xOverlap = Math.max(0, Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x));
    const yOverlap = Math.max(0, Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y));
    const zOverlap = Math.max(0, Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z));
    
    const overlapVolume = xOverlap * yOverlap * zOverlap;
    const aVolume = (a.max.x - a.min.x) * (a.max.y - a.min.y) * (a.max.z - a.min.z);
    
    return aVolume > 0 ? (overlapVolume / aVolume) * 100 : 0;
  }

  /**
   * Create a territory dispute
   */
  private createDispute(village1Id: string, village2Id: string, overlappingArea: BoundingBox): TerritoryDispute {
    const dispute: TerritoryDispute = {
      id: uuidv4(),
      zone1Id: '',
      zone2Id: '',
      village1Id,
      village2Id,
      overlappingArea,
      severity: 50,
      status: 'ACTIVE',
      createdAt: Date.now()
    };
    
    this.disputes.set(dispute.id, dispute);
    
    logger.info(`Territory dispute created: ${village1Id} vs ${village2Id}`);
    
    return dispute;
  }

  /**
   * Execute an approved expansion
   */
  private executeExpansion(request: ExpansionRequest): void {
    const center: Position = {
      x: (request.targetArea.min.x + request.targetArea.max.x) / 2,
      y: (request.targetArea.min.y + request.targetArea.max.y) / 2,
      z: (request.targetArea.min.z + request.targetArea.max.z) / 2
    };
    
    const zone: TerritoryZone = {
      id: uuidv4(),
      villageId: request.villageId,
      type: ZoneType.EXPANSION,
      name: `${request.direction} Expansion`,
      bounds: request.targetArea,
      center,
      
      development: 0,
      safety: 20,
      productivity: 0,
      
      resources: {
        wood: Math.floor(Math.random() * 50) + 20,
        stone: Math.floor(Math.random() * 40) + 10,
        iron: Math.floor(Math.random() * 20),
        food: Math.floor(Math.random() * 30),
        water: Math.random() > 0.6
      },
      
      structureIds: [],
      patrolRoute: this.generatePatrolRoute(center, this.MIN_ZONE_SIZE),
      assignedGuards: [],
      
      status: 'DEVELOPING',
      claimedAt: Date.now(),
      updatedAt: Date.now()
    };
    
    this.zones.set(zone.id, zone);
    request.status = 'COMPLETED';
    
    logger.info(`Expansion completed: ${request.villageId} -> ${request.direction}`);
  }

  /**
   * Discover a resource deposit
   */
  discoverDeposit(position: Position, type: ResourceDeposit['type'], richness: number = 50): ResourceDeposit {
    const deposit: ResourceDeposit = {
      id: uuidv4(),
      position,
      type,
      richness,
      remainingYield: richness * 100,
      maxYield: richness * 100,
      renewable: type === 'FOREST' || type === 'WATER_SOURCE' || type === 'FERTILE_SOIL',
      regenerationRate: type === 'FOREST' ? 1 : (type === 'WATER_SOURCE' ? 5 : 0.5),
      discoveredAt: Date.now()
    };
    
    this.deposits.set(deposit.id, deposit);
    
    logger.info(`Resource deposit discovered: ${type} at (${position.x}, ${position.y}, ${position.z})`);
    
    return deposit;
  }

  /**
   * Claim a resource deposit for a village
   */
  claimDeposit(depositId: string, villageId: string): boolean {
    const deposit = this.deposits.get(depositId);
    if (!deposit) return false;
    
    if (deposit.claimedByVillage && deposit.claimedByVillage !== villageId) {
      return false;  // Already claimed by another
    }
    
    deposit.claimedByVillage = villageId;
    return true;
  }

  /**
   * Extract from a deposit
   */
  extractFromDeposit(depositId: string, amount: number): number {
    const deposit = this.deposits.get(depositId);
    if (!deposit) return 0;
    
    const extracted = Math.min(amount, deposit.remainingYield);
    deposit.remainingYield -= extracted;
    
    return extracted;
  }

  /**
   * Process resource regeneration
   */
  processRegeneration(deltaMs: number): void {
    const regenMultiplier = deltaMs / 60000;  // Per minute
    
    for (const deposit of this.deposits.values()) {
      if (deposit.renewable && deposit.remainingYield < deposit.maxYield) {
        deposit.remainingYield = Math.min(
          deposit.maxYield,
          deposit.remainingYield + deposit.regenerationRate * regenMultiplier
        );
      }
    }
  }

  /**
   * Get total village territory size
   */
  getVillageTerritorySize(villageId: string): number {
    const zones = this.getVillageZones(villageId);
    return zones.reduce((total, zone) => {
      const size = (zone.bounds.max.x - zone.bounds.min.x) * (zone.bounds.max.z - zone.bounds.min.z);
      return total + size;
    }, 0);
  }

  /**
   * Check if village can expand further
   */
  canVillageExpand(villageId: string): boolean {
    return this.getVillageTerritorySize(villageId) < this.MAX_VILLAGE_TERRITORY * this.MAX_VILLAGE_TERRITORY;
  }

  /**
   * Update zone development
   */
  updateZoneDevelopment(zoneId: string, development: number): void {
    const zone = this.zones.get(zoneId);
    if (zone) {
      zone.development = Math.max(0, Math.min(100, development));
      zone.updatedAt = Date.now();
      
      // Update status based on development
      if (zone.development >= 80 && zone.status === 'DEVELOPING') {
        zone.status = 'ACTIVE';
      }
    }
  }

  /**
   * Serialize for persistence
   */
  serialize(): {
    zones: TerritoryZone[];
    disputes: TerritoryDispute[];
    deposits: ResourceDeposit[];
    expansionRequests: ExpansionRequest[];
  } {
    return {
      zones: Array.from(this.zones.values()),
      disputes: Array.from(this.disputes.values()),
      deposits: Array.from(this.deposits.values()),
      expansionRequests: Array.from(this.expansionRequests.values())
    };
  }

  /**
   * Load from persistence
   */
  load(data: {
    zones?: TerritoryZone[];
    disputes?: TerritoryDispute[];
    deposits?: ResourceDeposit[];
    expansionRequests?: ExpansionRequest[];
  }): void {
    this.zones.clear();
    this.disputes.clear();
    this.deposits.clear();
    this.expansionRequests.clear();
    
    for (const zone of data.zones || []) {
      this.zones.set(zone.id, zone);
    }
    
    for (const dispute of data.disputes || []) {
      this.disputes.set(dispute.id, dispute);
    }
    
    for (const deposit of data.deposits || []) {
      this.deposits.set(deposit.id, deposit);
    }
    
    for (const request of data.expansionRequests || []) {
      this.expansionRequests.set(request.id, request);
    }
    
    logger.info('Territory data loaded');
  }
}

// Singleton
let territoryManagerInstance: TerritoryManager | null = null;

export function getTerritoryManager(): TerritoryManager {
  if (!territoryManagerInstance) {
    territoryManagerInstance = new TerritoryManager();
  }
  return territoryManagerInstance;
}

export function resetTerritoryManager(): void {
  territoryManagerInstance = null;
}

export default TerritoryManager;
