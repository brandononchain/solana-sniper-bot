/**
 * Pure Sniper Strategy
 * 
 * The classic approach: be first, get out fast.
 * Optimized for speed over analysis depth.
 */

import { TradingStrategy, StrategyDecision, ExitDecision, StrategyContext } from './base.js';
import type { NewTokenEvent } from '../core/listener.js';
import type { AnalysisResult } from '../ai/analyzer.js';
import type { PositionRecord } from '../db/schema.js';

export class SniperStrategy extends TradingStrategy {
  name = 'sniper';
  description = 'Fast entry on new tokens, quick profits, tight stops';

  async analyzeEntry(
    token: NewTokenEvent,
    analysis: AnalysisResult,
    context: StrategyContext
  ): Promise<StrategyDecision> {
    // Minimal filtering - speed is key
    // Only reject obvious scams
    if (analysis.score < 40) {
      return {
        action: 'SKIP',
        confidence: 0.95,
        reason: 'Failed basic safety checks',
      };
    }

    // Don't snipe during bad losing streaks
    if (context.consecutiveLosses >= 3) {
      return {
        action: 'SKIP',
        confidence: 0.8,
        reason: 'Cooling off after losses',
      };
    }

    // Check if token is too old (more than 30 seconds)
    const ageMs = Date.now() - token.timestamp;
    if (ageMs > 30000) {
      return {
        action: 'SKIP',
        confidence: 0.7,
        reason: 'Token too old for snipe',
      };
    }

    // Small, fixed position size
    const amountSol = 0.03;

    return {
      action: 'BUY',
      confidence: 0.6, // Lower confidence, higher risk
      amountSol,
      slippageBps: 2000, // High slippage tolerance for speed
      stopLossPct: 30,
      takeProfitTiers: [
        { multiplier: 2, sellPct: 50 },   // Quick 2x, take half
        { multiplier: 4, sellPct: 50 },   // Let rest ride to 4x
      ],
      reason: `Quick snipe: ${ageMs}ms old, score ${analysis.score}`,
    };
  }

  async analyzeExit(
    position: PositionRecord,
    currentPrice: number,
    context: StrategyContext
  ): Promise<ExitDecision> {
    const entryPrice = position.entryPrice;
    const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;
    const highestPrice = position.highestPrice || entryPrice;
    const fromPeakPct = ((highestPrice - currentPrice) / highestPrice) * 100;

    // Time-based exit: if holding too long, take what we have
    const holdTimeMs = Date.now() - new Date(position.openedAt).getTime();
    const holdTimeMinutes = holdTimeMs / 1000 / 60;

    // If profitable and held > 10 minutes, start exiting
    if (pnlPct > 10 && holdTimeMinutes > 10) {
      return {
        action: 'SELL_PARTIAL',
        sellPct: 50,
        reason: `Time exit: +${pnlPct.toFixed(1)}% after ${holdTimeMinutes.toFixed(0)}m`,
      };
    }

    // If held > 30 minutes, exit regardless
    if (holdTimeMinutes > 30) {
      return {
        action: 'SELL_ALL',
        reason: `Max hold time: ${holdTimeMinutes.toFixed(0)}m`,
      };
    }

    // Quick stop loss
    if (pnlPct < -20) {
      return {
        action: 'SELL_ALL',
        reason: `Stop loss: ${pnlPct.toFixed(1)}%`,
      };
    }

    // Trailing stop from peak
    if (pnlPct > 0 && fromPeakPct > 20) {
      return {
        action: 'SELL_ALL',
        reason: `Trailing stop: ${fromPeakPct.toFixed(1)}% from peak`,
      };
    }

    return {
      action: 'HOLD',
      reason: `Sniping: ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}% (${holdTimeMinutes.toFixed(0)}m)`,
    };
  }
}
