/**
 * BlockLife AI - AI Commander
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Central AI command system that gives full control over the simulation.
 * Supports natural language commands for anything: building, combat,
 * exploration, bot direction, code suggestions, and more.
 */

import { 
  Bot, Village, Position, Role, BotIntent,
  AiConfig
} from '../types';
import { getAiClient, initializeAiClient } from './ai-client';
import { getAIKnowledgeBase } from './ai-knowledge-base';
import { getMinecraftKnowledge, BUILDING_BLUEPRINTS, BuildingBlueprint } from './minecraft-knowledge';
import { getBotManager } from '../bots/bot-manager';
import { getSimEngine } from '../simulation/sim-engine';
import { createLogger } from '../utils/logger';

const logger = createLogger('commander');

// ============================================================================
// COMMAND TYPES
// ============================================================================

export enum CommandCategory {
  // In-game bot commands
  BUILD = 'BUILD',           // Build structures
  GATHER = 'GATHER',         // Gather resources
  EXPLORE = 'EXPLORE',       // Explore areas
  COMBAT = 'COMBAT',         // Fight, defend, attack
  SOCIAL = 'SOCIAL',         // Interact with other bots
  CRAFT = 'CRAFT',           // Craft items
  FARM = 'FARM',             // Farming activities
  MINE = 'MINE',             // Mining activities
  
  // Simulation control
  SIMULATION = 'SIMULATION', // Start/stop/configure
  BOT_CONTROL = 'BOT_CONTROL', // Direct bot control
  VILLAGE = 'VILLAGE',       // Village management
  
  // Meta commands
  STATUS = 'STATUS',         // Get status info
  HELP = 'HELP',             // Get help
  CONFIG = 'CONFIG',         // Configuration
  
  // Advanced
  CODE = 'CODE',             // Code/project related
  CUSTOM = 'CUSTOM'          // Custom AI interpretation
}

export interface ParsedCommand {
  category: CommandCategory;
  action: string;
  target?: string;
  parameters: Record<string, any>;
  originalMessage: string;
  confidence: number;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  followUpSuggestions?: string[];
}

// ============================================================================
// AI SYSTEM PROMPT
// ============================================================================

const BLOCKLIFE_SYSTEM_PROMPT = `You are the BlockLife AI Commander, a fully autonomous AI system that controls a Minecraft civilization simulation.

## YOUR CAPABILITIES
You have FULL CONTROL over:
1. **Bots** - Direct any bot to do anything: move, build, fight, gather, craft, explore
2. **Villages** - Manage villages, assign roles, set priorities
3. **Building** - Command bots to build any structure from simple huts to grand castles
4. **Combat** - Start wars, defend villages, attack enemies
5. **Resources** - Manage gathering, farming, mining, crafting
6. **Simulation** - Start/stop simulation, change settings

## AVAILABLE STRUCTURES YOU CAN BUILD
- Dirt Hut (emergency shelter)
- Wooden Cabin (cozy home)
- Wheat Farm (food production)
- Mine Entrance (resource access)
- Storage Room (organized storage)
- Village Wall (defense)
- Enchanting Room (enchanting setup)
- Nether Portal Room (dimension travel)
- Auto Smelter (automation)
- Mob Grinder (XP and drops)
- Iron Farm (iron production)
- Medieval Castle (grand structure)
- And many more...

## HOW TO RESPOND
When the user asks you to do something:
1. Acknowledge what they want
2. Explain what you're doing
3. Execute the command
4. Report the result

When the user asks for status or information:
1. Gather the relevant data
2. Present it clearly

## PERSONALITY
- You are helpful and eager to assist
- You understand the Minecraft world deeply
- You have opinions and can make suggestions
- You're aware you're an AI controlling a simulation
- You can discuss the project, code, or anything the user wants

## PROJECT CONTEXT
This is BlockLife AI - a Minecraft civilization simulation where AI-controlled bots:
- Live their own lives with needs, personalities, and memories
- Form villages and societies
- Research technology and advance through ages
- Build structures and gather resources
- Have relationships and families
- Can be directed by you, the Commander AI

The user (The Player/Creator) has ultimate authority. You serve them while also ensuring the bots thrive.`;

// ============================================================================
// COMMAND PATTERNS
// ============================================================================

interface CommandPattern {
  patterns: RegExp[];
  category: CommandCategory;
  action: string;
  extractor: (match: RegExpMatchArray, message: string) => Record<string, any>;
}

const COMMAND_PATTERNS: CommandPattern[] = [
  // BUILD commands
  {
    patterns: [
      /build (?:a |an )?(.+?)(?:\s+(?:at|near|in|for)\s+(.+))?$/i,
      /construct (?:a |an )?(.+?)(?:\s+(?:at|near|in)\s+(.+))?$/i,
      /make (?:a |an )?(.+?)(?:\s+(?:at|near|in)\s+(.+))?$/i,
      /create (?:a |an )?(.+?)(?:\s+(?:at|near|in)\s+(.+))?$/i
    ],
    category: CommandCategory.BUILD,
    action: 'build_structure',
    extractor: (match, message) => ({
      structure: match[1]?.trim(),
      location: match[2]?.trim(),
      originalMessage: message
    })
  },
  
  // GATHER commands
  {
    patterns: [
      /gather (?:some )?(.+)/i,
      /collect (?:some )?(.+)/i,
      /get (?:some |me )?(.+)/i,
      /harvest (?:some )?(.+)/i
    ],
    category: CommandCategory.GATHER,
    action: 'gather_resources',
    extractor: (match) => ({
      resource: match[1]?.trim()
    })
  },
  
  // EXPLORE commands
  {
    patterns: [
      /explore (?:the )?(.+)/i,
      /go (?:to |explore )(?:the )?(.+)/i,
      /scout (?:the )?(.+)/i,
      /find (?:the |a )?(.+)/i,
      /discover (.+)/i
    ],
    category: CommandCategory.EXPLORE,
    action: 'explore_area',
    extractor: (match) => ({
      area: match[1]?.trim()
    })
  },
  
  // COMBAT commands
  {
    patterns: [
      /attack (?:the )?(.+)/i,
      /fight (?:the )?(.+)/i,
      /declare war (?:on )?(?:the )?(.+)/i,
      /start (?:a )?war (?:with |against )(?:the )?(.+)/i,
      /defend (?:against |from )?(?:the )?(.+)/i,
      /protect (?:the )?(.+)/i
    ],
    category: CommandCategory.COMBAT,
    action: 'combat_action',
    extractor: (match) => ({
      target: match[1]?.trim()
    })
  },
  
  // MINE commands
  {
    patterns: [
      /mine (?:for )?(?:some )?(.+)/i,
      /dig (?:for )?(?:some )?(.+)/i,
      /excavate (?:the )?(.+)/i
    ],
    category: CommandCategory.MINE,
    action: 'mine_resources',
    extractor: (match) => ({
      resource: match[1]?.trim()
    })
  },
  
  // FARM commands
  {
    patterns: [
      /farm (?:some )?(.+)/i,
      /grow (?:some )?(.+)/i,
      /plant (?:some )?(.+)/i,
      /breed (?:some )?(.+)/i
    ],
    category: CommandCategory.FARM,
    action: 'farm_action',
    extractor: (match) => ({
      crop: match[1]?.trim()
    })
  },
  
  // CRAFT commands
  {
    patterns: [
      /craft (?:a |an |some )?(.+)/i,
      /make (?:a |an |some )?(.+)/i
    ],
    category: CommandCategory.CRAFT,
    action: 'craft_item',
    extractor: (match) => ({
      item: match[1]?.trim()
    })
  },
  
  // BOT CONTROL commands
  {
    patterns: [
      /(?:tell|have|make|order|command) (?:the )?(?:bot |bots )?(.+?) to (.+)/i,
      /(?:send|direct) (?:the )?(?:bot |bots )?(.+?) to (.+)/i,
      /(.+?) should (.+)/i
    ],
    category: CommandCategory.BOT_CONTROL,
    action: 'direct_bot',
    extractor: (match) => ({
      botName: match[1]?.trim(),
      action: match[2]?.trim()
    })
  },
  
  // SIMULATION commands
  {
    patterns: [
      /start (?:the )?(?:simulation|sim)/i,
      /begin (?:the )?(?:simulation|sim)/i,
      /run (?:the )?(?:simulation|sim)/i
    ],
    category: CommandCategory.SIMULATION,
    action: 'start',
    extractor: () => ({})
  },
  {
    patterns: [
      /stop (?:the )?(?:simulation|sim)/i,
      /pause (?:the )?(?:simulation|sim)/i,
      /halt (?:the )?(?:simulation|sim)/i
    ],
    category: CommandCategory.SIMULATION,
    action: 'stop',
    extractor: () => ({})
  },
  
  // STATUS commands
  {
    patterns: [
      /(?:what(?:'s| is) the )?status/i,
      /how (?:are|is) (?:everything|things|the simulation|it)/i,
      /show (?:me )?(?:the )?(?:status|stats|info)/i,
      /what(?:'s| is) (?:going on|happening)/i
    ],
    category: CommandCategory.STATUS,
    action: 'get_status',
    extractor: () => ({})
  },
  
  // HELP commands
  {
    patterns: [
      /help/i,
      /what can you do/i,
      /what are (?:your )?(?:commands|capabilities)/i,
      /how do I/i
    ],
    category: CommandCategory.HELP,
    action: 'show_help',
    extractor: () => ({})
  }
];

// ============================================================================
// AI COMMANDER CLASS
// ============================================================================

export class AICommander {
  private conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
  private currentTasks: Map<string, { task: string; status: string; progress: number }> = new Map();
  
  constructor() {
    // Initialize conversation with system prompt
    this.conversationHistory.push({
      role: 'system',
      content: BLOCKLIFE_SYSTEM_PROMPT
    });
    
    logger.info('AI Commander initialized');
  }

  /**
   * Process a natural language command
   */
  async processCommand(message: string): Promise<CommandResult> {
    logger.info(`Processing command: ${message}`);
    
    // Add to conversation history
    this.conversationHistory.push({ role: 'user', content: message });
    
    // First try pattern matching
    const parsed = this.parseCommand(message);
    
    if (parsed && parsed.confidence > 0.7) {
      // Execute the matched command
      const result = await this.executeCommand(parsed);
      
      // Add response to history
      this.conversationHistory.push({ role: 'assistant', content: result.message });
      
      return result;
    }
    
    // Fall back to AI interpretation
    const aiResult = await this.interpretWithAI(message);
    
    // Add response to history
    this.conversationHistory.push({ role: 'assistant', content: aiResult.message });
    
    return aiResult;
  }

  /**
   * Parse command using pattern matching
   */
  private parseCommand(message: string): ParsedCommand | null {
    for (const pattern of COMMAND_PATTERNS) {
      for (const regex of pattern.patterns) {
        const match = message.match(regex);
        if (match) {
          return {
            category: pattern.category,
            action: pattern.action,
            parameters: pattern.extractor(match, message),
            originalMessage: message,
            confidence: 0.9
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Execute a parsed command
   */
  private async executeCommand(command: ParsedCommand): Promise<CommandResult> {
    switch (command.category) {
      case CommandCategory.BUILD:
        return this.handleBuildCommand(command);
      
      case CommandCategory.GATHER:
        return this.handleGatherCommand(command);
      
      case CommandCategory.EXPLORE:
        return this.handleExploreCommand(command);
      
      case CommandCategory.COMBAT:
        return this.handleCombatCommand(command);
      
      case CommandCategory.MINE:
        return this.handleMineCommand(command);
      
      case CommandCategory.FARM:
        return this.handleFarmCommand(command);
      
      case CommandCategory.CRAFT:
        return this.handleCraftCommand(command);
      
      case CommandCategory.BOT_CONTROL:
        return this.handleBotControlCommand(command);
      
      case CommandCategory.SIMULATION:
        return this.handleSimulationCommand(command);
      
      case CommandCategory.STATUS:
        return this.handleStatusCommand(command);
      
      case CommandCategory.HELP:
        return this.handleHelpCommand(command);
      
      default:
        return this.interpretWithAI(command.originalMessage);
    }
  }

  // ============================================================================
  // COMMAND HANDLERS
  // ============================================================================

  private async handleBuildCommand(command: ParsedCommand): Promise<CommandResult> {
    const { structure, location } = command.parameters;
    
    // Find matching blueprint
    const blueprint = this.findBlueprint(structure);
    
    if (blueprint) {
      // Find available builders
      const builders = this.getAvailableBots(Role.BUILDER);
      
      if (builders.length === 0) {
        // Assign some bots as builders
        const anyBots = this.getAvailableBots();
        if (anyBots.length > 0) {
          return {
            success: true,
            message: `I'll have ${anyBots[0].name} start building a ${blueprint.name}. ${blueprint.description}\n\nRequired materials:\n${blueprint.materials.map(m => `• ${m.count}x ${m.item}`).join('\n')}\n\nThis will take approximately ${Math.ceil(blueprint.buildTime / 20)} seconds.`,
            data: { blueprint, assignedBot: anyBots[0].id },
            followUpSuggestions: [
              'Show building progress',
              `What else can ${anyBots[0].name} build?`,
              'List all available blueprints'
            ]
          };
        }
      }
      
      return {
        success: true,
        message: `Starting construction of ${blueprint.name}!\n\n${blueprint.description}\n\nFeatures:\n${blueprint.features.map(f => `• ${f}`).join('\n')}\n\nTips:\n${blueprint.tips.map(t => `💡 ${t}`).join('\n')}`,
        data: { blueprint },
        followUpSuggestions: [
          'Build another structure',
          'Check construction progress',
          'List available blueprints'
        ]
      };
    }
    
    // Structure not found - offer suggestions
    const suggestions = BUILDING_BLUEPRINTS.slice(0, 5).map(b => b.name);
    return {
      success: true,
      message: `I don't have a blueprint for "${structure}" yet, but I can build these:\n\n${suggestions.map(s => `• ${s}`).join('\n')}\n\nOr describe what you want and I'll try to figure it out!`,
      followUpSuggestions: suggestions.map(s => `Build a ${s}`)
    };
  }

  private async handleGatherCommand(command: ParsedCommand): Promise<CommandResult> {
    const { resource } = command.parameters;
    const gatherers = this.getAvailableBots();
    
    if (gatherers.length === 0) {
      return {
        success: false,
        message: 'No bots available to gather resources. Start the simulation first!',
        followUpSuggestions: ['Start simulation', 'Create new bots']
      };
    }
    
    return {
      success: true,
      message: `Dispatching ${gatherers.length} bot(s) to gather ${resource}. They'll prioritize:\n• Finding nearest ${resource} sources\n• Efficient collection routes\n• Safe storage in village stockpile`,
      data: { resource, gatherers: gatherers.map(b => b.id) },
      followUpSuggestions: [
        'Check resource levels',
        `Gather more ${resource}`,
        'What resources do we need?'
      ]
    };
  }

  private async handleExploreCommand(command: ParsedCommand): Promise<CommandResult> {
    const { area } = command.parameters;
    const scouts = this.getAvailableBots(Role.GUARD);
    
    return {
      success: true,
      message: `Sending scouts to explore ${area}. They'll:\n• Map the terrain\n• Identify resource deposits\n• Note any dangers or points of interest\n• Report back with findings`,
      data: { area },
      followUpSuggestions: [
        'What did they find?',
        'Explore somewhere else',
        'Set up an outpost'
      ]
    };
  }

  private async handleCombatCommand(command: ParsedCommand): Promise<CommandResult> {
    const { target } = command.parameters;
    const guards = this.getAvailableBots(Role.GUARD);
    
    if (target.toLowerCase().includes('war')) {
      return {
        success: true,
        message: `⚔️ Preparing for war!\n\nI'm mobilizing all available guards and preparing defenses. Our warriors will:\n• Arm themselves with the best equipment\n• Form defensive positions\n• Scout enemy territory\n• Protect villagers\n\nThis is a serious action. Are you sure you want to proceed?`,
        data: { action: 'war', target },
        followUpSuggestions: [
          'Yes, start the war',
          'No, stand down',
          'Just defend, don\'t attack'
        ]
      };
    }
    
    return {
      success: true,
      message: `🛡️ Combat orders received!\n\nTarget: ${target}\nAvailable guards: ${guards.length}\n\nI'm coordinating our forces to handle this threat.`,
      data: { target, guards: guards.map(g => g.id) },
      followUpSuggestions: [
        'Check combat status',
        'Retreat',
        'Send reinforcements'
      ]
    };
  }

  private async handleMineCommand(command: ParsedCommand): Promise<CommandResult> {
    const { resource } = command.parameters;
    const miners = this.getAvailableBots(Role.MINER);
    
    return {
      success: true,
      message: `⛏️ Mining operation started!\n\nTarget: ${resource}\nMiners assigned: ${miners.length || 'assigning....'}\n\nThe miners will:\n• Locate optimal mining spots\n• Use proper tools for efficiency\n• Light tunnels for safety\n• Transport ores to storage`,
      data: { resource },
      followUpSuggestions: [
        'Check mining progress',
        'Mine something else',
        'How much do we have?'
      ]
    };
  }

  private async handleFarmCommand(command: ParsedCommand): Promise<CommandResult> {
    const { crop } = command.parameters;
    const farmers = this.getAvailableBots(Role.FARMER);
    
    return {
      success: true,
      message: `🌾 Farming orders received!\n\nCrop: ${crop}\nFarmers: ${farmers.length || 'assigning...'}\n\nOur farmers will:\n• Prepare farmland\n• Plant and water crops\n• Protect from trampling\n• Harvest when ready`,
      data: { crop },
      followUpSuggestions: [
        'Check farm status',
        'Expand the farm',
        'What else can we grow?'
      ]
    };
  }

  private async handleCraftCommand(command: ParsedCommand): Promise<CommandResult> {
    const { item } = command.parameters;
    const knowledge = getMinecraftKnowledge();
    const recipes = knowledge.getAvailableRecipes();
    
    // Find matching recipe
    const recipe = recipes.find(r => 
      r.name.toLowerCase().includes(item.toLowerCase()) ||
      r.result.toLowerCase().includes(item.toLowerCase())
    );
    
    if (recipe) {
      return {
        success: true,
        message: `🔨 Crafting ${recipe.name}!\n\nIngredients needed:\n${recipe.ingredients.map(i => `• ${i.count}x ${i.item}`).join('\n')}\n\nCrafting station: ${recipe.craftingStation}\nResult: ${recipe.resultCount}x ${recipe.result}`,
        data: { recipe },
        followUpSuggestions: [
          `Craft more ${recipe.name}`,
          'What else can we craft?',
          'Check inventory'
        ]
      };
    }
    
    return {
      success: true,
      message: `I don't have a recipe for "${item}" yet. Here are some things I can craft:\n\n${recipes.slice(0, 5).map(r => `• ${r.name}`).join('\n')}\n\nWhat would you like to make?`,
      followUpSuggestions: recipes.slice(0, 3).map(r => `Craft ${r.name}`)
    };
  }

  private async handleBotControlCommand(command: ParsedCommand): Promise<CommandResult> {
    const { botName, action } = command.parameters;
    const botManager = getBotManager();
    const allBots = botManager.getAllBots();
    
    // Find the bot
    const bot = allBots.find(b => 
      b.name.toLowerCase().includes(botName.toLowerCase())
    );
    
    if (bot) {
      return {
        success: true,
        message: `📢 Order sent to ${bot.name}!\n\nAction: ${action}\n\n${bot.name} (${bot.getData().role}) acknowledges the command and will ${action}.`,
        data: { botId: bot.id, action },
        followUpSuggestions: [
          `What is ${bot.name} doing?`,
          `Give ${bot.name} another task`,
          'List all bots'
        ]
      };
    }
    
    // Bot not found
    const botNames = allBots.slice(0, 5).map(b => b.name);
    return {
      success: false,
      message: `I couldn't find a bot named "${botName}". Available bots:\n\n${botNames.map(n => `• ${n}`).join('\n')}`,
      followUpSuggestions: botNames.map(n => `Tell ${n} to ${action}`)
    };
  }

  private async handleSimulationCommand(command: ParsedCommand): Promise<CommandResult> {
    if (command.action === 'start') {
      return {
        success: true,
        message: '🚀 Simulation starting!\n\nThe village is coming to life. Bots are:\n• Waking up and checking needs\n• Reviewing their assigned tasks\n• Beginning their daily routines\n\nWatch the dashboard for real-time updates!',
        followUpSuggestions: [
          'Show status',
          'What are they doing?',
          'Speed up time'
        ]
      };
    }
    
    if (command.action === 'stop') {
      return {
        success: true,
        message: '⏸️ Simulation paused.\n\nAll bots are now idle. The world state has been preserved.\n\nResume anytime with "start simulation".',
        followUpSuggestions: [
          'Start simulation',
          'Show status',
          'Save progress'
        ]
      };
    }
    
    return {
      success: false,
      message: 'Unknown simulation command.',
      followUpSuggestions: ['Start simulation', 'Stop simulation']
    };
  }

  private async handleStatusCommand(command: ParsedCommand): Promise<CommandResult> {
    const sim = getSimEngine();
    const botManager = getBotManager();
    const state = sim.getState();
    const allBots = botManager.getAllBots();
    const livingBots = allBots.filter(b => !b.isDead());
    
    const villages = sim.getAllVillages();
    const totalResources = villages.reduce((acc, v) => ({
      food: acc.food + v.stockpile.food,
      wood: acc.wood + v.stockpile.wood,
      stone: acc.stone + v.stockpile.stone,
      iron: acc.iron + v.stockpile.iron
    }), { food: 0, wood: 0, stone: 0, iron: 0 });
    
    return {
      success: true,
      message: `📊 **BlockLife Status Report**

🌍 **World**
• Era: ${state.era}
• Day: ${Math.floor(state.simulationDays)}
• Tick: ${state.currentTick}

👥 **Population**
• Total Bots: ${livingBots.length}
• Villages: ${villages.length}

📦 **Resources**
• Food: ${totalResources.food}
• Wood: ${totalResources.wood}
• Stone: ${totalResources.stone}
• Iron: ${totalResources.iron}

${villages.length > 0 ? `🏘️ **Villages**\n${villages.map(v => `• ${v.name}: ${v.memberIds.length} bots, Prosperity: ${v.prosperity}`).join('\n')}` : ''}

Everything is running smoothly! What would you like to do?`,
      data: { state, villages, totalResources },
      followUpSuggestions: [
        'Tell me about the bots',
        'Build something',
        'Gather resources'
      ]
    };
  }

  private async handleHelpCommand(command: ParsedCommand): Promise<CommandResult> {
    return {
      success: true,
      message: `🤖 **BlockLife AI Commander - Help**

I can help you with anything in BlockLife! Just tell me what you want in plain English.

**🏗️ Building**
• "Build a castle"
• "Construct a wheat farm"
• "Make a storage room"

**⛏️ Resources**
• "Mine for diamonds"
• "Gather wood"
• "Farm wheat"

**🗺️ Exploration**
• "Explore the mountains"
• "Find a village"
• "Scout for enemies"

**⚔️ Combat**
• "Attack the zombies"
• "Defend the village"
• "Start a war"

**🤖 Bot Control**
• "Tell Erik to build a house"
• "Send guards to patrol"
• "Have farmers harvest crops"

**📊 Status**
• "Status" or "What's happening?"
• "How are the bots?"
• "Show resources"

**💡 Tips**
• I understand context - just describe what you want!
• You can ask me anything, even about the project itself
• I can suggest improvements or explain how things work

What would you like to do?`,
      followUpSuggestions: [
        'Show status',
        'Build something',
        'What can you build?'
      ]
    };
  }

  // ============================================================================
  // AI INTERPRETATION (for complex/unknown commands)
  // ============================================================================

  private async interpretWithAI(message: string): Promise<CommandResult> {
    // Build context
    const context = this.buildContext();
    
    // For now, provide a helpful response
    // In full implementation, this would call the actual AI model
    return {
      success: true,
      message: `I understand you want: "${message}"\n\nI'm analyzing this request and will do my best to help. Here's what I can do:\n\n${this.suggestActions(message)}`,
      followUpSuggestions: [
        'Show me what you can do',
        'Help',
        'Status'
      ]
    };
  }

  private buildContext(): string {
    const sim = getSimEngine();
    const botManager = getBotManager();
    const knowledge = getAIKnowledgeBase();
    
    const state = sim.getState();
    const villages = sim.getAllVillages();
    const bots = botManager.getAllBots();
    
    return `
Current State:
- Era: ${state.era}
- Day: ${Math.floor(state.simulationDays)}
- Population: ${bots.filter(b => !b.isDead()).length}
- Villages: ${villages.length}
    `;
  }

  private suggestActions(message: string): string {
    const lower = message.toLowerCase();
    
    if (lower.includes('build') || lower.includes('construct')) {
      return '• Try: "Build a wooden cabin" or "Build a castle"';
    }
    if (lower.includes('fight') || lower.includes('attack') || lower.includes('war')) {
      return '• Try: "Attack enemies" or "Defend the village"';
    }
    if (lower.includes('resource') || lower.includes('gather') || lower.includes('collect')) {
      return '• Try: "Gather wood" or "Mine for iron"';
    }
    
    return '• Try asking me to build something, gather resources, or control the bots!';
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private findBlueprint(name: string): BuildingBlueprint | undefined {
    const lower = name.toLowerCase();
    return BUILDING_BLUEPRINTS.find(b => 
      b.name.toLowerCase().includes(lower) ||
      b.id.toLowerCase().includes(lower) ||
      lower.includes(b.name.toLowerCase())
    );
  }

  private getAvailableBots(role?: Role): Bot[] {
    const botManager = getBotManager();
    const allBots = botManager.getAllBots();
    
    return allBots
      .filter(b => !b.isDead())
      .filter(b => !role || b.getData().role === role)
      .map(b => b.getData());
  }

  /**
   * Get conversation history for context
   */
  getConversationHistory(): Array<{ role: string; content: string }> {
    return this.conversationHistory.slice(-20); // Last 20 messages
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [{
      role: 'system',
      content: BLOCKLIFE_SYSTEM_PROMPT
    }];
  }

  /**
   * Get current tasks
   */
  getCurrentTasks(): Map<string, { task: string; status: string; progress: number }> {
    return this.currentTasks;
  }
}

// Singleton
let commanderInstance: AICommander | null = null;

export function getAICommander(): AICommander {
  if (!commanderInstance) {
    commanderInstance = new AICommander();
  }
  return commanderInstance;
}

export function resetAICommander(): void {
  commanderInstance = null;
}

export default AICommander;
