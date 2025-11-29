/**
 * BlockLife AI - Logger Utility
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Clean, human-readable logging system for BlockLife.
 * Logs are clear and readable - no cluttered timestamps on every line.
 */

import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
  level: LogLevel;
  categories: string[];
  file?: string;
  console: boolean;
  showTimestamp?: boolean;  // Only show timestamp when explicitly needed
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m'  // Red
};

const LOG_ICONS: Record<LogLevel, string> = {
  debug: '🔍',
  info: '✓',
  warn: '⚠',
  error: '✗'
};

const RESET_COLOR = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

class Logger {
  private config: LoggerConfig;
  private fileStream?: fs.WriteStream;
  private category: string;

  constructor(category: string, config?: Partial<LoggerConfig>) {
    this.category = category;
    this.config = {
      level: config?.level ?? 'info',
      categories: config?.categories ?? ['*'],
      file: config?.file,
      console: config?.console ?? true,
      showTimestamp: config?.showTimestamp ?? false
    };

    if (this.config.file) {
      const dir = path.dirname(this.config.file);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.fileStream = fs.createWriteStream(this.config.file, { flags: 'a' });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) {
      return false;
    }

    if (this.config.categories.includes('*')) {
      return true;
    }
    return this.config.categories.includes(this.category);
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const icon = LOG_ICONS[level];
    const levelStr = level.toUpperCase();
    const categoryStr = this.category;
    
    // Clean format without cluttered timestamps
    let formatted = `${icon} [${categoryStr}] ${message}`;
    
    if (data !== undefined) {
      if (typeof data === 'object') {
        formatted += '\n' + JSON.stringify(data, null, 2);
      } else {
        formatted += ' ' + String(data);
      }
    }
    
    return formatted;
  }

  private formatForFile(level: LogLevel, message: string, data?: unknown): string {
    // File gets a simple timestamp for record-keeping
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const levelStr = level.toUpperCase().padEnd(5);
    const categoryStr = this.category.padEnd(12);
    
    let formatted = `${timestamp} | ${levelStr} | ${categoryStr} | ${message}`;
    
    if (data !== undefined) {
      if (typeof data === 'object') {
        formatted += '\n' + JSON.stringify(data, null, 2);
      } else {
        formatted += ' ' + String(data);
      }
    }
    
    return formatted;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    // Console output - clean and readable
    if (this.config.console) {
      const color = LOG_COLORS[level];
      const formatted = this.formatMessage(level, message, data);
      console.log(`${color}${formatted}${RESET_COLOR}`);
    }

    // File output - with timestamps for records
    if (this.fileStream) {
      const formatted = this.formatForFile(level, message, data);
      this.fileStream.write(formatted + '\n');
    }
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }

  // Special method for important announcements
  announce(message: string): void {
    const border = '═'.repeat(60);
    console.log(`\n\x1b[36m╔${border}╗\x1b[0m`);
    console.log(`\x1b[36m║\x1b[0m \x1b[1m${message.padEnd(58)}\x1b[0m \x1b[36m║\x1b[0m`);
    console.log(`\x1b[36m╚${border}╝\x1b[0m\n`);
  }

  close(): void {
    if (this.fileStream) {
      this.fileStream.end();
    }
  }
}

// Default logger configuration
let defaultConfig: Partial<LoggerConfig> = {
  level: 'info',
  categories: ['*'],
  console: true,
  showTimestamp: false
};

/**
 * Configure the default logger settings
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  defaultConfig = { ...defaultConfig, ...config };
}

/**
 * Create a logger for a specific category
 */
export function createLogger(category: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger(category, { ...defaultConfig, ...config });
}

// Pre-configured loggers for common categories
export const systemLogger = createLogger('system');
export const aiLogger = createLogger('ai');
export const simLogger = createLogger('sim');
export const botLogger = createLogger('bot');
export const perfLogger = createLogger('perf');

export default Logger;
