/**
 * BlockLife AI - Pathfinding Utilities
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Basic pathfinding utilities for bot navigation.
 */

import { Position } from '../types';

/**
 * A node in the pathfinding grid
 */
interface PathNode {
  position: Position;
  g: number; // Cost from start
  h: number; // Heuristic (estimated cost to goal)
  f: number; // Total cost (g + h)
  parent?: PathNode;
}

/**
 * Calculate Manhattan distance between two positions
 */
export function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
}

/**
 * Calculate Euclidean distance between two positions
 */
export function euclideanDistance(a: Position, b: Position): number {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
    Math.pow(a.y - b.y, 2) +
    Math.pow(a.z - b.z, 2)
  );
}

/**
 * Check if two positions are equal
 */
export function positionsEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

/**
 * Get position key for map storage
 */
export function positionKey(pos: Position): string {
  return `${pos.x},${pos.y},${pos.z}`;
}

/**
 * Get neighboring positions (6 directions for 3D)
 */
export function getNeighbors(pos: Position): Position[] {
  return [
    { x: pos.x + 1, y: pos.y, z: pos.z },
    { x: pos.x - 1, y: pos.y, z: pos.z },
    { x: pos.x, y: pos.y + 1, z: pos.z },
    { x: pos.x, y: pos.y - 1, z: pos.z },
    { x: pos.x, y: pos.y, z: pos.z + 1 },
    { x: pos.x, y: pos.y, z: pos.z - 1 }
  ];
}

/**
 * Get cardinal direction neighbors (4 directions, same Y level)
 */
export function getCardinalNeighbors(pos: Position): Position[] {
  return [
    { x: pos.x + 1, y: pos.y, z: pos.z },
    { x: pos.x - 1, y: pos.y, z: pos.z },
    { x: pos.x, y: pos.y, z: pos.z + 1 },
    { x: pos.x, y: pos.y, z: pos.z - 1 }
  ];
}

/**
 * Check if a block is walkable (for future implementation)
 */
export type WalkableChecker = (pos: Position) => boolean;

/**
 * Default walkable checker (always true)
 */
export const defaultWalkableChecker: WalkableChecker = () => true;

/**
 * Simple A* pathfinding
 * Returns array of positions from start to goal, or empty array if no path
 */
export function findPath(
  start: Position,
  goal: Position,
  isWalkable: WalkableChecker = defaultWalkableChecker,
  maxIterations: number = 1000
): Position[] {
  if (positionsEqual(start, goal)) {
    return [start];
  }

  const openSet: Map<string, PathNode> = new Map();
  const closedSet: Set<string> = new Set();
  
  const startNode: PathNode = {
    position: start,
    g: 0,
    h: manhattanDistance(start, goal),
    f: 0
  };
  startNode.f = startNode.g + startNode.h;
  
  openSet.set(positionKey(start), startNode);
  
  let iterations = 0;
  
  while (openSet.size > 0 && iterations < maxIterations) {
    iterations++;
    
    // Find node with lowest f score
    let current: PathNode | null = null;
    let currentKey: string = '';
    let lowestF = Infinity;
    
    for (const [key, node] of openSet.entries()) {
      if (node.f < lowestF) {
        lowestF = node.f;
        current = node;
        currentKey = key;
      }
    }
    
    if (!current) break;
    
    // Check if we've reached the goal
    if (positionsEqual(current.position, goal)) {
      return reconstructPath(current);
    }
    
    // Move current from open to closed
    openSet.delete(currentKey);
    closedSet.add(currentKey);
    
    // Check neighbors
    for (const neighborPos of getCardinalNeighbors(current.position)) {
      const neighborKey = positionKey(neighborPos);
      
      // Skip if in closed set or not walkable
      if (closedSet.has(neighborKey) || !isWalkable(neighborPos)) {
        continue;
      }
      
      const tentativeG = current.g + 1;
      
      let neighborNode = openSet.get(neighborKey);
      
      if (!neighborNode) {
        // New node
        neighborNode = {
          position: neighborPos,
          g: tentativeG,
          h: manhattanDistance(neighborPos, goal),
          f: 0,
          parent: current
        };
        neighborNode.f = neighborNode.g + neighborNode.h;
        openSet.set(neighborKey, neighborNode);
      } else if (tentativeG < neighborNode.g) {
        // Better path found
        neighborNode.g = tentativeG;
        neighborNode.f = neighborNode.g + neighborNode.h;
        neighborNode.parent = current;
      }
    }
  }
  
  // No path found
  return [];
}

/**
 * Reconstruct path from goal node to start
 */
function reconstructPath(goalNode: PathNode): Position[] {
  const path: Position[] = [];
  let current: PathNode | undefined = goalNode;
  
  while (current) {
    path.unshift(current.position);
    current = current.parent;
  }
  
  return path;
}

/**
 * Simplify a path by removing unnecessary waypoints
 * Keeps only points where direction changes
 */
export function simplifyPath(path: Position[]): Position[] {
  if (path.length <= 2) return path;
  
  const simplified: Position[] = [path[0]];
  
  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];
    
    // Calculate direction vectors
    const dir1 = {
      x: curr.x - prev.x,
      y: curr.y - prev.y,
      z: curr.z - prev.z
    };
    const dir2 = {
      x: next.x - curr.x,
      y: next.y - curr.y,
      z: next.z - curr.z
    };
    
    // If direction changed, keep this point
    if (dir1.x !== dir2.x || dir1.y !== dir2.y || dir1.z !== dir2.z) {
      simplified.push(curr);
    }
  }
  
  simplified.push(path[path.length - 1]);
  return simplified;
}

/**
 * Get a random position within a radius
 */
export function randomPositionInRadius(center: Position, radius: number): Position {
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * radius;
  
  return {
    x: Math.round(center.x + Math.cos(angle) * distance),
    y: center.y,
    z: Math.round(center.z + Math.sin(angle) * distance)
  };
}

/**
 * Get position in direction from a start point
 */
export function positionInDirection(
  start: Position, 
  direction: 'north' | 'south' | 'east' | 'west', 
  distance: number
): Position {
  const result = { ...start };
  
  switch (direction) {
    case 'north':
      result.z -= distance;
      break;
    case 'south':
      result.z += distance;
      break;
    case 'east':
      result.x += distance;
      break;
    case 'west':
      result.x -= distance;
      break;
  }
  
  return result;
}

export default {
  manhattanDistance,
  euclideanDistance,
  positionsEqual,
  positionKey,
  getNeighbors,
  getCardinalNeighbors,
  findPath,
  simplifyPath,
  randomPositionInRadius,
  positionInDirection
};
