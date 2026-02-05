import { logger } from '../utils/logger.js';
import { getOpenPositions, getTodayStats, updateDailyStat } from '../db/schema.js';
import type { Database } from 'better-sqlite3';
import type { PositionRecord } from '../db/schema.js';

export interface RiskConfig {
  maxPositions: number;
  maxDailyLossSol: number;
  maxSingleTokenSol: number;
  pauseAfterConsecutiveLosses: number;
  minBalanceSol: number;
  trailingStopPct: number;
  takeProfitTiers: { multiplier: number; sellPct: number }[];
}

export interface RiskCheck {
  allowed: boolean;
  reason?: string;
  suggestedAmount?: number;
}

export interface PositionAction {
  action: 'HOLD' | 'SELL_PARTIAL' | 'SELL_ALL' | 'STOP_LOSS';
  sellPct?: number;
  reason: string;
}

export class RiskManager {
  private db: Database;
  private config: RiskConfig;
  private consecutiveLosses = 0;
  private isPaused = false;

  constructor(db: Database, config: RiskConfig) {
    this.db = db;
    this.config = config;
    this.loadState();
  }

  /**
   * Load saved state from database
   */
  private loadState(): void {
    try {
      const state = this.db.prepare(
        `SELECT value FROM bot_state WHERE key = 'risk_manager'`
      ).get() as { value: string } | undefined;

      if (state) {
        const parsed = JSON.parse(state.value);
        this.consecutiveLosses = parsed.consecutiveLosses || 0;
        this.isPaused = parsed.isPaused || false;
      }
    } catch {
      // Ignore state load errors
    }
  }

  /**
   * Save state to database
   */
  private saveState(): void {
    const state = JSON.stringify({
      consecutiveLosses: this.consecutiveLosses,
      isPaused: this.isPaused,
    });

    this.db.prepare(`
      INSERT OR REPLACE INTO bot_state (key, value, updated_at)
      VALUES ('risk_manager', ?, datetime('now'))
    `).run(state);
  }

  /**
   * Check if a new trade is allowed
   */
  canTrade(amountSol: number, currentBalanceSol: number): RiskCheck {
    // Check if paused
    if (this.isPaused) {
      return {
        allowed: false,
        reason: `Trading paused after ${this.config.pauseAfterConsecutiveLosses} consecutive losses`,
      };
    }

    // Check minimum balance
    const balanceAfterTrade = currentBalanceSol - amountSol;
    if (balanceAfterTrade < this.config.minBalanceSol) {
      const maxAmount = currentBalanceSol - this.config.minBalanceSol;
      if (maxAmount <= 0) {
        return {
          allowed: false,
          reason: `Insufficient balance (need ${this.config.minBalanceSol} SOL reserve)`,
        };
      }
      return {
        allowed: true,
        suggestedAmount: maxAmount,
        reason: `Reduced amount to maintain ${this.config.minBalanceSol} SOL reserve`,
      };
    }

    // Check max single token exposure
    if (amountSol > this.config.maxSingleTokenSol) {
      return {
        allowed: true,
        suggestedAmount: this.config.maxSingleTokenSol,
        reason: `Capped at max single token exposure: ${this.config.maxSingleTokenSol} SOL`,
      };
    }

    // Check open positions count
    const openPositions = getOpenPositions(this.db);
    if (openPositions.length >= this.config.maxPositions) {
      return {
        allowed: false,
        reason: `Max open positions reached (${this.config.maxPositions})`,
      };
    }

    // Check daily loss limit
    const todayStats = getTodayStats(this.db);
    if (todayStats.realizedPnlSol <= -this.config.maxDailyLossSol) {
      return {
        allowed: false,
        reason: `Daily loss limit reached (${todayStats.realizedPnlSol.toFixed(4)} SOL)`,
      };
    }

    return { allowed: true };
  }

  /**
   * Check what action to take on a position
   */
  checkPosition(position: PositionRecord, currentPrice: number): PositionAction {
    const entryPrice = position.entryPrice;
    const highestPrice = Math.max(position.highestPrice || entryPrice, currentPrice);
    
    // Calculate P&L percentage
    const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;
    const fromPeakPct = ((highestPrice - currentPrice) / highestPrice) * 100;

    // Check trailing stop loss
    if (pnlPct > 0 && fromPeakPct >= this.config.trailingStopPct) {
      return {
        action: 'SELL_ALL',
        reason: `Trailing stop triggered: ${fromPeakPct.toFixed(1)}% from peak`,
      };
    }

    // Check fixed stop loss (if in loss)
    if (pnlPct <= -(position.stopLossPct || 50)) {
      return {
        action: 'STOP_LOSS',
        reason: `Stop loss triggered: ${pnlPct.toFixed(1)}%`,
      };
    }

    // Check take profit tiers
    const tiers = position.takeProfitTiers || this.config.takeProfitTiers;
    const priceMultiple = currentPrice / entryPrice;

    // Track which tiers have been hit (stored in position data)
    const tiersHit = this.getTiersHit(position.id);

    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      if (priceMultiple >= tier.multiplier && !tiersHit.includes(i)) {
        // Mark tier as hit
        this.markTierHit(position.id, i);
        
        return {
          action: 'SELL_PARTIAL',
          sellPct: tier.sellPct,
          reason: `Take profit ${tier.multiplier}x hit (${pnlPct.toFixed(1)}%)`,
        };
      }
    }

    return {
      action: 'HOLD',
      reason: `P&L: ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`,
    };
  }

  /**
   * Get which take profit tiers have been hit for a position
   */
  private getTiersHit(positionId: string): number[] {
    try {
      const row = this.db.prepare(
        `SELECT value FROM bot_state WHERE key = ?`
      ).get(`tiers_${positionId}`) as { value: string } | undefined;
      
      return row ? JSON.parse(row.value) : [];
    } catch {
      return [];
    }
  }

  /**
   * Mark a take profit tier as hit
   */
  private markTierHit(positionId: string, tierIndex: number): void {
    const current = this.getTiersHit(positionId);
    current.push(tierIndex);
    
    this.db.prepare(`
      INSERT OR REPLACE INTO bot_state (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `).run(`tiers_${positionId}`, JSON.stringify(current));
  }

  /**
   * Clear tier tracking for a closed position
   */
  clearTierTracking(positionId: string): void {
    this.db.prepare(`DELETE FROM bot_state WHERE key = ?`).run(`tiers_${positionId}`);
  }

  /**
   * Record a trade result for risk tracking
   */
  recordTradeResult(isProfit: boolean, pnlSol: number): void {
    if (isProfit) {
      this.consecutiveLosses = 0;
      updateDailyStat(this.db, 'winningTrades', 1);
    } else {
      this.consecutiveLosses++;
      updateDailyStat(this.db, 'losingTrades', 1);
      
      // Check if should pause
      if (this.consecutiveLosses >= this.config.pauseAfterConsecutiveLosses) {
        this.isPaused = true;
        logger.warn(`🛑 Trading paused after ${this.consecutiveLosses} consecutive losses`);
      }
    }

    updateDailyStat(this.db, 'realizedPnlSol', pnlSol);
    this.saveState();
  }

  /**
   * Resume trading after pause
   */
  resume(): void {
    this.isPaused = false;
    this.consecutiveLosses = 0;
    this.saveState();
    logger.info('✅ Trading resumed');
  }

  /**
   * Pause trading manually
   */
  pause(): void {
    this.isPaused = true;
    this.saveState();
    logger.info('⏸️  Trading paused');
  }

  /**
   * Get current risk status
   */
  getStatus(): {
    isPaused: boolean;
    consecutiveLosses: number;
    openPositions: number;
    maxPositions: number;
    dailyPnl: number;
    maxDailyLoss: number;
  } {
    const positions = getOpenPositions(this.db);
    const stats = getTodayStats(this.db);

    return {
      isPaused: this.isPaused,
      consecutiveLosses: this.consecutiveLosses,
      openPositions: positions.length,
      maxPositions: this.config.maxPositions,
      dailyPnl: stats.realizedPnlSol,
      maxDailyLoss: this.config.maxDailyLossSol,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RiskConfig>): void {
    Object.assign(this.config, newConfig);
    logger.info('Risk config updated', newConfig);
  }

  /**
   * Calculate position size based on Kelly Criterion (simplified)
   */
  calculatePositionSize(
    winRate: number,
    avgWinMultiple: number,
    avgLossMultiple: number,
    bankroll: number
  ): number {
    // Kelly formula: f = (bp - q) / b
    // where b = avgWin/avgLoss, p = win rate, q = 1-p
    
    const b = avgWinMultiple / Math.abs(avgLossMultiple);
    const p = winRate;
    const q = 1 - p;
    
    const kelly = (b * p - q) / b;
    
    // Use fractional Kelly (25%) for safety
    const fractionalKelly = kelly * 0.25;
    
    // Clamp between 0 and max single token
    const positionSize = Math.max(0, Math.min(
      fractionalKelly * bankroll,
      this.config.maxSingleTokenSol
    ));

    return positionSize;
  }

  /**
   * Get historical win rate
   */
  getWinRate(): number {
    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) FILTER (WHERE realized_pnl_sol > 0) as wins,
        COUNT(*) as total
      FROM positions WHERE remaining_tokens = 0
    `).get() as { wins: number; total: number };

    if (stats.total === 0) return 0.5; // Default 50%
    return stats.wins / stats.total;
  }
}
