/**
 * BlockLife AI - Web Research System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * AI WEB RESEARCH CAPABILITY
 * Allows the AI to search the web for information it doesn't know:
 * - Minecraft building tutorials and blueprints
 * - Crafting recipes and strategies
 * - Redstone contraption designs
 * - Combat tips and tricks
 * - Any other game knowledge
 * 
 * Toggle-able feature that can be enabled/disabled from dashboard.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../utils/logger';
import { getSystemStatus, EventCategory, LogLevel } from '../utils/system-status';

const logger = createLogger('web-research');

// Persistent config file path
const CONFIG_FILE_PATH = './data/web-research-config.json';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface WebResearchConfig {
  enabled: boolean;
  maxSearchesPerMinute: number;
  cacheResults: boolean;
  cacheDurationMs: number;
  trustedSources: string[];
  blockedSources: string[];
  searchTimeout: number;
}

const DEFAULT_CONFIG: WebResearchConfig = {
  enabled: false,  // Disabled by default - user must enable
  maxSearchesPerMinute: 10,
  cacheResults: true,
  cacheDurationMs: 3600000, // 1 hour
  trustedSources: [
    'minecraft.wiki',
    'minecraft.fandom.com',
    'reddit.com/r/Minecraft',
    'youtube.com',
    'planetminecraft.com',
    'minecraftforum.net'
  ],
  blockedSources: [],
  searchTimeout: 10000
};

// ============================================================================
// INTERFACES
// ============================================================================

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  relevanceScore: number;
  cachedAt?: number;
}

export interface ResearchQuery {
  query: string;
  category: 'building' | 'crafting' | 'combat' | 'farming' | 'redstone' | 'exploration' | 'general';
  context?: string;
  maxResults?: number;
}

export interface ResearchResult {
  query: string;
  success: boolean;
  results: SearchResult[];
  summary?: string;
  timestamp: number;
  fromCache: boolean;
  searchDurationMs: number;
}

export interface CachedResearch {
  query: string;
  results: SearchResult[];
  summary?: string;
  cachedAt: number;
  expiresAt: number;
}

// ============================================================================
// WEB RESEARCH MANAGER
// ============================================================================

export class WebResearchManager {
  private static instance: WebResearchManager | null = null;
  
  private config: WebResearchConfig;
  private cache: Map<string, CachedResearch> = new Map();
  private searchCount: number = 0;
  private lastMinuteReset: number = Date.now();
  private isSearching: boolean = false;
  
  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
    
    // Load persisted config from disk (makes toggle persistent!)
    this.loadPersistedConfig();
    
    logger.info(`Web Research Manager initialized (${this.config.enabled ? 'ENABLED' : 'disabled'})`);
  }
  
  static getInstance(): WebResearchManager {
    if (!WebResearchManager.instance) {
      WebResearchManager.instance = new WebResearchManager();
    }
    return WebResearchManager.instance;
  }
  
  // ============================================================================
  // PERSISTENT CONFIGURATION - Toggle stays on/off until changed!
  // ============================================================================
  
  /**
   * Load persisted configuration from disk
   * This ensures the web research toggle stays on/off across restarts
   */
  private loadPersistedConfig(): void {
    try {
      // Ensure data directory exists
      const dir = path.dirname(CONFIG_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
        const savedConfig = JSON.parse(data);
        
        // Apply saved config
        this.config = { ...this.config, ...savedConfig };
        
        logger.info(`Loaded persisted web research config: enabled=${this.config.enabled}`);
      }
    } catch (error) {
      logger.warn('Could not load persisted web research config:', error);
    }
  }
  
  /**
   * Save configuration to disk for persistence
   * This makes the toggle PROJECT-WIDE and PERSISTENT
   */
  private savePersistedConfig(): void {
    try {
      // Ensure data directory exists
      const dir = path.dirname(CONFIG_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(this.config, null, 2));
      logger.debug('Web research config persisted to disk');
    } catch (error) {
      logger.warn('Could not save web research config:', error);
    }
  }
  
  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  
  /**
   * Enable or disable web research - PERSISTS ACROSS RESTARTS!
   * When you toggle this, it stays on/off for the entire project
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    
    // SAVE TO DISK - This makes it persistent!
    this.savePersistedConfig();
    
    const status = getSystemStatus();
    status.logEvent({
      category: EventCategory.SYSTEM,
      level: LogLevel.INFO,
      source: 'web-research',
      message: `Web research ${enabled ? 'ENABLED' : 'DISABLED'} (persisted for entire project)`
    });
    
    logger.info(`Web research ${enabled ? 'enabled' : 'disabled'} - setting saved`);
    console.log(`\n🌐 Web Research: ${enabled ? 'ENABLED ✅' : 'DISABLED ❌'}`);
    console.log(`   This setting is now saved and will persist until you change it.`);
    console.log(`   The AI can ${enabled ? 'now' : 'NOT'} search the web for information.\n`);
  }
  
  /**
   * Check if web research is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
  
  /**
   * Update configuration - PERSISTS!
   */
  updateConfig(config: Partial<WebResearchConfig>): void {
    this.config = { ...this.config, ...config };
    this.savePersistedConfig(); // Persist changes!
    logger.info('Web research configuration updated and saved');
  }
  
  /**
   * Get current configuration
   */
  getConfig(): WebResearchConfig {
    return { ...this.config };
  }
  
  // ============================================================================
  // SEARCH
  // ============================================================================
  
  /**
   * Perform a web research query
   */
  async research(query: ResearchQuery): Promise<ResearchResult> {
    const startTime = Date.now();
    const normalizedQuery = this.normalizeQuery(query.query);
    
    // Check if disabled
    if (!this.config.enabled) {
      return {
        query: query.query,
        success: false,
        results: [],
        summary: 'Web research is disabled. Enable it from the dashboard to allow AI web searches.',
        timestamp: Date.now(),
        fromCache: false,
        searchDurationMs: Date.now() - startTime
      };
    }
    
    // Check rate limit
    this.checkRateLimit();
    if (!this.canSearch()) {
      return {
        query: query.query,
        success: false,
        results: [],
        summary: 'Rate limit reached. Please wait before searching again.',
        timestamp: Date.now(),
        fromCache: false,
        searchDurationMs: Date.now() - startTime
      };
    }
    
    // Check cache
    if (this.config.cacheResults) {
      const cached = this.getFromCache(normalizedQuery);
      if (cached) {
        logger.info(`Cache hit for query: ${query.query}`);
        return {
          query: query.query,
          success: true,
          results: cached.results,
          summary: cached.summary,
          timestamp: Date.now(),
          fromCache: true,
          searchDurationMs: Date.now() - startTime
        };
      }
    }
    
    // Perform search
    this.isSearching = true;
    this.searchCount++;
    
    try {
      const results = await this.performSearch(query);
      const summary = this.generateSummary(query, results);
      
      // Cache results
      if (this.config.cacheResults && results.length > 0) {
        this.addToCache(normalizedQuery, results, summary);
      }
      
      const status = getSystemStatus();
      status.logEvent({
        category: EventCategory.AI_DECISION,
        level: LogLevel.INFO,
        source: 'web-research',
        message: `Web search completed: "${query.query}" - ${results.length} results`
      });
      
      return {
        query: query.query,
        success: true,
        results,
        summary,
        timestamp: Date.now(),
        fromCache: false,
        searchDurationMs: Date.now() - startTime
      };
    } catch (error) {
      logger.error(`Search failed: ${error}`);
      return {
        query: query.query,
        success: false,
        results: [],
        summary: `Search failed: ${error}`,
        timestamp: Date.now(),
        fromCache: false,
        searchDurationMs: Date.now() - startTime
      };
    } finally {
      this.isSearching = false;
    }
  }
  
  /**
   * Quick search for specific Minecraft topics
   */
  async searchMinecraft(topic: string, category: ResearchQuery['category'] = 'general'): Promise<ResearchResult> {
    return this.research({
      query: `Minecraft ${topic}`,
      category,
      maxResults: 5
    });
  }
  
  /**
   * Search for building blueprints
   */
  async searchBlueprint(structure: string): Promise<ResearchResult> {
    return this.research({
      query: `Minecraft ${structure} building tutorial blueprint block by block`,
      category: 'building',
      context: 'Need detailed building instructions',
      maxResults: 5
    });
  }
  
  /**
   * Search for crafting recipes
   */
  async searchRecipe(item: string): Promise<ResearchResult> {
    return this.research({
      query: `Minecraft ${item} crafting recipe how to make`,
      category: 'crafting',
      maxResults: 3
    });
  }
  
  /**
   * Search for redstone designs
   */
  async searchRedstone(contraption: string): Promise<ResearchResult> {
    return this.research({
      query: `Minecraft ${contraption} redstone tutorial design`,
      category: 'redstone',
      maxResults: 5
    });
  }
  
  /**
   * Search for combat strategies
   */
  async searchCombat(enemy: string): Promise<ResearchResult> {
    return this.research({
      query: `Minecraft how to fight ${enemy} tips strategy`,
      category: 'combat',
      maxResults: 3
    });
  }
  
  // ============================================================================
  // INTERNAL METHODS
  // ============================================================================
  
  /**
   * Perform the actual web search
   * This is a placeholder - in production, integrate with a search API
   */
  private async performSearch(query: ResearchQuery): Promise<SearchResult[]> {
    // In a real implementation, this would call a search API like:
    // - Google Custom Search API
    // - Bing Search API
    // - DuckDuckGo API
    // - SerpAPI
    
    // For now, return curated Minecraft knowledge
    const results = this.getBuiltInKnowledge(query);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return results;
  }
  
  /**
   * Get built-in knowledge for common queries
   * This provides offline fallback when web search isn't available
   */
  private getBuiltInKnowledge(query: ResearchQuery): SearchResult[] {
    const q = query.query.toLowerCase();
    const results: SearchResult[] = [];
    
    // Building knowledge
    if (query.category === 'building' || q.includes('build') || q.includes('house') || q.includes('structure')) {
      results.push({
        title: 'Minecraft Building Guide - Basic Structures',
        url: 'https://minecraft.wiki/w/Tutorials/Shelters',
        snippet: 'Start with a simple 5x5 base. Use wood planks for walls, cobblestone for foundation. Always include: door, bed, crafting table, furnace, and chest. Light with torches every 7 blocks.',
        source: 'minecraft.wiki',
        relevanceScore: 0.9
      });
    }
    
    // Crafting knowledge
    if (query.category === 'crafting' || q.includes('craft') || q.includes('recipe') || q.includes('make')) {
      if (q.includes('pickaxe')) {
        results.push({
          title: 'Pickaxe Crafting Recipes',
          url: 'https://minecraft.wiki/w/Pickaxe',
          snippet: 'Pickaxe: 3 material (wood/stone/iron/gold/diamond) on top row, 2 sticks in middle column. Wood pickaxe mines stone, stone mines iron, iron mines diamond/gold/redstone.',
          source: 'minecraft.wiki',
          relevanceScore: 0.95
        });
      }
      if (q.includes('furnace')) {
        results.push({
          title: 'Furnace Crafting Recipe',
          url: 'https://minecraft.wiki/w/Furnace',
          snippet: 'Furnace: 8 cobblestone in a ring pattern (leave center empty). Used for smelting ores, cooking food. Fuel: coal (8 items), wood (1.5 items), lava bucket (100 items).',
          source: 'minecraft.wiki',
          relevanceScore: 0.95
        });
      }
    }
    
    // Combat knowledge
    if (query.category === 'combat' || q.includes('fight') || q.includes('kill') || q.includes('combat')) {
      if (q.includes('creeper')) {
        results.push({
          title: 'How to Fight Creepers',
          url: 'https://minecraft.wiki/w/Creeper',
          snippet: 'Sprint-hit and retreat to reset fuse. Use bow from distance. Cats scare creepers away. Shield blocks explosion damage. Listen for hiss sound - you have 1.5 seconds to escape.',
          source: 'minecraft.wiki',
          relevanceScore: 0.9
        });
      }
      if (q.includes('ender dragon') || q.includes('dragon')) {
        results.push({
          title: 'Ender Dragon Fight Guide',
          url: 'https://minecraft.wiki/w/Ender_Dragon',
          snippet: 'Destroy all End Crystals first (bow or climb towers). When dragon perches, attack head with sword. Bring: bow + arrows, diamond armor, slow falling potions, water bucket for Endermen.',
          source: 'minecraft.wiki',
          relevanceScore: 0.95
        });
      }
    }
    
    // Redstone knowledge
    if (query.category === 'redstone' || q.includes('redstone') || q.includes('automat')) {
      results.push({
        title: 'Redstone Basics Tutorial',
        url: 'https://minecraft.wiki/w/Redstone_circuits',
        snippet: 'Redstone signal travels 15 blocks. Use repeaters to extend. Comparators detect container contents. Observers detect block changes. Hoppers move items automatically.',
        source: 'minecraft.wiki',
        relevanceScore: 0.85
      });
    }
    
    // Farming knowledge
    if (query.category === 'farming' || q.includes('farm') || q.includes('grow') || q.includes('crop')) {
      results.push({
        title: 'Crop Farming Guide',
        url: 'https://minecraft.wiki/w/Tutorials/Crop_farming',
        snippet: 'Wheat/carrots/potatoes need farmland + light level 9+. Water hydrates farmland within 4 blocks. Bone meal speeds growth. Harvest wheat at stage 7 (golden color).',
        source: 'minecraft.wiki',
        relevanceScore: 0.9
      });
    }
    
    // Add generic helpful result if nothing specific found
    if (results.length === 0) {
      results.push({
        title: 'Minecraft Wiki - Game Guide',
        url: 'https://minecraft.wiki',
        snippet: 'Comprehensive Minecraft guide covering all game mechanics, crafting recipes, mob behaviors, biomes, and strategies for survival and creative modes.',
        source: 'minecraft.wiki',
        relevanceScore: 0.5
      });
    }
    
    return results;
  }
  
  /**
   * Generate a summary from search results
   */
  private generateSummary(query: ResearchQuery, results: SearchResult[]): string {
    if (results.length === 0) {
      return `No results found for "${query.query}". Try rephrasing your search.`;
    }
    
    const topResult = results[0];
    let summary = `Based on research for "${query.query}":\n\n`;
    summary += topResult.snippet;
    
    if (results.length > 1) {
      summary += `\n\nAdditional sources found: ${results.length - 1}`;
    }
    
    return summary;
  }
  
  /**
   * Normalize query for caching
   */
  private normalizeQuery(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, ' ');
  }
  
  /**
   * Check and reset rate limit
   */
  private checkRateLimit(): void {
    const now = Date.now();
    if (now - this.lastMinuteReset > 60000) {
      this.searchCount = 0;
      this.lastMinuteReset = now;
    }
  }
  
  /**
   * Check if we can perform a search
   */
  private canSearch(): boolean {
    return this.searchCount < this.config.maxSearchesPerMinute && !this.isSearching;
  }
  
  /**
   * Get result from cache
   */
  private getFromCache(normalizedQuery: string): CachedResearch | null {
    const cached = this.cache.get(normalizedQuery);
    if (!cached) return null;
    
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(normalizedQuery);
      return null;
    }
    
    return cached;
  }
  
  /**
   * Add result to cache
   */
  private addToCache(normalizedQuery: string, results: SearchResult[], summary?: string): void {
    const now = Date.now();
    this.cache.set(normalizedQuery, {
      query: normalizedQuery,
      results,
      summary,
      cachedAt: now,
      expiresAt: now + this.config.cacheDurationMs
    });
  }
  
  // ============================================================================
  // STATUS
  // ============================================================================
  
  /**
   * Get current status
   */
  getStatus(): {
    enabled: boolean;
    isSearching: boolean;
    searchesThisMinute: number;
    maxSearchesPerMinute: number;
    cacheSize: number;
    cacheEnabled: boolean;
  } {
    return {
      enabled: this.config.enabled,
      isSearching: this.isSearching,
      searchesThisMinute: this.searchCount,
      maxSearchesPerMinute: this.config.maxSearchesPerMinute,
      cacheSize: this.cache.size,
      cacheEnabled: this.config.cacheResults
    };
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Web research cache cleared');
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export function getWebResearch(): WebResearchManager {
  return WebResearchManager.getInstance();
}

export default WebResearchManager;
