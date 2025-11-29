/**
 * BlockLife AI - Main Entry Point
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * A living Minecraft civilization that evolves on your device.
 * 
 * FEATURES:
 * - AI-controlled bots with individual consciousness
 * - Real Minecraft data from official game files
 * - Web dashboard for easy control
 * - Natural language commands
 * - Web research capability (toggle-able)
 * - Java & Bedrock Edition support
 */

import { Orchestrator, getOrchestrator } from './orchestrator';
import { dashboardServer } from './panel/dashboard-server';
import { createLogger } from './utils/logger';
import { loadConfig } from './utils/config';
import { getSystemStatus, SystemComponent } from './utils/system-status';
import { getMinecraftDataSource } from './knowledge/minecraft-data-source';
import { getConsciousnessManager } from './mind/bot-consciousness';
import { getWebResearch } from './mind/web-research';
import { getAICommander } from './mind/ai-commander';

const logger = createLogger('main');

// Beautiful ASCII art banner with colors
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const WHITE = '\x1b[37m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

const BANNER = `
${CYAN}╔══════════════════════════════════════════════════════════════════════════╗${RESET}
${CYAN}║${RESET}                                                                          ${CYAN}║${RESET}
${CYAN}║${RESET}   ${BOLD}${CYAN}██████╗ ██╗      ██████╗  ██████╗██╗  ██╗██╗     ██╗███████╗███████╗${RESET}  ${CYAN}║${RESET}
${CYAN}║${RESET}   ${CYAN}██╔══██╗██║     ██╔═══██╗██╔════╝██║ ██╔╝██║     ██║██╔════╝██╔════╝${RESET}  ${CYAN}║${RESET}
${CYAN}║${RESET}   ${MAGENTA}██████╔╝██║     ██║   ██║██║     █████╔╝ ██║     ██║█████╗  █████╗${RESET}    ${CYAN}║${RESET}
${CYAN}║${RESET}   ${MAGENTA}██╔══██╗██║     ██║   ██║██║     ██╔═██╗ ██║     ██║██╔══╝  ██╔══╝${RESET}    ${CYAN}║${RESET}
${CYAN}║${RESET}   ${YELLOW}██████╔╝███████╗╚██████╔╝╚██████╗██║  ██╗███████╗██║██║     ███████╗${RESET}  ${CYAN}║${RESET}
${CYAN}║${RESET}   ${YELLOW}╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝     ╚══════╝${RESET}  ${CYAN}║${RESET}
${CYAN}║${RESET}                                                                          ${CYAN}║${RESET}
${CYAN}║${RESET}              ${WHITE}★ AI-Powered Minecraft Civilization Engine ★${RESET}              ${CYAN}║${RESET}
${CYAN}║${RESET}                                                                          ${CYAN}║${RESET}
${CYAN}║${RESET}   ${DIM}Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill${RESET}        ${CYAN}║${RESET}
${CYAN}║${RESET}                                                                          ${CYAN}║${RESET}
${CYAN}╚══════════════════════════════════════════════════════════════════════════╝${RESET}
`;

/**
 * Initialize all systems
 */
async function initializeSystems(): Promise<void> {
  const status = getSystemStatus();
  
  console.log(`\n${CYAN}Initializing systems...${RESET}\n`);
  
  // Initialize Minecraft Data
  console.log(`  ${GREEN}✓${RESET} Loading Minecraft data...`);
  const mcData = getMinecraftDataSource();
  const stats = mcData.getStats();
  status.updateComponentStatus(
    SystemComponent.MINECRAFT_DATA,
    mcData.isInitialized() ? 'ONLINE' : 'DEGRADED',
    `Loaded ${stats.blocks} blocks, ${stats.items} items, ${stats.recipes} recipes`
  );
  console.log(`    ${DIM}${stats.blocks} blocks, ${stats.items} items, ${stats.entities} entities, ${stats.recipes} recipes${RESET}`);
  
  // Initialize Consciousness Manager
  console.log(`  ${GREEN}✓${RESET} Bot consciousness system ready`);
  const consciousness = getConsciousnessManager();
  status.updateComponentStatus(
    SystemComponent.BOT_CONSCIOUSNESS,
    'ONLINE',
    'Individual bot AI minds ready'
  );
  
  // Initialize Web Research (disabled by default)
  console.log(`  ${GREEN}✓${RESET} Web research system ready ${DIM}(disabled by default)${RESET}`);
  const webResearch = getWebResearch();
  
  // Initialize AI Commander
  console.log(`  ${GREEN}✓${RESET} AI Commander ready for natural language commands`);
  const commander = getAICommander();
  
  // Initialize Memory System
  console.log(`  ${GREEN}✓${RESET} Memory and logging systems active`);
  status.updateComponentStatus(
    SystemComponent.MEMORY_SYSTEM,
    'ONLINE',
    'Bot memories and event logging active'
  );
  
  console.log(`\n${GREEN}All systems initialized successfully!${RESET}\n`);
}

/**
 * Display startup information
 */
function displayStartupInfo(dashboardPort: number): void {
  const currentTime = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  console.log(`${CYAN}╔══════════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}║${RESET}                         ${BOLD}${WHITE}BLOCKLIFE IS READY${RESET}                              ${CYAN}║${RESET}`);
  console.log(`${CYAN}╠══════════════════════════════════════════════════════════════════════════╣${RESET}`);
  console.log(`${CYAN}║${RESET}                                                                          ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}  ${WHITE}Current Time:${RESET} ${currentTime}                    ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}                                                                          ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}  ${YELLOW}★${RESET} ${BOLD}Web Dashboard:${RESET}  ${GREEN}http://localhost:${dashboardPort}${RESET}                          ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}                                                                          ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}  ${WHITE}Quick Start:${RESET}                                                          ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}    1. Open the dashboard in your browser                                 ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}    2. Configure your Minecraft server connection                         ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}    3. Select an AI model                                                  ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}    4. Start the simulation!                                               ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}                                                                          ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}  ${WHITE}Chat Commands:${RESET}                                                         ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}    ${DIM}"build a castle"${RESET}  ${DIM}"mine for diamonds"${RESET}  ${DIM}"start simulation"${RESET}        ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}    ${DIM}"tell Erik to farm"${RESET}  ${DIM}"status"${RESET}  ${DIM}"help"${RESET}                            ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}                                                                          ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}  ${DIM}Press Ctrl+C to stop${RESET}                                                    ${CYAN}║${RESET}`);
  console.log(`${CYAN}║${RESET}                                                                          ${CYAN}║${RESET}`);
  console.log(`${CYAN}╚══════════════════════════════════════════════════════════════════════════╝${RESET}`);
  console.log('');
}

/**
 * Main function
 */
async function main(): Promise<void> {
  // Show banner
  console.log(BANNER);
  
  // Get config path from args or environment
  const configPath = process.argv[2] || process.env.BLOCKLIFE_CONFIG;
  
  // Load configuration
  loadConfig(configPath);
  
  // Initialize all systems
  await initializeSystems();
  
  // Start dashboard server
  const dashboardPort = parseInt(process.env.DASHBOARD_PORT || '3000');
  await dashboardServer.start(dashboardPort);
  
  // Update system status
  const status = getSystemStatus();
  status.updateComponentStatus(
    SystemComponent.DASHBOARD,
    'ONLINE',
    `Running on port ${dashboardPort}`
  );
  
  // Create orchestrator (but don't start simulation yet - user controls via dashboard)
  const orchestrator = getOrchestrator(configPath);
  status.updateComponentStatus(
    SystemComponent.SIMULATION_ENGINE,
    'ONLINE',
    'Ready to start simulation'
  );
  
  // Display startup info
  displayStartupInfo(dashboardPort);
  
  // Handle shutdown signals
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${YELLOW}Received ${signal}, shutting down gracefully...${RESET}`);
    
    status.updateComponentStatus(SystemComponent.DASHBOARD, 'OFFLINE', 'Shutting down');
    status.updateComponentStatus(SystemComponent.SIMULATION_ENGINE, 'OFFLINE', 'Shutting down');
    
    dashboardServer.stop();
    await orchestrator.stop();
    
    console.log(`${GREEN}BlockLife stopped successfully. Goodbye!${RESET}\n`);
    process.exit(0);
  };
  
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  
  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    shutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', reason);
  });
}

// Run main
main().catch((error) => {
  console.error(`${BOLD}\x1b[31mFatal error:${RESET}`, error);
  process.exit(1);
});
