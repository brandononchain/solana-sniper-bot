import { Connection, PublicKey } from '@solana/web3.js';
import { logger } from '../utils/logger.js';
import { SCORE_THRESHOLDS } from '../utils/constants.js';
import type { Database } from 'better-sqlite3';
import type { TokenMetadata, FilterResult } from '../filters/scam-filter.js';

export interface TokenFeatures {
  // Creator features
  creatorAge: number;         // Hours since first tx
  creatorTokenCount: number;  // Number of tokens created
  creatorRugCount: number;    // Known rugs
  creatorBalance: number;     // SOL balance
  
  // Token features
  nameLength: number;
  symbolLength: number;
  hasUri: boolean;
  uriValid: boolean;
  
  // Market features
  initialLiquidity: number;
  earlyBuyerCount: number;
  buyPressure: number;        // Ratio of buys to sells
  
  // Social features
  hasSocials: boolean;
  twitterFollowers: number;
  telegramMembers: number;
  
  // Timing features
  hourOfDay: number;          // 0-23
  dayOfWeek: number;          // 0-6
  marketSentiment: number;    // Overall market mood
  
  // Safety features
  mintRenounced: boolean;
  freezeDisabled: boolean;
  
  // Pattern features
  similarToKnownRug: boolean;
  similarToKnownWinner: boolean;
}

export interface AnalysisResult {
  score: number;              // 0-100
  confidence: number;         // 0-1
  recommendation: 'BUY' | 'SKIP' | 'WATCH';
  features: TokenFeatures;
  reasons: string[];
  riskFactors: string[];
}

export interface AIConfig {
  mode: 'local' | 'openai';
  openaiApiKey?: string;
  confidenceThreshold: number;
  weights: {
    creatorAge: number;
    mintRenounced: number;
    socialPresence: number;
    nameQuality: number;
    marketTiming: number;
    earlyBuyers: number;
    liquidityDepth: number;
  };
}

export class TokenAnalyzer {
  private connection: Connection;
  private db: Database;
  private config: AIConfig;

  constructor(connection: Connection, db: Database, config: AIConfig) {
    this.connection = connection;
    this.db = db;
    this.config = config;
  }

  /**
   * Analyze a token and return a score
   */
  async analyze(
    token: TokenMetadata,
    filterResult: FilterResult
  ): Promise<AnalysisResult> {
    // Extract features
    const features = await this.extractFeatures(token);
    
    // Calculate score using configured mode
    let result: AnalysisResult;
    
    if (this.config.mode === 'openai' && this.config.openaiApiKey) {
      result = await this.analyzeWithOpenAI(token, features, filterResult);
    } else {
      result = this.analyzeLocal(token, features, filterResult);
    }

    // Store for training data
    this.storeAnalysis(token.mint, features, result);

    return result;
  }

  /**
   * Extract features from token
   */
  private async extractFeatures(token: TokenMetadata): Promise<TokenFeatures> {
    const features: TokenFeatures = {
      // Defaults
      creatorAge: 0,
      creatorTokenCount: 0,
      creatorRugCount: 0,
      creatorBalance: 0,
      nameLength: token.name.length,
      symbolLength: token.symbol.length,
      hasUri: !!token.uri,
      uriValid: false,
      initialLiquidity: 0,
      earlyBuyerCount: 0,
      buyPressure: 1,
      hasSocials: false,
      twitterFollowers: 0,
      telegramMembers: 0,
      hourOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      marketSentiment: 0.5,
      mintRenounced: false,
      freezeDisabled: true,
      similarToKnownRug: false,
      similarToKnownWinner: false,
    };

    try {
      // Creator analysis
      const creatorPk = new PublicKey(token.creator);
      const creatorBalance = await this.connection.getBalance(creatorPk);
      features.creatorBalance = creatorBalance / 1e9; // Convert to SOL

      // Get creator history
      const signatures = await this.connection.getSignaturesForAddress(creatorPk, { limit: 100 });
      if (signatures.length > 0) {
        const oldest = signatures[signatures.length - 1];
        if (oldest.blockTime) {
          features.creatorAge = (Date.now() - oldest.blockTime * 1000) / (1000 * 60 * 60);
        }
      }

      // Check our database for creator history
      const creatorHistory = this.db.prepare(`
        SELECT COUNT(*) as tokenCount,
               SUM(CASE WHEN is_rug = 1 THEN 1 ELSE 0 END) as rugCount
        FROM token_outcomes WHERE creator_address = ?
      `).get(token.creator) as { tokenCount: number; rugCount: number } | undefined;

      if (creatorHistory) {
        features.creatorTokenCount = creatorHistory.tokenCount;
        features.creatorRugCount = creatorHistory.rugCount;
      }

      // URI validation
      if (token.uri) {
        try {
          const response = await fetch(token.uri, { method: 'HEAD' });
          features.uriValid = response.ok;
        } catch {
          features.uriValid = false;
        }
      }

      // Check for social links in URI metadata
      if (token.uri && features.uriValid) {
        try {
          const metadata = await fetch(token.uri).then(r => r.json());
          features.hasSocials = !!(metadata.twitter || metadata.telegram || metadata.website);
        } catch {
          // Ignore metadata fetch errors
        }
      }

      // Pattern matching against known tokens
      features.similarToKnownRug = await this.checkSimilarToRug(token.name, token.symbol);
      features.similarToKnownWinner = await this.checkSimilarToWinner(token.name, token.symbol);

    } catch (err) {
      logger.debug('Feature extraction error', { error: String(err) });
    }

    return features;
  }

  /**
   * Local (heuristic) scoring
   */
  private analyzeLocal(
    token: TokenMetadata,
    features: TokenFeatures,
    filterResult: FilterResult
  ): AnalysisResult {
    const weights = this.config.weights;
    let score = 0;
    const reasons: string[] = [];
    const riskFactors: string[] = [...filterResult.warnings];

    // Start with filter score as base
    score = filterResult.score * 0.5; // 50% from safety filters

    // Creator age score (0-15 points)
    const ageScore = Math.min(features.creatorAge / 24, 1) * 100 * weights.creatorAge;
    score += ageScore;
    if (features.creatorAge > 24) {
      reasons.push(`Creator wallet ${Math.round(features.creatorAge)}h old`);
    } else {
      riskFactors.push(`New creator wallet (${features.creatorAge.toFixed(1)}h)`);
    }

    // Mint renounced (0-20 points)
    if (features.mintRenounced) {
      score += 100 * weights.mintRenounced;
      reasons.push('Mint authority renounced');
    } else {
      riskFactors.push('Mint authority active');
    }

    // Social presence (0-10 points)
    if (features.hasSocials) {
      score += 100 * weights.socialPresence;
      reasons.push('Has social media presence');
    }

    // Name quality heuristics (0-10 points)
    let nameScore = 50; // Start at neutral
    if (features.nameLength >= 3 && features.nameLength <= 20) nameScore += 20;
    if (features.symbolLength >= 2 && features.symbolLength <= 6) nameScore += 20;
    if (features.hasUri && features.uriValid) nameScore += 10;
    score += nameScore * weights.nameQuality;

    // Market timing (0-15 points)
    // Tokens launched during peak US hours (14-22 UTC) tend to do better
    const isPeakHours = features.hourOfDay >= 14 && features.hourOfDay <= 22;
    const isWeekday = features.dayOfWeek >= 1 && features.dayOfWeek <= 5;
    let timingScore = 50;
    if (isPeakHours) timingScore += 30;
    if (isWeekday) timingScore += 20;
    score += timingScore * weights.marketTiming;
    if (isPeakHours && isWeekday) {
      reasons.push('Good launch timing (peak hours)');
    }

    // Creator history penalty
    if (features.creatorRugCount > 0) {
      score -= features.creatorRugCount * 20;
      riskFactors.push(`Creator has ${features.creatorRugCount} previous rugs`);
    }

    // Pattern matching
    if (features.similarToKnownRug) {
      score -= 30;
      riskFactors.push('Similar to known rug pattern');
    }
    if (features.similarToKnownWinner) {
      score += 15;
      reasons.push('Similar to successful token pattern');
    }

    // Normalize score to 0-100
    score = Math.max(0, Math.min(100, score));

    // Calculate confidence based on data availability
    let confidence = 0.5;
    if (features.creatorAge > 0) confidence += 0.1;
    if (features.hasUri) confidence += 0.1;
    if (features.hasSocials) confidence += 0.1;
    if (filterResult.score > 0) confidence += 0.2;
    confidence = Math.min(1, confidence);

    // Determine recommendation
    let recommendation: 'BUY' | 'SKIP' | 'WATCH' = 'SKIP';
    if (score >= SCORE_THRESHOLDS.GOOD && confidence >= this.config.confidenceThreshold) {
      recommendation = 'BUY';
    } else if (score >= SCORE_THRESHOLDS.MODERATE) {
      recommendation = 'WATCH';
    }

    return {
      score: Math.round(score),
      confidence,
      recommendation,
      features,
      reasons,
      riskFactors,
    };
  }

  /**
   * OpenAI-powered analysis
   */
  private async analyzeWithOpenAI(
    token: TokenMetadata,
    features: TokenFeatures,
    filterResult: FilterResult
  ): Promise<AnalysisResult> {
    // Fall back to local if no API key
    if (!this.config.openaiApiKey) {
      return this.analyzeLocal(token, features, filterResult);
    }

    try {
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: this.config.openaiApiKey });

      const prompt = `Analyze this Solana memecoin for snipe potential.

Token: ${token.name} (${token.symbol})
Creator: ${token.creator}
Mint: ${token.mint}

Features:
- Creator wallet age: ${features.creatorAge.toFixed(1)} hours
- Creator previous tokens: ${features.creatorTokenCount}
- Creator rugs: ${features.creatorRugCount}
- Has metadata URI: ${features.hasUri}
- URI valid: ${features.uriValid}
- Has socials: ${features.hasSocials}
- Mint renounced: ${features.mintRenounced}
- Launch time: Hour ${features.hourOfDay}, Day ${features.dayOfWeek}

Safety filter score: ${filterResult.score}/100
Filter warnings: ${filterResult.warnings.join(', ') || 'None'}

Based on typical memecoin patterns:
1. Score this token 0-100 (100 = best opportunity)
2. List top 3 reasons for or against
3. Recommend: BUY, SKIP, or WATCH

Respond in JSON format:
{
  "score": number,
  "confidence": number (0-1),
  "recommendation": "BUY" | "SKIP" | "WATCH",
  "reasons": ["reason1", "reason2", "reason3"],
  "riskFactors": ["risk1", "risk2"]
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a crypto trading analyst specializing in Solana memecoins. Be concise and data-driven.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        score: Math.round(parsed.score),
        confidence: parsed.confidence,
        recommendation: parsed.recommendation,
        features,
        reasons: parsed.reasons || [],
        riskFactors: parsed.riskFactors || [],
      };

    } catch (err) {
      logger.warn('OpenAI analysis failed, falling back to local', { error: String(err) });
      return this.analyzeLocal(token, features, filterResult);
    }
  }

  /**
   * Check if token name/symbol is similar to known rugs
   */
  private async checkSimilarToRug(name: string, symbol: string): Promise<boolean> {
    const rugs = this.db.prepare(`
      SELECT token_name, token_symbol FROM token_outcomes 
      WHERE is_rug = 1 
      ORDER BY created_at DESC LIMIT 100
    `).all() as { token_name: string; token_symbol: string }[];

    const nameLower = name.toLowerCase();
    const symbolLower = symbol.toLowerCase();

    for (const rug of rugs) {
      if (!rug.token_name) continue;
      const rugName = rug.token_name.toLowerCase();
      const rugSymbol = (rug.token_symbol || '').toLowerCase();

      // Check for similarity (simple Levenshtein approximation)
      if (this.similarity(nameLower, rugName) > 0.8 ||
          this.similarity(symbolLower, rugSymbol) > 0.8) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if token name/symbol is similar to known winners
   */
  private async checkSimilarToWinner(name: string, symbol: string): Promise<boolean> {
    const winners = this.db.prepare(`
      SELECT token_name, token_symbol FROM token_outcomes 
      WHERE outcome_label = 'moon' OR max_price_multiple > 5
      ORDER BY created_at DESC LIMIT 100
    `).all() as { token_name: string; token_symbol: string }[];

    const nameLower = name.toLowerCase();

    for (const winner of winners) {
      if (!winner.token_name) continue;
      const winnerName = winner.token_name.toLowerCase();

      if (this.similarity(nameLower, winnerName) > 0.7) {
        return true;
      }
    }

    return false;
  }

  /**
   * Simple string similarity (0-1)
   */
  private similarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    if (longer.includes(shorter)) {
      return shorter.length / longer.length;
    }

    // Simple character overlap
    let matches = 0;
    for (const char of shorter) {
      if (longer.includes(char)) matches++;
    }

    return matches / longer.length;
  }

  /**
   * Store analysis for training data
   */
  private storeAnalysis(mint: string, features: TokenFeatures, result: AnalysisResult): void {
    try {
      this.db.prepare(`
        INSERT OR REPLACE INTO token_outcomes (
          token_mint, initial_score, features_json, created_at, updated_at
        ) VALUES (?, ?, ?, datetime('now'), datetime('now'))
      `).run(mint, result.score, JSON.stringify(features));
    } catch (err) {
      logger.debug('Failed to store analysis', { error: String(err) });
    }
  }
}
