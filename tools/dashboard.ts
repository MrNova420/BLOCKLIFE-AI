/**
 * BlockLife AI - CLI Dashboard
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * A simple CLI dashboard to monitor the simulation.
 */

import { getBotManager } from '../src/bots/bot-manager';
import { getSimEngine, initializeSimEngine } from '../src/simulation/sim-engine';
import { getPerformanceMonitor } from '../src/utils/performance';
import { loadConfig, getConfig, ensureDataDirectories } from '../src/utils/config';
import { initializeStorage, getStorage } from '../src/persistence/storage';
import { Role, LifeStage } from '../src/types';

// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  red: '\x1b[31m'
};

function clearScreen(): void {
  console.clear();
  process.stdout.write('\x1b[H');
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000) % 24;
  const days = Math.floor(ms / 86400000);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function progressBar(value: number, max: number = 100, width: number = 20): string {
  const filled = Math.round((value / max) * width);
  const empty = width - filled;
  const color = value > 70 ? COLORS.red : value > 40 ? COLORS.yellow : COLORS.green;
  return `${color}[${'█'.repeat(filled)}${'░'.repeat(empty)}]${COLORS.reset}`;
}

async function loadData(): Promise<void> {
  // Load config
  const configPath = process.argv[2] || process.env.BLOCKLIFE_CONFIG;
  loadConfig(configPath);
  const config = getConfig();
  
  // Ensure data directories exist
  ensureDataDirectories();
  
  // Initialize storage
  initializeStorage(config.data);
  
  // Load state
  const civState = await getStorage().loadCivState();
  if (civState) {
    initializeSimEngine(civState);
  }
  
  const bots = await getStorage().loadAllBots();
  if (bots.length > 0) {
    getBotManager().loadBots(bots);
  }
}

function renderDashboard(): void {
  clearScreen();
  
  const simEngine = getSimEngine();
  const botManager = getBotManager();
  const perfMonitor = getPerformanceMonitor();
  const civState = simEngine.getState();
  const botStats = botManager.getStats();
  const perfMetrics = perfMonitor.getMetrics();
  
  // Header
  console.log(`${COLORS.bright}${COLORS.cyan}`);
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                    BLOCKLIFE AI DASHBOARD                         ║');
  console.log('║           Copyright © 2025 WeNova Interactive                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(COLORS.reset);
  
  // Status bar
  const uptime = Date.now() - civState.startedAt;
  console.log(`${COLORS.bright}Status:${COLORS.reset} ${COLORS.green}● Running${COLORS.reset}  |  ` +
              `${COLORS.bright}Uptime:${COLORS.reset} ${formatUptime(uptime)}  |  ` +
              `${COLORS.bright}Tick:${COLORS.reset} ${formatNumber(civState.currentTick)}  |  ` +
              `${COLORS.bright}Era:${COLORS.reset} ${civState.era}`);
  console.log('');
  
  // Villages section
  console.log(`${COLORS.bright}${COLORS.yellow}━━━ VILLAGES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
  
  if (civState.villages.length === 0) {
    console.log('  No villages yet');
  } else {
    for (const village of civState.villages) {
      const prosperity = progressBar(village.prosperity);
      console.log(`  ${COLORS.bright}${village.name}${COLORS.reset}`);
      console.log(`    Population: ${village.memberIds.length} | Age: ${village.techAge} | Prosperity: ${prosperity} ${village.prosperity}%`);
      console.log(`    Food: ${village.stockpile.food} | Wood: ${village.stockpile.wood} | Stone: ${village.stockpile.stone} | Iron: ${village.stockpile.iron}`);
    }
  }
  console.log('');
  
  // Population section
  console.log(`${COLORS.bright}${COLORS.magenta}━━━ POPULATION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
  console.log(`  ${COLORS.bright}Living:${COLORS.reset} ${botStats.living}  |  ` +
              `${COLORS.bright}Dead:${COLORS.reset} ${botStats.dead}  |  ` +
              `${COLORS.bright}Idle:${COLORS.reset} ${botStats.idle}  |  ` +
              `${COLORS.bright}In Danger:${COLORS.reset} ${botStats.inDanger}`);
  
  // Role distribution
  console.log(`  ${COLORS.dim}Roles:${COLORS.reset}`);
  const roles = Object.entries(botStats.roleDistribution)
    .filter(([_, count]) => count > 0)
    .map(([role, count]) => `${role}: ${count}`)
    .join(' | ');
  console.log(`    ${roles || 'No roles assigned'}`);
  console.log('');
  
  // Performance section
  console.log(`${COLORS.bright}${COLORS.blue}━━━ PERFORMANCE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
  const cpuBar = progressBar(perfMetrics.cpuUsage);
  const memBar = progressBar(perfMetrics.memoryUsagePercent);
  console.log(`  CPU: ${cpuBar} ${perfMetrics.cpuUsage}%`);
  console.log(`  Memory: ${memBar} ${perfMetrics.memoryUsageMb}MB (${perfMetrics.memoryUsagePercent}%)`);
  console.log(`  Tick Duration: ${perfMetrics.avgTickDurationMs}ms avg | AI Latency: ${perfMetrics.avgAiLatencyMs}ms avg`);
  console.log(`  Mode: ${perfMonitor.getMode()}`);
  console.log('');
  
  // Statistics section
  console.log(`${COLORS.bright}${COLORS.green}━━━ STATISTICS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
  console.log(`  Total Bots Ever: ${formatNumber(civState.stats.totalBotsEverLived)}`);
  console.log(`  Births: ${formatNumber(civState.stats.totalBirths)} | Deaths: ${formatNumber(civState.stats.totalDeaths)}`);
  console.log(`  Structures Built: ${formatNumber(civState.stats.structuresBuilt)}`);
  console.log(`  Max Population: ${formatNumber(civState.stats.maxPopulation)}`);
  console.log('');
  
  // Recent events (if any)
  const allEvents = civState.villages.flatMap(v => v.historicalEvents);
  const recentEvents = allEvents.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  
  if (recentEvents.length > 0) {
    console.log(`${COLORS.bright}${COLORS.white}━━━ RECENT EVENTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
    for (const event of recentEvents) {
      const ago = formatUptime(Date.now() - event.timestamp);
      console.log(`  ${COLORS.dim}[${ago} ago]${COLORS.reset} ${event.description}`);
    }
    console.log('');
  }
  
  // Footer
  console.log(`${COLORS.dim}─────────────────────────────────────────────────────────────────────`);
  console.log(`Press Ctrl+C to exit | Refreshing every 2 seconds...${COLORS.reset}`);
}

async function main(): Promise<void> {
  console.log('Loading BlockLife data...');
  
  try {
    await loadData();
    
    // Initial render
    renderDashboard();
    
    // Refresh every 2 seconds
    setInterval(() => {
      renderDashboard();
    }, 2000);
    
  } catch (error) {
    console.error('Failed to load data:', error);
    console.log('\nMake sure BlockLife has been run at least once to generate data.');
    process.exit(1);
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\nDashboard closed.');
  process.exit(0);
});

main().catch(console.error);
