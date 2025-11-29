/**
 * BlockLife AI - Knowledge Acquisition System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * RESEARCH & KNOWLEDGE INTEGRATION
 * 
 * This system allows the AI to:
 * - Research Minecraft topics via web search
 * - Parse and understand the gathered information
 * - Add new knowledge to the project's knowledge base
 * - Download and implement new blueprints, recipes, strategies
 * - Continuously expand what the AI knows
 * 
 * You can ask the AI to research anything and it will learn it!
 */

import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../utils/logger';
import { getSystemStatus, EventCategory, LogLevel } from '../utils/system-status';
import { getWebResearch, ResearchResult, SearchResult } from './web-research';
import { getAIKnowledgeBase, KnowledgeCategory, KnowledgeEntry } from './ai-knowledge-base';
import { BUILDING_BLUEPRINTS, BuildingBlueprint, CraftingRecipe } from './minecraft-knowledge';

const logger = createLogger('knowledge-acquisition');

// ============================================================================
// TYPES
// ============================================================================

export interface ResearchRequest {
  topic: string;
  category: 'building' | 'crafting' | 'combat' | 'farming' | 'redstone' | 'exploration' | 'mob' | 'item' | 'general';
  depth: 'quick' | 'normal' | 'deep'; // How thorough the research should be
  addToKnowledge: boolean; // Whether to add findings to knowledge base
}

export interface ResearchFinding {
  id: string;
  topic: string;
  category: string;
  title: string;
  content: string;
  source: string;
  confidence: number;
  timestamp: number;
  addedToKnowledge: boolean;
  knowledgeEntryId?: string;
}

export interface AcquiredBlueprint {
  id: string;
  name: string;
  description: string;
  materials: { item: string; count: number }[];
  steps: string[];
  source: string;
  addedAt: number;
}

export interface AcquiredRecipe {
  id: string;
  name: string;
  result: string;
  resultCount: number;
  ingredients: { item: string; count: number }[];
  craftingStation: string;
  source: string;
  addedAt: number;
}

export interface AcquiredStrategy {
  id: string;
  name: string;
  category: string;
  description: string;
  steps: string[];
  tips: string[];
  source: string;
  addedAt: number;
}

export interface KnowledgeStats {
  totalFindings: number;
  addedToKnowledge: number;
  blueprintsAcquired: number;
  recipesAcquired: number;
  strategiesAcquired: number;
  lastResearchTime: number;
}

// ============================================================================
// KNOWLEDGE ACQUISITION MANAGER
// ============================================================================

export class KnowledgeAcquisitionManager {
  private static instance: KnowledgeAcquisitionManager | null = null;
  
  // Research history
  private findings: ResearchFinding[] = [];
  private acquiredBlueprints: Map<string, AcquiredBlueprint> = new Map();
  private acquiredRecipes: Map<string, AcquiredRecipe> = new Map();
  private acquiredStrategies: Map<string, AcquiredStrategy> = new Map();
  
  // Persistent storage
  private dataDir: string = './data/knowledge';
  
  // Stats
  private totalResearches: number = 0;
  private lastResearchTime: number = 0;
  
  private constructor() {
    this.ensureDataDirectory();
    this.loadExistingKnowledge();
    logger.info('Knowledge Acquisition Manager initialized');
  }
  
  static getInstance(): KnowledgeAcquisitionManager {
    if (!KnowledgeAcquisitionManager.instance) {
      KnowledgeAcquisitionManager.instance = new KnowledgeAcquisitionManager();
    }
    return KnowledgeAcquisitionManager.instance;
  }
  
  // ============================================================================
  // RESEARCH
  // ============================================================================
  
  /**
   * Research a topic and optionally add to knowledge base
   */
  async research(request: ResearchRequest): Promise<ResearchFinding[]> {
    const webResearch = getWebResearch();
    const findings: ResearchFinding[] = [];
    
    const status = getSystemStatus();
    status.logEvent({
      category: EventCategory.SYSTEM,
      level: LogLevel.INFO,
      source: 'knowledge-acquisition',
      message: `Researching: ${request.topic} (${request.category})`
    });
    
    logger.info(`Starting research on: ${request.topic}`);
    console.log(`\n🔍 Researching: "${request.topic}"...`);
    
    // Check if web research is enabled
    if (!webResearch.isEnabled()) {
      console.log('   ⚠️ Web research is disabled. Using built-in knowledge only.');
      
      // Use built-in knowledge
      const builtInFindings = this.searchBuiltInKnowledge(request.topic, request.category);
      findings.push(...builtInFindings);
      
      if (findings.length > 0) {
        console.log(`   Found ${findings.length} results from built-in knowledge.`);
      } else {
        console.log('   No results found. Enable web research for more comprehensive results.');
      }
      
      return findings;
    }
    
    // Perform web research
    const maxResults = request.depth === 'quick' ? 3 : request.depth === 'normal' ? 5 : 10;
    
    const result = await webResearch.research({
      query: `Minecraft ${request.topic}`,
      category: request.category as any,
      maxResults
    });
    
    if (!result.success || result.results.length === 0) {
      console.log('   No results found from web search.');
      
      // Fall back to built-in knowledge
      const builtInFindings = this.searchBuiltInKnowledge(request.topic, request.category);
      findings.push(...builtInFindings);
      
      return findings;
    }
    
    console.log(`   Found ${result.results.length} web results.`);
    
    // Process each result
    for (const searchResult of result.results) {
      const finding = this.processSearchResult(searchResult, request);
      findings.push(finding);
      
      // Add to knowledge base if requested
      if (request.addToKnowledge) {
        this.addFindingToKnowledge(finding);
      }
    }
    
    // Store findings
    this.findings.push(...findings);
    this.totalResearches++;
    this.lastResearchTime = Date.now();
    
    // Parse for specific content types
    await this.parseForBlueprints(findings, request.topic);
    await this.parseForRecipes(findings, request.topic);
    await this.parseForStrategies(findings, request);
    
    // Save to disk
    this.saveKnowledge();
    
    console.log(`\n✅ Research complete!`);
    console.log(`   Findings: ${findings.length}`);
    console.log(`   Added to knowledge: ${findings.filter(f => f.addedToKnowledge).length}`);
    console.log('');
    
    return findings;
  }
  
  /**
   * Search built-in knowledge for a topic
   */
  private searchBuiltInKnowledge(topic: string, category: string): ResearchFinding[] {
    const findings: ResearchFinding[] = [];
    const lower = topic.toLowerCase();
    
    // Search building blueprints
    for (const blueprint of BUILDING_BLUEPRINTS) {
      if (blueprint.name.toLowerCase().includes(lower) ||
          blueprint.description.toLowerCase().includes(lower) ||
          blueprint.id.toLowerCase().includes(lower)) {
        findings.push({
          id: `builtin_blueprint_${blueprint.id}`,
          topic,
          category: 'building',
          title: blueprint.name,
          content: `${blueprint.description}\n\nMaterials needed:\n${blueprint.materials.map(m => `- ${m.count}x ${m.item}`).join('\n')}\n\nFeatures:\n${blueprint.features.map(f => `- ${f}`).join('\n')}\n\nTips:\n${blueprint.tips.map(t => `- ${t}`).join('\n')}`,
          source: 'Built-in BlockLife Knowledge',
          confidence: 95,
          timestamp: Date.now(),
          addedToKnowledge: false
        });
      }
    }
    
    // Search AI knowledge base
    const knowledgeBase = getAIKnowledgeBase();
    const mcKnowledge = knowledgeBase.getMinecraftKnowledge(lower);
    
    if (mcKnowledge) {
      findings.push({
        id: `builtin_mc_${mcKnowledge.id}`,
        topic,
        category: mcKnowledge.type.toLowerCase(),
        title: mcKnowledge.name,
        content: `${mcKnowledge.description}\n\nTips:\n${mcKnowledge.tips.map(t => `- ${t}`).join('\n')}`,
        source: 'Built-in Minecraft Knowledge',
        confidence: 100,
        timestamp: Date.now(),
        addedToKnowledge: false
      });
    }
    
    return findings;
  }
  
  /**
   * Process a search result into a finding
   */
  private processSearchResult(result: SearchResult, request: ResearchRequest): ResearchFinding {
    return {
      id: `finding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      topic: request.topic,
      category: request.category,
      title: result.title,
      content: result.snippet,
      source: result.url,
      confidence: result.relevanceScore * 100,
      timestamp: Date.now(),
      addedToKnowledge: false
    };
  }
  
  /**
   * Add a finding to the knowledge base
   */
  private addFindingToKnowledge(finding: ResearchFinding): void {
    const knowledgeBase = getAIKnowledgeBase();
    
    // Map category to knowledge category
    const categoryMap: Record<string, KnowledgeCategory> = {
      'building': KnowledgeCategory.MINECRAFT,
      'crafting': KnowledgeCategory.MINECRAFT,
      'combat': KnowledgeCategory.THREATS,
      'farming': KnowledgeCategory.RESOURCES,
      'redstone': KnowledgeCategory.TECHNOLOGY,
      'exploration': KnowledgeCategory.GEOGRAPHY,
      'mob': KnowledgeCategory.THREATS,
      'item': KnowledgeCategory.RESOURCES,
      'general': KnowledgeCategory.MINECRAFT
    };
    
    const knowledgeCategory = categoryMap[finding.category] || KnowledgeCategory.MINECRAFT;
    
    const entry = knowledgeBase.addKnowledge(
      knowledgeCategory,
      finding.topic,
      `${finding.title}\n\n${finding.content}`,
      finding.source,
      finding.confidence
    );
    
    finding.addedToKnowledge = true;
    finding.knowledgeEntryId = entry.id;
    
    logger.debug(`Added finding to knowledge base: ${finding.title}`);
  }
  
  // ============================================================================
  // CONTENT PARSING
  // ============================================================================
  
  /**
   * Parse findings for building blueprints
   */
  private async parseForBlueprints(findings: ResearchFinding[], topic: string): Promise<void> {
    const buildingKeywords = ['build', 'house', 'castle', 'farm', 'tower', 'structure', 'design', 'blueprint'];
    
    if (!buildingKeywords.some(k => topic.toLowerCase().includes(k))) {
      return;
    }
    
    for (const finding of findings) {
      // Look for material lists
      const materialMatches = finding.content.match(/(\d+)\s*x?\s*([\w\s]+?)(?:,|\n|$)/gi);
      
      if (materialMatches && materialMatches.length >= 2) {
        const materials: { item: string; count: number }[] = [];
        
        for (const match of materialMatches) {
          const parsed = match.match(/(\d+)\s*x?\s*([\w\s]+)/i);
          if (parsed) {
            materials.push({
              count: parseInt(parsed[1]),
              item: parsed[2].trim().toLowerCase()
            });
          }
        }
        
        if (materials.length > 0) {
          const blueprint: AcquiredBlueprint = {
            id: `acquired_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: finding.title.replace(/[^\w\s]/g, '').trim(),
            description: finding.content.substring(0, 200),
            materials,
            steps: this.extractSteps(finding.content),
            source: finding.source,
            addedAt: Date.now()
          };
          
          this.acquiredBlueprints.set(blueprint.id, blueprint);
          logger.info(`Acquired new blueprint: ${blueprint.name}`);
        }
      }
    }
  }
  
  /**
   * Parse findings for crafting recipes
   */
  private async parseForRecipes(findings: ResearchFinding[], topic: string): Promise<void> {
    const craftingKeywords = ['craft', 'recipe', 'make', 'create', 'ingredients'];
    
    if (!craftingKeywords.some(k => topic.toLowerCase().includes(k))) {
      return;
    }
    
    for (const finding of findings) {
      // Look for recipe patterns
      const ingredientMatches = finding.content.match(/(\d+)\s*([\w\s]+?)(?:\s*\+|\s*and|\s*,|\n)/gi);
      
      if (ingredientMatches && ingredientMatches.length >= 1) {
        const ingredients: { item: string; count: number }[] = [];
        
        for (const match of ingredientMatches) {
          const parsed = match.match(/(\d+)\s*([\w\s]+)/i);
          if (parsed) {
            ingredients.push({
              count: parseInt(parsed[1]),
              item: parsed[2].trim().toLowerCase()
            });
          }
        }
        
        if (ingredients.length > 0) {
          const recipe: AcquiredRecipe = {
            id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: topic,
            result: topic.toLowerCase(),
            resultCount: 1,
            ingredients,
            craftingStation: 'crafting_table',
            source: finding.source,
            addedAt: Date.now()
          };
          
          this.acquiredRecipes.set(recipe.id, recipe);
          logger.info(`Acquired new recipe: ${recipe.name}`);
        }
      }
    }
  }
  
  /**
   * Parse findings for strategies
   */
  private async parseForStrategies(findings: ResearchFinding[], request: ResearchRequest): Promise<void> {
    const strategyKeywords = ['strategy', 'guide', 'how to', 'tips', 'tutorial', 'best way'];
    
    if (!strategyKeywords.some(k => request.topic.toLowerCase().includes(k))) {
      return;
    }
    
    for (const finding of findings) {
      const steps = this.extractSteps(finding.content);
      const tips = this.extractTips(finding.content);
      
      if (steps.length > 0 || tips.length > 0) {
        const strategy: AcquiredStrategy = {
          id: `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: finding.title,
          category: request.category,
          description: finding.content.substring(0, 300),
          steps,
          tips,
          source: finding.source,
          addedAt: Date.now()
        };
        
        this.acquiredStrategies.set(strategy.id, strategy);
        logger.info(`Acquired new strategy: ${strategy.name}`);
      }
    }
  }
  
  /**
   * Extract numbered steps from content
   */
  private extractSteps(content: string): string[] {
    const steps: string[] = [];
    
    // Look for numbered lists
    const numberedMatches = content.match(/(?:^|\n)\s*(\d+)[\.\)]\s*([^\n]+)/g);
    if (numberedMatches) {
      for (const match of numberedMatches) {
        const cleaned = match.replace(/^\s*\d+[\.\)]\s*/, '').trim();
        if (cleaned.length > 10 && cleaned.length < 200) {
          steps.push(cleaned);
        }
      }
    }
    
    // Look for "step" keywords
    const stepMatches = content.match(/step\s*\d*:\s*([^\n]+)/gi);
    if (stepMatches) {
      for (const match of stepMatches) {
        const cleaned = match.replace(/step\s*\d*:\s*/i, '').trim();
        if (cleaned.length > 10 && !steps.includes(cleaned)) {
          steps.push(cleaned);
        }
      }
    }
    
    return steps.slice(0, 10); // Max 10 steps
  }
  
  /**
   * Extract tips from content
   */
  private extractTips(content: string): string[] {
    const tips: string[] = [];
    
    // Look for tip indicators
    const tipPatterns = [
      /(?:tip|hint|note|pro tip):\s*([^\n]+)/gi,
      /(?:^|\n)\s*[•\-\*]\s*([^\n]+)/g
    ];
    
    for (const pattern of tipPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleaned = match.replace(/^[\s•\-\*]+|(?:tip|hint|note|pro tip):\s*/gi, '').trim();
          if (cleaned.length > 10 && cleaned.length < 200 && !tips.includes(cleaned)) {
            tips.push(cleaned);
          }
        }
      }
    }
    
    return tips.slice(0, 10); // Max 10 tips
  }
  
  // ============================================================================
  // KNOWLEDGE RETRIEVAL
  // ============================================================================
  
  /**
   * Get all acquired blueprints
   */
  getBlueprints(): AcquiredBlueprint[] {
    return Array.from(this.acquiredBlueprints.values());
  }
  
  /**
   * Get a specific blueprint
   */
  getBlueprint(id: string): AcquiredBlueprint | undefined {
    return this.acquiredBlueprints.get(id);
  }
  
  /**
   * Search blueprints by name
   */
  searchBlueprints(query: string): AcquiredBlueprint[] {
    const lower = query.toLowerCase();
    return Array.from(this.acquiredBlueprints.values())
      .filter(b => b.name.toLowerCase().includes(lower) ||
                   b.description.toLowerCase().includes(lower));
  }
  
  /**
   * Get all acquired recipes
   */
  getRecipes(): AcquiredRecipe[] {
    return Array.from(this.acquiredRecipes.values());
  }
  
  /**
   * Get all acquired strategies
   */
  getStrategies(): AcquiredStrategy[] {
    return Array.from(this.acquiredStrategies.values());
  }
  
  /**
   * Search strategies
   */
  searchStrategies(query: string): AcquiredStrategy[] {
    const lower = query.toLowerCase();
    return Array.from(this.acquiredStrategies.values())
      .filter(s => s.name.toLowerCase().includes(lower) ||
                   s.category.toLowerCase().includes(lower) ||
                   s.description.toLowerCase().includes(lower));
  }
  
  /**
   * Get all findings for a topic
   */
  getFindingsForTopic(topic: string): ResearchFinding[] {
    const lower = topic.toLowerCase();
    return this.findings.filter(f => f.topic.toLowerCase().includes(lower));
  }
  
  // ============================================================================
  // PERSISTENCE
  // ============================================================================
  
  /**
   * Ensure data directory exists
   */
  private ensureDataDirectory(): void {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
    } catch (error) {
      logger.warn('Could not create knowledge directory:', error);
    }
  }
  
  /**
   * Save acquired knowledge to disk
   */
  private saveKnowledge(): void {
    try {
      // Save blueprints
      const blueprintsPath = path.join(this.dataDir, 'acquired_blueprints.json');
      fs.writeFileSync(blueprintsPath, JSON.stringify(
        Array.from(this.acquiredBlueprints.values()),
        null, 2
      ));
      
      // Save recipes
      const recipesPath = path.join(this.dataDir, 'acquired_recipes.json');
      fs.writeFileSync(recipesPath, JSON.stringify(
        Array.from(this.acquiredRecipes.values()),
        null, 2
      ));
      
      // Save strategies
      const strategiesPath = path.join(this.dataDir, 'acquired_strategies.json');
      fs.writeFileSync(strategiesPath, JSON.stringify(
        Array.from(this.acquiredStrategies.values()),
        null, 2
      ));
      
      // Save findings (last 1000)
      const findingsPath = path.join(this.dataDir, 'research_findings.json');
      fs.writeFileSync(findingsPath, JSON.stringify(
        this.findings.slice(-1000),
        null, 2
      ));
      
      logger.debug('Knowledge saved to disk');
    } catch (error) {
      logger.warn('Could not save knowledge:', error);
    }
  }
  
  /**
   * Load existing knowledge from disk
   */
  private loadExistingKnowledge(): void {
    try {
      // Load blueprints
      const blueprintsPath = path.join(this.dataDir, 'acquired_blueprints.json');
      if (fs.existsSync(blueprintsPath)) {
        const blueprints: AcquiredBlueprint[] = JSON.parse(fs.readFileSync(blueprintsPath, 'utf-8'));
        for (const bp of blueprints) {
          this.acquiredBlueprints.set(bp.id, bp);
        }
        logger.info(`Loaded ${blueprints.length} acquired blueprints`);
      }
      
      // Load recipes
      const recipesPath = path.join(this.dataDir, 'acquired_recipes.json');
      if (fs.existsSync(recipesPath)) {
        const recipes: AcquiredRecipe[] = JSON.parse(fs.readFileSync(recipesPath, 'utf-8'));
        for (const r of recipes) {
          this.acquiredRecipes.set(r.id, r);
        }
        logger.info(`Loaded ${recipes.length} acquired recipes`);
      }
      
      // Load strategies
      const strategiesPath = path.join(this.dataDir, 'acquired_strategies.json');
      if (fs.existsSync(strategiesPath)) {
        const strategies: AcquiredStrategy[] = JSON.parse(fs.readFileSync(strategiesPath, 'utf-8'));
        for (const s of strategies) {
          this.acquiredStrategies.set(s.id, s);
        }
        logger.info(`Loaded ${strategies.length} acquired strategies`);
      }
      
      // Load findings
      const findingsPath = path.join(this.dataDir, 'research_findings.json');
      if (fs.existsSync(findingsPath)) {
        this.findings = JSON.parse(fs.readFileSync(findingsPath, 'utf-8'));
        logger.info(`Loaded ${this.findings.length} research findings`);
      }
    } catch (error) {
      logger.warn('Could not load existing knowledge:', error);
    }
  }
  
  // ============================================================================
  // STATUS
  // ============================================================================
  
  /**
   * Get knowledge acquisition stats
   */
  getStats(): KnowledgeStats {
    return {
      totalFindings: this.findings.length,
      addedToKnowledge: this.findings.filter(f => f.addedToKnowledge).length,
      blueprintsAcquired: this.acquiredBlueprints.size,
      recipesAcquired: this.acquiredRecipes.size,
      strategiesAcquired: this.acquiredStrategies.size,
      lastResearchTime: this.lastResearchTime
    };
  }
  
  /**
   * Get formatted status
   */
  getFormattedStatus(): string {
    const stats = this.getStats();
    const lastResearch = stats.lastResearchTime > 0
      ? new Date(stats.lastResearchTime).toLocaleString()
      : 'Never';
    
    return `
📖 Knowledge Acquisition Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Research Findings: ${stats.totalFindings}
Added to Knowledge: ${stats.addedToKnowledge}

Acquired Content:
• Blueprints: ${stats.blueprintsAcquired}
• Recipes: ${stats.recipesAcquired}
• Strategies: ${stats.strategiesAcquired}

Last Research: ${lastResearch}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export function getKnowledgeAcquisition(): KnowledgeAcquisitionManager {
  return KnowledgeAcquisitionManager.getInstance();
}

export default KnowledgeAcquisitionManager;
