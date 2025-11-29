/**
 * BlockLife AI - Trade Caravans System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Manages inter-village trade through caravan routes, merchants,
 * and economic exchanges.
 */

import { v4 as uuidv4 } from 'uuid';
import { Position, Village, ResourceStock } from '../types';
import { getVillageManager } from './villages';
import { getWarfareManager } from './warfare';
import { getBotManager } from '../bots/bot-manager';
import { createLogger } from '../utils/logger';

const logger = createLogger('trade');

/**
 * Trade route between two villages
 */
export interface TradeRoute {
  id: string;
  village1Id: string;
  village2Id: string;
  
  // Route details
  waypoints: Position[];
  distance: number;            // Total distance in blocks
  travelTime: number;          // Estimated ticks
  
  // Route status
  safety: number;              // 0-100, based on threats along route
  popularity: number;          // 0-100, how much it's used
  infrastructure: number;      // 0-100, roads/bridges built
  
  // Statistics
  totalCaravans: number;
  successfulCaravans: number;
  lastUsed?: number;
  
  // Status
  status: 'ACTIVE' | 'SUSPENDED' | 'DANGEROUS' | 'CLOSED';
  establishedAt: number;
}

/**
 * Trade caravan traveling between villages
 */
export interface Caravan {
  id: string;
  routeId: string;
  
  // Origin and destination
  originVillageId: string;
  destinationVillageId: string;
  
  // Personnel
  merchantIds: string[];       // Bot IDs in caravan
  leadMerchantId: string;
  guardIds: string[];          // Guard bot IDs
  
  // Cargo
  cargo: Partial<ResourceStock>;
  cargoValue: number;
  
  // Trade details
  tradeOffer: TradeOffer;
  
  // Journey
  currentPosition: Position;
  currentWaypointIndex: number;
  progress: number;            // 0-100 along route
  
  // Status
  status: 'PREPARING' | 'TRAVELING' | 'TRADING' | 'RETURNING' | 'COMPLETED' | 'FAILED' | 'ATTACKED';
  departedAt?: number;
  arrivedAt?: number;
  returnedAt?: number;
  
  // Events during journey
  journeyEvents: CaravanEvent[];
}

/**
 * Trade offer for negotiation
 */
export interface TradeOffer {
  id: string;
  offering: Partial<ResourceStock>;
  requesting: Partial<ResourceStock>;
  offeredValue: number;
  requestedValue: number;
  flexibility: number;         // 0-100, willingness to negotiate
}

/**
 * Event during caravan journey
 */
export interface CaravanEvent {
  timestamp: number;
  type: 'DEPARTED' | 'WAYPOINT_REACHED' | 'ATTACKED' | 'DEFENDED' | 'RESTED' | 'ARRIVED' | 'TRADE_COMPLETED' | 'TRADE_FAILED';
  description: string;
  position?: Position;
  casualties?: number;
  cargoLost?: Partial<ResourceStock>;
}

/**
 * Trade agreement between villages
 */
export interface TradeAgreement {
  id: string;
  village1Id: string;
  village2Id: string;
  
  // Terms
  village1Exports: Partial<ResourceStock>;  // Per caravan
  village2Exports: Partial<ResourceStock>;
  frequency: number;           // Caravans per day
  
  // Duration
  startedAt: number;
  expiresAt?: number;
  
  // Status
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'TERMINATED';
  
  // Performance
  successfulTrades: number;
  failedTrades: number;
  totalValue: number;
}

/**
 * Market price for resources
 */
export interface MarketPrice {
  resource: keyof ResourceStock;
  baseValue: number;
  currentValue: number;
  supplyFactor: number;        // Lower supply = higher price
  demandFactor: number;        // Higher demand = higher price
  trend: 'RISING' | 'STABLE' | 'FALLING';
  lastUpdated: number;
}

/**
 * Trade Caravans Manager
 */
export class TradeCaravanManager {
  private routes: Map<string, TradeRoute> = new Map();
  private caravans: Map<string, Caravan> = new Map();
  private agreements: Map<string, TradeAgreement> = new Map();
  private marketPrices: Map<string, MarketPrice> = new Map();
  
  // Configuration
  private readonly MIN_MERCHANTS_PER_CARAVAN = 1;
  private readonly MAX_MERCHANTS_PER_CARAVAN = 3;
  private readonly GUARD_PER_VALUE = 50;  // 1 guard per 50 value
  private readonly BASE_TRAVEL_SPEED = 2;  // Blocks per tick
  private readonly ROUTE_SAFETY_THRESHOLD = 30;  // Below this, route is dangerous
  private readonly ATTACK_CHANCE_DIVISOR = 10000;  // Per-tick attack chance scaling (higher = rarer attacks)
  
  // Base resource values
  private readonly BASE_VALUES: Record<keyof ResourceStock, number> = {
    food: 1,
    wood: 2,
    stone: 3,
    iron: 10,
    gold: 25,
    tools: 15,
    weapons: 20
  };
  
  constructor() {
    this.initializeMarketPrices();
    logger.info('Trade Caravan Manager initialized');
  }

  /**
   * Initialize market prices
   */
  private initializeMarketPrices(): void {
    for (const [resource, baseValue] of Object.entries(this.BASE_VALUES)) {
      this.marketPrices.set(resource, {
        resource: resource as keyof ResourceStock,
        baseValue,
        currentValue: baseValue,
        supplyFactor: 1.0,
        demandFactor: 1.0,
        trend: 'STABLE',
        lastUpdated: Date.now()
      });
    }
  }

  /**
   * Establish a trade route between two villages
   */
  establishRoute(village1Id: string, village2Id: string): TradeRoute | null {
    const villageManager = getVillageManager();
    const village1 = villageManager.getVillage(village1Id);
    const village2 = villageManager.getVillage(village2Id);
    
    if (!village1 || !village2) return null;
    
    // Check relations (must not be hostile)
    const warfareManager = getWarfareManager();
    const relationState = warfareManager.getRelationState(village1Id, village2Id);
    if (relationState === 'HOSTILE') {
      logger.warn('Cannot establish trade route with hostile village');
      return null;
    }
    
    // Calculate route
    const waypoints = this.calculateWaypoints(village1.centerPosition, village2.centerPosition);
    const distance = this.calculateDistance(waypoints);
    
    const route: TradeRoute = {
      id: uuidv4(),
      village1Id,
      village2Id,
      
      waypoints,
      distance,
      travelTime: Math.ceil(distance / this.BASE_TRAVEL_SPEED),
      
      safety: this.assessRouteSafety(waypoints),
      popularity: 0,
      infrastructure: 0,
      
      totalCaravans: 0,
      successfulCaravans: 0,
      
      status: 'ACTIVE',
      establishedAt: Date.now()
    };
    
    this.routes.set(route.id, route);
    
    logger.info(`Trade route established: ${village1.name} <-> ${village2.name} (${distance} blocks)`);
    
    return route;
  }

  /**
   * Calculate waypoints between two positions
   */
  private calculateWaypoints(start: Position, end: Position): Position[] {
    const waypoints: Position[] = [{ ...start }];
    
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Add intermediate waypoints every 50 blocks
    const numWaypoints = Math.floor(distance / 50);
    
    for (let i = 1; i <= numWaypoints; i++) {
      const t = i / (numWaypoints + 1);
      waypoints.push({
        x: Math.round(start.x + dx * t),
        y: Math.round((start.y + end.y) / 2),  // Average height
        z: Math.round(start.z + dz * t)
      });
    }
    
    waypoints.push({ ...end });
    
    return waypoints;
  }

  /**
   * Calculate total distance of waypoints
   */
  private calculateDistance(waypoints: Position[]): number {
    let total = 0;
    
    for (let i = 1; i < waypoints.length; i++) {
      const dx = waypoints[i].x - waypoints[i - 1].x;
      const dy = waypoints[i].y - waypoints[i - 1].y;
      const dz = waypoints[i].z - waypoints[i - 1].z;
      total += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    return Math.round(total);
  }

  /**
   * Assess route safety
   */
  private assessRouteSafety(waypoints: Position[]): number {
    // Base safety starts at 80
    let safety = 80;
    
    // Longer routes are less safe
    const distance = this.calculateDistance(waypoints);
    safety -= Math.floor(distance / 50) * 5;
    
    // Random variation for different terrain types (simplified)
    safety += (Math.random() - 0.5) * 20;
    
    return Math.max(10, Math.min(100, safety));
  }

  /**
   * Create and dispatch a caravan
   */
  dispatchCaravan(
    routeId: string,
    originVillageId: string,
    cargo: Partial<ResourceStock>,
    tradeOffer: Omit<TradeOffer, 'id'>
  ): Caravan | null {
    const route = this.routes.get(routeId);
    if (!route || route.status !== 'ACTIVE') {
      return null;
    }
    
    // Validate origin is on route
    if (route.village1Id !== originVillageId && route.village2Id !== originVillageId) {
      return null;
    }
    
    const destinationVillageId = route.village1Id === originVillageId 
      ? route.village2Id 
      : route.village1Id;
    
    // Calculate cargo value
    const cargoValue = this.calculateCargoValue(cargo);
    
    // Select merchants
    const merchants = this.selectMerchants(originVillageId, cargoValue);
    if (merchants.length < this.MIN_MERCHANTS_PER_CARAVAN) {
      logger.warn('Not enough merchants available');
      return null;
    }
    
    // Select guards based on value and route safety
    const requiredGuards = Math.ceil(cargoValue / this.GUARD_PER_VALUE);
    const adjustedGuards = Math.ceil(requiredGuards * (1 + (100 - route.safety) / 100));
    const guards = this.selectGuards(originVillageId, adjustedGuards);
    
    // Determine start position and waypoints order
    const originPos = route.village1Id === originVillageId 
      ? route.waypoints[0] 
      : route.waypoints[route.waypoints.length - 1];
    
    const caravan: Caravan = {
      id: uuidv4(),
      routeId,
      originVillageId,
      destinationVillageId,
      
      merchantIds: merchants,
      leadMerchantId: merchants[0],
      guardIds: guards,
      
      cargo,
      cargoValue,
      
      tradeOffer: {
        id: uuidv4(),
        ...tradeOffer,
        offeredValue: this.calculateCargoValue(tradeOffer.offering),
        requestedValue: this.calculateCargoValue(tradeOffer.requesting)
      },
      
      currentPosition: { ...originPos },
      currentWaypointIndex: 0,
      progress: 0,
      
      status: 'PREPARING',
      journeyEvents: []
    };
    
    this.caravans.set(caravan.id, caravan);
    
    // Deduct cargo from origin village
    const villageManager = getVillageManager();
    const originVillage = villageManager.getVillage(originVillageId);
    if (originVillage) {
      for (const [resource, amount] of Object.entries(cargo)) {
        const key = resource as keyof ResourceStock;
        originVillage.stockpile[key] -= (amount || 0);
      }
    }
    
    logger.info(`Caravan dispatched from ${originVillageId} to ${destinationVillageId}`);
    
    return caravan;
  }

  /**
   * Start a caravan journey
   */
  startJourney(caravanId: string): boolean {
    const caravan = this.caravans.get(caravanId);
    if (!caravan || caravan.status !== 'PREPARING') {
      return false;
    }
    
    caravan.status = 'TRAVELING';
    caravan.departedAt = Date.now();
    
    caravan.journeyEvents.push({
      timestamp: Date.now(),
      type: 'DEPARTED',
      description: 'Caravan departed for destination',
      position: { ...caravan.currentPosition }
    });
    
    return true;
  }

  /**
   * Update caravan positions (called each tick)
   */
  updateCaravans(deltaMs: number): void {
    for (const caravan of this.caravans.values()) {
      if (caravan.status !== 'TRAVELING' && caravan.status !== 'RETURNING') {
        continue;
      }
      
      const route = this.routes.get(caravan.routeId);
      if (!route) continue;
      
      // Calculate movement
      const tickMultiplier = deltaMs / 1000;
      const movement = this.BASE_TRAVEL_SPEED * tickMultiplier;
      
      // Move along waypoints
      this.moveCaravanAlongRoute(caravan, route, movement);
      
      // Check for random events
      this.checkCaravanEvents(caravan, route);
      
      // Check if arrived
      if (caravan.status === 'TRAVELING' && caravan.progress >= 100) {
        this.handleCaravanArrival(caravan);
      } else if (caravan.status === 'RETURNING' && caravan.progress <= 0) {
        this.handleCaravanReturn(caravan);
      }
    }
  }

  /**
   * Move caravan along route
   */
  private moveCaravanAlongRoute(caravan: Caravan, route: TradeRoute, distance: number): void {
    const waypoints = caravan.status === 'RETURNING' 
      ? [...route.waypoints].reverse() 
      : route.waypoints;
    
    // Progress is percentage of route
    const progressIncrement = (distance / route.distance) * 100;
    
    if (caravan.status === 'TRAVELING') {
      caravan.progress = Math.min(100, caravan.progress + progressIncrement);
    } else {
      caravan.progress = Math.max(0, caravan.progress - progressIncrement);
    }
    
    // Update position based on progress
    const routeProgress = caravan.status === 'TRAVELING' ? caravan.progress : (100 - caravan.progress);
    const waypointIndex = Math.floor((routeProgress / 100) * (waypoints.length - 1));
    
    if (waypointIndex < waypoints.length) {
      caravan.currentPosition = { ...waypoints[waypointIndex] };
      
      if (caravan.currentWaypointIndex !== waypointIndex && waypointIndex > 0) {
        caravan.currentWaypointIndex = waypointIndex;
        caravan.journeyEvents.push({
          timestamp: Date.now(),
          type: 'WAYPOINT_REACHED',
          description: `Reached waypoint ${waypointIndex}`,
          position: { ...caravan.currentPosition }
        });
      }
    }
  }

  /**
   * Check for random events during journey
   */
  private checkCaravanEvents(caravan: Caravan, route: TradeRoute): void {
    // Random attack based on route safety
    // Attack chance scales with danger: 0% at safety=100, ~1% per tick at safety=0
    const attackChance = (100 - route.safety) / this.ATTACK_CHANCE_DIVISOR;
    
    if (Math.random() < attackChance) {
      this.handleCaravanAttack(caravan, route);
    }
  }

  /**
   * Handle caravan attack
   */
  private handleCaravanAttack(caravan: Caravan, route: TradeRoute): void {
    const guardStrength = caravan.guardIds.length * 20;  // Base strength per guard
    const attackStrength = Math.floor(Math.random() * 50) + 20;  // Random threat
    
    if (guardStrength >= attackStrength) {
      // Defended successfully
      const casualties = Math.floor(Math.random() * 2);
      
      caravan.journeyEvents.push({
        timestamp: Date.now(),
        type: 'DEFENDED',
        description: `Fought off attackers with ${casualties} casualty(ies)`,
        position: { ...caravan.currentPosition },
        casualties
      });
      
      // Remove casualties from guards
      if (casualties > 0) {
        caravan.guardIds = caravan.guardIds.slice(0, -casualties);
      }
    } else {
      // Attack succeeded - lose some cargo
      const lossPercent = Math.min(0.5, (attackStrength - guardStrength) / 100);
      const cargoLost: Partial<ResourceStock> = {};
      
      for (const [resource, amount] of Object.entries(caravan.cargo)) {
        const key = resource as keyof ResourceStock;
        const lost = Math.floor((amount || 0) * lossPercent);
        cargoLost[key] = lost;
        caravan.cargo[key] = (caravan.cargo[key] || 0) - lost;
      }
      
      caravan.status = 'ATTACKED';
      
      caravan.journeyEvents.push({
        timestamp: Date.now(),
        type: 'ATTACKED',
        description: `Ambushed! Lost ${Math.round(lossPercent * 100)}% of cargo`,
        position: { ...caravan.currentPosition },
        cargoLost
      });
      
      // Continue after attack (reduced cargo)
      caravan.status = 'TRAVELING';
      
      // Decrease route safety
      route.safety = Math.max(10, route.safety - 5);
    }
  }

  /**
   * Handle caravan arrival at destination
   */
  private handleCaravanArrival(caravan: Caravan): void {
    caravan.status = 'TRADING';
    caravan.arrivedAt = Date.now();
    
    caravan.journeyEvents.push({
      timestamp: Date.now(),
      type: 'ARRIVED',
      description: 'Arrived at destination',
      position: { ...caravan.currentPosition }
    });
    
    // Execute trade
    const success = this.executeTrade(caravan);
    
    if (success) {
      caravan.journeyEvents.push({
        timestamp: Date.now(),
        type: 'TRADE_COMPLETED',
        description: 'Trade completed successfully'
      });
      
      caravan.status = 'RETURNING';
    } else {
      caravan.journeyEvents.push({
        timestamp: Date.now(),
        type: 'TRADE_FAILED',
        description: 'Trade negotiation failed'
      });
      
      caravan.status = 'RETURNING';
    }
  }

  /**
   * Execute trade at destination
   */
  private executeTrade(caravan: Caravan): boolean {
    const villageManager = getVillageManager();
    const destVillage = villageManager.getVillage(caravan.destinationVillageId);
    
    if (!destVillage) return false;
    
    const offer = caravan.tradeOffer;
    
    // Check if destination can fulfill the trade
    let canFulfill = true;
    for (const [resource, amount] of Object.entries(offer.requesting)) {
      const key = resource as keyof ResourceStock;
      if (destVillage.stockpile[key] < (amount || 0)) {
        canFulfill = false;
        break;
      }
    }
    
    // Check if trade is fair (with flexibility)
    const valueRatio = offer.offeredValue / Math.max(1, offer.requestedValue);
    const acceptable = valueRatio >= (1 - offer.flexibility / 100);
    
    if (!canFulfill || !acceptable) {
      // Return cargo to caravan (it will go back)
      return false;
    }
    
    // Execute exchange
    // Give cargo to destination
    for (const [resource, amount] of Object.entries(caravan.cargo)) {
      const key = resource as keyof ResourceStock;
      destVillage.stockpile[key] += (amount || 0);
    }
    
    // Take requested goods
    caravan.cargo = {};
    for (const [resource, amount] of Object.entries(offer.requesting)) {
      const key = resource as keyof ResourceStock;
      destVillage.stockpile[key] -= (amount || 0);
      caravan.cargo[key] = amount;
    }
    
    caravan.cargoValue = this.calculateCargoValue(caravan.cargo);
    
    // Update route statistics
    const route = this.routes.get(caravan.routeId);
    if (route) {
      route.totalCaravans++;
      route.successfulCaravans++;
      route.lastUsed = Date.now();
      route.popularity = Math.min(100, route.popularity + 5);
    }
    
    return true;
  }

  /**
   * Handle caravan return to origin
   */
  private handleCaravanReturn(caravan: Caravan): void {
    caravan.status = 'COMPLETED';
    caravan.returnedAt = Date.now();
    
    // Deliver return cargo to origin village
    const villageManager = getVillageManager();
    const originVillage = villageManager.getVillage(caravan.originVillageId);
    
    if (originVillage) {
      for (const [resource, amount] of Object.entries(caravan.cargo)) {
        const key = resource as keyof ResourceStock;
        originVillage.stockpile[key] += (amount || 0);
      }
    }
    
    // Return merchants and guards to village
    // (They would be marked as available again)
    
    logger.info(`Caravan ${caravan.id} completed round trip`);
  }

  /**
   * Calculate value of cargo
   */
  calculateCargoValue(cargo: Partial<ResourceStock>): number {
    let value = 0;
    
    for (const [resource, amount] of Object.entries(cargo)) {
      const price = this.marketPrices.get(resource);
      if (price && amount) {
        value += price.currentValue * amount;
      }
    }
    
    return value;
  }

  /**
   * Select merchants from village
   */
  private selectMerchants(villageId: string, cargoValue: number): string[] {
    const botManager = getBotManager();
    const villageManager = getVillageManager();
    const village = villageManager.getVillage(villageId);
    
    if (!village) return [];
    
    const merchants: string[] = [];
    const needed = Math.min(
      this.MAX_MERCHANTS_PER_CARAVAN,
      Math.max(this.MIN_MERCHANTS_PER_CARAVAN, Math.ceil(cargoValue / 100))
    );
    
    // Find bots with trading skill
    const candidates = village.memberIds
      .map(id => botManager.getBot(id))
      .filter(bot => {
        if (!bot) return false;
        const data = bot.getData();
        return data.skills.trading > 30 && !data.flags.isDead;
      })
      .sort((a, b) => {
        if (!a || !b) return 0;
        return b.getData().skills.trading - a.getData().skills.trading;
      });
    
    for (let i = 0; i < needed && i < candidates.length; i++) {
      const candidate = candidates[i];
      if (candidate) {
        merchants.push(candidate.id);
      }
    }
    
    return merchants;
  }

  /**
   * Select guards from village
   */
  private selectGuards(villageId: string, needed: number): string[] {
    const botManager = getBotManager();
    const villageManager = getVillageManager();
    const village = villageManager.getVillage(villageId);
    
    if (!village) return [];
    
    const guards: string[] = [];
    
    // Find bots with combat skill
    const candidates = village.memberIds
      .map(id => botManager.getBot(id))
      .filter(bot => {
        if (!bot) return false;
        const data = bot.getData();
        return data.skills.combat > 30 && !data.flags.isDead;
      })
      .sort((a, b) => {
        if (!a || !b) return 0;
        return b.getData().skills.combat - a.getData().skills.combat;
      });
    
    for (let i = 0; i < needed && i < candidates.length; i++) {
      const candidate = candidates[i];
      if (candidate) {
        guards.push(candidate.id);
      }
    }
    
    return guards;
  }

  /**
   * Create a trade agreement
   */
  createAgreement(
    village1Id: string,
    village2Id: string,
    village1Exports: Partial<ResourceStock>,
    village2Exports: Partial<ResourceStock>,
    frequency: number = 1,
    durationMs?: number
  ): TradeAgreement {
    const agreement: TradeAgreement = {
      id: uuidv4(),
      village1Id,
      village2Id,
      village1Exports,
      village2Exports,
      frequency,
      startedAt: Date.now(),
      expiresAt: durationMs ? Date.now() + durationMs : undefined,
      status: 'ACTIVE',
      successfulTrades: 0,
      failedTrades: 0,
      totalValue: 0
    };
    
    this.agreements.set(agreement.id, agreement);
    
    logger.info(`Trade agreement created between ${village1Id} and ${village2Id}`);
    
    return agreement;
  }

  /**
   * Update market prices based on supply/demand
   */
  updateMarketPrices(): void {
    for (const price of this.marketPrices.values()) {
      // Random market fluctuation
      const fluctuation = (Math.random() - 0.5) * 0.1;
      price.supplyFactor += fluctuation;
      price.supplyFactor = Math.max(0.5, Math.min(2.0, price.supplyFactor));
      
      // Recalculate current value
      const newValue = price.baseValue * price.supplyFactor * price.demandFactor;
      
      // Determine trend
      if (newValue > price.currentValue * 1.05) {
        price.trend = 'RISING';
      } else if (newValue < price.currentValue * 0.95) {
        price.trend = 'FALLING';
      } else {
        price.trend = 'STABLE';
      }
      
      price.currentValue = newValue;
      price.lastUpdated = Date.now();
    }
  }

  /**
   * Get available routes from a village
   */
  getRoutesFromVillage(villageId: string): TradeRoute[] {
    return Array.from(this.routes.values()).filter(
      r => r.status === 'ACTIVE' && (r.village1Id === villageId || r.village2Id === villageId)
    );
  }

  /**
   * Get active caravans
   */
  getActiveCaravans(): Caravan[] {
    return Array.from(this.caravans.values()).filter(
      c => c.status === 'TRAVELING' || c.status === 'TRADING' || c.status === 'RETURNING'
    );
  }

  /**
   * Get market price for a resource
   */
  getMarketPrice(resource: keyof ResourceStock): MarketPrice | undefined {
    return this.marketPrices.get(resource);
  }

  /**
   * Serialize for persistence
   */
  serialize(): {
    routes: TradeRoute[];
    caravans: Caravan[];
    agreements: TradeAgreement[];
    marketPrices: MarketPrice[];
  } {
    return {
      routes: Array.from(this.routes.values()),
      caravans: Array.from(this.caravans.values()),
      agreements: Array.from(this.agreements.values()),
      marketPrices: Array.from(this.marketPrices.values())
    };
  }

  /**
   * Load from persistence
   */
  load(data: {
    routes?: TradeRoute[];
    caravans?: Caravan[];
    agreements?: TradeAgreement[];
    marketPrices?: MarketPrice[];
  }): void {
    this.routes.clear();
    this.caravans.clear();
    this.agreements.clear();
    this.marketPrices.clear();
    
    for (const route of data.routes || []) {
      this.routes.set(route.id, route);
    }
    
    for (const caravan of data.caravans || []) {
      this.caravans.set(caravan.id, caravan);
    }
    
    for (const agreement of data.agreements || []) {
      this.agreements.set(agreement.id, agreement);
    }
    
    for (const price of data.marketPrices || []) {
      this.marketPrices.set(price.resource, price);
    }
    
    logger.info('Trade caravan data loaded');
  }
}

// Singleton
let tradeManagerInstance: TradeCaravanManager | null = null;

export function getTradeManager(): TradeCaravanManager {
  if (!tradeManagerInstance) {
    tradeManagerInstance = new TradeCaravanManager();
  }
  return tradeManagerInstance;
}

export function resetTradeManager(): void {
  tradeManagerInstance = null;
}

export default TradeCaravanManager;
