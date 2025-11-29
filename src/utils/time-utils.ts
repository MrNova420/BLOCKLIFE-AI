/**
 * BlockLife AI - Time Utilities
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Human-readable time formatting and local time utilities.
 * All times displayed in user's local timezone with clear formatting.
 * NO cluttered timestamps - clean, readable output only.
 */

// ============================================================================
// TIME FORMATTING - HUMAN READABLE
// ============================================================================

/**
 * Get current time as clean human-readable string
 * Example: "Friday, November 29, 2025 at 2:30 PM"
 */
export function now(): string {
  return new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format a timestamp as human-readable local time
 * Example: "Friday, November 29, 2025 at 2:30 PM"
 */
export function formatLocalTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format a timestamp as short local time
 * Example: "11/29/25, 2:30 PM"
 */
export function formatShortTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format time as just the time portion
 * Example: "2:30:45 PM"
 */
export function formatTimeOnly(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

/**
 * Format date as just the date portion
 * Example: "November 29, 2025"
 */
export function formatDateOnly(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format as ISO string with timezone
 * Example: "2025-11-29T14:30:45-05:00"
 */
export function formatISO(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString();
}

/**
 * Get relative time (how long ago)
 * Example: "5 minutes ago", "2 hours ago", "yesterday"
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (weeks === 1) return '1 week ago';
  if (weeks < 4) return `${weeks} weeks ago`;
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  if (years === 1) return '1 year ago';
  return `${years} years ago`;
}

/**
 * Format duration in human-readable format
 * Example: "2h 30m 15s", "5m 30s", "45s"
 */
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;
  
  const parts: string[] = [];
  
  if (days > 0) parts.push(`${days}d`);
  if (remainingHours > 0) parts.push(`${remainingHours}h`);
  if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);
  
  return parts.join(' ');
}

/**
 * Format duration in long human-readable format
 * Example: "2 hours, 30 minutes, and 15 seconds"
 */
export function formatDurationLong(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;
  
  const parts: string[] = [];
  
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (remainingHours > 0) parts.push(`${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`);
  if (remainingMinutes > 0) parts.push(`${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`);
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`);
  }
  
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  
  const last = parts.pop();
  return `${parts.join(', ')}, and ${last}`;
}

/**
 * Get current local time info
 */
export function getCurrentTimeInfo(): {
  timestamp: number;
  local: string;
  iso: string;
  timezone: string;
  timezoneOffset: number;
  dayOfWeek: string;
  isWeekend: boolean;
  hour24: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
} {
  const now = new Date();
  const hour = now.getHours();
  
  let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  if (hour >= 5 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  else timeOfDay = 'night';
  
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  
  return {
    timestamp: now.getTime(),
    local: formatLocalTime(now.getTime()),
    iso: now.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: now.getTimezoneOffset(),
    dayOfWeek,
    isWeekend,
    hour24: hour,
    timeOfDay
  };
}

/**
 * Format a timestamp for logging
 * Example: "[2025-11-29 14:30:45]"
 */
export function formatLogTimestamp(timestamp: number = Date.now()): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `[${year}-${month}-${day} ${hours}:${minutes}:${seconds}]`;
}

/**
 * Get simulation time info (in-game time based on ticks)
 * Minecraft has 24000 ticks per day
 */
export function getSimulationTimeInfo(tickCount: number, ticksPerDay: number = 24000): {
  day: number;
  timeOfDay: string;
  hour: number;
  minute: number;
  isDaytime: boolean;
  formattedTime: string;
  formattedDay: string;
} {
  const day = Math.floor(tickCount / ticksPerDay) + 1;
  const tickInDay = tickCount % ticksPerDay;
  
  // Convert tick to hour (0-24)
  const hourFloat = (tickInDay / ticksPerDay) * 24;
  const hour = Math.floor(hourFloat);
  const minute = Math.floor((hourFloat - hour) * 60);
  
  // Minecraft day: 0-12000 is day, 12000-24000 is night
  const isDaytime = tickInDay >= 0 && tickInDay < 12000;
  
  let timeOfDay: string;
  if (tickInDay >= 0 && tickInDay < 6000) timeOfDay = 'Morning';
  else if (tickInDay >= 6000 && tickInDay < 12000) timeOfDay = 'Afternoon';
  else if (tickInDay >= 12000 && tickInDay < 18000) timeOfDay = 'Evening';
  else timeOfDay = 'Night';
  
  const formattedHour = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const formattedTime = `${formattedHour}:${String(minute).padStart(2, '0')} ${ampm}`;
  const formattedDay = `Day ${day}`;
  
  return {
    day,
    timeOfDay,
    hour,
    minute,
    isDaytime,
    formattedTime,
    formattedDay
  };
}

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

/**
 * Format a number with commas
 * Example: 1234567 -> "1,234,567"
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Format a number as compact
 * Example: 1234567 -> "1.2M"
 */
export function formatCompactNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
  return `${(num / 1000000000).toFixed(1)}B`;
}

/**
 * Format percentage
 * Example: 0.756 -> "75.6%"
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format bytes as human-readable
 * Example: 1234567 -> "1.18 MB"
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ============================================================================
// POSITION FORMATTING
// ============================================================================

/**
 * Format Minecraft position
 * Example: { x: 100, y: 64, z: -200 } -> "X: 100, Y: 64, Z: -200"
 */
export function formatPosition(pos: { x: number; y: number; z: number }): string {
  return `X: ${Math.round(pos.x)}, Y: ${Math.round(pos.y)}, Z: ${Math.round(pos.z)}`;
}

/**
 * Format position as compact
 * Example: { x: 100, y: 64, z: -200 } -> "(100, 64, -200)"
 */
export function formatPositionCompact(pos: { x: number; y: number; z: number }): string {
  return `(${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)})`;
}

/**
 * Calculate distance between two positions
 */
export function calculateDistance(
  pos1: { x: number; y: number; z: number },
  pos2: { x: number; y: number; z: number }
): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  const dz = pos2.z - pos1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Format distance
 * Example: 156.7 -> "157 blocks"
 */
export function formatDistance(distance: number): string {
  return `${Math.round(distance)} block${Math.round(distance) !== 1 ? 's' : ''}`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  formatLocalTime,
  formatShortTime,
  formatTimeOnly,
  formatDateOnly,
  formatISO,
  formatRelativeTime,
  formatDuration,
  formatDurationLong,
  getCurrentTimeInfo,
  formatLogTimestamp,
  getSimulationTimeInfo,
  formatNumber,
  formatCompactNumber,
  formatPercent,
  formatBytes,
  formatPosition,
  formatPositionCompact,
  calculateDistance,
  formatDistance
};
