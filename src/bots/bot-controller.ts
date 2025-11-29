/**
 * BlockLife AI - Bot Controller
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * CRITICAL BRIDGE: Connects Bot Agents (AI decisions) to Minecraft Clients (in-game actions)
 * This is what makes bots actually DO things in the game.
 */

import { BotAgent } from './bot-agent';
import { IMinecraftClient } from './mc-adapter';
import { getConnectionManager } from './connection-manager';
import { Position, Task, BotIntent } from '../types';
import { createLogger } from '../utils/logger';
import { getSystemStatus, EventCategory, LogLevel } from '../utils/system-status';

const logger = createLogger('bot-controller');

/**
 * Bot Controller - Executes bot decisions in Minecraft
 */
export class BotController {
  private botAgent: BotAgent;
  private client: IMinecraftClient | null = null;
  private isExecuting: boolean = false;
  private currentAction: string = 'idle';
  private lastActionTime: number = 0;
  private actionCooldown: number = 1000; // 1 second between actions

  constructor(botAgent: BotAgent) {
    this.botAgent = botAgent;
  }

  /**
   * Set the Minecraft client for this bot
   */
  setClient(client: IMinecraftClient): void {
    this.client = client;
    this.setupClientEvents();
    logger.info(`${this.botAgent.name} connected to Minecraft`);
  }

  /**
   * Get the associated bot agent
   */
  getAgent(): BotAgent {
    return this.botAgent;
  }

  /**
   * Check if bot has an active Minecraft connection
   */
  isConnected(): boolean {
    return this.client !== null && this.client.isConnected();
  }

  /**
   * Set up event handlers for the Minecraft client
   */
  private setupClientEvents(): void {
    if (!this.client) return;

    this.client.on('spawn', () => {
      logger.info(`${this.botAgent.name} spawned in world`);
      this.botAgent.addRecentEvent('Spawned into the world');
      
      // Update position from client
      const pos = this.client!.getPosition();
      this.botAgent.setPosition(pos);
    });

    this.client.on('health', (health: number, food: number) => {
      // Sync health/food with bot needs
      const needs = this.botAgent.getNeeds();
      
      // Convert food (0-20) to hunger need (0-100, higher = more hungry)
      const hungerNeed = Math.max(0, 100 - (food / 20) * 100);
      needs.hunger = hungerNeed;
      
      // If health is low, increase safety need
      if (health < 10) {
        needs.safety = Math.min(100, needs.safety + 30);
        this.botAgent.addRecentEvent('Health is low!');
      }
    });

    this.client.on('death', () => {
      logger.warn(`${this.botAgent.name} died!`);
      this.botAgent.addRecentEvent('Died');
      this.botAgent.markDead();
      
      const status = getSystemStatus();
      status.logEvent({
        category: EventCategory.DEATH,
        level: LogLevel.WARN,
        source: 'bot-controller',
        botId: this.botAgent.id,
        message: `${this.botAgent.name} has died`
      });
    });

    this.client.on('chat', (username: string, message: string) => {
      if (username !== this.client!.getUsername()) {
        this.botAgent.addRecentEvent(`Heard ${username} say: "${message}"`);
      }
    });
  }

  /**
   * Execute the bot's current task in Minecraft
   * This is called every tick to make the bot actually DO things
   */
  async tick(): Promise<void> {
    if (!this.isConnected() || this.isExecuting) return;
    
    const now = Date.now();
    if (now - this.lastActionTime < this.actionCooldown) return;
    
    const task = this.botAgent.getCurrentTask();
    if (!task) {
      await this.executeIdle();
      return;
    }

    this.isExecuting = true;
    this.lastActionTime = now;

    try {
      switch (task.type) {
        case 'SLEEP':
          await this.executeSleep();
          break;
        case 'EAT':
          await this.executeEat();
          break;
        case 'FARMING':
          await this.executeFarming(task);
          break;
        case 'MINING':
          await this.executeMining(task);
          break;
        case 'WOODCUTTING':
          await this.executeWoodcutting();
          break;
        case 'BUILDING':
          await this.executeBuilding(task);
          break;
        case 'PATROL':
          await this.executePatrol();
          break;
        case 'DEFEND':
          await this.executeDefend();
          break;
        case 'FLEE':
          await this.executeFlee();
          break;
        case 'EXPLORE':
          await this.executeExplore();
          break;
        case 'SOCIALIZE':
          await this.executeSocialize();
          break;
        default:
          await this.executeIdle();
      }

      // Update task progress
      task.progress = Math.min(100, task.progress + 10);
      
      // Complete task if done
      if (task.progress >= 100) {
        this.botAgent.completeCurrentTask();
        logger.debug(`${this.botAgent.name} completed task: ${task.type}`);
      }

    } catch (error) {
      logger.error(`${this.botAgent.name} action error: ${error}`);
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Idle behavior - look around, small movements
   */
  private async executeIdle(): Promise<void> {
    if (!this.client) return;
    this.currentAction = 'idle';
    
    // Occasionally look around
    if (Math.random() < 0.1) {
      const pos = this.client.getPosition();
      const lookPos: Position = {
        x: pos.x + (Math.random() - 0.5) * 10,
        y: pos.y + (Math.random() - 0.5) * 2,
        z: pos.z + (Math.random() - 0.5) * 10
      };
      this.client.lookAt(lookPos);
    }
  }

  /**
   * Sleep - find a safe spot and wait
   */
  private async executeSleep(): Promise<void> {
    if (!this.client) return;
    this.currentAction = 'sleeping';
    
    // Just stand still and regenerate energy
    const needs = this.botAgent.getNeeds();
    needs.energy = Math.max(0, needs.energy - 5);
    
    this.botAgent.addRecentEvent('Resting to recover energy');
  }

  /**
   * Eat - look for food and consume it
   */
  private async executeEat(): Promise<void> {
    if (!this.client) return;
    this.currentAction = 'eating';
    
    // Check inventory for food
    const inventory = this.client.getInventory();
    const foodItems = ['apple', 'bread', 'cooked_beef', 'cooked_porkchop', 'cooked_chicken', 'carrot', 'potato', 'baked_potato'];
    
    const food = inventory.find(item => 
      foodItems.some(f => item.name.toLowerCase().includes(f))
    );
    
    if (food) {
      this.client.equipItem(food.name);
      this.client.useItem();
      
      const needs = this.botAgent.getNeeds();
      needs.hunger = Math.max(0, needs.hunger - 30);
      
      this.botAgent.addRecentEvent(`Ate ${food.name}`);
    } else {
      this.botAgent.addRecentEvent('Looking for food...');
      // Move around looking for food
      await this.moveRandomly(5);
    }
  }

  /**
   * Farming - tend crops, plant, harvest
   */
  private async executeFarming(task: Task): Promise<void> {
    if (!this.client) return;
    this.currentAction = 'farming';
    
    const subType = task.data?.subType;
    
    if (subType === 'HARVEST_CROPS') {
      // Look for mature crops nearby
      this.botAgent.addRecentEvent('Harvesting crops');
      await this.moveRandomly(3);
      
      // Simulate harvesting by breaking blocks below
      const pos = this.client.getPosition();
      const cropPos: Position = { x: Math.floor(pos.x), y: Math.floor(pos.y) - 1, z: Math.floor(pos.z) };
      await this.client.breakBlock(cropPos);
    } else {
      // Tend farm - just move around farm area
      this.botAgent.addRecentEvent('Tending the farm');
      await this.moveRandomly(5);
    }
  }

  /**
   * Mining - dig down, find ores
   */
  private async executeMining(task: Task): Promise<void> {
    if (!this.client) return;
    this.currentAction = 'mining';
    
    this.botAgent.addRecentEvent('Mining for resources');
    
    // Mine the block in front or below
    const pos = this.client.getPosition();
    const minePositions: Position[] = [
      { x: Math.floor(pos.x) + 1, y: Math.floor(pos.y), z: Math.floor(pos.z) },
      { x: Math.floor(pos.x) - 1, y: Math.floor(pos.y), z: Math.floor(pos.z) },
      { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) + 1 },
      { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) - 1 },
      { x: Math.floor(pos.x), y: Math.floor(pos.y) - 1, z: Math.floor(pos.z) }
    ];
    
    const targetPos = minePositions[Math.floor(Math.random() * minePositions.length)];
    await this.client.breakBlock(targetPos);
    
    // Move forward after mining
    await this.client.moveTo(targetPos);
  }

  /**
   * Woodcutting - find and chop trees
   */
  private async executeWoodcutting(): Promise<void> {
    if (!this.client) return;
    this.currentAction = 'chopping wood';
    
    this.botAgent.addRecentEvent('Chopping wood');
    
    // Look for wood blocks nearby and break them
    const pos = this.client.getPosition();
    
    // Check blocks around for wood
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = 0; dy <= 3; dy++) {
          const checkPos: Position = {
            x: Math.floor(pos.x) + dx,
            y: Math.floor(pos.y) + dy,
            z: Math.floor(pos.z) + dz
          };
          
          const block = this.client.getBlockAt(checkPos);
          if (block && (block.type.includes('log') || block.type.includes('wood'))) {
            await this.client.breakBlock(checkPos);
            return;
          }
        }
      }
    }
    
    // No wood found, move to find some
    await this.moveRandomly(10);
  }

  /**
   * Building - place blocks to construct
   */
  private async executeBuilding(task: Task): Promise<void> {
    if (!this.client) return;
    this.currentAction = 'building';
    
    this.botAgent.addRecentEvent('Building a structure');
    
    // Simple building: place a block nearby
    const pos = this.client.getPosition();
    const buildPos: Position = {
      x: Math.floor(pos.x) + Math.round(Math.random() * 2 - 1),
      y: Math.floor(pos.y),
      z: Math.floor(pos.z) + Math.round(Math.random() * 2 - 1)
    };
    
    // Try to equip a building material
    const inventory = this.client.getInventory();
    const buildMaterials = ['cobblestone', 'stone', 'dirt', 'oak_planks', 'spruce_planks'];
    const material = inventory.find(item =>
      buildMaterials.some(m => item.name.toLowerCase().includes(m))
    );
    
    if (material) {
      this.client.equipItem(material.name);
      await this.client.placeBlock(buildPos);
    }
  }

  /**
   * Patrol - walk around the area
   */
  private async executePatrol(): Promise<void> {
    if (!this.client) return;
    this.currentAction = 'patrolling';
    
    this.botAgent.addRecentEvent('Patrolling the area');
    
    // Move in a patrol pattern
    await this.moveRandomly(15);
    
    // Look around for threats
    const entities = this.client.getNearbyEntities(20);
    const threats = entities.filter(e => e.isHostile);
    
    if (threats.length > 0) {
      this.botAgent.addRecentEvent(`Spotted ${threats.length} hostile entities!`);
      const needs = this.botAgent.getNeeds();
      needs.safety = Math.min(100, needs.safety + 20);
    }
  }

  /**
   * Defend - attack nearby threats
   */
  private async executeDefend(): Promise<void> {
    if (!this.client) return;
    this.currentAction = 'defending';
    
    const entities = this.client.getNearbyEntities(10);
    const threats = entities.filter(e => e.isHostile);
    
    if (threats.length > 0) {
      const nearest = threats[0];
      this.botAgent.addRecentEvent(`Fighting ${nearest.type}!`);
      
      // Move toward and attack
      await this.client.moveTo(nearest.position);
      this.client.attack(nearest.id);
    } else {
      this.botAgent.addRecentEvent('Area is secure');
      await this.executePatrol();
    }
  }

  /**
   * Flee - run away from danger
   */
  private async executeFlee(): Promise<void> {
    if (!this.client) return;
    this.currentAction = 'fleeing';
    
    this.botAgent.addRecentEvent('Running to safety!');
    
    const pos = this.client.getPosition();
    const entities = this.client.getNearbyEntities(20);
    const threats = entities.filter(e => e.isHostile);
    
    if (threats.length > 0) {
      // Run away from the nearest threat
      const threat = threats[0];
      const fleeDir = {
        x: pos.x - threat.position.x,
        y: 0,
        z: pos.z - threat.position.z
      };
      
      // Normalize and scale
      const len = Math.sqrt(fleeDir.x * fleeDir.x + fleeDir.z * fleeDir.z) || 1;
      const fleePos: Position = {
        x: pos.x + (fleeDir.x / len) * 20,
        y: pos.y,
        z: pos.z + (fleeDir.z / len) * 20
      };
      
      this.client.sprint(true);
      await this.client.moveTo(fleePos);
      this.client.sprint(false);
    } else {
      // No immediate threat, just move away
      await this.moveRandomly(20);
    }
  }

  /**
   * Explore - wander and discover
   */
  private async executeExplore(): Promise<void> {
    if (!this.client) return;
    this.currentAction = 'exploring';
    
    this.botAgent.addRecentEvent('Exploring the world');
    
    // Move in a random direction
    await this.moveRandomly(25);
    
    // Look around
    const pos = this.client.getPosition();
    this.client.lookAt({
      x: pos.x + (Math.random() - 0.5) * 20,
      y: pos.y + 5,
      z: pos.z + (Math.random() - 0.5) * 20
    });
  }

  /**
   * Socialize - interact with other bots
   */
  private async executeSocialize(): Promise<void> {
    if (!this.client) return;
    this.currentAction = 'socializing';
    
    // Find nearby players/bots
    const entities = this.client.getNearbyEntities(15);
    const others = entities.filter(e => e.type === 'player' && e.name !== this.client!.getUsername());
    
    if (others.length > 0) {
      const other = others[Math.floor(Math.random() * others.length)];
      this.botAgent.addRecentEvent(`Chatting with ${other.name || 'someone'}`);
      
      // Move toward them
      await this.client.moveTo(other.position);
      
      // Say something
      const greetings = [
        'Hello there!',
        'Nice day, isnt it?',
        'How goes the work?',
        'Stay safe out there!',
        'Need any help?'
      ];
      this.client.chat(greetings[Math.floor(Math.random() * greetings.length)]);
      
      // Reduce social need
      const needs = this.botAgent.getNeeds();
      needs.social = Math.max(0, needs.social - 15);
    } else {
      this.botAgent.addRecentEvent('Looking for someone to talk to');
      await this.moveRandomly(10);
    }
  }

  /**
   * Move to a random nearby location
   */
  private async moveRandomly(radius: number): Promise<void> {
    if (!this.client) return;
    
    const pos = this.client.getPosition();
    const targetPos: Position = {
      x: pos.x + (Math.random() - 0.5) * radius * 2,
      y: pos.y,
      z: pos.z + (Math.random() - 0.5) * radius * 2
    };
    
    await this.client.moveTo(targetPos);
    
    // Update bot agent position
    this.botAgent.setPosition(this.client.getPosition());
  }

  /**
   * Get current action description
   */
  getCurrentAction(): string {
    return this.currentAction;
  }

  /**
   * Disconnect from Minecraft
   */
  disconnect(): void {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
  }
}

// ============================================================================
// BOT CONTROLLER MANAGER
// ============================================================================

/**
 * Manages all bot controllers
 */
export class BotControllerManager {
  private controllers: Map<string, BotController> = new Map();
  private tickInterval: NodeJS.Timeout | null = null;
  private tickRate: number = 500; // 500ms per tick

  /**
   * Create a controller for a bot agent
   */
  createController(botAgent: BotAgent): BotController {
    const controller = new BotController(botAgent);
    this.controllers.set(botAgent.id, controller);
    return controller;
  }

  /**
   * Get controller for a bot
   */
  getController(botId: string): BotController | undefined {
    return this.controllers.get(botId);
  }

  /**
   * Remove a controller
   */
  removeController(botId: string): void {
    const controller = this.controllers.get(botId);
    if (controller) {
      controller.disconnect();
      this.controllers.delete(botId);
    }
  }

  /**
   * Start the tick loop for all controllers
   */
  startTicking(): void {
    if (this.tickInterval) return;
    
    this.tickInterval = setInterval(() => {
      this.tickAll();
    }, this.tickRate);
    
    logger.info('Bot controller tick loop started');
  }

  /**
   * Stop the tick loop
   */
  stopTicking(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    logger.info('Bot controller tick loop stopped');
  }

  /**
   * Tick all controllers
   */
  private async tickAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (const controller of this.controllers.values()) {
      if (controller.isConnected()) {
        promises.push(controller.tick());
      }
    }
    
    await Promise.allSettled(promises);
  }

  /**
   * Get stats about connected bots
   */
  getStats(): { total: number; connected: number; actions: Record<string, number> } {
    const actions: Record<string, number> = {};
    let connected = 0;
    
    for (const controller of this.controllers.values()) {
      if (controller.isConnected()) {
        connected++;
        const action = controller.getCurrentAction();
        actions[action] = (actions[action] || 0) + 1;
      }
    }
    
    return {
      total: this.controllers.size,
      connected,
      actions
    };
  }

  /**
   * Disconnect all bots
   */
  disconnectAll(): void {
    for (const controller of this.controllers.values()) {
      controller.disconnect();
    }
    this.controllers.clear();
  }
}

// Singleton
let controllerManager: BotControllerManager | null = null;

export function getBotControllerManager(): BotControllerManager {
  if (!controllerManager) {
    controllerManager = new BotControllerManager();
  }
  return controllerManager;
}

export function resetBotControllerManager(): void {
  if (controllerManager) {
    controllerManager.stopTicking();
    controllerManager.disconnectAll();
  }
  controllerManager = null;
}

export default BotController;
