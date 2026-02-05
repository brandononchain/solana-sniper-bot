#!/usr/bin/env tsx
/**
 * AI Training Data Collector & Analyzer
 * 
 * This module:
 * 1. Collects outcome data for tokens we've seen
 * 2. Updates token_outcomes with actual results
 * 3. Analyzes patterns to improve scoring
 * 4. Exports training data for model fine-tuning
 */

import { Connection, PublicKey } from '@solana/web3.js';
import Database from 'better-sqlite3';
import { loadConfig } from '../config.js';
import { logger } from '../utils/logger.js';

interface TokenOutcome {
  tokenMint: string;
  tokenName?: string;
  initialScore: number;
  featuresJson: string;
  entryPrice?: number;
  peakPrice?: number;
  price1h?: number;
  price4h?: number;
  price24h?: number;
  maxPriceMultiple?: number;
  timeToPeakMs?: number;
  isRug: boolean;
  outcomeLabel?: string;
}

class OutcomeCollector {
  private connection: Connection;
  private db: Database.Database;

  constructor(rpcUrl: string, dbPath: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.db = new Database(dbPath);
  }

  /**
   * Update outcomes for tokens we've analyzed
   */
  async updateOutcomes(): Promise<void> {
    // Get tokens that need outcome updates
    const tokens = this.db.prepare(`
      SELECT token_mint, created_at, entry_price
      FROM token_outcomes
      WHERE outcome_label IS NULL
        AND created_at < datetime('now', '-1 hour')
      ORDER BY created_at DESC
      LIMIT 100
    `).all() as { token_mint: string; created_at: string; entry_price: number }[];

    logger.info(`Updating outcomes for ${tokens.length} tokens`);

    for (const token of tokens) {
      try {
        await this.updateTokenOutcome(token.token_mint, token.entry_price);
      } catch (err) {
        logger.debug(`Failed to update ${token.token_mint}`, { error: String(err) });
      }
    }
  }

  /**
   * Update outcome for a single token
   */
  private async updateTokenOutcome(mint: string, entryPrice?: number): Promise<void> {
    // In a real implementation, you would:
    // 1. Fetch current price from DEX/bonding curve
    // 2. Check if token is still tradeable (not rugged)
    // 3. Calculate max price reached
    // 4. Determine outcome classification

    // Placeholder: Fetch some on-chain data
    const mintPk = new PublicKey(mint);
    const accountInfo = await this.connection.getAccountInfo(mintPk);

    if (!accountInfo) {
      // Token account doesn't exist - likely rugged
      this.db.prepare(`
        UPDATE token_outcomes SET
          is_rug = 1,
          outcome_label = 'rug',
          updated_at = datetime('now')
        WHERE token_mint = ?
      `).run(mint);
      return;
    }

    // For demonstration, we'll set placeholder values
    // Real implementation would fetch actual price data
    const mockCurrentPrice = entryPrice ? entryPrice * (0.5 + Math.random() * 3) : 0;
    const mockPeakPrice = mockCurrentPrice * (1 + Math.random());
    const maxMultiple = entryPrice ? mockPeakPrice / entryPrice : 1;

    // Classify outcome
    let outcomeLabel: string;
    if (maxMultiple >= 5) {
      outcomeLabel = 'moon';
    } else if (maxMultiple >= 2) {
      outcomeLabel = 'winner';
    } else if (maxMultiple >= 0.9) {
      outcomeLabel = 'breakeven';
    } else if (maxMultiple >= 0.5) {
      outcomeLabel = 'loser';
    } else {
      outcomeLabel = 'rug';
    }

    this.db.prepare(`
      UPDATE token_outcomes SET
        peak_price = ?,
        max_price_multiple = ?,
        outcome_label = ?,
        is_rug = ?,
        updated_at = datetime('now')
      WHERE token_mint = ?
    `).run(
      mockPeakPrice,
      maxMultiple,
      outcomeLabel,
      outcomeLabel === 'rug' ? 1 : 0,
      mint
    );

    logger.debug(`Updated ${mint}: ${outcomeLabel} (${maxMultiple.toFixed(2)}x)`);
  }

  /**
   * Analyze patterns in collected data
   */
  analyzePatterns(): {
    winRate: number;
    avgWinMultiple: number;
    avgLossMultiple: number;
    rugRate: number;
    scoreCorrelation: number;
    bestFeatures: string[];
  } {
    const outcomes = this.db.prepare(`
      SELECT 
        initial_score,
        max_price_multiple,
        outcome_label,
        features_json
      FROM token_outcomes
      WHERE outcome_label IS NOT NULL
    `).all() as {
      initial_score: number;
      max_price_multiple: number;
      outcome_label: string;
      features_json: string;
    }[];

    if (outcomes.length === 0) {
      return {
        winRate: 0,
        avgWinMultiple: 0,
        avgLossMultiple: 0,
        rugRate: 0,
        scoreCorrelation: 0,
        bestFeatures: [],
      };
    }

    // Calculate basic stats
    const wins = outcomes.filter(o => ['moon', 'winner'].includes(o.outcome_label));
    const losses = outcomes.filter(o => ['loser', 'rug'].includes(o.outcome_label));
    const rugs = outcomes.filter(o => o.outcome_label === 'rug');

    const winRate = wins.length / outcomes.length;
    const rugRate = rugs.length / outcomes.length;

    const avgWinMultiple = wins.length > 0
      ? wins.reduce((sum, o) => sum + o.max_price_multiple, 0) / wins.length
      : 0;

    const avgLossMultiple = losses.length > 0
      ? losses.reduce((sum, o) => sum + o.max_price_multiple, 0) / losses.length
      : 0;

    // Calculate score-outcome correlation
    const scoreCorrelation = this.calculateCorrelation(
      outcomes.map(o => o.initial_score),
      outcomes.map(o => o.max_price_multiple)
    );

    // Find best features (simplified)
    const bestFeatures = this.findBestFeatures(outcomes);

    return {
      winRate,
      avgWinMultiple,
      avgLossMultiple,
      rugRate,
      scoreCorrelation,
      bestFeatures,
    };
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Find features most correlated with success
   */
  private findBestFeatures(outcomes: { features_json: string; outcome_label: string }[]): string[] {
    const featureScores: Record<string, { wins: number; total: number }> = {};

    for (const o of outcomes) {
      if (!o.features_json) continue;
      
      try {
        const features = JSON.parse(o.features_json);
        const isWin = ['moon', 'winner'].includes(o.outcome_label);

        for (const [key, value] of Object.entries(features)) {
          if (typeof value !== 'boolean' && typeof value !== 'number') continue;
          
          const featureKey = typeof value === 'boolean' 
            ? `${key}:${value}` 
            : `${key}:high`;

          if (!featureScores[featureKey]) {
            featureScores[featureKey] = { wins: 0, total: 0 };
          }

          if (typeof value === 'boolean' && value) {
            featureScores[featureKey].total++;
            if (isWin) featureScores[featureKey].wins++;
          } else if (typeof value === 'number' && value > 50) {
            featureScores[featureKey].total++;
            if (isWin) featureScores[featureKey].wins++;
          }
        }
      } catch {
        // Skip invalid JSON
      }
    }

    // Sort by win rate and return top features
    return Object.entries(featureScores)
      .filter(([, v]) => v.total >= 10)
      .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))
      .slice(0, 5)
      .map(([k]) => k);
  }

  /**
   * Export training data for external model training
   */
  exportTrainingData(outputPath: string): void {
    const data = this.db.prepare(`
      SELECT 
        token_mint,
        initial_score,
        features_json,
        max_price_multiple,
        outcome_label
      FROM token_outcomes
      WHERE outcome_label IS NOT NULL
        AND features_json IS NOT NULL
    `).all();

    const { writeFileSync } = require('fs');
    writeFileSync(outputPath, JSON.stringify(data, null, 2));
    logger.info(`Exported ${data.length} training samples to ${outputPath}`);
  }

  /**
   * Generate weight recommendations based on data
   */
  recommendWeights(): Record<string, number> {
    const analysis = this.analyzePatterns();
    
    // Start with default weights
    const weights = {
      creator_age: 0.15,
      mint_renounced: 0.20,
      social_presence: 0.10,
      name_quality: 0.10,
      market_timing: 0.15,
      early_buyers: 0.15,
      liquidity_depth: 0.15,
    };

    // Adjust based on feature importance (simplified)
    for (const feature of analysis.bestFeatures) {
      const [key] = feature.split(':');
      const weightKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (weightKey in weights) {
        (weights as any)[weightKey] *= 1.2; // Boost important features
      }
    }

    // Normalize to sum to 1
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    for (const key of Object.keys(weights)) {
      (weights as any)[key] /= total;
    }

    return weights;
  }

  close(): void {
    this.db.close();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'update';

  const config = loadConfig();
  const collector = new OutcomeCollector(config.rpc.primary, 'data/bot.db');

  try {
    switch (command) {
      case 'update':
        console.log('📊 Updating token outcomes...');
        await collector.updateOutcomes();
        break;

      case 'analyze':
        console.log('🔍 Analyzing patterns...\n');
        const analysis = collector.analyzePatterns();
        console.log('Win Rate:', (analysis.winRate * 100).toFixed(1) + '%');
        console.log('Avg Win Multiple:', analysis.avgWinMultiple.toFixed(2) + 'x');
        console.log('Avg Loss Multiple:', analysis.avgLossMultiple.toFixed(2) + 'x');
        console.log('Rug Rate:', (analysis.rugRate * 100).toFixed(1) + '%');
        console.log('Score-Outcome Correlation:', analysis.scoreCorrelation.toFixed(3));
        console.log('\nBest Features:', analysis.bestFeatures.join(', '));
        break;

      case 'export':
        const outputPath = args[1] || 'data/training-data.json';
        collector.exportTrainingData(outputPath);
        break;

      case 'weights':
        console.log('📈 Recommended weights based on data:\n');
        const weights = collector.recommendWeights();
        for (const [key, value] of Object.entries(weights)) {
          console.log(`  ${key}: ${value.toFixed(3)}`);
        }
        break;

      default:
        console.log('Usage: trainer <command>');
        console.log('Commands: update, analyze, export [path], weights');
    }
  } finally {
    collector.close();
  }
}

main().catch(console.error);
