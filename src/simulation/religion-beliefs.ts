/**
 * BlockLife AI - Religion and Belief System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Cultural and spiritual beliefs that develop organically in villages,
 * including creation myths, rituals, and religious practices.
 */

import { v4 as uuidv4 } from 'uuid';
import { Bot, Village, Position } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('religion');

/**
 * Types of deities/entities worshipped
 */
export enum DeityType {
  CREATOR = 'CREATOR',           // The Player or creation entity
  NATURE = 'NATURE',             // Sun, moon, seasons
  ANCESTOR = 'ANCESTOR',         // Honored ancestors
  ABSTRACT = 'ABSTRACT',         // Concepts like luck, fate
  LOCAL = 'LOCAL',               // Place-specific spirits
  HERO = 'HERO'                  // Deified heroes
}

/**
 * A deity or spiritual entity
 */
export interface Deity {
  id: string;
  name: string;
  type: DeityType;
  domain: string[];              // What they govern (harvest, war, etc.)
  symbol: string;                // Emoji representation
  description: string;
  origin: string;                // How they came to be worshipped
  associatedBotId?: string;      // If based on a real bot (ancestor/hero)
  worshippedBy: string[];        // Village IDs
  power: number;                 // 0-100, perceived influence
  favor: number;                 // -100 to 100, current disposition
  createdAt: number;
}

/**
 * Religious practice/ritual
 */
export interface Ritual {
  id: string;
  name: string;
  description: string;
  deityId?: string;              // Associated deity
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SEASONAL' | 'YEARLY' | 'SPECIAL';
  requirements: RitualRequirement[];
  effects: RitualEffect[];
  participantRoles: string[];    // Required roles
  duration: number;              // In ticks
  lastPerformed?: number;
  timesPerformed: number;
}

/**
 * Requirements for performing a ritual
 */
export interface RitualRequirement {
  type: 'RESOURCE' | 'LOCATION' | 'WEATHER' | 'TIME' | 'PARTICIPANT_COUNT' | 'DEITY_FAVOR';
  value: string | number;
  description: string;
}

/**
 * Effects of completing a ritual
 */
export interface RitualEffect {
  type: 'MOOD_BOOST' | 'HARVEST_BONUS' | 'PROTECTION' | 'FERTILITY' | 'COMBAT_BONUS' | 'TRADE_BONUS' | 'DEITY_FAVOR';
  value: number;
  duration: number;              // How long effect lasts
  description: string;
}

/**
 * Religious belief system
 */
export interface BeliefSystem {
  id: string;
  name: string;
  villageId: string;
  deityIds: string[];
  ritualIds: string[];
  creationMyth: string;
  afterlifeBeliefs: string;
  moralCode: string[];
  holyDays: HolyDay[];
  sacredSites: SacredSite[];
  heresies: string[];            // Rejected beliefs
  orthodoxy: number;             // 0-100, how strict
  piety: number;                 // 0-100, average devotion
  createdAt: number;
}

/**
 * A holy day/festival
 */
export interface HolyDay {
  id: string;
  name: string;
  description: string;
  dayOfYear: number;             // 1-360
  duration: number;              // Days
  celebrationRituals: string[];
  mood: 'JOYFUL' | 'SOLEMN' | 'REFLECTIVE' | 'WILD';
}

/**
 * A sacred site
 */
export interface SacredSite {
  id: string;
  name: string;
  description: string;
  position: Position;
  deityId?: string;
  type: 'TEMPLE' | 'SHRINE' | 'ALTAR' | 'NATURAL' | 'BURIAL_GROUND' | 'PILGRIMAGE_SITE';
  power: number;                 // Spiritual potency
  visitors: string[];            // Bot IDs who've visited
  offerings: { resource: string; amount: number }[];
}

/**
 * Prayer/offering record
 */
export interface Prayer {
  id: string;
  botId: string;
  deityId: string;
  content: string;
  type: 'THANKS' | 'PETITION' | 'CONFESSION' | 'PRAISE';
  offering?: { resource: string; amount: number };
  timestamp: number;
  answered?: boolean;
}

/**
 * Religious office/role
 */
export interface ReligiousOffice {
  id: string;
  title: string;
  description: string;
  duties: string[];
  requirements: string[];
  holderId?: string;             // Current holder bot ID
  previousHolders: string[];
  villageId: string;
}

// Predefined deity templates
const DEITY_TEMPLATES = [
  {
    type: DeityType.CREATOR,
    names: ['The Watcher', 'The Builder', 'The First Hand', 'The Sky Being', 'The Placer of Blocks'],
    domains: [['creation', 'fate', 'order'], ['building', 'crafting'], ['protection', 'guidance']],
    symbols: ['👁️', '✋', '⬛', '🌟'],
    descriptions: [
      'The one who shaped the first blocks and breathed life into us',
      'The great architect whose vision we fulfill',
      'They who watch from beyond the sky'
    ]
  },
  {
    type: DeityType.NATURE,
    names: ['Sol the Bright', 'Luna of Night', 'The Green Mother', 'Storm Father', 'The Deep Earth'],
    domains: [['sun', 'crops', 'day'], ['moon', 'night', 'rest'], ['plants', 'fertility'], ['rain', 'storms'], ['minerals', 'caves']],
    symbols: ['☀️', '🌙', '🌿', '⛈️', '⛰️'],
    descriptions: [
      'Bringer of light and warmth to the blocky lands',
      'Guardian of the night and keeper of dreams',
      'The spirit of growing things',
      'The voice of thunder and giver of rain',
      'The ancient one who holds the ores'
    ]
  },
  {
    type: DeityType.ABSTRACT,
    names: ['Lady Fortune', 'The Inevitable', 'The Unknown', 'Hope Eternal', 'The Balance'],
    domains: [['luck', 'chance'], ['death', 'endings'], ['mystery', 'secrets'], ['hope', 'beginnings'], ['justice', 'karma']],
    symbols: ['🎲', '⚰️', '❓', '🌅', '⚖️'],
    descriptions: [
      'She who tips the scales of fate',
      'The end that awaits all who live',
      'That which cannot be known',
      'The light that never fully fades',
      'The force that rights all wrongs'
    ]
  }
];

// Ritual templates
const RITUAL_TEMPLATES = [
  {
    name: 'Morning Prayer',
    description: 'A brief prayer at dawn to greet the new day',
    frequency: 'DAILY' as const,
    effects: [{ type: 'MOOD_BOOST' as const, value: 5, duration: 12000, description: 'Start the day with peace' }]
  },
  {
    name: 'Harvest Festival',
    description: 'A celebration of the autumn harvest',
    frequency: 'YEARLY' as const,
    effects: [
      { type: 'HARVEST_BONUS' as const, value: 20, duration: 24000, description: 'Blessed harvest' },
      { type: 'MOOD_BOOST' as const, value: 30, duration: 48000, description: 'Festival joy' }
    ]
  },
  {
    name: 'Warrior\'s Blessing',
    description: 'A ritual to bless those going into battle',
    frequency: 'SPECIAL' as const,
    effects: [{ type: 'COMBAT_BONUS' as const, value: 15, duration: 12000, description: 'Divine protection' }]
  },
  {
    name: 'Funeral Rites',
    description: 'Honoring those who have passed',
    frequency: 'SPECIAL' as const,
    effects: [{ type: 'MOOD_BOOST' as const, value: 10, duration: 24000, description: 'Peace in mourning' }]
  },
  {
    name: 'Marriage Ceremony',
    description: 'Blessing a new union',
    frequency: 'SPECIAL' as const,
    effects: [{ type: 'FERTILITY' as const, value: 25, duration: 72000, description: 'Blessed union' }]
  },
  {
    name: 'Trade Blessing',
    description: 'Blessing caravans before departure',
    frequency: 'SPECIAL' as const,
    effects: [{ type: 'TRADE_BONUS' as const, value: 15, duration: 48000, description: 'Prosperous journey' }]
  }
];

// Creation myth templates
const CREATION_MYTHS = [
  'In the beginning, there was only void. Then the Great Hand reached down and placed the first block. From that single cube, all of existence grew.',
  'The world was crafted by the Builder in seven days. On the first day, stone. On the second, earth. On the third, water. On the fourth, life. On the fifth, us. On the sixth, purpose. On the seventh, they rested, and watch us still.',
  'We are dreams of the Watcher, given form in blocks. Each of us is a thought made solid, a wish given life.',
  'Before time, there were two forces: Order and Chaos. Their eternal battle created the blocks we stand upon. We exist in the balance between them.',
  'The First Village emerged from the world itself, its people born fully formed. We are their descendants, inheriting their purpose.'
];

/**
 * Religion Manager
 */
export class ReligionManager {
  private deities: Map<string, Deity> = new Map();
  private rituals: Map<string, Ritual> = new Map();
  private beliefSystems: Map<string, BeliefSystem> = new Map();
  private prayers: Prayer[] = [];
  private sacredSites: Map<string, SacredSite> = new Map();
  private religiousOffices: Map<string, ReligiousOffice> = new Map();
  
  constructor() {
    logger.info('Religion Manager initialized');
  }

  /**
   * Create a belief system for a village
   */
  createBeliefSystem(villageId: string, villageName: string): BeliefSystem {
    // Generate creator deity
    const creatorDeity = this.generateDeity(DeityType.CREATOR, villageId);
    
    // Generate nature deity
    const natureDeity = this.generateDeity(DeityType.NATURE, villageId);
    
    // Generate basic rituals
    const rituals = this.generateBasicRituals(creatorDeity.id);
    
    // Choose creation myth
    const creationMyth = CREATION_MYTHS[Math.floor(Math.random() * CREATION_MYTHS.length)];
    
    const beliefSystem: BeliefSystem = {
      id: uuidv4(),
      name: `${villageName} Faith`,
      villageId,
      deityIds: [creatorDeity.id, natureDeity.id],
      ritualIds: rituals.map(r => r.id),
      creationMyth,
      afterlifeBeliefs: this.generateAfterlifeBeliefs(),
      moralCode: this.generateMoralCode(),
      holyDays: this.generateHolyDays(),
      sacredSites: [],
      heresies: [],
      orthodoxy: 50,
      piety: 50,
      createdAt: Date.now()
    };
    
    this.beliefSystems.set(beliefSystem.id, beliefSystem);
    
    logger.info(`Belief system created for ${villageName}`);
    
    return beliefSystem;
  }

  /**
   * Generate a deity
   */
  generateDeity(type: DeityType, worshippedByVillageId: string): Deity {
    const template = DEITY_TEMPLATES.find(t => t.type === type) || DEITY_TEMPLATES[0];
    const index = Math.floor(Math.random() * template.names.length);
    
    const deity: Deity = {
      id: uuidv4(),
      name: template.names[index],
      type,
      domain: template.domains[index % template.domains.length],
      symbol: template.symbols[index % template.symbols.length],
      description: template.descriptions[index % template.descriptions.length],
      origin: `Revealed to the founders of the village`,
      worshippedBy: [worshippedByVillageId],
      power: 50 + Math.floor(Math.random() * 30),
      favor: 0,
      createdAt: Date.now()
    };
    
    this.deities.set(deity.id, deity);
    
    return deity;
  }

  /**
   * Deify a bot (create ancestor/hero deity)
   */
  deifyBot(bot: Bot, reason: string): Deity {
    const deity: Deity = {
      id: uuidv4(),
      name: `${bot.name} the Ascended`,
      type: DeityType.HERO,
      domain: this.inferDomainFromBot(bot),
      symbol: '⭐',
      description: reason,
      origin: `Ascended from mortality after ${reason.toLowerCase()}`,
      associatedBotId: bot.id,
      worshippedBy: [bot.villageId],
      power: 30,
      favor: 50,
      createdAt: Date.now()
    };
    
    this.deities.set(deity.id, deity);
    
    logger.info(`Bot deified: ${bot.name}`);
    
    return deity;
  }

  /**
   * Infer deity domain from bot
   */
  private inferDomainFromBot(bot: Bot): string[] {
    const domains: string[] = [];
    
    if (bot.skills.combat > 70) domains.push('war', 'protection');
    if (bot.skills.farming > 70) domains.push('harvest', 'fertility');
    if (bot.skills.building > 70) domains.push('crafting', 'architecture');
    if (bot.skills.scholarship > 70) domains.push('knowledge', 'wisdom');
    if (bot.skills.leadership > 70) domains.push('governance', 'justice');
    
    if (domains.length === 0) {
      domains.push('ancestors', 'guidance');
    }
    
    return domains;
  }

  /**
   * Generate basic rituals
   */
  private generateBasicRituals(primaryDeityId: string): Ritual[] {
    const rituals: Ritual[] = [];
    
    for (const template of RITUAL_TEMPLATES.slice(0, 3)) {
      const ritual: Ritual = {
        id: uuidv4(),
        name: template.name,
        description: template.description,
        deityId: primaryDeityId,
        frequency: template.frequency,
        requirements: [],
        effects: template.effects,
        participantRoles: [],
        duration: 1000,
        timesPerformed: 0
      };
      
      this.rituals.set(ritual.id, ritual);
      rituals.push(ritual);
    }
    
    return rituals;
  }

  /**
   * Generate afterlife beliefs
   */
  private generateAfterlifeBeliefs(): string {
    const beliefs = [
      'The faithful return to the void, where they rest in eternal peace.',
      'The worthy are reborn into new bodies, continuing the cycle.',
      'Those who lived well join the Watcher in the sky realm.',
      'The dead become part of the earth, their essence feeding new life.',
      'Spirits of the departed linger to guide the living.',
      'After death, we become blocks ourselves, part of the world forever.'
    ];
    
    return beliefs[Math.floor(Math.random() * beliefs.length)];
  }

  /**
   * Generate moral code
   */
  private generateMoralCode(): string[] {
    const allTenets = [
      'Honor the Watcher who gave us form',
      'Care for your village as it cares for you',
      'Speak truth, for lies corrupt the soul',
      'Labor brings virtue; idleness brings decay',
      'Protect the young and honor the elders',
      'Share your harvest with those in need',
      'Build with purpose, destroy with reluctance',
      'Keep your promises as the blocks keep their form',
      'Face danger with courage, not recklessness',
      'Remember those who came before'
    ];
    
    // Select 5-7 random tenets
    const shuffled = allTenets.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5 + Math.floor(Math.random() * 3));
  }

  /**
   * Generate holy days
   */
  private generateHolyDays(): HolyDay[] {
    return [
      {
        id: uuidv4(),
        name: 'Foundation Day',
        description: 'Celebrating the founding of the village',
        dayOfYear: 1,
        duration: 1,
        celebrationRituals: [],
        mood: 'JOYFUL'
      },
      {
        id: uuidv4(),
        name: 'Harvest Festival',
        description: 'Giving thanks for the autumn bounty',
        dayOfYear: 240,
        duration: 3,
        celebrationRituals: [],
        mood: 'JOYFUL'
      },
      {
        id: uuidv4(),
        name: 'Remembrance',
        description: 'Honoring ancestors and the departed',
        dayOfYear: 300,
        duration: 1,
        celebrationRituals: [],
        mood: 'SOLEMN'
      },
      {
        id: uuidv4(),
        name: 'Light Festival',
        description: 'Welcoming back the light after winter',
        dayOfYear: 90,
        duration: 2,
        celebrationRituals: [],
        mood: 'JOYFUL'
      }
    ];
  }

  /**
   * Record a prayer
   */
  recordPrayer(
    botId: string,
    deityId: string,
    content: string,
    type: Prayer['type'],
    offering?: { resource: string; amount: number }
  ): Prayer {
    const prayer: Prayer = {
      id: uuidv4(),
      botId,
      deityId,
      content,
      type,
      offering,
      timestamp: Date.now()
    };
    
    this.prayers.push(prayer);
    
    // Update deity favor based on prayer
    const deity = this.deities.get(deityId);
    if (deity) {
      deity.favor = Math.min(100, deity.favor + (offering ? 5 : 1));
    }
    
    // Keep only recent prayers
    if (this.prayers.length > 1000) {
      this.prayers = this.prayers.slice(-1000);
    }
    
    return prayer;
  }

  /**
   * Perform a ritual
   */
  performRitual(ritualId: string, participants: string[]): RitualEffect[] | null {
    const ritual = this.rituals.get(ritualId);
    if (!ritual) return null;
    
    // Check requirements (simplified)
    if (participants.length < (ritual.participantRoles.length || 1)) {
      return null;
    }
    
    ritual.lastPerformed = Date.now();
    ritual.timesPerformed++;
    
    // Update deity favor
    if (ritual.deityId) {
      const deity = this.deities.get(ritual.deityId);
      if (deity) {
        deity.favor = Math.min(100, deity.favor + 10);
      }
    }
    
    logger.debug(`Ritual performed: ${ritual.name}`);
    
    return ritual.effects;
  }

  /**
   * Create a sacred site
   */
  createSacredSite(
    name: string,
    position: Position,
    type: SacredSite['type'],
    deityId?: string
  ): SacredSite {
    const site: SacredSite = {
      id: uuidv4(),
      name,
      description: `A ${type.toLowerCase().replace('_', ' ')} dedicated to spiritual practice`,
      position,
      deityId,
      type,
      power: 50,
      visitors: [],
      offerings: []
    };
    
    this.sacredSites.set(site.id, site);
    
    logger.info(`Sacred site created: ${name}`);
    
    return site;
  }

  /**
   * Visit a sacred site
   */
  visitSacredSite(siteId: string, botId: string): void {
    const site = this.sacredSites.get(siteId);
    if (site && !site.visitors.includes(botId)) {
      site.visitors.push(botId);
    }
  }

  /**
   * Make an offering at a sacred site
   */
  makeOffering(siteId: string, resource: string, amount: number): void {
    const site = this.sacredSites.get(siteId);
    if (site) {
      const existing = site.offerings.find(o => o.resource === resource);
      if (existing) {
        existing.amount += amount;
      } else {
        site.offerings.push({ resource, amount });
      }
      site.power = Math.min(100, site.power + amount);
    }
  }

  /**
   * Get belief system for a village
   */
  getVillageBeliefs(villageId: string): BeliefSystem | undefined {
    return Array.from(this.beliefSystems.values()).find(b => b.villageId === villageId);
  }

  /**
   * Get deity by ID
   */
  getDeity(deityId: string): Deity | undefined {
    return this.deities.get(deityId);
  }

  /**
   * Get all deities
   */
  getAllDeities(): Deity[] {
    return Array.from(this.deities.values());
  }

  /**
   * Get rituals for a deity
   */
  getRitualsForDeity(deityId: string): Ritual[] {
    return Array.from(this.rituals.values()).filter(r => r.deityId === deityId);
  }

  /**
   * Get sacred sites in village area
   */
  getSacredSitesNear(position: Position, radius: number): SacredSite[] {
    return Array.from(this.sacredSites.values()).filter(site => {
      const dx = site.position.x - position.x;
      const dz = site.position.z - position.z;
      return Math.sqrt(dx * dx + dz * dz) <= radius;
    });
  }

  /**
   * Answer a prayer (random chance based on favor)
   */
  maybeAnswerPrayer(prayerId: string): boolean {
    const prayer = this.prayers.find(p => p.id === prayerId);
    if (!prayer || prayer.answered !== undefined) return false;
    
    const deity = this.deities.get(prayer.deityId);
    if (!deity) return false;
    
    // Higher favor = higher chance of "answered" prayer
    const chance = (deity.favor + 50) / 200;  // 25% at -50, 75% at 100
    
    if (Math.random() < chance) {
      prayer.answered = true;
      logger.debug(`Prayer answered for ${prayer.botId}`);
      return true;
    }
    
    return false;
  }

  /**
   * Serialize for persistence
   */
  serialize(): {
    deities: Deity[];
    rituals: Ritual[];
    beliefSystems: BeliefSystem[];
    prayers: Prayer[];
    sacredSites: SacredSite[];
    religiousOffices: ReligiousOffice[];
  } {
    return {
      deities: Array.from(this.deities.values()),
      rituals: Array.from(this.rituals.values()),
      beliefSystems: Array.from(this.beliefSystems.values()),
      prayers: this.prayers,
      sacredSites: Array.from(this.sacredSites.values()),
      religiousOffices: Array.from(this.religiousOffices.values())
    };
  }

  /**
   * Load from persistence
   */
  load(data: {
    deities?: Deity[];
    rituals?: Ritual[];
    beliefSystems?: BeliefSystem[];
    prayers?: Prayer[];
    sacredSites?: SacredSite[];
    religiousOffices?: ReligiousOffice[];
  }): void {
    this.deities.clear();
    this.rituals.clear();
    this.beliefSystems.clear();
    this.sacredSites.clear();
    this.religiousOffices.clear();
    
    for (const deity of data.deities || []) {
      this.deities.set(deity.id, deity);
    }
    
    for (const ritual of data.rituals || []) {
      this.rituals.set(ritual.id, ritual);
    }
    
    for (const system of data.beliefSystems || []) {
      this.beliefSystems.set(system.id, system);
    }
    
    this.prayers = data.prayers || [];
    
    for (const site of data.sacredSites || []) {
      this.sacredSites.set(site.id, site);
    }
    
    for (const office of data.religiousOffices || []) {
      this.religiousOffices.set(office.id, office);
    }
    
    logger.info('Religion data loaded');
  }
}

// Singleton
let religionManagerInstance: ReligionManager | null = null;

export function getReligionManager(): ReligionManager {
  if (!religionManagerInstance) {
    religionManagerInstance = new ReligionManager();
  }
  return religionManagerInstance;
}

export function resetReligionManager(): void {
  religionManagerInstance = null;
}

export default ReligionManager;
