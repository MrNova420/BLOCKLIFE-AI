/**
 * BlockLife AI - Minecraft Adapter
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Interface to Minecraft via mineflayer.
 * This provides abstraction over the raw protocol.
 */

import { Position, TimeOfDay, ThreatLevel, MinecraftConfig } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('mc');

/**
 * Minecraft entity (mob, player, etc.)
 */
export interface McEntity {
  id: number;
  type: string;
  name: string;
  position: Position;
  isHostile: boolean;
  health?: number;
}

/**
 * Block information
 */
export interface McBlock {
  position: Position;
  type: string;
  metadata: number;
}

/**
 * World adapter interface
 */
export interface WorldAdapter {
  // Connection
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // World state
  getTimeOfDay(): TimeOfDay;
  getWeather(): 'clear' | 'rain' | 'thunder';
  
  // Entity queries
  getNearbyEntities(position: Position, radius: number): McEntity[];
  getNearbyPlayers(position: Position, radius: number): McEntity[];
  getNearbyHostiles(position: Position, radius: number): McEntity[];
  
  // Block queries
  getBlock(position: Position): McBlock | null;
  getBlocksInRadius(position: Position, radius: number): McBlock[];
  
  // Bot spawning
  spawnBot(name: string, position?: Position): Promise<string>;
  despawnBot(botId: string): Promise<void>;
  
  // Bot actions
  moveBotTo(botId: string, position: Position): Promise<boolean>;
  botLookAt(botId: string, position: Position): Promise<void>;
  botAttack(botId: string, targetEntityId: number): Promise<boolean>;
  botMineBlock(botId: string, position: Position): Promise<boolean>;
  botPlaceBlock(botId: string, position: Position, blockType: string): Promise<boolean>;
  
  // Events
  onEntitySpawn(callback: (entity: McEntity) => void): void;
  onEntityDespawn(callback: (entityId: number) => void): void;
  onChat(callback: (username: string, message: string) => void): void;
  onDamage(callback: (botId: string, damage: number, attacker?: McEntity) => void): void;
}

/**
 * Stub implementation for testing without Minecraft
 */
export class StubWorldAdapter implements WorldAdapter {
  private connected: boolean = false;
  private bots: Map<string, { name: string; position: Position }> = new Map();
  private entities: McEntity[] = [];
  private nextBotId: number = 1;
  
  async connect(): Promise<void> {
    logger.info('Stub world adapter connected (no real Minecraft)');
    this.connected = true;
    
    // Generate some fake entities
    this.entities = [
      {
        id: 1001,
        type: 'zombie',
        name: 'Zombie',
        position: { x: 50, y: 64, z: 50 },
        isHostile: true,
        health: 20
      },
      {
        id: 1002,
        type: 'cow',
        name: 'Cow',
        position: { x: -20, y: 64, z: 30 },
        isHostile: false,
        health: 10
      }
    ];
  }
  
  async disconnect(): Promise<void> {
    logger.info('Stub world adapter disconnected');
    this.connected = false;
    this.bots.clear();
    this.entities = [];
  }
  
  isConnected(): boolean {
    return this.connected;
  }
  
  getTimeOfDay(): TimeOfDay {
    // Simulate day/night based on real time
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 18) return TimeOfDay.DAY;
    if (hour >= 18 && hour < 20) return TimeOfDay.DUSK;
    if (hour >= 20 || hour < 5) return TimeOfDay.NIGHT;
    return TimeOfDay.DAWN;
  }
  
  getWeather(): 'clear' | 'rain' | 'thunder' {
    // Mostly clear with occasional rain
    const rand = Math.random();
    if (rand > 0.9) return 'thunder';
    if (rand > 0.7) return 'rain';
    return 'clear';
  }
  
  getNearbyEntities(position: Position, radius: number): McEntity[] {
    return this.entities.filter(e => {
      const dist = Math.sqrt(
        Math.pow(e.position.x - position.x, 2) +
        Math.pow(e.position.y - position.y, 2) +
        Math.pow(e.position.z - position.z, 2)
      );
      return dist <= radius;
    });
  }
  
  getNearbyPlayers(position: Position, radius: number): McEntity[] {
    return this.getNearbyEntities(position, radius).filter(e => e.type === 'player');
  }
  
  getNearbyHostiles(position: Position, radius: number): McEntity[] {
    return this.getNearbyEntities(position, radius).filter(e => e.isHostile);
  }
  
  getBlock(position: Position): McBlock | null {
    // Simplified: return grass at ground level, air above
    if (position.y < 64) {
      return {
        position,
        type: 'stone',
        metadata: 0
      };
    } else if (position.y === 64) {
      return {
        position,
        type: 'grass_block',
        metadata: 0
      };
    }
    return {
      position,
      type: 'air',
      metadata: 0
    };
  }
  
  getBlocksInRadius(position: Position, radius: number): McBlock[] {
    const blocks: McBlock[] = [];
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        for (let z = -radius; z <= radius; z++) {
          const blockPos = {
            x: position.x + x,
            y: position.y + y,
            z: position.z + z
          };
          const block = this.getBlock(blockPos);
          if (block && block.type !== 'air') {
            blocks.push(block);
          }
        }
      }
    }
    return blocks;
  }
  
  async spawnBot(name: string, position?: Position): Promise<string> {
    const botId = `stub_bot_${this.nextBotId++}`;
    const pos = position || { x: 0, y: 64, z: 0 };
    this.bots.set(botId, { name, position: pos });
    logger.debug(`Spawned stub bot: ${name} at ${JSON.stringify(pos)}`);
    return botId;
  }
  
  async despawnBot(botId: string): Promise<void> {
    this.bots.delete(botId);
    logger.debug(`Despawned stub bot: ${botId}`);
  }
  
  async moveBotTo(botId: string, position: Position): Promise<boolean> {
    const bot = this.bots.get(botId);
    if (!bot) return false;
    
    // Simulate movement (instant in stub)
    bot.position = { ...position };
    return true;
  }
  
  async botLookAt(botId: string, position: Position): Promise<void> {
    // No-op in stub
  }
  
  async botAttack(botId: string, targetEntityId: number): Promise<boolean> {
    // Simulate attack
    const entity = this.entities.find(e => e.id === targetEntityId);
    if (entity && entity.health) {
      entity.health -= 5;
      if (entity.health <= 0) {
        this.entities = this.entities.filter(e => e.id !== targetEntityId);
        return true;
      }
    }
    return false;
  }
  
  async botMineBlock(botId: string, position: Position): Promise<boolean> {
    // Simulate mining success
    return true;
  }
  
  async botPlaceBlock(botId: string, position: Position, blockType: string): Promise<boolean> {
    // Simulate placing success
    return true;
  }
  
  // Event handlers (no-op for stub)
  onEntitySpawn(callback: (entity: McEntity) => void): void {
    // Could simulate random spawns
  }
  
  onEntityDespawn(callback: (entityId: number) => void): void {
    // Could simulate despawns
  }
  
  onChat(callback: (username: string, message: string) => void): void {
    // No-op
  }
  
  onDamage(callback: (botId: string, damage: number, attacker?: McEntity) => void): void {
    // No-op
  }
}

/**
 * Calculate threat level from nearby entities
 */
export function calculateThreatLevel(entities: McEntity[]): ThreatLevel {
  const hostiles = entities.filter(e => e.isHostile);
  
  if (hostiles.length === 0) return ThreatLevel.NONE;
  if (hostiles.length <= 2) return ThreatLevel.LOW;
  if (hostiles.length <= 5) return ThreatLevel.MEDIUM;
  return ThreatLevel.HIGH;
}

// Singleton instance
let worldAdapterInstance: WorldAdapter | null = null;

/**
 * Initialize the world adapter
 */
export function initializeWorldAdapter(config: MinecraftConfig): WorldAdapter {
  // For now, always use stub adapter
  // TODO: Implement real mineflayer adapter
  worldAdapterInstance = new StubWorldAdapter();
  return worldAdapterInstance;
}

/**
 * Get the world adapter singleton
 */
export function getWorldAdapter(): WorldAdapter {
  if (!worldAdapterInstance) {
    worldAdapterInstance = new StubWorldAdapter();
  }
  return worldAdapterInstance;
}

/**
 * Reset the world adapter
 */
export function resetWorldAdapter(): void {
  if (worldAdapterInstance) {
    worldAdapterInstance.disconnect();
  }
  worldAdapterInstance = null;
}

export default {
  initializeWorldAdapter,
  getWorldAdapter,
  resetWorldAdapter,
  StubWorldAdapter,
  calculateThreatLevel
};
