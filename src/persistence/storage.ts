/**
 * BlockLife AI - Storage Layer
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Handles persistence of simulation state.
 * Supports both SQLite (better-sqlite3) and JSON file storage.
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
  
  // Storage info
  getStorageType(): string;
}

// ============================================================================
// SQLITE STORAGE (better-sqlite3)
// ============================================================================

/**
 * SQLite-based storage implementation using better-sqlite3
 * Provides faster queries and better data integrity than JSON files
 */
export class SqliteStorage implements StorageLayer {
  private db: any;
  private dataDir: string;
  private snapshotsDir: string;
  private maxSnapshots: number;
  private dbPath: string;

  constructor(config: DataConfig, Database: any) {
    this.dataDir = config.dir;
    this.snapshotsDir = config.snapshotsDir;
    this.maxSnapshots = config.maxSnapshots;
    this.dbPath = path.join(this.dataDir, 'blocklife.db');
    
    this.ensureDirectories();
    
    // Initialize SQLite database
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL'); // Better performance
    this.initializeTables();
    
    logger.info(`SQLite storage initialized at ${this.dbPath}`);
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.snapshotsDir)) {
      fs.mkdirSync(this.snapshotsDir, { recursive: true });
    }
  }

  private initializeTables(): void {
    // Bots table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bots (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Villages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS villages (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Civilization state table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS civilization (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Events table with index for efficient queries
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        timestamp INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC)`);

    // Snapshots metadata table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS snapshots (
        name TEXT PRIMARY KEY,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);
  }

  getStorageType(): string {
    return 'sqlite';
  }

  // Bot operations
  async loadAllBots(): Promise<Bot[]> {
    const rows = this.db.prepare('SELECT data FROM bots').all();
    return rows.map((row: { data: string }) => JSON.parse(row.data) as Bot);
  }

  async saveBots(bots: Bot[]): Promise<void> {
    const insert = this.db.prepare('INSERT OR REPLACE INTO bots (id, data, updated_at) VALUES (?, ?, strftime(\'%s\', \'now\'))');
    const deleteAll = this.db.prepare('DELETE FROM bots');
    
    const transaction = this.db.transaction(() => {
      deleteAll.run();
      for (const bot of bots) {
        insert.run(bot.id, JSON.stringify(bot));
      }
    });
    
    transaction();
    logger.debug(`Saved ${bots.length} bots to SQLite`);
  }

  // Village operations
  async loadAllVillages(): Promise<Village[]> {
    const rows = this.db.prepare('SELECT data FROM villages').all();
    return rows.map((row: { data: string }) => JSON.parse(row.data) as Village);
  }

  async saveVillages(villages: Village[]): Promise<void> {
    const insert = this.db.prepare('INSERT OR REPLACE INTO villages (id, data, updated_at) VALUES (?, ?, strftime(\'%s\', \'now\'))');
    const deleteAll = this.db.prepare('DELETE FROM villages');
    
    const transaction = this.db.transaction(() => {
      deleteAll.run();
      for (const village of villages) {
        insert.run(village.id, JSON.stringify(village));
      }
    });
    
    transaction();
    logger.debug(`Saved ${villages.length} villages to SQLite`);
  }

  // Civilization state
  async loadCivState(): Promise<CivilizationState | null> {
    const row = this.db.prepare('SELECT data FROM civilization WHERE id = 1').get() as { data: string } | undefined;
    return row ? JSON.parse(row.data) as CivilizationState : null;
  }

  async saveCivState(state: CivilizationState): Promise<void> {
    this.db.prepare('INSERT OR REPLACE INTO civilization (id, data, updated_at) VALUES (1, ?, strftime(\'%s\', \'now\'))').run(JSON.stringify(state));
    logger.debug('Saved civilization state to SQLite');
  }

  // Event logging
  async appendEventLog(event: HistoricalEvent): Promise<void> {
    this.db.prepare('INSERT INTO events (data) VALUES (?)').run(JSON.stringify(event));
    
    // Keep only last 1000 events
    this.db.prepare('DELETE FROM events WHERE id NOT IN (SELECT id FROM events ORDER BY id DESC LIMIT 1000)').run();
  }

  async getRecentEvents(limit: number): Promise<HistoricalEvent[]> {
    const rows = this.db.prepare('SELECT data FROM events ORDER BY id DESC LIMIT ?').all(limit);
    return rows.map((row: { data: string }) => JSON.parse(row.data) as HistoricalEvent).reverse();
  }

  // Snapshots
  async createSnapshot(name?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotName = name || `snapshot-${timestamp}`;
    const snapshotDir = path.join(this.snapshotsDir, snapshotName);
    
    fs.mkdirSync(snapshotDir, { recursive: true });
    
    // Copy the database file
    const snapshotDbPath = path.join(snapshotDir, 'blocklife.db');
    this.db.backup(snapshotDbPath).then(() => {
      logger.info(`Created SQLite snapshot: ${snapshotName}`);
    }).catch((err: Error) => {
      // Fallback: manual copy
      fs.copyFileSync(this.dbPath, snapshotDbPath);
      logger.info(`Created SQLite snapshot (copy): ${snapshotName}`);
    });
    
    // Record snapshot in metadata
    this.db.prepare('INSERT OR REPLACE INTO snapshots (name) VALUES (?)').run(snapshotName);
    
    // Clean up old snapshots
    await this.cleanupOldSnapshots();
    
    return snapshotName;
  }

  async loadSnapshot(name: string): Promise<boolean> {
    const snapshotDir = path.join(this.snapshotsDir, name);
    const snapshotDbPath = path.join(snapshotDir, 'blocklife.db');
    
    if (!fs.existsSync(snapshotDbPath)) {
      logger.error(`Snapshot not found: ${name}`);
      return false;
    }
    
    // Close current db, copy snapshot, reopen
    this.db.close();
    fs.copyFileSync(snapshotDbPath, this.dbPath);
    
    // Dynamic import to get Database constructor
    try {
      const Database = require('better-sqlite3');
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      logger.info(`Loaded SQLite snapshot: ${name}`);
      return true;
    } catch (error) {
      logger.error(`Failed to reopen database after snapshot load: ${error}`);
      return false;
    }
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
    this.db.prepare('DELETE FROM snapshots WHERE name = ?').run(name);
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
    this.db.exec('DELETE FROM bots');
    this.db.exec('DELETE FROM villages');
    this.db.exec('DELETE FROM civilization');
    this.db.exec('DELETE FROM events');
    logger.info('All SQLite data cleared');
  }

  /**
   * Check if any data exists
   */
  hasData(): boolean {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM civilization').get() as { count: number };
    return row.count > 0;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}

// ============================================================================
// JSON STORAGE (fallback)
// ============================================================================

/**
 * JSON-based storage implementation
 * Used when better-sqlite3 is not available
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

  getStorageType(): string {
    return 'json';
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

// ============================================================================
// STORAGE FACTORY
// ============================================================================

// Singleton instance
let storageInstance: StorageLayer | null = null;

/**
 * Check if better-sqlite3 is available
 */
export function isSqliteAvailable(): boolean {
  try {
    require('better-sqlite3');
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize the storage layer
 * Uses SQLite if better-sqlite3 is available, otherwise falls back to JSON
 */
export function initializeStorage(config: DataConfig): StorageLayer {
  if (isSqliteAvailable()) {
    try {
      const Database = require('better-sqlite3');
      storageInstance = new SqliteStorage(config, Database);
      logger.info('Storage layer initialized with SQLite (better-sqlite3)');
    } catch (error) {
      logger.warn(`SQLite initialization failed, falling back to JSON: ${error}`);
      storageInstance = new JsonStorage(config);
      logger.info('Storage layer initialized with JSON fallback');
    }
  } else {
    storageInstance = new JsonStorage(config);
    logger.info('Storage layer initialized with JSON (better-sqlite3 not available)');
  }
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
  if (storageInstance && 'close' in storageInstance) {
    (storageInstance as SqliteStorage).close();
  }
  storageInstance = null;
}

export default {
  initializeStorage,
  getStorage,
  resetStorage,
  JsonStorage,
  SqliteStorage,
  isSqliteAvailable
};
