/**
 * BlockLife AI - Bot Controller
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * CRITICAL BRIDGE: Connects Bot Agents (AI decisions) to Minecraft Clients (in-game actions)
 * This is what makes bots actually DO things in the game.
 * 
 * ENHANCED FOR INTELLIGENT BEHAVIOR:
 * - Smart pathfinding with obstacle avoidance
 * - Stuck detection and recovery
 * - Purposeful movement patterns
 * - Task prioritization and chaining
 * - Memory of good locations (farms, mines, etc.)
 */

import { BotAgent } from './bot-agent';
import { IMinecraftClient } from './mc-adapter';
import { getConnectionManager } from './connection-manager';
import { Position, Task, BotIntent } from '../types';
import { createLogger } from '../utils/logger';
import { getSystemStatus, EventCategory, LogLevel } from '../utils/system-status';

const logger = createLogger('bot-controller');

// ============================================================================
// SMART MOVEMENT HELPERS
// ============================================================================

interface MovementState {
  lastPosition: Position | null;
  stuckCounter: number;
  lastMoveTime: number;
  targetPosition: Position | null;
  knownObstacles: Position[];
  knownGoodLocations: Map<string, Position[]>; // 'farm', 'mine', 'wood', etc.
}

/**
 * Calculate distance between two positions
 */
function distance(a: Position, b: Position): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2) +
    Math.pow(a.z - b.z, 2)
  );
}

/**
 * Check if two positions are approximately equal
 */
function positionsEqual(a: Position, b: Position, tolerance: number = 0.5): boolean {
  return distance(a, b) < tolerance;
}

/**
 * Bot Controller - Executes bot decisions in Minecraft
 * Now with intelligent movement and stuck detection!
 */
export class BotController {
  private botAgent: BotAgent;
  private client: IMinecraftClient | null = null;
  private isExecuting: boolean = false;
  private currentAction: string = 'idle';
  private lastActionTime: number = 0;
  private actionCooldown: number = 800; // Slightly faster action rate
  
  // Smart movement tracking
  private movement: MovementState = {
    lastPosition: null,
    stuckCounter: 0,
    lastMoveTime: 0,
    targetPosition: null,
    knownObstacles: [],
    knownGoodLocations: new Map()
  };
  
  // Action history for smarter behavior
  private actionHistory: string[] = [];
  private maxActionHistory: number = 20;
  
  // Task completion tracking
  private taskStartTime: number = 0;
  private maxTaskDuration: number = 60000; // 1 minute max per task

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
   * Enhanced with stuck detection and smart recovery!
   */
  async tick(): Promise<void> {
    if (!this.isConnected() || this.isExecuting) return;
    
    const now = Date.now();
    if (now - this.lastActionTime < this.actionCooldown) return;
    
    // Check if bot is stuck
    await this.checkAndHandleStuck();
    
    const task = this.botAgent.getCurrentTask();
    if (!task) {
      // No task - but don't just idle, be productive based on role!
      await this.executeRoleBasedAction();
      return;
    }
    
    // Check for task timeout
    if (this.taskStartTime === 0) {
      this.taskStartTime = now;
    } else if (now - this.taskStartTime > this.maxTaskDuration) {
      logger.debug(`${this.botAgent.name} task timed out: ${task.type}`);
      this.botAgent.completeCurrentTask();
      this.taskStartTime = 0;
      return;
    }

    this.isExecuting = true;
    this.lastActionTime = now;

    try {
      // Record action for history
      this.recordAction(task.type);
      
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
          await this.executeRoleBasedAction();
      }

      // Update task progress (faster completion)
      task.progress = Math.min(100, task.progress + 15);
      
      // Complete task if done
      if (task.progress >= 100) {
        this.botAgent.completeCurrentTask();
        this.taskStartTime = 0;
        logger.debug(`${this.botAgent.name} completed task: ${task.type}`);
      }

    } catch (error) {
      logger.error(`${this.botAgent.name} action error: ${error}`);
      // On error, try to recover
      await this.handleActionError();
    } finally {
      this.isExecuting = false;
    }
  }
  
  /**
   * Check if the bot is stuck and handle recovery
   */
  private async checkAndHandleStuck(): Promise<void> {
    if (!this.client) return;
    
    const currentPos = this.client.getPosition();
    const now = Date.now();
    
    if (this.movement.lastPosition) {
      const movedDistance = distance(currentPos, this.movement.lastPosition);
      
      // If we should have moved but didn't
      if (this.movement.targetPosition && movedDistance < 0.3 && 
          now - this.movement.lastMoveTime > 3000) {
        this.movement.stuckCounter++;
        
        if (this.movement.stuckCounter >= 3) {
          logger.debug(`${this.botAgent.name} appears stuck, attempting recovery`);
          await this.recoverFromStuck();
          this.movement.stuckCounter = 0;
        }
      } else if (movedDistance > 1) {
        // We moved successfully
        this.movement.stuckCounter = 0;
      }
    }
    
    this.movement.lastPosition = { ...currentPos };
    this.movement.lastMoveTime = now;
  }
  
  /**
   * Recover from being stuck
   */
  private async recoverFromStuck(): Promise<void> {
    if (!this.client) return;
    
    this.botAgent.addRecentEvent('Got stuck, finding a new path');
    
    // Try jumping
    this.client.jump();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Try turning and moving in a different direction
    const pos = this.client.getPosition();
    const escapeDirections = [
      { x: pos.x + 3, z: pos.z },
      { x: pos.x - 3, z: pos.z },
      { x: pos.x, z: pos.z + 3 },
      { x: pos.x, z: pos.z - 3 },
      { x: pos.x + 2, z: pos.z + 2 },
      { x: pos.x - 2, z: pos.z - 2 }
    ];
    
    // Try each direction until one works
    const randomDir = escapeDirections[Math.floor(Math.random() * escapeDirections.length)];
    const escapePos: Position = {
      x: randomDir.x,
      y: pos.y,
      z: randomDir.z
    };
    
    // Mark current area as potentially problematic
    if (this.movement.targetPosition) {
      this.movement.knownObstacles.push({ ...this.movement.targetPosition });
      // Keep obstacle list manageable
      if (this.movement.knownObstacles.length > 20) {
        this.movement.knownObstacles.shift();
      }
    }
    
    await this.smartMoveTo(escapePos);
  }
  
  /**
   * Handle action errors gracefully
   */
  private async handleActionError(): Promise<void> {
    // Reset current task on repeated errors
    const recentErrors = this.actionHistory.filter(a => a === 'ERROR').length;
    if (recentErrors > 3) {
      this.botAgent.completeCurrentTask();
      this.taskStartTime = 0;
      this.actionHistory = [];
    }
  }
  
  /**
   * Record an action to history
   */
  private recordAction(action: string): void {
    this.actionHistory.push(action);
    if (this.actionHistory.length > this.maxActionHistory) {
      this.actionHistory.shift();
    }
  }
  
  /**
   * Execute role-based action when no specific task
   * This makes bots productive even without explicit AI commands
   */
  private async executeRoleBasedAction(): Promise<void> {
    if (!this.client) return;
    
    const role = this.botAgent.getRole();
    const needs = this.botAgent.getNeeds();
    
    // First, check critical needs
    if (needs.hunger > 80) {
      await this.executeEat();
      return;
    }
    if (needs.energy > 85) {
      await this.executeSleep();
      return;
    }
    
    // Then do role-appropriate work
    switch (role) {
      case 'FARMER':
        await this.executeFarming({ id: 'auto', type: 'FARMING', startedAt: Date.now(), progress: 0, priority: 1 });
        break;
      case 'MINER':
        await this.executeMining({ id: 'auto', type: 'MINING', startedAt: Date.now(), progress: 0, priority: 1 });
        break;
      case 'LUMBERJACK':
        await this.executeWoodcutting();
        break;
      case 'BUILDER':
        await this.executeBuilding({ id: 'auto', type: 'BUILDING', startedAt: Date.now(), progress: 0, priority: 1 });
        break;
      case 'GUARD':
        await this.executePatrol();
        break;
      case 'HUNTER':
      case 'SCOUT':
        await this.executeExplore();
        break;
      default:
        // Default productive action - gather resources or explore
        if (Math.random() < 0.5) {
          await this.executeExplore();
        } else {
          await this.executeWoodcutting();
        }
    }
  }

  /**
   * Idle behavior - look around, small movements
   * Now more purposeful - bots don't just stand around
   */
  private async executeIdle(): Promise<void> {
    if (!this.client) return;
    this.currentAction = 'idle';
    
    // Instead of truly idling, do something productive
    await this.executeRoleBasedAction();
  }
  
  /**
   * Smart movement that avoids obstacles and known problem areas
   */
  private async smartMoveTo(target: Position): Promise<boolean> {
    if (!this.client) return false;
    
    // Check if target is in known obstacles
    const isNearObstacle = this.movement.knownObstacles.some(
      obs => distance(obs, target) < 3
    );
    
    if (isNearObstacle) {
      // Adjust target to avoid obstacle
      target = {
        x: target.x + (Math.random() - 0.5) * 6,
        y: target.y,
        z: target.z + (Math.random() - 0.5) * 6
      };
    }
    
    this.movement.targetPosition = target;
    
    try {
      const success = await this.client.moveTo(target);
      
      if (success) {
        // Update agent position
        this.botAgent.setPosition(this.client.getPosition());
      }
      
      return success;
    } catch (error) {
      logger.debug(`${this.botAgent.name} movement failed: ${error}`);
      return false;
    }
  }
  
  /**
   * Remember a good location for future use
   */
  private rememberLocation(type: string, pos: Position): void {
    if (!this.movement.knownGoodLocations.has(type)) {
      this.movement.knownGoodLocations.set(type, []);
    }
    
    const locations = this.movement.knownGoodLocations.get(type)!;
    
    // Don't add duplicates
    if (!locations.some(l => distance(l, pos) < 5)) {
      locations.push({ ...pos });
      
      // Keep list manageable
      if (locations.length > 10) {
        locations.shift();
      }
    }
  }
  
  /**
   * Get a known good location for a resource type
   */
  private getKnownLocation(type: string): Position | null {
    const locations = this.movement.knownGoodLocations.get(type);
    if (locations && locations.length > 0) {
      return locations[Math.floor(Math.random() * locations.length)];
    }
    return null;
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
      // Look for mature crops at ground level around the bot
      this.botAgent.addRecentEvent('Harvesting crops');
      
      const pos = this.client.getPosition();
      const cropTypes = ['wheat', 'carrots', 'potatoes', 'beetroots', 'melon', 'pumpkin'];
      
      // Search for crops at bot's Y level (not below)
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          const checkPos: Position = {
            x: Math.floor(pos.x) + dx,
            y: Math.floor(pos.y),
            z: Math.floor(pos.z) + dz
          };
          
          const block = this.client.getBlockAt(checkPos);
          if (block && cropTypes.some(c => block.type.includes(c))) {
            await this.client.breakBlock(checkPos);
            return;
          }
        }
      }
      
      // No crops found, move around
      await this.moveRandomly(5);
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
    
    // Wood block types to look for
    const woodTypes = [
      'oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log',
      'mangrove_log', 'cherry_log', 'crimson_stem', 'warped_stem',
      'oak_wood', 'spruce_wood', 'birch_wood', 'jungle_wood', 'acacia_wood', 'dark_oak_wood'
    ];
    
    const pos = this.client.getPosition();
    
    // Check blocks around for wood
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        for (let dy = 0; dy <= 5; dy++) {
          const checkPos: Position = {
            x: Math.floor(pos.x) + dx,
            y: Math.floor(pos.y) + dy,
            z: Math.floor(pos.z) + dz
          };
          
          const block = this.client.getBlockAt(checkPos);
          if (block && woodTypes.some(w => block.type.includes(w))) {
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
   * Move to a random nearby location with smart pathfinding
   */
  private async moveRandomly(radius: number): Promise<void> {
    if (!this.client) return;
    
    const pos = this.client.getPosition();
    
    // Generate a target that's not in known obstacle areas
    let attempts = 0;
    let targetPos: Position;
    
    do {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      
      targetPos = {
        x: pos.x + Math.cos(angle) * dist,
        y: pos.y,
        z: pos.z + Math.sin(angle) * dist
      };
      
      attempts++;
    } while (
      attempts < 5 && 
      this.movement.knownObstacles.some(obs => distance(obs, targetPos) < 3)
    );
    
    await this.smartMoveTo(targetPos);
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
