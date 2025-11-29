/**
 * BlockLife AI - Economy System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Handles trade, resources, and economic simulation.
 */

import { v4 as uuidv4 } from 'uuid';
import { ResourceStock, Village, Position } from '../types';
import { getVillageManager } from './villages';
import { createLogger } from '../utils/logger';

const logger = createLogger('economy');

/**
 * Trade offer between villages
 */
export interface TradeOffer {
  id: string;
  fromVillageId: string;
  toVillageId: string;
  offering: Partial<ResourceStock>;
  requesting: Partial<ResourceStock>;
  traderId: string;  // Bot making the trade
  createdAt: number;
  expiresAt: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'COMPLETED';
}

/**
 * Trade route between villages
 */
export interface TradeRoute {
  id: string;
  village1Id: string;
  village2Id: string;
  distance: number;
  safety: number;  // 0-100, affects success rate
  established: number;
  lastUsed: number;
  totalTrades: number;
}

/**
 * Market price for resources
 */
export interface MarketPrices {
  food: number;
  wood: number;
  stone: number;
  iron: number;
  gold: number;
  tools: number;
  weapons: number;
}

/**
 * Resource production stats
 */
export interface ProductionStats {
  villageId: string;
  period: 'HOUR' | 'DAY';
  produced: Partial<ResourceStock>;
  consumed: Partial<ResourceStock>;
  net: Partial<ResourceStock>;
}

// Base market prices (relative values)
const BASE_PRICES: MarketPrices = {
  food: 1,
  wood: 2,
  stone: 3,
  iron: 10,
  gold: 50,
  tools: 15,
  weapons: 25
};

/**
 * Economy Manager - handles all economic operations
 */
export class EconomyManager {
  private tradeOffers: Map<string, TradeOffer> = new Map();
  private tradeRoutes: Map<string, TradeRoute> = new Map();
  private marketPrices: MarketPrices = { ...BASE_PRICES };
  private productionHistory: Map<string, ProductionStats[]> = new Map();
  
  private readonly OFFER_EXPIRY_MS = 300000;  // 5 minutes
  private readonly PRICE_VOLATILITY = 0.2;  // 20% price variance
  private readonly MAX_HISTORY = 24;  // Keep 24 periods of history

  constructor() {
    logger.info('Economy Manager initialized');
  }

  /**
   * Create a trade offer
   */
  createTradeOffer(
    fromVillageId: string,
    toVillageId: string,
    offering: Partial<ResourceStock>,
    requesting: Partial<ResourceStock>,
    traderId: string
  ): TradeOffer | null {
    const villageManager = getVillageManager();
    const fromVillage = villageManager.getVillage(fromVillageId);
    const toVillage = villageManager.getVillage(toVillageId);
    
    if (!fromVillage || !toVillage) {
      logger.warn('Trade offer failed: village not found');
      return null;
    }
    
    // Verify village has resources to offer
    for (const [resource, amount] of Object.entries(offering)) {
      const available = fromVillage.stockpile[resource as keyof ResourceStock] || 0;
      if (available < (amount || 0)) {
        logger.debug(`Trade offer failed: insufficient ${resource}`);
        return null;
      }
    }
    
    // Check if trade route exists or create one
    this.ensureTradeRoute(fromVillageId, toVillageId);
    
    const offer: TradeOffer = {
      id: uuidv4(),
      fromVillageId,
      toVillageId,
      offering,
      requesting,
      traderId,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.OFFER_EXPIRY_MS,
      status: 'PENDING'
    };
    
    this.tradeOffers.set(offer.id, offer);
    logger.info(`Trade offer created: ${fromVillage.name} -> ${toVillage.name}`);
    
    return offer;
  }

  /**
   * Accept a trade offer
   */
  acceptTradeOffer(offerId: string): boolean {
    const offer = this.tradeOffers.get(offerId);
    if (!offer || offer.status !== 'PENDING') {
      return false;
    }
    
    if (Date.now() > offer.expiresAt) {
      offer.status = 'EXPIRED';
      return false;
    }
    
    const villageManager = getVillageManager();
    const fromVillage = villageManager.getVillage(offer.fromVillageId);
    const toVillage = villageManager.getVillage(offer.toVillageId);
    
    if (!fromVillage || !toVillage) {
      offer.status = 'REJECTED';
      return false;
    }
    
    // Verify both villages have resources
    for (const [resource, amount] of Object.entries(offer.offering)) {
      const available = fromVillage.stockpile[resource as keyof ResourceStock] || 0;
      if (available < (amount || 0)) {
        offer.status = 'REJECTED';
        return false;
      }
    }
    
    for (const [resource, amount] of Object.entries(offer.requesting)) {
      const available = toVillage.stockpile[resource as keyof ResourceStock] || 0;
      if (available < (amount || 0)) {
        offer.status = 'REJECTED';
        return false;
      }
    }
    
    // Execute trade
    for (const [resource, amount] of Object.entries(offer.offering)) {
      const key = resource as keyof ResourceStock;
      fromVillage.stockpile[key] -= (amount || 0);
      toVillage.stockpile[key] += (amount || 0);
    }
    
    for (const [resource, amount] of Object.entries(offer.requesting)) {
      const key = resource as keyof ResourceStock;
      toVillage.stockpile[key] -= (amount || 0);
      fromVillage.stockpile[key] += (amount || 0);
    }
    
    offer.status = 'COMPLETED';
    
    // Update trade route stats
    const routeKey = this.getRouteKey(offer.fromVillageId, offer.toVillageId);
    const route = this.tradeRoutes.get(routeKey);
    if (route) {
      route.lastUsed = Date.now();
      route.totalTrades++;
    }
    
    logger.info(`Trade completed: ${fromVillage.name} <-> ${toVillage.name}`);
    return true;
  }

  /**
   * Reject a trade offer
   */
  rejectTradeOffer(offerId: string): boolean {
    const offer = this.tradeOffers.get(offerId);
    if (!offer || offer.status !== 'PENDING') {
      return false;
    }
    
    offer.status = 'REJECTED';
    return true;
  }

  /**
   * Ensure a trade route exists between two villages
   */
  private ensureTradeRoute(village1Id: string, village2Id: string): TradeRoute {
    const routeKey = this.getRouteKey(village1Id, village2Id);
    
    let route = this.tradeRoutes.get(routeKey);
    if (route) {
      return route;
    }
    
    const villageManager = getVillageManager();
    const village1 = villageManager.getVillage(village1Id);
    const village2 = villageManager.getVillage(village2Id);
    
    if (!village1 || !village2) {
      throw new Error('Village not found for trade route');
    }
    
    // Calculate distance
    const distance = Math.sqrt(
      Math.pow(village1.centerPosition.x - village2.centerPosition.x, 2) +
      Math.pow(village1.centerPosition.z - village2.centerPosition.z, 2)
    );
    
    route = {
      id: uuidv4(),
      village1Id,
      village2Id,
      distance: Math.round(distance),
      safety: 70,  // Default safety
      established: Date.now(),
      lastUsed: Date.now(),
      totalTrades: 0
    };
    
    this.tradeRoutes.set(routeKey, route);
    logger.info(`Trade route established: ${village1.name} <-> ${village2.name}`);
    
    return route;
  }

  /**
   * Get consistent route key for two villages
   */
  private getRouteKey(village1Id: string, village2Id: string): string {
    return [village1Id, village2Id].sort().join('_');
  }

  /**
   * Calculate fair trade value
   */
  calculateTradeValue(resources: Partial<ResourceStock>): number {
    let total = 0;
    
    for (const [resource, amount] of Object.entries(resources)) {
      const price = this.marketPrices[resource as keyof MarketPrices] || 1;
      total += price * (amount || 0);
    }
    
    return total;
  }

  /**
   * Check if a trade is fair (within tolerance)
   */
  isFairTrade(offering: Partial<ResourceStock>, requesting: Partial<ResourceStock>, tolerance: number = 0.3): boolean {
    const offerValue = this.calculateTradeValue(offering);
    const requestValue = this.calculateTradeValue(requesting);
    
    if (offerValue === 0 || requestValue === 0) {
      return false;
    }
    
    const ratio = offerValue / requestValue;
    return ratio >= (1 - tolerance) && ratio <= (1 + tolerance);
  }

  /**
   * Update market prices based on supply/demand
   */
  updateMarketPrices(): void {
    const villageManager = getVillageManager();
    const villages = villageManager.getAllVillages();
    
    // Calculate total supply of each resource
    const totalSupply: Partial<ResourceStock> = {};
    for (const village of villages) {
      for (const [resource, amount] of Object.entries(village.stockpile)) {
        const key = resource as keyof ResourceStock;
        totalSupply[key] = (totalSupply[key] || 0) + amount;
      }
    }
    
    // Adjust prices based on scarcity
    for (const [resource, basePrice] of Object.entries(BASE_PRICES)) {
      const supply = totalSupply[resource as keyof ResourceStock] || 1;
      const villages_count = villages.length || 1;
      const avgSupply = supply / villages_count;
      
      // Lower supply = higher price
      const supplyFactor = Math.max(0.5, Math.min(2, 100 / (avgSupply + 10)));
      
      // Add some volatility
      const volatility = 1 + (Math.random() - 0.5) * this.PRICE_VOLATILITY;
      
      this.marketPrices[resource as keyof MarketPrices] = Math.round(basePrice * supplyFactor * volatility * 10) / 10;
    }
    
    logger.debug('Market prices updated');
  }

  /**
   * Get current market prices
   */
  getMarketPrices(): MarketPrices {
    return { ...this.marketPrices };
  }

  /**
   * Get pending trade offers for a village
   */
  getPendingOffers(villageId: string): TradeOffer[] {
    return Array.from(this.tradeOffers.values()).filter(
      offer => offer.status === 'PENDING' && 
        (offer.fromVillageId === villageId || offer.toVillageId === villageId)
    );
  }

  /**
   * Get trade routes for a village
   */
  getTradeRoutes(villageId: string): TradeRoute[] {
    return Array.from(this.tradeRoutes.values()).filter(
      route => route.village1Id === villageId || route.village2Id === villageId
    );
  }

  /**
   * Suggest a trade based on village needs
   */
  suggestTrade(villageId: string): { offering: Partial<ResourceStock>; requesting: Partial<ResourceStock> } | null {
    const villageManager = getVillageManager();
    const village = villageManager.getVillage(villageId);
    
    if (!village) return null;
    
    const stock = village.stockpile;
    const offering: Partial<ResourceStock> = {};
    const requesting: Partial<ResourceStock> = {};
    
    // Find surplus (offer what we have lots of)
    if (stock.food > 200) offering.food = Math.floor(stock.food * 0.2);
    if (stock.wood > 100) offering.wood = Math.floor(stock.wood * 0.2);
    if (stock.stone > 80) offering.stone = Math.floor(stock.stone * 0.2);
    
    // Find deficits (request what we need)
    if (stock.food < 50) requesting.food = 30;
    if (stock.wood < 20) requesting.wood = 20;
    if (stock.stone < 10) requesting.stone = 15;
    if (stock.iron < 5) requesting.iron = 5;
    
    if (Object.keys(offering).length === 0 || Object.keys(requesting).length === 0) {
      return null;
    }
    
    return { offering, requesting };
  }

  /**
   * Calculate village wealth
   */
  calculateWealth(villageId: string): number {
    const villageManager = getVillageManager();
    const village = villageManager.getVillage(villageId);
    
    if (!village) return 0;
    
    return this.calculateTradeValue(village.stockpile);
  }

  /**
   * Record production stats
   */
  recordProduction(villageId: string, produced: Partial<ResourceStock>, consumed: Partial<ResourceStock>): void {
    const net: Partial<ResourceStock> = {};
    
    const allResources = new Set([...Object.keys(produced), ...Object.keys(consumed)]);
    for (const resource of allResources) {
      const key = resource as keyof ResourceStock;
      net[key] = (produced[key] || 0) - (consumed[key] || 0);
    }
    
    const stats: ProductionStats = {
      villageId,
      period: 'HOUR',
      produced,
      consumed,
      net
    };
    
    const history = this.productionHistory.get(villageId) || [];
    history.push(stats);
    
    if (history.length > this.MAX_HISTORY) {
      history.shift();
    }
    
    this.productionHistory.set(villageId, history);
  }

  /**
   * Get production history
   */
  getProductionHistory(villageId: string): ProductionStats[] {
    return this.productionHistory.get(villageId) || [];
  }

  /**
   * Clean up expired offers
   */
  cleanupExpiredOffers(): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, offer] of this.tradeOffers.entries()) {
      if (offer.status === 'PENDING' && now > offer.expiresAt) {
        offer.status = 'EXPIRED';
        cleaned++;
      }
    }
    
    return cleaned;
  }

  /**
   * Serialize for persistence
   */
  serialize(): {
    tradeOffers: TradeOffer[];
    tradeRoutes: TradeRoute[];
    marketPrices: MarketPrices;
  } {
    return {
      tradeOffers: Array.from(this.tradeOffers.values()),
      tradeRoutes: Array.from(this.tradeRoutes.values()),
      marketPrices: this.marketPrices
    };
  }

  /**
   * Load from persistence
   */
  load(data: {
    tradeOffers?: TradeOffer[];
    tradeRoutes?: TradeRoute[];
    marketPrices?: MarketPrices;
  }): void {
    this.tradeOffers.clear();
    this.tradeRoutes.clear();
    
    for (const offer of data.tradeOffers || []) {
      this.tradeOffers.set(offer.id, offer);
    }
    
    for (const route of data.tradeRoutes || []) {
      const key = this.getRouteKey(route.village1Id, route.village2Id);
      this.tradeRoutes.set(key, route);
    }
    
    if (data.marketPrices) {
      this.marketPrices = data.marketPrices;
    }
    
    logger.info(`Loaded ${this.tradeOffers.size} offers, ${this.tradeRoutes.size} routes`);
  }
}

// Singleton
let economyManagerInstance: EconomyManager | null = null;

export function getEconomyManager(): EconomyManager {
  if (!economyManagerInstance) {
    economyManagerInstance = new EconomyManager();
  }
  return economyManagerInstance;
}

export function resetEconomyManager(): void {
  economyManagerInstance = null;
}

export default EconomyManager;
