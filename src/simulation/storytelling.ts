/**
 * BlockLife AI - Event-Driven Storytelling System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Generates rich narratives from simulation events, creating
 * compelling stories about bot lives, village history, and epic moments.
 */

import { v4 as uuidv4 } from 'uuid';
import { Bot, Village, Mood, Role, LifeStage } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('storytelling');

/**
 * Story types for different narrative focuses
 */
export enum StoryType {
  BIOGRAPHY = 'BIOGRAPHY',           // Individual bot's life story
  ROMANCE = 'ROMANCE',               // Love stories
  TRAGEDY = 'TRAGEDY',               // Loss and grief
  TRIUMPH = 'TRIUMPH',               // Victories and achievements
  CONFLICT = 'CONFLICT',             // Wars and disputes
  DISCOVERY = 'DISCOVERY',           // Exploration and learning
  FOUNDING = 'FOUNDING',             // Village creation
  LEGACY = 'LEGACY',                 // Family histories
  MYSTERY = 'MYSTERY',               // Unexplained events
  EVERYDAY = 'EVERYDAY'              // Slice of life moments
}

/**
 * Narrative beat - a single moment in a story
 */
export interface NarrativeBeat {
  id: string;
  timestamp: number;
  type: 'EXPOSITION' | 'RISING_ACTION' | 'CLIMAX' | 'FALLING_ACTION' | 'RESOLUTION';
  content: string;
  emotionalTone: number;             // -100 to 100
  participants: string[];
  location?: string;
}

/**
 * Complete story with narrative structure
 */
export interface Story {
  id: string;
  title: string;
  type: StoryType;
  beats: NarrativeBeat[];
  protagonists: string[];            // Bot IDs
  antagonists?: string[];            // Bot IDs if any
  setting: string;
  themes: string[];
  significance: number;              // 0-100, how important
  createdAt: number;
  completedAt?: number;
  isComplete: boolean;
}

/**
 * Chronicle entry for historical records
 */
export interface ChronicleEntry {
  id: string;
  era: string;
  year: number;
  summary: string;
  keyEvents: string[];
  keyFigures: string[];
  mood: 'GOLDEN' | 'DARK' | 'PEACEFUL' | 'TURBULENT' | 'STAGNANT';
}

/**
 * Legend - mythologized version of events
 */
export interface Legend {
  id: string;
  title: string;
  originalEventId?: string;
  content: string;
  moralLesson?: string;
  toldBy: string[];                  // Bot IDs who tell this legend
  variations: string[];
  believedTrue: number;              // 0-100, how much bots believe it
  createdAt: number;
}

/**
 * Prophecy - hints at future events
 */
export interface Prophecy {
  id: string;
  prophet: string;                   // Bot ID
  content: string;
  interpretation?: string;
  fulfilled: boolean;
  fulfilledAt?: number;
  fulfilledBy?: string;
  createdAt: number;
}

// Story templates for generation
const STORY_TEMPLATES = {
  [StoryType.BIOGRAPHY]: [
    '{name} was born in {village} during the {era}. From an early age, {pronoun} showed remarkable {trait}.',
    'The tale of {name} begins on a {weather} day when {event}.',
    '{name}, known to all as the {title}, lived a life that would echo through the ages.'
  ],
  [StoryType.ROMANCE]: [
    'When {name1} first laid eyes on {name2} at the {location}, something shifted in the very blocks of the world.',
    'The love story of {name1} and {name2} began not with a word, but with a shared {moment}.',
    'They say that {name1} knew from the first moment that {name2} was different.'
  ],
  [StoryType.TRAGEDY]: [
    'The darkness came to {village} without warning. {name} was the first to fall.',
    'No one could have predicted the sorrow that would befall {name} on that fateful day.',
    'The village still speaks in hushed tones about what happened to {name}.'
  ],
  [StoryType.TRIUMPH]: [
    'Against all odds, {name} stood firm. This is the story of how they saved {village}.',
    'When {threat} threatened everything {name} held dear, they rose to meet it.',
    'The victory at {location} would be remembered for generations.'
  ],
  [StoryType.CONFLICT]: [
    'The tension between {faction1} and {faction2} had been building for seasons.',
    'War came to the blocky lands when {event} sparked the flames of conflict.',
    'The battle for {location} would determine the fate of {village}.'
  ],
  [StoryType.DISCOVERY]: [
    '{name} had always wondered what lay beyond the {boundary}. Today, they would find out.',
    'The discovery of {discovery} changed everything {village} knew about their world.',
    'When {name} first touched the {object}, visions of possibilities flooded their mind.'
  ],
  [StoryType.FOUNDING]: [
    'On this spot, {name} drove their first stake into the ground. {village} had begun.',
    'The founders of {village} came from {origin}, seeking a new beginning.',
    'Where once there was only wilderness, {name} saw the vision of {village}.'
  ],
  [StoryType.LEGACY]: [
    'The {family} family has shaped {village} for {generations} generations.',
    'From {ancestor} to {descendant}, the {trait} has passed through the bloodline.',
    'The legacy of {name} lives on in every {object} they left behind.'
  ],
  [StoryType.MYSTERY]: [
    'No one knows why {event} happened that night. Some say it was the work of {entity}.',
    'The strange occurrences at {location} began shortly after {trigger}.',
    'To this day, the villagers avoid {location} after dark.'
  ],
  [StoryType.EVERYDAY]: [
    'It was an ordinary day in {village}. {name} woke to the sound of {sound}.',
    '{name} spent the morning as they always did: {activity}.',
    'The rhythm of life in {village} continued its eternal dance.'
  ]
};

// Dramatic phrases for story enhancement
const DRAMATIC_PHRASES = {
  beginnings: [
    'In the time before memory',
    'When the world was young',
    'Generations past',
    'Before the great {event}',
    'In the age of {era}'
  ],
  transitions: [
    'But fate had other plans',
    'Little did they know',
    'As the seasons turned',
    'The winds of change began to blow',
    'And so it came to pass'
  ],
  climaxes: [
    'In that moment, everything changed',
    'The very blocks trembled',
    'Time itself seemed to pause',
    'A choice was made that would echo through eternity',
    'The truth was finally revealed'
  ],
  endings: [
    'And so the tale is told',
    'Thus ended the age of {era}',
    'To this day, they remember',
    'The echoes of those events still resonate',
    'And life continued, as it always does'
  ]
};

/**
 * Storytelling Manager
 */
export class StorytellingManager {
  private stories: Map<string, Story> = new Map();
  private chronicles: ChronicleEntry[] = [];
  private legends: Map<string, Legend> = new Map();
  private prophecies: Map<string, Prophecy> = new Map();
  private currentYear: number = 1;
  private currentEra: string = 'The Founding Age';
  
  constructor() {
    logger.info('Storytelling Manager initialized');
  }

  /**
   * Generate a story from events
   */
  generateStory(
    type: StoryType,
    protagonists: string[],
    events: { description: string; timestamp: number; participants: string[] }[],
    options?: {
      antagonists?: string[];
      setting?: string;
      themes?: string[];
    }
  ): Story {
    const story: Story = {
      id: uuidv4(),
      title: this.generateTitle(type, protagonists),
      type,
      beats: [],
      protagonists,
      antagonists: options?.antagonists,
      setting: options?.setting || 'the village',
      themes: options?.themes || this.inferThemes(type),
      significance: this.calculateSignificance(events),
      createdAt: Date.now(),
      isComplete: false
    };
    
    // Convert events to narrative beats
    story.beats = this.eventsToBeats(events);
    
    // Check if story has a resolution
    if (story.beats.length > 0 && 
        story.beats.some(b => b.type === 'RESOLUTION')) {
      story.isComplete = true;
      story.completedAt = Date.now();
    }
    
    this.stories.set(story.id, story);
    logger.debug(`Story generated: ${story.title}`);
    
    return story;
  }

  /**
   * Generate a biography for a bot
   */
  generateBiography(bot: Bot): Story {
    const events: { description: string; timestamp: number; participants: string[] }[] = [];
    
    // Birth
    events.push({
      description: `${bot.name} was born`,
      timestamp: bot.createdAt,
      participants: [...bot.parentIds, bot.id]
    });
    
    // Key memories
    for (const memory of bot.memories.slice(0, 10)) {
      events.push({
        description: memory.description,
        timestamp: memory.timestamp,
        participants: memory.participants
      });
    }
    
    return this.generateStory(StoryType.BIOGRAPHY, [bot.id], events, {
      setting: bot.villageId,
      themes: this.getBiographyThemes(bot)
    });
  }

  /**
   * Get themes for a biography based on bot traits
   */
  private getBiographyThemes(bot: Bot): string[] {
    const themes: string[] = [];
    
    if (bot.personality.bravery > 70) themes.push('courage');
    if (bot.personality.wisdom > 70) themes.push('wisdom');
    if (bot.personality.loyalty > 70) themes.push('loyalty');
    if (bot.personality.curiosity > 70) themes.push('discovery');
    if (bot.personality.creativity > 70) themes.push('innovation');
    
    if (bot.childIds.length > 2) themes.push('family');
    if (bot.lifeStage === LifeStage.ELDER) themes.push('legacy');
    
    return themes.length > 0 ? themes : ['perseverance', 'community'];
  }

  /**
   * Generate a title for a story
   */
  private generateTitle(type: StoryType, protagonistIds: string[]): string {
    const titles = {
      [StoryType.BIOGRAPHY]: [
        'The Life of {name}',
        'The Tale of {name}',
        '{name}: A Life in Blocks',
        'The Journey of {name}'
      ],
      [StoryType.ROMANCE]: [
        'A Love Forged in Stone',
        'Hearts of the Village',
        'The Bond Unbroken',
        'Two Souls, One Path'
      ],
      [StoryType.TRAGEDY]: [
        'The Darkest Hour',
        'When Sorrow Came',
        'The Loss That Changed Everything',
        'Tears in the Torchlight'
      ],
      [StoryType.TRIUMPH]: [
        'Against All Odds',
        'The Glorious Victory',
        'Rising Above',
        'The Day They Won'
      ],
      [StoryType.CONFLICT]: [
        'The Great War',
        'Clash of Villages',
        'When Brothers Fought',
        'The Battle for Tomorrow'
      ],
      [StoryType.DISCOVERY]: [
        'Beyond the Horizon',
        'The Secret Revealed',
        'New Frontiers',
        'The Discovery'
      ],
      [StoryType.FOUNDING]: [
        'A New Beginning',
        'The First Stone',
        'Birth of a Village',
        'The Foundation'
      ],
      [StoryType.LEGACY]: [
        'Through the Generations',
        'The Family Line',
        'What We Inherit',
        'The Lasting Gift'
      ],
      [StoryType.MYSTERY]: [
        'The Unsolved Mystery',
        'Secrets in the Shadows',
        'What Lurks Below',
        'The Unknown'
      ],
      [StoryType.EVERYDAY]: [
        'A Day in the Life',
        'Simple Moments',
        'The Rhythm of Days',
        'Ordinary Magic'
      ]
    };
    
    const options = titles[type];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Convert events to narrative beats
   */
  private eventsToBeats(
    events: { description: string; timestamp: number; participants: string[] }[]
  ): NarrativeBeat[] {
    if (events.length === 0) return [];
    
    const beats: NarrativeBeat[] = [];
    const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
    
    // First event is exposition
    beats.push({
      id: uuidv4(),
      timestamp: sortedEvents[0].timestamp,
      type: 'EXPOSITION',
      content: sortedEvents[0].description,
      emotionalTone: 0,
      participants: sortedEvents[0].participants
    });
    
    // Middle events are rising action or climax
    for (let i = 1; i < sortedEvents.length - 1; i++) {
      const event = sortedEvents[i];
      const isClimactic = this.isClimacticEvent(event.description);
      
      beats.push({
        id: uuidv4(),
        timestamp: event.timestamp,
        type: isClimactic ? 'CLIMAX' : 'RISING_ACTION',
        content: event.description,
        emotionalTone: this.inferEmotionalTone(event.description),
        participants: event.participants
      });
    }
    
    // Last event is resolution
    if (sortedEvents.length > 1) {
      const lastEvent = sortedEvents[sortedEvents.length - 1];
      beats.push({
        id: uuidv4(),
        timestamp: lastEvent.timestamp,
        type: 'RESOLUTION',
        content: lastEvent.description,
        emotionalTone: this.inferEmotionalTone(lastEvent.description),
        participants: lastEvent.participants
      });
    }
    
    return beats;
  }

  /**
   * Check if an event description sounds climactic
   */
  private isClimacticEvent(description: string): boolean {
    const climacticWords = [
      'battle', 'war', 'death', 'victory', 'defeat', 'discovered',
      'married', 'born', 'founded', 'destroyed', 'saved', 'killed',
      'elected', 'crowned', 'betrayed', 'united'
    ];
    
    const lowerDesc = description.toLowerCase();
    return climacticWords.some(word => lowerDesc.includes(word));
  }

  /**
   * Infer emotional tone from description
   */
  private inferEmotionalTone(description: string): number {
    const positiveWords = ['victory', 'love', 'joy', 'peace', 'born', 'married', 'discovered', 'saved', 'built', 'celebrated'];
    const negativeWords = ['death', 'war', 'loss', 'defeat', 'destroyed', 'betrayed', 'killed', 'famine', 'plague'];
    
    const lowerDesc = description.toLowerCase();
    let tone = 0;
    
    positiveWords.forEach(word => {
      if (lowerDesc.includes(word)) tone += 20;
    });
    
    negativeWords.forEach(word => {
      if (lowerDesc.includes(word)) tone -= 20;
    });
    
    return Math.max(-100, Math.min(100, tone));
  }

  /**
   * Infer themes from story type
   */
  private inferThemes(type: StoryType): string[] {
    const themeMap: Record<StoryType, string[]> = {
      [StoryType.BIOGRAPHY]: ['identity', 'growth', 'purpose'],
      [StoryType.ROMANCE]: ['love', 'connection', 'partnership'],
      [StoryType.TRAGEDY]: ['loss', 'grief', 'resilience'],
      [StoryType.TRIUMPH]: ['perseverance', 'courage', 'victory'],
      [StoryType.CONFLICT]: ['war', 'power', 'survival'],
      [StoryType.DISCOVERY]: ['knowledge', 'exploration', 'wonder'],
      [StoryType.FOUNDING]: ['hope', 'beginnings', 'community'],
      [StoryType.LEGACY]: ['heritage', 'tradition', 'continuity'],
      [StoryType.MYSTERY]: ['unknown', 'fear', 'curiosity'],
      [StoryType.EVERYDAY]: ['routine', 'simplicity', 'contentment']
    };
    
    return themeMap[type] || ['life', 'change'];
  }

  /**
   * Calculate story significance
   */
  private calculateSignificance(events: { description: string; timestamp: number; participants: string[] }[]): number {
    let significance = events.length * 10;
    
    // More participants = more significant
    const uniqueParticipants = new Set(events.flatMap(e => e.participants));
    significance += uniqueParticipants.size * 5;
    
    // Cap at 100
    return Math.min(100, significance);
  }

  /**
   * Create a legend from an event
   */
  createLegend(
    title: string,
    content: string,
    originalEventId?: string,
    moralLesson?: string
  ): Legend {
    const legend: Legend = {
      id: uuidv4(),
      title,
      originalEventId,
      content,
      moralLesson,
      toldBy: [],
      variations: [],
      believedTrue: 80,  // Starts mostly believed
      createdAt: Date.now()
    };
    
    this.legends.set(legend.id, legend);
    logger.info(`Legend created: ${title}`);
    
    return legend;
  }

  /**
   * Add variation to a legend (legends change over time)
   */
  addLegendVariation(legendId: string, variation: string): void {
    const legend = this.legends.get(legendId);
    if (legend) {
      legend.variations.push(variation);
      // Each variation slightly decreases believed accuracy
      legend.believedTrue = Math.max(30, legend.believedTrue - 5);
    }
  }

  /**
   * Create a prophecy
   */
  createProphecy(prophetId: string, content: string, interpretation?: string): Prophecy {
    const prophecy: Prophecy = {
      id: uuidv4(),
      prophet: prophetId,
      content,
      interpretation,
      fulfilled: false,
      createdAt: Date.now()
    };
    
    this.prophecies.set(prophecy.id, prophecy);
    logger.info(`Prophecy created by ${prophetId}`);
    
    return prophecy;
  }

  /**
   * Fulfill a prophecy
   */
  fulfillProphecy(prophecyId: string, fulfilledBy: string): void {
    const prophecy = this.prophecies.get(prophecyId);
    if (prophecy && !prophecy.fulfilled) {
      prophecy.fulfilled = true;
      prophecy.fulfilledAt = Date.now();
      prophecy.fulfilledBy = fulfilledBy;
      logger.info(`Prophecy fulfilled: ${prophecy.content.substring(0, 30)}...`);
    }
  }

  /**
   * Add chronicle entry for the current year
   */
  addChronicleEntry(summary: string, keyEvents: string[], keyFigures: string[]): void {
    const mood = this.determineChronicleYear(keyEvents);
    
    const entry: ChronicleEntry = {
      id: uuidv4(),
      era: this.currentEra,
      year: this.currentYear,
      summary,
      keyEvents,
      keyFigures,
      mood
    };
    
    this.chronicles.push(entry);
  }

  /**
   * Determine the mood of a chronicle year
   */
  private determineChronicleYear(events: string[]): ChronicleEntry['mood'] {
    const positiveCount = events.filter(e => 
      e.includes('victory') || e.includes('born') || e.includes('peace') || e.includes('built')
    ).length;
    
    const negativeCount = events.filter(e =>
      e.includes('war') || e.includes('death') || e.includes('destroyed') || e.includes('famine')
    ).length;
    
    if (positiveCount > negativeCount * 2) return 'GOLDEN';
    if (negativeCount > positiveCount * 2) return 'DARK';
    if (negativeCount > positiveCount) return 'TURBULENT';
    if (positiveCount > negativeCount) return 'PEACEFUL';
    return 'STAGNANT';
  }

  /**
   * Advance to a new era
   */
  advanceEra(newEraName: string): void {
    this.currentEra = newEraName;
    logger.info(`New era begins: ${newEraName}`);
  }

  /**
   * Advance year
   */
  advanceYear(): void {
    this.currentYear++;
  }

  /**
   * Get all stories for a bot
   */
  getBotStories(botId: string): Story[] {
    return Array.from(this.stories.values()).filter(
      s => s.protagonists.includes(botId) || s.antagonists?.includes(botId)
    );
  }

  /**
   * Get significant stories
   */
  getSignificantStories(minSignificance: number = 50): Story[] {
    return Array.from(this.stories.values())
      .filter(s => s.significance >= minSignificance)
      .sort((a, b) => b.significance - a.significance);
  }

  /**
   * Get all legends
   */
  getLegends(): Legend[] {
    return Array.from(this.legends.values());
  }

  /**
   * Get unfulfilled prophecies
   */
  getUnfulfilledProphecies(): Prophecy[] {
    return Array.from(this.prophecies.values()).filter(p => !p.fulfilled);
  }

  /**
   * Get chronicles
   */
  getChronicles(): ChronicleEntry[] {
    return [...this.chronicles];
  }

  /**
   * Narrate a story (convert to readable text)
   */
  narrateStory(storyId: string): string {
    const story = this.stories.get(storyId);
    if (!story) return '';
    
    const lines: string[] = [];
    
    // Title
    lines.push(`# ${story.title}`);
    lines.push('');
    
    // Setting
    lines.push(`*Set in ${story.setting} during ${this.currentEra}*`);
    lines.push('');
    
    // Beats
    for (const beat of story.beats) {
      const prefix = beat.type === 'CLIMAX' ? '**' : '';
      const suffix = beat.type === 'CLIMAX' ? '**' : '';
      lines.push(`${prefix}${beat.content}${suffix}`);
      lines.push('');
    }
    
    // Themes
    if (story.themes.length > 0) {
      lines.push(`*Themes: ${story.themes.join(', ')}*`);
    }
    
    return lines.join('\n');
  }

  /**
   * Serialize for persistence
   */
  serialize(): {
    stories: Story[];
    chronicles: ChronicleEntry[];
    legends: Legend[];
    prophecies: Prophecy[];
    currentYear: number;
    currentEra: string;
  } {
    return {
      stories: Array.from(this.stories.values()),
      chronicles: this.chronicles,
      legends: Array.from(this.legends.values()),
      prophecies: Array.from(this.prophecies.values()),
      currentYear: this.currentYear,
      currentEra: this.currentEra
    };
  }

  /**
   * Load from persistence
   */
  load(data: {
    stories?: Story[];
    chronicles?: ChronicleEntry[];
    legends?: Legend[];
    prophecies?: Prophecy[];
    currentYear?: number;
    currentEra?: string;
  }): void {
    this.stories.clear();
    this.legends.clear();
    this.prophecies.clear();
    
    for (const story of data.stories || []) {
      this.stories.set(story.id, story);
    }
    
    this.chronicles = data.chronicles || [];
    
    for (const legend of data.legends || []) {
      this.legends.set(legend.id, legend);
    }
    
    for (const prophecy of data.prophecies || []) {
      this.prophecies.set(prophecy.id, prophecy);
    }
    
    this.currentYear = data.currentYear || 1;
    this.currentEra = data.currentEra || 'The Founding Age';
    
    logger.info('Storytelling data loaded');
  }
}

// Singleton
let storytellingManagerInstance: StorytellingManager | null = null;

export function getStorytellingManager(): StorytellingManager {
  if (!storytellingManagerInstance) {
    storytellingManagerInstance = new StorytellingManager();
  }
  return storytellingManagerInstance;
}

export function resetStorytellingManager(): void {
  storytellingManagerInstance = null;
}

export default StorytellingManager;
