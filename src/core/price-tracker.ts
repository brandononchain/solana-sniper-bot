/**
 * Price Tracker
 * 
 * Tracks token prices in real-time via bonding curve state.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { PUMP_FUN_PROGRAM_ID, LAMPORTS_PER_SOL } from '../utils/constants.js';

export interface PriceUpdate {
  mint: string;
  price: number;
  priceInSol: number;
  liquidity: number;
  timestamp: number;
}

export interface TrackedToken {
  mint: string;
  bondingCurve: string;
  lastPrice: number;
  highestPrice: number;
  lowestPrice: number;
  addedAt: number;
}

export class PriceTracker extends EventEmitter {
  private connection: Connection;
  private tokens: Map<string, TrackedToken> = new Map();
  private subscriptions: Map<string, number> = new Map();
  private pollInterval?: NodeJS.Timeout;
  private pollIntervalMs = 1000;

  constructor(connection: Connection) {
    super();
    this.connection = connection;
  }

  /**
   * Start tracking a token
   */
  track(mint: string, bondingCurve: string): void {
    if (this.tokens.has(mint)) return;

    this.tokens.set(mint, {
      mint,
      bondingCurve,
      lastPrice: 0,
      highestPrice: 0,
      lowestPrice: Infinity,
      addedAt: Date.now(),
    });

    logger.debug(`Tracking price for ${mint.slice(0, 8)}...`);
  }

  /**
   * Stop tracking a token
   */
  untrack(mint: string): void {
    this.tokens.delete(mint);
    
    const subId = this.subscriptions.get(mint);
    if (subId !== undefined) {
      this.connection.removeAccountChangeListener(subId);
      this.subscriptions.delete(mint);
    }
  }

  /**
   * Start the price tracker
   */
  start(): void {
    // Use polling for simplicity (WebSocket account subscriptions can be flaky)
    this.pollInterval = setInterval(() => this.poll(), this.pollIntervalMs);
    logger.info('Price tracker started');
  }

  /**
   * Stop the price tracker
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }

    // Clean up subscriptions
    for (const subId of this.subscriptions.values()) {
      this.connection.removeAccountChangeListener(subId);
    }
    this.subscriptions.clear();

    logger.info('Price tracker stopped');
  }

  /**
   * Poll prices for all tracked tokens
   */
  private async poll(): Promise<void> {
    for (const [mint, token] of this.tokens) {
      try {
        const price = await this.fetchPrice(token.bondingCurve);
        
        if (price > 0) {
          const previousPrice = token.lastPrice;
          token.lastPrice = price;
          token.highestPrice = Math.max(token.highestPrice, price);
          token.lowestPrice = Math.min(token.lowestPrice, price);

          const update: PriceUpdate = {
            mint,
            price,
            priceInSol: price,
            liquidity: 0, // Would need to parse from bonding curve
            timestamp: Date.now(),
          };

          this.emit('price', update);

          // Emit significant price changes
          if (previousPrice > 0) {
            const changePct = ((price - previousPrice) / previousPrice) * 100;
            if (Math.abs(changePct) >= 5) {
              this.emit('significantChange', { mint, changePct, price, previousPrice });
            }
          }
        }
      } catch (err) {
        logger.debug(`Price fetch error for ${mint.slice(0, 8)}`, { error: String(err) });
      }
    }
  }

  /**
   * Fetch current price from bonding curve
   */
  private async fetchPrice(bondingCurve: string): Promise<number> {
    try {
      const accountInfo = await this.connection.getAccountInfo(new PublicKey(bondingCurve));
      
      if (!accountInfo) return 0;

      // Parse bonding curve state
      // Pump.fun bonding curve layout (simplified):
      // - virtualTokenReserves: u64 at offset 8
      // - virtualSolReserves: u64 at offset 16
      // Price = virtualSolReserves / virtualTokenReserves

      const data = accountInfo.data;
      
      // Check if this is actually a bonding curve account
      if (data.length < 40) return 0;

      // Read reserves (little-endian u64)
      const virtualTokenReserves = this.readU64(data, 8);
      const virtualSolReserves = this.readU64(data, 16);

      if (virtualTokenReserves === 0n) return 0;

      // Calculate price in SOL
      const price = Number(virtualSolReserves) / Number(virtualTokenReserves);
      return price;

    } catch (err) {
      return 0;
    }
  }

  /**
   * Read a u64 from buffer at offset (little-endian)
   */
  private readU64(buffer: Buffer, offset: number): bigint {
    return buffer.readBigUInt64LE(offset);
  }

  /**
   * Get current price for a token
   */
  getPrice(mint: string): number {
    return this.tokens.get(mint)?.lastPrice || 0;
  }

  /**
   * Get price stats for a token
   */
  getStats(mint: string): TrackedToken | undefined {
    return this.tokens.get(mint);
  }

  /**
   * Get all tracked tokens
   */
  getTrackedTokens(): TrackedToken[] {
    return Array.from(this.tokens.values());
  }

  /**
   * Calculate bonding curve price for a given SOL amount
   * (How many tokens would you get for X SOL)
   */
  async simulateBuy(
    bondingCurve: string,
    solAmount: number
  ): Promise<{ tokens: number; avgPrice: number; priceImpact: number }> {
    try {
      const accountInfo = await this.connection.getAccountInfo(new PublicKey(bondingCurve));
      if (!accountInfo) return { tokens: 0, avgPrice: 0, priceImpact: 0 };

      const data = accountInfo.data;
      const virtualTokenReserves = Number(this.readU64(data, 8));
      const virtualSolReserves = Number(this.readU64(data, 16));

      // Constant product formula: x * y = k
      // After buy: (x + dx) * (y - dy) = k
      // dy = y - k / (x + dx)

      const solIn = solAmount * LAMPORTS_PER_SOL;
      const k = virtualSolReserves * virtualTokenReserves;
      const newSolReserves = virtualSolReserves + solIn;
      const newTokenReserves = k / newSolReserves;
      const tokensOut = virtualTokenReserves - newTokenReserves;

      const spotPrice = virtualSolReserves / virtualTokenReserves;
      const avgPrice = solIn / tokensOut;
      const priceImpact = ((avgPrice - spotPrice) / spotPrice) * 100;

      return {
        tokens: tokensOut,
        avgPrice: avgPrice / LAMPORTS_PER_SOL,
        priceImpact,
      };
    } catch {
      return { tokens: 0, avgPrice: 0, priceImpact: 0 };
    }
  }

  /**
   * Calculate how much SOL you'd get for selling tokens
   */
  async simulateSell(
    bondingCurve: string,
    tokenAmount: number
  ): Promise<{ sol: number; avgPrice: number; priceImpact: number }> {
    try {
      const accountInfo = await this.connection.getAccountInfo(new PublicKey(bondingCurve));
      if (!accountInfo) return { sol: 0, avgPrice: 0, priceImpact: 0 };

      const data = accountInfo.data;
      const virtualTokenReserves = Number(this.readU64(data, 8));
      const virtualSolReserves = Number(this.readU64(data, 16));

      const k = virtualSolReserves * virtualTokenReserves;
      const newTokenReserves = virtualTokenReserves + tokenAmount;
      const newSolReserves = k / newTokenReserves;
      const solOut = virtualSolReserves - newSolReserves;

      const spotPrice = virtualSolReserves / virtualTokenReserves;
      const avgPrice = solOut / tokenAmount;
      const priceImpact = ((spotPrice - avgPrice) / spotPrice) * 100;

      return {
        sol: solOut / LAMPORTS_PER_SOL,
        avgPrice: avgPrice / LAMPORTS_PER_SOL,
        priceImpact,
      };
    } catch {
      return { sol: 0, avgPrice: 0, priceImpact: 0 };
    }
  }
}
