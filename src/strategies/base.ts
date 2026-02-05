/**
 * Trading Strategy Framework
 * 
 * Defines the interface for pluggable trading strategies
 */

import type { NewTokenEvent } from '../core/listener.js';
import type { AnalysisResult } from '../ai/analyzer.js';
import type { PositionRecord } from '../db/schema.js';

export interface StrategyDecision {
  action: 'BUY' | 'SKIP' | 'WATCH';
  confidence: number;       // 0-1
  amountSol?: number;       // Override default amount
  slippageBps?: number;     // Override default slippage
  stopLossPct?: number;     // Custom stop loss
  takeProfitTiers?: { multiplier: number; sellPct: number }[];
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface ExitDecision {
  action: 'HOLD' | 'SELL_PARTIAL' | 'SELL_ALL';
  sellPct?: number;
  reason: string;
}

export interface StrategyContext {
  balance: number;
  openPositions: number;
  maxPositions: number;
  dailyPnl: number;
  winRate: number;
  consecutiveLosses: number;
  marketConditions: {
    solPrice: number;
    volume24h: number;
    sentiment: 'bullish' | 'neutral' | 'bearish';
  };
}

export abstract class TradingStrategy {
  abstract name: string;
  abstract description: string;

  /**
   * Analyze a new token and decide whether to buy
   */
  abstract analyzeEntry(
    token: NewTokenEvent,
    analysis: AnalysisResult,
    context: StrategyContext
  ): Promise<StrategyDecision>;

  /**
   * Analyze an existing position and decide whether to exit
   */
  abstract analyzeExit(
    position: PositionRecord,
    currentPrice: number,
    context: StrategyContext
  ): Promise<ExitDecision>;

  /**
   * Called when a trade completes (for learning)
   */
  onTradeComplete?(
    token: string,
    entryPrice: number,
    exitPrice: number,
    pnlPct: number,
    holdTimeMs: number
  ): void;
}

/**
 * Strategy registry for managing multiple strategies
 */
export class StrategyRegistry {
  private strategies: Map<string, TradingStrategy> = new Map();
  private activeStrategy: string = 'default';

  register(strategy: TradingStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  setActive(name: string): boolean {
    if (this.strategies.has(name)) {
      this.activeStrategy = name;
      return true;
    }
    return false;
  }

  getActive(): TradingStrategy | undefined {
    return this.strategies.get(this.activeStrategy);
  }

  list(): { name: string; description: string; active: boolean }[] {
    return Array.from(this.strategies.values()).map(s => ({
      name: s.name,
      description: s.description,
      active: s.name === this.activeStrategy,
    }));
  }
}
