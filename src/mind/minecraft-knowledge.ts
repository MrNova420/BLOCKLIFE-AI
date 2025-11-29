/**
 * BlockLife AI - Minecraft Knowledge Base
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Comprehensive Minecraft knowledge system covering everything from
 * basic survival to advanced building, redstone, combat, and exploration.
 * This enables bots to progress from cave dwellers to master players.
 */

import { TechAge } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('knowledge');

// ============================================================================
// SKILL LEVELS
// ============================================================================

export enum SkillLevel {
  NOVICE = 'NOVICE',           // Just started, basic survival
  APPRENTICE = 'APPRENTICE',   // Learning the basics
  JOURNEYMAN = 'JOURNEYMAN',   // Competent, can do most things
  EXPERT = 'EXPERT',           // Advanced techniques
  MASTER = 'MASTER',           // End-game level skills
  LEGENDARY = 'LEGENDARY'      // Speed-runner / pro level
}

// ============================================================================
// KNOWLEDGE CATEGORIES
// ============================================================================

export enum KnowledgeCategory {
  SURVIVAL = 'SURVIVAL',
  MINING = 'MINING',
  FARMING = 'FARMING',
  BUILDING = 'BUILDING',
  REDSTONE = 'REDSTONE',
  COMBAT = 'COMBAT',
  ENCHANTING = 'ENCHANTING',
  BREWING = 'BREWING',
  EXPLORATION = 'EXPLORATION',
  NETHER = 'NETHER',
  END = 'END',
  TRADING = 'TRADING',
  AUTOMATION = 'AUTOMATION',
  DECORATION = 'DECORATION',
  SPEEDRUN = 'SPEEDRUN'
}

// ============================================================================
// BLOCK KNOWLEDGE
// ============================================================================

export interface BlockInfo {
  id: string;
  name: string;
  category: 'NATURAL' | 'BUILDING' | 'DECORATION' | 'REDSTONE' | 'UTILITY' | 'RARE';
  hardness: number;
  bestTool: 'HAND' | 'PICKAXE' | 'AXE' | 'SHOVEL' | 'HOE' | 'SHEARS';
  drops: string[];
  obtainedFrom: string[];
  uses: string[];
  skillRequired: SkillLevel;
}

export const BLOCK_KNOWLEDGE: Record<string, BlockInfo> = {
  // Basic blocks
  DIRT: {
    id: 'dirt',
    name: 'Dirt',
    category: 'NATURAL',
    hardness: 0.5,
    bestTool: 'SHOVEL',
    drops: ['dirt'],
    obtainedFrom: ['ground', 'grass_block'],
    uses: ['farming', 'filling', 'basic_building'],
    skillRequired: SkillLevel.NOVICE
  },
  COBBLESTONE: {
    id: 'cobblestone',
    name: 'Cobblestone',
    category: 'BUILDING',
    hardness: 2,
    bestTool: 'PICKAXE',
    drops: ['cobblestone'],
    obtainedFrom: ['stone', 'cobblestone_generator'],
    uses: ['building', 'tools', 'furnace', 'brewing_stand'],
    skillRequired: SkillLevel.NOVICE
  },
  OAK_LOG: {
    id: 'oak_log',
    name: 'Oak Log',
    category: 'NATURAL',
    hardness: 2,
    bestTool: 'AXE',
    drops: ['oak_log'],
    obtainedFrom: ['oak_tree'],
    uses: ['planks', 'charcoal', 'building'],
    skillRequired: SkillLevel.NOVICE
  },
  IRON_ORE: {
    id: 'iron_ore',
    name: 'Iron Ore',
    category: 'NATURAL',
    hardness: 3,
    bestTool: 'PICKAXE',
    drops: ['raw_iron'],
    obtainedFrom: ['underground', 'mountains'],
    uses: ['iron_ingot', 'tools', 'armor'],
    skillRequired: SkillLevel.APPRENTICE
  },
  DIAMOND_ORE: {
    id: 'diamond_ore',
    name: 'Diamond Ore',
    category: 'RARE',
    hardness: 3,
    bestTool: 'PICKAXE',
    drops: ['diamond'],
    obtainedFrom: ['deep_underground', 'y_level_-64_to_16'],
    uses: ['diamond_tools', 'diamond_armor', 'enchanting_table', 'jukebox'],
    skillRequired: SkillLevel.JOURNEYMAN
  },
  OBSIDIAN: {
    id: 'obsidian',
    name: 'Obsidian',
    category: 'BUILDING',
    hardness: 50,
    bestTool: 'PICKAXE',
    drops: ['obsidian'],
    obtainedFrom: ['lava_water_interaction', 'nether_portal'],
    uses: ['nether_portal', 'enchanting_table', 'beacon', 'blast_resistant_building'],
    skillRequired: SkillLevel.JOURNEYMAN
  },
  NETHERRACK: {
    id: 'netherrack',
    name: 'Netherrack',
    category: 'NATURAL',
    hardness: 0.4,
    bestTool: 'PICKAXE',
    drops: ['netherrack'],
    obtainedFrom: ['nether'],
    uses: ['eternal_fire', 'nether_brick'],
    skillRequired: SkillLevel.EXPERT
  },
  END_STONE: {
    id: 'end_stone',
    name: 'End Stone',
    category: 'NATURAL',
    hardness: 3,
    bestTool: 'PICKAXE',
    drops: ['end_stone'],
    obtainedFrom: ['the_end'],
    uses: ['end_stone_bricks', 'blast_resistant_building'],
    skillRequired: SkillLevel.MASTER
  },
  ANCIENT_DEBRIS: {
    id: 'ancient_debris',
    name: 'Ancient Debris',
    category: 'RARE',
    hardness: 30,
    bestTool: 'PICKAXE',
    drops: ['ancient_debris'],
    obtainedFrom: ['nether_y_level_8_22', 'bed_mining', 'tnt_mining'],
    uses: ['netherite_scrap', 'netherite_ingot', 'netherite_gear'],
    skillRequired: SkillLevel.MASTER
  }
};

// ============================================================================
// CRAFTING RECIPES
// ============================================================================

export interface CraftingRecipe {
  id: string;
  name: string;
  result: string;
  resultCount: number;
  ingredients: { item: string; count: number }[];
  pattern?: string[];  // 3x3 grid pattern
  shapeless: boolean;
  craftingStation: 'HAND' | 'CRAFTING_TABLE' | 'FURNACE' | 'SMITHING_TABLE' | 'STONECUTTER' | 'LOOM' | 'ANVIL';
  skillRequired: SkillLevel;
  category: KnowledgeCategory;
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // NOVICE - Basic Survival
  {
    id: 'crafting_table',
    name: 'Crafting Table',
    result: 'crafting_table',
    resultCount: 1,
    ingredients: [{ item: 'planks', count: 4 }],
    pattern: ['PP', 'PP'],
    shapeless: false,
    craftingStation: 'HAND',
    skillRequired: SkillLevel.NOVICE,
    category: KnowledgeCategory.SURVIVAL
  },
  {
    id: 'wooden_pickaxe',
    name: 'Wooden Pickaxe',
    result: 'wooden_pickaxe',
    resultCount: 1,
    ingredients: [{ item: 'planks', count: 3 }, { item: 'stick', count: 2 }],
    pattern: ['PPP', ' S ', ' S '],
    shapeless: false,
    craftingStation: 'CRAFTING_TABLE',
    skillRequired: SkillLevel.NOVICE,
    category: KnowledgeCategory.MINING
  },
  {
    id: 'furnace',
    name: 'Furnace',
    result: 'furnace',
    resultCount: 1,
    ingredients: [{ item: 'cobblestone', count: 8 }],
    pattern: ['CCC', 'C C', 'CCC'],
    shapeless: false,
    craftingStation: 'CRAFTING_TABLE',
    skillRequired: SkillLevel.NOVICE,
    category: KnowledgeCategory.SURVIVAL
  },
  {
    id: 'torch',
    name: 'Torch',
    result: 'torch',
    resultCount: 4,
    ingredients: [{ item: 'coal', count: 1 }, { item: 'stick', count: 1 }],
    pattern: ['C', 'S'],
    shapeless: false,
    craftingStation: 'HAND',
    skillRequired: SkillLevel.NOVICE,
    category: KnowledgeCategory.SURVIVAL
  },
  
  // APPRENTICE - Iron Age
  {
    id: 'iron_pickaxe',
    name: 'Iron Pickaxe',
    result: 'iron_pickaxe',
    resultCount: 1,
    ingredients: [{ item: 'iron_ingot', count: 3 }, { item: 'stick', count: 2 }],
    pattern: ['III', ' S ', ' S '],
    shapeless: false,
    craftingStation: 'CRAFTING_TABLE',
    skillRequired: SkillLevel.APPRENTICE,
    category: KnowledgeCategory.MINING
  },
  {
    id: 'shield',
    name: 'Shield',
    result: 'shield',
    resultCount: 1,
    ingredients: [{ item: 'planks', count: 6 }, { item: 'iron_ingot', count: 1 }],
    pattern: ['PWP', 'PPP', ' P '],
    shapeless: false,
    craftingStation: 'CRAFTING_TABLE',
    skillRequired: SkillLevel.APPRENTICE,
    category: KnowledgeCategory.COMBAT
  },
  {
    id: 'bucket',
    name: 'Bucket',
    result: 'bucket',
    resultCount: 1,
    ingredients: [{ item: 'iron_ingot', count: 3 }],
    pattern: ['I I', ' I '],
    shapeless: false,
    craftingStation: 'CRAFTING_TABLE',
    skillRequired: SkillLevel.APPRENTICE,
    category: KnowledgeCategory.SURVIVAL
  },
  
  // JOURNEYMAN - Diamond Age
  {
    id: 'diamond_pickaxe',
    name: 'Diamond Pickaxe',
    result: 'diamond_pickaxe',
    resultCount: 1,
    ingredients: [{ item: 'diamond', count: 3 }, { item: 'stick', count: 2 }],
    pattern: ['DDD', ' S ', ' S '],
    shapeless: false,
    craftingStation: 'CRAFTING_TABLE',
    skillRequired: SkillLevel.JOURNEYMAN,
    category: KnowledgeCategory.MINING
  },
  {
    id: 'enchanting_table',
    name: 'Enchanting Table',
    result: 'enchanting_table',
    resultCount: 1,
    ingredients: [{ item: 'book', count: 1 }, { item: 'diamond', count: 2 }, { item: 'obsidian', count: 4 }],
    pattern: [' B ', 'DOD', 'OOO'],
    shapeless: false,
    craftingStation: 'CRAFTING_TABLE',
    skillRequired: SkillLevel.JOURNEYMAN,
    category: KnowledgeCategory.ENCHANTING
  },
  {
    id: 'brewing_stand',
    name: 'Brewing Stand',
    result: 'brewing_stand',
    resultCount: 1,
    ingredients: [{ item: 'blaze_rod', count: 1 }, { item: 'cobblestone', count: 3 }],
    pattern: [' B ', 'CCC'],
    shapeless: false,
    craftingStation: 'CRAFTING_TABLE',
    skillRequired: SkillLevel.EXPERT,
    category: KnowledgeCategory.BREWING
  },
  
  // EXPERT - Redstone
  {
    id: 'piston',
    name: 'Piston',
    result: 'piston',
    resultCount: 1,
    ingredients: [
      { item: 'planks', count: 3 },
      { item: 'cobblestone', count: 4 },
      { item: 'iron_ingot', count: 1 },
      { item: 'redstone', count: 1 }
    ],
    pattern: ['PPP', 'CIC', 'CRC'],
    shapeless: false,
    craftingStation: 'CRAFTING_TABLE',
    skillRequired: SkillLevel.EXPERT,
    category: KnowledgeCategory.REDSTONE
  },
  {
    id: 'hopper',
    name: 'Hopper',
    result: 'hopper',
    resultCount: 1,
    ingredients: [{ item: 'iron_ingot', count: 5 }, { item: 'chest', count: 1 }],
    pattern: ['I I', 'ICI', ' I '],
    shapeless: false,
    craftingStation: 'CRAFTING_TABLE',
    skillRequired: SkillLevel.EXPERT,
    category: KnowledgeCategory.AUTOMATION
  },
  {
    id: 'observer',
    name: 'Observer',
    result: 'observer',
    resultCount: 1,
    ingredients: [
      { item: 'cobblestone', count: 6 },
      { item: 'redstone', count: 2 },
      { item: 'quartz', count: 1 }
    ],
    pattern: ['CCC', 'RRQ', 'CCC'],
    shapeless: false,
    craftingStation: 'CRAFTING_TABLE',
    skillRequired: SkillLevel.EXPERT,
    category: KnowledgeCategory.REDSTONE
  },
  
  // MASTER - End Game
  {
    id: 'beacon',
    name: 'Beacon',
    result: 'beacon',
    resultCount: 1,
    ingredients: [
      { item: 'glass', count: 5 },
      { item: 'nether_star', count: 1 },
      { item: 'obsidian', count: 3 }
    ],
    pattern: ['GGG', 'GNG', 'OOO'],
    shapeless: false,
    craftingStation: 'CRAFTING_TABLE',
    skillRequired: SkillLevel.MASTER,
    category: KnowledgeCategory.END
  },
  {
    id: 'end_crystal',
    name: 'End Crystal',
    result: 'end_crystal',
    resultCount: 1,
    ingredients: [
      { item: 'glass', count: 7 },
      { item: 'eye_of_ender', count: 1 },
      { item: 'ghast_tear', count: 1 }
    ],
    pattern: ['GGG', 'GEG', 'GTG'],
    shapeless: false,
    craftingStation: 'CRAFTING_TABLE',
    skillRequired: SkillLevel.MASTER,
    category: KnowledgeCategory.END
  }
];

// ============================================================================
// BUILDING BLUEPRINTS
// ============================================================================

export interface BuildingBlueprint {
  id: string;
  name: string;
  description: string;
  category: 'SHELTER' | 'FARM' | 'STORAGE' | 'DEFENSE' | 'DECORATION' | 'REDSTONE' | 'INFRASTRUCTURE' | 'MONUMENT';
  size: { width: number; height: number; depth: number };
  materials: { item: string; count: number }[];
  skillRequired: SkillLevel;
  techAgeRequired: TechAge;
  buildTime: number;  // In game ticks
  features: string[];
  tips: string[];
}

export const BUILDING_BLUEPRINTS: BuildingBlueprint[] = [
  // NOVICE - Basic Survival
  {
    id: 'dirt_hut',
    name: 'Dirt Hut',
    description: 'A simple emergency shelter made from dirt blocks.',
    category: 'SHELTER',
    size: { width: 3, height: 3, depth: 3 },
    materials: [{ item: 'dirt', count: 26 }],
    skillRequired: SkillLevel.NOVICE,
    techAgeRequired: TechAge.STONE,
    buildTime: 50,
    features: ['Basic protection from mobs', 'Quick to build'],
    tips: ['Dig into a hillside for faster construction', 'Always include a door or opening']
  },
  {
    id: 'wooden_cabin',
    name: 'Wooden Cabin',
    description: 'A cozy wooden shelter with basic amenities.',
    category: 'SHELTER',
    size: { width: 7, height: 5, depth: 7 },
    materials: [
      { item: 'oak_log', count: 20 },
      { item: 'oak_planks', count: 64 },
      { item: 'glass_pane', count: 8 },
      { item: 'oak_door', count: 1 },
      { item: 'torch', count: 6 }
    ],
    skillRequired: SkillLevel.NOVICE,
    techAgeRequired: TechAge.STONE,
    buildTime: 200,
    features: ['Bed', 'Crafting area', 'Storage chest', 'Furnace'],
    tips: ['Use logs as corner pillars', 'Add a chimney for aesthetics']
  },
  
  // APPRENTICE - Functional Buildings
  {
    id: 'wheat_farm',
    name: 'Wheat Farm',
    description: 'An efficient wheat farm with water irrigation.',
    category: 'FARM',
    size: { width: 9, height: 3, depth: 9 },
    materials: [
      { item: 'water_bucket', count: 1 },
      { item: 'farmland', count: 80 },
      { item: 'wheat_seeds', count: 80 },
      { item: 'fence', count: 36 },
      { item: 'torch', count: 8 }
    ],
    skillRequired: SkillLevel.APPRENTICE,
    techAgeRequired: TechAge.AGRICULTURAL,
    buildTime: 300,
    features: ['80 crop plots', 'Water irrigation', 'Fence protection', 'Torch lighting for night growth'],
    tips: ['Each water block hydrates 4 blocks in each direction', 'Use bone meal for instant growth']
  },
  {
    id: 'mine_entrance',
    name: 'Mine Entrance',
    description: 'A proper mine entrance with ladders and lighting.',
    category: 'INFRASTRUCTURE',
    size: { width: 5, height: 64, depth: 5 },
    materials: [
      { item: 'ladder', count: 64 },
      { item: 'torch', count: 32 },
      { item: 'cobblestone', count: 100 },
      { item: 'fence', count: 8 }
    ],
    skillRequired: SkillLevel.APPRENTICE,
    techAgeRequired: TechAge.IRON,
    buildTime: 400,
    features: ['Safe descent', 'Regular lighting', 'Rest platforms every 16 blocks'],
    tips: ['Build platforms every 16 blocks to prevent fall damage', 'Consider water elevator later']
  },
  {
    id: 'storage_room',
    name: 'Storage Room',
    description: 'Organized storage with labeled chests.',
    category: 'STORAGE',
    size: { width: 11, height: 5, depth: 11 },
    materials: [
      { item: 'chest', count: 54 },
      { item: 'item_frame', count: 54 },
      { item: 'stone_brick', count: 200 },
      { item: 'torch', count: 16 }
    ],
    skillRequired: SkillLevel.APPRENTICE,
    techAgeRequired: TechAge.IRON,
    buildTime: 350,
    features: ['54 double chests', 'Item frames for labels', 'Organized by category'],
    tips: ['Group similar items together', 'Leave space for expansion']
  },
  
  // JOURNEYMAN - Advanced Buildings
  {
    id: 'cobblestone_wall',
    name: 'Village Wall',
    description: 'Defensive wall with walkway and towers.',
    category: 'DEFENSE',
    size: { width: 100, height: 8, depth: 100 },
    materials: [
      { item: 'cobblestone', count: 2000 },
      { item: 'stone_brick', count: 500 },
      { item: 'torch', count: 100 },
      { item: 'ladder', count: 50 }
    ],
    skillRequired: SkillLevel.JOURNEYMAN,
    techAgeRequired: TechAge.SETTLEMENT,
    buildTime: 2000,
    features: ['4 corner towers', 'Walkway on top', 'Arrow slits', 'Main gate'],
    tips: ['Build 3 blocks high minimum to prevent spider climbing', 'Add overhang to prevent enderman teleporting']
  },
  {
    id: 'enchanting_room',
    name: 'Enchanting Room',
    description: 'Full enchanting setup with max level bookshelves.',
    category: 'INFRASTRUCTURE',
    size: { width: 7, height: 4, depth: 7 },
    materials: [
      { item: 'bookshelf', count: 15 },
      { item: 'enchanting_table', count: 1 },
      { item: 'obsidian', count: 4 },
      { item: 'glowstone', count: 4 }
    ],
    skillRequired: SkillLevel.JOURNEYMAN,
    techAgeRequired: TechAge.SETTLEMENT,
    buildTime: 300,
    features: ['15 bookshelves for max level 30', 'Proper spacing', 'Good lighting'],
    tips: ['Bookshelves must be 2 blocks away and 1 block high', 'No blocks between table and shelves']
  },
  {
    id: 'nether_portal_room',
    name: 'Nether Portal Room',
    description: 'Safe nether portal with protective structure.',
    category: 'INFRASTRUCTURE',
    size: { width: 9, height: 7, depth: 9 },
    materials: [
      { item: 'obsidian', count: 10 },
      { item: 'cobblestone', count: 100 },
      { item: 'iron_door', count: 2 },
      { item: 'button', count: 2 }
    ],
    skillRequired: SkillLevel.JOURNEYMAN,
    techAgeRequired: TechAge.SETTLEMENT,
    buildTime: 250,
    features: ['Protected portal', 'Zombie piglin barrier', 'Emergency chest'],
    tips: ['Build enclosed to prevent ghast fireballs', 'Keep a flint and steel in emergency chest']
  },
  
  // EXPERT - Complex Builds
  {
    id: 'auto_smelter',
    name: 'Automatic Smelter',
    description: 'Redstone-powered automatic smelting system.',
    category: 'REDSTONE',
    size: { width: 7, height: 5, depth: 3 },
    materials: [
      { item: 'furnace', count: 8 },
      { item: 'hopper', count: 16 },
      { item: 'chest', count: 4 },
      { item: 'redstone', count: 20 }
    ],
    skillRequired: SkillLevel.EXPERT,
    techAgeRequired: TechAge.REDSTONE,
    buildTime: 400,
    features: ['8 furnaces', 'Auto input/output', 'Fuel system', 'Indicator lights'],
    tips: ['Point hoppers into furnaces from top and bottom', 'Use carpets on hoppers to disable']
  },
  {
    id: 'mob_grinder',
    name: 'Mob Grinder',
    description: 'Dark room spawner with kill chamber.',
    category: 'REDSTONE',
    size: { width: 23, height: 12, depth: 23 },
    materials: [
      { item: 'cobblestone', count: 1000 },
      { item: 'water_bucket', count: 4 },
      { item: 'hopper', count: 4 },
      { item: 'chest', count: 2 },
      { item: 'trapdoor', count: 50 }
    ],
    skillRequired: SkillLevel.EXPERT,
    techAgeRequired: TechAge.REDSTONE,
    buildTime: 800,
    features: ['Dark spawning platforms', 'Water push system', '23 block fall', 'Collection system'],
    tips: ['Build at least 128 blocks from spawn', 'Cover with half-slabs to prevent spawns on roof']
  },
  {
    id: 'iron_farm',
    name: 'Iron Farm',
    description: 'Villager-based iron golem farm.',
    category: 'REDSTONE',
    size: { width: 16, height: 10, depth: 16 },
    materials: [
      { item: 'glass', count: 200 },
      { item: 'bed', count: 20 },
      { item: 'workstation', count: 20 },
      { item: 'water_bucket', count: 4 },
      { item: 'lava_bucket', count: 1 },
      { item: 'hopper', count: 4 }
    ],
    skillRequired: SkillLevel.EXPERT,
    techAgeRequired: TechAge.REDSTONE,
    buildTime: 600,
    features: ['20 villager pods', 'Zombie scare mechanic', 'Lava kill', 'Auto collection'],
    tips: ['Villagers need to sleep and work', 'Zombie must be named and held in minecart']
  },
  
  // MASTER - Grand Structures
  {
    id: 'castle',
    name: 'Medieval Castle',
    description: 'Grand castle with towers, walls, and throne room.',
    category: 'MONUMENT',
    size: { width: 50, height: 30, depth: 50 },
    materials: [
      { item: 'stone_brick', count: 5000 },
      { item: 'cobblestone', count: 2000 },
      { item: 'oak_planks', count: 1000 },
      { item: 'glass_pane', count: 200 },
      { item: 'iron_bars', count: 100 },
      { item: 'torch', count: 200 }
    ],
    skillRequired: SkillLevel.MASTER,
    techAgeRequired: TechAge.SETTLEMENT,
    buildTime: 5000,
    features: [
      'Main keep', '4 corner towers', 'Curtain walls', 'Gatehouse',
      'Great hall', 'Throne room', 'Dungeons', 'Living quarters'
    ],
    tips: ['Start with walls and towers', 'Use varied stone types for texture', 'Add banners for decoration']
  },
  {
    id: 'wither_skeleton_farm',
    name: 'Wither Skeleton Farm',
    description: 'Efficient wither skull farm in nether fortress.',
    category: 'REDSTONE',
    size: { width: 30, height: 6, depth: 30 },
    materials: [
      { item: 'wither_rose', count: 100 },
      { item: 'stone_brick_slab', count: 500 },
      { item: 'hopper', count: 50 },
      { item: 'chest', count: 10 }
    ],
    skillRequired: SkillLevel.MASTER,
    techAgeRequired: TechAge.REDSTONE,
    buildTime: 1500,
    features: ['Wither rose damage', 'Spawn platform', 'Auto collection', 'Looting sword area'],
    tips: ['Build on fortress bounding box', 'Remove all other spawning spaces nearby']
  },
  {
    id: 'end_base',
    name: 'End Island Base',
    description: 'Complete end game base with all utilities.',
    category: 'MONUMENT',
    size: { width: 40, height: 20, depth: 40 },
    materials: [
      { item: 'end_stone_brick', count: 2000 },
      { item: 'purpur_block', count: 1000 },
      { item: 'obsidian', count: 200 },
      { item: 'beacon', count: 4 }
    ],
    skillRequired: SkillLevel.MASTER,
    techAgeRequired: TechAge.REDSTONE,
    buildTime: 4000,
    features: [
      'Dragon egg display', 'Elytra launch pad', 'Shulker storage',
      'End gateway hub', 'Beacon pyramid', 'XP storage'
    ],
    tips: ['Build platforms to outer islands', 'Keep ender pearls for emergencies']
  },
  
  // LEGENDARY - Mega Projects
  {
    id: 'perimeter',
    name: 'Perimeter',
    description: 'Fully cleared area for max efficiency farms.',
    category: 'REDSTONE',
    size: { width: 256, height: 256, depth: 256 },
    materials: [
      { item: 'tnt', count: 100000 },
      { item: 'sand', count: 10000 },
      { item: 'flying_machine', count: 10 }
    ],
    skillRequired: SkillLevel.LEGENDARY,
    techAgeRequired: TechAge.REDSTONE,
    buildTime: 50000,
    features: ['World-eater cleared', 'Bedrock removed', 'Spawn proofed'],
    tips: ['Use world eater design', 'Calculate TNT carefully', 'This is a massive project']
  },
  {
    id: 'gold_farm',
    name: 'Portal-Based Gold Farm',
    description: 'Massive nether portal gold farm.',
    category: 'REDSTONE',
    size: { width: 50, height: 30, depth: 50 },
    materials: [
      { item: 'obsidian', count: 5000 },
      { item: 'magma_block', count: 2000 },
      { item: 'hopper', count: 200 },
      { item: 'turtle_egg', count: 16 }
    ],
    skillRequired: SkillLevel.LEGENDARY,
    techAgeRequired: TechAge.REDSTONE,
    buildTime: 8000,
    features: ['Portal array', 'Piglin spawning', 'Turtle egg aggro', 'Magma kill'],
    tips: ['Build in overworld roof', 'Light up surrounding area completely']
  }
];

// ============================================================================
// EXPLORATION KNOWLEDGE
// ============================================================================

export interface DimensionKnowledge {
  id: string;
  name: string;
  howToAccess: string[];
  dangers: string[];
  resources: string[];
  structures: string[];
  mobs: string[];
  tips: string[];
  skillRequired: SkillLevel;
}

export const DIMENSION_KNOWLEDGE: DimensionKnowledge[] = [
  {
    id: 'overworld',
    name: 'Overworld',
    howToAccess: ['Starting dimension'],
    dangers: ['Mobs at night', 'Caves', 'Fall damage', 'Drowning', 'Lava pools'],
    resources: ['All basic ores', 'Wood', 'Food', 'Animals'],
    structures: [
      'Villages', 'Mineshafts', 'Strongholds', 'Dungeons', 'Temples',
      'Ocean monuments', 'Woodland mansions', 'Pillager outposts'
    ],
    mobs: ['Zombies', 'Skeletons', 'Creepers', 'Spiders', 'Endermen', 'Villagers'],
    tips: [
      'First night: dig into hillside or build basic shelter',
      'Always carry torches',
      'Never dig straight down',
      'Mark your base coordinates'
    ],
    skillRequired: SkillLevel.NOVICE
  },
  {
    id: 'nether',
    name: 'The Nether',
    howToAccess: ['Build 4x5 obsidian portal', 'Light with flint and steel'],
    dangers: [
      'Ghasts', 'Lava oceans', 'No water', 'Piglins',
      'Getting lost', 'Bed explosions', 'Wither skeletons'
    ],
    resources: [
      'Nether quartz', 'Glowstone', 'Ancient debris', 'Blaze rods',
      'Nether wart', 'Gold (from piglins)', 'Netherite'
    ],
    structures: ['Nether fortresses', 'Bastion remnants', 'Ruined portals'],
    mobs: [
      'Ghasts', 'Zombie piglins', 'Piglins', 'Hoglins',
      'Blazes', 'Wither skeletons', 'Magma cubes', 'Striders'
    ],
    tips: [
      'Bring fire resistance potions',
      'Gold armor protects from piglins',
      'Mark your portal!',
      '1 block in nether = 8 blocks in overworld',
      'Bring cobblestone (ghast-proof)'
    ],
    skillRequired: SkillLevel.JOURNEYMAN
  },
  {
    id: 'the_end',
    name: 'The End',
    howToAccess: [
      'Find stronghold with eyes of ender',
      'Activate end portal with 12 eyes',
      'Jump in portal'
    ],
    dangers: [
      'Ender dragon', 'Endermen everywhere', 'Void (instant death)',
      'Shulkers', 'No escape until dragon defeated (first time)'
    ],
    resources: [
      'Ender pearls', 'Dragon egg', 'Elytra', 'Shulker shells',
      'Chorus fruit', 'End stone', 'Dragon breath'
    ],
    structures: ['End city', 'End ship', 'Return gateway', 'Exit portal'],
    mobs: ['Ender dragon', 'Endermen', 'Shulkers'],
    tips: [
      'Bring carved pumpkin to avoid endermen aggro',
      'Bring beds for dragon fight',
      'Respawn dragon by placing 4 end crystals',
      'Elytra found in end ships only',
      'Slow falling potions for void safety'
    ],
    skillRequired: SkillLevel.MASTER
  }
];

// ============================================================================
// SPEEDRUN KNOWLEDGE
// ============================================================================

export interface SpeedrunStrategy {
  id: string;
  name: string;
  description: string;
  steps: string[];
  requirements: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  skillRequired: SkillLevel;
}

export const SPEEDRUN_STRATEGIES: SpeedrunStrategy[] = [
  {
    id: 'classic_any_percent',
    name: 'Classic Any% Route',
    description: 'Standard route for beating the game quickly.',
    steps: [
      'Get wood and basic tools',
      'Find village for beds/food/hay',
      'Mine for iron (at least 3 for bucket and pickaxe)',
      'Create nether portal (bucket method or lava pool)',
      'Find nether fortress for blaze rods (7 minimum)',
      'Trade with piglins for pearls (or kill endermen)',
      'Create eyes of ender',
      'Find stronghold',
      'Enter end and defeat dragon'
    ],
    requirements: ['Basic knowledge of all dimensions', 'Combat skills', 'Navigation'],
    riskLevel: 'MEDIUM',
    skillRequired: SkillLevel.EXPERT
  },
  {
    id: 'hypermodern',
    name: 'Hypermodern Route',
    description: 'Advanced route using latest strategies.',
    steps: [
      'Spawn manipulation for village',
      'Craft beds from village hay',
      'Bucket lava for portal',
      'Enter nether at optimal coordinates',
      'Bastion loot for pearls',
      'Fortress for blaze rods',
      'Calculated stronghold entry',
      'One-cycle dragon'
    ],
    requirements: ['Spawn knowledge', 'Math skills', 'Dragon one-cycling'],
    riskLevel: 'HIGH',
    skillRequired: SkillLevel.LEGENDARY
  }
];

// ============================================================================
// KNOWLEDGE MANAGER
// ============================================================================

export class MinecraftKnowledge {
  private unlockedKnowledge: Map<KnowledgeCategory, SkillLevel> = new Map();
  
  constructor() {
    // Initialize all categories at NOVICE
    for (const category of Object.values(KnowledgeCategory)) {
      this.unlockedKnowledge.set(category, SkillLevel.NOVICE);
    }
    logger.info('Minecraft Knowledge Base initialized');
  }

  /**
   * Get current skill level for a category
   */
  getSkillLevel(category: KnowledgeCategory): SkillLevel {
    return this.unlockedKnowledge.get(category) || SkillLevel.NOVICE;
  }

  /**
   * Upgrade skill level for a category
   */
  upgradeSkill(category: KnowledgeCategory): SkillLevel {
    const current = this.getSkillLevel(category);
    const levels = Object.values(SkillLevel);
    const currentIndex = levels.indexOf(current);
    
    if (currentIndex < levels.length - 1) {
      const newLevel = levels[currentIndex + 1] as SkillLevel;
      this.unlockedKnowledge.set(category, newLevel);
      logger.info(`${category} skill upgraded to ${newLevel}`);
      return newLevel;
    }
    
    return current;
  }

  /**
   * Get available recipes for current skill level
   */
  getAvailableRecipes(category?: KnowledgeCategory): CraftingRecipe[] {
    return CRAFTING_RECIPES.filter(recipe => {
      const skillLevel = category 
        ? this.getSkillLevel(category)
        : this.getHighestSkillLevel();
      
      if (category && recipe.category !== category) {
        return false;
      }
      
      return this.isLevelUnlocked(recipe.skillRequired, skillLevel);
    });
  }

  /**
   * Get available blueprints for current skill level
   */
  getAvailableBlueprints(techAge: TechAge): BuildingBlueprint[] {
    const buildingSkill = this.getSkillLevel(KnowledgeCategory.BUILDING);
    const techAges = Object.values(TechAge);
    const currentTechIndex = techAges.indexOf(techAge);
    
    return BUILDING_BLUEPRINTS.filter(blueprint => {
      const requiredTechIndex = techAges.indexOf(blueprint.techAgeRequired);
      return requiredTechIndex <= currentTechIndex && 
             this.isLevelUnlocked(blueprint.skillRequired, buildingSkill);
    });
  }

  /**
   * Check if a skill level is unlocked
   */
  private isLevelUnlocked(required: SkillLevel, current: SkillLevel): boolean {
    const levels = Object.values(SkillLevel);
    return levels.indexOf(current) >= levels.indexOf(required);
  }

  /**
   * Get highest skill level across all categories
   */
  private getHighestSkillLevel(): SkillLevel {
    let highest = SkillLevel.NOVICE;
    const levels = Object.values(SkillLevel);
    
    for (const level of this.unlockedKnowledge.values()) {
      if (levels.indexOf(level) > levels.indexOf(highest)) {
        highest = level;
      }
    }
    
    return highest;
  }

  /**
   * Get block information
   */
  getBlockInfo(blockId: string): BlockInfo | undefined {
    return BLOCK_KNOWLEDGE[blockId.toUpperCase()];
  }

  /**
   * Get dimension knowledge
   */
  getDimensionKnowledge(dimensionId: string): DimensionKnowledge | undefined {
    return DIMENSION_KNOWLEDGE.find(d => d.id === dimensionId);
  }

  /**
   * Get speedrun strategies available at skill level
   */
  getSpeedrunStrategies(): SpeedrunStrategy[] {
    const highestLevel = this.getHighestSkillLevel();
    return SPEEDRUN_STRATEGIES.filter(s => 
      this.isLevelUnlocked(s.skillRequired, highestLevel)
    );
  }

  /**
   * Get tips for current situation
   */
  getTips(category: KnowledgeCategory, count: number = 3): string[] {
    const tips: string[] = [];
    
    // Add dimension tips
    for (const dim of DIMENSION_KNOWLEDGE) {
      tips.push(...dim.tips);
    }
    
    // Add blueprint tips
    for (const bp of BUILDING_BLUEPRINTS) {
      tips.push(...bp.tips);
    }
    
    // Shuffle and return requested count
    return tips.sort(() => Math.random() - 0.5).slice(0, count);
  }

  /**
   * Serialize for persistence
   */
  serialize(): { category: KnowledgeCategory; level: SkillLevel }[] {
    const result: { category: KnowledgeCategory; level: SkillLevel }[] = [];
    for (const [category, level] of this.unlockedKnowledge.entries()) {
      result.push({ category, level });
    }
    return result;
  }

  /**
   * Load from persistence
   */
  load(data: { category: KnowledgeCategory; level: SkillLevel }[]): void {
    for (const entry of data) {
      this.unlockedKnowledge.set(entry.category, entry.level);
    }
  }
}

// Singleton
let knowledgeInstance: MinecraftKnowledge | null = null;

export function getMinecraftKnowledge(): MinecraftKnowledge {
  if (!knowledgeInstance) {
    knowledgeInstance = new MinecraftKnowledge();
  }
  return knowledgeInstance;
}

export function resetMinecraftKnowledge(): void {
  knowledgeInstance = null;
}

export default MinecraftKnowledge;
