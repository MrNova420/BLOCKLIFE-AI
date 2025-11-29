/**
 * BlockLife AI - Building Blueprints System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Comprehensive building blueprints from basic huts to grand kingdoms.
 * Real Minecraft building knowledge for AI-controlled construction.
 */

export interface BlockPlacement {
  x: number; y: number; z: number;
  block: string;
  facing?: 'north' | 'south' | 'east' | 'west';
}

export interface Blueprint {
  id: string;
  name: string;
  category: 'shelter' | 'farm' | 'defense' | 'storage' | 'civic' | 'decoration' | 'infrastructure';
  tier: 'basic' | 'intermediate' | 'advanced' | 'expert' | 'master';
  size: { width: number; height: number; depth: number };
  materials: { item: string; count: number }[];
  blocks: BlockPlacement[];
  buildTime: number; // Estimated ticks
  prerequisites: string[];
  description: string;
  tips: string[];
}

export const BLUEPRINTS: Blueprint[] = [
  // BASIC SHELTERS
  {
    id: 'dirt_hut',
    name: 'Emergency Dirt Hut',
    category: 'shelter',
    tier: 'basic',
    size: { width: 3, height: 3, depth: 3 },
    materials: [{ item: 'dirt', count: 20 }],
    blocks: [], // Simplified - actual blocks would be generated
    buildTime: 100,
    prerequisites: [],
    description: 'First night emergency shelter. Dig into hillside or build quick dirt box.',
    tips: ['Dig 3 blocks into hill', 'Place door or block entrance', 'Add torch inside']
  },
  {
    id: 'wooden_shack',
    name: 'Wooden Shack',
    category: 'shelter',
    tier: 'basic',
    size: { width: 5, height: 4, depth: 5 },
    materials: [
      { item: 'oak_planks', count: 64 },
      { item: 'oak_door', count: 1 },
      { item: 'torch', count: 4 },
      { item: 'crafting_table', count: 1 },
      { item: 'chest', count: 1 }
    ],
    blocks: [],
    buildTime: 500,
    prerequisites: ['wooden_pickaxe'],
    description: 'Basic wooden home with essentials.',
    tips: ['5x5 floor', '3 block walls', 'Flat roof okay', 'Window for light']
  },
  {
    id: 'stone_cottage',
    name: 'Stone Cottage',
    category: 'shelter',
    tier: 'intermediate',
    size: { width: 7, height: 5, depth: 7 },
    materials: [
      { item: 'cobblestone', count: 128 },
      { item: 'oak_planks', count: 32 },
      { item: 'glass_pane', count: 8 },
      { item: 'oak_door', count: 1 },
      { item: 'torch', count: 8 },
      { item: 'bed', count: 1 }
    ],
    blocks: [],
    buildTime: 1200,
    prerequisites: ['furnace', 'stone_pickaxe'],
    description: 'Durable stone home, fireproof and mob-resistant.',
    tips: ['Stone walls resist creepers', 'Add chimney for aesthetics', 'Glass windows for light']
  },
  {
    id: 'large_house',
    name: 'Large Family House',
    category: 'shelter',
    tier: 'advanced',
    size: { width: 11, height: 7, depth: 9 },
    materials: [
      { item: 'stone_bricks', count: 256 },
      { item: 'oak_planks', count: 128 },
      { item: 'oak_stairs', count: 32 },
      { item: 'glass_pane', count: 24 },
      { item: 'oak_door', count: 2 },
      { item: 'bed', count: 4 },
      { item: 'chest', count: 4 }
    ],
    blocks: [],
    buildTime: 3000,
    prerequisites: ['stone_cottage'],
    description: 'Two-story family home with multiple rooms.',
    tips: ['Ground floor: living/storage', 'Upper floor: bedrooms', 'Balcony adds character']
  },
  {
    id: 'manor_house',
    name: 'Manor House',
    category: 'shelter',
    tier: 'expert',
    size: { width: 21, height: 12, depth: 17 },
    materials: [
      { item: 'stone_bricks', count: 1024 },
      { item: 'dark_oak_planks', count: 512 },
      { item: 'dark_oak_stairs', count: 128 },
      { item: 'glass_pane', count: 64 },
      { item: 'lantern', count: 32 }
    ],
    blocks: [],
    buildTime: 15000,
    prerequisites: ['large_house'],
    description: 'Grand manor for village leaders. Multiple wings and great hall.',
    tips: ['Central great hall', 'East/West wings', 'Tower for lookout', 'Courtyard entrance']
  },

  // FARMS
  {
    id: 'basic_wheat_farm',
    name: 'Basic Wheat Farm',
    category: 'farm',
    tier: 'basic',
    size: { width: 9, height: 2, depth: 9 },
    materials: [
      { item: 'water_bucket', count: 1 },
      { item: 'wheat_seeds', count: 64 },
      { item: 'hoe', count: 1 }
    ],
    blocks: [],
    buildTime: 300,
    prerequisites: [],
    description: '9x9 farm with central water. Maximum efficiency layout.',
    tips: ['Water hydrates 4 blocks in each direction', '80 farmland per water source', 'Torch for night growth']
  },
  {
    id: 'multi_crop_farm',
    name: 'Multi-Crop Farm',
    category: 'farm',
    tier: 'intermediate',
    size: { width: 17, height: 3, depth: 17 },
    materials: [
      { item: 'water_bucket', count: 4 },
      { item: 'wheat_seeds', count: 64 },
      { item: 'carrot', count: 32 },
      { item: 'potato', count: 32 },
      { item: 'fence', count: 64 }
    ],
    blocks: [],
    buildTime: 800,
    prerequisites: ['basic_wheat_farm'],
    description: 'Four-quadrant farm for diverse crops. Fenced for protection.',
    tips: ['Rotate crops for variety', 'Fence keeps animals out', 'Composters for bone meal']
  },
  {
    id: 'auto_farm_water',
    name: 'Semi-Auto Water Harvest Farm',
    category: 'farm',
    tier: 'advanced',
    size: { width: 9, height: 4, depth: 13 },
    materials: [
      { item: 'water_bucket', count: 2 },
      { item: 'dispenser', count: 1 },
      { item: 'redstone', count: 8 },
      { item: 'button', count: 1 },
      { item: 'hopper', count: 2 },
      { item: 'chest', count: 1 }
    ],
    blocks: [],
    buildTime: 2000,
    prerequisites: ['redstone'],
    description: 'Water flush harvesting with collection. Press button to harvest.',
    tips: ['Crops flow to hoppers', 'Replant manually', 'Works with wheat/carrots/potatoes']
  },
  {
    id: 'full_auto_farm',
    name: 'Fully Automatic Villager Farm',
    category: 'farm',
    tier: 'expert',
    size: { width: 11, height: 8, depth: 11 },
    materials: [
      { item: 'glass', count: 64 },
      { item: 'hopper', count: 8 },
      { item: 'chest', count: 4 },
      { item: 'composter', count: 4 },
      { item: 'bed', count: 4 }
    ],
    blocks: [],
    buildTime: 5000,
    prerequisites: ['villager'],
    description: 'Villager-powered automatic farming. Zero player input needed.',
    tips: ['Farmer villager plants/harvests', 'Minecart hopper collects', '24/7 food production']
  },

  // DEFENSE
  {
    id: 'wooden_fence_wall',
    name: 'Wooden Perimeter Fence',
    category: 'defense',
    tier: 'basic',
    size: { width: 50, height: 2, depth: 50 },
    materials: [{ item: 'oak_fence', count: 200 }, { item: 'oak_fence_gate', count: 4 }],
    blocks: [],
    buildTime: 600,
    prerequisites: [],
    description: 'Basic fence perimeter. Keeps passive mobs in, provides minimal defense.',
    tips: ['1.5 blocks high - mobs cannot jump', 'Gates for entry', 'Not spider-proof']
  },
  {
    id: 'cobblestone_wall',
    name: 'Cobblestone Defense Wall',
    category: 'defense',
    tier: 'intermediate',
    size: { width: 50, height: 4, depth: 50 },
    materials: [
      { item: 'cobblestone', count: 800 },
      { item: 'cobblestone_wall', count: 200 },
      { item: 'torch', count: 50 }
    ],
    blocks: [],
    buildTime: 2500,
    prerequisites: ['stone_pickaxe'],
    description: '3-block high walls with battlements. Solid mob protection.',
    tips: ['3 high minimum', 'Overhang stops spiders', 'Light top to prevent spawns']
  },
  {
    id: 'fortified_wall',
    name: 'Fortified Stone Wall',
    category: 'defense',
    tier: 'advanced',
    size: { width: 60, height: 6, depth: 60 },
    materials: [
      { item: 'stone_bricks', count: 2000 },
      { item: 'stone_brick_stairs', count: 400 },
      { item: 'lantern', count: 100 },
      { item: 'iron_door', count: 4 }
    ],
    blocks: [],
    buildTime: 8000,
    prerequisites: ['cobblestone_wall'],
    description: 'Full fortress wall with walkways, towers, and iron gates.',
    tips: ['Guard walkway on top', 'Corner towers for visibility', 'Arrow slits for ranged defense']
  },
  {
    id: 'guard_tower',
    name: 'Guard Tower',
    category: 'defense',
    tier: 'intermediate',
    size: { width: 5, height: 12, depth: 5 },
    materials: [
      { item: 'cobblestone', count: 200 },
      { item: 'oak_stairs', count: 24 },
      { item: 'ladder', count: 12 },
      { item: 'torch', count: 8 }
    ],
    blocks: [],
    buildTime: 1500,
    prerequisites: [],
    description: 'Watchtower for early threat detection. Archer platform at top.',
    tips: ['12+ blocks for good visibility', 'Ladder or spiral stairs', 'Bell for alarm']
  },

  // STORAGE
  {
    id: 'storage_room',
    name: 'Storage Room',
    category: 'storage',
    tier: 'basic',
    size: { width: 7, height: 4, depth: 7 },
    materials: [
      { item: 'chest', count: 27 },
      { item: 'torch', count: 4 },
      { item: 'item_frame', count: 27 }
    ],
    blocks: [],
    buildTime: 400,
    prerequisites: [],
    description: 'Organized chest room with item frames for labeling.',
    tips: ['Double chests for capacity', 'Item frames show contents', 'Sort by category']
  },
  {
    id: 'warehouse',
    name: 'Large Warehouse',
    category: 'storage',
    tier: 'advanced',
    size: { width: 15, height: 8, depth: 21 },
    materials: [
      { item: 'chest', count: 108 },
      { item: 'barrel', count: 54 },
      { item: 'hopper', count: 12 }
    ],
    blocks: [],
    buildTime: 3500,
    prerequisites: ['storage_room'],
    description: 'Multi-floor warehouse with sorting areas.',
    tips: ['Ground floor: bulk items', 'Upper floors: valuables', 'Hopper input system']
  },

  // CIVIC BUILDINGS
  {
    id: 'town_hall',
    name: 'Town Hall',
    category: 'civic',
    tier: 'advanced',
    size: { width: 15, height: 10, depth: 11 },
    materials: [
      { item: 'stone_bricks', count: 512 },
      { item: 'oak_planks', count: 256 },
      { item: 'glass_pane', count: 32 },
      { item: 'bell', count: 1 }
    ],
    blocks: [],
    buildTime: 6000,
    prerequisites: ['large_house'],
    description: 'Central government building with meeting hall and bell tower.',
    tips: ['Central bell for gatherings', 'Large meeting room', 'Leader office upstairs']
  },
  {
    id: 'marketplace',
    name: 'Village Marketplace',
    category: 'civic',
    tier: 'intermediate',
    size: { width: 21, height: 5, depth: 21 },
    materials: [
      { item: 'oak_planks', count: 256 },
      { item: 'oak_fence', count: 64 },
      { item: 'barrel', count: 16 }
    ],
    blocks: [],
    buildTime: 2500,
    prerequisites: [],
    description: 'Open-air market with stalls for trading.',
    tips: ['Central well or fountain', 'Individual stalls', 'Covered areas for rain']
  },
  {
    id: 'temple',
    name: 'Village Temple',
    category: 'civic',
    tier: 'expert',
    size: { width: 17, height: 15, depth: 25 },
    materials: [
      { item: 'quartz_block', count: 512 },
      { item: 'quartz_pillar', count: 32 },
      { item: 'gold_block', count: 16 }
    ],
    blocks: [],
    buildTime: 12000,
    prerequisites: ['town_hall'],
    description: 'Grand temple for worship of The Player/Sky-Being.',
    tips: ['Tall spire visible from afar', 'Interior shrine', 'Stained glass windows']
  },

  // INFRASTRUCTURE  
  {
    id: 'cobblestone_road',
    name: 'Cobblestone Road Section',
    category: 'infrastructure',
    tier: 'basic',
    size: { width: 5, height: 1, depth: 20 },
    materials: [{ item: 'cobblestone', count: 100 }],
    blocks: [],
    buildTime: 200,
    prerequisites: [],
    description: '5-wide road section. Connect buildings and villages.',
    tips: ['3-wide minimum for carts', 'Edge with slabs', 'Light every 12 blocks']
  },
  {
    id: 'bridge_small',
    name: 'Small Bridge',
    category: 'infrastructure',
    tier: 'intermediate',
    size: { width: 5, height: 4, depth: 12 },
    materials: [
      { item: 'stone_bricks', count: 96 },
      { item: 'stone_brick_stairs', count: 24 },
      { item: 'oak_fence', count: 24 }
    ],
    blocks: [],
    buildTime: 800,
    prerequisites: [],
    description: 'Arched bridge for crossing rivers/ravines.',
    tips: ['Arch underneath for boats', 'Railings for safety', 'Lanterns at ends']
  }
];

export function getBlueprintsByTier(tier: Blueprint['tier']): Blueprint[] {
  return BLUEPRINTS.filter(b => b.tier === tier);
}

export function getBlueprintsByCategory(category: Blueprint['category']): Blueprint[] {
  return BLUEPRINTS.filter(b => b.category === category);
}

export function getNextBlueprint(currentId: string): Blueprint | undefined {
  const current = BLUEPRINTS.find(b => b.id === currentId);
  if (!current) return BLUEPRINTS[0];
  const tierOrder = ['basic', 'intermediate', 'advanced', 'expert', 'master'];
  const currentTierIndex = tierOrder.indexOf(current.tier);
  return BLUEPRINTS.find(b => 
    b.category === current.category && 
    tierOrder.indexOf(b.tier) === currentTierIndex + 1
  );
}

export default BLUEPRINTS;
