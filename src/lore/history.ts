/**
 * BlockLife AI - History & Lore System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Tracks history and generates lore/legends from events.
 */

import { v4 as uuidv4 } from 'uuid';
import { HistoricalEvent, Legend, Myth, Bot, Village } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('lore');

/**
 * Event types for classification
 */
export enum EventCategory {
  BIRTH = 'BIRTH',
  DEATH = 'DEATH',
  MARRIAGE = 'MARRIAGE',
  BATTLE = 'BATTLE',
  DISCOVERY = 'DISCOVERY',
  FOUNDING = 'FOUNDING',
  LEADERSHIP = 'LEADERSHIP',
  DISASTER = 'DISASTER',
  ACHIEVEMENT = 'ACHIEVEMENT'
}

/**
 * Get category for an event type
 */
export function categorizeEvent(eventType: string): EventCategory {
  if (eventType.includes('BIRTH')) return EventCategory.BIRTH;
  if (eventType.includes('DEATH')) return EventCategory.DEATH;
  if (eventType.includes('MARRIAGE') || eventType.includes('PARTNER')) return EventCategory.MARRIAGE;
  if (eventType.includes('BATTLE') || eventType.includes('RAID') || eventType.includes('ATTACK')) return EventCategory.BATTLE;
  if (eventType.includes('DISCOVERY') || eventType.includes('TECH')) return EventCategory.DISCOVERY;
  if (eventType.includes('FOUND')) return EventCategory.FOUNDING;
  if (eventType.includes('LEADER') || eventType.includes('CHIEF')) return EventCategory.LEADERSHIP;
  if (eventType.includes('FAMINE') || eventType.includes('DISASTER')) return EventCategory.DISASTER;
  return EventCategory.ACHIEVEMENT;
}

/**
 * History Manager - tracks and processes historical events
 */
export class HistoryManager {
  private events: HistoricalEvent[] = [];
  private legends: Legend[] = [];
  private myths: Myth[] = [];
  private maxEvents: number = 1000;
  private legendThreshold: number = 80; // Significance required for legend creation

  constructor() {
    logger.debug('History Manager initialized');
  }

  /**
   * Add a new historical event
   */
  addEvent(event: Omit<HistoricalEvent, 'id'>): HistoricalEvent {
    const fullEvent: HistoricalEvent = {
      ...event,
      id: uuidv4()
    };

    this.events.push(fullEvent);

    // Trim old events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Check if this event warrants legend creation
    if (fullEvent.significance >= this.legendThreshold) {
      this.maybeCreateLegend(fullEvent);
    }

    return fullEvent;
  }

  /**
   * Get all events
   */
  getAllEvents(): HistoricalEvent[] {
    return [...this.events];
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number): HistoricalEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events by category
   */
  getEventsByCategory(category: EventCategory): HistoricalEvent[] {
    return this.events.filter(e => categorizeEvent(e.type) === category);
  }

  /**
   * Get events involving a specific bot
   */
  getEventsForBot(botId: string): HistoricalEvent[] {
    return this.events.filter(e => e.participants.includes(botId));
  }

  /**
   * Get events at a location
   */
  getEventsAtLocation(location: string): HistoricalEvent[] {
    return this.events.filter(e => e.location === location);
  }

  /**
   * Maybe create a legend from a significant event
   */
  private maybeCreateLegend(event: HistoricalEvent): void {
    const category = categorizeEvent(event.type);
    
    // Generate legend content based on category
    let title = '';
    let content = '';

    switch (category) {
      case EventCategory.BATTLE:
        title = this.generateBattleTitle(event);
        content = this.generateBattleContent(event);
        break;
      
      case EventCategory.DEATH:
        title = this.generateDeathTitle(event);
        content = this.generateDeathContent(event);
        break;
      
      case EventCategory.FOUNDING:
        title = this.generateFoundingTitle(event);
        content = this.generateFoundingContent(event);
        break;
      
      case EventCategory.DISCOVERY:
        title = this.generateDiscoveryTitle(event);
        content = this.generateDiscoveryContent(event);
        break;
      
      default:
        // Generic legend
        title = `The Event of ${event.location}`;
        content = event.description;
    }

    if (title && content) {
      const legend: Legend = {
        id: uuidv4(),
        title,
        content,
        createdAt: Date.now(),
        aboutEvents: [event.id],
        aboutBots: event.participants
      };

      this.legends.push(legend);
      logger.info(`Legend created: ${title}`);
    }
  }

  /**
   * Generate battle legend title
   */
  private generateBattleTitle(event: HistoricalEvent): string {
    const titles = [
      `The Battle of ${event.location}`,
      `The Defense of ${event.location}`,
      `The Night of Blood at ${event.location}`,
      `The Great Siege of ${event.location}`
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }

  /**
   * Generate battle legend content
   */
  private generateBattleContent(event: HistoricalEvent): string {
    const templates = [
      `When the darkness came to ${event.location}, brave souls stood against it. ${event.description} This day shall not be forgotten.`,
      `The blocks of ${event.location} still remember the clash of weapons. ${event.description} Songs are still sung of this battle.`,
      `It is said that ${event.location} was tested that fateful day. ${event.description} The survivors carry the memory.`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate death legend title
   */
  private generateDeathTitle(event: HistoricalEvent): string {
    return `The Passing of a Hero`;
  }

  /**
   * Generate death legend content
   */
  private generateDeathContent(event: HistoricalEvent): string {
    const templates = [
      `${event.description} Their spirit lives on in the blocks they touched and the lives they changed.`,
      `A great one left us. ${event.description} The village mourns but their legacy endures.`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate founding legend title
   */
  private generateFoundingTitle(event: HistoricalEvent): string {
    return `The Founding of ${event.location}`;
  }

  /**
   * Generate founding legend content
   */
  private generateFoundingContent(event: HistoricalEvent): string {
    return `In the beginning, there was nothing but wilderness and possibility. ${event.description} From that moment, a new light began to shine in the block world.`;
  }

  /**
   * Generate discovery legend title
   */
  private generateDiscoveryTitle(event: HistoricalEvent): string {
    return `The Discovery at ${event.location}`;
  }

  /**
   * Generate discovery legend content
   */
  private generateDiscoveryContent(event: HistoricalEvent): string {
    return `Knowledge was hard-won in those days. ${event.description} This wisdom would shape generations to come.`;
  }

  /**
   * Get all legends
   */
  getLegends(): Legend[] {
    return [...this.legends];
  }

  /**
   * Get legends about a specific bot
   */
  getLegendsAboutBot(botId: string): Legend[] {
    return this.legends.filter(l => l.aboutBots.includes(botId));
  }

  /**
   * Create a myth from accumulated history
   */
  createMythFromHistory(theme: string): Myth | null {
    const relevantEvents = this.events.filter(e => 
      e.description.toLowerCase().includes(theme.toLowerCase()) ||
      e.type.toLowerCase().includes(theme.toLowerCase())
    );

    if (relevantEvents.length < 3) {
      return null;
    }

    const myth: Myth = {
      id: uuidv4(),
      title: `The ${theme} Tales`,
      content: this.weaveEventIntoMyth(relevantEvents, theme),
      createdAt: Date.now(),
      spreadTo: []
    };

    this.myths.push(myth);
    return myth;
  }

  /**
   * Weave events into a myth narrative
   */
  private weaveEventIntoMyth(events: HistoricalEvent[], theme: string): string {
    const intro = `Long ago, when the blocks were young and the render distance reached to eternity, `;
    const body = events
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 3)
      .map(e => e.description)
      .join(' And then, ');
    const outro = ` And so it is remembered, and so it shall be told.`;
    
    return intro + body + outro;
  }

  /**
   * Get all myths
   */
  getMyths(): Myth[] {
    return [...this.myths];
  }

  /**
   * Generate a summary of history for a time period
   */
  generateHistorySummary(fromTime: number, toTime: number): string {
    const events = this.events.filter(e => 
      e.timestamp >= fromTime && e.timestamp <= toTime
    );

    if (events.length === 0) {
      return 'A time of quiet. Nothing of note occurred.';
    }

    const births = events.filter(e => categorizeEvent(e.type) === EventCategory.BIRTH).length;
    const deaths = events.filter(e => categorizeEvent(e.type) === EventCategory.DEATH).length;
    const battles = events.filter(e => categorizeEvent(e.type) === EventCategory.BATTLE).length;
    const discoveries = events.filter(e => categorizeEvent(e.type) === EventCategory.DISCOVERY).length;

    const parts: string[] = [];
    
    if (births > 0) parts.push(`${births} new souls joined the world`);
    if (deaths > 0) parts.push(`${deaths} departed`);
    if (battles > 0) parts.push(`${battles} battles were fought`);
    if (discoveries > 0) parts.push(`${discoveries} discoveries were made`);

    if (parts.length === 0) {
      return `${events.length} events occurred during this time.`;
    }

    return `During this era: ${parts.join(', ')}.`;
  }

  /**
   * Serialize for persistence
   */
  serialize(): {
    events: HistoricalEvent[];
    legends: Legend[];
    myths: Myth[];
  } {
    return {
      events: this.events,
      legends: this.legends,
      myths: this.myths
    };
  }

  /**
   * Load from persistence
   */
  load(data: {
    events: HistoricalEvent[];
    legends: Legend[];
    myths: Myth[];
  }): void {
    this.events = data.events || [];
    this.legends = data.legends || [];
    this.myths = data.myths || [];
  }
}

// Singleton instance
let historyManagerInstance: HistoryManager | null = null;

/**
 * Get the history manager singleton
 */
export function getHistoryManager(): HistoryManager {
  if (!historyManagerInstance) {
    historyManagerInstance = new HistoryManager();
  }
  return historyManagerInstance;
}

/**
 * Reset history manager
 */
export function resetHistoryManager(): void {
  historyManagerInstance = null;
}

export default HistoryManager;
