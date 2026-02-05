/**
 * Degen Strategy
 * 
 * High risk, high reward. APE IN.
 * For those who like to live dangerously.
 */

import { TradingStrategy, StrategyDecision, ExitDecision, StrategyContext } from './base.js';
import type { NewTokenEvent } from '../core/listener.js';
import type { AnalysisResult } from '../ai/analyzer.js';
import type { PositionRecord } from '../db/schema.js';

export class DegenStrategy extends TradingStrategy {
  name = 'degen';
  description = '🦧 APE MODE: High risk, high reward, diamond hands';

  // Track "ape" moments
  private apeHistory: { token: string; time: number; result?: number }[] = [];

  async analyzeEntry(
    token: NewTokenEvent,
    analysis: AnalysisResult,
    context: StrategyContext
  ): Promise<StrategyDecision> {
    // Only basic safety checks
    if (analysis.score < 30) {
      return {
        action: 'SKIP',
        confidence: 0.9,
        reason: 'Even degens have standards',
      };
    }

    // Hard stop on known rugs
    const features = analysis.features;
    if (features.creatorRugCount > 0) {
      return {
        action: 'SKIP',
        confidence: 1,
        reason: 'Known rugger - not THAT degen',
      };
    }

    // FOMO check: is this getting attention?
    const nameHype = this.checkNameHype(token.name, token.symbol);
    
    // Position count? What position count?
    // (Still cap at some point to avoid total blowup)
    if (context.openPositions >= 10) {
      return {
        action: 'SKIP',
        confidence: 0.5,
        reason: 'Even degens need SOME limits',
      };
    }

    // Daily loss circuit breaker (even degens respect this)
    if (context.dailyPnl < -1.0) {
      return {
        action: 'SKIP',
        confidence: 0.9,
        reason: 'Daily loss limit hit - touching grass',
      };
    }

    // APE sizing based on hype
    let amountSol = 0.05;
    if (nameHype.score > 70) amountSol = 0.08;
    if (nameHype.score > 85) amountSol = 0.12;
    if (analysis.score > 70) amountSol *= 1.3;

    // Cap at max
    amountSol = Math.min(amountSol, 0.15);

    // Record the ape
    this.apeHistory.push({ token: token.mint, time: Date.now() });

    return {
      action: 'BUY',
      confidence: 0.5, // Honest about the gambling
      amountSol,
      slippageBps: 2500, // High slippage - we want IN
      stopLossPct: 40,   // Wide stop - diamond hands
      takeProfitTiers: [
        { multiplier: 3, sellPct: 30 },   // Some profit
        { multiplier: 10, sellPct: 40 },  // Moon bag
        { multiplier: 50, sellPct: 30 },  // Generational wealth
      ],
      reason: `🦧 APE: ${nameHype.reason}`,
      metadata: {
        hypeScore: nameHype.score,
        apeCount: this.apeHistory.length,
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

    // Diamond hands - wide trailing stop
    if (pnlPct > 100 && fromPeakPct > 40) {
      return {
        action: 'SELL_PARTIAL',
        sellPct: 50,
        reason: `💎🙌 Taking some off at +${pnlPct.toFixed(0)}%`,
      };
    }

    // Still diamond hands
    if (pnlPct > 0 && fromPeakPct > 50) {
      return {
        action: 'SELL_ALL',
        reason: `Securing bag: +${pnlPct.toFixed(0)}%`,
      };
    }

    // Wide stop loss
    if (pnlPct < -35) {
      return {
        action: 'SELL_ALL',
        reason: `Pain threshold: ${pnlPct.toFixed(1)}%`,
      };
    }

    // Hold through volatility
    return {
      action: 'HOLD',
      reason: `💎🙌 HODL: ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(0)}%`,
    };
  }

  /**
   * Check if name/symbol has meme potential
   */
  private checkNameHype(name: string, symbol: string): { score: number; reason: string } {
    let score = 50;
    const reasons: string[] = [];
    const combined = `${name} ${symbol}`.toLowerCase();

    // Trending meme patterns
    const hypePatterns = [
      { pattern: /pepe|frog|kek/i, boost: 15, reason: 'Pepe vibes' },
      { pattern: /doge|shib|inu|dog/i, boost: 10, reason: 'Dog coin' },
      { pattern: /cat|kitty|meow/i, boost: 12, reason: 'Cat meta' },
      { pattern: /trump|biden|elon|musk/i, boost: 20, reason: 'Political/celebrity' },
      { pattern: /ai|gpt|bot/i, boost: 15, reason: 'AI narrative' },
      { pattern: /sol|solana/i, boost: 10, reason: 'Solana meta' },
      { pattern: /moon|rocket|mars/i, boost: 8, reason: 'Moon talk' },
      { pattern: /wojak|chad|based/i, boost: 12, reason: 'Meme culture' },
      { pattern: /npc|normie/i, boost: 10, reason: 'NPC meme' },
      { pattern: /gm|gn|wagmi/i, boost: 8, reason: 'Crypto slang' },
      { pattern: /ape|monkey|gorilla/i, boost: 10, reason: 'Ape together strong' },
      { pattern: /diamond|hands|hodl/i, boost: 8, reason: 'Diamond hands' },
    ];

    for (const { pattern, boost, reason } of hypePatterns) {
      if (pattern.test(combined)) {
        score += boost;
        reasons.push(reason);
      }
    }

    // Length bonus (short = memeable)
    if (symbol.length <= 4) score += 5;
    if (name.length <= 10) score += 5;

    // All caps energy
    if (symbol === symbol.toUpperCase()) score += 3;

    // Cap at 100
    score = Math.min(100, score);

    return {
      score,
      reason: reasons.length > 0 ? reasons.join(', ') : 'Pure gambling',
    };
  }

  onTradeComplete(
    token: string,
    entryPrice: number,
    exitPrice: number,
    pnlPct: number,
    holdTimeMs: number
  ): void {
    // Update ape history with result
    const ape = this.apeHistory.find(a => a.token === token);
    if (ape) {
      ape.result = pnlPct;
    }

    // Keep last 100 apes
    if (this.apeHistory.length > 100) {
      this.apeHistory = this.apeHistory.slice(-100);
    }
  }

  /**
   * Get ape stats
   */
  getApeStats(): { totalApes: number; avgPnl: number; bestApe: number; worstApe: number } {
    const completed = this.apeHistory.filter(a => a.result !== undefined);
    if (completed.length === 0) {
      return { totalApes: 0, avgPnl: 0, bestApe: 0, worstApe: 0 };
    }

    const pnls = completed.map(a => a.result!);
    return {
      totalApes: this.apeHistory.length,
      avgPnl: pnls.reduce((a, b) => a + b, 0) / pnls.length,
      bestApe: Math.max(...pnls),
      worstApe: Math.min(...pnls),
    };
  }
}
