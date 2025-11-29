/**
 * BlockLife AI - Technology Tree System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Manages technological progression and discoveries.
 */

import { v4 as uuidv4 } from 'uuid';
import { Discovery, TechAge, ResourceStock } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('tech');

/**
 * Technology definition
 */
export interface Technology {
  id: string;
  name: string;
  description: string;
  category: TechCategory;
  age: TechAge;
  prerequisites: string[];  // Tech IDs required first
  researchCost: number;  // Research points needed
  effects: TechEffect[];
  unlocks: string[];  // What this tech unlocks (buildings, items, etc.)
}

/**
 * Technology categories
 */
export enum TechCategory {
  AGRICULTURE = 'AGRICULTURE',
  CONSTRUCTION = 'CONSTRUCTION',
  TOOLS = 'TOOLS',
  MILITARY = 'MILITARY',
  SOCIAL = 'SOCIAL',
  CRAFTING = 'CRAFTING',
  MINING = 'MINING'
}

/**
 * Effect of a technology
 */
export interface TechEffect {
  type: 'PRODUCTION_BONUS' | 'DEFENSE_BONUS' | 'UNLOCK_BUILDING' | 'UNLOCK_ITEM' | 'POPULATION_CAP' | 'EFFICIENCY';
  target?: string;
  value: number;
}

/**
 * Research project
 */
export interface ResearchProject {
  id: string;
  techId: string;
  villageId: string;
  scholarIds: string[];
  progress: number;  // 0-100
  startedAt: number;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
}

// Technology definitions
const TECHNOLOGIES: Technology[] = [
  // Stone Age
  {
    id: 'basic_tools',
    name: 'Basic Tools',
    description: 'Simple stone tools for gathering and crafting.',
    category: TechCategory.TOOLS,
    age: TechAge.STONE,
    prerequisites: [],
    researchCost: 10,
    effects: [
      { type: 'PRODUCTION_BONUS', target: 'gathering', value: 10 }
    ],
    unlocks: ['stone_axe', 'stone_pickaxe']
  },
  {
    id: 'basic_shelter',
    name: 'Basic Shelter',
    description: 'Simple wooden structures for protection.',
    category: TechCategory.CONSTRUCTION,
    age: TechAge.STONE,
    prerequisites: [],
    researchCost: 15,
    effects: [
      { type: 'UNLOCK_BUILDING', target: 'HUT', value: 1 }
    ],
    unlocks: ['wooden_hut']
  },
  {
    id: 'fire_mastery',
    name: 'Fire Mastery',
    description: 'Control of fire for cooking and warmth.',
    category: TechCategory.CRAFTING,
    age: TechAge.STONE,
    prerequisites: [],
    researchCost: 20,
    effects: [
      { type: 'EFFICIENCY', target: 'food', value: 20 }
    ],
    unlocks: ['campfire', 'torch']
  },
  {
    id: 'basic_farming',
    name: 'Basic Farming',
    description: 'Simple crop cultivation techniques.',
    category: TechCategory.AGRICULTURE,
    age: TechAge.STONE,
    prerequisites: ['basic_tools'],
    researchCost: 25,
    effects: [
      { type: 'UNLOCK_BUILDING', target: 'FARM', value: 1 },
      { type: 'PRODUCTION_BONUS', target: 'food', value: 25 }
    ],
    unlocks: ['farm_plot', 'hoe']
  },
  
  // Iron Age
  {
    id: 'iron_working',
    name: 'Iron Working',
    description: 'Smelting and forging iron tools and weapons.',
    category: TechCategory.TOOLS,
    age: TechAge.IRON,
    prerequisites: ['basic_tools', 'fire_mastery'],
    researchCost: 50,
    effects: [
      { type: 'UNLOCK_ITEM', target: 'iron_tools', value: 1 },
      { type: 'PRODUCTION_BONUS', target: 'mining', value: 30 }
    ],
    unlocks: ['furnace', 'iron_pickaxe', 'iron_axe']
  },
  {
    id: 'stone_construction',
    name: 'Stone Construction',
    description: 'Building with stone for stronger structures.',
    category: TechCategory.CONSTRUCTION,
    age: TechAge.IRON,
    prerequisites: ['basic_shelter', 'basic_tools'],
    researchCost: 40,
    effects: [
      { type: 'UNLOCK_BUILDING', target: 'HOUSE', value: 1 },
      { type: 'DEFENSE_BONUS', value: 15 }
    ],
    unlocks: ['stone_house', 'stone_wall']
  },
  {
    id: 'basic_defense',
    name: 'Basic Defense',
    description: 'Defensive walls and structures.',
    category: TechCategory.MILITARY,
    age: TechAge.IRON,
    prerequisites: ['stone_construction'],
    researchCost: 45,
    effects: [
      { type: 'UNLOCK_BUILDING', target: 'WALL_SECTION', value: 1 },
      { type: 'DEFENSE_BONUS', value: 25 }
    ],
    unlocks: ['wooden_wall', 'stone_wall', 'gate']
  },
  {
    id: 'animal_husbandry',
    name: 'Animal Husbandry',
    description: 'Domestication and breeding of animals.',
    category: TechCategory.AGRICULTURE,
    age: TechAge.IRON,
    prerequisites: ['basic_farming'],
    researchCost: 55,
    effects: [
      { type: 'PRODUCTION_BONUS', target: 'food', value: 30 },
      { type: 'UNLOCK_BUILDING', target: 'PEN', value: 1 }
    ],
    unlocks: ['animal_pen', 'barn']
  },
  
  // Agricultural Age
  {
    id: 'irrigation',
    name: 'Irrigation',
    description: 'Water management for improved farming.',
    category: TechCategory.AGRICULTURE,
    age: TechAge.AGRICULTURAL,
    prerequisites: ['basic_farming', 'stone_construction'],
    researchCost: 70,
    effects: [
      { type: 'PRODUCTION_BONUS', target: 'food', value: 50 },
      { type: 'EFFICIENCY', target: 'farming', value: 25 }
    ],
    unlocks: ['irrigation_channel', 'well']
  },
  {
    id: 'crop_rotation',
    name: 'Crop Rotation',
    description: 'Advanced farming techniques for sustained yields.',
    category: TechCategory.AGRICULTURE,
    age: TechAge.AGRICULTURAL,
    prerequisites: ['basic_farming', 'irrigation'],
    researchCost: 60,
    effects: [
      { type: 'PRODUCTION_BONUS', target: 'food', value: 40 },
      { type: 'EFFICIENCY', target: 'farming', value: 30 }
    ],
    unlocks: ['advanced_farm']
  },
  {
    id: 'advanced_tools',
    name: 'Advanced Tools',
    description: 'More efficient and specialized tools.',
    category: TechCategory.TOOLS,
    age: TechAge.AGRICULTURAL,
    prerequisites: ['iron_working'],
    researchCost: 80,
    effects: [
      { type: 'PRODUCTION_BONUS', target: 'all', value: 20 },
      { type: 'EFFICIENCY', target: 'crafting', value: 25 }
    ],
    unlocks: ['advanced_pickaxe', 'advanced_axe', 'advanced_hoe']
  },
  {
    id: 'fortification',
    name: 'Fortification',
    description: 'Advanced defensive structures.',
    category: TechCategory.MILITARY,
    age: TechAge.AGRICULTURAL,
    prerequisites: ['basic_defense', 'stone_construction'],
    researchCost: 90,
    effects: [
      { type: 'UNLOCK_BUILDING', target: 'WATCHTOWER', value: 1 },
      { type: 'DEFENSE_BONUS', value: 40 }
    ],
    unlocks: ['watchtower', 'reinforced_wall', 'archer_tower']
  },
  
  // Settlement Age
  {
    id: 'governance',
    name: 'Governance',
    description: 'Organized leadership and laws.',
    category: TechCategory.SOCIAL,
    age: TechAge.SETTLEMENT,
    prerequisites: ['stone_construction'],
    researchCost: 100,
    effects: [
      { type: 'UNLOCK_BUILDING', target: 'TOWN_HALL', value: 1 },
      { type: 'POPULATION_CAP', value: 20 }
    ],
    unlocks: ['town_hall', 'laws']
  },
  {
    id: 'trade_networks',
    name: 'Trade Networks',
    description: 'Organized trade between villages.',
    category: TechCategory.SOCIAL,
    age: TechAge.SETTLEMENT,
    prerequisites: ['governance'],
    researchCost: 110,
    effects: [
      { type: 'UNLOCK_BUILDING', target: 'MARKET', value: 1 },
      { type: 'EFFICIENCY', target: 'trade', value: 50 }
    ],
    unlocks: ['market', 'trade_post']
  },
  {
    id: 'advanced_crafting',
    name: 'Advanced Crafting',
    description: 'Specialized workshops and craftsmen.',
    category: TechCategory.CRAFTING,
    age: TechAge.SETTLEMENT,
    prerequisites: ['advanced_tools', 'iron_working'],
    researchCost: 120,
    effects: [
      { type: 'UNLOCK_BUILDING', target: 'WORKSHOP', value: 1 },
      { type: 'EFFICIENCY', target: 'crafting', value: 50 }
    ],
    unlocks: ['workshop', 'smithy', 'tannery']
  },
  {
    id: 'education',
    name: 'Education',
    description: 'Formal teaching and knowledge preservation.',
    category: TechCategory.SOCIAL,
    age: TechAge.SETTLEMENT,
    prerequisites: ['governance'],
    researchCost: 130,
    effects: [
      { type: 'EFFICIENCY', target: 'research', value: 50 }
    ],
    unlocks: ['library', 'school']
  },
  
  // Redstone Age
  {
    id: 'redstone_basics',
    name: 'Redstone Basics',
    description: 'Understanding of redstone mechanics.',
    category: TechCategory.CRAFTING,
    age: TechAge.REDSTONE,
    prerequisites: ['advanced_crafting', 'education'],
    researchCost: 200,
    effects: [
      { type: 'UNLOCK_ITEM', target: 'redstone_components', value: 1 }
    ],
    unlocks: ['redstone_torch', 'lever', 'button']
  },
  {
    id: 'automation',
    name: 'Automation',
    description: 'Automatic systems for production.',
    category: TechCategory.CRAFTING,
    age: TechAge.REDSTONE,
    prerequisites: ['redstone_basics'],
    researchCost: 250,
    effects: [
      { type: 'PRODUCTION_BONUS', target: 'all', value: 50 },
      { type: 'EFFICIENCY', target: 'all', value: 30 }
    ],
    unlocks: ['auto_farm', 'auto_furnace', 'auto_sorter']
  },
  {
    id: 'advanced_defense',
    name: 'Advanced Defense',
    description: 'Redstone-powered defensive systems.',
    category: TechCategory.MILITARY,
    age: TechAge.REDSTONE,
    prerequisites: ['redstone_basics', 'fortification'],
    researchCost: 280,
    effects: [
      { type: 'DEFENSE_BONUS', value: 100 }
    ],
    unlocks: ['auto_door', 'trap_system', 'alarm_system']
  }
];

/**
 * Tech Tree Manager
 */
export class TechTreeManager {
  private researchedTechs: Map<string, Set<string>> = new Map();  // Village ID -> Tech IDs
  private researchProjects: Map<string, ResearchProject> = new Map();
  private techMap: Map<string, Technology> = new Map();
  
  private readonly BASE_RESEARCH_RATE = 1;  // Points per scholar per tick

  constructor() {
    // Build tech map for quick lookup
    for (const tech of TECHNOLOGIES) {
      this.techMap.set(tech.id, tech);
    }
    logger.info(`Tech Tree Manager initialized with ${TECHNOLOGIES.length} technologies`);
  }

  /**
   * Get all technologies
   */
  getAllTechnologies(): Technology[] {
    return [...TECHNOLOGIES];
  }

  /**
   * Get technology by ID
   */
  getTechnology(techId: string): Technology | undefined {
    return this.techMap.get(techId);
  }

  /**
   * Get technologies for a specific age
   */
  getTechnologiesForAge(age: TechAge): Technology[] {
    return TECHNOLOGIES.filter(t => t.age === age);
  }

  /**
   * Get technologies by category
   */
  getTechnologiesByCategory(category: TechCategory): Technology[] {
    return TECHNOLOGIES.filter(t => t.category === category);
  }

  /**
   * Check if a village has researched a technology
   */
  hasResearched(villageId: string, techId: string): boolean {
    const researched = this.researchedTechs.get(villageId);
    return researched ? researched.has(techId) : false;
  }

  /**
   * Get researched technologies for a village
   */
  getResearchedTechs(villageId: string): Technology[] {
    const researched = this.researchedTechs.get(villageId);
    if (!researched) return [];
    
    return Array.from(researched)
      .map(id => this.techMap.get(id))
      .filter((t): t is Technology => t !== undefined);
  }

  /**
   * Check if a technology can be researched
   */
  canResearch(villageId: string, techId: string): { can: boolean; reason?: string } {
    const tech = this.techMap.get(techId);
    if (!tech) {
      return { can: false, reason: 'Technology not found' };
    }
    
    // Already researched
    if (this.hasResearched(villageId, techId)) {
      return { can: false, reason: 'Already researched' };
    }
    
    // Check prerequisites
    for (const prereqId of tech.prerequisites) {
      if (!this.hasResearched(villageId, prereqId)) {
        const prereq = this.techMap.get(prereqId);
        return { can: false, reason: `Requires ${prereq?.name || prereqId}` };
      }
    }
    
    // Check if already researching
    const activeProject = this.getActiveProject(villageId);
    if (activeProject) {
      return { can: false, reason: 'Already researching another technology' };
    }
    
    return { can: true };
  }

  /**
   * Get available technologies for research
   */
  getAvailableTechs(villageId: string): Technology[] {
    return TECHNOLOGIES.filter(tech => {
      const check = this.canResearch(villageId, tech.id);
      return check.can;
    });
  }

  /**
   * Start researching a technology
   */
  startResearch(villageId: string, techId: string, scholarIds: string[]): ResearchProject | null {
    const check = this.canResearch(villageId, techId);
    if (!check.can) {
      logger.debug(`Cannot start research: ${check.reason}`);
      return null;
    }
    
    const tech = this.techMap.get(techId)!;
    
    const project: ResearchProject = {
      id: uuidv4(),
      techId,
      villageId,
      scholarIds,
      progress: 0,
      startedAt: Date.now(),
      status: 'ACTIVE'
    };
    
    this.researchProjects.set(project.id, project);
    logger.info(`Started researching ${tech.name} in village ${villageId}`);
    
    return project;
  }

  /**
   * Progress research
   */
  progressResearch(projectId: string, deltaMs: number): boolean {
    const project = this.researchProjects.get(projectId);
    if (!project || project.status !== 'ACTIVE') {
      return false;
    }
    
    const tech = this.techMap.get(project.techId);
    if (!tech) return false;
    
    // Calculate progress based on scholars
    const scholarCount = project.scholarIds.length;
    const progressRate = (scholarCount * this.BASE_RESEARCH_RATE * deltaMs) / 60000;  // Per minute
    const progressPercent = (progressRate / tech.researchCost) * 100;
    
    project.progress = Math.min(100, project.progress + progressPercent);
    
    // Check if complete
    if (project.progress >= 100) {
      return this.completeResearch(projectId);
    }
    
    return false;
  }

  /**
   * Complete research
   */
  private completeResearch(projectId: string): boolean {
    const project = this.researchProjects.get(projectId);
    if (!project) return false;
    
    const tech = this.techMap.get(project.techId);
    if (!tech) return false;
    
    project.status = 'COMPLETED';
    
    // Add to researched techs
    let researched = this.researchedTechs.get(project.villageId);
    if (!researched) {
      researched = new Set();
      this.researchedTechs.set(project.villageId, researched);
    }
    researched.add(project.techId);
    
    logger.info(`Research completed: ${tech.name} in village ${project.villageId}`);
    
    return true;
  }

  /**
   * Get active research project for a village
   */
  getActiveProject(villageId: string): ResearchProject | undefined {
    for (const project of this.researchProjects.values()) {
      if (project.villageId === villageId && project.status === 'ACTIVE') {
        return project;
      }
    }
    return undefined;
  }

  /**
   * Cancel research
   */
  cancelResearch(projectId: string): boolean {
    const project = this.researchProjects.get(projectId);
    if (!project || project.status !== 'ACTIVE') {
      return false;
    }
    
    project.status = 'CANCELLED';
    return true;
  }

  /**
   * Get total effects from all researched techs
   */
  getTotalEffects(villageId: string): Map<string, number> {
    const effects = new Map<string, number>();
    const researched = this.getResearchedTechs(villageId);
    
    for (const tech of researched) {
      for (const effect of tech.effects) {
        const key = `${effect.type}_${effect.target || 'general'}`;
        const current = effects.get(key) || 0;
        effects.set(key, current + effect.value);
      }
    }
    
    return effects;
  }

  /**
   * Get unlocked items/buildings from research
   */
  getUnlocks(villageId: string): string[] {
    const unlocks: string[] = [];
    const researched = this.getResearchedTechs(villageId);
    
    for (const tech of researched) {
      unlocks.push(...tech.unlocks);
    }
    
    return [...new Set(unlocks)];
  }

  /**
   * Serialize for persistence
   */
  serialize(): {
    researchedTechs: { villageId: string; techIds: string[] }[];
    researchProjects: ResearchProject[];
  } {
    const researchedArray: { villageId: string; techIds: string[] }[] = [];
    for (const [villageId, techIds] of this.researchedTechs.entries()) {
      researchedArray.push({ villageId, techIds: Array.from(techIds) });
    }
    
    return {
      researchedTechs: researchedArray,
      researchProjects: Array.from(this.researchProjects.values())
    };
  }

  /**
   * Load from persistence
   */
  load(data: {
    researchedTechs?: { villageId: string; techIds: string[] }[];
    researchProjects?: ResearchProject[];
  }): void {
    this.researchedTechs.clear();
    this.researchProjects.clear();
    
    for (const entry of data.researchedTechs || []) {
      this.researchedTechs.set(entry.villageId, new Set(entry.techIds));
    }
    
    for (const project of data.researchProjects || []) {
      this.researchProjects.set(project.id, project);
    }
    
    logger.info(`Loaded tech tree data`);
  }
}

// Singleton
let techTreeManagerInstance: TechTreeManager | null = null;

export function getTechTreeManager(): TechTreeManager {
  if (!techTreeManagerInstance) {
    techTreeManagerInstance = new TechTreeManager();
  }
  return techTreeManagerInstance;
}

export function resetTechTreeManager(): void {
  techTreeManagerInstance = null;
}

export { TECHNOLOGIES };
export default TechTreeManager;
