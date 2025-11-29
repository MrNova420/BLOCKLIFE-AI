/**
 * BlockLife AI - Configuration System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Handles loading and managing configuration.
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
  AppConfig, 
  PerformanceProfile, 
  PerformanceMode,
  SimulationConfig,
  MinecraftConfig,
  AiConfig,
  LoggingConfig,
  DataConfig
} from '../types';
import { createLogger } from './logger';

const logger = createLogger('config');

// Default configurations
const DEFAULT_MINECRAFT_CONFIG: MinecraftConfig = {
  host: 'localhost',
  port: 25565,
  version: '1.20.4',
  usernamePrefix: 'BlockLife_',
  edition: 'java'
};

const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  performanceMode: PerformanceMode.AUTO,
  maxBots: 50,
  tickRateMs: 300,
  aiEnabled: true,
  autoSave: true,
  saveIntervalMs: 60000
};

const DEFAULT_AI_CONFIG: AiConfig = {
  provider: 'ollama',
  model: 'tinyllama',
  maxBatchSize: 10,
  minBatchSize: 3,
  decisionIntervalMs: 5000,
  timeoutMs: 30000,
  fallbackEnabled: true,
  ollama: {
    host: 'localhost',
    port: 11434
  }
};

const DEFAULT_LOGGING_CONFIG: LoggingConfig = {
  level: 'info',
  categories: ['system', 'ai', 'sim', 'perf'],
  file: './data/logs/blocklife.log',
  maxSize: '10MB',
  maxFiles: 5
};

const DEFAULT_DATA_CONFIG: DataConfig = {
  dir: './data',
  snapshotsDir: './data/snapshots',
  maxSnapshots: 10
};

const DEFAULT_APP_CONFIG: AppConfig = {
  minecraft: DEFAULT_MINECRAFT_CONFIG,
  simulation: DEFAULT_SIMULATION_CONFIG,
  ai: DEFAULT_AI_CONFIG,
  logging: DEFAULT_LOGGING_CONFIG,
  data: DEFAULT_DATA_CONFIG
};

// Performance profiles
const PERFORMANCE_PROFILES: Record<string, PerformanceProfile> = {
  eco: {
    maxBots: 25,
    aiBatchSize: 5,
    aiDecisionIntervalMs: 10000,
    tickRateMs: 500,
    backgroundBotFraction: 0.6
  },
  normal: {
    maxBots: 50,
    aiBatchSize: 10,
    aiDecisionIntervalMs: 8000,
    tickRateMs: 300,
    backgroundBotFraction: 0.4
  },
  performance: {
    maxBots: 100,
    aiBatchSize: 15,
    aiDecisionIntervalMs: 5000,
    tickRateMs: 200,
    backgroundBotFraction: 0.3
  }
};

let currentConfig: AppConfig = { ...DEFAULT_APP_CONFIG };

/**
 * Load configuration from file
 */
export function loadConfig(configPath?: string): AppConfig {
  const filePath = configPath || process.env.BLOCKLIFE_CONFIG || './config/default.json';
  
  try {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const loadedConfig = JSON.parse(fileContent);
      
      // Deep merge with defaults
      currentConfig = deepMerge(DEFAULT_APP_CONFIG, loadedConfig);
      logger.info(`Configuration loaded from ${filePath}`);
    } else {
      logger.info(`No config file found at ${filePath}, using defaults`);
      currentConfig = { ...DEFAULT_APP_CONFIG };
    }
  } catch (error) {
    logger.error(`Failed to load config from ${filePath}`, error);
    currentConfig = { ...DEFAULT_APP_CONFIG };
  }
  
  return currentConfig;
}

/**
 * Save current configuration to file
 */
export function saveConfig(configOrPath?: Partial<AppConfig> | string): void {
  let filePath = './config/default.json';
  
  // If first arg is an object, it's a config update
  if (typeof configOrPath === 'object' && configOrPath !== null) {
    currentConfig = deepMerge(currentConfig, configOrPath);
  } else if (typeof configOrPath === 'string') {
    filePath = configOrPath;
  }
  
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(currentConfig, null, 2));
    logger.info(`Configuration saved to ${filePath}`);
  } catch (error) {
    logger.error(`Failed to save config to ${filePath}`, error);
  }
}

/**
 * Get current configuration
 */
export function getConfig(): AppConfig {
  return currentConfig;
}

/**
 * Update configuration
 */
export function updateConfig(updates: Partial<AppConfig>): AppConfig {
  currentConfig = deepMerge(currentConfig, updates);
  return currentConfig;
}

/**
 * Get performance profile by name
 */
export function getPerformanceProfile(name: string): PerformanceProfile | undefined {
  return PERFORMANCE_PROFILES[name.toLowerCase()];
}

/**
 * Get all performance profiles
 */
export function getAllPerformanceProfiles(): Record<string, PerformanceProfile> {
  return { ...PERFORMANCE_PROFILES };
}

/**
 * Apply a performance profile to the current config
 */
export function applyPerformanceProfile(profileName: string): AppConfig {
  const profile = PERFORMANCE_PROFILES[profileName.toLowerCase()];
  
  if (!profile) {
    logger.warn(`Unknown performance profile: ${profileName}`);
    return currentConfig;
  }
  
  currentConfig.simulation.maxBots = profile.maxBots;
  currentConfig.simulation.tickRateMs = profile.tickRateMs;
  currentConfig.ai.maxBatchSize = profile.aiBatchSize;
  currentConfig.ai.decisionIntervalMs = profile.aiDecisionIntervalMs;
  
  logger.info(`Applied performance profile: ${profileName}`);
  return currentConfig;
}

/**
 * Deep merge two objects
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target } as T;
  
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = (target as Record<string, unknown>)[key];
      
      if (isObject(sourceValue) && isObject(targetValue)) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetValue as Record<string, unknown>, 
          sourceValue as Record<string, unknown>
        );
      } else if (sourceValue !== undefined) {
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }
  
  return result;
}

/**
 * Check if value is a plain object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Ensure data directories exist
 */
export function ensureDataDirectories(): void {
  const dirs = [
    currentConfig.data.dir,
    currentConfig.data.snapshotsDir,
    path.dirname(currentConfig.logging.file)
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.debug(`Created directory: ${dir}`);
    }
  }
}

export default {
  loadConfig,
  saveConfig,
  getConfig,
  updateConfig,
  getPerformanceProfile,
  getAllPerformanceProfiles,
  applyPerformanceProfile,
  ensureDataDirectories
};
