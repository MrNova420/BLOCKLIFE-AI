/**
 * BlockLife AI - Main Entry Point
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * A living Minecraft civilization that evolves on your device.
 */

import { Orchestrator, getOrchestrator } from './orchestrator';
import { dashboardServer } from './panel/dashboard-server';
import { createLogger } from './utils/logger';
import { loadConfig } from './utils/config';

const logger = createLogger('main');

// ASCII art banner
const BANNER = `
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   ██████╗ ██╗      ██████╗  ██████╗██╗  ██╗██╗     ██╗███████╗  ║
║   ██╔══██╗██║     ██╔═══██╗██╔════╝██║ ██╔╝██║     ██║██╔════╝  ║
║   ██████╔╝██║     ██║   ██║██║     █████╔╝ ██║     ██║█████╗    ║
║   ██╔══██╗██║     ██║   ██║██║     ██╔═██╗ ██║     ██║██╔══╝    ║
║   ██████╔╝███████╗╚██████╔╝╚██████╗██║  ██╗███████╗██║██║       ║
║   ╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝       ║
║                                                                  ║
║             Minecraft Civilization Engine                        ║
║     Copyright © 2025 WeNova Interactive                         ║
║              Kayden Shawn Massengill                            ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`;

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log(BANNER);
  
  // Get config path from args or environment
  const configPath = process.argv[2] || process.env.BLOCKLIFE_CONFIG;
  
  // Load configuration
  loadConfig(configPath);
  
  // Start dashboard server first (user-friendly entry point)
  const dashboardPort = parseInt(process.env.DASHBOARD_PORT || '3000');
  await dashboardServer.start(dashboardPort);
  
  // Create orchestrator (but don't start simulation yet - user controls via dashboard)
  const orchestrator = getOrchestrator(configPath);
  
  // Handle shutdown signals
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down...`);
    dashboardServer.stop();
    await orchestrator.stop();
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
  
  logger.info('BlockLife is ready. Use the web dashboard to control the simulation.');
  logger.info('Press Ctrl+C to stop.');
}

// Run main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
