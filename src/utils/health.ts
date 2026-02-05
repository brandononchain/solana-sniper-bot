/**
 * Health Check & Monitoring
 * 
 * System health monitoring for the bot
 */

import { Connection } from '@solana/web3.js';
import { logger } from './logger.js';

export interface HealthStatus {
  healthy: boolean;
  timestamp: number;
  checks: {
    rpc: { ok: boolean; latencyMs?: number; error?: string };
    database: { ok: boolean; error?: string };
    wallet: { ok: boolean; balance?: number; error?: string };
    listener: { ok: boolean; connected?: boolean; error?: string };
  };
  uptime: number;
  version: string;
}

export class HealthMonitor {
  private startTime = Date.now();
  private connection: Connection;
  private db: any;
  private walletManager: any;
  private listener: any;

  constructor(
    connection: Connection,
    db: any,
    walletManager?: any,
    listener?: any
  ) {
    this.connection = connection;
    this.db = db;
    this.walletManager = walletManager;
    this.listener = listener;
  }

  /**
   * Run all health checks
   */
  async check(): Promise<HealthStatus> {
    const checks = {
      rpc: await this.checkRpc(),
      database: await this.checkDatabase(),
      wallet: await this.checkWallet(),
      listener: await this.checkListener(),
    };

    const healthy = Object.values(checks).every(c => c.ok);

    return {
      healthy,
      timestamp: Date.now(),
      checks,
      uptime: Date.now() - this.startTime,
      version: '1.0.0',
    };
  }

  /**
   * Check RPC connection
   */
  private async checkRpc(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
    try {
      const start = Date.now();
      await this.connection.getSlot();
      const latencyMs = Date.now() - start;
      
      return { ok: true, latencyMs };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  /**
   * Check database connection
   */
  private async checkDatabase(): Promise<{ ok: boolean; error?: string }> {
    try {
      this.db.prepare('SELECT 1').get();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  /**
   * Check wallet status
   */
  private async checkWallet(): Promise<{ ok: boolean; balance?: number; error?: string }> {
    if (!this.walletManager) {
      return { ok: true }; // Skip if not provided
    }

    try {
      const balance = await this.walletManager.getActiveBalance();
      return { ok: true, balance: balance.sol };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  /**
   * Check listener status
   */
  private async checkListener(): Promise<{ ok: boolean; connected?: boolean; error?: string }> {
    if (!this.listener) {
      return { ok: true }; // Skip if not provided
    }

    try {
      const connected = this.listener.isActive?.() ?? false;
      return { ok: true, connected };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  /**
   * Get uptime in human readable format
   */
  getUptime(): string {
    const ms = Date.now() - this.startTime;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Start periodic health logging
   */
  startPeriodicCheck(intervalMs = 60000): NodeJS.Timeout {
    return setInterval(async () => {
      const status = await this.check();
      if (!status.healthy) {
        logger.warn('Health check failed', { checks: status.checks });
      } else {
        logger.debug('Health check passed', { uptime: this.getUptime() });
      }
    }, intervalMs);
  }
}

/**
 * Get system metrics
 */
export function getSystemMetrics() {
  const memUsage = process.memoryUsage();
  
  return {
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
    },
    uptime: process.uptime(),
    pid: process.pid,
    nodeVersion: process.version,
  };
}
