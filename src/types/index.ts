/**
 * BlockLife AI - Core Type Definitions
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * This file contains all the core type definitions for the BlockLife system.
 */

// ============================================================================
// ENUMS
// ============================================================================

/** Life stages a bot goes through */
export enum LifeStage {
  CHILD = 'CHILD',
  TEEN = 'TEEN',
  ADULT = 'ADULT',
  ELDER = 'ELDER'
}

/** Bot gender for family/reproduction logic */
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE'
}

/** Available roles/jobs for bots */
export enum Role {
  // Provider roles
  FARMER = 'FARMER',
  HUNTER = 'HUNTER',
  MINER = 'MINER',
  LUMBERJACK = 'LUMBERJACK',
  FISHER = 'FISHER',
  
  // Crafter roles
  BUILDER = 'BUILDER',
  TOOLMAKER = 'TOOLMAKER',
  ARTISAN = 'ARTISAN',
  
  // Service roles
  GUARD = 'GUARD',
  HEALER = 'HEALER',
  CARETAKER = 'CARETAKER',
  
  // Special roles
  CHIEF = 'CHIEF',
  ELDER_ROLE = 'ELDER_ROLE',
  SCHOLAR = 'SCHOLAR',
  SCOUT = 'SCOUT',
  TRADER = 'TRADER',
  
  // Default
  UNASSIGNED = 'UNASSIGNED'
}

/** Bot mood states */
export enum Mood {
  HAPPY = 'HAPPY',
  NEUTRAL = 'NEUTRAL',
  STRESSED = 'STRESSED',
  AFRAID = 'AFRAID',
  ANGRY = 'ANGRY',
  INSPIRED = 'INSPIRED'
}

/** Technological ages */
export enum TechAge {
  STONE = 'STONE',
  IRON = 'IRON',
  AGRICULTURAL = 'AGRICULTURAL',
  SETTLEMENT = 'SETTLEMENT',
  REDSTONE = 'REDSTONE'
}

/** Time of day in Minecraft */
export enum TimeOfDay {
  DAY = 'DAY',
  NIGHT = 'NIGHT',
  DAWN = 'DAWN',
  DUSK = 'DUSK'
}

/** Threat levels */
export enum ThreatLevel {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

/** Performance modes */
export enum PerformanceMode {
  ECO = 'ECO',
  NORMAL = 'NORMAL',
  PERFORMANCE = 'PERFORMANCE',
  AUTO = 'AUTO'
}

/** Village relation states */
export enum RelationState {
  ALLIED = 'ALLIED',
  FRIENDLY = 'FRIENDLY',
  NEUTRAL = 'NEUTRAL',
  TENSE = 'TENSE',
  HOSTILE = 'HOSTILE'
}

/** Faction alignments */
export enum FactionAlignment {
  PEACEFUL = 'PEACEFUL',
  NEUTRAL = 'NEUTRAL',
  AGGRESSIVE = 'AGGRESSIVE'
}

// ============================================================================
// BASIC INTERFACES
// ============================================================================

/** 3D position in Minecraft world */
export interface Position {
  x: number;
  y: number;
  z: number;
}

/** Bounding box for territory/areas */
export interface BoundingBox {
  min: Position;
  max: Position;
}

/** Inventory slot */
export interface InventorySlot {
  itemId: string;
  count: number;
  metadata?: Record<string, unknown>;
}

/** A known location */
export interface Location {
  id: string;
  name: string;
  position: Position;
  type: string;
  discoveredAt: number;
  lastVisited: number;
}

/** A memory/event the bot remembers */
export interface Memory {
  id: string;
  timestamp: number;
  type: string;
  description: string;
  participants: string[];
  significance: number; // 0-100
  emotionalImpact: number; // -100 to 100
}

/** Relationship with another bot */
export interface Relationship {
  targetId: string;
  type: 'FAMILY' | 'FRIEND' | 'RIVAL' | 'ENEMY' | 'MENTOR' | 'STUDENT' | 'PARTNER' | 'COWORKER';
  strength: number; // 0-100
  history: string[];
}

// ============================================================================
// BOT INTERFACES
// ============================================================================

/** Personality traits (0-100 scale) */
export interface PersonalityTraits {
  bravery: number;
  curiosity: number;
  sociability: number;
  industry: number;
  creativity: number;
  aggression: number;
  loyalty: number;
  wisdom: number;
}

/** Skills (0-100 scale) */
export interface SkillSet {
  mining: number;
  farming: number;
  building: number;
  combat: number;
  crafting: number;
  trading: number;
  leadership: number;
  scholarship: number;
}

/** Current needs state (0-100, higher = more urgent) */
export interface NeedsState {
  hunger: number;
  energy: number;
  safety: number;
  social: number;
  purpose: number;
}

/** Task that a bot is working on */
export interface Task {
  id: string;
  type: string;
  target?: Position | string;
  startedAt: number;
  progress: number; // 0-100
  priority: number;
  data?: Record<string, unknown>;
}

/** Flags for bot state */
export interface BotFlags {
  isDead: boolean;
  isIdle: boolean;
  isInDanger: boolean;
  needsAiDecision: boolean;
  isBackground: boolean; // Background bot uses rules only
}

/** Complete bot entity */
export interface Bot {
  // Identity
  id: string;
  name: string;
  
  // Life
  age: number;
  lifeStage: LifeStage;
  gender: Gender;
  
  // Family
  parentIds: string[];
  childIds: string[];
  partnerId?: string;
  
  // Society
  villageId: string;
  factionId?: string;
  role: Role;
  
  // Mind
  personality: PersonalityTraits;
  skills: SkillSet;
  needs: NeedsState;
  mood: Mood;
  memories: Memory[];
  relationships: Relationship[];
  
  // Physical
  health: number;
  position: Position;
  inventory: InventorySlot[];
  
  // Knowledge
  knownLocations: Location[];
  
  // Task State
  currentTask?: Task;
  taskQueue: Task[];
  lastDecisionAt: number;
  
  // Flags
  flags: BotFlags;
  
  // Meta
  createdAt: number;
  updatedAt: number;
  deathCause?: string;
}

// ============================================================================
// VILLAGE INTERFACES
// ============================================================================

/** A structure in the village */
export interface Structure {
  id: string;
  type: string;
  name: string;
  position: Position;
  size: BoundingBox;
  builtBy: string[];
  builtAt: number;
  condition: number; // 0-100
}

/** Village resource stockpile */
export interface ResourceStock {
  food: number;
  wood: number;
  stone: number;
  iron: number;
  gold: number;
  tools: number;
  weapons: number;
}

/** A village law/rule */
export interface Law {
  id: string;
  name: string;
  description: string;
  enactedAt: number;
  enactedBy: string;
}

/** Cultural trait of a village */
export interface CulturalTrait {
  id: string;
  name: string;
  type: 'WARLIKE' | 'PEACEFUL' | 'BUILDERS' | 'TRADERS' | 'EXPLORERS' | 'SCHOLARS' | 'ISOLATIONIST';
  strength: number; // 0-100
}

/** A tradition/recurring event */
export interface Tradition {
  id: string;
  name: string;
  description: string;
  frequency: number; // In simulation days
  lastOccurred: number;
}

/** A legend/story from history */
export interface Legend {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  aboutEvents: string[];
  aboutBots: string[];
}

/** Historical event record */
export interface HistoricalEvent {
  id: string;
  timestamp: number;
  type: string;
  participants: string[];
  location: string;
  description: string;
  significance: number; // 0-100
}

/** Relation to another village */
export interface VillageRelation {
  targetVillageId: string;
  state: RelationState;
  history: string[];
  lastInteraction: number;
}

/** Tech discovery */
export interface Discovery {
  id: string;
  name: string;
  description: string;
  discoveredAt: number;
  discoveredBy: string;
  effects: string[];
}

/** Complete village entity */
export interface Village {
  id: string;
  name: string;
  
  // Location
  centerPosition: Position;
  territory: BoundingBox;
  
  // Population
  memberIds: string[];
  founderIds: string[];
  
  // Infrastructure
  structures: Structure[];
  stockpile: ResourceStock;
  
  // Status
  techAge: TechAge;
  discoveries: Discovery[];
  prosperity: number;
  defenseRating: number;
  
  // Governance
  leaderId?: string;
  councilIds: string[];
  laws: Law[];
  
  // Culture
  culturalTraits: CulturalTrait[];
  traditions: Tradition[];
  legends: Legend[];
  
  // Relations
  villageRelations: VillageRelation[];
  
  // History
  foundedAt: number;
  historicalEvents: HistoricalEvent[];
}

// ============================================================================
// FACTION INTERFACES
// ============================================================================

/** Faction goal */
export interface FactionGoal {
  id: string;
  type: string;
  description: string;
  priority: number;
  progress: number;
}

/** Relation to another faction */
export interface FactionRelation {
  targetFactionId: string;
  state: RelationState;
  history: string[];
}

/** Faction entity */
export interface Faction {
  id: string;
  name: string;
  villageIds: string[];
  memberIds: string[];
  alignment: FactionAlignment;
  goals: FactionGoal[];
  relations: FactionRelation[];
  foundedAt: number;
}

// ============================================================================
// CIVILIZATION INTERFACES
// ============================================================================

/** Threat zone in the world */
export interface ThreatZone {
  id: string;
  position: Position;
  radius: number;
  threatType: string;
  level: ThreatLevel;
  lastUpdated: number;
}

/** Global event affecting civilization */
export interface GlobalEvent {
  id: string;
  timestamp: number;
  type: string;
  affectedVillages: string[];
  description: string;
  resolved: boolean;
}

/** A myth in the world */
export interface Myth {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  spreadTo: string[]; // Village IDs
}

/** Civilization statistics */
export interface CivilizationStats {
  totalBotsEverLived: number;
  totalDeaths: number;
  totalBirths: number;
  warsWaged: number;
  structuresBuilt: number;
  maxPopulation: number;
  currentPopulation: number;
}

/** Simulation configuration */
export interface SimulationConfig {
  performanceMode: PerformanceMode;
  maxBots: number;
  tickRateMs: number;
  aiEnabled: boolean;
  autoSave: boolean;
  saveIntervalMs: number;
}

/** Current era/global age */
export enum Era {
  DAWN = 'DAWN', // Just starting
  GROWTH = 'GROWTH', // Expanding
  GOLDEN = 'GOLDEN', // Prospering
  DECLINE = 'DECLINE', // Declining
  DARK = 'DARK' // Crisis
}

/** Complete civilization state */
export interface CivilizationState {
  id: string;
  
  // Time
  startedAt: number;
  currentTick: number;
  simulationDays: number;
  
  // World
  villages: Village[];
  factions: Faction[];
  
  // Global State
  era: Era;
  globalEvents: GlobalEvent[];
  threatZones: ThreatZone[];
  
  // Lore
  worldMythology: Myth[];
  heroesOfLegend: string[];
  
  // Settings
  config: SimulationConfig;
  
  // Stats
  stats: CivilizationStats;
}

// ============================================================================
// AI INTERFACES
// ============================================================================

/** Bot intent types */
export type BotIntent =
  // Basic
  | 'IDLE'
  | 'SLEEP'
  | 'EAT'
  
  // Work
  | 'TEND_FARM'
  | 'HARVEST_CROPS'
  | 'MINE_RESOURCES'
  | 'CHOP_WOOD'
  | 'BUILD_STRUCTURE'
  | 'CRAFT_ITEM'
  
  // Social
  | 'SOCIALIZE'
  | 'VISIT_FAMILY'
  | 'ATTEND_GATHERING'
  | 'TRADE'
  
  // Defense
  | 'PATROL_AREA'
  | 'DEFEND_LOCATION'
  | 'FLEE_TO_SAFETY'
  | 'RAISE_ALARM'
  
  // Special
  | 'EXPLORE_TERRAIN'
  | 'RESEARCH_TECH'
  | 'TEACH_SKILL'
  | 'LEAD_MEETING';

/** Context sent to AI for a bot decision */
export interface AiBotContext {
  id: string;
  role: Role;
  lifeStage: LifeStage;
  needs: NeedsState;
  mood: Mood;
  locationTag: string;
  nearbyThreatLevel: ThreatLevel;
  resourceContext: string[];
  recentEvents: string[];
  currentTaskType?: string;
}

/** World context for AI */
export interface AiWorldContext {
  timeOfDay: TimeOfDay;
  era: string;
  globalThreatLevel: ThreatLevel;
}

/** Batch request to AI */
export interface AiBotBatchRequest {
  mode: 'BOT_BATCH_DECISION';
  world: AiWorldContext;
  bots: AiBotContext[];
}

/** Single bot decision from AI */
export interface AiBotDecision {
  id: string;
  intent: BotIntent;
  details?: Record<string, unknown>;
}

/** Batch response from AI */
export interface AiBotBatchResponse {
  decisions: AiBotDecision[];
}

/** Civilization-level advice request */
export interface AiCivContext {
  era: Era;
  villages: {
    id: string;
    name: string;
    population: number;
    prosperity: number;
    threats: string[];
  }[];
  recentGlobalEvents: string[];
  resources: ResourceStock;
}

/** Civilization advice from AI */
export interface AiCivAdvice {
  priorities: string[];
  suggestions: string[];
  warnings: string[];
}

// ============================================================================
// CONFIG INTERFACES
// ============================================================================

/** Minecraft Edition type */
export type MinecraftEdition = 'java' | 'bedrock';

/** Minecraft connection config */
export interface MinecraftConfig {
  host: string;
  port: number;
  version: string;
  usernamePrefix: string;
  edition: MinecraftEdition;
  /** Bedrock-specific: Xbox Live authentication */
  bedrockAuth?: {
    /** Use device auth flow */
    deviceAuth?: boolean;
    /** Cache auth tokens */
    cacheTokens?: boolean;
  };
}

/** AI configuration */
export interface AiConfig {
  provider: 'local' | 'remote' | 'ollama' | 'openai' | 'stub';
  model: string;
  maxBatchSize: number;
  minBatchSize: number;
  decisionIntervalMs: number;
  timeoutMs: number;
  fallbackEnabled: boolean;
  /** Local model configuration */
  local?: {
    modelPath: string;
    contextSize: number;
    threads: number;
    gpuLayers: number;
  };
  /** Remote API configuration */
  remote?: {
    apiUrl: string;
    apiKey?: string;
    headers?: Record<string, string>;
  };
  /** Ollama configuration */
  ollama?: {
    host: string;
    port: number;
  };
  /** OpenAI configuration */
  openai?: {
    apiKey: string;
    organization?: string;
    baseUrl?: string;
  };
}

/** Logging configuration */
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  categories: string[];
  file: string;
  maxSize: string;
  maxFiles: number;
}

/** Data/persistence configuration */
export interface DataConfig {
  dir: string;
  snapshotsDir: string;
  maxSnapshots: number;
}

/** Performance profile */
export interface PerformanceProfile {
  maxBots: number;
  aiBatchSize: number;
  aiDecisionIntervalMs: number;
  tickRateMs: number;
  backgroundBotFraction: number;
}

/** Complete application configuration */
export interface AppConfig {
  minecraft: MinecraftConfig;
  simulation: SimulationConfig;
  ai: AiConfig;
  logging: LoggingConfig;
  data: DataConfig;
}

// ============================================================================
// ORCHESTRATOR INTERFACES
// ============================================================================

/** Orchestrator statistics */
export interface OrchestratorStats {
  tickRate: number;
  lastTickDurationMs: number;
  activeBots: number;
  queuedAiRequests: number;
  avgAiLatencyMs: number;
  cpuLoadEstimate: number;
  memoryUsageMb: number;
  uptime: number;
}

/** Event emitted by the orchestrator */
export interface OrchestratorEvent {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}
