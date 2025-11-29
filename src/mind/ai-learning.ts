/**
 * BlockLife AI - Learning & Training System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * AUTO-LEARNING & SCHEDULED TRAINING
 * 
 * This system enables the AI to:
 * - Collect training data during normal operation
 * - Store experiences (decisions, outcomes, feedback)
 * - Schedule automatic training sessions
 * - Improve AI performance over time
 * - Persist learned data for future use
 * 
 * The AI gets smarter the more you use it!
 */

import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../utils/logger';
import { getSystemStatus, EventCategory, LogLevel } from '../utils/system-status';
import { BotIntent, Role, Mood, Position, Era, ThreatLevel } from '../types';

const logger = createLogger('ai-learning');

// ============================================================================
// TYPES
// ============================================================================

export interface TrainingDataPoint {
  id: string;
  timestamp: number;
  type: 'DECISION' | 'OUTCOME' | 'FEEDBACK' | 'INTERACTION' | 'BEHAVIOR';
  
  // Context when the event happened
  context: {
    botId?: string;
    botRole?: Role;
    botMood?: Mood;
    era?: Era;
    threatLevel?: ThreatLevel;
    timeOfDay?: string;
    needs?: {
      hunger: number;
      energy: number;
      safety: number;
      social: number;
    };
  };
  
  // What happened
  action: {
    intent?: BotIntent;
    target?: string;
    position?: Position;
    details?: string;
  };
  
  // Result/feedback
  outcome: {
    success: boolean;
    reward?: number; // -100 to 100
    feedback?: string;
    metrics?: Record<string, number>;
  };
  
  // Metadata
  metadata?: Record<string, any>;
}

export interface TrainingSession {
  id: string;
  startTime: number;
  endTime?: number;
  dataPointsProcessed: number;
  improvements: string[];
  status: 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
}

export interface LearningConfig {
  // Data collection
  enabled: boolean;
  collectDecisions: boolean;
  collectOutcomes: boolean;
  collectFeedback: boolean;
  maxDataPoints: number;
  
  // Training schedule
  autoTrainingEnabled: boolean;
  trainingSchedule: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MANUAL';
  trainingTime?: string; // "02:00" for 2 AM
  
  // Storage
  dataDir: string;
  maxStorageMb: number;
  
  // Performance
  batchSize: number;
  learningRate: number;
}

const DEFAULT_CONFIG: LearningConfig = {
  enabled: true,
  collectDecisions: true,
  collectOutcomes: true,
  collectFeedback: true,
  maxDataPoints: 100000,
  
  autoTrainingEnabled: true,
  trainingSchedule: 'DAILY',
  trainingTime: '03:00', // 3 AM
  
  dataDir: './data/training',
  maxStorageMb: 500,
  
  batchSize: 1000,
  learningRate: 0.01
};

// ============================================================================
// LEARNING MANAGER
// ============================================================================

export class AILearningManager {
  private static instance: AILearningManager | null = null;
  
  private config: LearningConfig;
  private dataPoints: TrainingDataPoint[] = [];
  private sessions: TrainingSession[] = [];
  private nextTrainingTime: number = 0;
  private trainingInterval: NodeJS.Timeout | null = null;
  
  // Statistics
  private totalDataCollected: number = 0;
  private totalTrainingSessions: number = 0;
  private lastTrainingTime: number = 0;
  
  // Learning metrics
  private learnedPatterns: Map<string, { count: number; avgReward: number }> = new Map();
  private rolePerformance: Map<Role, { decisions: number; successes: number }> = new Map();
  
  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.ensureDataDirectory();
    this.loadExistingData();
    
    logger.info('AI Learning Manager initialized');
  }
  
  static getInstance(): AILearningManager {
    if (!AILearningManager.instance) {
      AILearningManager.instance = new AILearningManager();
    }
    return AILearningManager.instance;
  }
  
  // ============================================================================
  // LIFECYCLE
  // ============================================================================
  
  /**
   * Start the learning system
   */
  start(): void {
    if (!this.config.enabled) {
      logger.info('AI Learning is disabled');
      return;
    }
    
    // Schedule training if enabled
    if (this.config.autoTrainingEnabled) {
      this.scheduleNextTraining();
      
      // Check every hour if it's time to train
      this.trainingInterval = setInterval(() => {
        this.checkAndRunTraining();
      }, 3600000); // 1 hour
    }
    
    const status = getSystemStatus();
    status.logEvent({
      category: EventCategory.SYSTEM,
      level: LogLevel.INFO,
      source: 'ai-learning',
      message: 'AI Learning system started - collecting training data'
    });
    
    logger.info('AI Learning system started');
    console.log('\n📚 AI Learning System: ACTIVE');
    console.log('   The AI will collect data and improve over time.');
    console.log(`   Auto-training: ${this.config.autoTrainingEnabled ? 'ON' : 'OFF'}`);
    if (this.config.autoTrainingEnabled) {
      console.log(`   Schedule: ${this.config.trainingSchedule} at ${this.config.trainingTime || 'default'}`);
    }
    console.log('');
  }
  
  /**
   * Stop the learning system
   */
  stop(): void {
    if (this.trainingInterval) {
      clearInterval(this.trainingInterval);
      this.trainingInterval = null;
    }
    
    // Save all data before stopping
    this.saveData();
    
    logger.info('AI Learning system stopped');
  }
  
  // ============================================================================
  // DATA COLLECTION
  // ============================================================================
  
  /**
   * Record a decision made by a bot
   */
  recordDecision(
    botId: string,
    intent: BotIntent,
    context: TrainingDataPoint['context'],
    details?: string
  ): string {
    if (!this.config.enabled || !this.config.collectDecisions) {
      return '';
    }
    
    const dataPoint: TrainingDataPoint = {
      id: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'DECISION',
      context: { ...context, botId },
      action: { intent, details },
      outcome: { success: true } // Will be updated later
    };
    
    this.addDataPoint(dataPoint);
    return dataPoint.id;
  }
  
  /**
   * Record the outcome of a decision
   */
  recordOutcome(
    decisionId: string,
    success: boolean,
    reward: number,
    feedback?: string
  ): void {
    if (!this.config.enabled || !this.config.collectOutcomes) {
      return;
    }
    
    // Find and update the original decision
    const decision = this.dataPoints.find(d => d.id === decisionId);
    if (decision) {
      decision.outcome = {
        success,
        reward,
        feedback
      };
      
      // Update learned patterns
      this.updateLearnedPattern(decision);
    } else {
      // Record as standalone outcome
      const dataPoint: TrainingDataPoint = {
        id: `outcome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: 'OUTCOME',
        context: {},
        action: {},
        outcome: { success, reward, feedback },
        metadata: { originalDecisionId: decisionId }
      };
      
      this.addDataPoint(dataPoint);
    }
  }
  
  /**
   * Record user feedback
   */
  recordFeedback(
    feedback: string,
    rating: number, // 1-5 stars or -100 to 100
    context?: TrainingDataPoint['context']
  ): void {
    if (!this.config.enabled || !this.config.collectFeedback) {
      return;
    }
    
    const dataPoint: TrainingDataPoint = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'FEEDBACK',
      context: context || {},
      action: {},
      outcome: {
        success: rating > 0,
        reward: rating,
        feedback
      }
    };
    
    this.addDataPoint(dataPoint);
    logger.info(`User feedback recorded: ${feedback} (rating: ${rating})`);
  }
  
  /**
   * Record a bot behavior observation
   */
  recordBehavior(
    botId: string,
    behavior: string,
    wasSuccessful: boolean,
    context: TrainingDataPoint['context']
  ): void {
    if (!this.config.enabled) return;
    
    const dataPoint: TrainingDataPoint = {
      id: `behavior_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'BEHAVIOR',
      context: { ...context, botId },
      action: { details: behavior },
      outcome: { success: wasSuccessful, reward: wasSuccessful ? 10 : -10 }
    };
    
    this.addDataPoint(dataPoint);
  }
  
  /**
   * Add a data point with limit checking
   */
  private addDataPoint(dataPoint: TrainingDataPoint): void {
    this.dataPoints.push(dataPoint);
    this.totalDataCollected++;
    
    // Enforce limit
    if (this.dataPoints.length > this.config.maxDataPoints) {
      // Remove oldest data points
      const toRemove = this.dataPoints.length - this.config.maxDataPoints;
      this.dataPoints.splice(0, toRemove);
    }
    
    // Periodically save to disk
    if (this.totalDataCollected % 1000 === 0) {
      this.saveData();
    }
  }
  
  /**
   * Update learned patterns from a decision
   */
  private updateLearnedPattern(decision: TrainingDataPoint): void {
    const key = this.getPatternKey(decision);
    
    const existing = this.learnedPatterns.get(key) || { count: 0, avgReward: 0 };
    const newCount = existing.count + 1;
    const newAvgReward = (existing.avgReward * existing.count + (decision.outcome.reward || 0)) / newCount;
    
    this.learnedPatterns.set(key, { count: newCount, avgReward: newAvgReward });
    
    // Update role performance
    if (decision.context.botRole) {
      const roleStats = this.rolePerformance.get(decision.context.botRole) || { decisions: 0, successes: 0 };
      roleStats.decisions++;
      if (decision.outcome.success) roleStats.successes++;
      this.rolePerformance.set(decision.context.botRole, roleStats);
    }
  }
  
  /**
   * Generate a pattern key for a decision
   */
  private getPatternKey(decision: TrainingDataPoint): string {
    const parts = [
      decision.context.botRole || 'UNKNOWN',
      decision.action.intent || 'NONE',
      decision.context.threatLevel || 'NONE'
    ];
    return parts.join('_');
  }
  
  // ============================================================================
  // TRAINING
  // ============================================================================
  
  /**
   * Schedule the next training session
   */
  private scheduleNextTraining(): void {
    const now = new Date();
    let nextTime: Date;
    
    switch (this.config.trainingSchedule) {
      case 'HOURLY':
        nextTime = new Date(now.getTime() + 3600000);
        break;
        
      case 'DAILY':
        nextTime = new Date(now);
        if (this.config.trainingTime) {
          const [hours, minutes] = this.config.trainingTime.split(':').map(Number);
          nextTime.setHours(hours, minutes, 0, 0);
          if (nextTime <= now) {
            nextTime.setDate(nextTime.getDate() + 1);
          }
        } else {
          nextTime.setHours(3, 0, 0, 0); // Default 3 AM
          if (nextTime <= now) {
            nextTime.setDate(nextTime.getDate() + 1);
          }
        }
        break;
        
      case 'WEEKLY':
        nextTime = new Date(now);
        nextTime.setDate(nextTime.getDate() + (7 - nextTime.getDay())); // Next Sunday
        nextTime.setHours(3, 0, 0, 0);
        if (nextTime <= now) {
          nextTime.setDate(nextTime.getDate() + 7);
        }
        break;
        
      default:
        return; // Manual only
    }
    
    this.nextTrainingTime = nextTime.getTime();
    logger.info(`Next training scheduled for: ${nextTime.toLocaleString()}`);
  }
  
  /**
   * Check if it's time to run training
   */
  private checkAndRunTraining(): void {
    if (!this.config.autoTrainingEnabled) return;
    
    const now = Date.now();
    if (now >= this.nextTrainingTime && this.nextTrainingTime > 0) {
      this.runTraining();
      this.scheduleNextTraining();
    }
  }
  
  /**
   * Run a training session
   */
  async runTraining(): Promise<TrainingSession> {
    const session: TrainingSession = {
      id: `session_${Date.now()}`,
      startTime: Date.now(),
      dataPointsProcessed: 0,
      improvements: [],
      status: 'RUNNING'
    };
    
    this.sessions.push(session);
    
    const status = getSystemStatus();
    status.logEvent({
      category: EventCategory.SYSTEM,
      level: LogLevel.INFO,
      source: 'ai-learning',
      message: 'Starting AI training session...'
    });
    
    logger.info('Starting training session...');
    console.log('\n🎓 AI Training Session Started');
    console.log(`   Processing ${this.dataPoints.length} data points...`);
    
    try {
      // Process data in batches
      const batches = this.createBatches(this.dataPoints, this.config.batchSize);
      
      for (const batch of batches) {
        await this.processBatch(batch, session);
      }
      
      // Analyze patterns and generate improvements
      const improvements = this.analyzePatterns();
      session.improvements = improvements;
      
      // Save learned data
      this.saveLearnedData();
      
      session.status = 'COMPLETED';
      session.endTime = Date.now();
      this.totalTrainingSessions++;
      this.lastTrainingTime = Date.now();
      
      const duration = (session.endTime - session.startTime) / 1000;
      console.log(`\n✅ Training Complete!`);
      console.log(`   Processed: ${session.dataPointsProcessed} data points`);
      console.log(`   Duration: ${duration.toFixed(1)} seconds`);
      console.log(`   Improvements found: ${session.improvements.length}`);
      
      if (session.improvements.length > 0) {
        console.log('\n   Improvements:');
        session.improvements.slice(0, 5).forEach(imp => {
          console.log(`   • ${imp}`);
        });
      }
      console.log('');
      
      status.logEvent({
        category: EventCategory.SYSTEM,
        level: LogLevel.INFO,
        source: 'ai-learning',
        message: `Training complete: ${session.dataPointsProcessed} points, ${session.improvements.length} improvements`
      });
      
    } catch (error) {
      session.status = 'FAILED';
      session.endTime = Date.now();
      logger.error('Training session failed:', error);
      
      status.logEvent({
        category: EventCategory.SYSTEM,
        level: LogLevel.ERROR,
        source: 'ai-learning',
        message: `Training failed: ${error}`
      });
    }
    
    return session;
  }
  
  /**
   * Create batches from data points
   */
  private createBatches(data: TrainingDataPoint[], batchSize: number): TrainingDataPoint[][] {
    const batches: TrainingDataPoint[][] = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }
    return batches;
  }
  
  /**
   * Process a batch of training data
   */
  private async processBatch(batch: TrainingDataPoint[], session: TrainingSession): Promise<void> {
    for (const dataPoint of batch) {
      // Update patterns from this data point
      this.updateLearnedPattern(dataPoint);
      session.dataPointsProcessed++;
    }
    
    // Small delay to prevent blocking
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  /**
   * Analyze learned patterns and generate improvements
   */
  private analyzePatterns(): string[] {
    const improvements: string[] = [];
    
    // Analyze role performance
    for (const [role, stats] of this.rolePerformance) {
      const successRate = stats.successes / stats.decisions;
      
      if (successRate < 0.5) {
        improvements.push(`${role} bots need improvement (${(successRate * 100).toFixed(1)}% success rate)`);
      } else if (successRate > 0.8) {
        improvements.push(`${role} bots are performing well (${(successRate * 100).toFixed(1)}% success rate)`);
      }
    }
    
    // Analyze decision patterns
    const sortedPatterns = Array.from(this.learnedPatterns.entries())
      .sort((a, b) => b[1].avgReward - a[1].avgReward);
    
    // Best patterns
    const bestPatterns = sortedPatterns.slice(0, 3).filter(p => p[1].avgReward > 0);
    for (const [pattern, stats] of bestPatterns) {
      improvements.push(`Effective pattern: ${pattern} (avg reward: ${stats.avgReward.toFixed(1)})`);
    }
    
    // Worst patterns to avoid
    const worstPatterns = sortedPatterns.slice(-3).filter(p => p[1].avgReward < 0);
    for (const [pattern, stats] of worstPatterns) {
      improvements.push(`Avoid pattern: ${pattern} (avg reward: ${stats.avgReward.toFixed(1)})`);
    }
    
    return improvements;
  }
  
  // ============================================================================
  // INTELLIGENCE QUERIES
  // ============================================================================
  
  /**
   * Get the best action for a situation (learned from data)
   */
  getBestAction(role: Role, threatLevel: ThreatLevel): BotIntent | null {
    const patterns = Array.from(this.learnedPatterns.entries())
      .filter(([key]) => key.startsWith(role) && key.includes(threatLevel))
      .sort((a, b) => b[1].avgReward - a[1].avgReward);
    
    if (patterns.length > 0) {
      const [bestPattern] = patterns[0];
      const parts = bestPattern.split('_');
      return parts[1] as BotIntent;
    }
    
    return null;
  }
  
  /**
   * Get success rate for a role
   */
  getRoleSuccessRate(role: Role): number {
    const stats = this.rolePerformance.get(role);
    if (!stats || stats.decisions === 0) return 0.5; // Default to 50%
    return stats.successes / stats.decisions;
  }
  
  /**
   * Should we try a different approach? (based on learned failures)
   */
  shouldTryAlternative(role: Role, currentIntent: BotIntent): boolean {
    const key = `${role}_${currentIntent}_LOW`;
    const pattern = this.learnedPatterns.get(key);
    
    if (pattern && pattern.count > 10 && pattern.avgReward < -20) {
      return true; // This pattern has consistently failed
    }
    
    return false;
  }
  
  // ============================================================================
  // PERSISTENCE
  // ============================================================================
  
  /**
   * Ensure data directory exists
   */
  private ensureDataDirectory(): void {
    try {
      if (!fs.existsSync(this.config.dataDir)) {
        fs.mkdirSync(this.config.dataDir, { recursive: true });
      }
    } catch (error) {
      logger.warn('Could not create training data directory:', error);
    }
  }
  
  /**
   * Save training data to disk
   */
  private saveData(): void {
    try {
      const dataPath = path.join(this.config.dataDir, 'training_data.json');
      fs.writeFileSync(dataPath, JSON.stringify({
        dataPoints: this.dataPoints.slice(-10000), // Keep last 10k in file
        totalCollected: this.totalDataCollected,
        savedAt: Date.now()
      }, null, 2));
      
      logger.debug(`Saved ${this.dataPoints.length} training data points`);
    } catch (error) {
      logger.warn('Could not save training data:', error);
    }
  }
  
  /**
   * Save learned patterns
   */
  private saveLearnedData(): void {
    try {
      const learnedPath = path.join(this.config.dataDir, 'learned_patterns.json');
      fs.writeFileSync(learnedPath, JSON.stringify({
        patterns: Object.fromEntries(this.learnedPatterns),
        rolePerformance: Object.fromEntries(this.rolePerformance),
        totalSessions: this.totalTrainingSessions,
        lastTraining: this.lastTrainingTime,
        savedAt: Date.now()
      }, null, 2));
      
      logger.info('Saved learned patterns to disk');
    } catch (error) {
      logger.warn('Could not save learned patterns:', error);
    }
  }
  
  /**
   * Load existing training data
   */
  private loadExistingData(): void {
    try {
      // Load training data
      const dataPath = path.join(this.config.dataDir, 'training_data.json');
      if (fs.existsSync(dataPath)) {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        this.dataPoints = data.dataPoints || [];
        this.totalDataCollected = data.totalCollected || this.dataPoints.length;
        logger.info(`Loaded ${this.dataPoints.length} existing training data points`);
      }
      
      // Load learned patterns
      const learnedPath = path.join(this.config.dataDir, 'learned_patterns.json');
      if (fs.existsSync(learnedPath)) {
        const learned = JSON.parse(fs.readFileSync(learnedPath, 'utf-8'));
        this.learnedPatterns = new Map(Object.entries(learned.patterns || {}));
        // Convert string keys back to Role enum
        const roleEntries = Object.entries(learned.rolePerformance || {}) as [string, { decisions: number; successes: number }][];
        this.rolePerformance = new Map(roleEntries.map(([key, val]) => [key as Role, val]));
        this.totalTrainingSessions = learned.totalSessions || 0;
        this.lastTrainingTime = learned.lastTraining || 0;
        logger.info(`Loaded ${this.learnedPatterns.size} learned patterns`);
      }
    } catch (error) {
      logger.warn('Could not load existing training data:', error);
    }
  }
  
  // ============================================================================
  // STATUS & CONFIG
  // ============================================================================
  
  /**
   * Get learning status
   */
  getStatus(): {
    enabled: boolean;
    dataPointsCollected: number;
    learnedPatterns: number;
    totalTrainingSessions: number;
    lastTrainingTime: number;
    nextTrainingTime: number;
    autoTraining: boolean;
  } {
    return {
      enabled: this.config.enabled,
      dataPointsCollected: this.totalDataCollected,
      learnedPatterns: this.learnedPatterns.size,
      totalTrainingSessions: this.totalTrainingSessions,
      lastTrainingTime: this.lastTrainingTime,
      nextTrainingTime: this.nextTrainingTime,
      autoTraining: this.config.autoTrainingEnabled
    };
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<LearningConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.autoTrainingEnabled !== undefined || config.trainingSchedule !== undefined) {
      this.scheduleNextTraining();
    }
    
    logger.info('Learning configuration updated');
  }
  
  /**
   * Get configuration
   */
  getConfig(): LearningConfig {
    return { ...this.config };
  }
  
  /**
   * Manually trigger training
   */
  async triggerTraining(): Promise<TrainingSession> {
    return this.runTraining();
  }
  
  /**
   * Get formatted status string
   */
  getFormattedStatus(): string {
    const status = this.getStatus();
    const lastTraining = status.lastTrainingTime > 0 
      ? new Date(status.lastTrainingTime).toLocaleString() 
      : 'Never';
    const nextTraining = status.nextTrainingTime > 0
      ? new Date(status.nextTrainingTime).toLocaleString()
      : 'Not scheduled';
    
    return `
📚 AI Learning System Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: ${status.enabled ? '🟢 ACTIVE' : '🔴 DISABLED'}
Data Points: ${status.dataPointsCollected.toLocaleString()}
Learned Patterns: ${status.learnedPatterns}
Training Sessions: ${status.totalTrainingSessions}
Last Training: ${lastTraining}
Auto-Training: ${status.autoTraining ? 'ON' : 'OFF'}
Next Training: ${nextTraining}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export function getAILearningManager(): AILearningManager {
  return AILearningManager.getInstance();
}

export default AILearningManager;
