import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { logger } from './utils/logger.js';

// Configuration schema with Zod
const TakeProfitTierSchema = z.object({
  multiplier: z.number().positive(),
  sellPct: z.number().min(0).max(100),
});

const ConfigSchema = z.object({
  bot: z.object({
    enabled: z.boolean().default(true),
    mode: z.enum(['conservative', 'moderate', 'aggressive']).default('moderate'),
    strategy: z.string().default('default'),
  }),

  rpc: z.object({
    primary: z.string().url(),
    fallback: z.string().url().optional(),
    ws: z.string().optional(),
  }),

  trading: z.object({
    buy: z.object({
      enabled: z.boolean().default(true),
      min_score: z.number().min(0).max(100).default(65),
      amount_sol: z.number().positive().default(0.05),
      max_slippage_bps: z.number().positive().default(1000),
      priority_fee_lamports: z.number().nonnegative().default(100000),
      use_jito: z.boolean().default(true),
      jito_tip_lamports: z.number().nonnegative().default(10000),
    }),
    sell: z.object({
      trailing_stop_pct: z.number().positive().default(20),
      take_profit_tiers: z.array(TakeProfitTierSchema).default([
        { multiplier: 2, sellPct: 25 },
        { multiplier: 3, sellPct: 25 },
        { multiplier: 5, sellPct: 25 },
        { multiplier: 10, sellPct: 25 },
      ]),
    }),
  }),

  risk: z.object({
    max_positions: z.number().positive().default(5),
    max_daily_loss_sol: z.number().positive().default(0.5),
    max_single_token_sol: z.number().positive().default(0.2),
    pause_after_consecutive_losses: z.number().positive().default(3),
    min_balance_sol: z.number().nonnegative().default(0.1),
  }),

  filters: z.object({
    require_mint_renounced: z.boolean().default(true),
    require_freeze_disabled: z.boolean().default(true),
    min_creator_wallet_age_hours: z.number().nonnegative().default(1),
    max_creator_rug_count: z.number().nonnegative().default(0),
    prefer_social_presence: z.boolean().default(true),
    prefer_verified_metadata: z.boolean().default(true),
    blacklist_patterns: z.array(z.string()).default(['test', 'rug', 'scam', 'honeypot', 'fake']),
  }),

  wallet: z.object({
    auto_sweep_enabled: z.boolean().default(false),
    auto_sweep_threshold_sol: z.number().positive().default(0.5),
    sweep_to_address: z.string().default(''),
    encryption_password: z.string().min(8),
  }),

  ai: z.object({
    mode: z.enum(['local', 'openai']).default('local'),
    openai_api_key: z.string().optional(),
    confidence_threshold: z.number().min(0).max(1).default(0.6),
    weights: z.object({
      creator_age: z.number().default(0.15),
      mint_renounced: z.number().default(0.20),
      social_presence: z.number().default(0.10),
      name_quality: z.number().default(0.10),
      market_timing: z.number().default(0.15),
      early_buyers: z.number().default(0.15),
      liquidity_depth: z.number().default(0.15),
    }).default({}),
  }),

  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    file: z.string().default('data/bot.log'),
    max_size_mb: z.number().positive().default(50),
  }).default({}),

  web: z.object({
    enabled: z.boolean().default(false),
    port: z.number().positive().default(3000),
    auth_token: z.string().default(''),
  }).default({}),

  notifications: z.object({
    telegram: z.object({
      enabled: z.boolean().default(false),
      bot_token: z.string().default(''),
      chat_id: z.string().default(''),
      alert_on_buy: z.boolean().default(true),
      alert_on_sell: z.boolean().default(true),
      alert_on_stop_loss: z.boolean().default(true),
      daily_summary: z.boolean().default(true),
      daily_summary_hour: z.number().min(0).max(23).default(20),
    }).default({}),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load configuration from file
 */
export function loadConfig(configPath = 'config.yaml'): Config {
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}. Copy config.example.yaml to config.yaml and fill in your values.`);
  }

  const content = readFileSync(configPath, 'utf-8');
  const parsed = parseYaml(content);

  // Validate with Zod
  const result = ConfigSchema.safeParse(parsed);
  
  if (!result.success) {
    const errors = result.error.issues
      .map(i => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Config validation failed:\n${errors}`);
  }

  const config = result.data;

  // Warn if using default password
  if (config.wallet.encryption_password === 'CHANGE_ME_TO_SOMETHING_SECURE') {
    logger.warn('⚠️  Using default encryption password! Change this in config.yaml');
  }

  // Warn if sweep address not set
  if (config.wallet.auto_sweep_enabled && !config.wallet.sweep_to_address) {
    logger.warn('⚠️  Auto sweep enabled but no sweep_to_address set');
    config.wallet.auto_sweep_enabled = false;
  }

  logger.info('Configuration loaded', {
    mode: config.bot.mode,
    buyEnabled: config.trading.buy.enabled,
    useJito: config.trading.buy.use_jito,
  });

  return config;
}

/**
 * Validate RPC endpoint
 */
export async function validateRpc(rpcUrl: string): Promise<boolean> {
  try {
    const { Connection } = await import('@solana/web3.js');
    const connection = new Connection(rpcUrl);
    const version = await connection.getVersion();
    logger.info(`RPC connected: ${rpcUrl.split('?')[0]}`, { version: version['solana-core'] });
    return true;
  } catch (err) {
    logger.error(`RPC validation failed: ${rpcUrl}`, { error: String(err) });
    return false;
  }
}

/**
 * Get environment variable with fallback
 */
export function env(key: string, fallback?: string): string {
  const value = process.env[key];
  if (!value && fallback === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value || fallback!;
}
