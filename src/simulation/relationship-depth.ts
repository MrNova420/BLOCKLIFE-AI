/**
 * BlockLife AI - Relationship Depth System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Advanced relationship management with emotional bonds, trust,
 * shared history, and dynamic relationship evolution.
 */

import { v4 as uuidv4 } from 'uuid';
import { Relationship, Bot, Mood } from '../types';
import { getBotManager } from '../bots/bot-manager';
import { createLogger } from '../utils/logger';

const logger = createLogger('relationships');

/**
 * Relationship categories with more nuance
 */
export enum RelationshipCategory {
  // Family
  PARENT = 'PARENT',
  CHILD = 'CHILD',
  SIBLING = 'SIBLING',
  GRANDPARENT = 'GRANDPARENT',
  GRANDCHILD = 'GRANDCHILD',
  EXTENDED_FAMILY = 'EXTENDED_FAMILY',
  
  // Romantic
  PARTNER = 'PARTNER',
  FORMER_PARTNER = 'FORMER_PARTNER',
  CRUSH = 'CRUSH',
  
  // Social
  BEST_FRIEND = 'BEST_FRIEND',
  CLOSE_FRIEND = 'CLOSE_FRIEND',
  FRIEND = 'FRIEND',
  ACQUAINTANCE = 'ACQUAINTANCE',
  STRANGER = 'STRANGER',
  
  // Negative
  RIVAL = 'RIVAL',
  ENEMY = 'ENEMY',
  NEMESIS = 'NEMESIS',
  
  // Professional
  MENTOR = 'MENTOR',
  APPRENTICE = 'APPRENTICE',
  COLLEAGUE = 'COLLEAGUE',
  LEADER = 'LEADER',
  SUBORDINATE = 'SUBORDINATE'
}

/**
 * Detailed relationship with emotional dimensions
 */
export interface DeepRelationship {
  id: string;
  ownerId: string;
  targetId: string;
  category: RelationshipCategory;
  
  // Emotional dimensions (0-100)
  trust: number;              // Reliability, honesty
  respect: number;            // Admiration, regard
  affection: number;          // Warmth, care
  intimacy: number;           // Closeness, vulnerability
  loyalty: number;            // Commitment, dedication
  
  // Negative dimensions (0-100, lower is better)
  resentment: number;         // Accumulated grievances
  jealousy: number;           // Envy, possessiveness
  fear: number;               // Intimidation, dread
  
  // Interaction tracking
  interactionCount: number;
  lastInteraction: number;
  positiveInteractions: number;
  negativeInteractions: number;
  
  // Shared experiences
  sharedMemoryIds: string[];
  significantEvents: RelationshipEvent[];
  
  // Status
  status: 'ACTIVE' | 'DORMANT' | 'ESTRANGED' | 'ENDED';
  formedAt: number;
  updatedAt: number;
}

/**
 * Significant event in a relationship
 */
export interface RelationshipEvent {
  id: string;
  timestamp: number;
  type: RelationshipEventType;
  description: string;
  impact: number;             // -100 to 100
  remembered: boolean;        // If both parties remember it
}

/**
 * Types of relationship events
 */
export enum RelationshipEventType {
  FIRST_MEETING = 'FIRST_MEETING',
  HELPED_IN_CRISIS = 'HELPED_IN_CRISIS',
  BETRAYAL = 'BETRAYAL',
  GIFT_GIVEN = 'GIFT_GIVEN',
  SAVED_LIFE = 'SAVED_LIFE',
  SHARED_MEAL = 'SHARED_MEAL',
  WORKED_TOGETHER = 'WORKED_TOGETHER',
  FOUGHT_TOGETHER = 'FOUGHT_TOGETHER',
  ARGUMENT = 'ARGUMENT',
  RECONCILIATION = 'RECONCILIATION',
  CONFESSION = 'CONFESSION',
  PROMISE_KEPT = 'PROMISE_KEPT',
  PROMISE_BROKEN = 'PROMISE_BROKEN',
  SHARED_LOSS = 'SHARED_LOSS',
  CELEBRATION = 'CELEBRATION',
  COMPETITION = 'COMPETITION'
}

/**
 * Interaction types for relationship updates
 */
export interface Interaction {
  type: InteractionType;
  success: boolean;
  context?: string;
  witnesses?: string[];
}

export enum InteractionType {
  CONVERSATION = 'CONVERSATION',
  COOPERATION = 'COOPERATION',
  CONFLICT = 'CONFLICT',
  GIFT = 'GIFT',
  HELP = 'HELP',
  TRADE = 'TRADE',
  TEACHING = 'TEACHING',
  COMBAT_TOGETHER = 'COMBAT_TOGETHER',
  SHARED_DANGER = 'SHARED_DANGER'
}

/**
 * Relationship compatibility analysis
 */
export interface RelationshipAnalysis {
  overallScore: number;       // 0-100
  compatibility: number;      // How well they get along
  tension: number;            // Underlying issues
  potential: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'VOLATILE';
  strengths: string[];
  concerns: string[];
}

/**
 * Relationship Depth Manager
 */
export class RelationshipDepthManager {
  private relationships: Map<string, Map<string, DeepRelationship>> = new Map();
  
  private readonly TRUST_GAIN_PER_POSITIVE = 3;
  private readonly TRUST_LOSS_PER_NEGATIVE = 8;
  private readonly AFFECTION_DECAY_RATE = 0.1;
  private readonly INTERACTION_MEMORY_LIMIT = 50;
  
  constructor() {
    logger.info('Relationship Depth Manager initialized');
  }

  /**
   * Get or create a relationship between two bots
   */
  getOrCreateRelationship(ownerId: string, targetId: string): DeepRelationship {
    if (!this.relationships.has(ownerId)) {
      this.relationships.set(ownerId, new Map());
    }
    
    const ownerRelations = this.relationships.get(ownerId)!;
    
    if (!ownerRelations.has(targetId)) {
      const relationship: DeepRelationship = {
        id: uuidv4(),
        ownerId,
        targetId,
        category: RelationshipCategory.STRANGER,
        
        trust: 30,
        respect: 30,
        affection: 20,
        intimacy: 10,
        loyalty: 20,
        
        resentment: 0,
        jealousy: 0,
        fear: 0,
        
        interactionCount: 0,
        lastInteraction: Date.now(),
        positiveInteractions: 0,
        negativeInteractions: 0,
        
        sharedMemoryIds: [],
        significantEvents: [],
        
        status: 'ACTIVE',
        formedAt: Date.now(),
        updatedAt: Date.now()
      };
      
      ownerRelations.set(targetId, relationship);
      logger.debug(`New relationship created: ${ownerId} -> ${targetId}`);
    }
    
    return ownerRelations.get(targetId)!;
  }

  /**
   * Record an interaction between two bots
   */
  recordInteraction(bot1Id: string, bot2Id: string, interaction: Interaction): void {
    const rel1 = this.getOrCreateRelationship(bot1Id, bot2Id);
    const rel2 = this.getOrCreateRelationship(bot2Id, bot1Id);
    
    // Update both relationships
    [rel1, rel2].forEach(rel => {
      rel.interactionCount++;
      rel.lastInteraction = Date.now();
      rel.updatedAt = Date.now();
      
      if (interaction.success) {
        rel.positiveInteractions++;
      } else {
        rel.negativeInteractions++;
      }
    });
    
    // Apply effects based on interaction type
    this.applyInteractionEffects(rel1, rel2, interaction);
    
    // Check for category upgrades/downgrades
    this.updateRelationshipCategory(rel1);
    this.updateRelationshipCategory(rel2);
    
    logger.debug(`Interaction recorded: ${bot1Id} <-> ${bot2Id} (${interaction.type})`);
  }

  /**
   * Apply effects of an interaction to relationships
   */
  private applyInteractionEffects(
    rel1: DeepRelationship,
    rel2: DeepRelationship,
    interaction: Interaction
  ): void {
    const positive = interaction.success;
    
    switch (interaction.type) {
      case InteractionType.CONVERSATION:
        if (positive) {
          this.adjustDimension(rel1, 'affection', 2);
          this.adjustDimension(rel2, 'affection', 2);
          this.adjustDimension(rel1, 'intimacy', 1);
          this.adjustDimension(rel2, 'intimacy', 1);
        } else {
          this.adjustDimension(rel1, 'resentment', 3);
          this.adjustDimension(rel2, 'resentment', 3);
        }
        break;
        
      case InteractionType.COOPERATION:
        if (positive) {
          this.adjustDimension(rel1, 'trust', 5);
          this.adjustDimension(rel2, 'trust', 5);
          this.adjustDimension(rel1, 'respect', 3);
          this.adjustDimension(rel2, 'respect', 3);
        } else {
          this.adjustDimension(rel1, 'trust', -8);
          this.adjustDimension(rel2, 'trust', -8);
        }
        break;
        
      case InteractionType.CONFLICT:
        this.adjustDimension(rel1, 'resentment', positive ? 2 : 10);
        this.adjustDimension(rel2, 'resentment', positive ? 2 : 10);
        this.adjustDimension(rel1, 'trust', -5);
        this.adjustDimension(rel2, 'trust', -5);
        break;
        
      case InteractionType.GIFT:
        if (positive) {
          this.adjustDimension(rel1, 'affection', 8);
          this.adjustDimension(rel2, 'affection', 5);
          this.adjustDimension(rel1, 'trust', 3);
        }
        break;
        
      case InteractionType.HELP:
        if (positive) {
          this.adjustDimension(rel1, 'trust', 8);
          this.adjustDimension(rel2, 'trust', 5);
          this.adjustDimension(rel1, 'respect', 5);
          this.adjustDimension(rel1, 'loyalty', 3);
        } else {
          this.adjustDimension(rel1, 'trust', -10);
          this.adjustDimension(rel1, 'resentment', 8);
        }
        break;
        
      case InteractionType.COMBAT_TOGETHER:
        if (positive) {
          this.adjustDimension(rel1, 'trust', 10);
          this.adjustDimension(rel2, 'trust', 10);
          this.adjustDimension(rel1, 'loyalty', 8);
          this.adjustDimension(rel2, 'loyalty', 8);
          this.adjustDimension(rel1, 'intimacy', 5);
          this.adjustDimension(rel2, 'intimacy', 5);
        }
        break;
        
      case InteractionType.SHARED_DANGER:
        this.adjustDimension(rel1, 'intimacy', 10);
        this.adjustDimension(rel2, 'intimacy', 10);
        if (positive) {
          this.adjustDimension(rel1, 'trust', 15);
          this.adjustDimension(rel2, 'trust', 15);
        }
        break;
        
      case InteractionType.TEACHING:
        if (positive) {
          this.adjustDimension(rel1, 'respect', 5);  // Student gains respect
          this.adjustDimension(rel2, 'affection', 3);  // Teacher feels warmth
          this.adjustDimension(rel1, 'trust', 2);
        }
        break;
        
      case InteractionType.TRADE:
        if (positive) {
          this.adjustDimension(rel1, 'trust', 3);
          this.adjustDimension(rel2, 'trust', 3);
        } else {
          this.adjustDimension(rel1, 'trust', -5);
          this.adjustDimension(rel2, 'trust', -5);
        }
        break;
    }
  }

  /**
   * Adjust a relationship dimension
   */
  /**
   * Adjust a relationship dimension
   * Note: Both positive and negative dimensions use the same clamping logic (0-100)
   * but are tracked separately for semantic clarity in the relationship model
   */
  private adjustDimension(
    rel: DeepRelationship,
    dimension: keyof DeepRelationship,
    amount: number
  ): void {
    if (typeof rel[dimension] === 'number') {
      const current = rel[dimension] as number;
      // Clamp all dimensions to 0-100 range
      (rel as unknown as Record<string, number>)[dimension as string] = Math.max(0, Math.min(100, current + amount));
    }
  }

  /**
   * Update relationship category based on current state
   */
  private updateRelationshipCategory(rel: DeepRelationship): void {
    const overallPositive = (rel.trust + rel.respect + rel.affection + rel.loyalty) / 4;
    const overallNegative = (rel.resentment + rel.jealousy + rel.fear) / 3;
    
    // Don't change family relationships
    const familyCategories = [
      RelationshipCategory.PARENT, RelationshipCategory.CHILD,
      RelationshipCategory.SIBLING, RelationshipCategory.GRANDPARENT,
      RelationshipCategory.GRANDCHILD, RelationshipCategory.EXTENDED_FAMILY
    ];
    
    if (familyCategories.includes(rel.category)) return;
    
    // Don't change partner status here (handled separately)
    if (rel.category === RelationshipCategory.PARTNER) return;
    
    // Determine new category
    if (overallNegative > 70 && rel.resentment > 60) {
      rel.category = RelationshipCategory.NEMESIS;
    } else if (overallNegative > 50) {
      rel.category = RelationshipCategory.ENEMY;
    } else if (overallNegative > 30 && overallPositive < 50) {
      rel.category = RelationshipCategory.RIVAL;
    } else if (overallPositive > 85 && rel.intimacy > 70) {
      rel.category = RelationshipCategory.BEST_FRIEND;
    } else if (overallPositive > 70) {
      rel.category = RelationshipCategory.CLOSE_FRIEND;
    } else if (overallPositive > 50) {
      rel.category = RelationshipCategory.FRIEND;
    } else if (rel.interactionCount > 5) {
      rel.category = RelationshipCategory.ACQUAINTANCE;
    }
  }

  /**
   * Add a significant event to relationship history
   */
  addSignificantEvent(
    bot1Id: string,
    bot2Id: string,
    eventType: RelationshipEventType,
    description: string,
    impact: number
  ): void {
    const rel1 = this.getOrCreateRelationship(bot1Id, bot2Id);
    const rel2 = this.getOrCreateRelationship(bot2Id, bot1Id);
    
    const event: RelationshipEvent = {
      id: uuidv4(),
      timestamp: Date.now(),
      type: eventType,
      description,
      impact,
      remembered: true
    };
    
    rel1.significantEvents.push(event);
    rel2.significantEvents.push({ ...event, id: uuidv4() });
    
    // Limit event history
    if (rel1.significantEvents.length > this.INTERACTION_MEMORY_LIMIT) {
      rel1.significantEvents = rel1.significantEvents.slice(-this.INTERACTION_MEMORY_LIMIT);
    }
    if (rel2.significantEvents.length > this.INTERACTION_MEMORY_LIMIT) {
      rel2.significantEvents = rel2.significantEvents.slice(-this.INTERACTION_MEMORY_LIMIT);
    }
    
    // Apply impact to dimensions
    if (impact > 0) {
      this.adjustDimension(rel1, 'affection', impact / 10);
      this.adjustDimension(rel1, 'trust', impact / 15);
      this.adjustDimension(rel2, 'affection', impact / 10);
      this.adjustDimension(rel2, 'trust', impact / 15);
    } else {
      this.adjustDimension(rel1, 'resentment', Math.abs(impact) / 10);
      this.adjustDimension(rel1, 'trust', impact / 10);
      this.adjustDimension(rel2, 'resentment', Math.abs(impact) / 10);
      this.adjustDimension(rel2, 'trust', impact / 10);
    }
    
    logger.debug(`Significant event: ${eventType} between ${bot1Id} and ${bot2Id}`);
  }

  /**
   * Set family relationship
   */
  setFamilyRelationship(
    ownerId: string,
    targetId: string,
    category: RelationshipCategory
  ): void {
    const rel = this.getOrCreateRelationship(ownerId, targetId);
    rel.category = category;
    
    // Family starts with higher base values
    rel.trust = 60;
    rel.affection = 70;
    rel.loyalty = 75;
    rel.intimacy = 50;
    
    this.addSignificantEvent(
      ownerId, targetId,
      RelationshipEventType.FIRST_MEETING,
      `Family bond formed (${category})`,
      50
    );
  }

  /**
   * Get relationship analysis
   */
  analyzeRelationship(bot1Id: string, bot2Id: string): RelationshipAnalysis {
    const rel = this.getOrCreateRelationship(bot1Id, bot2Id);
    
    const positiveScore = (rel.trust + rel.respect + rel.affection + rel.intimacy + rel.loyalty) / 5;
    const negativeScore = (rel.resentment + rel.jealousy + rel.fear) / 3;
    
    const overallScore = Math.max(0, positiveScore - negativeScore * 0.5);
    const compatibility = positiveScore;
    const tension = negativeScore;
    
    // Determine trend
    const recentEvents = rel.significantEvents.slice(-10);
    const recentImpact = recentEvents.reduce((sum, e) => sum + e.impact, 0);
    
    let potential: RelationshipAnalysis['potential'];
    if (Math.abs(recentImpact) < 10) {
      potential = 'STABLE';
    } else if (recentImpact > 20) {
      potential = 'IMPROVING';
    } else if (recentImpact < -20) {
      potential = 'DECLINING';
    } else {
      potential = 'VOLATILE';
    }
    
    // Identify strengths and concerns
    const strengths: string[] = [];
    const concerns: string[] = [];
    
    if (rel.trust > 70) strengths.push('High trust');
    if (rel.loyalty > 70) strengths.push('Strong loyalty');
    if (rel.affection > 70) strengths.push('Deep affection');
    if (rel.respect > 70) strengths.push('Mutual respect');
    
    if (rel.resentment > 30) concerns.push('Growing resentment');
    if (rel.jealousy > 30) concerns.push('Jealousy issues');
    if (rel.fear > 30) concerns.push('Fear present');
    if (rel.trust < 30) concerns.push('Trust deficit');
    
    return {
      overallScore: Math.round(overallScore),
      compatibility: Math.round(compatibility),
      tension: Math.round(tension),
      potential,
      strengths,
      concerns
    };
  }

  /**
   * Get all relationships for a bot
   */
  getRelationships(botId: string): DeepRelationship[] {
    const botRelations = this.relationships.get(botId);
    if (!botRelations) return [];
    return Array.from(botRelations.values());
  }

  /**
   * Get relationships by category
   */
  getRelationshipsByCategory(botId: string, category: RelationshipCategory): DeepRelationship[] {
    return this.getRelationships(botId).filter(r => r.category === category);
  }

  /**
   * Get closest relationships
   */
  getClosestRelationships(botId: string, limit: number = 5): DeepRelationship[] {
    return this.getRelationships(botId)
      .filter(r => r.status === 'ACTIVE')
      .sort((a, b) => {
        const scoreA = a.trust + a.affection + a.intimacy + a.loyalty;
        const scoreB = b.trust + b.affection + b.intimacy + b.loyalty;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Process relationship decay over time
   */
  processRelationshipDecay(deltaMs: number): void {
    const decayAmount = this.AFFECTION_DECAY_RATE * (deltaMs / 60000);
    
    for (const [_botId, botRelations] of this.relationships) {
      for (const [_targetId, rel] of botRelations) {
        const timeSinceInteraction = Date.now() - rel.lastInteraction;
        
        // Decay only if no recent interaction (> 1 hour)
        if (timeSinceInteraction > 3600000) {
          // Non-family relationships decay slowly
          const familyCategories = [
            RelationshipCategory.PARENT, RelationshipCategory.CHILD,
            RelationshipCategory.SIBLING, RelationshipCategory.PARTNER
          ];
          
          if (!familyCategories.includes(rel.category)) {
            rel.affection = Math.max(20, rel.affection - decayAmount);
            rel.intimacy = Math.max(10, rel.intimacy - decayAmount * 0.5);
          }
          
          // Resentment also decays (healing)
          rel.resentment = Math.max(0, rel.resentment - decayAmount * 0.3);
          rel.jealousy = Math.max(0, rel.jealousy - decayAmount * 0.2);
        }
      }
    }
  }

  /**
   * Serialize for persistence
   */
  serialize(): { botId: string; relationships: DeepRelationship[] }[] {
    return Array.from(this.relationships.entries()).map(([botId, relMap]) => ({
      botId,
      relationships: Array.from(relMap.values())
    }));
  }

  /**
   * Load from persistence
   */
  load(data: { botId: string; relationships: DeepRelationship[] }[]): void {
    this.relationships.clear();
    
    for (const entry of data) {
      const relMap = new Map<string, DeepRelationship>();
      for (const rel of entry.relationships) {
        relMap.set(rel.targetId, rel);
      }
      this.relationships.set(entry.botId, relMap);
    }
    
    logger.info('Relationship data loaded');
  }
}

// Singleton
let relationshipManagerInstance: RelationshipDepthManager | null = null;

export function getRelationshipManager(): RelationshipDepthManager {
  if (!relationshipManagerInstance) {
    relationshipManagerInstance = new RelationshipDepthManager();
  }
  return relationshipManagerInstance;
}

export function resetRelationshipManager(): void {
  relationshipManagerInstance = null;
}

export default RelationshipDepthManager;
