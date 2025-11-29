/**
 * BlockLife AI - Storage Layer
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Handles persistence of simulation state.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Bot, Village, CivilizationState, HistoricalEvent, DataConfig } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('storage');

/**
 * Storage layer interface
 */
export interface StorageLayer {
  // Bot operations
  loadAllBots(): Promise<Bot[]>;
  saveBots(bots: Bot[]): Promise<void>;
  
  // Village operations
  loadAllVillages(): Promise<Village[]>;
  saveVillages(villages: Village[]): Promise<void>;
  
  // Civilization state
  loadCivState(): Promise<CivilizationState | null>;
  saveCivState(state: CivilizationState): Promise<void>;
  
  // Event logging
  appendEventLog(event: HistoricalEvent): Promise<void>;
  getRecentEvents(limit: number): Promise<HistoricalEvent[]>;
  
  // Snapshots
  createSnapshot(name?: string): Promise<string>;
  loadSnapshot(name: string): Promise<boolean>;
  listSnapshots(): Promise<string[]>;
  deleteSnapshot(name: string): Promise<boolean>;
}

/**
 * JSON-based storage implementation
 */
export class JsonStorage implements StorageLayer {
  private dataDir: string;
  private snapshotsDir: string;
  private maxSnapshots: number;
  
  private botsFile: string;
  private villagesFile: string;
  private civStateFile: string;
  private eventsFile: string;

  constructor(config: DataConfig) {
    this.dataDir = config.dir;
    this.snapshotsDir = config.snapshotsDir;
    this.maxSnapshots = config.maxSnapshots;
    
    this.botsFile = path.join(this.dataDir, 'bots.json');
    this.villagesFile = path.join(this.dataDir, 'villages.json');
    this.civStateFile = path.join(this.dataDir, 'civilization.json');
    this.eventsFile = path.join(this.dataDir, 'events.json');
    
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.snapshotsDir)) {
      fs.mkdirSync(this.snapshotsDir, { recursive: true });
    }
  }

  private async readJsonFile<T>(filePath: string): Promise<T | null> {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      logger.error(`Failed to read ${filePath}`, error);
      return null;
    }
  }

  private async writeJsonFile<T>(filePath: string, data: T): Promise<void> {
    try {
      // Write to temp file first
      const tempPath = filePath + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
      
      // Rename to actual file (atomic operation)
      fs.renameSync(tempPath, filePath);
    } catch (error) {
      logger.error(`Failed to write ${filePath}`, error);
      throw error;
    }
  }

  // Bot operations
  async loadAllBots(): Promise<Bot[]> {
    const data = await this.readJsonFile<Bot[]>(this.botsFile);
    return data || [];
  }

  async saveBots(bots: Bot[]): Promise<void> {
    await this.writeJsonFile(this.botsFile, bots);
    logger.debug(`Saved ${bots.length} bots`);
  }

  // Village operations
  async loadAllVillages(): Promise<Village[]> {
    const data = await this.readJsonFile<Village[]>(this.villagesFile);
    return data || [];
  }

  async saveVillages(villages: Village[]): Promise<void> {
    await this.writeJsonFile(this.villagesFile, villages);
    logger.debug(`Saved ${villages.length} villages`);
  }

  // Civilization state
  async loadCivState(): Promise<CivilizationState | null> {
    return await this.readJsonFile<CivilizationState>(this.civStateFile);
  }

  async saveCivState(state: CivilizationState): Promise<void> {
    await this.writeJsonFile(this.civStateFile, state);
    logger.debug('Saved civilization state');
  }

  // Event logging
  async appendEventLog(event: HistoricalEvent): Promise<void> {
    let events = await this.readJsonFile<HistoricalEvent[]>(this.eventsFile);
    if (!events) {
      events = [];
    }
    
    events.push(event);
    
    // Keep only recent events (last 1000)
    if (events.length > 1000) {
      events = events.slice(-1000);
    }
    
    await this.writeJsonFile(this.eventsFile, events);
  }

  async getRecentEvents(limit: number): Promise<HistoricalEvent[]> {
    const events = await this.readJsonFile<HistoricalEvent[]>(this.eventsFile);
    if (!events) return [];
    return events.slice(-limit);
  }

  // Snapshots
  async createSnapshot(name?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotName = name || `snapshot-${timestamp}`;
    const snapshotDir = path.join(this.snapshotsDir, snapshotName);
    
    fs.mkdirSync(snapshotDir, { recursive: true });
    
    // Copy all data files
    const files = [this.botsFile, this.villagesFile, this.civStateFile, this.eventsFile];
    for (const file of files) {
      if (fs.existsSync(file)) {
        const dest = path.join(snapshotDir, path.basename(file));
        fs.copyFileSync(file, dest);
      }
    }
    
    logger.info(`Created snapshot: ${snapshotName}`);
    
    // Clean up old snapshots
    await this.cleanupOldSnapshots();
    
    return snapshotName;
  }

  async loadSnapshot(name: string): Promise<boolean> {
    const snapshotDir = path.join(this.snapshotsDir, name);
    
    if (!fs.existsSync(snapshotDir)) {
      logger.error(`Snapshot not found: ${name}`);
      return false;
    }
    
    // Copy snapshot files back to data dir
    const files = ['bots.json', 'villages.json', 'civilization.json', 'events.json'];
    for (const file of files) {
      const src = path.join(snapshotDir, file);
      const dest = path.join(this.dataDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    }
    
    logger.info(`Loaded snapshot: ${name}`);
    return true;
  }

  async listSnapshots(): Promise<string[]> {
    if (!fs.existsSync(this.snapshotsDir)) {
      return [];
    }
    
    const entries = fs.readdirSync(this.snapshotsDir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort()
      .reverse();
  }

  async deleteSnapshot(name: string): Promise<boolean> {
    const snapshotDir = path.join(this.snapshotsDir, name);
    
    if (!fs.existsSync(snapshotDir)) {
      return false;
    }
    
    fs.rmSync(snapshotDir, { recursive: true, force: true });
    logger.info(`Deleted snapshot: ${name}`);
    return true;
  }

  private async cleanupOldSnapshots(): Promise<void> {
    const snapshots = await this.listSnapshots();
    
    while (snapshots.length > this.maxSnapshots) {
      const oldest = snapshots.pop();
      if (oldest) {
        await this.deleteSnapshot(oldest);
      }
    }
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    const files = [this.botsFile, this.villagesFile, this.civStateFile, this.eventsFile];
    for (const file of files) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
    logger.info('All data cleared');
  }

  /**
   * Check if any data exists
   */
  hasData(): boolean {
    return fs.existsSync(this.civStateFile);
  }
}

// Singleton instance
let storageInstance: StorageLayer | null = null;

/**
 * Initialize the storage layer
 */
export function initializeStorage(config: DataConfig): StorageLayer {
  storageInstance = new JsonStorage(config);
  logger.info('Storage layer initialized');
  return storageInstance;
}

/**
 * Get the storage layer singleton
 */
export function getStorage(): StorageLayer {
  if (!storageInstance) {
    throw new Error('Storage not initialized. Call initializeStorage first.');
  }
  return storageInstance;
}

/**
 * Reset storage singleton
 */
export function resetStorage(): void {
  storageInstance = null;
}

export default {
  initializeStorage,
  getStorage,
  resetStorage,
  JsonStorage
};
