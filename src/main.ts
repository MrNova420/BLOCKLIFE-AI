/**
 * BlockLife AI - Main Entry Point
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * A living Minecraft civilization that evolves on your device.
 */

import { Orchestrator, getOrchestrator } from './orchestrator';
import { createLogger } from './utils/logger';

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
  
  // Create orchestrator
  const orchestrator = getOrchestrator(configPath);
  
  // Handle shutdown signals
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down...`);
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
  
  try {
    // Start the orchestrator
    await orchestrator.start();
    
    // Print status every minute
    setInterval(() => {
      if (orchestrator.isRunning()) {
        orchestrator.printStatus();
      }
    }, 60000);
    
    logger.info('BlockLife is running. Press Ctrl+C to stop.');
    
  } catch (error) {
    logger.error('Failed to start BlockLife', error);
    process.exit(1);
  }
}

// Run main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
