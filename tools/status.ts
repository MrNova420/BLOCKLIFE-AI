/**
 * BlockLife AI - Status Tool
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * A CLI tool to check the status of a running BlockLife simulation.
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const BOTS_FILE = path.join(DATA_DIR, 'bots.json');
const CIV_FILE = path.join(DATA_DIR, 'civilization.json');
const VILLAGES_FILE = path.join(DATA_DIR, 'villages.json');

interface StatusInfo {
  botsCount: number;
  villagesCount: number;
  era: string;
  simulationDays: number;
  uptime: string;
  lastSaved: string;
}

/**
 * Format a duration in milliseconds to a human-readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Format a timestamp to a readable date string
 */
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Read JSON file safely
 */
function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/**
 * Get file modification time
 */
function getFileModTime(filePath: string): number | null {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtimeMs;
  } catch {
    return null;
  }
}

/**
 * Gather status information
 */
function gatherStatus(): StatusInfo | null {
  // Check if data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    return null;
  }

  // Load bots
  const bots = readJsonFile<unknown[]>(BOTS_FILE);
  const botsCount = bots?.length ?? 0;

  // Load civilization state
  const civState = readJsonFile<{
    era?: string;
    simulationDays?: number;
    startedAt?: number;
    villages?: unknown[];
  }>(CIV_FILE);

  // Load villages
  const villages = readJsonFile<unknown[]>(VILLAGES_FILE);
  const villagesCount = villages?.length ?? civState?.villages?.length ?? 0;

  // Get last saved time
  const modTime = getFileModTime(CIV_FILE) ?? getFileModTime(BOTS_FILE);
  const lastSaved = modTime ? formatTimestamp(modTime) : 'Unknown';

  // Calculate uptime
  const startedAt = civState?.startedAt ?? Date.now();
  const uptime = formatDuration(Date.now() - startedAt);

  return {
    botsCount,
    villagesCount,
    era: civState?.era ?? 'Unknown',
    simulationDays: civState?.simulationDays ?? 0,
    uptime,
    lastSaved
  };
}

/**
 * Print status to console
 */
function printStatus(): void {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                   BLOCKLIFE STATUS CHECK                       ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log('║   Copyright © 2025 WeNova Interactive                         ║');
  console.log('║              Kayden Shawn Massengill                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const status = gatherStatus();

  if (!status) {
    console.log('⚠️  No BlockLife data found.');
    console.log('   Either the simulation has not been run yet,');
    console.log('   or the data directory does not exist.\n');
    console.log('   Run `npm start` to start the simulation.\n');
    return;
  }

  console.log('📊 SIMULATION STATUS');
  console.log('────────────────────────────────────────────────────────');
  console.log(`   Era:             ${status.era}`);
  console.log(`   Simulation Days: ${status.simulationDays.toFixed(2)}`);
  console.log(`   Uptime:          ${status.uptime}`);
  console.log('');
  console.log('👥 POPULATION');
  console.log('────────────────────────────────────────────────────────');
  console.log(`   Total Bots:      ${status.botsCount}`);
  console.log(`   Villages:        ${status.villagesCount}`);
  console.log('');
  console.log('💾 DATA');
  console.log('────────────────────────────────────────────────────────');
  console.log(`   Last Saved:      ${status.lastSaved}`);
  console.log(`   Data Directory:  ${DATA_DIR}`);
  console.log('');
  console.log('────────────────────────────────────────────────────────');
  console.log('✅ BlockLife data found and readable.\n');
}

// Run status check
printStatus();
