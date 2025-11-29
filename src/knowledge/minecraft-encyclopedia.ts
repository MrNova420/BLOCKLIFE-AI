/**
 * BlockLife AI - Minecraft Encyclopedia
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * COMPREHENSIVE MINECRAFT KNOWLEDGE BASE
 * Real, researched knowledge from basic to expert/pro level.
 * This encyclopedia is integrated into the AI model to guide all bot decisions.
 * 
 * Sources: Minecraft Wiki, Official Documentation, Expert Player Strategies
 */

// ============================================================================
// BLOCK DATA - Complete block information
// ============================================================================

export interface BlockData {
  id: string;
  name: string;
  hardness: number;           // Time to break (seconds with bare hands)
  blastResistance: number;    // Explosion resistance
  bestTool: 'pickaxe' | 'axe' | 'shovel' | 'hoe' | 'shears' | 'sword' | 'none';
  toolTier: 'wood' | 'stone' | 'iron' | 'diamond' | 'netherite' | 'any' | 'none';
  drops: { item: string; count: [number, number]; chance: number }[];
  stackSize: number;
  flammable: boolean;
  transparent: boolean;
  lightLevel: number;
  renewable: boolean;
  biomes: string[];
  yLevelRange: [number, number];
  useCases: string[];
  craftingRecipe?: string[][];
  smeltingResult?: { item: string; xp: number };
}

export const BLOCKS: Record<string, BlockData> = {
  // OVERWORLD ORES - Critical for progression
  'coal_ore': {
    id: 'minecraft:coal_ore',
    name: 'Coal Ore',
    hardness: 3.0,
    blastResistance: 3.0,
    bestTool: 'pickaxe',
    toolTier: 'wood',
    drops: [{ item: 'coal', count: [1, 1], chance: 1.0 }],
    stackSize: 64,
    flammable: false,
    transparent: false,
    lightLevel: 0,
    renewable: false,
    biomes: ['all'],
    yLevelRange: [0, 320],  // Most common at Y 95-96
    useCases: ['fuel', 'torches', 'trading'],
    smeltingResult: { item: 'coal', xp: 0.1 }
  },
  'iron_ore': {
    id: 'minecraft:iron_ore',
    name: 'Iron Ore',
    hardness: 3.0,
    blastResistance: 3.0,
    bestTool: 'pickaxe',
    toolTier: 'stone',
    drops: [{ item: 'raw_iron', count: [1, 1], chance: 1.0 }],
    stackSize: 64,
    flammable: false,
    transparent: false,
    lightLevel: 0,
    renewable: false,
    biomes: ['all'],
    yLevelRange: [-64, 72],  // Peak at Y 15-16
    useCases: ['tools', 'armor', 'building', 'anvils', 'hoppers', 'rails'],
    smeltingResult: { item: 'iron_ingot', xp: 0.7 }
  },
  'gold_ore': {
    id: 'minecraft:gold_ore',
    name: 'Gold Ore',
    hardness: 3.0,
    blastResistance: 3.0,
    bestTool: 'pickaxe',
    toolTier: 'iron',
    drops: [{ item: 'raw_gold', count: [1, 1], chance: 1.0 }],
    stackSize: 64,
    flammable: false,
    transparent: false,
    lightLevel: 0,
    renewable: false,
    biomes: ['all', 'badlands'],  // More common in badlands
    yLevelRange: [-64, 32],  // Peak at Y -16
    useCases: ['powered_rails', 'clocks', 'golden_apples', 'piglin_trading'],
    smeltingResult: { item: 'gold_ingot', xp: 1.0 }
  },
  'diamond_ore': {
    id: 'minecraft:diamond_ore',
    name: 'Diamond Ore',
    hardness: 3.0,
    blastResistance: 3.0,
    bestTool: 'pickaxe',
    toolTier: 'iron',
    drops: [{ item: 'diamond', count: [1, 1], chance: 1.0 }],
    stackSize: 64,
    flammable: false,
    transparent: false,
    lightLevel: 0,
    renewable: false,
    biomes: ['all'],
    yLevelRange: [-64, 16],  // Peak at Y -59 (near bedrock)
    useCases: ['best_tools', 'best_armor', 'enchanting_table', 'jukebox'],
    smeltingResult: { item: 'diamond', xp: 1.0 }
  },
  'redstone_ore': {
    id: 'minecraft:redstone_ore',
    name: 'Redstone Ore',
    hardness: 3.0,
    blastResistance: 3.0,
    bestTool: 'pickaxe',
    toolTier: 'iron',
    drops: [{ item: 'redstone', count: [4, 5], chance: 1.0 }],
    stackSize: 64,
    flammable: false,
    transparent: false,
    lightLevel: 9,  // Glows when touched
    renewable: false,
    biomes: ['all'],
    yLevelRange: [-64, 16],
    useCases: ['redstone_circuits', 'potions', 'compass', 'clock'],
    smeltingResult: { item: 'redstone', xp: 0.3 }
  },
  'lapis_ore': {
    id: 'minecraft:lapis_lazuli_ore',
    name: 'Lapis Lazuli Ore',
    hardness: 3.0,
    blastResistance: 3.0,
    bestTool: 'pickaxe',
    toolTier: 'stone',
    drops: [{ item: 'lapis_lazuli', count: [4, 9], chance: 1.0 }],
    stackSize: 64,
    flammable: false,
    transparent: false,
    lightLevel: 0,
    renewable: false,
    biomes: ['all'],
    yLevelRange: [-64, 64],  // Peak at Y 0
    useCases: ['enchanting', 'blue_dye', 'decoration'],
    smeltingResult: { item: 'lapis_lazuli', xp: 0.2 }
  },
  'emerald_ore': {
    id: 'minecraft:emerald_ore',
    name: 'Emerald Ore',
    hardness: 3.0,
    blastResistance: 3.0,
    bestTool: 'pickaxe',
    toolTier: 'iron',
    drops: [{ item: 'emerald', count: [1, 1], chance: 1.0 }],
    stackSize: 64,
    flammable: false,
    transparent: false,
    lightLevel: 0,
    renewable: false,
    biomes: ['mountains', 'windswept_hills'],  // ONLY in mountains
    yLevelRange: [-16, 320],  // Peak at Y 236
    useCases: ['villager_trading', 'decoration', 'beacons'],
    smeltingResult: { item: 'emerald', xp: 1.0 }
  },
  'copper_ore': {
    id: 'minecraft:copper_ore',
    name: 'Copper Ore',
    hardness: 3.0,
    blastResistance: 3.0,
    bestTool: 'pickaxe',
    toolTier: 'stone',
    drops: [{ item: 'raw_copper', count: [2, 5], chance: 1.0 }],
    stackSize: 64,
    flammable: false,
    transparent: false,
    lightLevel: 0,
    renewable: false,
    biomes: ['all', 'dripstone_caves'],  // Extra in dripstone caves
    yLevelRange: [-16, 112],  // Peak at Y 48
    useCases: ['lightning_rod', 'spyglass', 'building_decoration'],
    smeltingResult: { item: 'copper_ingot', xp: 0.7 }
  },

  // WOOD TYPES - Essential building material
  'oak_log': {
    id: 'minecraft:oak_log',
    name: 'Oak Log',
    hardness: 2.0,
    blastResistance: 2.0,
    bestTool: 'axe',
    toolTier: 'any',
    drops: [{ item: 'oak_log', count: [1, 1], chance: 1.0 }],
    stackSize: 64,
    flammable: true,
    transparent: false,
    lightLevel: 0,
    renewable: true,
    biomes: ['forest', 'plains', 'swamp', 'river'],
    yLevelRange: [62, 100],
    useCases: ['planks', 'fuel', 'charcoal', 'building'],
    smeltingResult: { item: 'charcoal', xp: 0.15 }
  },
  'spruce_log': {
    id: 'minecraft:spruce_log',
    name: 'Spruce Log',
    hardness: 2.0,
    blastResistance: 2.0,
    bestTool: 'axe',
    toolTier: 'any',
    drops: [{ item: 'spruce_log', count: [1, 1], chance: 1.0 }],
    stackSize: 64,
    flammable: true,
    transparent: false,
    lightLevel: 0,
    renewable: true,
    biomes: ['taiga', 'snowy_taiga', 'old_growth_taiga'],
    yLevelRange: [62, 150],
    useCases: ['planks', 'fuel', 'charcoal', 'building'],
    smeltingResult: { item: 'charcoal', xp: 0.15 }
  },
  'birch_log': {
    id: 'minecraft:birch_log',
    name: 'Birch Log',
    hardness: 2.0,
    blastResistance: 2.0,
    bestTool: 'axe',
    toolTier: 'any',
    drops: [{ item: 'birch_log', count: [1, 1], chance: 1.0 }],
    stackSize: 64,
    flammable: true,
    transparent: false,
    lightLevel: 0,
    renewable: true,
    biomes: ['birch_forest', 'old_growth_birch_forest'],
    yLevelRange: [62, 100],
    useCases: ['planks', 'fuel', 'charcoal', 'building'],
    smeltingResult: { item: 'charcoal', xp: 0.15 }
  },

  // STONE VARIANTS
  'stone': {
    id: 'minecraft:stone',
    name: 'Stone',
    hardness: 1.5,
    blastResistance: 6.0,
    bestTool: 'pickaxe',
    toolTier: 'wood',
    drops: [{ item: 'cobblestone', count: [1, 1], chance: 1.0 }],
    stackSize: 64,
    flammable: false,
    transparent: false,
    lightLevel: 0,
    renewable: true,  // Via lava + water
    biomes: ['all'],
    yLevelRange: [-64, 320],
    useCases: ['building', 'tools', 'furnace', 'stone_bricks']
  },
  'cobblestone': {
    id: 'minecraft:cobblestone',
    name: 'Cobblestone',
    hardness: 2.0,
    blastResistance: 6.0,
    bestTool: 'pickaxe',
    toolTier: 'wood',
    drops: [{ item: 'cobblestone', count: [1, 1], chance: 1.0 }],
    stackSize: 64,
    flammable: false,
    transparent: false,
    lightLevel: 0,
    renewable: true,
    biomes: ['all'],
    yLevelRange: [-64, 320],
    useCases: ['building', 'furnace', 'tools', 'walls'],
    smeltingResult: { item: 'stone', xp: 0.1 }
  },
  'deepslate': {
    id: 'minecraft:deepslate',
    name: 'Deepslate',
    hardness: 3.0,
    blastResistance: 6.0,
    bestTool: 'pickaxe',
    toolTier: 'wood',
    drops: [{ item: 'cobbled_deepslate', count: [1, 1], chance: 1.0 }],
    stackSize: 64,
    flammable: false,
    transparent: false,
    lightLevel: 0,
    renewable: false,
    biomes: ['all'],
    yLevelRange: [-64, 0],  // Deep underground only
    useCases: ['building', 'decoration', 'deepslate_bricks']
  },

  // FARMING BLOCKS
  'farmland': {
    id: 'minecraft:farmland',
    name: 'Farmland',
    hardness: 0.6,
    blastResistance: 0.6,
    bestTool: 'shovel',
    toolTier: 'any',
    drops: [{ item: 'dirt', count: [1, 1], chance: 1.0 }],
    stackSize: 64,
    flammable: false,
    transparent: false,
    lightLevel: 0,
    renewable: true,
    biomes: ['all'],
    yLevelRange: [0, 320],
    useCases: ['farming']
  },
  'wheat': {
    id: 'minecraft:wheat',
    name: 'Wheat Crop',
    hardness: 0.0,
    blastResistance: 0.0,
    bestTool: 'none',
    toolTier: 'none',
    drops: [
      { item: 'wheat', count: [1, 1], chance: 1.0 },
      { item: 'wheat_seeds', count: [0, 3], chance: 0.57 }
    ],
    stackSize: 64,
    flammable: false,
    transparent: true,
    lightLevel: 0,
    renewable: true,
    biomes: ['all'],
    yLevelRange: [0, 320],
    useCases: ['bread', 'animal_breeding', 'hay_bales']
  }
};

// ============================================================================
// CRAFTING RECIPES - Essential recipes for progression
// ============================================================================

export interface CraftingRecipe {
  id: string;
  name: string;
  type: 'shaped' | 'shapeless' | 'smelting' | 'blasting' | 'smoking' | 'stonecutting';
  ingredients: { item: string; count: number; slot?: number }[];
  result: { item: string; count: number };
  category: string;
  difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert';
  prerequisiteItems: string[];
  unlockAge: 'stone' | 'iron' | 'diamond' | 'netherite' | 'redstone';
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // BASIC TOOLS - First priority
  {
    id: 'crafting_table',
    name: 'Crafting Table',
    type: 'shaped',
    ingredients: [{ item: 'planks', count: 4, slot: 0 }],
    result: { item: 'crafting_table', count: 1 },
    category: 'utility',
    difficulty: 'basic',
    prerequisiteItems: ['planks'],
    unlockAge: 'stone'
  },
  {
    id: 'wooden_pickaxe',
    name: 'Wooden Pickaxe',
    type: 'shaped',
    ingredients: [
      { item: 'planks', count: 3, slot: 0 },  // Top row
      { item: 'stick', count: 2, slot: 4 }    // Middle column
    ],
    result: { item: 'wooden_pickaxe', count: 1 },
    category: 'tools',
    difficulty: 'basic',
    prerequisiteItems: ['planks', 'stick', 'crafting_table'],
    unlockAge: 'stone'
  },
  {
    id: 'stone_pickaxe',
    name: 'Stone Pickaxe',
    type: 'shaped',
    ingredients: [
      { item: 'cobblestone', count: 3, slot: 0 },
      { item: 'stick', count: 2, slot: 4 }
    ],
    result: { item: 'stone_pickaxe', count: 1 },
    category: 'tools',
    difficulty: 'basic',
    prerequisiteItems: ['cobblestone', 'stick', 'crafting_table'],
    unlockAge: 'stone'
  },
  {
    id: 'iron_pickaxe',
    name: 'Iron Pickaxe',
    type: 'shaped',
    ingredients: [
      { item: 'iron_ingot', count: 3, slot: 0 },
      { item: 'stick', count: 2, slot: 4 }
    ],
    result: { item: 'iron_pickaxe', count: 1 },
    category: 'tools',
    difficulty: 'intermediate',
    prerequisiteItems: ['iron_ingot', 'stick', 'crafting_table'],
    unlockAge: 'iron'
  },
  {
    id: 'diamond_pickaxe',
    name: 'Diamond Pickaxe',
    type: 'shaped',
    ingredients: [
      { item: 'diamond', count: 3, slot: 0 },
      { item: 'stick', count: 2, slot: 4 }
    ],
    result: { item: 'diamond_pickaxe', count: 1 },
    category: 'tools',
    difficulty: 'advanced',
    prerequisiteItems: ['diamond', 'stick', 'crafting_table'],
    unlockAge: 'diamond'
  },
  {
    id: 'furnace',
    name: 'Furnace',
    type: 'shaped',
    ingredients: [{ item: 'cobblestone', count: 8, slot: 0 }],  // Ring pattern
    result: { item: 'furnace', count: 1 },
    category: 'utility',
    difficulty: 'basic',
    prerequisiteItems: ['cobblestone', 'crafting_table'],
    unlockAge: 'stone'
  },
  {
    id: 'torch',
    name: 'Torch',
    type: 'shaped',
    ingredients: [
      { item: 'coal', count: 1, slot: 0 },
      { item: 'stick', count: 1, slot: 3 }
    ],
    result: { item: 'torch', count: 4 },
    category: 'utility',
    difficulty: 'basic',
    prerequisiteItems: ['coal', 'stick'],
    unlockAge: 'stone'
  },
  {
    id: 'chest',
    name: 'Chest',
    type: 'shaped',
    ingredients: [{ item: 'planks', count: 8, slot: 0 }],  // Ring pattern
    result: { item: 'chest', count: 1 },
    category: 'storage',
    difficulty: 'basic',
    prerequisiteItems: ['planks', 'crafting_table'],
    unlockAge: 'stone'
  },
  {
    id: 'bed',
    name: 'Bed',
    type: 'shaped',
    ingredients: [
      { item: 'wool', count: 3, slot: 0 },
      { item: 'planks', count: 3, slot: 3 }
    ],
    result: { item: 'bed', count: 1 },
    category: 'utility',
    difficulty: 'basic',
    prerequisiteItems: ['wool', 'planks', 'crafting_table'],
    unlockAge: 'stone'
  },

  // ARMOR
  {
    id: 'iron_helmet',
    name: 'Iron Helmet',
    type: 'shaped',
    ingredients: [{ item: 'iron_ingot', count: 5, slot: 0 }],
    result: { item: 'iron_helmet', count: 1 },
    category: 'armor',
    difficulty: 'intermediate',
    prerequisiteItems: ['iron_ingot', 'crafting_table'],
    unlockAge: 'iron'
  },
  {
    id: 'iron_chestplate',
    name: 'Iron Chestplate',
    type: 'shaped',
    ingredients: [{ item: 'iron_ingot', count: 8, slot: 0 }],
    result: { item: 'iron_chestplate', count: 1 },
    category: 'armor',
    difficulty: 'intermediate',
    prerequisiteItems: ['iron_ingot', 'crafting_table'],
    unlockAge: 'iron'
  },
  {
    id: 'iron_leggings',
    name: 'Iron Leggings',
    type: 'shaped',
    ingredients: [{ item: 'iron_ingot', count: 7, slot: 0 }],
    result: { item: 'iron_leggings', count: 1 },
    category: 'armor',
    difficulty: 'intermediate',
    prerequisiteItems: ['iron_ingot', 'crafting_table'],
    unlockAge: 'iron'
  },
  {
    id: 'iron_boots',
    name: 'Iron Boots',
    type: 'shaped',
    ingredients: [{ item: 'iron_ingot', count: 4, slot: 0 }],
    result: { item: 'iron_boots', count: 1 },
    category: 'armor',
    difficulty: 'intermediate',
    prerequisiteItems: ['iron_ingot', 'crafting_table'],
    unlockAge: 'iron'
  },
  {
    id: 'shield',
    name: 'Shield',
    type: 'shaped',
    ingredients: [
      { item: 'planks', count: 6, slot: 0 },
      { item: 'iron_ingot', count: 1, slot: 1 }
    ],
    result: { item: 'shield', count: 1 },
    category: 'armor',
    difficulty: 'intermediate',
    prerequisiteItems: ['planks', 'iron_ingot', 'crafting_table'],
    unlockAge: 'iron'
  },

  // WEAPONS
  {
    id: 'iron_sword',
    name: 'Iron Sword',
    type: 'shaped',
    ingredients: [
      { item: 'iron_ingot', count: 2, slot: 0 },
      { item: 'stick', count: 1, slot: 4 }
    ],
    result: { item: 'iron_sword', count: 1 },
    category: 'weapons',
    difficulty: 'intermediate',
    prerequisiteItems: ['iron_ingot', 'stick', 'crafting_table'],
    unlockAge: 'iron'
  },
  {
    id: 'bow',
    name: 'Bow',
    type: 'shaped',
    ingredients: [
      { item: 'stick', count: 3, slot: 0 },
      { item: 'string', count: 3, slot: 1 }
    ],
    result: { item: 'bow', count: 1 },
    category: 'weapons',
    difficulty: 'intermediate',
    prerequisiteItems: ['stick', 'string', 'crafting_table'],
    unlockAge: 'stone'
  },
  {
    id: 'arrow',
    name: 'Arrow',
    type: 'shaped',
    ingredients: [
      { item: 'flint', count: 1, slot: 0 },
      { item: 'stick', count: 1, slot: 3 },
      { item: 'feather', count: 1, slot: 6 }
    ],
    result: { item: 'arrow', count: 4 },
    category: 'weapons',
    difficulty: 'basic',
    prerequisiteItems: ['flint', 'stick', 'feather', 'crafting_table'],
    unlockAge: 'stone'
  },

  // REDSTONE - Advanced
  {
    id: 'piston',
    name: 'Piston',
    type: 'shaped',
    ingredients: [
      { item: 'planks', count: 3, slot: 0 },
      { item: 'cobblestone', count: 4, slot: 3 },
      { item: 'iron_ingot', count: 1, slot: 4 },
      { item: 'redstone', count: 1, slot: 7 }
    ],
    result: { item: 'piston', count: 1 },
    category: 'redstone',
    difficulty: 'advanced',
    prerequisiteItems: ['planks', 'cobblestone', 'iron_ingot', 'redstone', 'crafting_table'],
    unlockAge: 'redstone'
  },
  {
    id: 'hopper',
    name: 'Hopper',
    type: 'shaped',
    ingredients: [
      { item: 'iron_ingot', count: 5, slot: 0 },
      { item: 'chest', count: 1, slot: 4 }
    ],
    result: { item: 'hopper', count: 1 },
    category: 'redstone',
    difficulty: 'advanced',
    prerequisiteItems: ['iron_ingot', 'chest', 'crafting_table'],
    unlockAge: 'redstone'
  },
  {
    id: 'dispenser',
    name: 'Dispenser',
    type: 'shaped',
    ingredients: [
      { item: 'cobblestone', count: 7, slot: 0 },
      { item: 'bow', count: 1, slot: 4 },
      { item: 'redstone', count: 1, slot: 7 }
    ],
    result: { item: 'dispenser', count: 1 },
    category: 'redstone',
    difficulty: 'advanced',
    prerequisiteItems: ['cobblestone', 'bow', 'redstone', 'crafting_table'],
    unlockAge: 'redstone'
  },
  {
    id: 'observer',
    name: 'Observer',
    type: 'shaped',
    ingredients: [
      { item: 'cobblestone', count: 6, slot: 0 },
      { item: 'redstone', count: 2, slot: 3 },
      { item: 'quartz', count: 1, slot: 4 }
    ],
    result: { item: 'observer', count: 1 },
    category: 'redstone',
    difficulty: 'expert',
    prerequisiteItems: ['cobblestone', 'redstone', 'quartz', 'crafting_table'],
    unlockAge: 'redstone'
  },

  // ENCHANTING & BREWING
  {
    id: 'enchanting_table',
    name: 'Enchanting Table',
    type: 'shaped',
    ingredients: [
      { item: 'book', count: 1, slot: 1 },
      { item: 'diamond', count: 2, slot: 3 },
      { item: 'obsidian', count: 4, slot: 6 }
    ],
    result: { item: 'enchanting_table', count: 1 },
    category: 'magic',
    difficulty: 'advanced',
    prerequisiteItems: ['book', 'diamond', 'obsidian', 'crafting_table'],
    unlockAge: 'diamond'
  },
  {
    id: 'brewing_stand',
    name: 'Brewing Stand',
    type: 'shaped',
    ingredients: [
      { item: 'blaze_rod', count: 1, slot: 1 },
      { item: 'cobblestone', count: 3, slot: 6 }
    ],
    result: { item: 'brewing_stand', count: 1 },
    category: 'magic',
    difficulty: 'advanced',
    prerequisiteItems: ['blaze_rod', 'cobblestone', 'crafting_table'],
    unlockAge: 'diamond'
  },
  {
    id: 'anvil',
    name: 'Anvil',
    type: 'shaped',
    ingredients: [
      { item: 'iron_block', count: 3, slot: 0 },
      { item: 'iron_ingot', count: 4, slot: 3 }
    ],
    result: { item: 'anvil', count: 1 },
    category: 'utility',
    difficulty: 'intermediate',
    prerequisiteItems: ['iron_block', 'iron_ingot', 'crafting_table'],
    unlockAge: 'iron'
  }
];

// ============================================================================
// MOB DATA - Enemy and friendly mob information
// ============================================================================

export interface MobData {
  id: string;
  name: string;
  type: 'hostile' | 'neutral' | 'passive' | 'boss';
  health: number;
  damage: number;
  armor: number;
  drops: { item: string; count: [number, number]; chance: number }[];
  spawnConditions: {
    lightLevel: [number, number];
    dimensions: string[];
    biomes: string[];
    surface: boolean;
    minGroupSize: number;
    maxGroupSize: number;
  };
  behavior: string[];
  weaknesses: string[];
  strengths: string[];
  combatTips: string[];
  dangerRating: 1 | 2 | 3 | 4 | 5;  // 1=easy, 5=deadly
}

export const MOBS: Record<string, MobData> = {
  // HOSTILE MOBS
  'zombie': {
    id: 'minecraft:zombie',
    name: 'Zombie',
    type: 'hostile',
    health: 20,
    damage: 3,  // Easy: 2, Normal: 3, Hard: 4
    armor: 2,
    drops: [
      { item: 'rotten_flesh', count: [0, 2], chance: 1.0 },
      { item: 'iron_ingot', count: [1, 1], chance: 0.025 },
      { item: 'carrot', count: [1, 1], chance: 0.025 },
      { item: 'potato', count: [1, 1], chance: 0.025 }
    ],
    spawnConditions: {
      lightLevel: [0, 7],
      dimensions: ['overworld'],
      biomes: ['all'],
      surface: true,
      minGroupSize: 1,
      maxGroupSize: 4
    },
    behavior: ['chases_players', 'attacks_villagers', 'burns_in_sunlight', 'can_break_doors_hard'],
    weaknesses: ['sunlight', 'fire', 'smite_enchantment'],
    strengths: ['numbers', 'can_spawn_reinforcements'],
    combatTips: [
      'Wait for daylight if possible',
      'Use doors to create chokepoints',
      'Hit and back up to avoid damage',
      'Use shield to block attacks',
      'Smite enchantment deals extra damage'
    ],
    dangerRating: 2
  },
  'skeleton': {
    id: 'minecraft:skeleton',
    name: 'Skeleton',
    type: 'hostile',
    health: 20,
    damage: 4,  // Arrow damage varies with difficulty
    armor: 0,
    drops: [
      { item: 'bone', count: [0, 2], chance: 1.0 },
      { item: 'arrow', count: [0, 2], chance: 1.0 },
      { item: 'bow', count: [1, 1], chance: 0.085 }
    ],
    spawnConditions: {
      lightLevel: [0, 7],
      dimensions: ['overworld', 'nether'],
      biomes: ['all'],
      surface: true,
      minGroupSize: 1,
      maxGroupSize: 4
    },
    behavior: ['ranged_attack', 'burns_in_sunlight', 'strafes_while_shooting', 'seeks_shade'],
    weaknesses: ['sunlight', 'shields', 'smite_enchantment', 'close_combat'],
    strengths: ['ranged_attacks', 'accurate_at_distance'],
    combatTips: [
      'Use shield to block arrows',
      'Close distance quickly',
      'Use obstacles for cover',
      'Strike repeatedly once close - they struggle in melee',
      'Wait for daylight when possible'
    ],
    dangerRating: 3
  },
  'creeper': {
    id: 'minecraft:creeper',
    name: 'Creeper',
    type: 'hostile',
    health: 20,
    damage: 65,  // Explosion damage at point blank
    armor: 0,
    drops: [
      { item: 'gunpowder', count: [0, 2], chance: 1.0 },
      { item: 'music_disc', count: [1, 1], chance: 1.0 }  // Only if killed by skeleton
    ],
    spawnConditions: {
      lightLevel: [0, 7],
      dimensions: ['overworld'],
      biomes: ['all'],
      surface: true,
      minGroupSize: 1,
      maxGroupSize: 4
    },
    behavior: ['silent_approach', 'explodes_near_player', 'no_burn_in_sunlight'],
    weaknesses: ['ranged_attacks', 'knockback', 'cats'],
    strengths: ['silent', 'devastating_explosion', 'survives_daylight'],
    combatTips: [
      'LISTEN - they hiss before exploding',
      'Hit and retreat to reset fuse',
      'Use bow to kill from distance',
      'Keep cats around - creepers flee from them',
      'Never fight in enclosed spaces',
      'Sprint-hit to knock back and reset fuse'
    ],
    dangerRating: 4
  },
  'spider': {
    id: 'minecraft:spider',
    name: 'Spider',
    type: 'neutral',  // Neutral in daylight
    health: 16,
    damage: 3,
    armor: 0,
    drops: [
      { item: 'string', count: [0, 2], chance: 1.0 },
      { item: 'spider_eye', count: [0, 1], chance: 0.33 }
    ],
    spawnConditions: {
      lightLevel: [0, 7],
      dimensions: ['overworld'],
      biomes: ['all'],
      surface: true,
      minGroupSize: 1,
      maxGroupSize: 4
    },
    behavior: ['climbs_walls', 'jumps_at_target', 'neutral_in_daylight'],
    weaknesses: ['bane_of_arthropods', 'fall_damage'],
    strengths: ['wall_climbing', 'fits_in_1_block_gaps', 'can_see_invisible'],
    combatTips: [
      'Watch for them on walls and ceilings',
      'They become passive in daylight',
      'Keep your back to solid walls',
      'Can fit through 1-block gaps - seal bases properly'
    ],
    dangerRating: 2
  },
  'enderman': {
    id: 'minecraft:enderman',
    name: 'Enderman',
    type: 'neutral',
    health: 40,
    damage: 7,
    armor: 0,
    drops: [
      { item: 'ender_pearl', count: [0, 1], chance: 1.0 }
    ],
    spawnConditions: {
      lightLevel: [0, 7],
      dimensions: ['overworld', 'nether', 'end'],
      biomes: ['all'],
      surface: true,
      minGroupSize: 1,
      maxGroupSize: 4
    },
    behavior: ['teleports', 'hostile_if_looked_at', 'picks_up_blocks', 'water_damage'],
    weaknesses: ['water', 'boats', 'low_ceilings'],
    strengths: ['teleportation', 'high_damage', 'ignores_projectiles'],
    combatTips: [
      'DO NOT look at their face unless ready to fight',
      'Stand under 2-block ceiling - they cannot fit',
      'Use water for defense - damages them',
      'Trap in boat to prevent teleporting',
      'Hit legs to avoid eye contact'
    ],
    dangerRating: 4
  },
  'witch': {
    id: 'minecraft:witch',
    name: 'Witch',
    type: 'hostile',
    health: 26,
    damage: 6,  // Poison/harming potion
    armor: 0,
    drops: [
      { item: 'glass_bottle', count: [0, 6], chance: 0.125 },
      { item: 'glowstone_dust', count: [0, 6], chance: 0.125 },
      { item: 'gunpowder', count: [0, 6], chance: 0.125 },
      { item: 'redstone', count: [0, 6], chance: 0.125 },
      { item: 'spider_eye', count: [0, 6], chance: 0.125 },
      { item: 'sugar', count: [0, 6], chance: 0.125 },
      { item: 'stick', count: [0, 6], chance: 0.125 }
    ],
    spawnConditions: {
      lightLevel: [0, 7],
      dimensions: ['overworld'],
      biomes: ['swamp'],
      surface: true,
      minGroupSize: 1,
      maxGroupSize: 1
    },
    behavior: ['throws_potions', 'drinks_healing', 'drinks_fire_resistance'],
    weaknesses: ['instant_damage', 'continuous_attacks'],
    strengths: ['ranged_magic', 'self_healing', 'various_debuffs'],
    combatTips: [
      'Close distance fast - potions have wind-up',
      'Continuous attacks prevent drinking',
      'Use bow at medium range',
      'Avoid grouped combat - splash potions'
    ],
    dangerRating: 4
  },

  // NETHER MOBS
  'blaze': {
    id: 'minecraft:blaze',
    name: 'Blaze',
    type: 'hostile',
    health: 20,
    damage: 6,  // Fireball
    armor: 0,
    drops: [
      { item: 'blaze_rod', count: [0, 1], chance: 1.0 }
    ],
    spawnConditions: {
      lightLevel: [0, 15],
      dimensions: ['nether'],
      biomes: ['nether_fortress'],
      surface: true,
      minGroupSize: 1,
      maxGroupSize: 4
    },
    behavior: ['flies', 'shoots_fireballs', 'fire_aura'],
    weaknesses: ['snowballs', 'water'],
    strengths: ['flight', 'ranged_fire', 'spawner_based'],
    combatTips: [
      'Snowballs deal 3 damage each!',
      'Use shield to block fireballs',
      'Fire resistance potion essential',
      'Build cover in fortress corridors',
      'Bow works well if you have arrows'
    ],
    dangerRating: 4
  },
  'ghast': {
    id: 'minecraft:ghast',
    name: 'Ghast',
    type: 'hostile',
    health: 10,
    damage: 17,  // Fireball explosion
    armor: 0,
    drops: [
      { item: 'gunpowder', count: [0, 2], chance: 1.0 },
      { item: 'ghast_tear', count: [0, 1], chance: 1.0 }
    ],
    spawnConditions: {
      lightLevel: [0, 15],
      dimensions: ['nether'],
      biomes: ['nether_wastes', 'soul_sand_valley', 'basalt_deltas'],
      surface: true,
      minGroupSize: 1,
      maxGroupSize: 1
    },
    behavior: ['flies', 'long_range_fireballs', 'cries'],
    weaknesses: ['reflected_fireballs', 'low_health', 'arrows'],
    strengths: ['flight', 'explosive_projectiles', 'long_range'],
    combatTips: [
      'Hit fireballs back with ANY attack to reflect',
      'Reflected fireballs one-shot ghasts',
      'Bow with good aim is very effective',
      'Build roof over paths for protection'
    ],
    dangerRating: 3
  },

  // BOSSES
  'wither': {
    id: 'minecraft:wither',
    name: 'Wither',
    type: 'boss',
    health: 300,  // 600 on Bedrock
    damage: 12,
    armor: 4,
    drops: [
      { item: 'nether_star', count: [1, 1], chance: 1.0 }
    ],
    spawnConditions: {
      lightLevel: [0, 15],
      dimensions: ['overworld', 'nether', 'end'],
      biomes: ['spawned_by_player'],
      surface: true,
      minGroupSize: 1,
      maxGroupSize: 1
    },
    behavior: ['flies', 'shoots_skulls', 'wither_effect', 'breaks_blocks', 'heals_undead'],
    weaknesses: ['smite_enchantment', 'bedrock_trap'],
    strengths: ['flight', 'block_destruction', 'wither_effect', 'high_health'],
    combatTips: [
      'Prepare thoroughly before spawning',
      'Use Smite V sword for melee phase',
      'Strength II + Regeneration potions',
      'Golden apples for emergencies',
      'Fight underground to limit flight',
      'Bedrock ceiling trap in Nether is safest',
      'Full diamond/netherite armor required'
    ],
    dangerRating: 5
  },
  'ender_dragon': {
    id: 'minecraft:ender_dragon',
    name: 'Ender Dragon',
    type: 'boss',
    health: 200,
    damage: 15,
    armor: 0,
    drops: [
      { item: 'dragon_egg', count: [1, 1], chance: 1.0 },
      { item: 'experience', count: [12000, 12000], chance: 1.0 }
    ],
    spawnConditions: {
      lightLevel: [0, 15],
      dimensions: ['end'],
      biomes: ['the_end'],
      surface: true,
      minGroupSize: 1,
      maxGroupSize: 1
    },
    behavior: ['flies', 'perches', 'charges', 'dragon_breath', 'heals_from_crystals'],
    weaknesses: ['beds_explode_in_end', 'arrows_when_perched'],
    strengths: ['flight', 'knockback', 'acid_breath', 'crystal_healing'],
    combatTips: [
      'DESTROY ALL END CRYSTALS FIRST',
      'Bring slow falling potions',
      'Bow + many arrows (Infinity recommended)',
      'Water bucket for enderman aggro reset',
      'Hit while perched for maximum damage',
      'Beds explode - can be used for damage',
      'Pumpkin head prevents enderman aggro'
    ],
    dangerRating: 5
  },

  // PASSIVE MOBS - For farming
  'cow': {
    id: 'minecraft:cow',
    name: 'Cow',
    type: 'passive',
    health: 10,
    damage: 0,
    armor: 0,
    drops: [
      { item: 'leather', count: [0, 2], chance: 1.0 },
      { item: 'beef', count: [1, 3], chance: 1.0 }
    ],
    spawnConditions: {
      lightLevel: [9, 15],
      dimensions: ['overworld'],
      biomes: ['plains', 'forest', 'meadow'],
      surface: true,
      minGroupSize: 2,
      maxGroupSize: 3
    },
    behavior: ['wanders', 'follows_wheat', 'milk_with_bucket'],
    weaknesses: [],
    strengths: [],
    combatTips: ['Breed with wheat for sustainable food source'],
    dangerRating: 1
  },
  'sheep': {
    id: 'minecraft:sheep',
    name: 'Sheep',
    type: 'passive',
    health: 8,
    damage: 0,
    armor: 0,
    drops: [
      { item: 'wool', count: [1, 1], chance: 1.0 },
      { item: 'mutton', count: [1, 2], chance: 1.0 }
    ],
    spawnConditions: {
      lightLevel: [9, 15],
      dimensions: ['overworld'],
      biomes: ['plains', 'forest', 'meadow'],
      surface: true,
      minGroupSize: 2,
      maxGroupSize: 3
    },
    behavior: ['wanders', 'follows_wheat', 'regrows_wool_after_eating_grass'],
    weaknesses: [],
    strengths: [],
    combatTips: ['Shear instead of kill for renewable wool', 'Breed with wheat'],
    dangerRating: 1
  },
  'chicken': {
    id: 'minecraft:chicken',
    name: 'Chicken',
    type: 'passive',
    health: 4,
    damage: 0,
    armor: 0,
    drops: [
      { item: 'feather', count: [0, 2], chance: 1.0 },
      { item: 'chicken', count: [1, 1], chance: 1.0 }
    ],
    spawnConditions: {
      lightLevel: [9, 15],
      dimensions: ['overworld'],
      biomes: ['plains', 'forest', 'jungle'],
      surface: true,
      minGroupSize: 2,
      maxGroupSize: 4
    },
    behavior: ['wanders', 'follows_seeds', 'lays_eggs', 'slow_falling'],
    weaknesses: [],
    strengths: [],
    combatTips: ['Breed with seeds', 'Eggs can spawn more chickens'],
    dangerRating: 1
  },
  'pig': {
    id: 'minecraft:pig',
    name: 'Pig',
    type: 'passive',
    health: 10,
    damage: 0,
    armor: 0,
    drops: [
      { item: 'porkchop', count: [1, 3], chance: 1.0 }
    ],
    spawnConditions: {
      lightLevel: [9, 15],
      dimensions: ['overworld'],
      biomes: ['plains', 'forest', 'meadow'],
      surface: true,
      minGroupSize: 1,
      maxGroupSize: 3
    },
    behavior: ['wanders', 'follows_carrots', 'rideable_with_saddle'],
    weaknesses: [],
    strengths: [],
    combatTips: ['Breed with carrots, potatoes, or beetroot'],
    dangerRating: 1
  },
  'villager': {
    id: 'minecraft:villager',
    name: 'Villager',
    type: 'passive',
    health: 20,
    damage: 0,
    armor: 0,
    drops: [],
    spawnConditions: {
      lightLevel: [0, 15],
      dimensions: ['overworld'],
      biomes: ['village'],
      surface: true,
      minGroupSize: 1,
      maxGroupSize: 1
    },
    behavior: ['trades', 'breeds_with_food', 'flees_zombies', 'works_at_job_site'],
    weaknesses: ['zombies', 'raids'],
    strengths: ['trading', 'mending_books', 'enchanted_gear'],
    combatTips: [
      'PROTECT villagers - they are invaluable',
      'Cure zombie villagers for discount',
      'Librarians can sell Mending',
      'Armorers/Weaponsmiths sell diamond gear'
    ],
    dangerRating: 1
  }
};

// ============================================================================
// BIOME DATA - Biome characteristics and resources
// ============================================================================

export interface BiomeData {
  id: string;
  name: string;
  temperature: 'frozen' | 'cold' | 'temperate' | 'warm' | 'hot';
  humidity: 'arid' | 'dry' | 'normal' | 'humid' | 'wet';
  vegetation: string[];
  commonBlocks: string[];
  rareBlocks: string[];
  spawnableMobs: string[];
  structures: string[];
  farmingPotential: number;  // 0-100
  defensePotential: number;  // 0-100
  resourceRichness: number;  // 0-100
  buildingDifficulty: number; // 0-100
  survivalTips: string[];
  settlementTips: string[];
}

export const BIOMES: Record<string, BiomeData> = {
  'plains': {
    id: 'minecraft:plains',
    name: 'Plains',
    temperature: 'temperate',
    humidity: 'normal',
    vegetation: ['grass', 'flowers', 'oak_trees_sparse'],
    commonBlocks: ['grass_block', 'dirt', 'stone'],
    rareBlocks: ['pumpkin'],
    spawnableMobs: ['cow', 'sheep', 'pig', 'chicken', 'horse', 'donkey'],
    structures: ['village', 'pillager_outpost'],
    farmingPotential: 95,
    defensePotential: 40,
    resourceRichness: 60,
    buildingDifficulty: 20,
    survivalTips: [
      'Excellent starting biome',
      'Easy to find animals for food',
      'Villages common - great for trading',
      'Flat terrain good for building'
    ],
    settlementTips: [
      'BEST biome for villages',
      'Abundant farmland space',
      'Need to import wood',
      'Build walls - open terrain is vulnerable'
    ]
  },
  'forest': {
    id: 'minecraft:forest',
    name: 'Forest',
    temperature: 'temperate',
    humidity: 'normal',
    vegetation: ['oak_tree', 'birch_tree', 'flowers', 'grass'],
    commonBlocks: ['grass_block', 'dirt', 'oak_log', 'birch_log'],
    rareBlocks: ['mushroom'],
    spawnableMobs: ['wolf', 'cow', 'sheep', 'pig', 'chicken'],
    structures: ['none'],
    farmingPotential: 70,
    defensePotential: 60,
    resourceRichness: 80,
    buildingDifficulty: 40,
    survivalTips: [
      'Wood everywhere - essential for tools',
      'Wolves can be tamed with bones',
      'More shade = more hostile mob spawns at night',
      'Mushrooms for stew'
    ],
    settlementTips: [
      'Clear trees for farmland',
      'Use logs for initial shelter',
      'Natural walls from remaining trees',
      'Watch for mob spawns in tree shadows'
    ]
  },
  'taiga': {
    id: 'minecraft:taiga',
    name: 'Taiga',
    temperature: 'cold',
    humidity: 'humid',
    vegetation: ['spruce_tree', 'fern', 'sweet_berry_bush'],
    commonBlocks: ['grass_block', 'spruce_log', 'stone'],
    rareBlocks: ['podzol', 'mossy_cobblestone'],
    spawnableMobs: ['wolf', 'fox', 'rabbit', 'sheep'],
    structures: ['village', 'pillager_outpost'],
    farmingPotential: 60,
    defensePotential: 70,
    resourceRichness: 75,
    buildingDifficulty: 35,
    survivalTips: [
      'Sweet berries for emergency food',
      'Foxes drop items they pick up',
      'Wolves common - tame for defense',
      'Spruce wood is dark and aesthetic'
    ],
    settlementTips: [
      'Good balance of wood and open space',
      'Wolves provide natural defense',
      'Berry bushes slow enemies',
      'Cold but manageable'
    ]
  },
  'desert': {
    id: 'minecraft:desert',
    name: 'Desert',
    temperature: 'hot',
    humidity: 'arid',
    vegetation: ['cactus', 'dead_bush'],
    commonBlocks: ['sand', 'sandstone', 'terracotta'],
    rareBlocks: ['gold_ore'],  // Exposed in badlands variant
    spawnableMobs: ['rabbit', 'husk'],
    structures: ['desert_temple', 'desert_well', 'village', 'pillager_outpost'],
    farmingPotential: 20,
    defensePotential: 50,
    resourceRichness: 40,
    buildingDifficulty: 60,
    survivalTips: [
      'NO passive mobs except rabbits',
      'Find villages for food/water',
      'Desert temples have good loot (TNT trap!)',
      'Husks cause hunger instead of normal zombies',
      'Cactus for defense and green dye'
    ],
    settlementTips: [
      'Must import dirt for farming',
      'Water is critical - find desert wells',
      'Sandstone is good building material',
      'Cactus walls for defense',
      'Temples provide early-game loot'
    ]
  },
  'savanna': {
    id: 'minecraft:savanna',
    name: 'Savanna',
    temperature: 'warm',
    humidity: 'dry',
    vegetation: ['acacia_tree', 'tall_grass'],
    commonBlocks: ['grass_block', 'acacia_log', 'coarse_dirt'],
    rareBlocks: [],
    spawnableMobs: ['horse', 'donkey', 'llama', 'cow', 'sheep'],
    structures: ['village', 'pillager_outpost'],
    farmingPotential: 75,
    defensePotential: 45,
    resourceRichness: 55,
    buildingDifficulty: 25,
    survivalTips: [
      'Horses/donkeys for travel',
      'Llamas for mobile storage',
      'Rain never falls',
      'Villages common'
    ],
    settlementTips: [
      'Good farming potential',
      'Acacia wood has unique orange color',
      'Horses excellent for scouting',
      'Flat terrain easy to build'
    ]
  },
  'swamp': {
    id: 'minecraft:swamp',
    name: 'Swamp',
    temperature: 'temperate',
    humidity: 'wet',
    vegetation: ['oak_tree', 'lily_pad', 'blue_orchid', 'vines'],
    commonBlocks: ['grass_block', 'water', 'clay'],
    rareBlocks: ['slime'],  // Slimes spawn here
    spawnableMobs: ['slime', 'frog', 'witch'],
    structures: ['witch_hut', 'swamp_hut'],
    farmingPotential: 50,
    defensePotential: 30,
    resourceRichness: 65,
    buildingDifficulty: 70,
    survivalTips: [
      'SLIMES spawn on full moons',
      'Witches are dangerous at night',
      'Clay abundant - good for bricks',
      'Lily pads for water walking'
    ],
    settlementTips: [
      'Difficult terrain - lots of water',
      'Build on stilts or platforms',
      'Slime balls for pistons',
      'Natural moat defense'
    ]
  },
  'mountains': {
    id: 'minecraft:stony_peaks',
    name: 'Mountains',
    temperature: 'cold',
    humidity: 'normal',
    vegetation: ['spruce_tree', 'grass'],
    commonBlocks: ['stone', 'snow', 'gravel'],
    rareBlocks: ['emerald_ore', 'infested_stone'],
    spawnableMobs: ['goat', 'llama', 'sheep'],
    structures: [],
    farmingPotential: 20,
    defensePotential: 90,
    resourceRichness: 70,
    buildingDifficulty: 85,
    survivalTips: [
      'EMERALDS found only here',
      'Goats can knock you off cliffs',
      'Powdered snow - bring leather boots',
      'Stone everywhere'
    ],
    settlementTips: [
      'Natural fortress defense',
      'Mine into mountain for shelter',
      'Difficult farming - terrace or import',
      'Emeralds for villager trading'
    ]
  },
  'jungle': {
    id: 'minecraft:jungle',
    name: 'Jungle',
    temperature: 'warm',
    humidity: 'wet',
    vegetation: ['jungle_tree', 'bamboo', 'melon', 'cocoa'],
    commonBlocks: ['jungle_log', 'vines', 'grass_block'],
    rareBlocks: ['melon', 'cocoa_beans'],
    spawnableMobs: ['parrot', 'ocelot', 'panda'],
    structures: ['jungle_temple'],
    farmingPotential: 65,
    defensePotential: 55,
    resourceRichness: 85,
    buildingDifficulty: 75,
    survivalTips: [
      'Dense - easy to get lost',
      'Melons for food',
      'Cocoa beans grow on jungle logs',
      'Parrots warn of nearby mobs',
      'Temples have arrow traps'
    ],
    settlementTips: [
      'Massive trees = lots of wood',
      'Bamboo for scaffolding',
      'Clear large areas carefully',
      'Natural camouflage'
    ]
  }
};

export default {
  BLOCKS,
  CRAFTING_RECIPES,
  MOBS,
  BIOMES
};
