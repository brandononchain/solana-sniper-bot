/**
 * Momentum Strategy
 * 
 * Focuses on tokens showing strong early buy pressure.
 * Enters on momentum confirmation, exits quickly on reversal.
 */

import { TradingStrategy, StrategyDecision, ExitDecision, StrategyContext } from './base.js';
import type { NewTokenEvent } from '../core/listener.js';
import type { AnalysisResult } from '../ai/analyzer.js';
import type { PositionRecord } from '../db/schema.js';
import { logger } from '../utils/logger.js';

export class MomentumStrategy extends TradingStrategy {
  name = 'momentum';
  description = 'Rides early momentum waves, quick entries and exits';

  // Track momentum for tokens we're watching
  private momentumScores: Map<string, {
    buyCount: number;
    sellCount: number;
    volumeSol: number;
    firstSeen: number;
    priceAtFirst: number;
  }> = new Map();

  async analyzeEntry(
    token: NewTokenEvent,
    analysis: AnalysisResult,
    context: StrategyContext
  ): Promise<StrategyDecision> {
    // Base requirements
    if (analysis.score < 55) {
      return {
        action: 'SKIP',
        confidence: 0.9,
        reason: `Score too low: ${analysis.score}`,
      };
    }

    // Check market conditions
    if (context.marketConditions.sentiment === 'bearish') {
      return {
        action: 'SKIP',
        confidence: 0.7,
        reason: 'Bearish market conditions',
      };
    }

    // Position management
    if (context.openPositions >= context.maxPositions) {
      return {
        action: 'SKIP',
        confidence: 1,
        reason: 'Max positions reached',
      };
    }

    // Daily loss check
    if (context.dailyPnl < -0.3) { // Stop if down 0.3 SOL
      return {
        action: 'SKIP',
        confidence: 1,
        reason: 'Daily loss limit approaching',
      };
    }

    // Momentum requirements
    const features = analysis.features;
    
    // We want to see early buying pressure
    if (features.buyPressure < 1.5) {
      return {
        action: 'WATCH',
        confidence: 0.6,
        reason: 'Waiting for stronger buy pressure',
      };
    }

    // Calculate position size based on confidence
    let amountSol = 0.05; // Base amount
    if (analysis.score >= 80) amountSol = 0.08;
    if (analysis.score >= 90) amountSol = 0.1;

    // Adjust for win rate
    if (context.winRate < 0.4) {
      amountSol *= 0.5; // Reduce size if losing
    }

    // More aggressive slippage for momentum plays
    const slippageBps = 1500; // 15%

    return {
      action: 'BUY',
      confidence: analysis.confidence,
      amountSol,
      slippageBps,
      stopLossPct: 25, // Tighter stop loss
      takeProfitTiers: [
        { multiplier: 1.5, sellPct: 40 }, // Quick partial profit
        { multiplier: 2.5, sellPct: 40 },
        { multiplier: 5, sellPct: 20 },
      ],
      reason: `Momentum play: score ${analysis.score}, buy pressure ${features.buyPressure.toFixed(1)}x`,
    };
  }

  async analyzeExit(
    position: PositionRecord,
    currentPrice: number,
    context: StrategyContext
  ): Promise<ExitDecision> {
    const entryPrice = position.entryPrice;
    const highestPrice = position.highestPrice || entryPrice;
    const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;
    const fromPeakPct = ((highestPrice - currentPrice) / highestPrice) * 100;

    // Momentum strategy: quick exit on reversal
    // If we've gained and now dropping, exit faster than normal
    if (pnlPct > 20 && fromPeakPct > 10) {
      return {
        action: 'SELL_ALL',
        reason: `Momentum reversal: ${fromPeakPct.toFixed(1)}% from peak`,
      };
    }

    // Standard trailing stop
    if (fromPeakPct > 15) {
      return {
        action: 'SELL_ALL',
        reason: `Trailing stop: ${fromPeakPct.toFixed(1)}% drawdown`,
      };
    }

    // Quick loss cut
    if (pnlPct < -15) {
      return {
        action: 'SELL_ALL',
        reason: `Stop loss: ${pnlPct.toFixed(1)}%`,
      };
    }

    return {
      action: 'HOLD',
      reason: `Holding: ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`,
    };
  }

  onTradeComplete(
    token: string,
    entryPrice: number,
    exitPrice: number,
    pnlPct: number,
    holdTimeMs: number
  ): void {
    // Clean up momentum tracking
    this.momentumScores.delete(token);
    
    // Log for analysis
    logger.debug('Momentum trade complete', {
      token: token.slice(0, 8),
      pnlPct: pnlPct.toFixed(1),
      holdTime: `${(holdTimeMs / 1000 / 60).toFixed(1)}m`,
    });
  }
}
