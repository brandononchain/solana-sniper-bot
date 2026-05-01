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
  takeProfitTiers: { multiplier: number; sellPct: number; sellRemaining?: boolean }[];
}

export interface RiskCheck {
  allowed: boolean;
  reason?: string;
  suggestedAmount?: number;
}

export interface PositionAction {
  action: 'HOLD' | 'SELL_PARTIAL' | 'SELL_ALL' | 'STOP_LOSS';
  sellPct?: number;
  sellTokens?: number;
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

  private loadState(): void {
    try {
      const state = this.db.prepare(`SELECT value FROM bot_state WHERE key = 'risk_manager'`).get() as { value: string } | undefined;
      if (state) {
        const parsed = JSON.parse(state.value);
        this.consecutiveLosses = parsed.consecutiveLosses || 0;
        this.isPaused = parsed.isPaused || false;
      }
    } catch {
      // Ignore state load errors
    }
  }

  private saveState(): void {
    const state = JSON.stringify({ consecutiveLosses: this.consecutiveLosses, isPaused: this.isPaused });
    this.db.prepare(`
      INSERT OR REPLACE INTO bot_state (key, value, updated_at)
      VALUES ('risk_manager', ?, datetime('now'))
    `).run(state);
  }

  canTrade(amountSol: number, currentBalanceSol: number): RiskCheck {
    if (this.isPaused) {
      return { allowed: false, reason: `Trading paused after ${this.config.pauseAfterConsecutiveLosses} consecutive losses` };
    }

    const balanceAfterTrade = currentBalanceSol - amountSol;
    if (balanceAfterTrade < this.config.minBalanceSol) {
      const maxAmount = currentBalanceSol - this.config.minBalanceSol;
      if (maxAmount <= 0) {
        return { allowed: false, reason: `Insufficient balance (need ${this.config.minBalanceSol} SOL reserve)` };
      }
      return { allowed: true, suggestedAmount: maxAmount, reason: `Reduced amount to maintain ${this.config.minBalanceSol} SOL reserve` };
    }

    if (amountSol > this.config.maxSingleTokenSol) {
      return { allowed: true, suggestedAmount: this.config.maxSingleTokenSol, reason: `Capped at max single token exposure: ${this.config.maxSingleTokenSol} SOL` };
    }

    const openPositions = getOpenPositions(this.db);
    if (openPositions.length >= this.config.maxPositions) {
      return { allowed: false, reason: `Max open positions reached (${this.config.maxPositions})` };
    }

    const todayStats = getTodayStats(this.db);
    if (todayStats.realizedPnlSol <= -this.config.maxDailyLossSol) {
      return { allowed: false, reason: `Daily loss limit reached (${todayStats.realizedPnlSol.toFixed(4)} SOL)` };
    }

    return { allowed: true };
  }

  checkPosition(position: PositionRecord, currentPrice: number): PositionAction {
    const entryPrice = position.entryPrice;
    const highestPrice = Math.max(position.highestPrice || entryPrice, currentPrice);
    const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;
    const fromPeakPct = ((highestPrice - currentPrice) / highestPrice) * 100;

    if (pnlPct > 0 && fromPeakPct >= this.config.trailingStopPct) {
      return { action: 'SELL_ALL', reason: `Trailing stop triggered: ${fromPeakPct.toFixed(1)}% from peak` };
    }

    if (pnlPct <= -(position.stopLossPct || 50)) {
      return { action: 'STOP_LOSS', reason: `Stop loss triggered: ${pnlPct.toFixed(1)}%` };
    }

    const tiers = position.takeProfitTiers || this.config.takeProfitTiers;
    const priceMultiple = currentPrice / entryPrice;
    const tiersHit = this.getTiersHit(position.id);

    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      if (priceMultiple >= tier.multiplier && !tiersHit.includes(i)) {
        this.markTierHit(position.id, i);

        const isFinalTier = i === tiers.length - 1;
        const sellRemaining = tier.sellRemaining === true || isFinalTier;
        if (sellRemaining) {
          return {
            action: 'SELL_ALL',
            sellPct: 100,
            sellTokens: position.remainingTokens,
            reason: `Final take profit ${tier.multiplier}x hit (${pnlPct.toFixed(1)}%)`,
          };
        }

        const targetTokensFromOriginal = position.amountTokens * (tier.sellPct / 100);
        const sellTokens = Math.min(position.remainingTokens, targetTokensFromOriginal);
        const sellPctOfRemaining = position.remainingTokens > 0
          ? Math.min(100, (sellTokens / position.remainingTokens) * 100)
          : 0;

        return {
          action: 'SELL_PARTIAL',
          sellPct: sellPctOfRemaining,
          sellTokens,
          reason: `Take profit ${tier.multiplier}x hit (${pnlPct.toFixed(1)}%)`,
        };
      }
    }

    return { action: 'HOLD', reason: `P&L: ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%` };
  }

  private getTiersHit(positionId: string): number[] {
    try {
      const row = this.db.prepare(`SELECT value FROM bot_state WHERE key = ?`).get(`tiers_${positionId}`) as { value: string } | undefined;
      return row ? JSON.parse(row.value) : [];
    } catch {
      return [];
    }
  }

  private markTierHit(positionId: string, tierIndex: number): void {
    const current = this.getTiersHit(positionId);
    if (!current.includes(tierIndex)) current.push(tierIndex);
    this.db.prepare(`
      INSERT OR REPLACE INTO bot_state (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `).run(`tiers_${positionId}`, JSON.stringify(current));
  }

  clearTierTracking(positionId: string): void {
    this.db.prepare(`DELETE FROM bot_state WHERE key = ?`).run(`tiers_${positionId}`);
  }

  recordTradeResult(isProfit: boolean, pnlSol: number): void {
    if (isProfit) {
      this.consecutiveLosses = 0;
      updateDailyStat(this.db, 'winningTrades', 1);
    } else {
      this.consecutiveLosses++;
      updateDailyStat(this.db, 'losingTrades', 1);
      if (this.consecutiveLosses >= this.config.pauseAfterConsecutiveLosses) {
        this.isPaused = true;
        logger.warn(`🛑 Trading paused after ${this.consecutiveLosses} consecutive losses`);
      }
    }

    updateDailyStat(this.db, 'realizedPnlSol', pnlSol);
    this.saveState();
  }

  resume(): void {
    this.isPaused = false;
    this.consecutiveLosses = 0;
    this.saveState();
    logger.info('✅ Trading resumed');
  }

  pause(): void {
    this.isPaused = true;
    this.saveState();
    logger.info('⏸️  Trading paused');
  }

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

  updateConfig(newConfig: Partial<RiskConfig>): void {
    Object.assign(this.config, newConfig);
    logger.info('Risk config updated', newConfig);
  }

  calculatePositionSize(winRate: number, avgWinMultiple: number, avgLossMultiple: number, bankroll: number): number {
    const b = avgWinMultiple / Math.abs(avgLossMultiple || 1);
    const p = winRate;
    const q = 1 - p;
    const kelly = (b * p - q) / b;
    const fractionalKelly = kelly * 0.25;
    return Math.max(0, Math.min(fractionalKelly * bankroll, this.config.maxSingleTokenSol));
  }

  getWinRate(): number {
    const stats = this.db.prepare(`
      SELECT COUNT(*) FILTER (WHERE realized_pnl_sol > 0) as wins, COUNT(*) as total
      FROM positions WHERE remaining_tokens = 0
    `).get() as { wins: number; total: number };
    if (stats.total === 0) return 0.5;
    return stats.wins / stats.total;
  }
}
