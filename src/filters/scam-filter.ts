import { Connection, PublicKey } from '@solana/web3.js';
import { logger } from '../utils/logger.js';
import { isBlacklisted, addToBlacklist } from '../db/schema.js';
import type { Database } from 'better-sqlite3';

export interface TokenMetadata {
  mint: string;
  name: string;
  symbol: string;
  uri?: string;
  creator: string;
  description?: string;
}

export interface FilterConfig {
  requireMintRenounced: boolean;
  requireFreezeDisabled: boolean;
  minCreatorWalletAgeHours: number;
  maxCreatorRugCount: number;
  blacklistPatterns: string[];
}

export interface FilterResult {
  passed: boolean;
  score: number; // 0-100, higher = safer
  reasons: string[];
  warnings: string[];
}

export class ScamFilter {
  private connection: Connection;
  private db: Database;
  private config: FilterConfig;

  constructor(connection: Connection, db: Database, config: FilterConfig) {
    this.connection = connection;
    this.db = db;
    this.config = config;
  }

  /**
   * Run all filters on a token
   */
  async analyzeToken(token: TokenMetadata): Promise<FilterResult> {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // 1. Check blacklists
    if (isBlacklisted(this.db, token.mint)) {
      return { passed: false, score: 0, reasons: ['Token is blacklisted'], warnings };
    }

    if (isBlacklisted(this.db, token.creator)) {
      return { passed: false, score: 0, reasons: ['Creator is blacklisted'], warnings };
    }

    // 2. Check name/symbol patterns
    const nameCheck = this.checkNamePatterns(token.name, token.symbol);
    if (!nameCheck.passed) {
      reasons.push(...nameCheck.reasons);
      return { passed: false, score: 0, reasons, warnings };
    }
    score -= nameCheck.deduction;
    warnings.push(...nameCheck.warnings);

    // 3. Check mint authority
    const mintCheck = await this.checkMintAuthority(token.mint);
    if (this.config.requireMintRenounced && !mintCheck.renounced) {
      reasons.push('Mint authority not renounced');
      return { passed: false, score: 0, reasons, warnings };
    }
    if (!mintCheck.renounced) {
      score -= 30;
      warnings.push('Mint authority still active');
    }

    // 4. Check freeze authority
    const freezeCheck = await this.checkFreezeAuthority(token.mint);
    if (this.config.requireFreezeDisabled && freezeCheck.enabled) {
      reasons.push('Freeze authority enabled');
      return { passed: false, score: 0, reasons, warnings };
    }
    if (freezeCheck.enabled) {
      score -= 25;
      warnings.push('Freeze authority enabled');
    }

    // 5. Check creator wallet
    const creatorCheck = await this.analyzeCreator(token.creator);
    if (creatorCheck.rugCount > this.config.maxCreatorRugCount) {
      reasons.push(`Creator has ${creatorCheck.rugCount} previous rugs`);
      addToBlacklist(this.db, token.creator, 'creator', 'Rug history');
      return { passed: false, score: 0, reasons, warnings };
    }
    if (creatorCheck.ageHours < this.config.minCreatorWalletAgeHours) {
      score -= 20;
      warnings.push(`Creator wallet only ${creatorCheck.ageHours.toFixed(1)}h old`);
    }
    if (creatorCheck.suspiciousPatterns.length > 0) {
      score -= 15;
      warnings.push(...creatorCheck.suspiciousPatterns);
    }

    // 6. Check for honeypot patterns
    const honeypotCheck = await this.checkHoneypotPatterns(token.mint);
    if (honeypotCheck.isHoneypot) {
      reasons.push('Honeypot pattern detected');
      addToBlacklist(this.db, token.mint, 'token', 'Honeypot');
      return { passed: false, score: 0, reasons, warnings };
    }
    if (honeypotCheck.suspiciousScore > 0) {
      score -= honeypotCheck.suspiciousScore;
      warnings.push(...honeypotCheck.warnings);
    }

    return {
      passed: true,
      score: Math.max(0, score),
      reasons,
      warnings,
    };
  }

  /**
   * Check token name and symbol for suspicious patterns
   */
  private checkNamePatterns(name: string, symbol: string): {
    passed: boolean;
    deduction: number;
    reasons: string[];
    warnings: string[];
  } {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let deduction = 0;

    const combined = `${name} ${symbol}`.toLowerCase();

    // Hard reject patterns
    for (const pattern of this.config.blacklistPatterns) {
      if (combined.includes(pattern.toLowerCase())) {
        return {
          passed: false,
          deduction: 100,
          reasons: [`Name contains blacklisted pattern: "${pattern}"`],
          warnings,
        };
      }
    }

    // Suspicious patterns (soft)
    const suspiciousPatterns = [
      { pattern: /v\d+/i, msg: 'Contains version number (V2, V3, etc.)', deduct: 10 },
      { pattern: /new|real|official/i, msg: 'Claims to be "new/real/official"', deduct: 15 },
      { pattern: /elon|musk|trump|biden/i, msg: 'Celebrity name (high rug risk)', deduct: 10 },
      { pattern: /x1000|100x|moon/i, msg: 'Pump terminology in name', deduct: 5 },
      { pattern: /safe|secure/i, msg: 'Claims safety (ironic indicator)', deduct: 10 },
      { pattern: /^[a-z]{1,2}$/i, msg: 'Very short symbol', deduct: 5 },
    ];

    for (const { pattern, msg, deduct } of suspiciousPatterns) {
      if (pattern.test(combined)) {
        warnings.push(msg);
        deduction += deduct;
      }
    }

    // Check for copy-cat patterns (similar to known tokens)
    const copyCatPatterns = [
      /pepe(?!$)/i, // "pepe" with suffix
      /doge(?!$)/i,
      /shib(?!a?$)/i,
      /bonk(?!$)/i,
    ];

    for (const pattern of copyCatPatterns) {
      if (pattern.test(name)) {
        warnings.push('Possible copycat of established token');
        deduction += 10;
        break;
      }
    }

    return { passed: true, deduction, reasons, warnings };
  }

  /**
   * Check if mint authority is renounced
   */
  private async checkMintAuthority(mint: string): Promise<{ renounced: boolean }> {
    try {
      const mintPk = new PublicKey(mint);
      const accountInfo = await this.connection.getAccountInfo(mintPk);
      
      if (!accountInfo) {
        return { renounced: false };
      }

      // Parse mint account data
      // Mint authority is at offset 0, with first byte indicating option (0 = None)
      const mintAuthorityOption = accountInfo.data[0];
      return { renounced: mintAuthorityOption === 0 };
    } catch (err) {
      logger.warn('Failed to check mint authority', { mint, error: String(err) });
      return { renounced: false };
    }
  }

  /**
   * Check if freeze authority is enabled
   */
  private async checkFreezeAuthority(mint: string): Promise<{ enabled: boolean }> {
    try {
      const mintPk = new PublicKey(mint);
      const accountInfo = await this.connection.getAccountInfo(mintPk);
      
      if (!accountInfo) {
        return { enabled: true }; // Assume worst case
      }

      // Freeze authority is at offset 36 (after mint authority)
      const freezeAuthorityOption = accountInfo.data[36];
      return { enabled: freezeAuthorityOption !== 0 };
    } catch (err) {
      logger.warn('Failed to check freeze authority', { mint, error: String(err) });
      return { enabled: true };
    }
  }

  /**
   * Analyze creator wallet
   */
  private async analyzeCreator(creator: string): Promise<{
    ageHours: number;
    rugCount: number;
    suspiciousPatterns: string[];
  }> {
    const suspiciousPatterns: string[] = [];
    let rugCount = 0;

    try {
      const creatorPk = new PublicKey(creator);
      
      // Get transaction signatures to estimate wallet age
      const signatures = await this.connection.getSignaturesForAddress(creatorPk, { limit: 100 });
      
      if (signatures.length === 0) {
        return { ageHours: 0, rugCount: 0, suspiciousPatterns: ['No transaction history'] };
      }

      // Calculate wallet age from first transaction
      const oldestSig = signatures[signatures.length - 1];
      const ageMs = Date.now() - (oldestSig.blockTime || 0) * 1000;
      const ageHours = ageMs / (1000 * 60 * 60);

      // Check for rug patterns in history
      // This is a simplified check - in production you'd want more thorough analysis
      const recentSigs = signatures.slice(0, 20);
      let tokenCreations = 0;
      
      for (const sig of recentSigs) {
        // Simplified: count potential token creation transactions
        // Real implementation would parse transaction details
        if (sig.memo?.includes('create') || sig.memo?.includes('mint')) {
          tokenCreations++;
        }
      }

      if (tokenCreations > 5) {
        suspiciousPatterns.push(`Created ${tokenCreations} tokens recently`);
        rugCount = Math.floor(tokenCreations / 2); // Rough estimate
      }

      // Check our own blacklist database
      const dbRug = this.db.prepare(
        `SELECT rug_count FROM blacklist WHERE address = ? AND type = 'creator'`
      ).get(creator) as { rug_count: number } | undefined;
      
      if (dbRug) {
        rugCount = Math.max(rugCount, dbRug.rug_count);
      }

      return { ageHours, rugCount, suspiciousPatterns };
    } catch (err) {
      logger.warn('Failed to analyze creator', { creator, error: String(err) });
      return { ageHours: 0, rugCount: 0, suspiciousPatterns: ['Analysis failed'] };
    }
  }

  /**
   * Check for honeypot patterns
   */
  private async checkHoneypotPatterns(mint: string): Promise<{
    isHoneypot: boolean;
    suspiciousScore: number;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    let suspiciousScore = 0;

    try {
      // In a full implementation, you would:
      // 1. Simulate a buy/sell to check if sells are blocked
      // 2. Check for hidden fees
      // 3. Check for blacklist functions in the contract
      // 4. Check holder distribution for team wallet concentration

      // For Pump.fun tokens specifically, honeypots are less common due to the bonding curve mechanism
      // But we still check for common issues

      // This is a placeholder for more sophisticated honeypot detection
      // Real implementation would involve transaction simulation

      return { isHoneypot: false, suspiciousScore, warnings };
    } catch (err) {
      logger.warn('Failed to check honeypot patterns', { mint, error: String(err) });
      return { isHoneypot: false, suspiciousScore: 20, warnings: ['Could not verify honeypot status'] };
    }
  }

  /**
   * Quick pre-filter before full analysis (fast rejection)
   */
  quickFilter(token: TokenMetadata): { passed: boolean; reason?: string } {
    // Blacklist check
    if (isBlacklisted(this.db, token.mint) || isBlacklisted(this.db, token.creator)) {
      return { passed: false, reason: 'Blacklisted' };
    }

    // Name pattern check
    const combined = `${token.name} ${token.symbol}`.toLowerCase();
    for (const pattern of this.config.blacklistPatterns) {
      if (combined.includes(pattern.toLowerCase())) {
        return { passed: false, reason: `Blacklisted pattern: ${pattern}` };
      }
    }

    return { passed: true };
  }
}
