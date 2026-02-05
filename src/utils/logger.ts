import chalk from 'chalk';
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { DateTime } from 'luxon';
import { dirname } from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS = {
  debug: chalk.gray,
  info: chalk.blue,
  warn: chalk.yellow,
  error: chalk.red,
};

const LOG_ICONS = {
  debug: '🔍',
  info: 'ℹ️ ',
  warn: '⚠️ ',
  error: '❌',
};

class Logger {
  private level: LogLevel = 'info';
  private logFile?: string;
  private listeners: ((entry: LogEntry) => void)[] = [];

  setLevel(level: LogLevel) {
    this.level = level;
  }

  setLogFile(path: string) {
    this.logFile = path;
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  addListener(fn: (entry: LogEntry) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.level]) return;

    const timestamp = DateTime.now().toFormat('HH:mm:ss.SSS');
    const entry: LogEntry = { level, message, meta, timestamp };

    // Console output
    const colorFn = LOG_COLORS[level];
    const icon = LOG_ICONS[level];
    const metaStr = meta ? ` ${chalk.dim(JSON.stringify(meta))}` : '';
    console.log(`${chalk.dim(timestamp)} ${icon} ${colorFn(message)}${metaStr}`);

    // File output
    if (this.logFile) {
      const logLine = JSON.stringify({
        ts: DateTime.now().toISO(),
        level,
        msg: message,
        ...meta,
      }) + '\n';
      appendFileSync(this.logFile, logLine);
    }

    // Notify listeners (for TUI)
    this.listeners.forEach(fn => fn(entry));
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.log('error', message, meta);
  }

  // Specialized log methods
  trade(action: 'BUY' | 'SELL' | 'SKIP' | 'TP' | 'SL', token: string, details: string) {
    const icons = {
      BUY: '🟢',
      SELL: '🔴',
      SKIP: '⏭️ ',
      TP: '💰',
      SL: '🛑',
    };
    this.info(`${icons[action]} [${action}] ${token} - ${details}`);
  }

  newToken(token: string, score: number) {
    this.info(`🆕 [NEW] ${token} score:${score}`);
  }

  position(token: string, pnlPct: number, action: string) {
    const icon = pnlPct >= 0 ? '📈' : '📉';
    const color = pnlPct >= 0 ? chalk.green : chalk.red;
    this.info(`${icon} [POS] ${token} ${color(`${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`)} - ${action}`);
  }
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}

export const logger = new Logger();
