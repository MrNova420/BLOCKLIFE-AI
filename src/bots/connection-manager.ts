/**
 * BlockLife AI - Connection Manager
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Manages connections to Minecraft servers and spawning of bot populations.
 * Supports both Java Edition and Bedrock Edition.
 */

import { createMinecraftClient, IMinecraftClient, checkEditionSupport } from './mc-adapter';
import { getBotManager, BotManager } from './bot-manager';
import { BotAgent, BotAgentOptions } from './bot-agent';
import { getSimEngine, SimEngine } from '../simulation/sim-engine';
import { MinecraftConfig, Position, Role, Gender, LifeStage, MinecraftEdition, TechAge } from '../types';
import { createLogger } from '../utils/logger';
import { getSystemStatus, SystemComponent, EventCategory, LogLevel } from '../utils/system-status';

const logger = createLogger('connection');

// ============================================================================
// BOT NAMES (Common Scandinavian-inspired names for the village theme)
// ============================================================================

const MALE_NAMES = [
  'Erik', 'Lars', 'Bjorn', 'Olaf', 'Sven', 'Harald', 'Magnus', 'Ragnar',
  'Leif', 'Torsten', 'Gunnar', 'Sigurd', 'Ivar', 'Axel', 'Finn', 'Njord',
  'Odin', 'Thor', 'Freyr', 'Tyr', 'Balder', 'Heimdall', 'Loki', 'Bragi',
  'Ulf', 'Dag', 'Vidar', 'Arne', 'Knut', 'Rolf', 'Halvar', 'Ingvar'
];

const FEMALE_NAMES = [
  'Freya', 'Astrid', 'Ingrid', 'Helga', 'Sigrid', 'Gudrun', 'Thyra', 'Ragna',
  'Brunhilde', 'Solveig', 'Liv', 'Eira', 'Saga', 'Idunn', 'Sif', 'Skadi',
  'Hilda', 'Greta', 'Inga', 'Maja', 'Luna', 'Freja', 'Alva', 'Elsa',
  'Kara', 'Vera', 'Nora', 'Tova', 'Embla', 'Ylva', 'Sigyn', 'Frigg'
];

const SURNAMES = [
  'Stone', 'Wood', 'Iron', 'Oak', 'Pine', 'River', 'Hill', 'Dale',
  'Field', 'Forge', 'Smith', 'Fisher', 'Hunter', 'Farmer', 'Miller', 'Baker',
  'Storm', 'Frost', 'Fire', 'Earth', 'Wolf', 'Bear', 'Raven', 'Eagle',
  'Axe', 'Sword', 'Shield', 'Helm', 'Strong', 'Swift', 'Bold', 'Wise'
];

// ============================================================================
// CONNECTION STATE
// ============================================================================

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  SPAWNING_BOTS = 'SPAWNING_BOTS',
  READY = 'READY',
  ERROR = 'ERROR'
}

export interface ConnectionStatus {
  state: ConnectionState;
  edition: MinecraftEdition;
  host: string;
  port: number;
  connectedBots: number;
  totalBots: number;
  lastError?: string;
  connectedAt?: number;
  uptime?: string;
}

export interface SpawnConfig {
  count: number;
  startPosition?: Position;
  villageRadius?: number;
  roles?: Partial<Record<Role, number>>; // Role distribution
  delay?: number; // Delay between spawns in ms
}

// ============================================================================
// CONNECTION MANAGER CLASS
// ============================================================================

export class ConnectionManager {
  private config: MinecraftConfig | null = null;
  private clients: Map<string, IMinecraftClient> = new Map();
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private connectedAt: number = 0;
  private lastError: string = '';
  private spawnQueue: BotAgent[] = [];
  private isSpawning: boolean = false;

  constructor() {
    logger.info('Connection Manager initialized');
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    const uptimeMs = this.connectedAt ? Date.now() - this.connectedAt : 0;
    const hours = Math.floor(uptimeMs / 3600000);
    const minutes = Math.floor((uptimeMs % 3600000) / 60000);
    
    return {
      state: this.state,
      edition: this.config?.edition || 'java',
      host: this.config?.host || 'localhost',
      port: this.config?.port || 25565,
      connectedBots: this.clients.size,
      totalBots: getBotManager().getBotCount(),
      lastError: this.lastError || undefined,
      connectedAt: this.connectedAt || undefined,
      uptime: this.connectedAt 
        ? (hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`)
        : undefined
    };
  }

  /**
   * Check if an edition is supported
   */
  async checkSupport(edition: MinecraftEdition): Promise<{ supported: boolean; message: string }> {
    const supported = await checkEditionSupport(edition);
    
    if (supported) {
      return {
        supported: true,
        message: `${edition === 'java' ? 'Java' : 'Bedrock'} Edition is supported and ready.`
      };
    }
    
    return {
      supported: false,
      message: edition === 'java'
        ? 'Java Edition requires mineflayer. Install with: npm install mineflayer mineflayer-pathfinder'
        : 'Bedrock Edition requires bedrock-protocol. Install with: npm install bedrock-protocol'
    };
  }

  /**
   * Connect to a Minecraft server
   */
  async connect(config: MinecraftConfig): Promise<{ success: boolean; message: string }> {
    this.config = config;
    this.state = ConnectionState.CONNECTING;
    
    const status = getSystemStatus();
    status.logEvent({
      category: EventCategory.BOT_ACTION,
      level: LogLevel.INFO,
      source: 'connection-manager',
      message: `Connecting to ${config.edition} server at ${config.host}:${config.port}`
    });
    
    // Check edition support
    const support = await this.checkSupport(config.edition || 'java');
    if (!support.supported) {
      this.state = ConnectionState.ERROR;
      this.lastError = support.message;
      return { success: false, message: support.message };
    }
    
    try {
      // Test connection with a single bot first
      const testUsername = `BlockLife_Test_${Date.now() % 10000}`;
      const testClient = createMinecraftClient(config, testUsername);
      
      await testClient.connect();
      
      // Connection successful
      this.state = ConnectionState.CONNECTED;
      this.connectedAt = Date.now();
      
      // Keep test client or disconnect it
      testClient.disconnect();
      
      status.updateComponentStatus(
        SystemComponent.MINECRAFT_CONNECTION,
        'ONLINE',
        `Connected to ${config.host}:${config.port} (${config.edition})`
      );
      
      status.logEvent({
        category: EventCategory.BOT_ACTION,
        level: LogLevel.INFO,
        source: 'connection-manager',
        message: `Successfully connected to ${config.edition} server`
      });
      
      logger.info(`Connected to ${config.edition} server at ${config.host}:${config.port}`);
      
      return {
        success: true,
        message: `Successfully connected to ${config.host}:${config.port}. Ready to spawn bots!`
      };
      
    } catch (error) {
      this.state = ConnectionState.ERROR;
      this.lastError = String(error);
      
      status.updateComponentStatus(
        SystemComponent.MINECRAFT_CONNECTION,
        'DEGRADED',
        `Failed to connect: ${error}`
      );
      
      logger.error(`Connection failed: ${error}`);
      
      return {
        success: false,
        message: `Connection failed: ${error}`
      };
    }
  }

  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<void> {
    logger.info('Disconnecting all bots...');
    
    // Disconnect all clients
    for (const [botId, client] of this.clients) {
      try {
        client.disconnect();
        logger.debug(`Disconnected bot ${botId}`);
      } catch (error) {
        logger.warn(`Error disconnecting bot ${botId}: ${error}`);
      }
    }
    
    this.clients.clear();
    this.state = ConnectionState.DISCONNECTED;
    this.connectedAt = 0;
    this.config = null;
    
    const status = getSystemStatus();
    status.updateComponentStatus(
      SystemComponent.MINECRAFT_CONNECTION,
      'OFFLINE',
      'Disconnected from server'
    );
    
    status.logEvent({
      category: EventCategory.BOT_ACTION,
      level: LogLevel.INFO,
      source: 'connection-manager',
      message: 'Disconnected from Minecraft server'
    });
    
    logger.info('All bots disconnected');
  }

  /**
   * Spawn a population of bots (civilians)
   */
  async spawnPopulation(spawnConfig: SpawnConfig): Promise<{ success: boolean; message: string; bots: string[] }> {
    if (this.state !== ConnectionState.CONNECTED && this.state !== ConnectionState.READY) {
      return {
        success: false,
        message: 'Not connected to a server. Connect first before spawning bots.',
        bots: []
      };
    }
    
    if (!this.config) {
      return {
        success: false,
        message: 'No server configuration available.',
        bots: []
      };
    }
    
    this.state = ConnectionState.SPAWNING_BOTS;
    const botManager = getBotManager();
    const simEngine = getSimEngine();
    const status = getSystemStatus();
    
    const spawnedBotIds: string[] = [];
    const errors: string[] = [];
    
    const count = spawnConfig.count;
    const delay = spawnConfig.delay || 500; // 500ms between spawns by default
    
    status.logEvent({
      category: EventCategory.BOT_ACTION,
      level: LogLevel.INFO,
      source: 'connection-manager',
      message: `Starting to spawn ${count} bots...`
    });
    
    logger.info(`Spawning ${count} bots...`);
    
    // Determine role distribution
    const roleDistribution = spawnConfig.roles || this.getDefaultRoleDistribution(count);
    
    // Create or get village
    let village = simEngine.getAllVillages()[0];
    if (!village) {
      const villagePos = spawnConfig.startPosition || { x: 0, y: 64, z: 0 };
      village = simEngine.createVillage(villagePos, ['Pioneer']);
      
      status.logEvent({
        category: EventCategory.SYSTEM,
        level: LogLevel.INFO,
        source: 'connection-manager',
        message: `Created new village: ${village.name}`
      });
    }
    
    // Spawn bots with role distribution
    let roleIndex = 0;
    const roles = Object.entries(roleDistribution);
    
    for (let i = 0; i < count; i++) {
      try {
        // Generate random name and attributes
        const gender = Math.random() < 0.5 ? Gender.MALE : Gender.FEMALE;
        const firstName = gender === Gender.MALE 
          ? MALE_NAMES[Math.floor(Math.random() * MALE_NAMES.length)]
          : FEMALE_NAMES[Math.floor(Math.random() * FEMALE_NAMES.length)];
        const lastName = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
        const name = `${firstName} ${lastName}`;
        
        // Determine role based on distribution
        let role = Role.UNASSIGNED;
        if (roleIndex < roles.length) {
          const [roleType, roleCount] = roles[roleIndex];
          if (spawnedBotIds.length < roleCount) {
            role = roleType as Role;
          } else {
            roleIndex++;
            if (roleIndex < roles.length) {
              role = roles[roleIndex][0] as Role;
            }
          }
        }
        
        // Calculate spawn position (spread around village center)
        const radius = spawnConfig.villageRadius || 20;
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;
        const position: Position = {
          x: village.centerPosition.x + Math.cos(angle) * distance,
          y: village.centerPosition.y,
          z: village.centerPosition.z + Math.sin(angle) * distance
        };
        
        // Create bot agent
        const botOptions: BotAgentOptions = {
          name,
          villageId: village.id,
          position,
          gender
        };
        
        const botAgent = botManager.createBot(botOptions);
        botAgent.setRole(role); // Set role after creation
        spawnedBotIds.push(botAgent.id);
        
        // Add bot to village
        village.memberIds.push(botAgent.id);
        
        // Connect bot to server if config available
        if (this.config) {
          try {
            const username = `Bot_${firstName}_${i}`;
            const client = createMinecraftClient(this.config, username);
            
            // Connect asynchronously (don't wait for each one)
            client.connect().then(() => {
              this.clients.set(botAgent.id, client);
              
              // Set up event handlers
              client.on('spawn', () => {
                status.logEvent({
                  category: EventCategory.BOT_ACTION,
                  level: LogLevel.INFO,
                  source: 'connection-manager',
                  botId: botAgent.id,
                  message: `${name} spawned in the world`
                });
              });
              
              client.on('death', () => {
                status.logEvent({
                  category: EventCategory.BOT_ACTION,
                  level: LogLevel.WARN,
                  source: 'connection-manager',
                  botId: botAgent.id,
                  message: `${name} died`
                });
              });
              
              client.on('kicked', (reason) => {
                logger.warn(`${name} was kicked: ${reason}`);
                this.clients.delete(botAgent.id);
              });
              
            }).catch((err) => {
              logger.warn(`Failed to connect bot ${name}: ${err}`);
              errors.push(`${name}: ${err}`);
            });
          } catch (connError) {
            logger.warn(`Error creating client for ${name}: ${connError}`);
          }
        }
        
        // Log progress every 10 bots
        if ((i + 1) % 10 === 0 || i === count - 1) {
          logger.info(`Spawned ${i + 1}/${count} bots...`);
        }
        
        // Delay between spawns to avoid overloading
        if (delay > 0 && i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        logger.error(`Error spawning bot ${i + 1}: ${error}`);
        errors.push(`Bot ${i + 1}: ${error}`);
      }
    }
    
    this.state = ConnectionState.READY;
    
    status.logEvent({
      category: EventCategory.BOT_ACTION,
      level: LogLevel.INFO,
      source: 'connection-manager',
      message: `Finished spawning ${spawnedBotIds.length} bots (${errors.length} errors)`
    });
    
    logger.info(`Spawned ${spawnedBotIds.length} bots, ${errors.length} errors`);
    
    return {
      success: errors.length < count,
      message: errors.length === 0
        ? `Successfully spawned ${spawnedBotIds.length} bots in ${village.name}!`
        : `Spawned ${spawnedBotIds.length} bots with ${errors.length} errors.`,
      bots: spawnedBotIds
    };
  }

  /**
   * Get default role distribution for a population
   */
  private getDefaultRoleDistribution(count: number): Partial<Record<Role, number>> {
    // Distribution:
    // - 30% Unassigned (general workers)
    // - 20% Farmers
    // - 15% Builders
    // - 10% Miners
    // - 10% Guards
    // - 5% Healers
    // - 5% Artisans
    // - 5% Scouts
    
    return {
      [Role.UNASSIGNED]: Math.floor(count * 0.30),
      [Role.FARMER]: Math.floor(count * 0.20),
      [Role.BUILDER]: Math.floor(count * 0.15),
      [Role.MINER]: Math.floor(count * 0.10),
      [Role.GUARD]: Math.floor(count * 0.10),
      [Role.HEALER]: Math.floor(count * 0.05),
      [Role.ARTISAN]: Math.floor(count * 0.05),
      [Role.SCOUT]: Math.floor(count * 0.05)
    };
  }

  /**
   * Get a specific bot's Minecraft client
   */
  getBotClient(botId: string): IMinecraftClient | undefined {
    return this.clients.get(botId);
  }

  /**
   * Check if a bot is connected to the server
   */
  isBotConnected(botId: string): boolean {
    const client = this.clients.get(botId);
    return client ? client.isConnected() : false;
  }

  /**
   * Reconnect a specific bot
   */
  async reconnectBot(botId: string): Promise<boolean> {
    if (!this.config) return false;
    
    const bot = getBotManager().getBot(botId);
    if (!bot) return false;
    
    const oldClient = this.clients.get(botId);
    if (oldClient) {
      oldClient.disconnect();
    }
    
    try {
      const username = `Bot_${bot.name.split(' ')[0]}_${Date.now() % 1000}`;
      const client = createMinecraftClient(this.config, username);
      await client.connect();
      this.clients.set(botId, client);
      return true;
    } catch (error) {
      logger.error(`Failed to reconnect bot ${botId}: ${error}`);
      return false;
    }
  }

  /**
   * Get connected bot count
   */
  getConnectedBotCount(): number {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.isConnected()) count++;
    }
    return count;
  }
}

// Singleton
let instance: ConnectionManager | null = null;

export function getConnectionManager(): ConnectionManager {
  if (!instance) {
    instance = new ConnectionManager();
  }
  return instance;
}

export function resetConnectionManager(): void {
  if (instance) {
    instance.disconnect();
  }
  instance = null;
}

export default ConnectionManager;
