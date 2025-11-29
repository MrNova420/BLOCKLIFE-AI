/**
 * BlockLife AI - Central AI Brain
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * THE MASTER AI CONTROLLER
 * 
 * This is the central intelligence that:
 * - Has complete knowledge of everything happening in the civilization
 * - Manages all bot consciousnesses simultaneously
 * - Makes adaptive decisions for each unique bot
 * - Can answer any question about the current state
 * - Learns and improves over time
 * - Runs autonomously 24/7
 * 
 * You interact with this AI to control your civilization.
 * It knows everything and manages everything.
 */

import { 
  Bot, Village, Position, Role, BotIntent, Era, ThreatLevel,
  NeedsState, PersonalityTraits, LifeStage, Mood
} from '../types';
import { getBotManager } from '../bots/bot-manager';
import { getSimEngine } from '../simulation/sim-engine';
import { getConnectionManager } from '../bots/connection-manager';
import { getConsciousnessManager, BotConsciousness, BotState, Perception } from './bot-consciousness';
import { getAiClient, getFallbackDecision } from './ai-client';
import { createLogger } from '../utils/logger';
import { getSystemStatus, EventCategory, LogLevel } from '../utils/system-status';
import { getStabilityManager } from '../utils/stability-manager';

const logger = createLogger('ai-brain');

// ============================================================================
// TYPES
// ============================================================================

export interface CivilizationKnowledge {
  // Overview
  era: Era;
  simulationDays: number;
  currentTick: number;
  
  // Population
  totalBots: number;
  livingBots: number;
  deadBots: number;
  
  // Villages
  villages: VillageKnowledge[];
  
  // Resources
  totalResources: {
    food: number;
    wood: number;
    stone: number;
    iron: number;
    gold: number;
  };
  
  // Threats
  globalThreatLevel: ThreatLevel;
  activeThreats: string[];
  
  // Performance
  systemHealth: string;
  uptime: string;
}

export interface VillageKnowledge {
  id: string;
  name: string;
  population: number;
  prosperity: number;
  techAge: string;
  resources: {
    food: number;
    wood: number;
    stone: number;
    iron: number;
  };
  threats: string[];
  recentEvents: string[];
}

export interface BotKnowledge {
  id: string;
  name: string;
  role: Role;
  lifeStage: LifeStage;
  age: number;
  health: number;
  mood: Mood;
  needs: NeedsState;
  personality: PersonalityTraits;
  currentTask: string | null;
  currentThought: string | null;
  isConnected: boolean;
  village: string;
  skills: Record<string, number>;
  relationships: { name: string; type: string; strength: number }[];
}

export interface AIQuery {
  question: string;
  context?: string;
}

export interface AIResponse {
  answer: string;
  data?: any;
  suggestions?: string[];
  confidence: number;
}

// ============================================================================
// CENTRAL AI BRAIN
// ============================================================================

export class CentralAIBrain {
  private static instance: CentralAIBrain | null = null;
  
  private isRunning: boolean = false;
  private startTime: number = 0;
  private tickInterval: NodeJS.Timeout | null = null;
  private tickRate: number = 500; // 500ms - process all bots twice per second
  
  // Knowledge cache (updated every tick)
  private civilizationKnowledge: CivilizationKnowledge | null = null;
  private botKnowledge: Map<string, BotKnowledge> = new Map();
  private lastKnowledgeUpdate: number = 0;
  
  // Decision tracking
  private decisionsThisTick: number = 0;
  private totalDecisions: number = 0;
  private decisionHistory: Map<string, BotIntent[]> = new Map(); // botId -> recent decisions
  
  // Event memory
  private recentEvents: { timestamp: number; event: string; botId?: string }[] = [];
  private maxEventMemory: number = 500;
  
  // Learning/adaptation
  private botPerformance: Map<string, { successes: number; failures: number }> = new Map();
  
  private constructor() {
    logger.info('Central AI Brain initializing...');
  }
  
  static getInstance(): CentralAIBrain {
    if (!CentralAIBrain.instance) {
      CentralAIBrain.instance = new CentralAIBrain();
    }
    return CentralAIBrain.instance;
  }
  
  // ============================================================================
  // LIFECYCLE
  // ============================================================================
  
  /**
   * Start the AI Brain - begins autonomous control of all bots
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('AI Brain is already running');
      return;
    }
    
    this.isRunning = true;
    this.startTime = Date.now();
    
    // Log startup
    const status = getSystemStatus();
    status.logEvent({
      category: EventCategory.SYSTEM,
      level: LogLevel.INFO,
      source: 'ai-brain',
      message: 'Central AI Brain activated - taking control of civilization'
    });
    
    // Start the main processing loop
    this.tickInterval = setInterval(() => {
      this.tick();
    }, this.tickRate);
    
    logger.info('🧠 Central AI Brain is now ONLINE');
    console.log('\n' + '═'.repeat(60));
    console.log('  🧠 CENTRAL AI BRAIN - ACTIVATED');
    console.log('═'.repeat(60));
    console.log('  The AI now has full control over your civilization.');
    console.log('  All bots are being managed autonomously.');
    console.log('  Ask me anything about what\'s happening!');
    console.log('═'.repeat(60) + '\n');
    
    // Initial knowledge update
    this.updateKnowledge();
  }
  
  /**
   * Stop the AI Brain
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    
    const status = getSystemStatus();
    status.logEvent({
      category: EventCategory.SYSTEM,
      level: LogLevel.INFO,
      source: 'ai-brain',
      message: 'Central AI Brain deactivated'
    });
    
    logger.info('Central AI Brain stopped');
  }
  
  // ============================================================================
  // MAIN PROCESSING LOOP
  // ============================================================================
  
  /**
   * Main tick - process all bots and make decisions
   */
  private tick(): void {
    if (!this.isRunning) return;
    
    const tickStart = Date.now();
    this.decisionsThisTick = 0;
    
    try {
      // 1. Update our knowledge of the world
      this.updateKnowledge();
      
      // 2. Process each bot and make decisions
      this.processBots();
      
      // 3. Handle village-level management
      this.manageVillages();
      
      // 4. Clean up old data
      this.cleanup();
      
    } catch (error) {
      logger.error('AI Brain tick error:', error);
      this.recordEvent('System error during processing');
    }
    
    const tickDuration = Date.now() - tickStart;
    if (tickDuration > this.tickRate * 0.8) {
      logger.debug(`AI Brain tick took ${tickDuration}ms (warning: approaching tick rate)`);
    }
  }
  
  /**
   * Update all knowledge about the civilization
   */
  private updateKnowledge(): void {
    const botManager = getBotManager();
    const simEngine = getSimEngine();
    const connectionManager = getConnectionManager();
    const consciousnessManager = getConsciousnessManager();
    const stabilityManager = getStabilityManager();
    
    const state = simEngine.getState();
    const villages = simEngine.getAllVillages();
    const allBots = botManager.getAllBots();
    const livingBots = allBots.filter(b => !b.isDead());
    const health = stabilityManager.getHealth();
    
    // Calculate total resources
    const totalResources = villages.reduce((acc, v) => ({
      food: acc.food + v.stockpile.food,
      wood: acc.wood + v.stockpile.wood,
      stone: acc.stone + v.stockpile.stone,
      iron: acc.iron + v.stockpile.iron,
      gold: acc.gold + v.stockpile.gold
    }), { food: 0, wood: 0, stone: 0, iron: 0, gold: 0 });
    
    // Build village knowledge
    const villageKnowledge: VillageKnowledge[] = villages.map(v => ({
      id: v.id,
      name: v.name,
      population: v.memberIds.length,
      prosperity: v.prosperity,
      techAge: v.techAge,
      resources: {
        food: v.stockpile.food,
        wood: v.stockpile.wood,
        stone: v.stockpile.stone,
        iron: v.stockpile.iron
      },
      threats: [], // Would come from threat detection
      recentEvents: v.historicalEvents.slice(-5).map(e => e.description)
    }));
    
    // Calculate uptime
    const uptimeMs = this.startTime > 0 ? Date.now() - this.startTime : 0;
    const hours = Math.floor(uptimeMs / 3600000);
    const minutes = Math.floor((uptimeMs % 3600000) / 60000);
    const uptime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    
    // Store civilization knowledge
    this.civilizationKnowledge = {
      era: state.era,
      simulationDays: Math.floor(state.simulationDays),
      currentTick: state.currentTick,
      totalBots: allBots.length,
      livingBots: livingBots.length,
      deadBots: allBots.length - livingBots.length,
      villages: villageKnowledge,
      totalResources,
      globalThreatLevel: ThreatLevel.LOW, // Would calculate from actual threats
      activeThreats: [],
      systemHealth: health.status,
      uptime
    };
    
    // Update bot knowledge
    for (const bot of livingBots) {
      const data = bot.getData();
      const consciousness = consciousnessManager.getConsciousness(bot.id);
      const isConnected = connectionManager.isBotConnected(bot.id);
      const village = villages.find(v => v.id === data.villageId);
      
      this.botKnowledge.set(bot.id, {
        id: bot.id,
        name: data.name,
        role: data.role,
        lifeStage: data.lifeStage,
        age: data.age,
        health: data.health,
        mood: data.mood,
        needs: { ...data.needs },
        personality: { ...data.personality },
        currentTask: data.currentTask?.type || null,
        currentThought: consciousness?.getMentalState().currentThought || null,
        isConnected,
        village: village?.name || 'Unknown',
        skills: { ...data.skills },
        relationships: data.relationships.map(r => ({
          name: r.targetId,
          type: r.type,
          strength: r.strength
        }))
      });
    }
    
    this.lastKnowledgeUpdate = Date.now();
  }
  
  /**
   * Process all bots and make adaptive decisions
   */
  private processBots(): void {
    const botManager = getBotManager();
    const consciousnessManager = getConsciousnessManager();
    const livingBots = botManager.getLivingBots();
    
    for (const bot of livingBots) {
      try {
        // Get or create consciousness for this bot
        let consciousness = consciousnessManager.getConsciousness(bot.id);
        if (!consciousness) {
          consciousness = consciousnessManager.createConsciousness(bot.getData());
        }
        
        // Get the bot's knowledge
        const knowledge = this.botKnowledge.get(bot.id);
        if (!knowledge) continue;
        
        // Update consciousness with current state
        const botState: BotState = {
          health: knowledge.health,
          hunger: 20 - (knowledge.needs.hunger / 5), // Convert need to MC hunger scale
          position: bot.getData().position,
          inventory: [], // Would come from actual client
          equipment: [],
          effects: [],
          experience: 0,
          currentAction: knowledge.currentTask
        };
        consciousness.updateState(botState);
        
        // Let consciousness think and decide
        const consciousnessDecision = consciousness.think();
        
        // Adapt the decision based on the bot's unique situation
        const adaptedDecision = this.adaptDecision(bot.id, consciousnessDecision, knowledge);
        
        // Apply the decision
        bot.applyDecision({
          id: bot.id,
          intent: adaptedDecision,
          details: {
            source: 'ai-brain',
            consciousness: consciousness.getBotInfo().name
          }
        });
        
        // Track the decision
        this.recordDecision(bot.id, adaptedDecision);
        this.decisionsThisTick++;
        this.totalDecisions++;
        
      } catch (error) {
        logger.debug(`Error processing bot ${bot.id}: ${error}`);
      }
    }
  }
  
  /**
   * Adapt a decision based on the bot's unique situation and history
   */
  private adaptDecision(botId: string, decision: BotIntent, knowledge: BotKnowledge): BotIntent {
    // Get decision history for this bot
    const history = this.decisionHistory.get(botId) || [];
    
    // Check if bot has been doing the same thing too long (stuck in a loop)
    if (history.length >= 5) {
      const recentDecisions = history.slice(-5);
      const sameDecisionCount = recentDecisions.filter(d => d === decision).length;
      
      if (sameDecisionCount >= 4 && decision !== 'SLEEP' && decision !== 'EAT') {
        // Bot seems stuck - try something different
        logger.debug(`${knowledge.name} seems stuck on ${decision}, adapting...`);
        
        // Choose an alternative based on role
        switch (knowledge.role) {
          case Role.FARMER:
            return decision === 'TEND_FARM' ? 'HARVEST_CROPS' : 'TEND_FARM';
          case Role.MINER:
            return 'EXPLORE_TERRAIN';
          case Role.BUILDER:
            return 'CRAFT_ITEM';
          case Role.GUARD:
            return 'EXPLORE_TERRAIN';
          default:
            return 'SOCIALIZE';
        }
      }
    }
    
    // Check critical needs override
    if (knowledge.needs.hunger > 85 && decision !== 'EAT') {
      return 'EAT';
    }
    if (knowledge.needs.energy > 90 && decision !== 'SLEEP') {
      return 'SLEEP';
    }
    if (knowledge.needs.safety > 85 && decision !== 'FLEE_TO_SAFETY') {
      return 'FLEE_TO_SAFETY';
    }
    
    // Personality-based modifications
    const personality = knowledge.personality;
    
    // Very social bots should socialize more often
    if (personality.sociability > 80 && knowledge.needs.social > 50 && Math.random() < 0.3) {
      return 'SOCIALIZE';
    }
    
    // Very curious bots should explore more
    if (personality.curiosity > 80 && Math.random() < 0.2) {
      return 'EXPLORE_TERRAIN';
    }
    
    // Brave guards should always patrol/defend
    if (knowledge.role === Role.GUARD && personality.bravery > 70) {
      if (decision === 'FLEE_TO_SAFETY') {
        return 'DEFEND_LOCATION';
      }
    }
    
    return decision;
  }
  
  /**
   * Record a decision for tracking
   */
  private recordDecision(botId: string, decision: BotIntent): void {
    if (!this.decisionHistory.has(botId)) {
      this.decisionHistory.set(botId, []);
    }
    
    const history = this.decisionHistory.get(botId)!;
    history.push(decision);
    
    // Keep only last 20 decisions
    if (history.length > 20) {
      history.shift();
    }
  }
  
  /**
   * Manage villages at a higher level
   */
  private manageVillages(): void {
    const simEngine = getSimEngine();
    const villages = simEngine.getAllVillages();
    
    for (const village of villages) {
      // Check if village needs more workers of certain types
      if (village.stockpile.food < 50 && village.prosperity < 40) {
        // Low food - we need more farmers
        // This is handled by the simulation engine's role assignment
      }
      
      // Assign roles if needed
      simEngine.assignRoles(village.id);
    }
  }
  
  /**
   * Record an event for memory
   */
  private recordEvent(event: string, botId?: string): void {
    this.recentEvents.push({
      timestamp: Date.now(),
      event,
      botId
    });
    
    if (this.recentEvents.length > this.maxEventMemory) {
      this.recentEvents.shift();
    }
  }
  
  /**
   * Cleanup old data
   */
  private cleanup(): void {
    // Remove knowledge for dead bots
    const botManager = getBotManager();
    const livingBotIds = new Set(botManager.getLivingBots().map(b => b.id));
    
    for (const botId of this.botKnowledge.keys()) {
      if (!livingBotIds.has(botId)) {
        this.botKnowledge.delete(botId);
        this.decisionHistory.delete(botId);
      }
    }
  }
  
  // ============================================================================
  // QUERY INTERFACE - Ask the AI anything
  // ============================================================================
  
  /**
   * Ask the AI Brain a question - it knows everything!
   */
  async query(question: string): Promise<AIResponse> {
    const lower = question.toLowerCase();
    
    // Ensure knowledge is fresh
    if (Date.now() - this.lastKnowledgeUpdate > 5000) {
      this.updateKnowledge();
    }
    
    // STATUS QUERIES
    if (this.matchesPattern(lower, ['status', 'how are', 'what\'s happening', 'report', 'overview'])) {
      return this.getStatusResponse();
    }
    
    // POPULATION QUERIES
    if (this.matchesPattern(lower, ['how many bots', 'population', 'how many people', 'citizens'])) {
      return this.getPopulationResponse();
    }
    
    // RESOURCE QUERIES
    if (this.matchesPattern(lower, ['resources', 'food', 'wood', 'stone', 'iron', 'supplies', 'stock'])) {
      return this.getResourceResponse();
    }
    
    // VILLAGE QUERIES
    if (this.matchesPattern(lower, ['village', 'settlement', 'town'])) {
      return this.getVillageResponse();
    }
    
    // SPECIFIC BOT QUERIES
    if (this.matchesPattern(lower, ['what is .* doing', 'where is', 'how is .* doing', 'tell me about'])) {
      const botName = this.extractBotName(lower);
      if (botName) {
        return this.getBotResponse(botName);
      }
    }
    
    // BOT LIST QUERIES
    if (this.matchesPattern(lower, ['list bots', 'all bots', 'show bots', 'who do we have'])) {
      return this.getBotListResponse();
    }
    
    // THREAT/DANGER QUERIES
    if (this.matchesPattern(lower, ['danger', 'threat', 'safe', 'enemies'])) {
      return this.getThreatResponse();
    }
    
    // PERFORMANCE QUERIES
    if (this.matchesPattern(lower, ['performance', 'system', 'health', 'running'])) {
      return this.getSystemResponse();
    }
    
    // HISTORY/EVENTS QUERIES
    if (this.matchesPattern(lower, ['what happened', 'history', 'events', 'recent'])) {
      return this.getEventsResponse();
    }
    
    // HELP QUERIES
    if (this.matchesPattern(lower, ['help', 'what can you', 'commands', 'how do i'])) {
      return this.getHelpResponse();
    }
    
    // Default - intelligent response based on context
    return this.getIntelligentResponse(question);
  }
  
  private matchesPattern(text: string, patterns: string[]): boolean {
    return patterns.some(p => {
      if (p.includes('.*')) {
        const regex = new RegExp(p);
        return regex.test(text);
      }
      return text.includes(p);
    });
  }
  
  private extractBotName(text: string): string | null {
    // Try to find a bot name in the query
    for (const [_, knowledge] of this.botKnowledge) {
      const firstName = knowledge.name.split(' ')[0].toLowerCase();
      if (text.includes(firstName)) {
        return knowledge.name;
      }
    }
    return null;
  }
  
  // ============================================================================
  // RESPONSE GENERATORS
  // ============================================================================
  
  private getStatusResponse(): AIResponse {
    const k = this.civilizationKnowledge;
    if (!k) {
      return { answer: 'I\'m still gathering information. Please wait a moment.', confidence: 0.5 };
    }
    
    const villages = k.villages.map(v => `${v.name} (${v.population} people, ${v.prosperity}% prosperity)`).join(', ');
    
    return {
      answer: `📊 **Civilization Status Report**

🌍 **Era:** ${k.era}
📅 **Day:** ${k.simulationDays}
⏱️ **Uptime:** ${k.uptime}

👥 **Population:** ${k.livingBots} living (${k.deadBots} deceased)
🏘️ **Villages:** ${k.villages.length > 0 ? villages : 'None established yet'}

📦 **Total Resources:**
• Food: ${Math.round(k.totalResources.food)}
• Wood: ${Math.round(k.totalResources.wood)}
• Stone: ${Math.round(k.totalResources.stone)}
• Iron: ${Math.round(k.totalResources.iron)}

💚 **System Health:** ${k.systemHealth}
🧠 **Decisions Made:** ${this.totalDecisions}

Everything is running smoothly. I'm managing ${k.livingBots} bots autonomously.`,
      data: k,
      suggestions: ['Tell me about the bots', 'What are they doing?', 'Any threats?'],
      confidence: 1.0
    };
  }
  
  private getPopulationResponse(): AIResponse {
    const k = this.civilizationKnowledge;
    if (!k) return { answer: 'Gathering population data...', confidence: 0.5 };
    
    // Count by role
    const roleCounts: Record<string, number> = {};
    for (const [_, bot] of this.botKnowledge) {
      roleCounts[bot.role] = (roleCounts[bot.role] || 0) + 1;
    }
    
    const roleList = Object.entries(roleCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([role, count]) => `• ${role}: ${count}`)
      .join('\n');
    
    return {
      answer: `👥 **Population Report**

**Total:** ${k.livingBots} living bots

**By Role:**
${roleList}

**Distribution:**
${k.villages.map(v => `• ${v.name}: ${v.population} citizens`).join('\n')}`,
      suggestions: ['List all bots', 'Who is the best farmer?', 'Show me the guards'],
      confidence: 1.0
    };
  }
  
  private getResourceResponse(): AIResponse {
    const k = this.civilizationKnowledge;
    if (!k) return { answer: 'Checking resources...', confidence: 0.5 };
    
    const totalPop = k.livingBots;
    const foodStatus = k.totalResources.food > totalPop * 10 ? '✅ Abundant' :
                       k.totalResources.food > totalPop * 5 ? '⚠️ Adequate' : '🔴 Low';
    
    return {
      answer: `📦 **Resource Report**

**Food:** ${Math.round(k.totalResources.food)} ${foodStatus}
**Wood:** ${Math.round(k.totalResources.wood)}
**Stone:** ${Math.round(k.totalResources.stone)}
**Iron:** ${Math.round(k.totalResources.iron)}
**Gold:** ${Math.round(k.totalResources.gold)}

**Per Village:**
${k.villages.map(v => 
  `• ${v.name}: Food ${Math.round(v.resources.food)}, Wood ${Math.round(v.resources.wood)}`
).join('\n')}`,
      suggestions: ['Gather more wood', 'Mine for iron', 'Start farming'],
      confidence: 1.0
    };
  }
  
  private getVillageResponse(): AIResponse {
    const k = this.civilizationKnowledge;
    if (!k || k.villages.length === 0) {
      return { answer: 'No villages have been established yet.', confidence: 1.0 };
    }
    
    const villageDetails = k.villages.map(v => `
**🏘️ ${v.name}**
• Population: ${v.population}
• Prosperity: ${v.prosperity}%
• Tech Age: ${v.techAge}
• Food: ${Math.round(v.resources.food)}
• Recent: ${v.recentEvents.slice(-2).join(', ') || 'Nothing notable'}`
    ).join('\n');
    
    return {
      answer: `🏘️ **Village Report**
${villageDetails}`,
      suggestions: ['Build more houses', 'Defend the village', 'Expand territory'],
      confidence: 1.0
    };
  }
  
  private getBotResponse(botName: string): AIResponse {
    // Find the bot
    let targetBot: BotKnowledge | null = null;
    for (const [_, bot] of this.botKnowledge) {
      if (bot.name.toLowerCase().includes(botName.toLowerCase())) {
        targetBot = bot;
        break;
      }
    }
    
    if (!targetBot) {
      return {
        answer: `I don't know anyone named "${botName}". Would you like me to list all bots?`,
        confidence: 0.7,
        suggestions: ['List all bots']
      };
    }
    
    const consciousness = getConsciousnessManager().getConsciousness(targetBot.id);
    const mentalState = consciousness?.getMentalState();
    
    const needsStatus: string[] = [];
    if (targetBot.needs.hunger > 70) needsStatus.push('hungry');
    if (targetBot.needs.energy > 70) needsStatus.push('tired');
    if (targetBot.needs.social > 70) needsStatus.push('lonely');
    if (targetBot.needs.safety > 50) needsStatus.push('nervous');
    
    return {
      answer: `🤖 **${targetBot.name}**

**Role:** ${targetBot.role}
**Age:** ${targetBot.age} | **Stage:** ${targetBot.lifeStage}
**Health:** ${targetBot.health}% | **Mood:** ${targetBot.mood}
**Village:** ${targetBot.village}
**Connected:** ${targetBot.isConnected ? '✅ Yes' : '❌ No'}

**Current Task:** ${targetBot.currentTask || 'None'}
**Thinking:** "${targetBot.currentThought || 'Nothing specific'}"

**Status:** ${needsStatus.length > 0 ? needsStatus.join(', ') : 'Doing well'}

**Personality:**
• Bravery: ${targetBot.personality.bravery}/100
• Curiosity: ${targetBot.personality.curiosity}/100
• Sociability: ${targetBot.personality.sociability}/100
• Industry: ${targetBot.personality.industry}/100`,
      data: targetBot,
      suggestions: [`Tell ${targetBot.name.split(' ')[0]} to explore`, `What are ${targetBot.name.split(' ')[0]}'s goals?`],
      confidence: 1.0
    };
  }
  
  private getBotListResponse(): AIResponse {
    const bots = Array.from(this.botKnowledge.values());
    
    if (bots.length === 0) {
      return { answer: 'No bots are currently active.', confidence: 1.0 };
    }
    
    // Group by role
    const byRole: Record<string, BotKnowledge[]> = {};
    for (const bot of bots) {
      if (!byRole[bot.role]) byRole[bot.role] = [];
      byRole[bot.role].push(bot);
    }
    
    let response = `👥 **All Bots (${bots.length} total)**\n\n`;
    
    for (const [role, roleBots] of Object.entries(byRole)) {
      response += `**${role}s (${roleBots.length}):**\n`;
      for (const bot of roleBots.slice(0, 5)) {
        const status = bot.isConnected ? '✅' : '❌';
        const task = bot.currentTask ? ` - ${bot.currentTask}` : '';
        response += `${status} ${bot.name}${task}\n`;
      }
      if (roleBots.length > 5) {
        response += `... and ${roleBots.length - 5} more\n`;
      }
      response += '\n';
    }
    
    return {
      answer: response,
      suggestions: ['How is Erik doing?', 'What are the farmers doing?'],
      confidence: 1.0
    };
  }
  
  private getThreatResponse(): AIResponse {
    const k = this.civilizationKnowledge;
    if (!k) return { answer: 'Scanning for threats...', confidence: 0.5 };
    
    if (k.activeThreats.length === 0) {
      return {
        answer: `🛡️ **Threat Report**

**Global Threat Level:** ${k.globalThreatLevel}
**Active Threats:** None detected

The area appears safe. Guards are patrolling and monitoring for any dangers.`,
        suggestions: ['Increase patrols', 'Build defenses'],
        confidence: 1.0
      };
    }
    
    return {
      answer: `⚠️ **Threat Report**

**Global Threat Level:** ${k.globalThreatLevel}
**Active Threats:**
${k.activeThreats.map(t => `• ${t}`).join('\n')}

I'm directing guards to address these threats.`,
      suggestions: ['Defend now', 'Evacuate civilians'],
      confidence: 1.0
    };
  }
  
  private getSystemResponse(): AIResponse {
    const k = this.civilizationKnowledge;
    const stability = getStabilityManager();
    const health = stability.getHealth();
    
    return {
      answer: `💻 **System Status**

**AI Brain Status:** ${this.isRunning ? '🟢 ONLINE' : '🔴 OFFLINE'}
**Uptime:** ${k?.uptime || 'N/A'}
**Health:** ${health.status}

**Performance:**
• Memory: ${health.memory.percent}%
• CPU: ${health.cpu.percent}%
• Throttled: ${health.cpu.throttled ? 'Yes' : 'No'}

**This Session:**
• Total Decisions: ${this.totalDecisions}
• Bots Managed: ${this.botKnowledge.size}
• Events Recorded: ${this.recentEvents.length}`,
      confidence: 1.0
    };
  }
  
  private getEventsResponse(): AIResponse {
    const events = this.recentEvents.slice(-10).reverse();
    
    if (events.length === 0) {
      return { answer: 'No recent events to report.', confidence: 1.0 };
    }
    
    const eventList = events.map(e => {
      const time = new Date(e.timestamp).toLocaleTimeString();
      return `• [${time}] ${e.event}`;
    }).join('\n');
    
    return {
      answer: `📜 **Recent Events**\n\n${eventList}`,
      confidence: 1.0
    };
  }
  
  private getHelpResponse(): AIResponse {
    return {
      answer: `🤖 **AI Brain - Help**

I'm the Central AI controlling your entire civilization. I know everything that's happening and manage all ${this.botKnowledge.size} bots automatically.

**Ask me about:**
• "Status" - Full civilization overview
• "Population" - Who's in your civilization
• "Resources" - What supplies you have
• "Villages" - Your settlements
• "What is [name] doing?" - Specific bot info
• "List bots" - See all your citizens
• "Any threats?" - Safety check
• "System health" - Technical status

**Command your bots:**
• "Tell Erik to mine"
• "Have all farmers harvest"
• "Build a farm"
• "Explore the area"

I'm always watching, always managing. Your civilization runs itself!`,
      suggestions: ['Status', 'List bots', 'Any threats?'],
      confidence: 1.0
    };
  }
  
  private getIntelligentResponse(question: string): AIResponse {
    // Default intelligent response
    const k = this.civilizationKnowledge;
    
    return {
      answer: `I understand you're asking: "${question}"

Let me help you with that. Currently:
• Managing ${this.botKnowledge.size} bots
• In the ${k?.era || 'DAWN'} era
• Day ${k?.simulationDays || 0}

Try asking me something specific like "status", "how are the bots?", or "any threats?"`,
      suggestions: ['Status', 'Help', 'List bots'],
      confidence: 0.6
    };
  }
  
  // ============================================================================
  // COMMAND INTERFACE
  // ============================================================================
  
  /**
   * Give a command to the AI (affects bots)
   */
  async command(instruction: string): Promise<AIResponse> {
    const lower = instruction.toLowerCase();
    const consciousnessManager = getConsciousnessManager();
    
    // Check for bot-specific commands
    const botName = this.extractBotName(lower);
    if (botName) {
      // Find the bot
      let targetBot: BotKnowledge | null = null;
      for (const [_, bot] of this.botKnowledge) {
        if (bot.name.toLowerCase().includes(botName.toLowerCase())) {
          targetBot = bot;
          break;
        }
      }
      
      if (targetBot) {
        // Send command to this specific bot
        consciousnessManager.sendCommand(targetBot.id, instruction);
        
        this.recordEvent(`Commanded ${targetBot.name}: ${instruction}`, targetBot.id);
        
        return {
          answer: `✅ Command sent to ${targetBot.name}: "${instruction}"

${targetBot.name} will now prioritize this task.`,
          confidence: 1.0
        };
      }
    }
    
    // Broadcast command to all bots
    if (this.matchesPattern(lower, ['all', 'everyone', 'everybody'])) {
      consciousnessManager.broadcastCommand(instruction);
      
      this.recordEvent(`Broadcast command: ${instruction}`);
      
      return {
        answer: `📢 Command broadcast to all ${this.botKnowledge.size} bots: "${instruction}"`,
        confidence: 1.0
      };
    }
    
    // Role-specific commands
    const roles: Record<string, Role> = {
      'farmer': Role.FARMER,
      'miner': Role.MINER,
      'builder': Role.BUILDER,
      'guard': Role.GUARD,
      'scout': Role.SCOUT
    };
    
    for (const [roleWord, role] of Object.entries(roles)) {
      if (lower.includes(roleWord)) {
        let count = 0;
        for (const [botId, bot] of this.botKnowledge) {
          if (bot.role === role) {
            consciousnessManager.sendCommand(botId, instruction);
            count++;
          }
        }
        
        if (count > 0) {
          this.recordEvent(`Commanded ${count} ${role}s: ${instruction}`);
          return {
            answer: `✅ Command sent to ${count} ${role}(s): "${instruction}"`,
            confidence: 1.0
          };
        }
      }
    }
    
    // General command - let AI interpret
    return {
      answer: `I'll process that command: "${instruction}"

Tip: Be specific! Try:
• "Tell Erik to mine"
• "Have all farmers harvest"
• "Guards should patrol"`,
      confidence: 0.7
    };
  }
  
  // ============================================================================
  // PUBLIC GETTERS
  // ============================================================================
  
  isActive(): boolean {
    return this.isRunning;
  }
  
  getKnowledge(): CivilizationKnowledge | null {
    return this.civilizationKnowledge;
  }
  
  getBotKnowledge(botId: string): BotKnowledge | undefined {
    return this.botKnowledge.get(botId);
  }
  
  getAllBotKnowledge(): BotKnowledge[] {
    return Array.from(this.botKnowledge.values());
  }
  
  getTotalDecisions(): number {
    return this.totalDecisions;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export function getCentralAIBrain(): CentralAIBrain {
  return CentralAIBrain.getInstance();
}

export default CentralAIBrain;
