/**
 * Conservative Strategy
 * 
 * High selectivity, thorough analysis.
 * Waits for confirmation before entering.
 */

import { TradingStrategy, StrategyDecision, ExitDecision, StrategyContext } from './base.js';
import type { NewTokenEvent } from '../core/listener.js';
import type { AnalysisResult } from '../ai/analyzer.js';
import type { PositionRecord } from '../db/schema.js';

export class ConservativeStrategy extends TradingStrategy {
  name = 'conservative';
  description = 'High selectivity, thorough due diligence, patient entries';

  // Track tokens we're watching for confirmation
  private watchlist: Map<string, {
    firstSeen: number;
    analysis: AnalysisResult;
    priceHistory: { price: number; time: number }[];
  }> = new Map();

  async analyzeEntry(
    token: NewTokenEvent,
    analysis: AnalysisResult,
    context: StrategyContext
  ): Promise<StrategyDecision> {
    // Strict score requirement
    if (analysis.score < 75) {
      return {
        action: 'SKIP',
        confidence: 0.95,
        reason: `Score ${analysis.score} below conservative threshold (75)`,
      };
    }

    // Require high confidence
    if (analysis.confidence < 0.7) {
      return {
        action: 'WATCH',
        confidence: 0.6,
        reason: `Low confidence: ${(analysis.confidence * 100).toFixed(0)}%`,
      };
    }

    // Check for red flags
    const features = analysis.features;
    
    if (!features.mintRenounced) {
      return {
        action: 'SKIP',
        confidence: 0.95,
        reason: 'Mint authority not renounced',
      };
    }

    if (features.creatorAge < 24) {
      return {
        action: 'SKIP',
        confidence: 0.8,
        reason: `Creator wallet too new: ${features.creatorAge.toFixed(1)}h`,
      };
    }

    if (features.creatorRugCount > 0) {
      return {
        action: 'SKIP',
        confidence: 0.99,
        reason: `Creator has ${features.creatorRugCount} previous rugs`,
      };
    }

    // Market conditions check
    if (context.marketConditions.sentiment === 'bearish') {
      return {
        action: 'SKIP',
        confidence: 0.7,
        reason: 'Bearish market - staying out',
      };
    }

    // Limit positions more strictly
    if (context.openPositions >= Math.min(context.maxPositions, 3)) {
      return {
        action: 'SKIP',
        confidence: 1,
        reason: 'Conservative position limit reached',
      };
    }

    // Conservative position sizing
    let amountSol = 0.03;
    if (analysis.score >= 85) amountSol = 0.05;
    if (analysis.score >= 95) amountSol = 0.07;

    // Reduce on losing streak
    if (context.winRate < 0.5) {
      amountSol *= 0.7;
    }

    return {
      action: 'BUY',
      confidence: analysis.confidence,
      amountSol,
      slippageBps: 800, // Lower slippage tolerance
      stopLossPct: 20,
      takeProfitTiers: [
        { multiplier: 2, sellPct: 30 },
        { multiplier: 3, sellPct: 30 },
        { multiplier: 5, sellPct: 25 },
        { multiplier: 10, sellPct: 15 },
      ],
      reason: `High conviction: score ${analysis.score}, confidence ${(analysis.confidence * 100).toFixed(0)}%`,
      metadata: {
        reasons: analysis.reasons,
        riskFactors: analysis.riskFactors,
      },
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

    // Conservative: wider trailing stop, let winners run
    if (pnlPct > 50 && fromPeakPct > 25) {
      return {
        action: 'SELL_ALL',
        reason: `Protecting profits: +${pnlPct.toFixed(1)}%, ${fromPeakPct.toFixed(1)}% from peak`,
      };
    }

    // Standard trailing stop
    if (pnlPct > 0 && fromPeakPct > 20) {
      return {
        action: 'SELL_ALL',
        reason: `Trailing stop: ${fromPeakPct.toFixed(1)}% drawdown`,
      };
    }

    // Stop loss
    if (pnlPct < -15) {
      return {
        action: 'SELL_ALL',
        reason: `Stop loss: ${pnlPct.toFixed(1)}%`,
      };
    }

    return {
      action: 'HOLD',
      reason: `Conservative hold: ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`,
    };
  }
}
