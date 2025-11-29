/**
 * BlockLife AI - Advanced Memory System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Advanced memory management for bots including episodic memory,
 * semantic memory, emotional associations, and memory consolidation.
 */

import { v4 as uuidv4 } from 'uuid';
import { Memory, Bot, Mood } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('memory');

/**
 * Memory types for different kinds of recollection
 */
export enum MemoryType {
  EPISODIC = 'EPISODIC',       // Specific events (I was attacked by zombie)
  SEMANTIC = 'SEMANTIC',       // General knowledge (zombies are dangerous)
  PROCEDURAL = 'PROCEDURAL',   // Skills and habits (how to farm)
  EMOTIONAL = 'EMOTIONAL',     // Emotional associations (fear of north gate)
  SOCIAL = 'SOCIAL'            // Relationships and interactions
}

/**
 * Memory strength levels
 */
export enum MemoryStrength {
  FLEETING = 'FLEETING',       // Will fade quickly
  WEAK = 'WEAK',               // May be forgotten
  MODERATE = 'MODERATE',       // Reasonably stable
  STRONG = 'STRONG',           // Likely to persist
  CORE = 'CORE'                // Defining memories, never forgotten
}

/**
 * Extended memory with advanced features
 */
export interface AdvancedMemory extends Memory {
  memoryType: MemoryType;
  strength: MemoryStrength;
  accessCount: number;         // How often recalled
  lastAccessed: number;        // When last recalled
  emotionalValence: number;    // -100 (negative) to 100 (positive)
  associatedLocations: string[];
  associatedBots: string[];
  triggeredBy: string[];       // What can trigger this memory
  consolidated: boolean;       // Has been processed into long-term
}

/**
 * Memory association - links between memories
 */
export interface MemoryAssociation {
  id: string;
  memory1Id: string;
  memory2Id: string;
  strength: number;            // 0-100
  type: 'TEMPORAL' | 'CAUSAL' | 'EMOTIONAL' | 'SPATIAL' | 'SOCIAL';
  createdAt: number;
}

/**
 * Trauma event that can affect bot behavior
 */
export interface TraumaRecord {
  id: string;
  botId: string;
  description: string;
  triggerType: string;         // What kind of event
  triggerLocation?: string;
  severity: number;            // 0-100
  healed: number;              // 0-100 (how much recovered)
  createdAt: number;
  lastTriggeredAt?: number;
}

/**
 * Memory summary for long-term consolidation
 */
export interface MemorySummary {
  id: string;
  botId: string;
  period: string;              // e.g., "early life", "settlement era"
  keyEvents: string[];
  emotionalTone: number;       // Overall feeling about period
  lessonsLearned: string[];
  createdAt: number;
}

/**
 * Memory System Manager
 */
export class MemorySystemManager {
  private memories: Map<string, Map<string, AdvancedMemory>> = new Map(); // botId -> memoryId -> memory
  private associations: Map<string, MemoryAssociation[]> = new Map();     // botId -> associations
  private traumas: Map<string, TraumaRecord[]> = new Map();               // botId -> traumas
  private summaries: Map<string, MemorySummary[]> = new Map();            // botId -> summaries
  
  private readonly MAX_MEMORIES_PER_BOT = 100;
  private readonly MEMORY_DECAY_RATE = 0.01;      // Per tick decay for weak memories
  private readonly CONSOLIDATION_THRESHOLD = 24;   // Hours before consolidation
  private readonly EMOTIONAL_MEMORY_BOOST = 1.5;   // Stronger memories for emotional events
  
  constructor() {
    logger.info('Memory System Manager initialized');
  }

  /**
   * Create a new memory for a bot
   */
  createMemory(
    botId: string,
    type: MemoryType,
    description: string,
    options: {
      participants?: string[];
      significance?: number;
      emotionalImpact?: number;
      locations?: string[];
      triggers?: string[];
    } = {}
  ): AdvancedMemory {
    const now = Date.now();
    
    // Calculate initial strength based on significance and emotional impact
    const significance = options.significance ?? 50;
    const emotionalImpact = options.emotionalImpact ?? 0;
    const strengthScore = significance + Math.abs(emotionalImpact) * this.EMOTIONAL_MEMORY_BOOST;
    
    let strength: MemoryStrength;
    if (strengthScore >= 120) strength = MemoryStrength.CORE;
    else if (strengthScore >= 80) strength = MemoryStrength.STRONG;
    else if (strengthScore >= 50) strength = MemoryStrength.MODERATE;
    else if (strengthScore >= 25) strength = MemoryStrength.WEAK;
    else strength = MemoryStrength.FLEETING;
    
    const memory: AdvancedMemory = {
      id: uuidv4(),
      timestamp: now,
      type: type,
      description,
      participants: options.participants || [],
      significance,
      emotionalImpact: emotionalImpact,
      memoryType: type,
      strength,
      accessCount: 0,
      lastAccessed: now,
      emotionalValence: emotionalImpact,
      associatedLocations: options.locations || [],
      associatedBots: options.participants || [],
      triggeredBy: options.triggers || [],
      consolidated: false
    };
    
    // Store memory
    if (!this.memories.has(botId)) {
      this.memories.set(botId, new Map());
    }
    this.memories.get(botId)!.set(memory.id, memory);
    
    // Check if we need to forget old memories
    this.pruneMemories(botId);
    
    // Check for trauma
    if (emotionalImpact <= -70) {
      this.recordTrauma(botId, description, type, options.locations?.[0], Math.abs(emotionalImpact));
    }
    
    logger.debug(`Memory created for bot ${botId}: ${description.substring(0, 50)}...`);
    
    return memory;
  }

  /**
   * Access/recall a memory (strengthens it)
   */
  recallMemory(botId: string, memoryId: string): AdvancedMemory | undefined {
    const botMemories = this.memories.get(botId);
    if (!botMemories) return undefined;
    
    const memory = botMemories.get(memoryId);
    if (!memory) return undefined;
    
    // Strengthen memory on recall
    memory.accessCount++;
    memory.lastAccessed = Date.now();
    
    // Potentially upgrade strength
    if (memory.strength !== MemoryStrength.CORE && memory.accessCount >= 5) {
      const strengths = [MemoryStrength.FLEETING, MemoryStrength.WEAK, MemoryStrength.MODERATE, MemoryStrength.STRONG, MemoryStrength.CORE];
      const currentIndex = strengths.indexOf(memory.strength);
      if (currentIndex < strengths.length - 1) {
        memory.strength = strengths[currentIndex + 1];
      }
    }
    
    return memory;
  }

  /**
   * Get memories for a bot
   */
  getMemories(botId: string, options?: {
    type?: MemoryType;
    minStrength?: MemoryStrength;
    minSignificance?: number;
    limit?: number;
  }): AdvancedMemory[] {
    const botMemories = this.memories.get(botId);
    if (!botMemories) return [];
    
    let memories = Array.from(botMemories.values());
    
    if (options?.type) {
      memories = memories.filter(m => m.memoryType === options.type);
    }
    
    if (options?.minStrength) {
      const strengths = [MemoryStrength.FLEETING, MemoryStrength.WEAK, MemoryStrength.MODERATE, MemoryStrength.STRONG, MemoryStrength.CORE];
      const minIndex = strengths.indexOf(options.minStrength);
      memories = memories.filter(m => strengths.indexOf(m.strength) >= minIndex);
    }
    
    if (options?.minSignificance) {
      const minSig = options.minSignificance;
      memories = memories.filter(m => m.significance >= minSig);
    }
    
    // Sort by significance and recency
    memories.sort((a, b) => {
      const scoreA = a.significance + (a.accessCount * 5) + (a.timestamp / 1000000000);
      const scoreB = b.significance + (b.accessCount * 5) + (b.timestamp / 1000000000);
      return scoreB - scoreA;
    });
    
    if (options?.limit) {
      memories = memories.slice(0, options.limit);
    }
    
    return memories;
  }

  /**
   * Get memories triggered by a specific situation
   */
  getTriggerableMemories(botId: string, triggers: string[]): AdvancedMemory[] {
    const botMemories = this.memories.get(botId);
    if (!botMemories) return [];
    
    return Array.from(botMemories.values()).filter(memory => 
      memory.triggeredBy.some(t => triggers.includes(t))
    );
  }

  /**
   * Create association between memories
   */
  createAssociation(
    botId: string,
    memory1Id: string,
    memory2Id: string,
    type: MemoryAssociation['type'],
    strength: number = 50
  ): MemoryAssociation | null {
    const botMemories = this.memories.get(botId);
    if (!botMemories || !botMemories.has(memory1Id) || !botMemories.has(memory2Id)) {
      return null;
    }
    
    const association: MemoryAssociation = {
      id: uuidv4(),
      memory1Id,
      memory2Id,
      strength,
      type,
      createdAt: Date.now()
    };
    
    if (!this.associations.has(botId)) {
      this.associations.set(botId, []);
    }
    this.associations.get(botId)!.push(association);
    
    return association;
  }

  /**
   * Record a traumatic event
   */
  private recordTrauma(
    botId: string,
    description: string,
    triggerType: string,
    location: string | undefined,
    severity: number
  ): void {
    const trauma: TraumaRecord = {
      id: uuidv4(),
      botId,
      description,
      triggerType,
      triggerLocation: location,
      severity,
      healed: 0,
      createdAt: Date.now()
    };
    
    if (!this.traumas.has(botId)) {
      this.traumas.set(botId, []);
    }
    this.traumas.get(botId)!.push(trauma);
    
    logger.info(`Trauma recorded for bot ${botId}: ${description.substring(0, 30)}...`);
  }

  /**
   * Get traumas for a bot
   */
  getTraumas(botId: string, unhealed: boolean = true): TraumaRecord[] {
    const traumas = this.traumas.get(botId) || [];
    if (unhealed) {
      return traumas.filter(t => t.healed < 100);
    }
    return traumas;
  }

  /**
   * Heal trauma over time
   */
  healTrauma(botId: string, traumaId: string, amount: number): void {
    const traumas = this.traumas.get(botId);
    if (!traumas) return;
    
    const trauma = traumas.find(t => t.id === traumaId);
    if (trauma) {
      trauma.healed = Math.min(100, trauma.healed + amount);
    }
  }

  /**
   * Consolidate memories (compress old memories into summaries)
   */
  consolidateMemories(botId: string): MemorySummary | null {
    const botMemories = this.memories.get(botId);
    if (!botMemories) return null;
    
    const now = Date.now();
    const consolidationAge = this.CONSOLIDATION_THRESHOLD * 60 * 60 * 1000;
    
    // Find old, unconsolidated memories
    const oldMemories = Array.from(botMemories.values()).filter(
      m => !m.consolidated && (now - m.timestamp) > consolidationAge
    );
    
    if (oldMemories.length < 5) return null;  // Need enough memories to consolidate
    
    // Create summary
    const keyEvents = oldMemories
      .filter(m => m.significance >= 50)
      .map(m => m.description)
      .slice(0, 5);
    
    const avgEmotionalTone = oldMemories.reduce((sum, m) => sum + m.emotionalValence, 0) / oldMemories.length;
    
    const lessonsLearned = this.extractLessons(oldMemories);
    
    const summary: MemorySummary = {
      id: uuidv4(),
      botId,
      period: this.describePeriod(oldMemories),
      keyEvents,
      emotionalTone: avgEmotionalTone,
      lessonsLearned,
      createdAt: now
    };
    
    // Mark memories as consolidated
    oldMemories.forEach(m => m.consolidated = true);
    
    // Store summary
    if (!this.summaries.has(botId)) {
      this.summaries.set(botId, []);
    }
    this.summaries.get(botId)!.push(summary);
    
    // Remove weak consolidated memories
    oldMemories.forEach(m => {
      if (m.strength === MemoryStrength.FLEETING || m.strength === MemoryStrength.WEAK) {
        botMemories.delete(m.id);
      }
    });
    
    logger.debug(`Consolidated ${oldMemories.length} memories for bot ${botId}`);
    
    return summary;
  }

  /**
   * Extract lessons learned from memories
   */
  private extractLessons(memories: AdvancedMemory[]): string[] {
    const lessons: string[] = [];
    
    // Group by type and look for patterns
    const byType: Map<MemoryType, AdvancedMemory[]> = new Map();
    memories.forEach(m => {
      if (!byType.has(m.memoryType)) {
        byType.set(m.memoryType, []);
      }
      byType.get(m.memoryType)!.push(m);
    });
    
    // Generate lessons
    const socialMemories = byType.get(MemoryType.SOCIAL) || [];
    if (socialMemories.length > 0) {
      const avgSocial = socialMemories.reduce((sum, m) => sum + m.emotionalValence, 0) / socialMemories.length;
      if (avgSocial > 30) {
        lessons.push('Community brings happiness');
      } else if (avgSocial < -30) {
        lessons.push('Trust must be earned');
      }
    }
    
    const emotionalMemories = byType.get(MemoryType.EMOTIONAL) || [];
    if (emotionalMemories.some(m => m.triggeredBy.includes('combat') && m.emotionalValence < -50)) {
      lessons.push('Combat is dangerous');
    }
    
    if (memories.some(m => m.significance >= 80 && m.emotionalValence > 50)) {
      lessons.push('Great achievements bring lasting joy');
    }
    
    return lessons;
  }

  /**
   * Describe the time period of memories
   */
  private describePeriod(memories: AdvancedMemory[]): string {
    if (memories.length === 0) return 'unknown period';
    
    const timestamps = memories.map(m => m.timestamp).sort((a, b) => a - b);
    const earliest = new Date(timestamps[0]);
    const latest = new Date(timestamps[timestamps.length - 1]);
    
    const durationMs = latest.getTime() - earliest.getTime();
    const days = Math.floor(durationMs / (24 * 60 * 60 * 1000));
    
    if (days < 1) return 'a brief moment';
    if (days < 7) return 'recent days';
    if (days < 30) return 'the past weeks';
    return 'a significant period';
  }

  /**
   * Prune old/weak memories when at capacity
   */
  private pruneMemories(botId: string): void {
    const botMemories = this.memories.get(botId);
    if (!botMemories || botMemories.size <= this.MAX_MEMORIES_PER_BOT) return;
    
    // Sort by importance (consider strength, significance, recency)
    const sorted = Array.from(botMemories.values()).sort((a, b) => {
      const strengthOrder = [MemoryStrength.FLEETING, MemoryStrength.WEAK, MemoryStrength.MODERATE, MemoryStrength.STRONG, MemoryStrength.CORE];
      const strengthA = strengthOrder.indexOf(a.strength);
      const strengthB = strengthOrder.indexOf(b.strength);
      
      const scoreA = strengthA * 30 + a.significance + a.accessCount * 2;
      const scoreB = strengthB * 30 + b.significance + b.accessCount * 2;
      
      return scoreB - scoreA;
    });
    
    // Keep only the most important memories
    const toKeep = sorted.slice(0, this.MAX_MEMORIES_PER_BOT);
    const toKeepIds = new Set(toKeep.map(m => m.id));
    
    for (const [id] of botMemories) {
      if (!toKeepIds.has(id)) {
        botMemories.delete(id);
      }
    }
  }

  /**
   * Get memory summaries for a bot
   */
  getSummaries(botId: string): MemorySummary[] {
    return this.summaries.get(botId) || [];
  }

  /**
   * Process memory decay over time
   */
  processDecay(deltaMs: number): void {
    const decayAmount = this.MEMORY_DECAY_RATE * (deltaMs / 60000);  // Per minute
    
    for (const [botId, botMemories] of this.memories) {
      for (const [memoryId, memory] of botMemories) {
        // Only decay weak memories that haven't been accessed recently
        if (memory.strength === MemoryStrength.FLEETING || memory.strength === MemoryStrength.WEAK) {
          const timeSinceAccess = Date.now() - memory.lastAccessed;
          if (timeSinceAccess > 300000) {  // 5 minutes
            memory.significance -= decayAmount;
            
            if (memory.significance <= 0) {
              botMemories.delete(memoryId);
              logger.debug(`Memory faded for bot ${botId}: ${memory.description.substring(0, 30)}...`);
            }
          }
        }
      }
    }
  }

  /**
   * Get a bot's most significant memories for storytelling
   */
  getLifeStory(botId: string, limit: number = 10): AdvancedMemory[] {
    return this.getMemories(botId, {
      minStrength: MemoryStrength.MODERATE,
      minSignificance: 60,
      limit
    });
  }

  /**
   * Serialize for persistence
   */
  serialize(): {
    memories: { botId: string; memories: AdvancedMemory[] }[];
    associations: { botId: string; associations: MemoryAssociation[] }[];
    traumas: { botId: string; traumas: TraumaRecord[] }[];
    summaries: { botId: string; summaries: MemorySummary[] }[];
  } {
    return {
      memories: Array.from(this.memories.entries()).map(([botId, memMap]) => ({
        botId,
        memories: Array.from(memMap.values())
      })),
      associations: Array.from(this.associations.entries()).map(([botId, assocs]) => ({
        botId,
        associations: assocs
      })),
      traumas: Array.from(this.traumas.entries()).map(([botId, traumaList]) => ({
        botId,
        traumas: traumaList
      })),
      summaries: Array.from(this.summaries.entries()).map(([botId, summaryList]) => ({
        botId,
        summaries: summaryList
      }))
    };
  }

  /**
   * Load from persistence
   */
  load(data: {
    memories?: { botId: string; memories: AdvancedMemory[] }[];
    associations?: { botId: string; associations: MemoryAssociation[] }[];
    traumas?: { botId: string; traumas: TraumaRecord[] }[];
    summaries?: { botId: string; summaries: MemorySummary[] }[];
  }): void {
    this.memories.clear();
    this.associations.clear();
    this.traumas.clear();
    this.summaries.clear();
    
    for (const entry of data.memories || []) {
      const memMap = new Map<string, AdvancedMemory>();
      for (const mem of entry.memories) {
        memMap.set(mem.id, mem);
      }
      this.memories.set(entry.botId, memMap);
    }
    
    for (const entry of data.associations || []) {
      this.associations.set(entry.botId, entry.associations);
    }
    
    for (const entry of data.traumas || []) {
      this.traumas.set(entry.botId, entry.traumas);
    }
    
    for (const entry of data.summaries || []) {
      this.summaries.set(entry.botId, entry.summaries);
    }
    
    logger.info('Memory system data loaded');
  }
}

// Singleton
let memorySystemInstance: MemorySystemManager | null = null;

export function getMemorySystem(): MemorySystemManager {
  if (!memorySystemInstance) {
    memorySystemInstance = new MemorySystemManager();
  }
  return memorySystemInstance;
}

export function resetMemorySystem(): void {
  memorySystemInstance = null;
}

export default MemorySystemManager;
