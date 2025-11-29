/**
 * BlockLife AI - Events System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Central event bus for system-wide communication.
 */

import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';

const logger = createLogger('events');

/**
 * Event types
 */
export enum EventType {
  // Bot events
  BOT_CREATED = 'BOT_CREATED',
  BOT_DIED = 'BOT_DIED',
  BOT_ROLE_CHANGED = 'BOT_ROLE_CHANGED',
  BOT_TASK_COMPLETED = 'BOT_TASK_COMPLETED',
  BOT_NEED_CRITICAL = 'BOT_NEED_CRITICAL',
  BOT_MOOD_CHANGED = 'BOT_MOOD_CHANGED',
  
  // Family events
  PARTNERSHIP_FORMED = 'PARTNERSHIP_FORMED',
  CHILD_BORN = 'CHILD_BORN',
  PARTNERSHIP_ENDED = 'PARTNERSHIP_ENDED',
  
  // Village events
  VILLAGE_FOUNDED = 'VILLAGE_FOUNDED',
  VILLAGE_DESTROYED = 'VILLAGE_DESTROYED',
  BUILDING_COMPLETED = 'BUILDING_COMPLETED',
  RESOURCE_SHORTAGE = 'RESOURCE_SHORTAGE',
  POPULATION_MILESTONE = 'POPULATION_MILESTONE',
  TECH_RESEARCHED = 'TECH_RESEARCHED',
  LAW_ENACTED = 'LAW_ENACTED',
  LEADER_ELECTED = 'LEADER_ELECTED',
  
  // Economic events
  TRADE_COMPLETED = 'TRADE_COMPLETED',
  MARKET_UPDATE = 'MARKET_UPDATE',
  ECONOMIC_CRISIS = 'ECONOMIC_CRISIS',
  
  // Warfare events
  WAR_DECLARED = 'WAR_DECLARED',
  BATTLE_FOUGHT = 'BATTLE_FOUGHT',
  WAR_ENDED = 'WAR_ENDED',
  RAID_OCCURRED = 'RAID_OCCURRED',
  ALLIANCE_FORMED = 'ALLIANCE_FORMED',
  
  // World events
  THREAT_DETECTED = 'THREAT_DETECTED',
  THREAT_CLEARED = 'THREAT_CLEARED',
  DISCOVERY_MADE = 'DISCOVERY_MADE',
  
  // System events
  SIMULATION_STARTED = 'SIMULATION_STARTED',
  SIMULATION_PAUSED = 'SIMULATION_PAUSED',
  SIMULATION_STOPPED = 'SIMULATION_STOPPED',
  STATE_SAVED = 'STATE_SAVED',
  STATE_LOADED = 'STATE_LOADED',
  PERFORMANCE_WARNING = 'PERFORMANCE_WARNING',
  
  // AI events
  AI_DECISION_MADE = 'AI_DECISION_MADE',
  AI_BATCH_PROCESSED = 'AI_BATCH_PROCESSED',
  AI_FALLBACK_USED = 'AI_FALLBACK_USED'
}

/**
 * Event data
 */
export interface GameEvent {
  id: string;
  type: EventType;
  timestamp: number;
  source: string;
  data: Record<string, unknown>;
  importance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Event listener callback
 */
export type EventListener = (event: GameEvent) => void;

/**
 * Event filter
 */
export interface EventFilter {
  types?: EventType[];
  sources?: string[];
  minImportance?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Event Bus - central pub/sub system
 */
export class EventBus {
  private listeners: Map<string, { filter: EventFilter; callback: EventListener }> = new Map();
  private eventHistory: GameEvent[] = [];
  private maxHistorySize: number = 1000;
  private enabled: boolean = true;

  constructor() {
    logger.debug('Event Bus initialized');
  }

  /**
   * Subscribe to events
   */
  subscribe(filter: EventFilter, callback: EventListener): string {
    const id = uuidv4();
    this.listeners.set(id, { filter, callback });
    logger.debug(`Subscriber registered: ${id}`);
    return id;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriberId: string): boolean {
    const result = this.listeners.delete(subscriberId);
    if (result) {
      logger.debug(`Subscriber removed: ${subscriberId}`);
    }
    return result;
  }

  /**
   * Emit an event
   */
  emit(type: EventType, source: string, data: Record<string, unknown>, importance: GameEvent['importance'] = 'MEDIUM'): GameEvent {
    const event: GameEvent = {
      id: uuidv4(),
      type,
      timestamp: Date.now(),
      source,
      data,
      importance
    };

    if (!this.enabled) {
      return event;
    }

    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Notify listeners
    for (const [, { filter, callback }] of this.listeners.entries()) {
      if (this.matchesFilter(event, filter)) {
        try {
          callback(event);
        } catch (error) {
          logger.error('Event listener error', error);
        }
      }
    }

    logger.debug(`Event emitted: ${type}`);
    return event;
  }

  /**
   * Check if event matches filter
   */
  private matchesFilter(event: GameEvent, filter: EventFilter): boolean {
    if (filter.types && !filter.types.includes(event.type)) {
      return false;
    }

    if (filter.sources && !filter.sources.includes(event.source)) {
      return false;
    }

    if (filter.minImportance) {
      const levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      const eventLevel = levels.indexOf(event.importance);
      const minLevel = levels.indexOf(filter.minImportance);
      if (eventLevel < minLevel) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get event history
   */
  getHistory(filter?: EventFilter, limit?: number): GameEvent[] {
    let events = [...this.eventHistory];
    
    if (filter) {
      events = events.filter(e => this.matchesFilter(e, filter));
    }
    
    if (limit) {
      events = events.slice(-limit);
    }
    
    return events;
  }

  /**
   * Get recent events of a type
   */
  getRecentByType(type: EventType, limit: number = 10): GameEvent[] {
    return this.eventHistory
      .filter(e => e.type === type)
      .slice(-limit);
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Enable/disable the event bus
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get listener count
   */
  getListenerCount(): number {
    return this.listeners.size;
  }

  /**
   * Get history size
   */
  getHistorySize(): number {
    return this.eventHistory.length;
  }
}

// Singleton instance
let eventBusInstance: EventBus | null = null;

/**
 * Get the event bus singleton
 */
export function getEventBus(): EventBus {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus();
  }
  return eventBusInstance;
}

/**
 * Reset event bus singleton
 */
export function resetEventBus(): void {
  eventBusInstance = null;
}

// Convenience functions for common events

/**
 * Emit a bot created event
 */
export function emitBotCreated(botId: string, botName: string, villageId: string): GameEvent {
  return getEventBus().emit(
    EventType.BOT_CREATED,
    'bot-manager',
    { botId, botName, villageId },
    'MEDIUM'
  );
}

/**
 * Emit a bot died event
 */
export function emitBotDied(botId: string, botName: string, cause: string): GameEvent {
  return getEventBus().emit(
    EventType.BOT_DIED,
    'bot-manager',
    { botId, botName, cause },
    'HIGH'
  );
}

/**
 * Emit a village founded event
 */
export function emitVillageFounded(villageId: string, villageName: string, founderIds: string[]): GameEvent {
  return getEventBus().emit(
    EventType.VILLAGE_FOUNDED,
    'sim-engine',
    { villageId, villageName, founderIds },
    'HIGH'
  );
}

/**
 * Emit a building completed event
 */
export function emitBuildingCompleted(villageId: string, buildingType: string, buildingName: string): GameEvent {
  return getEventBus().emit(
    EventType.BUILDING_COMPLETED,
    'village-manager',
    { villageId, buildingType, buildingName },
    'MEDIUM'
  );
}

/**
 * Emit a war declared event
 */
export function emitWarDeclared(attackerId: string, defenderId: string, cause: string): GameEvent {
  return getEventBus().emit(
    EventType.WAR_DECLARED,
    'warfare-manager',
    { attackerId, defenderId, cause },
    'CRITICAL'
  );
}

/**
 * Emit a battle fought event
 */
export function emitBattleFought(warId: string, result: string, casualties: number): GameEvent {
  return getEventBus().emit(
    EventType.BATTLE_FOUGHT,
    'warfare-manager',
    { warId, result, casualties },
    'HIGH'
  );
}

/**
 * Emit a tech researched event
 */
export function emitTechResearched(villageId: string, techId: string, techName: string): GameEvent {
  return getEventBus().emit(
    EventType.TECH_RESEARCHED,
    'tech-tree',
    { villageId, techId, techName },
    'HIGH'
  );
}

/**
 * Emit a child born event
 */
export function emitChildBorn(childId: string, parent1Id: string, parent2Id: string, villageId: string): GameEvent {
  return getEventBus().emit(
    EventType.CHILD_BORN,
    'family-manager',
    { childId, parent1Id, parent2Id, villageId },
    'MEDIUM'
  );
}

/**
 * Emit a performance warning event
 */
export function emitPerformanceWarning(metric: string, value: number, threshold: number): GameEvent {
  return getEventBus().emit(
    EventType.PERFORMANCE_WARNING,
    'performance-monitor',
    { metric, value, threshold },
    'HIGH'
  );
}

export default EventBus;
