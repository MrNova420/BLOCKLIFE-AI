/**
 * BlockLife AI - Logger Utility
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Lightweight logging system for BlockLife.
 */

import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
  level: LogLevel;
  categories: string[];
  file?: string;
  console: boolean;
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

const RESET_COLOR = '\x1b[0m';

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
      console: config?.console ?? true
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
    // Check level
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.level]) {
      return false;
    }

    // Check category
    if (this.config.categories.includes('*')) {
      return true;
    }
    return this.config.categories.includes(this.category);
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    const categoryStr = this.category.padEnd(12);
    
    let formatted = `[${timestamp}] [${levelStr}] [${categoryStr}] ${message}`;
    
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

    const formatted = this.formatMessage(level, message, data);

    // Console output with colors
    if (this.config.console) {
      const color = LOG_COLORS[level];
      console.log(`${color}${formatted}${RESET_COLOR}`);
    }

    // File output without colors
    if (this.fileStream) {
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
  console: true
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
