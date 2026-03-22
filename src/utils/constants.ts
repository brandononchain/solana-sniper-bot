import { PublicKey } from '@solana/web3.js';

// Pump.fun Program IDs
export const PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
export const PUMP_FUN_MINT_AUTHORITY = new PublicKey('TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM');

// Pump.fun Global Account (PDA from ["global"] seed)
export const PUMP_FUN_GLOBAL = new PublicKey('4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf');

// Pump.fun Fee Recipient
export const PUMP_FUN_FEE_RECIPIENT = new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM');

// Pump.fun Event Authority (PDA from ["__event_authority"] seed)
export const PUMP_FUN_EVENT_AUTHORITY = PublicKey.findProgramAddressSync(
  [Buffer.from('__event_authority')],
  new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P')
)[0];

// Pump.fun Instruction Discriminators (Anchor: sha256("global:<name>").slice(0, 8))
export const PUMP_FUN_BUY_DISCRIMINATOR = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);
export const PUMP_FUN_SELL_DISCRIMINATOR = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]);

// Pump.fun Bonding Curve State
export const PUMP_CURVE_STATE_SIGNATURE = Buffer.from([0x17, 0xb7, 0xf8, 0x37, 0x60, 0xd8, 0xac, 0x60]);
export const PUMP_CURVE_STATE_OFFSETS = {
  VIRTUAL_TOKEN_RESERVES: 0x08,
  VIRTUAL_SOL_RESERVES: 0x10,
  REAL_TOKEN_RESERVES: 0x18,
  REAL_SOL_RESERVES: 0x20,
  TOKEN_TOTAL_SUPPLY: 0x28,
  COMPLETE: 0x30,
} as const;

// Pump.fun token decimals
export const PUMP_FUN_TOKEN_DECIMALS = 6;

// Token Program
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

// System & Rent
export const RENT_PROGRAM_ID = new PublicKey('SysvarRent111111111111111111111111111111111');

// Jito
export const JITO_TIP_ACCOUNTS = [
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
].map(addr => new PublicKey(addr));

// Bonding curve PDA seed
export const PUMP_FUN_BONDING_CURVE_SEED = 'bonding-curve';

// Lamports
export const LAMPORTS_PER_SOL = 1_000_000_000;

// Default config values
export const DEFAULT_SLIPPAGE_BPS = 500; // 5%
export const DEFAULT_PRIORITY_FEE = 100_000; // 0.0001 SOL

// Trade limits
export const MIN_TRADE_SOL = 0.001;
export const MAX_TRADE_SOL = 10;

// Timing
export const PRICE_UPDATE_INTERVAL_MS = 1000;
export const POSITION_CHECK_INTERVAL_MS = 500;
export const HEARTBEAT_INTERVAL_MS = 30000;

// Scoring thresholds
export const SCORE_THRESHOLDS = {
  EXCELLENT: 85,
  GOOD: 70,
  MODERATE: 55,
  POOR: 40,
  REJECT: 0,
};

// Risk levels
export const RISK_PROFILES = {
  conservative: {
    min_score: 80,
    max_positions: 3,
    position_size_pct: 5,
    trailing_stop_pct: 25,
  },
  moderate: {
    min_score: 65,
    max_positions: 5,
    position_size_pct: 10,
    trailing_stop_pct: 20,
  },
  aggressive: {
    min_score: 50,
    max_positions: 10,
    position_size_pct: 15,
    trailing_stop_pct: 15,
  },
};
