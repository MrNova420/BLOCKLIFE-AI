/**
 * BlockLife AI - Visual Styling System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * BEAUTIFUL, UNIQUE VISUAL OUTPUT
 * Custom ASCII art, colored output, formatted boxes, and stunning displays.
 * Makes BlockLife stand out with professional, eye-catching visuals.
 */

// ============================================================================
// ANSI COLOR CODES
// ============================================================================

export const Colors = {
  // Reset
  RESET: '\x1b[0m',
  
  // Text styles
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  ITALIC: '\x1b[3m',
  UNDERLINE: '\x1b[4m',
  BLINK: '\x1b[5m',
  INVERSE: '\x1b[7m',
  
  // Foreground colors
  BLACK: '\x1b[30m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  
  // Bright foreground
  BRIGHT_BLACK: '\x1b[90m',
  BRIGHT_RED: '\x1b[91m',
  BRIGHT_GREEN: '\x1b[92m',
  BRIGHT_YELLOW: '\x1b[93m',
  BRIGHT_BLUE: '\x1b[94m',
  BRIGHT_MAGENTA: '\x1b[95m',
  BRIGHT_CYAN: '\x1b[96m',
  BRIGHT_WHITE: '\x1b[97m',
  
  // Background colors
  BG_BLACK: '\x1b[40m',
  BG_RED: '\x1b[41m',
  BG_GREEN: '\x1b[42m',
  BG_YELLOW: '\x1b[43m',
  BG_BLUE: '\x1b[44m',
  BG_MAGENTA: '\x1b[45m',
  BG_CYAN: '\x1b[46m',
  BG_WHITE: '\x1b[47m'
};

// ============================================================================
// THEME COLORS (BlockLife Brand)
// ============================================================================

export const Theme = {
  // Primary colors
  PRIMARY: Colors.BRIGHT_CYAN,
  SECONDARY: Colors.BRIGHT_MAGENTA,
  ACCENT: Colors.BRIGHT_YELLOW,
  
  // Status colors
  SUCCESS: Colors.BRIGHT_GREEN,
  WARNING: Colors.BRIGHT_YELLOW,
  ERROR: Colors.BRIGHT_RED,
  INFO: Colors.BRIGHT_BLUE,
  
  // Text colors
  TITLE: Colors.BOLD + Colors.BRIGHT_CYAN,
  SUBTITLE: Colors.BRIGHT_MAGENTA,
  TEXT: Colors.WHITE,
  MUTED: Colors.BRIGHT_BLACK,
  HIGHLIGHT: Colors.BOLD + Colors.BRIGHT_WHITE,
  
  // Special
  GOLD: Colors.BRIGHT_YELLOW,
  DIAMOND: Colors.BRIGHT_CYAN,
  EMERALD: Colors.BRIGHT_GREEN,
  REDSTONE: Colors.BRIGHT_RED,
  LAPIS: Colors.BRIGHT_BLUE,
  
  // Reset
  RESET: Colors.RESET
};

// ============================================================================
// ASCII ART & LOGOS
// ============================================================================

export const ASCII_LOGO = `
${Theme.PRIMARY}██████╗ ██╗      ██████╗  ██████╗██╗  ██╗██╗     ██╗███████╗███████╗
${Theme.PRIMARY}██╔══██╗██║     ██╔═══██╗██╔════╝██║ ██╔╝██║     ██║██╔════╝██╔════╝
${Theme.SECONDARY}██████╔╝██║     ██║   ██║██║     █████╔╝ ██║     ██║█████╗  █████╗  
${Theme.SECONDARY}██╔══██╗██║     ██║   ██║██║     ██╔═██╗ ██║     ██║██╔══╝  ██╔══╝  
${Theme.ACCENT}██████╔╝███████╗╚██████╔╝╚██████╗██║  ██╗███████╗██║██║     ███████╗
${Theme.ACCENT}╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝     ╚══════╝
${Theme.MUTED}                    ╔═══════════════════════════╗
${Theme.MUTED}                    ║${Theme.GOLD}    ★ AI CIVILIZATION ★    ${Theme.MUTED}║
${Theme.MUTED}                    ╚═══════════════════════════╝${Theme.RESET}
`;

export const ASCII_LOGO_SMALL = `
${Theme.PRIMARY}▄▄▄▄    ██▓     ▒█████   ▄████▄   ██ ▄█▀ ██▓     ██▓  █████▒▓█████ 
${Theme.PRIMARY}▓█████▄ ▓██▒    ▒██▒  ██▒▒██▀ ▀█   ██▄█▒ ▓██▒    ▓██▒▓██   ▒ ▓█   ▀ 
${Theme.SECONDARY}▒██▒ ▄██▒██░    ▒██░  ██▒▒▓█    ▄ ▓███▄░ ▒██░    ▒██▒▒████ ░ ▒███   
${Theme.SECONDARY}▒██░█▀  ▒██░    ▒██   ██░▒▓▓▄ ▄██▒▓██ █▄ ▒██░    ░██░░▓█▒  ░ ▒▓█  ▄ 
${Theme.ACCENT}░▓█  ▀█▓░██████▒░ ████▓▒░▒ ▓███▀ ░▒██▒ █▄░██████▒░██░░▒█░    ░▒████▒
${Theme.RESET}`;

export const ASCII_PICKAXE = `
${Colors.BRIGHT_BLACK}      ⛏️
${Colors.BRIGHT_BLACK}     /|\\
${Colors.BRIGHT_BLACK}    / | \\
${Theme.RESET}`;

export const ASCII_DIAMOND = `
${Theme.DIAMOND}    ◆
${Theme.DIAMOND}   ◆◆◆
${Theme.DIAMOND}  ◆◆◆◆◆
${Theme.DIAMOND}   ◆◆◆
${Theme.DIAMOND}    ◆
${Theme.RESET}`;

export const ASCII_SWORD = `
${Colors.BRIGHT_WHITE}    ╱╲
${Colors.BRIGHT_WHITE}   ╱  ╲
${Colors.BRIGHT_WHITE}  ╱    ╲
${Theme.GOLD} ═╪════╪═
${Theme.GOLD}  ╱    ╲
${Theme.RESET}`;

export const ASCII_HEART = `
${Theme.ERROR} ♥♥   ♥♥
${Theme.ERROR}♥♥♥♥ ♥♥♥♥
${Theme.ERROR} ♥♥♥♥♥♥♥
${Theme.ERROR}  ♥♥♥♥♥
${Theme.ERROR}   ♥♥♥
${Theme.ERROR}    ♥
${Theme.RESET}`;

// ============================================================================
// BOX DRAWING
// ============================================================================

export const BoxChars = {
  // Single line
  TOP_LEFT: '┌',
  TOP_RIGHT: '┐',
  BOTTOM_LEFT: '└',
  BOTTOM_RIGHT: '┘',
  HORIZONTAL: '─',
  VERTICAL: '│',
  T_DOWN: '┬',
  T_UP: '┴',
  T_RIGHT: '├',
  T_LEFT: '┤',
  CROSS: '┼',
  
  // Double line
  D_TOP_LEFT: '╔',
  D_TOP_RIGHT: '╗',
  D_BOTTOM_LEFT: '╚',
  D_BOTTOM_RIGHT: '╝',
  D_HORIZONTAL: '═',
  D_VERTICAL: '║',
  D_T_DOWN: '╦',
  D_T_UP: '╩',
  D_T_RIGHT: '╠',
  D_T_LEFT: '╣',
  D_CROSS: '╬',
  
  // Rounded
  R_TOP_LEFT: '╭',
  R_TOP_RIGHT: '╮',
  R_BOTTOM_LEFT: '╰',
  R_BOTTOM_RIGHT: '╯',
  
  // Block elements
  FULL_BLOCK: '█',
  LIGHT_SHADE: '░',
  MEDIUM_SHADE: '▒',
  DARK_SHADE: '▓',
  HALF_BLOCK_BOTTOM: '▄',
  HALF_BLOCK_TOP: '▀',
  
  // Progress bar
  PROGRESS_FULL: '█',
  PROGRESS_EMPTY: '░',
  PROGRESS_PARTIAL: '▓'
};

// ============================================================================
// ICONS & SYMBOLS
// ============================================================================

export const Icons = {
  // Status
  SUCCESS: '✓',
  ERROR: '✗',
  WARNING: '⚠',
  INFO: 'ℹ',
  QUESTION: '?',
  
  // Indicators
  ONLINE: '●',
  OFFLINE: '○',
  LOADING: '◌',
  PROCESSING: '⟳',
  
  // Actions
  PLAY: '▶',
  PAUSE: '⏸',
  STOP: '⏹',
  FORWARD: '⏩',
  BACKWARD: '⏪',
  
  // Minecraft themed
  HEART: '♥',
  STAR: '★',
  DIAMOND: '◆',
  PICKAXE: '⛏',
  SWORD: '⚔',
  SHIELD: '🛡',
  FOOD: '🍖',
  WOOD: '🪵',
  STONE: '🪨',
  IRON: '⚙',
  GOLD: '🪙',
  EMERALD: '💎',
  REDSTONE: '🔴',
  
  // Bots
  BOT: '🤖',
  PERSON: '👤',
  PEOPLE: '👥',
  FARMER: '🌾',
  MINER: '⛏',
  BUILDER: '🔨',
  GUARD: '⚔',
  EXPLORER: '🧭',
  CHIEF: '👑',
  
  // Nature
  SUN: '☀',
  MOON: '☽',
  RAIN: '🌧',
  THUNDER: '⛈',
  TREE: '🌲',
  MOUNTAIN: '⛰',
  
  // Arrows
  ARROW_UP: '↑',
  ARROW_DOWN: '↓',
  ARROW_LEFT: '←',
  ARROW_RIGHT: '→',
  ARROW_UP_RIGHT: '↗',
  ARROW_DOWN_RIGHT: '↘',
  
  // Misc
  FIRE: '🔥',
  WATER: '💧',
  LIGHTNING: '⚡',
  SKULL: '💀',
  TROPHY: '🏆',
  FLAG: '🚩',
  HOME: '🏠',
  VILLAGE: '🏘',
  CASTLE: '🏰'
};

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

/**
 * Create a styled box with title
 */
export function createBox(
  content: string | string[],
  options: {
    title?: string;
    width?: number;
    style?: 'single' | 'double' | 'rounded';
    titleColor?: string;
    borderColor?: string;
    padding?: number;
  } = {}
): string {
  const {
    title,
    width = 60,
    style = 'double',
    titleColor = Theme.TITLE,
    borderColor = Theme.PRIMARY,
    padding = 1
  } = options;
  
  const chars = style === 'double' ? {
    tl: BoxChars.D_TOP_LEFT,
    tr: BoxChars.D_TOP_RIGHT,
    bl: BoxChars.D_BOTTOM_LEFT,
    br: BoxChars.D_BOTTOM_RIGHT,
    h: BoxChars.D_HORIZONTAL,
    v: BoxChars.D_VERTICAL
  } : style === 'rounded' ? {
    tl: BoxChars.R_TOP_LEFT,
    tr: BoxChars.R_TOP_RIGHT,
    bl: BoxChars.R_BOTTOM_LEFT,
    br: BoxChars.R_BOTTOM_RIGHT,
    h: BoxChars.HORIZONTAL,
    v: BoxChars.VERTICAL
  } : {
    tl: BoxChars.TOP_LEFT,
    tr: BoxChars.TOP_RIGHT,
    bl: BoxChars.BOTTOM_LEFT,
    br: BoxChars.BOTTOM_RIGHT,
    h: BoxChars.HORIZONTAL,
    v: BoxChars.VERTICAL
  };
  
  const innerWidth = width - 2;
  const lines = Array.isArray(content) ? content : content.split('\n');
  const paddedLines = lines.map(line => {
    const stripped = stripAnsi(line);
    const padAmount = innerWidth - stripped.length;
    if (padAmount > 0) {
      return line + ' '.repeat(padAmount);
    }
    return line.substring(0, innerWidth);
  });
  
  const result: string[] = [];
  
  // Top border with title
  if (title) {
    const titleText = ` ${title} `;
    const titleLen = stripAnsi(titleText).length;
    const leftPad = Math.floor((innerWidth - titleLen) / 2);
    const rightPad = innerWidth - titleLen - leftPad;
    result.push(
      `${borderColor}${chars.tl}${chars.h.repeat(leftPad)}${titleColor}${titleText}${borderColor}${chars.h.repeat(rightPad)}${chars.tr}${Theme.RESET}`
    );
  } else {
    result.push(`${borderColor}${chars.tl}${chars.h.repeat(innerWidth)}${chars.tr}${Theme.RESET}`);
  }
  
  // Padding top
  for (let i = 0; i < padding; i++) {
    result.push(`${borderColor}${chars.v}${' '.repeat(innerWidth)}${chars.v}${Theme.RESET}`);
  }
  
  // Content
  for (const line of paddedLines) {
    result.push(`${borderColor}${chars.v}${Theme.RESET}${line}${borderColor}${chars.v}${Theme.RESET}`);
  }
  
  // Padding bottom
  for (let i = 0; i < padding; i++) {
    result.push(`${borderColor}${chars.v}${' '.repeat(innerWidth)}${chars.v}${Theme.RESET}`);
  }
  
  // Bottom border
  result.push(`${borderColor}${chars.bl}${chars.h.repeat(innerWidth)}${chars.br}${Theme.RESET}`);
  
  return result.join('\n');
}

/**
 * Create a progress bar
 */
export function createProgressBar(
  progress: number,
  options: {
    width?: number;
    showPercent?: boolean;
    filledChar?: string;
    emptyChar?: string;
    filledColor?: string;
    emptyColor?: string;
    label?: string;
  } = {}
): string {
  const {
    width = 30,
    showPercent = true,
    filledChar = BoxChars.PROGRESS_FULL,
    emptyChar = BoxChars.PROGRESS_EMPTY,
    filledColor = Theme.SUCCESS,
    emptyColor = Theme.MUTED,
    label
  } = options;
  
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const filledWidth = Math.round((clampedProgress / 100) * width);
  const emptyWidth = width - filledWidth;
  
  const bar = `${filledColor}${filledChar.repeat(filledWidth)}${emptyColor}${emptyChar.repeat(emptyWidth)}${Theme.RESET}`;
  const percent = showPercent ? ` ${clampedProgress.toFixed(1)}%` : '';
  const labelText = label ? `${label}: ` : '';
  
  return `${labelText}[${bar}]${percent}`;
}

/**
 * Create a status indicator
 */
export function createStatusIndicator(
  status: 'online' | 'offline' | 'degraded' | 'loading',
  label?: string
): string {
  const indicators = {
    online: `${Theme.SUCCESS}${Icons.ONLINE}${Theme.RESET}`,
    offline: `${Theme.ERROR}${Icons.OFFLINE}${Theme.RESET}`,
    degraded: `${Theme.WARNING}${Icons.ONLINE}${Theme.RESET}`,
    loading: `${Theme.INFO}${Icons.LOADING}${Theme.RESET}`
  };
  
  const indicator = indicators[status];
  return label ? `${indicator} ${label}` : indicator;
}

/**
 * Create a table
 */
export function createTable(
  headers: string[],
  rows: string[][],
  options: {
    columnWidths?: number[];
    headerColor?: string;
    borderColor?: string;
  } = {}
): string {
  const {
    headerColor = Theme.TITLE,
    borderColor = Theme.MUTED
  } = options;
  
  // Calculate column widths
  const colWidths = options.columnWidths || headers.map((h, i) => {
    const maxContent = Math.max(
      stripAnsi(h).length,
      ...rows.map(r => stripAnsi(r[i] || '').length)
    );
    return maxContent + 2;
  });
  
  const totalWidth = colWidths.reduce((a, b) => a + b, 0) + colWidths.length + 1;
  
  const result: string[] = [];
  
  // Top border
  result.push(
    `${borderColor}${BoxChars.TOP_LEFT}${colWidths.map(w => BoxChars.HORIZONTAL.repeat(w)).join(BoxChars.T_DOWN)}${BoxChars.TOP_RIGHT}${Theme.RESET}`
  );
  
  // Header row
  const headerCells = headers.map((h, i) => {
    const padded = padString(h, colWidths[i]);
    return `${headerColor}${padded}${Theme.RESET}`;
  });
  result.push(`${borderColor}${BoxChars.VERTICAL}${headerCells.join(`${borderColor}${BoxChars.VERTICAL}`)}${borderColor}${BoxChars.VERTICAL}${Theme.RESET}`);
  
  // Header separator
  result.push(
    `${borderColor}${BoxChars.T_RIGHT}${colWidths.map(w => BoxChars.HORIZONTAL.repeat(w)).join(BoxChars.CROSS)}${BoxChars.T_LEFT}${Theme.RESET}`
  );
  
  // Data rows
  for (const row of rows) {
    const cells = row.map((cell, i) => padString(cell || '', colWidths[i]));
    result.push(`${borderColor}${BoxChars.VERTICAL}${cells.join(`${borderColor}${BoxChars.VERTICAL}`)}${borderColor}${BoxChars.VERTICAL}${Theme.RESET}`);
  }
  
  // Bottom border
  result.push(
    `${borderColor}${BoxChars.BOTTOM_LEFT}${colWidths.map(w => BoxChars.HORIZONTAL.repeat(w)).join(BoxChars.T_UP)}${BoxChars.BOTTOM_RIGHT}${Theme.RESET}`
  );
  
  return result.join('\n');
}

/**
 * Create a list with icons
 */
export function createList(
  items: Array<{ icon?: string; text: string; color?: string }>,
  options: { indent?: number; bulletColor?: string } = {}
): string {
  const { indent = 2, bulletColor = Theme.PRIMARY } = options;
  const indentStr = ' '.repeat(indent);
  
  return items.map(item => {
    const icon = item.icon || '•';
    const color = item.color || Theme.TEXT;
    return `${indentStr}${bulletColor}${icon}${Theme.RESET} ${color}${item.text}${Theme.RESET}`;
  }).join('\n');
}

/**
 * Create a section header
 */
export function createSectionHeader(title: string, icon?: string): string {
  const iconStr = icon ? `${icon} ` : '';
  const line = BoxChars.D_HORIZONTAL.repeat(50);
  return `
${Theme.PRIMARY}${line}${Theme.RESET}
${Theme.TITLE}  ${iconStr}${title.toUpperCase()}${Theme.RESET}
${Theme.PRIMARY}${line}${Theme.RESET}`;
}

/**
 * Create a key-value display
 */
export function createKeyValue(
  pairs: Array<{ key: string; value: string | number; icon?: string }>,
  options: { keyColor?: string; valueColor?: string; separator?: string } = {}
): string {
  const {
    keyColor = Theme.MUTED,
    valueColor = Theme.HIGHLIGHT,
    separator = ':'
  } = options;
  
  const maxKeyLen = Math.max(...pairs.map(p => stripAnsi(p.key).length));
  
  return pairs.map(({ key, value, icon }) => {
    const paddedKey = key.padEnd(maxKeyLen);
    const iconStr = icon ? `${icon} ` : '';
    return `  ${iconStr}${keyColor}${paddedKey}${separator}${Theme.RESET} ${valueColor}${value}${Theme.RESET}`;
  }).join('\n');
}

/**
 * Create a divider line
 */
export function createDivider(
  width: number = 60,
  style: 'single' | 'double' | 'dashed' | 'dotted' = 'single',
  color: string = Theme.MUTED
): string {
  const chars = {
    single: BoxChars.HORIZONTAL,
    double: BoxChars.D_HORIZONTAL,
    dashed: '╌',
    dotted: '·'
  };
  return `${color}${chars[style].repeat(width)}${Theme.RESET}`;
}

/**
 * Highlight text with background
 */
export function highlight(text: string, color: string = Theme.ACCENT): string {
  return `${color}${Colors.BOLD}${text}${Theme.RESET}`;
}

/**
 * Dim text
 */
export function dim(text: string): string {
  return `${Colors.DIM}${text}${Theme.RESET}`;
}

/**
 * Success text
 */
export function success(text: string): string {
  return `${Theme.SUCCESS}${text}${Theme.RESET}`;
}

/**
 * Error text
 */
export function error(text: string): string {
  return `${Theme.ERROR}${text}${Theme.RESET}`;
}

/**
 * Warning text
 */
export function warning(text: string): string {
  return `${Theme.WARNING}${text}${Theme.RESET}`;
}

/**
 * Info text
 */
export function info(text: string): string {
  return `${Theme.INFO}${text}${Theme.RESET}`;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Strip ANSI codes from string
 */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Pad string to width
 */
export function padString(str: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string {
  const strLen = stripAnsi(str).length;
  const padAmount = Math.max(0, width - strLen);
  
  switch (align) {
    case 'right':
      return ' '.repeat(padAmount) + str;
    case 'center': {
      const leftPad = Math.floor(padAmount / 2);
      const rightPad = padAmount - leftPad;
      return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
    }
    default:
      return str + ' '.repeat(padAmount);
  }
}

/**
 * Center text
 */
export function centerText(text: string, width: number): string {
  return padString(text, width, 'center');
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (stripAnsi(text).length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  Colors,
  Theme,
  ASCII_LOGO,
  ASCII_LOGO_SMALL,
  BoxChars,
  Icons,
  createBox,
  createProgressBar,
  createStatusIndicator,
  createTable,
  createList,
  createSectionHeader,
  createKeyValue,
  createDivider,
  highlight,
  dim,
  success,
  error,
  warning,
  info,
  stripAnsi,
  padString,
  centerText,
  truncate
};
