/**
 * BlockLife AI - Minecraft Client Adapter
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Unified adapter for both Java Edition (mineflayer) and Bedrock Edition (bedrock-protocol).
 * Provides a consistent interface for bot control across both editions.
 * 
 * FEATURES:
 * - Smart pathfinding for BOTH editions
 * - Proper connection handling with timeouts
 * - Obstacle avoidance and stuck recovery
 * - Real player-like movement
 */

import { Position, MinecraftConfig, MinecraftEdition } from '../types';
import { createLogger } from '../utils/logger';
import { SmartPathfinder, PathExecutor, createJavaPathfinder, createBedrockPathfinder, createDefaultPathfinder } from './smart-pathfinder';

const logger = createLogger('mc-adapter');

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Events emitted by the Minecraft client
 */
export interface MinecraftClientEvents {
  spawn: () => void;
  death: () => void;
  health: (health: number, food: number) => void;
  chat: (username: string, message: string) => void;
  playerJoined: (username: string) => void;
  playerLeft: (username: string) => void;
  kicked: (reason: string) => void;
  error: (error: Error) => void;
  end: () => void;
  entitySpawn: (entity: EntityInfo) => void;
  blockUpdate: (position: Position, blockType: string) => void;
}

/**
 * Entity information
 */
export interface EntityInfo {
  id: number;
  type: string;
  position: Position;
  name?: string;
  health?: number;
  isHostile: boolean;
}

/**
 * Block information
 */
export interface BlockInfo {
  position: Position;
  type: string;
  metadata?: number;
}

/**
 * Inventory item
 */
export interface InventoryItem {
  slot: number;
  name: string;
  count: number;
  metadata?: Record<string, unknown>;
}

/**
 * Abstract Minecraft client interface
 * Implemented by both Java and Bedrock adapters
 */
export interface IMinecraftClient {
  // Connection
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  
  // Basic info
  getUsername(): string;
  getPosition(): Position;
  getHealth(): number;
  getFood(): number;
  getGameMode(): string;
  
  // Movement
  moveTo(position: Position): Promise<boolean>;
  lookAt(position: Position): void;
  jump(): void;
  sneak(enable: boolean): void;
  sprint(enable: boolean): void;
  
  // Actions
  attack(entityId: number): void;
  useItem(): void;
  placeBlock(position: Position): Promise<boolean>;
  breakBlock(position: Position): Promise<boolean>;
  
  // Inventory
  getInventory(): InventoryItem[];
  selectSlot(slot: number): void;
  equipItem(itemName: string): boolean;
  dropItem(slot: number, count?: number): void;
  
  // World
  getBlockAt(position: Position): BlockInfo | null;
  getNearbyEntities(range: number): EntityInfo[];
  getTimeOfDay(): number;
  getWeather(): string;
  
  // Chat
  chat(message: string): void;
  whisper(username: string, message: string): void;
  
  // Events
  on<K extends keyof MinecraftClientEvents>(event: K, listener: MinecraftClientEvents[K]): void;
  off<K extends keyof MinecraftClientEvents>(event: K, listener: MinecraftClientEvents[K]): void;
}

// ============================================================================
// JAVA EDITION ADAPTER (mineflayer)
// ============================================================================

/**
 * Java Edition client using mineflayer
 */
export class JavaEditionClient implements IMinecraftClient {
  private bot: any = null; // mineflayer.Bot
  private config: MinecraftConfig;
  private username: string;
  private connected: boolean = false;
  // eslint-disable-next-line @typescript-eslint/ban-types
  private eventHandlers: Map<string, Set<Function>> = new Map();
  
  // Smart pathfinding
  private smartPathfinder: SmartPathfinder | null = null;
  private pathExecutor: PathExecutor | null = null;
  private pathfinderLoaded: boolean = false;

  constructor(config: MinecraftConfig, username: string) {
    this.config = config;
    this.username = username;
  }

  async connect(): Promise<void> {
    logger.info(`[Java] Connecting ${this.username} to ${this.config.host}:${this.config.port}`);
    
    try {
      // Dynamic import to handle missing dependency gracefully
      const mineflayer = await import('mineflayer');
      
      this.bot = mineflayer.createBot({
        host: this.config.host,
        port: this.config.port,
        username: this.username,
        version: this.config.version,
        auth: 'offline' // Use offline mode for bot accounts
      });

      return new Promise((resolve, reject) => {
        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
          if (!this.connected) {
            const err = new Error(`Connection timeout after 30 seconds to ${this.config.host}:${this.config.port}`);
            logger.error(`[Java] ${err.message}`);
            this.emit('error', err);
            reject(err);
          }
        }, 30000);

        this.bot.once('spawn', async () => {
          clearTimeout(connectionTimeout);
          this.connected = true;
          logger.info(`[Java] ${this.username} spawned successfully`);
          
          // Load pathfinder plugin after spawn
          try {
            const pathfinder = await import('mineflayer-pathfinder');
            this.bot.loadPlugin(pathfinder.pathfinder);
            this.pathfinderLoaded = true;
            logger.debug(`[Java] Pathfinder plugin loaded for ${this.username}`);
          } catch (pathErr) {
            logger.warn(`[Java] Could not load mineflayer-pathfinder: ${pathErr}`);
            // Initialize smart pathfinder as fallback
            this.initializeSmartPathfinder();
          }
          
          this.emit('spawn');
          resolve();
        });

        this.bot.once('error', (err: Error) => {
          clearTimeout(connectionTimeout);
          logger.error(`[Java] Connection error: ${err.message}`);
          this.emit('error', err);
          reject(err);
        });

        this.bot.once('kicked', (reason: string) => {
          clearTimeout(connectionTimeout);
          logger.warn(`[Java] ${this.username} was kicked: ${reason}`);
          this.connected = false;
          this.emit('kicked', reason);
        });

        this.bot.once('end', () => {
          clearTimeout(connectionTimeout);
          this.connected = false;
          this.emit('end');
        });

        // Forward events
        this.setupEventForwarding();
      });
    } catch (error) {
      logger.error(`[Java] Failed to connect: ${error}`);
      throw error;
    }
  }

  private setupEventForwarding(): void {
    if (!this.bot) return;

    this.bot.on('health', () => {
      this.emit('health', this.bot.health, this.bot.food);
    });

    this.bot.on('chat', (username: string, message: string) => {
      this.emit('chat', username, message);
    });

    this.bot.on('playerJoined', (player: any) => {
      this.emit('playerJoined', player.username);
    });

    this.bot.on('playerLeft', (player: any) => {
      this.emit('playerLeft', player.username);
    });

    this.bot.on('death', () => {
      this.emit('death');
    });
  }

  disconnect(): void {
    if (this.bot) {
      this.bot.quit();
      this.bot = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected && this.bot !== null;
  }

  getUsername(): string {
    return this.username;
  }

  getPosition(): Position {
    if (!this.bot?.entity) {
      return { x: 0, y: 0, z: 0 };
    }
    return {
      x: this.bot.entity.position.x,
      y: this.bot.entity.position.y,
      z: this.bot.entity.position.z
    };
  }

  getHealth(): number {
    return this.bot?.health ?? 20;
  }

  getFood(): number {
    return this.bot?.food ?? 20;
  }

  getGameMode(): string {
    return this.bot?.game?.gameMode ?? 'survival';
  }

  /**
   * Initialize smart pathfinder for this bot
   */
  private initializeSmartPathfinder(): void {
    if (this.smartPathfinder || !this.bot) return;
    
    try {
      this.smartPathfinder = createJavaPathfinder(this.bot);
      this.pathExecutor = new PathExecutor(this.smartPathfinder, {
        moveTo: async (pos) => {
          // Direct movement to adjacent position
          this.lookAt(pos);
          this.bot.setControlState('forward', true);
          await new Promise(resolve => setTimeout(resolve, 250));
          this.bot.setControlState('forward', false);
          return true;
        },
        jump: () => this.jump(),
        sprint: (enable) => this.sprint(enable),
        getPosition: () => this.getPosition(),
        lookAt: (pos) => this.lookAt(pos)
      });
      
      logger.debug(`[Java] Smart pathfinder initialized for ${this.username}`);
    } catch (error) {
      logger.warn(`[Java] Could not initialize smart pathfinder: ${error}`);
    }
  }

  async moveTo(position: Position): Promise<boolean> {
    if (!this.bot) return false;
    
    try {
      // First try mineflayer-pathfinder (most reliable for Java)
      if (this.bot.pathfinder && this.pathfinderLoaded) {
        const { goals, Movements } = await import('mineflayer-pathfinder');
        
        const movements = new Movements(this.bot);
        movements.allowSprinting = true;
        movements.canDig = false; // Don't dig blocks
        this.bot.pathfinder.setMovements(movements);
        
        await this.bot.pathfinder.goto(new goals.GoalNear(position.x, position.y, position.z, 1));
        return true;
      }
      
      // Second try: Smart pathfinder (custom A* implementation)
      if (!this.smartPathfinder) {
        this.initializeSmartPathfinder();
      }
      
      if (this.pathExecutor) {
        const success = await this.pathExecutor.navigateTo(position);
        if (success) return true;
      }
      
      // Final fallback: Simple direct movement
      const currentPos = this.getPosition();
      const distance = Math.sqrt(
        Math.pow(position.x - currentPos.x, 2) +
        Math.pow(position.z - currentPos.z, 2)
      );
      
      // Look at target
      this.lookAt(position);
      
      // Sprint if far, walk if close
      if (distance > 10) {
        this.sprint(true);
      }
      
      // Move forward
      this.bot.setControlState('forward', true);
      
      // Calculate move time based on distance (4.3 blocks/sec walking, 5.6 sprinting)
      const speed = distance > 10 ? 5.6 : 4.3;
      const moveTime = Math.min((distance / speed) * 1000, 5000); // Max 5 seconds
      
      await new Promise(resolve => setTimeout(resolve, moveTime));
      
      this.bot.setControlState('forward', false);
      this.sprint(false);
      
      return true;
    } catch (error) {
      logger.debug(`[Java] MoveTo failed: ${error}`);
      return false;
    }
  }

  lookAt(position: Position): void {
    this.bot?.lookAt({ x: position.x, y: position.y, z: position.z });
  }

  jump(): void {
    this.bot?.setControlState('jump', true);
    setTimeout(() => this.bot?.setControlState('jump', false), 100);
  }

  sneak(enable: boolean): void {
    this.bot?.setControlState('sneak', enable);
  }

  sprint(enable: boolean): void {
    this.bot?.setControlState('sprint', enable);
  }

  attack(entityId: number): void {
    const entity = this.bot?.entities[entityId];
    if (entity) {
      this.bot.attack(entity);
    }
  }

  useItem(): void {
    this.bot?.activateItem();
  }

  async placeBlock(position: Position): Promise<boolean> {
    try {
      const block = this.bot?.blockAt({ x: position.x, y: position.y - 1, z: position.z });
      if (block) {
        await this.bot.placeBlock(block, { x: 0, y: 1, z: 0 });
        return true;
      }
    } catch (error) {
      logger.debug(`[Java] Place block failed: ${error}`);
    }
    return false;
  }

  async breakBlock(position: Position): Promise<boolean> {
    try {
      const block = this.bot?.blockAt(position);
      if (block) {
        await this.bot.dig(block);
        return true;
      }
    } catch (error) {
      logger.debug(`[Java] Break block failed: ${error}`);
    }
    return false;
  }

  getInventory(): InventoryItem[] {
    if (!this.bot?.inventory) return [];
    
    return this.bot.inventory.items().map((item: any) => ({
      slot: item.slot,
      name: item.name,
      count: item.count,
      metadata: item.nbt
    }));
  }

  selectSlot(slot: number): void {
    this.bot?.setQuickBarSlot(slot);
  }

  equipItem(itemName: string): boolean {
    const item = this.bot?.inventory.items().find((i: any) => i.name.includes(itemName));
    if (item) {
      this.bot.equip(item, 'hand');
      return true;
    }
    return false;
  }

  dropItem(slot: number, count?: number): void {
    const item = this.bot?.inventory.slots[slot];
    if (item) {
      this.bot.tossStack(item);
    }
  }

  getBlockAt(position: Position): BlockInfo | null {
    const block = this.bot?.blockAt(position);
    if (!block) return null;
    
    return {
      position,
      type: block.name,
      metadata: block.metadata
    };
  }

  getNearbyEntities(range: number): EntityInfo[] {
    if (!this.bot) return [];
    
    const entities: EntityInfo[] = [];
    const botPos = this.getPosition();
    
    for (const entity of Object.values(this.bot.entities) as any[]) {
      if (!entity?.position) continue;
      
      const distance = Math.sqrt(
        Math.pow(entity.position.x - botPos.x, 2) +
        Math.pow(entity.position.y - botPos.y, 2) +
        Math.pow(entity.position.z - botPos.z, 2)
      );
      
      if (distance <= range) {
        entities.push({
          id: entity.id,
          type: entity.type,
          position: {
            x: entity.position.x,
            y: entity.position.y,
            z: entity.position.z
          },
          name: entity.username || entity.displayName,
          health: entity.health,
          isHostile: this.isHostileEntity(entity.type)
        });
      }
    }
    
    return entities;
  }

  private isHostileEntity(type: string): boolean {
    const hostileTypes = [
      'zombie', 'skeleton', 'creeper', 'spider', 'enderman',
      'witch', 'slime', 'phantom', 'drowned', 'husk', 'stray',
      'pillager', 'vindicator', 'ravager', 'vex', 'evoker'
    ];
    return hostileTypes.some(h => type.toLowerCase().includes(h));
  }

  getTimeOfDay(): number {
    return this.bot?.time?.timeOfDay ?? 0;
  }

  getWeather(): string {
    if (this.bot?.thunderState > 0) return 'thunder';
    if (this.bot?.rainState > 0) return 'rain';
    return 'clear';
  }

  chat(message: string): void {
    this.bot?.chat(message);
  }

  whisper(username: string, message: string): void {
    this.bot?.whisper(username, message);
  }

  on<K extends keyof MinecraftClientEvents>(event: K, listener: MinecraftClientEvents[K]): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(listener);
  }

  off<K extends keyof MinecraftClientEvents>(event: K, listener: MinecraftClientEvents[K]): void {
    this.eventHandlers.get(event)?.delete(listener);
  }

  private emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          // eslint-disable-next-line @typescript-eslint/ban-types
          (handler as Function)(...args);
        } catch (error) {
          logger.error(`Event handler error: ${error}`);
        }
      }
    }
  }
}

// ============================================================================
// BEDROCK EDITION ADAPTER (bedrock-protocol)
// ============================================================================

/**
 * Bedrock Edition client using bedrock-protocol
 */
export class BedrockEditionClient implements IMinecraftClient {
  private client: any = null; // bedrock-protocol client
  private config: MinecraftConfig;
  private username: string;
  private connected: boolean = false;
  // eslint-disable-next-line @typescript-eslint/ban-types
  private eventHandlers: Map<string, Set<Function>> = new Map();
  
  // State tracking (Bedrock protocol requires manual tracking)
  private position: Position = { x: 0, y: 0, z: 0 };
  private health: number = 20;
  private food: number = 20;
  private gameMode: string = 'survival';
  private inventory: InventoryItem[] = [];
  private entities: Map<number, EntityInfo> = new Map();
  
  // Smart pathfinding for Bedrock
  private smartPathfinder: SmartPathfinder | null = null;
  private pathExecutor: PathExecutor | null = null;
  
  // Block tracking for pathfinding (Bedrock needs to track blocks manually)
  private knownBlocks: Map<string, { type: string; solid: boolean }> = new Map();

  constructor(config: MinecraftConfig, username: string) {
    this.config = config;
    this.username = username;
  }
  
  /**
   * Initialize smart pathfinder for Bedrock
   */
  private initializeSmartPathfinder(): void {
    if (this.smartPathfinder) return;
    
    // Create pathfinder with block checker that uses our tracked blocks
    this.smartPathfinder = new SmartPathfinder((pos) => {
      const key = `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
      const block = this.knownBlocks.get(key);
      
      return {
        isSolid: block?.solid ?? (pos.y < 64), // Assume solid below y=64 if unknown
        isWater: block?.type?.includes('water') ?? false,
        isLava: block?.type?.includes('lava') ?? false,
        isDangerous: block?.type?.includes('lava') || block?.type?.includes('cactus') || false,
        isClimbable: block?.type?.includes('ladder') || block?.type?.includes('vine') || false,
        height: block?.solid ? 1 : 0
      };
    });
    
    this.pathExecutor = new PathExecutor(this.smartPathfinder, {
      moveTo: async (pos) => {
        // Send move packet to Bedrock server
        if (this.client) {
          this.client.write('move_player', {
            runtime_id: 1,
            position: { x: pos.x, y: pos.y, z: pos.z },
            pitch: 0,
            yaw: this.calculateYaw(this.position, pos),
            head_yaw: this.calculateYaw(this.position, pos),
            mode: 'normal',
            on_ground: true
          });
          this.position = pos;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        return true;
      },
      jump: () => this.jump(),
      sprint: (enable) => this.sprint(enable),
      getPosition: () => this.getPosition(),
      lookAt: (pos) => this.lookAt(pos)
    });
    
    logger.debug(`[Bedrock] Smart pathfinder initialized for ${this.username}`);
  }
  
  /**
   * Calculate yaw angle between two positions
   */
  private calculateYaw(from: Position, to: Position): number {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    return Math.atan2(dz, dx) * (180 / Math.PI) - 90;
  }

  async connect(): Promise<void> {
    logger.info(`[Bedrock] Connecting ${this.username} to ${this.config.host}:${this.config.port}`);
    
    try {
      // Dynamic import for bedrock-protocol
      const bedrock = await import('bedrock-protocol');
      
      const options: any = {
        host: this.config.host,
        port: this.config.port,
        username: this.username,
        offline: true, // Offline mode for bot accounts
        version: this.config.version
      };

      // Configure authentication if specified
      if (this.config.bedrockAuth?.deviceAuth) {
        options.offline = false;
        options.profilesFolder = './data/bedrock-auth';
      }

      this.client = bedrock.createClient(options);

      return new Promise((resolve, reject) => {
        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
          if (!this.connected) {
            const err = new Error(`Connection timeout after 30 seconds to ${this.config.host}:${this.config.port}`);
            logger.error(`[Bedrock] ${err.message}`);
            this.emit('error', err);
            reject(err);
          }
        }, 30000);

        this.client.on('join', () => {
          clearTimeout(connectionTimeout);
          this.connected = true;
          logger.info(`[Bedrock] ${this.username} joined successfully`);
          
          // Initialize smart pathfinder for Bedrock
          this.initializeSmartPathfinder();
          
          this.emit('spawn');
          resolve();
        });

        this.client.on('error', (err: Error) => {
          clearTimeout(connectionTimeout);
          logger.error(`[Bedrock] Connection error: ${err.message}`);
          this.emit('error', err);
          reject(err);
        });

        this.client.on('disconnect', (packet: any) => {
          clearTimeout(connectionTimeout);
          logger.warn(`[Bedrock] ${this.username} disconnected: ${packet.reason || 'Unknown'}`);
          this.connected = false;
          this.emit('kicked', packet.reason || 'Disconnected');
        });

        this.client.on('close', () => {
          clearTimeout(connectionTimeout);
          this.connected = false;
          this.emit('end');
        });

        // Set up packet handlers
        this.setupPacketHandlers();
      });
    } catch (error) {
      logger.error(`[Bedrock] Failed to connect: ${error}`);
      throw error;
    }
  }

  private setupPacketHandlers(): void {
    if (!this.client) return;

    // Position updates
    this.client.on('move_player', (packet: any) => {
      this.position = {
        x: packet.position.x,
        y: packet.position.y,
        z: packet.position.z
      };
    });

    // Health updates
    this.client.on('update_attributes', (packet: any) => {
      for (const attr of packet.attributes || []) {
        if (attr.name === 'minecraft:health') {
          const oldHealth = this.health;
          this.health = attr.current;
          this.emit('health', this.health, this.food);
          
          if (this.health <= 0 && oldHealth > 0) {
            this.emit('death');
          }
        }
        if (attr.name === 'minecraft:player.hunger') {
          this.food = attr.current;
        }
      }
    });

    // Chat messages
    this.client.on('text', (packet: any) => {
      if (packet.type === 'chat') {
        this.emit('chat', packet.source_name || 'Unknown', packet.message);
      }
    });

    // Player list
    this.client.on('player_list', (packet: any) => {
      for (const record of packet.records?.records || []) {
        if (packet.records.type === 'add') {
          this.emit('playerJoined', record.username);
        } else if (packet.records.type === 'remove') {
          this.emit('playerLeft', record.username);
        }
      }
    });

    // Entity spawns
    this.client.on('add_entity', (packet: any) => {
      const entity: EntityInfo = {
        id: packet.runtime_id,
        type: packet.entity_type || 'unknown',
        position: {
          x: packet.position?.x || 0,
          y: packet.position?.y || 0,
          z: packet.position?.z || 0
        },
        isHostile: this.isHostileEntity(packet.entity_type || '')
      };
      this.entities.set(entity.id, entity);
      this.emit('entitySpawn', entity);
    });

    // Entity removal
    this.client.on('remove_entity', (packet: any) => {
      this.entities.delete(packet.entity_id_self);
    });

    // Inventory updates
    this.client.on('inventory_content', (packet: any) => {
      this.inventory = (packet.input || []).map((item: any, index: number) => ({
        slot: index,
        name: item?.network_id ? `item_${item.network_id}` : 'air',
        count: item?.count || 0
      }));
    });

    // Game mode
    this.client.on('set_player_game_type', (packet: any) => {
      const modes = ['survival', 'creative', 'adventure', 'spectator'];
      this.gameMode = modes[packet.game_type] || 'survival';
    });
  }

  disconnect(): void {
    if (this.client) {
      this.client.close();
      this.client = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  getUsername(): string {
    return this.username;
  }

  getPosition(): Position {
    return { ...this.position };
  }

  getHealth(): number {
    return this.health;
  }

  getFood(): number {
    return this.food;
  }

  getGameMode(): string {
    return this.gameMode;
  }

  async moveTo(position: Position): Promise<boolean> {
    if (!this.client) return false;
    
    // Use smart pathfinder for intelligent movement
    if (this.pathExecutor) {
      try {
        const success = await this.pathExecutor.navigateTo(position);
        if (success) return true;
      } catch (error) {
        logger.debug(`[Bedrock] Smart pathfinder failed: ${error}`);
      }
    }
    
    // Fallback: Smooth interpolated movement
    const currentPos = this.getPosition();
    const distance = Math.sqrt(
      Math.pow(position.x - currentPos.x, 2) +
      Math.pow(position.z - currentPos.z, 2)
    );
    
    // Calculate number of steps for smooth movement
    const steps = Math.max(5, Math.ceil(distance / 0.5));
    const stepDelay = 50; // 50ms between steps
    
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const interpolatedPos: Position = {
        x: currentPos.x + (position.x - currentPos.x) * t,
        y: currentPos.y + (position.y - currentPos.y) * t,
        z: currentPos.z + (position.z - currentPos.z) * t
      };
      
      const yaw = this.calculateYaw(this.position, position);
      
      this.client.write('move_player', {
        runtime_id: 1,
        position: { x: interpolatedPos.x, y: interpolatedPos.y, z: interpolatedPos.z },
        pitch: 0,
        yaw: yaw,
        head_yaw: yaw,
        mode: 'normal',
        on_ground: true
      });
      
      this.position = interpolatedPos;
      
      await new Promise(resolve => setTimeout(resolve, stepDelay));
    }
    
    return true;
  }

  lookAt(position: Position): void {
    if (!this.client) return;
    
    // Calculate yaw and pitch
    const dx = position.x - this.position.x;
    const dy = position.y - this.position.y;
    const dz = position.z - this.position.z;
    
    const yaw = Math.atan2(dz, dx) * (180 / Math.PI) - 90;
    const pitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)) * (180 / Math.PI);
    
    this.client.write('move_player', {
      runtime_id: 1,
      position: this.position,
      pitch,
      yaw,
      head_yaw: yaw,
      mode: 'head_rotation',
      on_ground: true
    });
  }

  jump(): void {
    if (!this.client) return;
    
    this.client.write('player_action', {
      runtime_id: 1,
      action: 'jump',
      position: this.position,
      face: 0
    });
  }

  sneak(enable: boolean): void {
    if (!this.client) return;
    
    this.client.write('player_action', {
      runtime_id: 1,
      action: enable ? 'start_sneak' : 'stop_sneak',
      position: this.position,
      face: 0
    });
  }

  sprint(enable: boolean): void {
    if (!this.client) return;
    
    this.client.write('player_action', {
      runtime_id: 1,
      action: enable ? 'start_sprint' : 'stop_sprint',
      position: this.position,
      face: 0
    });
  }

  attack(entityId: number): void {
    if (!this.client) return;
    
    this.client.write('interact', {
      action: 'attack',
      target_entity_id: entityId
    });
  }

  useItem(): void {
    if (!this.client) return;
    
    this.client.write('inventory_transaction', {
      transaction_type: 'item_use',
      actions: [],
      transaction_data: {
        action_type: 'use',
        block_position: { x: 0, y: 0, z: 0 },
        face: 0,
        hotbar_slot: 0,
        held_item: {},
        player_position: this.position,
        click_position: { x: 0, y: 0, z: 0 },
        block_runtime_id: 0
      }
    });
  }

  async placeBlock(position: Position): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      this.client.write('inventory_transaction', {
        transaction_type: 'item_use',
        actions: [],
        transaction_data: {
          action_type: 'place',
          block_position: position,
          face: 1, // Top face
          hotbar_slot: 0,
          held_item: {},
          player_position: this.position,
          click_position: { x: 0.5, y: 1, z: 0.5 },
          block_runtime_id: 0
        }
      });
      return true;
    } catch (error) {
      logger.debug(`[Bedrock] Place block failed: ${error}`);
      return false;
    }
  }

  async breakBlock(position: Position): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      this.client.write('player_action', {
        runtime_id: 1,
        action: 'start_break',
        position,
        face: 0
      });
      
      // Simulate break time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.client.write('player_action', {
        runtime_id: 1,
        action: 'stop_break',
        position,
        face: 0
      });
      
      return true;
    } catch (error) {
      logger.debug(`[Bedrock] Break block failed: ${error}`);
      return false;
    }
  }

  getInventory(): InventoryItem[] {
    return [...this.inventory];
  }

  selectSlot(slot: number): void {
    if (!this.client) return;
    
    this.client.write('player_hotbar', {
      selected_slot: slot,
      container_id: 0,
      should_select_slot: true
    });
  }

  equipItem(itemName: string): boolean {
    const item = this.inventory.find(i => i.name.includes(itemName));
    if (item) {
      this.selectSlot(item.slot);
      return true;
    }
    return false;
  }

  dropItem(slot: number, count?: number): void {
    if (!this.client) return;
    
    this.client.write('inventory_transaction', {
      transaction_type: 'normal',
      actions: [{
        source_type: 'container',
        container_id: 0,
        slot,
        old_item: this.inventory[slot] || {},
        new_item: {}
      }]
    });
  }

  getBlockAt(position: Position): BlockInfo | null {
    // Bedrock protocol doesn't provide easy block queries
    // This would require chunk caching
    return null;
  }

  getNearbyEntities(range: number): EntityInfo[] {
    const nearby: EntityInfo[] = [];
    
    for (const entity of this.entities.values()) {
      const distance = Math.sqrt(
        Math.pow(entity.position.x - this.position.x, 2) +
        Math.pow(entity.position.y - this.position.y, 2) +
        Math.pow(entity.position.z - this.position.z, 2)
      );
      
      if (distance <= range) {
        nearby.push(entity);
      }
    }
    
    return nearby;
  }

  private isHostileEntity(type: string): boolean {
    const hostileTypes = [
      'zombie', 'skeleton', 'creeper', 'spider', 'enderman',
      'witch', 'slime', 'phantom', 'drowned', 'husk', 'stray',
      'pillager', 'vindicator', 'ravager', 'vex', 'evoker'
    ];
    return hostileTypes.some(h => type.toLowerCase().includes(h));
  }

  getTimeOfDay(): number {
    // Would need to track from level_event or set_time packets
    return 6000; // Default to noon
  }

  getWeather(): string {
    return 'clear';
  }

  chat(message: string): void {
    if (!this.client) return;
    
    this.client.write('text', {
      type: 'chat',
      needs_translation: false,
      source_name: this.username,
      message
    });
  }

  whisper(username: string, message: string): void {
    this.chat(`/tell ${username} ${message}`);
  }

  on<K extends keyof MinecraftClientEvents>(event: K, listener: MinecraftClientEvents[K]): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(listener);
  }

  off<K extends keyof MinecraftClientEvents>(event: K, listener: MinecraftClientEvents[K]): void {
    this.eventHandlers.get(event)?.delete(listener);
  }

  private emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          // eslint-disable-next-line @typescript-eslint/ban-types
          (handler as Function)(...args);
        } catch (error) {
          logger.error(`Event handler error: ${error}`);
        }
      }
    }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a Minecraft client based on edition
 */
export function createMinecraftClient(
  config: MinecraftConfig, 
  username: string
): IMinecraftClient {
  const edition = config.edition || 'java';
  
  logger.info(`Creating ${edition} edition client for ${username}`);
  
  switch (edition) {
    case 'bedrock':
      return new BedrockEditionClient(config, username);
    case 'java':
    default:
      return new JavaEditionClient(config, username);
  }
}

/**
 * Check if an edition's dependencies are installed
 */
export async function checkEditionSupport(edition: MinecraftEdition): Promise<boolean> {
  try {
    if (edition === 'java') {
      await import('mineflayer');
      return true;
    } else if (edition === 'bedrock') {
      await import('bedrock-protocol');
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export default {
  JavaEditionClient,
  BedrockEditionClient,
  createMinecraftClient,
  checkEditionSupport
};
