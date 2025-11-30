/**
 * BlockLife AI - Minecraft Data Source
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * REAL MINECRAFT DATA from minecraft-data package.
 * This provides accurate, official data sourced from the actual game files.
 * 
 * Sources: PrismarineJS/minecraft-data (extracted from Minecraft game files)
 */

import minecraftData from 'minecraft-data';
import { createLogger } from '../utils/logger';

const logger = createLogger('minecraft-data');

// Default to latest Java Edition
const MC_VERSION = '1.20.4';

// ============================================================================
// MINECRAFT DATA INTERFACE
// ============================================================================

export interface MCBlock {
  id: number;
  name: string;
  displayName: string;
  hardness: number | null;
  resistance: number;
  stackSize: number;
  diggable: boolean;
  material?: string;
  transparent: boolean;
  emitLight: number;
  filterLight: number;
  boundingBox: string;
  drops: number[];
}

export interface MCItem {
  id: number;
  name: string;
  displayName: string;
  stackSize: number;
}

export interface MCRecipe {
  result: { id: number; count: number };
  inShape?: (number | null)[][];
  outShape?: (number | null)[][];
  ingredients?: { id: number; count: number }[];
}

export interface MCEntity {
  id: number;
  name: string;
  displayName: string;
  type: string;
  width: number;
  height: number;
  category?: string;
}

export interface MCBiome {
  id: number;
  name: string;
  displayName: string;
  rainfall: number;
  temperature: number;
  dimension: string;
}

export interface MCFood {
  id: number;
  name: string;
  displayName: string;
  foodPoints: number;
  saturation: number;
  effectiveQuality: number;
  saturationRatio: number;
}

export interface MCEffect {
  id: number;
  name: string;
  displayName: string;
  type: string;
}

export interface MCEnchantment {
  id: number;
  name: string;
  displayName: string;
  maxLevel: number;
  minCost: { a: number; b: number };
  maxCost: { a: number; b: number };
  treasureOnly: boolean;
  curse: boolean;
  exclude: string[];
  category: string;
  weight: number;
  tradeable: boolean;
  discoverable: boolean;
}

// ============================================================================
// MINECRAFT DATA MANAGER
// ============================================================================

export class MinecraftDataSource {
  private mcData: any;
  private version: string;
  private initialized: boolean = false;

  // Cached data for quick lookups
  private blocksByName: Map<string, MCBlock> = new Map();
  private itemsByName: Map<string, MCItem> = new Map();
  private entitiesByName: Map<string, MCEntity> = new Map();
  private biomesByName: Map<string, MCBiome> = new Map();
  private foodsByName: Map<string, MCFood> = new Map();
  private recipesByResult: Map<string, MCRecipe[]> = new Map();
  
  constructor(version: string = MC_VERSION) {
    this.version = version;
    this.initialize();
  }

  private initialize(): void {
    try {
      this.mcData = minecraftData(this.version);
      
      if (!this.mcData) {
        logger.warn(`Minecraft data not available for version ${this.version}, using fallback`);
        return;
      }

      // Cache blocks
      if (this.mcData.blocks) {
        for (const block of Object.values(this.mcData.blocks) as MCBlock[]) {
          this.blocksByName.set(block.name, block);
        }
      }

      // Cache items
      if (this.mcData.items) {
        for (const item of Object.values(this.mcData.items) as MCItem[]) {
          this.itemsByName.set(item.name, item);
        }
      }

      // Cache entities
      if (this.mcData.entities) {
        for (const entity of Object.values(this.mcData.entities) as MCEntity[]) {
          this.entitiesByName.set(entity.name, entity);
        }
      }

      // Cache biomes
      if (this.mcData.biomes) {
        for (const biome of Object.values(this.mcData.biomes) as MCBiome[]) {
          this.biomesByName.set(biome.name, biome);
        }
      }

      // Cache foods
      if (this.mcData.foods) {
        for (const food of Object.values(this.mcData.foods) as MCFood[]) {
          this.foodsByName.set(food.name, food);
        }
      }

      // Cache recipes by result item
      if (this.mcData.recipes) {
        for (const [itemId, recipes] of Object.entries(this.mcData.recipes)) {
          const item = this.mcData.items[parseInt(itemId)];
          if (item) {
            this.recipesByResult.set(item.name, recipes as MCRecipe[]);
          }
        }
      }

      this.initialized = true;
      logger.info(`Minecraft data loaded for version ${this.version}: ${this.blocksByName.size} blocks, ${this.itemsByName.size} items, ${this.entitiesByName.size} entities`);
    } catch (error) {
      logger.error(`Failed to load minecraft-data: ${error}`);
    }
  }

  // ============================================================================
  // BLOCK DATA
  // ============================================================================

  /**
   * Get all blocks
   */
  getAllBlocks(): MCBlock[] {
    return Array.from(this.blocksByName.values());
  }

  /**
   * Get block by name
   */
  getBlock(name: string): MCBlock | undefined {
    return this.blocksByName.get(name) || this.blocksByName.get(name.replace('minecraft:', ''));
  }

  /**
   * Get blocks that drop a specific item
   */
  getBlocksDropping(itemName: string): MCBlock[] {
    const item = this.getItem(itemName);
    if (!item) return [];
    
    return this.getAllBlocks().filter(block => 
      block.drops && block.drops.includes(item.id)
    );
  }

  /**
   * Get hardness of a block (time to break)
   */
  getBlockHardness(name: string): number {
    const block = this.getBlock(name);
    return block?.hardness ?? -1;
  }

  /**
   * Check if block is diggable
   */
  isBlockDiggable(name: string): boolean {
    const block = this.getBlock(name);
    return block?.diggable ?? false;
  }

  /**
   * Get blocks by material type
   */
  getBlocksByMaterial(material: string): MCBlock[] {
    return this.getAllBlocks().filter(block => 
      block.material?.toLowerCase().includes(material.toLowerCase())
    );
  }

  // ============================================================================
  // ITEM DATA
  // ============================================================================

  /**
   * Get all items
   */
  getAllItems(): MCItem[] {
    return Array.from(this.itemsByName.values());
  }

  /**
   * Get item by name
   */
  getItem(name: string): MCItem | undefined {
    return this.itemsByName.get(name) || this.itemsByName.get(name.replace('minecraft:', ''));
  }

  /**
   * Get item stack size
   */
  getItemStackSize(name: string): number {
    const item = this.getItem(name);
    return item?.stackSize ?? 64;
  }

  /**
   * Search items by partial name
   */
  searchItems(query: string): MCItem[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllItems().filter(item => 
      item.name.toLowerCase().includes(lowerQuery) ||
      item.displayName.toLowerCase().includes(lowerQuery)
    );
  }

  // ============================================================================
  // RECIPE DATA
  // ============================================================================

  /**
   * Get recipes that produce an item
   */
  getRecipesFor(itemName: string): MCRecipe[] {
    return this.recipesByResult.get(itemName) || 
           this.recipesByResult.get(itemName.replace('minecraft:', '')) || 
           [];
  }

  /**
   * Check if an item is craftable
   */
  isCraftable(itemName: string): boolean {
    return this.getRecipesFor(itemName).length > 0;
  }

  /**
   * Get all craftable items
   */
  getAllCraftableItems(): string[] {
    return Array.from(this.recipesByResult.keys());
  }

  /**
   * Get ingredients needed for a recipe
   */
  getRecipeIngredients(itemName: string): { item: string; count: number }[] {
    const recipes = this.getRecipesFor(itemName);
    if (recipes.length === 0) return [];

    const recipe = recipes[0]; // Use first recipe
    const ingredients: Map<number, number> = new Map();

    // Handle shaped recipes
    if (recipe.inShape) {
      for (const row of recipe.inShape) {
        for (const itemId of row) {
          if (itemId !== null) {
            ingredients.set(itemId, (ingredients.get(itemId) || 0) + 1);
          }
        }
      }
    }

    // Handle shapeless recipes
    if (recipe.ingredients) {
      for (const ing of recipe.ingredients) {
        ingredients.set(ing.id, (ingredients.get(ing.id) || 0) + ing.count);
      }
    }

    // Convert to readable format
    const result: { item: string; count: number }[] = [];
    for (const [itemId, count] of ingredients) {
      const item = this.mcData.items[itemId];
      if (item) {
        result.push({ item: item.name, count });
      }
    }

    return result;
  }

  // ============================================================================
  // ENTITY DATA
  // ============================================================================

  /**
   * Get all entities
   */
  getAllEntities(): MCEntity[] {
    return Array.from(this.entitiesByName.values());
  }

  /**
   * Get entity by name
   */
  getEntity(name: string): MCEntity | undefined {
    return this.entitiesByName.get(name) || this.entitiesByName.get(name.replace('minecraft:', ''));
  }

  /**
   * Get hostile mobs
   */
  getHostileMobs(): MCEntity[] {
    return this.getAllEntities().filter(entity => 
      entity.type === 'hostile' || entity.category === 'hostile'
    );
  }

  /**
   * Get passive mobs
   */
  getPassiveMobs(): MCEntity[] {
    return this.getAllEntities().filter(entity => 
      entity.type === 'passive' || entity.category === 'passive' ||
      entity.type === 'animal' || entity.category === 'animal'
    );
  }

  /**
   * Get entity dimensions
   */
  getEntitySize(name: string): { width: number; height: number } | undefined {
    const entity = this.getEntity(name);
    if (!entity) return undefined;
    return { width: entity.width, height: entity.height };
  }

  // ============================================================================
  // BIOME DATA
  // ============================================================================

  /**
   * Get all biomes
   */
  getAllBiomes(): MCBiome[] {
    return Array.from(this.biomesByName.values());
  }

  /**
   * Get biome by name
   */
  getBiome(name: string): MCBiome | undefined {
    return this.biomesByName.get(name) || this.biomesByName.get(name.replace('minecraft:', ''));
  }

  /**
   * Get biomes by dimension
   */
  getBiomesByDimension(dimension: string): MCBiome[] {
    return this.getAllBiomes().filter(biome => 
      biome.dimension === dimension
    );
  }

  /**
   * Get biomes by temperature range
   */
  getBiomesByTemperature(minTemp: number, maxTemp: number): MCBiome[] {
    return this.getAllBiomes().filter(biome => 
      biome.temperature >= minTemp && biome.temperature <= maxTemp
    );
  }

  // ============================================================================
  // FOOD DATA
  // ============================================================================

  /**
   * Get all foods
   */
  getAllFoods(): MCFood[] {
    return Array.from(this.foodsByName.values());
  }

  /**
   * Get food by name
   */
  getFood(name: string): MCFood | undefined {
    return this.foodsByName.get(name) || this.foodsByName.get(name.replace('minecraft:', ''));
  }

  /**
   * Get best foods by saturation
   */
  getBestFoods(count: number = 10): MCFood[] {
    return this.getAllFoods()
      .sort((a, b) => b.effectiveQuality - a.effectiveQuality)
      .slice(0, count);
  }

  /**
   * Get food nutrition value
   */
  getFoodValue(name: string): { hunger: number; saturation: number } | undefined {
    const food = this.getFood(name);
    if (!food) return undefined;
    return { hunger: food.foodPoints, saturation: food.saturation };
  }

  // ============================================================================
  // ENCHANTMENT DATA
  // ============================================================================

  /**
   * Get all enchantments
   */
  getAllEnchantments(): MCEnchantment[] {
    if (!this.mcData.enchantments) return [];
    return Object.values(this.mcData.enchantments) as MCEnchantment[];
  }

  /**
   * Get enchantment by name
   */
  getEnchantment(name: string): MCEnchantment | undefined {
    if (!this.mcData.enchantments) return undefined;
    return Object.values(this.mcData.enchantments as MCEnchantment[])
      .find(e => e.name === name || e.name === name.replace('minecraft:', ''));
  }

  /**
   * Get enchantments for a category (armor, weapon, tool, etc.)
   */
  getEnchantmentsForCategory(category: string): MCEnchantment[] {
    return this.getAllEnchantments().filter(e => 
      e.category.toLowerCase() === category.toLowerCase()
    );
  }

  // ============================================================================
  // EFFECT DATA
  // ============================================================================

  /**
   * Get all effects
   */
  getAllEffects(): MCEffect[] {
    if (!this.mcData.effects) return [];
    return Object.values(this.mcData.effects) as MCEffect[];
  }

  /**
   * Get effect by name
   */
  getEffect(name: string): MCEffect | undefined {
    if (!this.mcData.effects) return undefined;
    return Object.values(this.mcData.effects as MCEffect[])
      .find(e => e.name === name || e.name === name.replace('minecraft:', ''));
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get version info
   */
  getVersion(): string {
    return this.version;
  }

  /**
   * Check if data is loaded
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get data statistics
   */
  getStats(): {
    blocks: number;
    items: number;
    entities: number;
    biomes: number;
    foods: number;
    recipes: number;
  } {
    return {
      blocks: this.blocksByName.size,
      items: this.itemsByName.size,
      entities: this.entitiesByName.size,
      biomes: this.biomesByName.size,
      foods: this.foodsByName.size,
      recipes: this.recipesByResult.size
    };
  }

  /**
   * Get raw minecraft-data object for advanced usage
   */
  getRawData(): any {
    return this.mcData;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let dataSourceInstance: MinecraftDataSource | null = null;

export function getMinecraftDataSource(version?: string): MinecraftDataSource {
  if (!dataSourceInstance || (version && version !== dataSourceInstance.getVersion())) {
    dataSourceInstance = new MinecraftDataSource(version);
  }
  return dataSourceInstance;
}

export function resetMinecraftDataSource(): void {
  dataSourceInstance = null;
}

export default MinecraftDataSource;
