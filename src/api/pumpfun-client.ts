/**
 * Pump.fun API Client
 *
 * Uses the PumpFun Scraper API via RapidAPI for token metadata,
 * and the Pump.fun frontend API for bonding curve and trade data.
 */

import { logger } from '../utils/logger.js';

export interface PumpFunTokenInfo {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  image_uri?: string;
  metadata_uri?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  bonding_curve?: string;
  associated_bonding_curve?: string;
  creator: string;
  created_timestamp?: number;
  raydium_pool?: string;
  complete: boolean;
  virtual_sol_reserves?: number;
  virtual_token_reserves?: number;
  total_supply?: number;
  usd_market_cap?: number;
  reply_count?: number;
  last_reply?: number;
}

export interface PumpFunTrade {
  signature: string;
  mint: string;
  sol_amount: number;
  token_amount: number;
  is_buy: boolean;
  user: string;
  timestamp: number;
  tx_index: number;
  username?: string;
  profile_image?: string;
}

export interface PumpFunApiConfig {
  rapidApiKey?: string;
  rapidApiHost?: string;
}

export class PumpFunApiClient {
  private rapidApiKey?: string;
  private rapidApiHost: string;
  private frontendApiBase = 'https://frontend-api-v3.pump.fun';

  constructor(config: PumpFunApiConfig) {
    this.rapidApiKey = config.rapidApiKey;
    this.rapidApiHost = config.rapidApiHost || 'pumpfun-scraper-api.p.rapidapi.com';
  }

  /**
   * Get token info from the Pump.fun frontend API (no auth needed)
   */
  async getTokenInfo(mint: string): Promise<PumpFunTokenInfo | null> {
    try {
      const response = await fetch(
        `${this.frontendApiBase}/coins/${mint}`,
        {
          headers: {
            'Accept': 'application/json',
            'Origin': 'https://pump.fun',
          },
        }
      );

      if (!response.ok) {
        logger.debug(`Pump.fun API returned ${response.status} for ${mint}`);
        return null;
      }

      const data = await response.json() as any;

      return {
        mint: data.mint,
        name: data.name || 'Unknown',
        symbol: data.symbol || 'UNK',
        description: data.description,
        image_uri: data.image_uri,
        metadata_uri: data.metadata_uri,
        twitter: data.twitter,
        telegram: data.telegram,
        website: data.website,
        bonding_curve: data.bonding_curve,
        associated_bonding_curve: data.associated_bonding_curve,
        creator: data.creator,
        created_timestamp: data.created_timestamp,
        raydium_pool: data.raydium_pool,
        complete: data.complete ?? false,
        virtual_sol_reserves: data.virtual_sol_reserves,
        virtual_token_reserves: data.virtual_token_reserves,
        total_supply: data.total_supply,
        usd_market_cap: data.usd_market_cap,
        reply_count: data.reply_count,
        last_reply: data.last_reply,
      };
    } catch (err) {
      logger.debug('Failed to fetch token info from Pump.fun API', {
        mint,
        error: String(err),
      });
      return null;
    }
  }

  /**
   * Get latest token listings from Pump.fun
   */
  async getLatestTokens(limit = 50, offset = 0): Promise<PumpFunTokenInfo[]> {
    try {
      const response = await fetch(
        `${this.frontendApiBase}/coins?offset=${offset}&limit=${limit}&sort=created_timestamp&order=DESC&includeNsfw=false`,
        {
          headers: {
            'Accept': 'application/json',
            'Origin': 'https://pump.fun',
          },
        }
      );

      if (!response.ok) return [];

      const data = await response.json() as any[];
      return data.map(this.mapTokenResponse);
    } catch (err) {
      logger.debug('Failed to fetch latest tokens', { error: String(err) });
      return [];
    }
  }

  /**
   * Get recent trades for a token
   */
  async getTokenTrades(mint: string, limit = 50, offset = 0): Promise<PumpFunTrade[]> {
    try {
      const response = await fetch(
        `${this.frontendApiBase}/trades/latest?mint=${mint}&limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Accept': 'application/json',
            'Origin': 'https://pump.fun',
          },
        }
      );

      if (!response.ok) return [];

      const data = await response.json() as any[];
      return data.map((t: any) => ({
        signature: t.signature,
        mint: t.mint,
        sol_amount: t.sol_amount,
        token_amount: t.token_amount,
        is_buy: t.is_buy,
        user: t.user,
        timestamp: t.timestamp,
        tx_index: t.tx_index,
        username: t.username,
        profile_image: t.profile_image,
      }));
    } catch (err) {
      logger.debug('Failed to fetch token trades', { mint, error: String(err) });
      return [];
    }
  }

  /**
   * Get token info via RapidAPI (if key configured) - better rate limits
   */
  async getTokenInfoRapidApi(mint: string): Promise<PumpFunTokenInfo | null> {
    if (!this.rapidApiKey) return this.getTokenInfo(mint);

    try {
      const response = await fetch(
        `https://${this.rapidApiHost}/token/${mint}`,
        {
          headers: {
            'x-rapidapi-key': this.rapidApiKey,
            'x-rapidapi-host': this.rapidApiHost,
          },
        }
      );

      if (!response.ok) {
        // Fall back to direct API
        return this.getTokenInfo(mint);
      }

      const data = await response.json() as any;
      return this.mapTokenResponse(data);
    } catch (err) {
      logger.debug('RapidAPI fetch failed, falling back to direct API', { error: String(err) });
      return this.getTokenInfo(mint);
    }
  }

  /**
   * Get king of the hill tokens (top performing)
   */
  async getKingOfTheHill(): Promise<PumpFunTokenInfo | null> {
    try {
      const response = await fetch(
        `${this.frontendApiBase}/coins/king-of-the-hill?includeNsfw=false`,
        {
          headers: {
            'Accept': 'application/json',
            'Origin': 'https://pump.fun',
          },
        }
      );

      if (!response.ok) return null;

      const data = await response.json() as any;
      return this.mapTokenResponse(data);
    } catch (err) {
      logger.debug('Failed to fetch king of the hill', { error: String(err) });
      return null;
    }
  }

  /**
   * Check if a token has social links
   */
  async hasSocialPresence(mint: string): Promise<{
    hasSocials: boolean;
    twitter?: string;
    telegram?: string;
    website?: string;
  }> {
    const info = await this.getTokenInfo(mint);
    if (!info) return { hasSocials: false };

    const hasSocials = !!(info.twitter || info.telegram || info.website);
    return {
      hasSocials,
      twitter: info.twitter || undefined,
      telegram: info.telegram || undefined,
      website: info.website || undefined,
    };
  }

  /**
   * Get early buyer count for a token
   */
  async getEarlyBuyerCount(mint: string, maxTrades = 100): Promise<number> {
    const trades = await this.getTokenTrades(mint, maxTrades);
    const uniqueBuyers = new Set(
      trades.filter(t => t.is_buy).map(t => t.user)
    );
    return uniqueBuyers.size;
  }

  private mapTokenResponse(data: any): PumpFunTokenInfo {
    return {
      mint: data.mint,
      name: data.name || 'Unknown',
      symbol: data.symbol || 'UNK',
      description: data.description,
      image_uri: data.image_uri,
      metadata_uri: data.metadata_uri,
      twitter: data.twitter,
      telegram: data.telegram,
      website: data.website,
      bonding_curve: data.bonding_curve,
      associated_bonding_curve: data.associated_bonding_curve,
      creator: data.creator,
      created_timestamp: data.created_timestamp,
      raydium_pool: data.raydium_pool,
      complete: data.complete ?? false,
      virtual_sol_reserves: data.virtual_sol_reserves,
      virtual_token_reserves: data.virtual_token_reserves,
      total_supply: data.total_supply,
      usd_market_cap: data.usd_market_cap,
      reply_count: data.reply_count,
      last_reply: data.last_reply,
    };
  }
}
