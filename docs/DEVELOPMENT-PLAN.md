# BlockLife AI - Complete Development Plan

**Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill**  
**Project:** BlockLife – Minecraft Civilization Engine  
**Version:** 1.0 Complete Specification

---

# PART 1: VISION & CONCEPT

## 1.1 The Dream

BlockLife is a **living Minecraft civilization** that runs autonomously on your device. Not a script. Not an automation tool. A tiny universe, evolving on your phone.

**The Core Experience:**
- You set it up, walk away
- Come back hours or days later
- The world has changed
- Bots built new structures you've never seen
- Some bots died, some had children
- Villages grew, split, or went to war
- They talk about things that happened when you weren't there
- They know they're in a block world (Jumanji vibe)

**This is civilization in your pocket - for real.**

## 1.2 What Makes BlockLife Different

| Traditional Bots | BlockLife |
|-----------------|-----------|
| Follow scripts | Make decisions |
| Do tasks | Live lives |
| Exist in isolation | Form societies |
| Reset on restart | Remember history |
| Serve the player | Exist for themselves |

## 1.3 The Jumanji Factor

Bots in BlockLife are **aware** they exist in a block world:
- They comment on their reality ("Another night of cubic moons...")
- They reference "The Player" (you) as a god-like entity
- They develop myths about the nature of their world
- They wonder about what lies beyond the render distance

This self-awareness creates emergent storytelling that's genuinely entertaining to watch.

## 1.4 Target Platform

**Primary Target:** Motorola One 5G UW Ace running Termux on Android

**Constraints:**
- Must be lightweight and CPU-efficient
- GPU optional but not required
- Must run for hours/days without intervention
- Must not overheat the device
- Must scale from 20-50 bots up to 100+ with optimization

---

# PART 2: SYSTEM ARCHITECTURE

## 2.1 High-Level Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BLOCKLIFE ENGINE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐                       │
│  │   ORCHESTRATOR   │◄──►│    AI CORE       │                       │
│  │   (Main Loop)    │    │  (Brain Service) │                       │
│  └────────┬─────────┘    └──────────────────┘                       │
│           │                                                          │
│  ┌────────▼─────────┐    ┌──────────────────┐                       │
│  │   BOT MANAGER    │◄──►│  MC ADAPTER      │◄──► Minecraft Server  │
│  │   (All Agents)   │    │  (mineflayer)    │                       │
│  └────────┬─────────┘    └──────────────────┘                       │
│           │                                                          │
│  ┌────────▼─────────┐    ┌──────────────────┐                       │
│  │   SIM ENGINE     │◄──►│    STORAGE       │                       │
│  │ (Civilization)   │    │  (Persistence)   │                       │
│  └──────────────────┘    └──────────────────┘                       │
│                                                                      │
│  ┌──────────────────┐    ┌──────────────────┐                       │
│  │   PERFORMANCE    │    │   TELEMETRY      │                       │
│  │   GOVERNOR       │    │   DASHBOARD      │                       │
│  └──────────────────┘    └──────────────────┘                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 2.2 Component Details

### 2.2.1 Orchestrator
**The heartbeat of the system**

Responsibilities:
- Run the main tick loop
- Coordinate all other modules
- Manage timing (sim ticks vs AI ticks)
- Handle startup, shutdown, crash recovery
- Monitor performance and throttle as needed

Key Design:
```
Main Loop (every 200-500ms):
1. Update world state snapshots
2. Run rule-based behaviors (cheap)
3. Schedule AI decisions for bots that need them
4. Apply completed AI decisions
5. Save state if due
6. Check performance metrics
```

### 2.2.2 AI Core (Brain Service)
**Single brain, many bots**

Key Principle: Bots do NOT each run their own AI. Instead:
- Orchestrator collects bots needing decisions
- Batches them into a single request (5-15 bots)
- AI returns structured decisions for all at once
- Decisions are parsed and distributed

This makes AI affordable even on mobile.

AI Responsibilities:
- Accept batched bot contexts
- Return structured JSON decisions
- Support different decision modes (micro/macro)
- Handle failures gracefully with fallbacks

### 2.2.3 Bot Manager
**Tracks all living bots**

Responsibilities:
- Maintain registry of all active bots
- Route decisions to individual agents
- Track which bots need AI decisions
- Coordinate perception sharing (bots in same area share world data)

### 2.2.4 MC Adapter (Minecraft Interface)
**Bridge to the block world**

Uses: mineflayer library for Java Edition

Responsibilities:
- Connect to Minecraft server
- Read world state (blocks, entities, time, weather)
- Execute bot actions (move, mine, place, craft, attack)
- Handle pathfinding via mineflayer-pathfinder
- Provide abstracted interface so rest of system doesn't touch raw protocol

### 2.2.5 Simulation Engine
**Civilization logic - independent of Minecraft**

This module handles everything "civilizational":
- Village management
- Role/job assignment
- Family and reproduction
- Economy and resources
- Tech tree progression
- Faction politics
- Diplomacy and warfare

Key Design: This runs even if Minecraft isn't connected. It's pure logic.

### 2.2.6 Storage Layer
**Resilient persistence**

Approach: SQLite preferred, JSON fallback

Stores:
- Bot profiles (identity, traits, skills, memories)
- Village data (population, structures, stockpiles)
- Civilization state (era, events, cultural traits)
- Historical logs (for lore generation)

Snapshot Strategy:
- Quick snapshots every 30-60 seconds
- Full snapshots every 5-10 minutes
- Keep last 10 snapshots for recovery
- Archive old states daily

### 2.2.7 Performance Governor
**Keep the phone cool and happy**

Three-layer system:

**Layer 1: Real-Time Monitor**
- CPU % (running average)
- Time per tick
- AI latency
- Memory usage
- Device temperature (via Termux API)

**Layer 2: Adaptive Load Balancer**
- Dynamically adjust: AI batch size, tick frequency
- Classify bots as Foreground (full AI) or Background (rules only)
- Redistribute load when metrics exceed thresholds

**Layer 3: Device Health Modes**

| Mode | Max Bots | AI Calls/min | When Active |
|------|----------|--------------|-------------|
| ECO | 15-30 | 5-10 | Device warm/hot |
| NORMAL | 30-60 | 15-25 | Standard use |
| GAME-ON | 60-120+ | 30-60 | Cool, charging |

Auto-selects based on conditions. User can override.

### 2.2.8 Telemetry Dashboard
**See what's happening**

CLI-first dashboard showing:
```
BlockLife Dashboard
───────────────────────────────────────
Profile: NORMAL | Uptime: 4h 23m

Population: 42 bots across 2 villages
├── Oakridge (28): 12 farmers, 8 builders, 5 guards, 3 miners
└── Stonefall (14): 6 farmers, 4 builders, 2 guards, 2 miners

Era: Settlement Age | Threat: LOW

Resources:
├── Food: 1,200 (OK)
├── Wood: 800
├── Stone: 450
└── Iron: 90

AI: 220ms avg latency | 18/30 requests per minute
Perf: 45ms tick | 52ms avg | CPU 42%

Recent Events:
├── [2m ago] Elder Marcus died of old age
├── [5m ago] New baby born: Luna (Oakridge)
└── [12m ago] Zombie raid repelled at north gate
```

---

# PART 3: DATA MODELS

## 3.1 Bot Entity

Every bot is a persistent individual with:

```typescript
interface Bot {
  // Identity
  id: string;                    // Unique identifier
  name: string;                  // Generated or inherited name
  
  // Life
  age: number;                   // In simulation time units
  lifeStage: LifeStage;          // CHILD | TEEN | ADULT | ELDER
  gender: Gender;                // For family/reproduction logic
  
  // Family
  parentIds: string[];           // Up to 2 parents
  childIds: string[];            // All children
  partnerId?: string;            // Current partner
  
  // Society
  villageId: string;             // Home village
  factionId?: string;            // Political alignment
  role: Role;                    // Current job/role
  
  // Personality (0-100 each, set at birth, mostly static)
  personality: {
    bravery: number;             // Fight or flight tendency
    curiosity: number;           // Exploration drive
    sociability: number;         // Need for company
    industry: number;            // Work ethic
    creativity: number;          // Innovation tendency
    aggression: number;          // Conflict tendency
    loyalty: number;             // Group vs self priority
    wisdom: number;              // Long-term thinking
  };
  
  // Skills (0-100, grow with practice)
  skills: {
    mining: number;
    farming: number;
    building: number;
    combat: number;
    crafting: number;
    trading: number;
    leadership: number;
    scholarship: number;
  };
  
  // Current State
  needs: {
    hunger: number;              // 0=full, 100=starving
    energy: number;              // 0=rested, 100=exhausted
    safety: number;              // 0=safe, 100=terrified
    social: number;              // 0=fulfilled, 100=lonely
    purpose: number;             // 0=fulfilled, 100=aimless
  };
  
  mood: Mood;                    // HAPPY | NEUTRAL | STRESSED | AFRAID | ANGRY | INSPIRED
  health: number;                // 0-100, death at 0
  
  // Physical
  position: { x: number; y: number; z: number };
  inventory: InventorySlot[];
  
  // Memory
  knownLocations: Location[];    // Places this bot remembers
  memories: Memory[];            // Significant events
  relationships: Relationship[]; // Feelings toward other bots
  
  // Task State
  currentTask?: Task;
  taskQueue: Task[];
  lastDecisionAt: number;
  needsAiDecision: boolean;
  
  // Meta
  createdAt: number;
  updatedAt: number;
  deathCause?: string;           // If dead
}
```

## 3.2 Village Entity

```typescript
interface Village {
  id: string;
  name: string;                  // Generated based on location/culture
  
  // Location
  centerPosition: Position;
  territory: BoundingBox;        // Claimed area
  
  // Population
  memberIds: string[];           // All bots living here
  founderIds: string[];          // Original settlers
  
  // Infrastructure
  structures: Structure[];       // Buildings, farms, walls
  stockpile: {
    food: number;
    wood: number;
    stone: number;
    iron: number;
    gold: number;
    tools: number;
    weapons: number;
  };
  
  // Status
  techAge: TechAge;              // SURVIVAL | SETTLEMENT | TOOL | TRADE | REDSTONE
  discoveries: Discovery[];      // Tech/knowledge unlocked
  prosperity: number;            // 0-100 derived metric
  defenseRating: number;         // Military strength
  
  // Governance
  leaderId?: string;             // Current chief/leader
  councilIds: string[];          // Advisory council
  laws: Law[];                   // Village rules
  
  // Culture
  culturalTraits: CulturalTrait[];  // WARLIKE | PEACEFUL | BUILDERS | TRADERS etc
  traditions: Tradition[];       // Recurring events/practices
  legends: Legend[];             // Stories from history
  
  // Relations
  villageRelations: VillageRelation[];  // Toward other villages
  
  // History
  foundedAt: number;
  historicalEvents: HistoricalEvent[];
}
```

## 3.3 Civilization State

```typescript
interface CivilizationState {
  id: string;
  
  // Time
  startedAt: number;
  currentTick: number;
  simulationDays: number;        // In-world days
  
  // World
  villages: Village[];
  factions: Faction[];
  
  // Global State
  era: Era;                      // Overall civilization advancement
  globalEvents: GlobalEvent[];   // Cross-village events
  threatZones: ThreatZone[];     // Known dangerous areas
  
  // Lore
  worldMythology: Myth[];        // Generated stories
  heroesOfLegend: string[];      // Famous historical bots
  
  // Settings
  config: SimulationConfig;
  
  // Stats
  stats: {
    totalBotsEverLived: number;
    totalDeaths: number;
    totalBirths: number;
    warsWaged: number;
    structuresBuilt: number;
    maxPopulation: number;
  };
}
```

---

# PART 4: BOT PSYCHOLOGY & DECISION SYSTEM

## 4.1 The Bot Mind

Bots have a layered decision system:

```
┌─────────────────────────────────────────────┐
│           BOT MIND ARCHITECTURE             │
├─────────────────────────────────────────────┤
│                                             │
│  Layer 4: PERSONALITY                       │
│  ├── Static traits from birth               │
│  ├── Inherited from parents                 │
│  └── Colors all decisions                   │
│                                             │
│  Layer 3: LONG-TERM GOALS                   │
│  ├── Career/life aspirations                │
│  ├── Relationship goals                     │
│  ├── Personal projects                      │
│  └── Updated by AI occasionally             │
│                                             │
│  Layer 2: CURRENT STATE                     │
│  ├── Needs (hunger, safety, social)         │
│  ├── Mood                                   │
│  ├── Active task                            │
│  └── Updated every tick                     │
│                                             │
│  Layer 1: IMMEDIATE REACTIONS               │
│  ├── Danger response (flee/fight)           │
│  ├── Opportunity response                   │
│  ├── Social triggers                        │
│  └── Rule-based, no AI needed               │
│                                             │
└─────────────────────────────────────────────┘
```

## 4.2 Need System

Each need runs 0-100 where higher = more urgent:

| Need | Decay Rate | Satisfied By |
|------|-----------|--------------|
| Hunger | +2/min active, +1/min resting | Eating food |
| Energy | +1/min active, -5/min sleeping | Sleep |
| Safety | Based on environment | Safe location, guards |
| Social | +0.5/min alone, -3/min with others | Social interaction |
| Purpose | +0.3/min idle, -2/min working | Completing tasks |

**Critical Thresholds:**
- Need > 70: Urgent, affects mood
- Need > 85: Critical, forces action
- Need = 100: Extreme consequences (starvation, collapse, etc.)

## 4.3 Decision Priority

Bots prioritize decisions by urgency:

| Priority | Category | Examples | Method |
|----------|----------|----------|--------|
| P0 | Survival | Flee danger, starving | Hard rules |
| P1 | Critical Needs | Eat, sleep, find safety | Threshold rules |
| P2 | Job Duties | Farm, mine, guard | Role state machine |
| P3 | Social | Chat, visit family | AI-guided |
| P4 | Personal | Learn, build project | AI-guided |
| P5 | Idle | Wander, rest, observe | Random |

## 4.4 Personality Effects

Each trait modifies behavior:

| Trait | Low (0-30) | High (70-100) |
|-------|------------|---------------|
| Bravery | Flees early, avoids danger | Stands ground, protects others |
| Curiosity | Stays home, routine-focused | Explores, tries new things |
| Sociability | Solitary, quick social decay | Seeks company, slow social decay |
| Industry | Works slowly, takes breaks | Works fast, rarely idles |
| Creativity | Follows templates exactly | Varies builds, experiments |
| Aggression | Avoids conflict | Quick to fight |
| Loyalty | Self-interested | Sacrifices for group |
| Wisdom | Impulsive | Plans ahead |

## 4.5 Mood System

Mood is derived from needs and recent events:

```
HAPPY: All needs < 40, positive recent events
NEUTRAL: Average state
STRESSED: Multiple needs > 60
AFRAID: Safety > 70 OR recent threat
ANGRY: Aggression high + negative event
INSPIRED: Purpose low + recent achievement
```

Mood affects:
- Work efficiency
- Social interactions
- Decision quality
- Dialogue generation

---

# PART 5: ROLE & JOB SYSTEM

## 5.1 Role Categories

```
PRIMARY ROLES (Each bot has one)
├── PROVIDER ROLES
│   ├── Farmer - Grow and harvest crops
│   ├── Hunter - Kill mobs for food/materials
│   ├── Miner - Gather stone, ore, minerals
│   ├── Lumberjack - Gather wood
│   └── Fisher - Catch fish
│
├── CRAFTER ROLES
│   ├── Builder - Construct structures
│   ├── Toolmaker - Craft tools and equipment
│   └── Artisan - Decorative/advanced crafting
│
├── SERVICE ROLES
│   ├── Guard - Defense and patrol
│   ├── Healer - Treat injured/sick
│   └── Caretaker - Tend children/elders
│
├── SPECIAL ROLES
│   ├── Chief - Village leadership
│   ├── Elder - Wisdom, conflict resolution
│   ├── Scholar - Research, tech advancement
│   ├── Scout - Exploration, intelligence
│   └── Trader - Inter-village commerce
│
└── UNASSIGNED
    └── Children, new arrivals, transients
```

## 5.2 Role Assignment Logic

When assigning roles:

1. **Check Village Needs**
   - Low food? More farmers
   - Under attack? More guards
   - Building project? More builders

2. **Check Bot Aptitude**
   - High farming skill → Farmer candidate
   - High combat skill → Guard candidate
   - High building skill → Builder candidate

3. **Check Bot Personality**
   - High bravery + aggression → Guard
   - High curiosity → Scout/Scholar
   - High industry → Any provider role

4. **AI Decides Edge Cases**
   - When aptitudes conflict
   - When village needs are balanced
   - For leadership positions

## 5.3 Role State Machines

Each role has a state machine for routine behavior:

**Farmer State Machine:**
```
IDLE
  ↓ (check for work)
CHECK_FIELDS
  ↓ (crops ready?)
  ├── Yes → HARVEST
  └── No → CHECK_SEEDS
          ↓ (seeds available?)
          ├── Yes → PLANT
          └── No → GET_SEEDS
HARVEST → DEPOSIT_FOOD → IDLE
PLANT → IDLE
GET_SEEDS → (from storage) → PLANT
```

**Guard State Machine:**
```
IDLE
  ↓ (check for threats)
SCAN_AREA
  ↓ (threat detected?)
  ├── Yes → ENGAGE_THREAT
  │         ↓ (threat level)
  │         ├── Low → ATTACK
  │         └── High → RAISE_ALARM → ATTACK
  └── No → (time of day?)
          ├── Day → REST_AT_POST
          └── Night → PATROL
PATROL → (patrol route) → SCAN_AREA
ATTACK → (enemy dead?) → SCAN_AREA
```

---

# PART 6: VILLAGE & CIVILIZATION SYSTEMS

## 6.1 Village Lifecycle

```
FOUNDING (1-3 bots)
├── Find suitable location
├── Build initial shelter
├── Establish basic food source
└── Survival focus

    ↓ (population 4-8)

SURVIVAL (4-8 bots)
├── Basic role differentiation
├── First real structures
├── Food surplus begins
└── First deaths/births

    ↓ (population 9-20)

GROWTH (9-20 bots)
├── Specialized roles emerge
├── Multiple structure types
├── Economy basics
└── First generation of children

    ↓ (population 20-40)

STABILITY (20-40 bots)
├── Full role spectrum
├── Established economy
├── Traditions begin
├── Political structures
└── Inter-village contact

    ↓ (population 40+)

MATURITY
├── Can PROSPER (expand, grow wealthy)
├── Can DECLINE (disasters, bad leadership)
└── Can SPLIT (form new village)
```

## 6.2 Tech Tree / Ages

Ages are unlocked by cumulative achievements:

### Stone Age (Starting)
- **Unlocked:** Basic tools, wooden structures, fire
- **Buildings:** Shelter, campfire, basic storage
- **Triggers Next:** First iron tool crafted

### Iron Age
- **Unlocked:** Iron tools, stone buildings, basic farms
- **Buildings:** Stone houses, furnaces, crop farms
- **Triggers Next:** First automated mechanism OR first trade

### Agricultural Age
- **Unlocked:** Advanced farms, food surplus, irrigation
- **Buildings:** Barns, wells, large farms
- **Triggers Next:** Population > 30 AND surplus food

### Settlement Age
- **Unlocked:** Specialized buildings, roads, town layout
- **Buildings:** Town hall, marketplace, walls
- **Triggers Next:** First redstone mechanism

### Redstone Age
- **Unlocked:** Automation, complex mechanisms
- **Buildings:** Automated farms, elevators, defenses
- **Triggers Next:** (Future expansion)

### Discoveries (Within Ages)
Individual unlocks earned by:
- Scholar research
- Accidental discovery
- AI suggestion based on need

Examples: Irrigation, Crop Rotation, Iron Smelting, Defensive Walls

## 6.3 Economy System

**Resource Flow:**
```
GATHERERS (Farmers, Miners, etc.)
    ↓
VILLAGE STOCKPILE (Central storage)
    ↓
DISTRIBUTION (Based on need & role)
    ↓
CRAFTERS (Turn raw → processed)
    ↓
STOCKPILE (Finished goods)
```

**Distribution Priority:**
1. Survival needs (food to hungry)
2. Active tasks (materials to builders)
3. Tool replacement
4. Stockpile surplus

**Inter-Village Trade (Later phases):**
- Surplus detection
- Trade route establishment
- Caravan/trader bots
- Value exchange

## 6.4 Family & Reproduction

**Reproduction Conditions:**
1. Two adults of compatible pairing
2. Positive relationship between them
3. Village food surplus exists
4. Housing available
5. Random chance (modified by relationship strength)

**Child Creation:**
- Inherits traits: Average of parents ± random (0-15)
- Inherits skills: Start at 0, higher potential
- Given unique name
- Assigned to family group

**Life Stages:**
| Stage | Duration | Can Work | Can Reproduce | Can Lead |
|-------|----------|----------|---------------|----------|
| Child | 0-20% of lifespan | No | No | No |
| Teen | 20-35% | Limited | No | No |
| Adult | 35-80% | Yes | Yes | Yes |
| Elder | 80-100% | Limited | No | Advisory |

**Death Causes:**
- Old age (guaranteed after max lifespan)
- Combat
- Starvation
- Accident
- Disease (if implemented)

---

# PART 7: AI INTEGRATION

## 7.1 Design Philosophy

**AI is for decisions, not mechanics:**

AI Decides:
- What job should this bot pursue?
- Should the village expand?
- How to resolve this conflict?
- What should this bot say?
- What are civilization priorities?

Code Executes:
- Pathfinding to locations
- Block placement
- Combat mechanics
- Resource calculations
- All timing and physics

## 7.2 Request/Response Protocol

**Bot Batch Decision Request:**
```json
{
  "mode": "BOT_BATCH_DECISION",
  "world": {
    "timeOfDay": "DAY",
    "era": "SETTLEMENT_AGE",
    "globalThreatLevel": "LOW"
  },
  "bots": [
    {
      "id": "bot_12",
      "role": "FARMER",
      "lifeStage": "ADULT",
      "mood": "NEUTRAL",
      "needs": { "hunger": 20, "safety": 80, "social": 40, "purpose": 70 },
      "locationTag": "VILLAGE_CENTER",
      "nearbyThreatLevel": "NONE",
      "resourceContext": ["FOOD_STOCK_LOW", "CROPS_READY"],
      "recentEvents": ["FINISHED_HARVEST", "ATE_MEAL"],
      "currentTask": null
    }
  ]
}
```

**Bot Batch Decision Response:**
```json
{
  "decisions": [
    {
      "id": "bot_12",
      "intent": "TEND_FARM",
      "details": {
        "targetLocation": "FIELD_WEST",
        "priority": "HIGH",
        "reason": "Food stock critically low"
      }
    }
  ]
}
```

## 7.3 Available Intents

```typescript
type BotIntent =
  // Basic
  | "IDLE"
  | "SLEEP"
  | "EAT"
  
  // Work
  | "TEND_FARM"
  | "HARVEST_CROPS"
  | "MINE_RESOURCES"
  | "CHOP_WOOD"
  | "BUILD_STRUCTURE"
  | "CRAFT_ITEM"
  
  // Social
  | "SOCIALIZE"
  | "VISIT_FAMILY"
  | "ATTEND_GATHERING"
  | "TRADE"
  
  // Defense
  | "PATROL_AREA"
  | "DEFEND_LOCATION"
  | "FLEE_TO_SAFETY"
  | "RAISE_ALARM"
  
  // Special
  | "EXPLORE_TERRAIN"
  | "RESEARCH_TECH"
  | "TEACH_SKILL"
  | "LEAD_MEETING";
```

## 7.4 Fallback System

When AI is unavailable or slow, use rule-based fallbacks:

```typescript
function getFallbackDecision(bot: Bot): BotIntent {
  // P0: Survival
  if (bot.needs.safety > 85) return "FLEE_TO_SAFETY";
  if (bot.needs.hunger > 85) return "EAT";
  
  // P1: Critical needs
  if (bot.needs.hunger > 70) return "EAT";
  if (bot.needs.energy > 80) return "SLEEP";
  if (bot.needs.safety > 70) return "FLEE_TO_SAFETY";
  
  // P2: Role default
  switch (bot.role) {
    case "FARMER": return "TEND_FARM";
    case "MINER": return "MINE_RESOURCES";
    case "GUARD": return "PATROL_AREA";
    case "BUILDER": return "BUILD_STRUCTURE";
    default: return "IDLE";
  }
}
```

## 7.5 Prompt Optimization

**Compression Strategy:**
Instead of verbose descriptions, use codes:
```
LOC=VILLAGE_FARM_RING_W
THREAT=ZOMBIE_FREQ_LOW_E  
STOCK_FOOD=LOW
ROLE=FARMER
STATE=IDLE_HUNGRY
```

**System Prompt (sent once):**
```
You control agents in a Minecraft-like world. Output ONLY valid JSON.
Each agent needs ONE action from: [IDLE, EAT, SLEEP, WORK, SOCIALIZE, FLEE, DEFEND, EXPLORE].
Consider their role, needs, and situation.
```

**Batch Size:** 5-15 bots per request
**Decision Interval:** 5-15 seconds per bot

---

# PART 8: AWARENESS & LORE SYSTEM

## 8.1 Self-Awareness

Bots know they're in a block world. They occasionally comment:

**On Their Reality:**
- "Another cubic sunset. Beautiful in its own way."
- "I wonder what lies beyond the fog..."
- "The blocks speak if you listen. Or maybe I'm just tired."

**On The Player:**
- "The Watcher is observing us today."
- "Grandfather spoke of the days when the Great One walked among us."
- "I pray the Sky-Being favors our harvest."

**On Events:**
- "I will never forget the night the green ones came."
- "My father built this very wall. His hands are still in the stone."

## 8.2 History Logging

All significant events are logged:
```typescript
interface HistoricalEvent {
  timestamp: number;
  type: EventType;
  participants: string[];
  location: string;
  description: string;
  significance: number; // 0-100, affects retention
}
```

**Event Types:**
- BIRTH, DEATH, MARRIAGE
- BATTLE, RAID_DEFENSE
- STRUCTURE_BUILT, VILLAGE_FOUNDED
- DISCOVERY_MADE, ERA_CHANGED
- FAMINE, PROSPERITY
- LEADER_ELECTED, CONFLICT

## 8.3 Lore Generation

AI periodically summarizes history into lore:

**Raw Events:**
```
Day 45: Zombie raid at north gate
Day 45: Guard Marcus killed 3 zombies
Day 45: Guard Marcus died
Day 46: Marcus's son Jonas became guard
Day 52: Jonas killed zombie at same gate
```

**Generated Lore:**
"The North Gate is sacred ground. Here Marcus the Brave fell defending our village from the night creatures. His son Jonas now guards the same post, having avenged his father. They say Marcus's spirit still walks the wall on moonless nights."

**Lore is used for:**
- Bot dialogue generation
- Cultural identity
- Teaching children
- Visitor explanations

## 8.4 Player Interaction Modes

**Observer Mode:**
- Watch without interfering
- Bots aware but neutral
- Pure simulation

**Deity Mode:**
- Can bless (good harvest, protection)
- Can punish (weather, mob spawns)
- Bots worship or fear

**Ruler Mode:**
- Participate in governance
- Give commands
- Bots treat as leader

---

# PART 9: WAR & DIPLOMACY

## 9.1 Faction System

Factions can be:
- Village-based (village = faction)
- Cross-village (ideology-based)
- Temporary (war alliance)

**Faction Traits:**
```typescript
interface Faction {
  id: string;
  name: string;
  villages: string[];
  alignment: "PEACEFUL" | "NEUTRAL" | "AGGRESSIVE";
  goals: FactionGoal[];
  relations: FactionRelation[];
}
```

## 9.2 Diplomacy

**Relation States:**
```
ALLIED (Share resources, defend together)
    ↓↑
FRIENDLY (Trade, help in emergencies)
    ↓↑
NEUTRAL (Coexist, no interaction)
    ↓↑
TENSE (Border disputes, minor conflicts)
    ↓↑
HOSTILE (Active warfare)
```

**What Changes Relations:**
- Trade → Improve
- Gifts → Improve
- Border encroachment → Worsen
- Resource theft → Worsen
- Broken agreements → Worsen
- Shared enemy → Improve
- Marriage alliance → Improve

## 9.3 Warfare

**War Triggers:**
- Resource scarcity (need what they have)
- Historical grievances (they killed our people)
- Territorial expansion
- Leadership decision

**Combat System:**
- Guards and designated warriors fight
- Combat skill affects outcomes
- Equipment (weapons, armor) matters
- Terrain advantages
- Numbers matter but not everything

**War Outcomes:**
- Conquest (village absorbed)
- Tribute (ongoing payment)
- Border adjustment
- Peace treaty
- Total destruction (rare)

---

# PART 10: DEVELOPMENT PHASES

## Phase 0: Foundation (Week 1-2)
**Goal:** Project setup, basic infrastructure

Tasks:
- [x] Project scaffolding (TypeScript, npm, tsconfig)
- [ ] Configuration system
- [ ] Logging infrastructure
- [ ] Basic CLI
- [ ] Minecraft connection (mineflayer)
- [ ] Single bot spawn and movement

**Deliverable:** Bot connects and moves

## Phase 1: Survival (Week 3-4)
**Goal:** One bot surviving autonomously

Tasks:
- [ ] Needs system
- [ ] Basic perception
- [ ] Rule-based survival
- [ ] AI stub integration
- [ ] State persistence
- [ ] Basic dashboard

**Deliverable:** Bot survives 24 hours

## Phase 2: Tribe (Week 5-7)
**Goal:** 5-10 bots working together

Tasks:
- [ ] Bot collective
- [ ] Role system (basic)
- [ ] Shared storage
- [ ] Simple building
- [ ] AI batch decisions
- [ ] Multi-bot dashboard

**Deliverable:** Group sustains itself

## Phase 3: Village (Week 8-10)
**Goal:** Functional village, 15-25 bots

Tasks:
- [ ] Village entity
- [ ] Expanded roles
- [ ] Building templates
- [ ] Economy basics
- [ ] Relationships (basic)
- [ ] Tech tree start

**Deliverable:** Self-sustaining village

## Phase 4: Society (Week 11-14)
**Goal:** Living society, 25-50 bots

Tasks:
- [ ] Family system
- [ ] Full personality
- [ ] Social interactions
- [ ] Life stages
- [ ] Cultural identity
- [ ] Lore generation
- [ ] Self-awareness

**Deliverable:** Multi-generational society

## Phase 5: Expansion (Week 15-18)
**Goal:** Multiple villages, 50+ bots

Tasks:
- [ ] Village splitting
- [ ] Multi-village management
- [ ] Factions
- [ ] Diplomacy
- [ ] Warfare
- [ ] Territory

**Deliverable:** Interacting civilizations

## Phase 6: Polish (Week 19-22)
**Goal:** Production-ready, 100+ bots

Tasks:
- [ ] Performance hardening
- [ ] Advanced AI
- [ ] Rich lore
- [ ] Player modes
- [ ] Mobile optimization
- [ ] Documentation

**Deliverable:** Stable, entertaining simulation

---

# PART 11: CONFIGURATION

## 11.1 Main Config

```json
{
  "minecraft": {
    "host": "localhost",
    "port": 25565,
    "version": "1.20.4",
    "username_prefix": "BlockLife_"
  },
  "simulation": {
    "performanceMode": "auto",
    "maxBots": 50,
    "tickRateMs": 300,
    "aiEnabled": true,
    "autoSave": true,
    "saveIntervalMs": 60000
  },
  "ai": {
    "provider": "local",
    "model": "tinyllama-1b",
    "maxBatchSize": 10,
    "minBatchSize": 3,
    "decisionIntervalMs": 8000,
    "timeoutMs": 5000,
    "fallbackEnabled": true
  },
  "logging": {
    "level": "info",
    "categories": ["system", "ai", "sim"],
    "file": "./data/logs/blocklife.log",
    "maxSize": "10MB",
    "maxFiles": 5
  },
  "data": {
    "dir": "./data",
    "snapshotsDir": "./data/snapshots",
    "maxSnapshots": 10
  }
}
```

## 11.2 Performance Profiles

```json
{
  "eco": {
    "maxBots": 25,
    "aiBatchSize": 5,
    "aiDecisionIntervalMs": 10000,
    "tickRateMs": 500,
    "backgroundBotFraction": 0.6
  },
  "normal": {
    "maxBots": 50,
    "aiBatchSize": 10,
    "aiDecisionIntervalMs": 8000,
    "tickRateMs": 300,
    "backgroundBotFraction": 0.4
  },
  "performance": {
    "maxBots": 100,
    "aiBatchSize": 15,
    "aiDecisionIntervalMs": 5000,
    "tickRateMs": 200,
    "backgroundBotFraction": 0.3
  }
}
```

---

# PART 12: FILE STRUCTURE

```
blocklife-ai/
├── docs/
│   └── DEVELOPMENT-PLAN.md          # This document
│
├── src/
│   ├── main.ts                       # Entry point
│   ├── types/                        # TypeScript definitions
│   │   ├── bot.ts
│   │   ├── village.ts
│   │   ├── civilization.ts
│   │   └── ai.ts
│   ├── orchestrator/                 # Main loop
│   │   └── index.ts
│   ├── world/                        # Minecraft interface
│   │   ├── mc-adapter.ts
│   │   └── pathfinding.ts
│   ├── bots/                         # Bot agents
│   │   ├── bot-manager.ts
│   │   ├── bot-agent.ts
│   │   └── perception.ts
│   ├── simulation/                   # Civilization logic
│   │   ├── sim-engine.ts
│   │   ├── villages.ts
│   │   ├── roles.ts
│   │   ├── families.ts
│   │   ├── economy.ts
│   │   ├── tech-tree.ts
│   │   └── factions.ts
│   ├── mind/                         # AI integration
│   │   ├── ai-client.ts
│   │   ├── decision-cache.ts
│   │   └── fallback.ts
│   ├── persistence/                  # Storage
│   │   ├── storage.ts
│   │   └── snapshots.ts
│   ├── lore/                         # History & awareness
│   │   ├── history.ts
│   │   ├── lore-generator.ts
│   │   └── dialogue.ts
│   └── utils/                        # Utilities
│       ├── logger.ts
│       ├── config.ts
│       └── performance.ts
│
├── config/
│   ├── default.json
│   └── profiles/
│       ├── eco.json
│       ├── normal.json
│       └── performance.json
│
├── scripts/
│   ├── setup-termux.sh
│   ├── start.sh
│   ├── stop.sh
│   └── status.sh
│
├── tools/
│   └── dashboard.ts
│
├── data/                             # Runtime (gitignored)
│   ├── snapshots/
│   ├── logs/
│   └── cache/
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── package.json
├── tsconfig.json
├── PROGRESS.md
├── LICENSE
└── README.md
```

---

# PART 13: SUCCESS CRITERIA

## Minimum Viable Product (MVP)
- [ ] 10 bots survive 24 hours autonomously
- [ ] Basic village forms with shelter and food
- [ ] Bots have distinct roles that function
- [ ] AI makes meaningful decisions
- [ ] System recovers from crashes
- [ ] Runs on target mobile device

## Full Release
- [ ] 50+ bots stable for 48+ hours
- [ ] Multi-generational families exist
- [ ] Villages split and interact
- [ ] Emergent culture and history
- [ ] Bots reference past events
- [ ] Entertaining to watch

## Stretch Goals
- [ ] 100+ bots on desktop
- [ ] Multiple factions at war/peace
- [ ] Rich lore generation
- [ ] Player deity mode
- [ ] Web dashboard

---

# APPENDIX A: DESIGN RULES

1. **AI Sparingly** - Use AI for choice, not mechanics
2. **Batch Everything** - Never single AI calls when you can batch
3. **Idle is Free** - Bots can loiter on rules, don't ping AI unnecessarily
4. **Compress Context** - Use codes not prose in prompts
5. **Fallback Always** - Every AI path has rule-based backup
6. **Observable** - If you can't see it, it doesn't matter
7. **Recoverable** - Snapshot everything, survive crashes
8. **Mobile First** - If it can't run on phone, redesign it

---

**Document Version:** 1.0 Complete  
**Last Updated:** 2025  
**Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill**

*This document is the complete specification for BlockLife AI autonomous development.*
