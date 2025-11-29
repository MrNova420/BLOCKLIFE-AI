/**
 * BlockLife AI - Weather and Season System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Environmental simulation including weather patterns, seasons,
 * and their effects on bot behavior and village operations.
 */

import { v4 as uuidv4 } from 'uuid';
import { Position } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('weather');

/**
 * Season types
 */
export enum Season {
  SPRING = 'SPRING',
  SUMMER = 'SUMMER',
  AUTUMN = 'AUTUMN',
  WINTER = 'WINTER'
}

/**
 * Weather conditions
 */
export enum WeatherCondition {
  CLEAR = 'CLEAR',
  CLOUDY = 'CLOUDY',
  RAIN = 'RAIN',
  STORM = 'STORM',
  SNOW = 'SNOW',
  BLIZZARD = 'BLIZZARD',
  FOG = 'FOG',
  HEAT_WAVE = 'HEAT_WAVE',
  DROUGHT = 'DROUGHT'
}

/**
 * Time of day
 */
export enum TimeOfDay {
  DAWN = 'DAWN',
  MORNING = 'MORNING',
  NOON = 'NOON',
  AFTERNOON = 'AFTERNOON',
  DUSK = 'DUSK',
  NIGHT = 'NIGHT',
  MIDNIGHT = 'MIDNIGHT'
}

/**
 * Weather effects on activities
 */
export interface WeatherEffects {
  farmingModifier: number;       // -100 to 100
  miningModifier: number;
  constructionModifier: number;
  combatModifier: number;
  travelModifier: number;        // Speed adjustment
  moodModifier: number;
  visibilityRange: number;       // Blocks
  mobSpawnModifier: number;
}

/**
 * Season configuration
 */
export interface SeasonConfig {
  name: Season;
  dayLength: number;             // In ticks
  nightLength: number;
  temperatureRange: { min: number; max: number };
  weatherProbabilities: Partial<Record<WeatherCondition, number>>;
  growthModifier: number;        // Crop growth
  harvestReady: boolean;
  plantingSeason: boolean;
}

/**
 * Current weather state
 */
export interface WeatherState {
  condition: WeatherCondition;
  temperature: number;           // -20 to 50 Celsius
  humidity: number;              // 0-100
  windSpeed: number;             // 0-100
  windDirection: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
  effects: WeatherEffects;
  startedAt: number;
  duration: number;              // Remaining duration in ticks
}

/**
 * Weather event (special occurrences)
 */
export interface WeatherEvent {
  id: string;
  type: 'LIGHTNING_STRIKE' | 'FLOOD' | 'DROUGHT' | 'FIRE' | 'FROST' | 'TORNADO' | 'METEOR_SHOWER';
  position?: Position;
  severity: number;              // 1-10
  startedAt: number;
  duration: number;
  damage?: number;
  affectedArea?: number;         // Radius in blocks
}

/**
 * Forecast entry
 */
export interface Forecast {
  day: number;
  season: Season;
  expectedCondition: WeatherCondition;
  temperatureRange: { min: number; max: number };
  confidence: number;            // 0-100, decreases for further days
}

// Season configurations
const SEASON_CONFIGS: Record<Season, SeasonConfig> = {
  [Season.SPRING]: {
    name: Season.SPRING,
    dayLength: 12000,
    nightLength: 8000,
    temperatureRange: { min: 10, max: 22 },
    weatherProbabilities: {
      [WeatherCondition.CLEAR]: 0.3,
      [WeatherCondition.CLOUDY]: 0.3,
      [WeatherCondition.RAIN]: 0.3,
      [WeatherCondition.FOG]: 0.1
    },
    growthModifier: 1.5,
    harvestReady: false,
    plantingSeason: true
  },
  [Season.SUMMER]: {
    name: Season.SUMMER,
    dayLength: 14000,
    nightLength: 6000,
    temperatureRange: { min: 20, max: 35 },
    weatherProbabilities: {
      [WeatherCondition.CLEAR]: 0.5,
      [WeatherCondition.CLOUDY]: 0.2,
      [WeatherCondition.STORM]: 0.15,
      [WeatherCondition.HEAT_WAVE]: 0.1,
      [WeatherCondition.DROUGHT]: 0.05
    },
    growthModifier: 1.2,
    harvestReady: true,
    plantingSeason: true
  },
  [Season.AUTUMN]: {
    name: Season.AUTUMN,
    dayLength: 10000,
    nightLength: 10000,
    temperatureRange: { min: 5, max: 18 },
    weatherProbabilities: {
      [WeatherCondition.CLEAR]: 0.25,
      [WeatherCondition.CLOUDY]: 0.35,
      [WeatherCondition.RAIN]: 0.25,
      [WeatherCondition.FOG]: 0.15
    },
    growthModifier: 0.8,
    harvestReady: true,
    plantingSeason: false
  },
  [Season.WINTER]: {
    name: Season.WINTER,
    dayLength: 8000,
    nightLength: 12000,
    temperatureRange: { min: -10, max: 5 },
    weatherProbabilities: {
      [WeatherCondition.CLEAR]: 0.2,
      [WeatherCondition.CLOUDY]: 0.3,
      [WeatherCondition.SNOW]: 0.35,
      [WeatherCondition.BLIZZARD]: 0.1,
      [WeatherCondition.FOG]: 0.05
    },
    growthModifier: 0.1,
    harvestReady: false,
    plantingSeason: false
  }
};

// Weather effects by condition
const WEATHER_EFFECTS: Record<WeatherCondition, WeatherEffects> = {
  [WeatherCondition.CLEAR]: {
    farmingModifier: 10,
    miningModifier: 0,
    constructionModifier: 10,
    combatModifier: 0,
    travelModifier: 0,
    moodModifier: 10,
    visibilityRange: 128,
    mobSpawnModifier: -20
  },
  [WeatherCondition.CLOUDY]: {
    farmingModifier: 0,
    miningModifier: 0,
    constructionModifier: 0,
    combatModifier: 0,
    travelModifier: 0,
    moodModifier: 0,
    visibilityRange: 100,
    mobSpawnModifier: 0
  },
  [WeatherCondition.RAIN]: {
    farmingModifier: 20,
    miningModifier: -10,
    constructionModifier: -30,
    combatModifier: -10,
    travelModifier: -20,
    moodModifier: -10,
    visibilityRange: 64,
    mobSpawnModifier: 10
  },
  [WeatherCondition.STORM]: {
    farmingModifier: -20,
    miningModifier: -30,
    constructionModifier: -80,
    combatModifier: -30,
    travelModifier: -50,
    moodModifier: -30,
    visibilityRange: 32,
    mobSpawnModifier: 50
  },
  [WeatherCondition.SNOW]: {
    farmingModifier: -50,
    miningModifier: -20,
    constructionModifier: -40,
    combatModifier: -20,
    travelModifier: -40,
    moodModifier: 5,
    visibilityRange: 64,
    mobSpawnModifier: 20
  },
  [WeatherCondition.BLIZZARD]: {
    farmingModifier: -100,
    miningModifier: -50,
    constructionModifier: -100,
    combatModifier: -50,
    travelModifier: -80,
    moodModifier: -40,
    visibilityRange: 16,
    mobSpawnModifier: 30
  },
  [WeatherCondition.FOG]: {
    farmingModifier: 0,
    miningModifier: 0,
    constructionModifier: -10,
    combatModifier: -30,
    travelModifier: -30,
    moodModifier: -5,
    visibilityRange: 24,
    mobSpawnModifier: 40
  },
  [WeatherCondition.HEAT_WAVE]: {
    farmingModifier: -30,
    miningModifier: -20,
    constructionModifier: -30,
    combatModifier: -20,
    travelModifier: -20,
    moodModifier: -20,
    visibilityRange: 96,
    mobSpawnModifier: 0
  },
  [WeatherCondition.DROUGHT]: {
    farmingModifier: -80,
    miningModifier: 0,
    constructionModifier: 0,
    combatModifier: 0,
    travelModifier: 0,
    moodModifier: -30,
    visibilityRange: 128,
    mobSpawnModifier: -10
  }
};

/**
 * Weather and Season Manager
 */
export class WeatherManager {
  private currentSeason: Season = Season.SPRING;
  private currentWeather: WeatherState;
  private currentTime: TimeOfDay = TimeOfDay.MORNING;
  private dayNumber: number = 1;
  private ticksInDay: number = 0;
  private activeEvents: Map<string, WeatherEvent> = new Map();
  private forecasts: Forecast[] = [];
  private weatherHistory: { day: number; condition: WeatherCondition; temperature: number }[] = [];
  
  private readonly TICKS_PER_DAY = 24000;
  private readonly DAYS_PER_SEASON = 30;
  private readonly FORECAST_DAYS = 7;
  
  constructor() {
    this.currentWeather = this.generateWeather();
    this.generateForecasts();
    logger.info('Weather Manager initialized');
  }

  /**
   * Update weather system (called each tick)
   */
  update(deltaTicks: number = 1): void {
    this.ticksInDay += deltaTicks;
    
    // Check for day transition
    if (this.ticksInDay >= this.TICKS_PER_DAY) {
      this.advanceDay();
    }
    
    // Update time of day
    this.updateTimeOfDay();
    
    // Update weather duration
    this.currentWeather.duration -= deltaTicks;
    if (this.currentWeather.duration <= 0) {
      this.transitionWeather();
    }
    
    // Process active events
    this.processEvents(deltaTicks);
    
    // Random event generation
    if (Math.random() < 0.001) {  // 0.1% chance per tick
      this.maybeSpawnEvent();
    }
  }

  /**
   * Advance to next day
   */
  private advanceDay(): void {
    this.ticksInDay = 0;
    this.dayNumber++;
    
    // Record weather history
    this.weatherHistory.push({
      day: this.dayNumber - 1,
      condition: this.currentWeather.condition,
      temperature: this.currentWeather.temperature
    });
    
    // Keep only last 100 days of history
    if (this.weatherHistory.length > 100) {
      this.weatherHistory = this.weatherHistory.slice(-100);
    }
    
    // Check for season change
    if (this.dayNumber % this.DAYS_PER_SEASON === 1) {
      this.advanceSeason();
    }
    
    // Update forecasts
    this.generateForecasts();
    
    logger.debug(`Day ${this.dayNumber} begins (${this.currentSeason})`);
  }

  /**
   * Advance to next season
   */
  private advanceSeason(): void {
    const seasons = [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER];
    const currentIndex = seasons.indexOf(this.currentSeason);
    this.currentSeason = seasons[(currentIndex + 1) % seasons.length];
    
    logger.info(`Season changed to ${this.currentSeason}`);
  }

  /**
   * Update time of day based on ticks
   */
  private updateTimeOfDay(): void {
    const dayProgress = this.ticksInDay / this.TICKS_PER_DAY;
    
    if (dayProgress < 0.1) this.currentTime = TimeOfDay.DAWN;
    else if (dayProgress < 0.25) this.currentTime = TimeOfDay.MORNING;
    else if (dayProgress < 0.35) this.currentTime = TimeOfDay.NOON;
    else if (dayProgress < 0.5) this.currentTime = TimeOfDay.AFTERNOON;
    else if (dayProgress < 0.6) this.currentTime = TimeOfDay.DUSK;
    else if (dayProgress < 0.85) this.currentTime = TimeOfDay.NIGHT;
    else this.currentTime = TimeOfDay.MIDNIGHT;
  }

  /**
   * Generate new weather
   */
  private generateWeather(): WeatherState {
    const config = SEASON_CONFIGS[this.currentSeason];
    const condition = this.pickWeatherCondition(config);
    const effects = WEATHER_EFFECTS[condition];
    
    const temperature = this.generateTemperature(config, condition);
    
    return {
      condition,
      temperature,
      humidity: this.generateHumidity(condition),
      windSpeed: Math.floor(Math.random() * 50) + (condition === WeatherCondition.STORM ? 50 : 0),
      windDirection: this.randomWindDirection(),
      effects,
      startedAt: Date.now(),
      duration: this.generateDuration(condition)
    };
  }

  /**
   * Pick weather condition based on season probabilities
   */
  private pickWeatherCondition(config: SeasonConfig): WeatherCondition {
    const roll = Math.random();
    let cumulative = 0;
    
    for (const [condition, probability] of Object.entries(config.weatherProbabilities)) {
      cumulative += probability || 0;
      if (roll < cumulative) {
        return condition as WeatherCondition;
      }
    }
    
    return WeatherCondition.CLEAR;
  }

  /**
   * Generate temperature based on season and weather
   */
  private generateTemperature(config: SeasonConfig, condition: WeatherCondition): number {
    let base = config.temperatureRange.min + 
               Math.random() * (config.temperatureRange.max - config.temperatureRange.min);
    
    // Weather modifiers
    if (condition === WeatherCondition.HEAT_WAVE) base += 10;
    if (condition === WeatherCondition.BLIZZARD) base -= 10;
    if (condition === WeatherCondition.STORM) base -= 5;
    
    return Math.round(base);
  }

  /**
   * Generate humidity based on weather
   */
  private generateHumidity(condition: WeatherCondition): number {
    const baseHumidity: Record<WeatherCondition, number> = {
      [WeatherCondition.CLEAR]: 40,
      [WeatherCondition.CLOUDY]: 60,
      [WeatherCondition.RAIN]: 90,
      [WeatherCondition.STORM]: 95,
      [WeatherCondition.SNOW]: 70,
      [WeatherCondition.BLIZZARD]: 75,
      [WeatherCondition.FOG]: 95,
      [WeatherCondition.HEAT_WAVE]: 30,
      [WeatherCondition.DROUGHT]: 10
    };
    
    return baseHumidity[condition] + Math.floor(Math.random() * 10) - 5;
  }

  /**
   * Random wind direction
   */
  private randomWindDirection(): WeatherState['windDirection'] {
    const directions: WeatherState['windDirection'][] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.floor(Math.random() * directions.length)];
  }

  /**
   * Generate duration for weather condition
   */
  private generateDuration(condition: WeatherCondition): number {
    const baseDurations: Record<WeatherCondition, number> = {
      [WeatherCondition.CLEAR]: 6000,
      [WeatherCondition.CLOUDY]: 4000,
      [WeatherCondition.RAIN]: 3000,
      [WeatherCondition.STORM]: 1500,
      [WeatherCondition.SNOW]: 4000,
      [WeatherCondition.BLIZZARD]: 2000,
      [WeatherCondition.FOG]: 2500,
      [WeatherCondition.HEAT_WAVE]: 5000,
      [WeatherCondition.DROUGHT]: 10000
    };
    
    const base = baseDurations[condition] || 4000;
    return base + Math.floor(Math.random() * base * 0.5);
  }

  /**
   * Transition to new weather
   */
  private transitionWeather(): void {
    const oldCondition = this.currentWeather.condition;
    this.currentWeather = this.generateWeather();
    
    logger.debug(`Weather changed: ${oldCondition} -> ${this.currentWeather.condition}`);
  }

  /**
   * Generate forecasts for upcoming days
   */
  private generateForecasts(): void {
    this.forecasts = [];
    
    for (let i = 0; i < this.FORECAST_DAYS; i++) {
      const futureDay = this.dayNumber + i;
      const futureSeason = this.getSeasonForDay(futureDay);
      const config = SEASON_CONFIGS[futureSeason];
      
      this.forecasts.push({
        day: futureDay,
        season: futureSeason,
        expectedCondition: this.pickWeatherCondition(config),
        temperatureRange: config.temperatureRange,
        confidence: Math.max(30, 100 - i * 15)  // Decreases with distance
      });
    }
  }

  /**
   * Get season for a specific day number
   */
  private getSeasonForDay(day: number): Season {
    const seasons = [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER];
    const seasonIndex = Math.floor((day - 1) / this.DAYS_PER_SEASON) % seasons.length;
    return seasons[seasonIndex];
  }

  /**
   * Process active weather events
   */
  private processEvents(deltaTicks: number): void {
    for (const [id, event] of this.activeEvents) {
      event.duration -= deltaTicks;
      
      if (event.duration <= 0) {
        this.activeEvents.delete(id);
        logger.debug(`Weather event ended: ${event.type}`);
      }
    }
  }

  /**
   * Maybe spawn a random weather event
   */
  private maybeSpawnEvent(): void {
    const eventTypes: WeatherEvent['type'][] = [
      'LIGHTNING_STRIKE', 'FLOOD', 'DROUGHT', 'FIRE', 'FROST', 'TORNADO', 'METEOR_SHOWER'
    ];
    
    // Check conditions for each event type
    if (this.currentWeather.condition === WeatherCondition.STORM && Math.random() < 0.3) {
      this.spawnEvent('LIGHTNING_STRIKE', { x: 0, y: 64, z: 0 }, 3);
    } else if (this.currentWeather.condition === WeatherCondition.RAIN && Math.random() < 0.1) {
      this.spawnEvent('FLOOD', undefined, 5);
    } else if (this.currentWeather.condition === WeatherCondition.HEAT_WAVE && Math.random() < 0.1) {
      this.spawnEvent('FIRE', { x: 0, y: 64, z: 0 }, 4);
    } else if (this.currentSeason === Season.WINTER && Math.random() < 0.1) {
      this.spawnEvent('FROST', undefined, 3);
    } else if (Math.random() < 0.01) {  // Very rare
      this.spawnEvent('METEOR_SHOWER', undefined, 2);
    }
  }

  /**
   * Spawn a weather event
   */
  spawnEvent(
    type: WeatherEvent['type'],
    position?: Position,
    severity: number = 5
  ): WeatherEvent {
    const event: WeatherEvent = {
      id: uuidv4(),
      type,
      position,
      severity,
      startedAt: Date.now(),
      duration: severity * 500,
      damage: this.calculateEventDamage(type, severity),
      affectedArea: this.calculateAffectedArea(type, severity)
    };
    
    this.activeEvents.set(event.id, event);
    logger.info(`Weather event spawned: ${type} (severity ${severity})`);
    
    return event;
  }

  /**
   * Calculate damage from event
   */
  private calculateEventDamage(type: WeatherEvent['type'], severity: number): number {
    const baseDamage: Record<WeatherEvent['type'], number> = {
      'LIGHTNING_STRIKE': 50,
      'FLOOD': 20,
      'DROUGHT': 5,
      'FIRE': 30,
      'FROST': 15,
      'TORNADO': 80,
      'METEOR_SHOWER': 100
    };
    
    return (baseDamage[type] || 10) * (severity / 5);
  }

  /**
   * Calculate affected area
   */
  private calculateAffectedArea(type: WeatherEvent['type'], severity: number): number {
    const baseArea: Record<WeatherEvent['type'], number> = {
      'LIGHTNING_STRIKE': 3,
      'FLOOD': 50,
      'DROUGHT': 100,
      'FIRE': 20,
      'FROST': 80,
      'TORNADO': 15,
      'METEOR_SHOWER': 10
    };
    
    return (baseArea[type] || 10) * severity;
  }

  // Public getters

  /**
   * Get current weather state
   */
  getCurrentWeather(): WeatherState {
    return { ...this.currentWeather };
  }

  /**
   * Get current season
   */
  getCurrentSeason(): Season {
    return this.currentSeason;
  }

  /**
   * Get current season config
   */
  getCurrentSeasonConfig(): SeasonConfig {
    return SEASON_CONFIGS[this.currentSeason];
  }

  /**
   * Get current time of day
   */
  getTimeOfDay(): TimeOfDay {
    return this.currentTime;
  }

  /**
   * Get current day number
   */
  getDayNumber(): number {
    return this.dayNumber;
  }

  /**
   * Is it daytime?
   */
  isDaytime(): boolean {
    return [TimeOfDay.DAWN, TimeOfDay.MORNING, TimeOfDay.NOON, TimeOfDay.AFTERNOON].includes(this.currentTime);
  }

  /**
   * Is it nighttime?
   */
  isNighttime(): boolean {
    return [TimeOfDay.DUSK, TimeOfDay.NIGHT, TimeOfDay.MIDNIGHT].includes(this.currentTime);
  }

  /**
   * Get forecasts
   */
  getForecasts(): Forecast[] {
    return [...this.forecasts];
  }

  /**
   * Get active events
   */
  getActiveEvents(): WeatherEvent[] {
    return Array.from(this.activeEvents.values());
  }

  /**
   * Get weather history
   */
  getWeatherHistory(): typeof this.weatherHistory {
    return [...this.weatherHistory];
  }

  /**
   * Get activity modifier for a specific activity
   */
  getActivityModifier(activity: 'farming' | 'mining' | 'construction' | 'combat' | 'travel'): number {
    const effects = this.currentWeather.effects;
    
    switch (activity) {
      case 'farming': return effects.farmingModifier;
      case 'mining': return effects.miningModifier;
      case 'construction': return effects.constructionModifier;
      case 'combat': return effects.combatModifier;
      case 'travel': return effects.travelModifier;
      default: return 0;
    }
  }

  /**
   * Get description of current weather
   */
  describeWeather(): string {
    const temp = this.currentWeather.temperature;
    const condition = this.currentWeather.condition.toLowerCase().replace('_', ' ');
    const season = this.currentSeason.toLowerCase();
    const time = this.currentTime.toLowerCase().replace('_', ' ');
    
    let tempDesc = 'mild';
    if (temp < 0) tempDesc = 'freezing';
    else if (temp < 10) tempDesc = 'cold';
    else if (temp > 30) tempDesc = 'hot';
    else if (temp > 25) tempDesc = 'warm';
    
    return `A ${tempDesc} ${season} ${time} with ${condition} conditions.`;
  }

  /**
   * Serialize for persistence
   */
  serialize(): {
    currentSeason: Season;
    currentWeather: WeatherState;
    currentTime: TimeOfDay;
    dayNumber: number;
    ticksInDay: number;
    activeEvents: WeatherEvent[];
    weatherHistory: { day: number; condition: WeatherCondition; temperature: number }[];
  } {
    return {
      currentSeason: this.currentSeason,
      currentWeather: this.currentWeather,
      currentTime: this.currentTime,
      dayNumber: this.dayNumber,
      ticksInDay: this.ticksInDay,
      activeEvents: Array.from(this.activeEvents.values()),
      weatherHistory: this.weatherHistory
    };
  }

  /**
   * Load from persistence
   */
  load(data: {
    currentSeason?: Season;
    currentWeather?: WeatherState;
    currentTime?: TimeOfDay;
    dayNumber?: number;
    ticksInDay?: number;
    activeEvents?: WeatherEvent[];
    weatherHistory?: { day: number; condition: WeatherCondition; temperature: number }[];
  }): void {
    this.currentSeason = data.currentSeason || Season.SPRING;
    this.currentWeather = data.currentWeather || this.generateWeather();
    this.currentTime = data.currentTime || TimeOfDay.MORNING;
    this.dayNumber = data.dayNumber || 1;
    this.ticksInDay = data.ticksInDay || 0;
    this.weatherHistory = data.weatherHistory || [];
    
    this.activeEvents.clear();
    for (const event of data.activeEvents || []) {
      this.activeEvents.set(event.id, event);
    }
    
    this.generateForecasts();
    
    logger.info('Weather data loaded');
  }
}

// Singleton
let weatherManagerInstance: WeatherManager | null = null;

export function getWeatherManager(): WeatherManager {
  if (!weatherManagerInstance) {
    weatherManagerInstance = new WeatherManager();
  }
  return weatherManagerInstance;
}

export function resetWeatherManager(): void {
  weatherManagerInstance = null;
}

export default WeatherManager;
