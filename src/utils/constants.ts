import { PublicKey } from '@solana/web3.js';

// Pump.fun Program IDs
export const PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
export const PUMP_FUN_MINT_AUTHORITY = new PublicKey('TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM');
export const PUMP_FEE_PROGRAM_ID = new PublicKey('pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ');

// Pump.fun Global Account (PDA from ["global"] seed)
export const PUMP_FUN_GLOBAL = new PublicKey('4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf');

// Pump.fun Fee Recipient. Kept as a conservative fallback. Newer Pump IDLs support multiple fee recipients.
export const PUMP_FUN_FEE_RECIPIENT = new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM');

export const PUMP_FUN_EVENT_AUTHORITY = PublicKey.findProgramAddressSync(
  [Buffer.from('__event_authority')],
  PUMP_FUN_PROGRAM_ID
)[0];

export const PUMP_FUN_BUY_DISCRIMINATOR = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);
export const PUMP_FUN_BUY_EXACT_SOL_IN_DISCRIMINATOR = Buffer.from([56, 252, 116, 8, 158, 223, 205, 95]);
export const PUMP_FUN_SELL_DISCRIMINATOR = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]);
export const PUMP_FUN_EXTEND_ACCOUNT_DISCRIMINATOR = Buffer.from([234, 102, 194, 203, 150, 72, 62, 229]);

export const PUMP_CURVE_STATE_SIGNATURE = Buffer.from([0x17, 0xb7, 0xf8, 0x37, 0x60, 0xd8, 0xac, 0x60]);
export const PUMP_CURVE_STATE_OFFSETS = {
  VIRTUAL_TOKEN_RESERVES: 0x08,
  VIRTUAL_SOL_RESERVES: 0x10,
  REAL_TOKEN_RESERVES: 0x18,
  REAL_SOL_RESERVES: 0x20,
  TOKEN_TOTAL_SUPPLY: 0x28,
  COMPLETE: 0x30,
  CREATOR: 0x31,
} as const;

export const PUMP_FUN_TOKEN_DECIMALS = 6;
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
export const RENT_PROGRAM_ID = new PublicKey('SysvarRent111111111111111111111111111111111');

export const PUMP_FUN_BONDING_CURVE_SEED = 'bonding-curve';
export const PUMP_FUN_CREATOR_VAULT_SEED = 'creator-vault';
export const PUMP_FUN_GLOBAL_VOLUME_ACCUMULATOR_SEED = 'global_volume_accumulator';
export const PUMP_FUN_USER_VOLUME_ACCUMULATOR_SEED = 'user_volume_accumulator';
export const PUMP_FEE_CONFIG_SEED = 'fee_config';
export const PUMP_MIN_EXTENDED_BONDING_CURVE_BYTES = 150;

export const PUMP_FUN_GLOBAL_VOLUME_ACCUMULATOR = PublicKey.findProgramAddressSync(
  [Buffer.from(PUMP_FUN_GLOBAL_VOLUME_ACCUMULATOR_SEED)],
  PUMP_FUN_PROGRAM_ID
)[0];

export const PUMP_FEE_CONFIG = PublicKey.findProgramAddressSync(
  [Buffer.from(PUMP_FEE_CONFIG_SEED), PUMP_FUN_PROGRAM_ID.toBuffer()],
  PUMP_FEE_PROGRAM_ID
)[0];

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

export const LAMPORTS_PER_SOL = 1_000_000_000;
export const DEFAULT_SLIPPAGE_BPS = 500;
export const DEFAULT_PRIORITY_FEE = 100_000;
export const MIN_TRADE_SOL = 0.001;
export const MAX_TRADE_SOL = 10;
export const PRICE_UPDATE_INTERVAL_MS = 1000;
export const POSITION_CHECK_INTERVAL_MS = 500;
export const HEARTBEAT_INTERVAL_MS = 30000;

export const SCORE_THRESHOLDS = {
  EXCELLENT: 85,
  GOOD: 70,
  MODERATE: 55,
  POOR: 40,
  REJECT: 0,
};

export const RISK_PROFILES = {
  conservative: { min_score: 80, max_positions: 3, position_size_pct: 5, trailing_stop_pct: 25 },
  moderate: { min_score: 65, max_positions: 5, position_size_pct: 10, trailing_stop_pct: 20 },
  aggressive: { min_score: 50, max_positions: 10, position_size_pct: 15, trailing_stop_pct: 15 },
};
