/**
 * BlockLife AI - Smart Pathfinding System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * ADVANCED PATHFINDING FOR REALISTIC BOT MOVEMENT
 * 
 * This system provides intelligent movement for bots that:
 * - Move like real players (smooth, natural paths)
 * - Avoid obstacles intelligently
 * - Jump over gaps and climb up blocks
 * - Handle water, lava, and dangerous terrain
 * - Remember good and bad paths
 * - Work for BOTH Java and Bedrock editions
 * 
 * The goal: Bots should NEVER walk into walls or get stuck!
 */

import { Position } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('pathfinder');

// ============================================================================
// TYPES
// ============================================================================

export interface PathNode {
  position: Position;
  g: number; // Cost from start
  h: number; // Heuristic cost to goal
  f: number; // Total cost (g + h)
  parent: PathNode | null;
  action?: 'walk' | 'jump' | 'swim' | 'climb' | 'fall';
}

export interface PathfindingOptions {
  maxDistance: number;
  maxIterations: number;
  allowJump: boolean;
  allowSwim: boolean;
  allowClimb: boolean;
  avoidDanger: boolean;
  preferFlat: boolean;
  maxFallHeight: number;
}

export interface PathResult {
  success: boolean;
  path: Position[];
  actions: ('walk' | 'jump' | 'swim' | 'climb' | 'fall')[];
  distance: number;
  estimatedTime: number; // In ticks
  error?: string;
}

export interface TerrainInfo {
  isSolid: boolean;
  isWater: boolean;
  isLava: boolean;
  isDangerous: boolean;
  isClimbable: boolean;
  height: number;
}

// Type for block checking function
export type BlockChecker = (pos: Position) => TerrainInfo;

const DEFAULT_OPTIONS: PathfindingOptions = {
  maxDistance: 100,
  maxIterations: 5000,
  allowJump: true,
  allowSwim: true,
  allowClimb: true,
  avoidDanger: true,
  preferFlat: true,
  maxFallHeight: 3
};

// ============================================================================
// A* PATHFINDING IMPLEMENTATION
// ============================================================================

export class SmartPathfinder {
  private options: PathfindingOptions;
  private blockChecker: BlockChecker;
  
  // Path caching for efficiency
  private pathCache: Map<string, PathResult> = new Map();
  private maxCacheSize: number = 100;
  
  // Known obstacles (learned from failed paths)
  private knownObstacles: Set<string> = new Set();
  
  constructor(blockChecker: BlockChecker, options?: Partial<PathfindingOptions>) {
    this.blockChecker = blockChecker;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Find a path from start to goal
   */
  findPath(start: Position, goal: Position): PathResult {
    // Check cache first
    const cacheKey = this.getCacheKey(start, goal);
    const cached = this.pathCache.get(cacheKey);
    if (cached && this.isPathStillValid(cached)) {
      return cached;
    }
    
    // Round positions to block coordinates
    const startBlock = this.toBlockPos(start);
    const goalBlock = this.toBlockPos(goal);
    
    // Quick distance check
    const distance = this.distance(startBlock, goalBlock);
    if (distance > this.options.maxDistance) {
      return {
        success: false,
        path: [],
        actions: [],
        distance: 0,
        estimatedTime: 0,
        error: 'Goal is too far away'
      };
    }
    
    // A* algorithm
    const openSet: PathNode[] = [];
    const closedSet: Set<string> = new Set();
    
    const startNode: PathNode = {
      position: startBlock,
      g: 0,
      h: this.heuristic(startBlock, goalBlock),
      f: 0,
      parent: null
    };
    startNode.f = startNode.g + startNode.h;
    
    openSet.push(startNode);
    
    let iterations = 0;
    
    while (openSet.length > 0 && iterations < this.options.maxIterations) {
      iterations++;
      
      // Get node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      
      // Check if we reached the goal
      if (this.isAtGoal(current.position, goalBlock)) {
        const result = this.reconstructPath(current);
        this.cacheResult(cacheKey, result);
        return result;
      }
      
      const currentKey = this.posToKey(current.position);
      closedSet.add(currentKey);
      
      // Get neighbors
      const neighbors = this.getNeighbors(current);
      
      for (const neighbor of neighbors) {
        const neighborKey = this.posToKey(neighbor.position);
        
        // Skip if already evaluated
        if (closedSet.has(neighborKey)) continue;
        
        // Skip known obstacles
        if (this.knownObstacles.has(neighborKey)) continue;
        
        // Calculate tentative g score
        const tentativeG = current.g + this.getMovementCost(current, neighbor);
        
        // Check if this path is better
        const existingNode = openSet.find(n => this.posToKey(n.position) === neighborKey);
        
        if (!existingNode) {
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic(neighbor.position, goalBlock);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;
          openSet.push(neighbor);
        } else if (tentativeG < existingNode.g) {
          existingNode.g = tentativeG;
          existingNode.f = existingNode.g + existingNode.h;
          existingNode.parent = current;
        }
      }
    }
    
    // No path found
    return {
      success: false,
      path: [],
      actions: [],
      distance: 0,
      estimatedTime: 0,
      error: iterations >= this.options.maxIterations 
        ? 'Max iterations reached' 
        : 'No path exists'
    };
  }
  
  /**
   * Get neighboring positions that can be moved to
   */
  private getNeighbors(node: PathNode): PathNode[] {
    const neighbors: PathNode[] = [];
    const pos = node.position;
    
    // Cardinal directions (N, S, E, W)
    const cardinals = [
      { x: 1, z: 0 },
      { x: -1, z: 0 },
      { x: 0, z: 1 },
      { x: 0, z: -1 }
    ];
    
    // Diagonal directions (optional, more natural movement)
    const diagonals = [
      { x: 1, z: 1 },
      { x: 1, z: -1 },
      { x: -1, z: 1 },
      { x: -1, z: -1 }
    ];
    
    const allDirections = [...cardinals, ...diagonals];
    
    for (const dir of allDirections) {
      // Try same level
      const sameLevel: Position = {
        x: pos.x + dir.x,
        y: pos.y,
        z: pos.z + dir.z
      };
      
      if (this.canMoveTo(pos, sameLevel)) {
        neighbors.push({
          position: sameLevel,
          g: 0, h: 0, f: 0,
          parent: null,
          action: 'walk'
        });
      }
      
      // Try jumping up (1 block)
      if (this.options.allowJump) {
        const jumpUp: Position = {
          x: pos.x + dir.x,
          y: pos.y + 1,
          z: pos.z + dir.z
        };
        
        if (this.canJumpTo(pos, jumpUp)) {
          neighbors.push({
            position: jumpUp,
            g: 0, h: 0, f: 0,
            parent: null,
            action: 'jump'
          });
        }
      }
      
      // Try falling down (up to maxFallHeight)
      for (let fallDist = 1; fallDist <= this.options.maxFallHeight; fallDist++) {
        const fallDown: Position = {
          x: pos.x + dir.x,
          y: pos.y - fallDist,
          z: pos.z + dir.z
        };
        
        if (this.canFallTo(pos, fallDown, fallDist)) {
          neighbors.push({
            position: fallDown,
            g: 0, h: 0, f: 0,
            parent: null,
            action: 'fall'
          });
          break; // Only add the first valid fall position
        }
      }
    }
    
    // Climbing (ladders, vines)
    if (this.options.allowClimb) {
      const climbUp: Position = { x: pos.x, y: pos.y + 1, z: pos.z };
      const climbDown: Position = { x: pos.x, y: pos.y - 1, z: pos.z };
      
      if (this.canClimbTo(pos, climbUp)) {
        neighbors.push({
          position: climbUp,
          g: 0, h: 0, f: 0,
          parent: null,
          action: 'climb'
        });
      }
      
      if (this.canClimbTo(pos, climbDown)) {
        neighbors.push({
          position: climbDown,
          g: 0, h: 0, f: 0,
          parent: null,
          action: 'climb'
        });
      }
    }
    
    return neighbors;
  }
  
  /**
   * Check if bot can walk to a position
   */
  private canMoveTo(from: Position, to: Position): boolean {
    // Check if destination is valid
    const destGround = this.blockChecker({ x: to.x, y: to.y - 1, z: to.z });
    const destFeet = this.blockChecker(to);
    const destHead = this.blockChecker({ x: to.x, y: to.y + 1, z: to.z });
    
    // Need solid ground, clear feet and head space
    if (!destGround.isSolid && !destGround.isWater) return false;
    if (destFeet.isSolid && !destFeet.isWater) return false;
    if (destHead.isSolid) return false;
    
    // Avoid danger if enabled
    if (this.options.avoidDanger) {
      if (destGround.isLava || destFeet.isLava || destGround.isDangerous) {
        return false;
      }
    }
    
    // Handle water
    if (destGround.isWater || destFeet.isWater) {
      return this.options.allowSwim;
    }
    
    return true;
  }
  
  /**
   * Check if bot can jump to a position
   */
  private canJumpTo(from: Position, to: Position): boolean {
    // Check jump clearance (need 2 blocks above current position)
    const aboveHead = this.blockChecker({ x: from.x, y: from.y + 2, z: from.z });
    if (aboveHead.isSolid) return false;
    
    // Check destination
    return this.canMoveTo(from, to);
  }
  
  /**
   * Check if bot can fall to a position
   */
  private canFallTo(from: Position, to: Position, fallDistance: number): boolean {
    // Check if the fall path is clear
    for (let y = from.y; y > to.y; y--) {
      const midPos: Position = { x: to.x, y, z: to.z };
      const terrain = this.blockChecker(midPos);
      if (terrain.isSolid && !terrain.isWater) return false;
    }
    
    // Check destination
    return this.canMoveTo(from, to);
  }
  
  /**
   * Check if bot can climb to a position
   */
  private canClimbTo(from: Position, to: Position): boolean {
    const terrain = this.blockChecker(to);
    return terrain.isClimbable || 
           (this.blockChecker(from).isClimbable && !terrain.isSolid);
  }
  
  /**
   * Calculate movement cost between nodes
   */
  private getMovementCost(from: PathNode, to: PathNode): number {
    let cost = this.distance(from.position, to.position);
    
    // Additional costs based on action
    switch (to.action) {
      case 'jump':
        cost += 0.5; // Jumping is slightly more costly
        break;
      case 'swim':
        cost += 1.0; // Swimming is slow
        break;
      case 'climb':
        cost += 0.3;
        break;
      case 'fall':
        cost += 0.1; // Falling is fast but risky
        break;
    }
    
    // Prefer flat terrain if enabled
    if (this.options.preferFlat && from.position.y !== to.position.y) {
      cost += 0.2;
    }
    
    return cost;
  }
  
  /**
   * Heuristic function (Manhattan distance with Y weight)
   */
  private heuristic(a: Position, b: Position): number {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    const dz = Math.abs(a.z - b.z);
    
    // Weight Y difference more heavily (climbing/falling is harder)
    return dx + dy * 1.5 + dz;
  }
  
  /**
   * Euclidean distance between two positions
   */
  private distance(a: Position, b: Position): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  /**
   * Check if position is at goal (within tolerance)
   */
  private isAtGoal(pos: Position, goal: Position): boolean {
    return Math.abs(pos.x - goal.x) <= 1 &&
           Math.abs(pos.y - goal.y) <= 1 &&
           Math.abs(pos.z - goal.z) <= 1;
  }
  
  /**
   * Reconstruct path from goal node
   */
  private reconstructPath(goalNode: PathNode): PathResult {
    const path: Position[] = [];
    const actions: PathNode['action'][] = [];
    
    let current: PathNode | null = goalNode;
    while (current) {
      path.unshift(current.position);
      if (current.action) {
        actions.unshift(current.action);
      }
      current = current.parent;
    }
    
    const distance = path.length > 0 ? this.distance(path[0], path[path.length - 1]) : 0;
    
    return {
      success: true,
      path,
      actions: actions as ('walk' | 'jump' | 'swim' | 'climb' | 'fall')[],
      distance,
      estimatedTime: path.length * 5 // ~5 ticks per block
    };
  }
  
  /**
   * Convert position to block coordinates
   */
  private toBlockPos(pos: Position): Position {
    return {
      x: Math.floor(pos.x),
      y: Math.floor(pos.y),
      z: Math.floor(pos.z)
    };
  }
  
  /**
   * Convert position to string key
   */
  private posToKey(pos: Position): string {
    return `${Math.floor(pos.x)},${Math.floor(pos.y)},${Math.floor(pos.z)}`;
  }
  
  /**
   * Get cache key for a path
   */
  private getCacheKey(start: Position, goal: Position): string {
    return `${this.posToKey(start)}->${this.posToKey(goal)}`;
  }
  
  /**
   * Cache a path result
   */
  private cacheResult(key: string, result: PathResult): void {
    if (this.pathCache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.pathCache.keys().next().value;
      if (firstKey) this.pathCache.delete(firstKey);
    }
    this.pathCache.set(key, result);
  }
  
  /**
   * Check if cached path is still valid
   */
  private isPathStillValid(result: PathResult): boolean {
    // For now, always revalidate
    // In a real implementation, check if blocks have changed
    return false;
  }
  
  /**
   * Mark a position as an obstacle (learned from failure)
   */
  markObstacle(pos: Position): void {
    this.knownObstacles.add(this.posToKey(pos));
    
    // Limit obstacle memory
    if (this.knownObstacles.size > 1000) {
      const firstKey = this.knownObstacles.values().next().value;
      if (firstKey) this.knownObstacles.delete(firstKey);
    }
  }
  
  /**
   * Clear obstacle from memory (path became valid)
   */
  clearObstacle(pos: Position): void {
    this.knownObstacles.delete(this.posToKey(pos));
  }
  
  /**
   * Clear all caches
   */
  clearCache(): void {
    this.pathCache.clear();
    this.knownObstacles.clear();
  }
  
  /**
   * Update options
   */
  updateOptions(options: Partial<PathfindingOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

// ============================================================================
// PATH EXECUTOR - Executes paths step by step
// ============================================================================

export interface PathExecutorCallbacks {
  moveTo: (pos: Position) => Promise<boolean>;
  jump: () => void;
  sprint: (enable: boolean) => void;
  getPosition: () => Position;
  lookAt: (pos: Position) => void;
}

export class PathExecutor {
  private pathfinder: SmartPathfinder;
  private callbacks: PathExecutorCallbacks;
  private currentPath: PathResult | null = null;
  private currentStep: number = 0;
  private isExecuting: boolean = false;
  private stuckCounter: number = 0;
  private lastPosition: Position | null = null;
  
  constructor(pathfinder: SmartPathfinder, callbacks: PathExecutorCallbacks) {
    this.pathfinder = pathfinder;
    this.callbacks = callbacks;
  }
  
  /**
   * Navigate to a destination
   */
  async navigateTo(destination: Position): Promise<boolean> {
    const start = this.callbacks.getPosition();
    
    // Find path
    const result = this.pathfinder.findPath(start, destination);
    
    if (!result.success) {
      logger.debug(`Path not found: ${result.error}`);
      return false;
    }
    
    this.currentPath = result;
    this.currentStep = 0;
    this.isExecuting = true;
    this.stuckCounter = 0;
    
    logger.debug(`Starting navigation: ${result.path.length} steps, ~${result.estimatedTime} ticks`);
    
    // Execute path
    while (this.isExecuting && this.currentStep < result.path.length) {
      const success = await this.executeStep();
      
      if (!success) {
        // Check if stuck
        const currentPos = this.callbacks.getPosition();
        if (this.lastPosition && this.distance(currentPos, this.lastPosition) < 0.5) {
          this.stuckCounter++;
          
          if (this.stuckCounter >= 5) {
            logger.debug('Bot appears stuck, marking obstacle and replanning');
            this.pathfinder.markObstacle(result.path[this.currentStep]);
            
            // Try to find a new path
            const newResult = this.pathfinder.findPath(currentPos, destination);
            if (newResult.success) {
              this.currentPath = newResult;
              this.currentStep = 0;
              this.stuckCounter = 0;
              continue;
            } else {
              this.isExecuting = false;
              return false;
            }
          }
        } else {
          this.stuckCounter = 0;
        }
        
        this.lastPosition = currentPos;
      }
      
      this.currentStep++;
    }
    
    this.isExecuting = false;
    this.currentPath = null;
    
    // Check if we reached destination
    const finalPos = this.callbacks.getPosition();
    const reachedGoal = this.distance(finalPos, destination) < 2;
    
    return reachedGoal;
  }
  
  /**
   * Execute a single step of the path
   */
  private async executeStep(): Promise<boolean> {
    if (!this.currentPath || this.currentStep >= this.currentPath.path.length) {
      return false;
    }
    
    const targetPos = this.currentPath.path[this.currentStep];
    const action = this.currentPath.actions[this.currentStep] || 'walk';
    
    // Look at target first (more natural movement)
    this.callbacks.lookAt(targetPos);
    
    // Execute action
    switch (action) {
      case 'jump':
        this.callbacks.jump();
        await this.delay(100);
        break;
        
      case 'walk':
      case 'fall':
      case 'climb':
      case 'swim':
      default:
        // Just move
        break;
    }
    
    // Sprint if path is long and straight
    const remainingSteps = this.currentPath.path.length - this.currentStep;
    if (remainingSteps > 5 && action === 'walk') {
      this.callbacks.sprint(true);
    } else {
      this.callbacks.sprint(false);
    }
    
    // Move to target
    const success = await this.callbacks.moveTo(targetPos);
    
    return success;
  }
  
  /**
   * Stop current navigation
   */
  stop(): void {
    this.isExecuting = false;
    this.currentPath = null;
    this.callbacks.sprint(false);
  }
  
  /**
   * Check if currently navigating
   */
  isNavigating(): boolean {
    return this.isExecuting;
  }
  
  /**
   * Get progress (0-100)
   */
  getProgress(): number {
    if (!this.currentPath || this.currentPath.path.length === 0) {
      return 0;
    }
    return (this.currentStep / this.currentPath.path.length) * 100;
  }
  
  private distance(a: Position, b: Position): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a pathfinder with default block checker (for when no MC client available)
 */
export function createDefaultPathfinder(): SmartPathfinder {
  // Default block checker assumes flat terrain
  const defaultBlockChecker: BlockChecker = (pos) => ({
    isSolid: pos.y < 64,
    isWater: false,
    isLava: false,
    isDangerous: false,
    isClimbable: false,
    height: pos.y < 64 ? 1 : 0
  });
  
  return new SmartPathfinder(defaultBlockChecker);
}

/**
 * Create a pathfinder for Java Edition (using mineflayer bot)
 */
export function createJavaPathfinder(bot: any): SmartPathfinder {
  const blockChecker: BlockChecker = (pos) => {
    try {
      const block = bot.blockAt({ x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) });
      
      if (!block) {
        return {
          isSolid: false,
          isWater: false,
          isLava: false,
          isDangerous: false,
          isClimbable: false,
          height: 0
        };
      }
      
      const name = block.name.toLowerCase();
      
      return {
        isSolid: block.boundingBox === 'block',
        isWater: name.includes('water'),
        isLava: name.includes('lava'),
        isDangerous: name.includes('lava') || name.includes('cactus') || name.includes('magma'),
        isClimbable: name.includes('ladder') || name.includes('vine'),
        height: block.boundingBox === 'block' ? 1 : 0
      };
    } catch {
      return {
        isSolid: false,
        isWater: false,
        isLava: false,
        isDangerous: false,
        isClimbable: false,
        height: 0
      };
    }
  };
  
  return new SmartPathfinder(blockChecker);
}

/**
 * Create a pathfinder for Bedrock Edition
 */
export function createBedrockPathfinder(): SmartPathfinder {
  // Bedrock doesn't have easy block access, use default
  // In real implementation, would need to track blocks from packets
  return createDefaultPathfinder();
}

export default SmartPathfinder;
