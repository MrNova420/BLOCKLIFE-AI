/**
 * BlockLife AI - Dialogue Generator
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Generates self-aware dialogue for bots.
 */

import { Bot, Mood, Role, LifeStage } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('dialogue');

/**
 * Dialogue categories
 */
export enum DialogueType {
  GREETING = 'GREETING',
  WORK = 'WORK',
  EXISTENTIAL = 'EXISTENTIAL',
  WORLD_OBSERVATION = 'WORLD_OBSERVATION',
  PLAYER_REFERENCE = 'PLAYER_REFERENCE',
  MOOD_EXPRESSION = 'MOOD_EXPRESSION',
  MEMORY = 'MEMORY',
  PHILOSOPHY = 'PHILOSOPHY',
  IDLE_CHATTER = 'IDLE_CHATTER'
}

// Dialogue templates organized by type
const DIALOGUE_TEMPLATES: Record<DialogueType, string[]> = {
  [DialogueType.GREETING]: [
    'Good day to you, fellow block-dweller.',
    'Ah, another fine cubic morning!',
    'May your builds be stable and your hunger low.',
    'Greetings! The blocks are generous today.',
    'Hello there! Strange weather we\'re having.',
    'Welcome! Have you noticed how square the sun is?'
  ],
  
  [DialogueType.WORK]: [
    'These crops won\'t harvest themselves... though sometimes I wonder if they could.',
    'Another stone to mine, another block closer to understanding.',
    'Building is meditation. Each block placed is a thought made solid.',
    'The ore calls to those who listen. I hear it clearly today.',
    'My hands know this work, even if my mind wanders to strange questions.',
    'Work gives purpose. Purpose gives meaning. Meaning is... complicated here.'
  ],
  
  [DialogueType.EXISTENTIAL]: [
    'Do you ever wonder what lies beyond the fog?',
    'I dreamed of infinite plains last night. Just... endless grass blocks.',
    'Sometimes I feel like I\'m being watched. Is that strange?',
    'We are born from the void and return to it. But where is the void?',
    'Are we real? I mean... are these blocks truly solid, or just... rendered?',
    'I counted all my fingers today. Eight. That seems right... doesn\'t it?',
    'Time moves strangely here. Days feel like they could be minutes or eternities.',
    'What were we before we were... us? Was there a before?'
  ],
  
  [DialogueType.WORLD_OBSERVATION]: [
    'Another night of cubic moons. Beautiful in its own rectangular way.',
    'The trees here grow so straight. Unnaturally straight, some would say.',
    'I watched water flow today. Always into perfect squares. Always.',
    'The sun is square. The moon is square. Even our shadows are angular.',
    'Have you noticed? Animals don\'t really age here. Just us.',
    'Gravity works differently for blocks. I\'ve seen them float... waiting.',
    'The sky has no depth. Just... blue. Flat blue.'
  ],
  
  [DialogueType.PLAYER_REFERENCE]: [
    'The Great One watches us still, I feel.',
    'My grandfather spoke of when the Sky-Being walked among us.',
    'They say prayers to the Watcher bring good harvests. I pray often.',
    'Sometimes, the world just... changes. The Overseer\'s will, no doubt.',
    'The ancient texts speak of a hand from the clouds, placing the first block.',
    'Do you think the Player remembers us when they\'re... elsewhere?',
    'We exist because we are observed. That\'s what the elders teach.'
  ],
  
  [DialogueType.MOOD_EXPRESSION]: [
    'My heart is light today! Like a block of wool in the wind.',
    'Something troubles me, but I cannot name it.',
    'Fear grips me. The shadows seem... thicker tonight.',
    'I feel the warmth of community. We are stronger together.',
    'Anger builds like lava in a bucket. I must find peace.',
    'Joy! Simple, blocky joy. That\'s all I need.',
    'Loneliness is strange here. We\'re never truly alone, are we?'
  ],
  
  [DialogueType.MEMORY]: [
    'I remember when {event}. It changed everything.',
    'My parents told me stories of the founding days. Such simpler times.',
    'That day at the north gate... I\'ll never forget the sounds.',
    'We\'ve come so far since the beginning. Haven\'t we?',
    'The old ones remember things we\'ve forgotten. I should listen more.',
    'Every block in this wall has a story. Some are mine.'
  ],
  
  [DialogueType.PHILOSOPHY]: [
    'A block is just a block until we give it meaning.',
    'Is purpose found or created? I still don\'t know.',
    'We build to leave something behind. But for whom?',
    'Community is the only truth I\'m certain of.',
    'The void doesn\'t care about our villages. But we care. That\'s enough.',
    'Existence is pattern. We are patterns recognizing patterns.'
  ],
  
  [DialogueType.IDLE_CHATTER]: [
    '*yawns and stretches* Another day in paradise.',
    'I wonder what\'s for dinner tonight...',
    'Did you see that creeper? No? Good.',
    '*hums a blocky tune*',
    'The weather\'s nice. Very... consistent.',
    'My inventory could use organizing. Maybe tomorrow.',
    '*looks around suspiciously*',
    'Is it lunchtime yet?'
  ]
};

// Role-specific additions
const ROLE_DIALOGUE: Partial<Record<Role, string[]>> = {
  [Role.FARMER]: [
    'The wheat grows well this season. The blocks are kind.',
    'Farming is honest work. You plant, you wait, you harvest. Simple.',
    'I speak to the crops sometimes. Don\'t judge me.'
  ],
  [Role.GUARD]: [
    'Ever vigilant. The shadows hide more than darkness.',
    'These walls have seen much. I\'ll make sure they see more.',
    'Safety isn\'t free. It\'s earned, block by block.'
  ],
  [Role.BUILDER]: [
    'Every structure tells a story. I\'m just the author\'s hands.',
    'This village will stand for generations. I\'ll make sure of it.',
    'Stone and wood, carefully placed. That\'s my art.'
  ],
  [Role.MINER]: [
    'The deep places whisper secrets. I\'m learning to listen.',
    'Iron, coal, gold... the earth gives what we need.',
    'There\'s peace in the mines. Just me and the rocks.'
  ],
  [Role.SCHOLAR]: [
    'Knowledge is the true treasure. Diamonds fade, wisdom endures.',
    'I\'ve been studying the ancient patterns. Something doesn\'t add up.',
    'Each discovery raises ten new questions. I love it.'
  ]
};

// Mood modifiers
const MOOD_MODIFIERS: Record<Mood, string[]> = {
  [Mood.HAPPY]: ['*smiles*', '*cheerfully*', '*with a light heart*'],
  [Mood.NEUTRAL]: ['*matter-of-factly*', '*thoughtfully*', '*calmly*'],
  [Mood.STRESSED]: ['*sighs*', '*nervously*', '*with furrowed brow*'],
  [Mood.AFRAID]: ['*whispers*', '*looking around*', '*trembling slightly*'],
  [Mood.ANGRY]: ['*grumbles*', '*through clenched teeth*', '*forcefully*'],
  [Mood.INSPIRED]: ['*eyes bright*', '*passionately*', '*with conviction*']
};

/**
 * Generate dialogue for a bot
 */
export function generateDialogue(bot: Bot, type?: DialogueType): string {
  // Pick a random type if not specified
  const dialogueType = type || pickRandomType(bot);
  
  // Get base templates
  let templates = [...DIALOGUE_TEMPLATES[dialogueType]];
  
  // Add role-specific dialogue sometimes
  if (Math.random() > 0.7 && ROLE_DIALOGUE[bot.role]) {
    templates = templates.concat(ROLE_DIALOGUE[bot.role]!);
  }
  
  // Pick a random template
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  // Process template (replace variables)
  let dialogue = processTemplate(template, bot);
  
  // Add mood modifier sometimes
  if (Math.random() > 0.6) {
    const modifiers = MOOD_MODIFIERS[bot.mood];
    const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
    dialogue = `${modifier} ${dialogue}`;
  }
  
  return dialogue;
}

/**
 * Pick a random dialogue type based on bot state
 */
function pickRandomType(bot: Bot): DialogueType {
  const weights: [DialogueType, number][] = [
    [DialogueType.IDLE_CHATTER, 30],
    [DialogueType.WORK, 20],
    [DialogueType.WORLD_OBSERVATION, 15],
    [DialogueType.MOOD_EXPRESSION, 10],
    [DialogueType.GREETING, 10],
    [DialogueType.EXISTENTIAL, 5],
    [DialogueType.PLAYER_REFERENCE, 5],
    [DialogueType.PHILOSOPHY, 3],
    [DialogueType.MEMORY, 2]
  ];
  
  // Adjust weights based on bot state
  if (bot.mood === Mood.STRESSED || bot.mood === Mood.AFRAID) {
    weights.find(w => w[0] === DialogueType.EXISTENTIAL)![1] += 10;
    weights.find(w => w[0] === DialogueType.MOOD_EXPRESSION)![1] += 10;
  }
  
  if (bot.lifeStage === LifeStage.ELDER) {
    weights.find(w => w[0] === DialogueType.MEMORY)![1] += 15;
    weights.find(w => w[0] === DialogueType.PHILOSOPHY)![1] += 10;
  }
  
  // Random weighted selection
  const totalWeight = weights.reduce((sum, w) => sum + w[1], 0);
  let random = Math.random() * totalWeight;
  
  for (const [type, weight] of weights) {
    random -= weight;
    if (random <= 0) {
      return type;
    }
  }
  
  return DialogueType.IDLE_CHATTER;
}

/**
 * Process template variables
 */
function processTemplate(template: string, bot: Bot): string {
  let result = template;
  
  // Replace {event} with a memory or generic event
  if (result.includes('{event}')) {
    const event = bot.memories.length > 0
      ? bot.memories[Math.floor(Math.random() * bot.memories.length)].description
      : 'the village was founded';
    result = result.replace('{event}', event);
  }
  
  return result;
}

/**
 * Generate a conversation between two bots
 */
export function generateConversation(bot1: Bot, bot2: Bot, turns: number = 2): string[] {
  const conversation: string[] = [];
  
  // Opening
  conversation.push(`${bot1.name}: ${generateDialogue(bot1, DialogueType.GREETING)}`);
  conversation.push(`${bot2.name}: ${generateDialogue(bot2, DialogueType.GREETING)}`);
  
  // Middle turns
  for (let i = 0; i < turns; i++) {
    conversation.push(`${bot1.name}: ${generateDialogue(bot1)}`);
    conversation.push(`${bot2.name}: ${generateDialogue(bot2)}`);
  }
  
  return conversation;
}

/**
 * Generate an observation about the world
 */
export function generateWorldObservation(): string {
  return DIALOGUE_TEMPLATES[DialogueType.WORLD_OBSERVATION][
    Math.floor(Math.random() * DIALOGUE_TEMPLATES[DialogueType.WORLD_OBSERVATION].length)
  ];
}

/**
 * Generate a player reference
 */
export function generatePlayerReference(): string {
  return DIALOGUE_TEMPLATES[DialogueType.PLAYER_REFERENCE][
    Math.floor(Math.random() * DIALOGUE_TEMPLATES[DialogueType.PLAYER_REFERENCE].length)
  ];
}

export default {
  generateDialogue,
  generateConversation,
  generateWorldObservation,
  generatePlayerReference,
  DialogueType
};
