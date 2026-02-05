import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';

export function initializeDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  
  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  
  // Create tables
  db.exec(`
    -- Configuration
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Wallets
    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      public_key TEXT UNIQUE NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 0,
      total_pnl REAL DEFAULT 0,
      label TEXT
    );

    -- Trades (all buy/sell transactions)
    CREATE TABLE IF NOT EXISTS trades (
      id TEXT PRIMARY KEY,
      wallet_id TEXT NOT NULL,
      token_mint TEXT NOT NULL,
      token_name TEXT,
      token_symbol TEXT,
      side TEXT NOT NULL CHECK(side IN ('buy', 'sell')),
      amount_sol REAL NOT NULL,
      amount_tokens REAL NOT NULL,
      price REAL NOT NULL,
      tx_signature TEXT,
      ai_score REAL,
      slippage_bps INTEGER,
      priority_fee_lamports INTEGER,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'failed')),
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      confirmed_at TIMESTAMP,
      FOREIGN KEY (wallet_id) REFERENCES wallets(id)
    );

    -- Positions (currently open)
    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      wallet_id TEXT NOT NULL,
      token_mint TEXT NOT NULL,
      token_name TEXT,
      token_symbol TEXT,
      entry_price REAL NOT NULL,
      entry_tx TEXT,
      current_price REAL,
      highest_price REAL,
      amount_tokens REAL NOT NULL,
      remaining_tokens REAL NOT NULL,
      cost_basis_sol REAL NOT NULL,
      realized_pnl_sol REAL DEFAULT 0,
      stop_loss_pct REAL,
      take_profit_tiers TEXT, -- JSON array
      opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (wallet_id) REFERENCES wallets(id),
      UNIQUE(wallet_id, token_mint)
    );

    -- AI Training Data (token outcomes)
    CREATE TABLE IF NOT EXISTS token_outcomes (
      token_mint TEXT PRIMARY KEY,
      token_name TEXT,
      token_symbol TEXT,
      creator_address TEXT,
      initial_score REAL,
      features_json TEXT,
      
      -- Price data
      entry_price REAL,
      peak_price REAL,
      price_1h REAL,
      price_4h REAL,
      price_24h REAL,
      
      -- Metrics
      max_price_multiple REAL,
      time_to_peak_ms INTEGER,
      volume_1h REAL,
      holder_count_1h INTEGER,
      
      -- Classification
      is_rug INTEGER DEFAULT 0,
      is_honeypot INTEGER DEFAULT 0,
      outcome_label TEXT CHECK(outcome_label IN ('moon', 'winner', 'breakeven', 'loser', 'rug', 'honeypot')),
      
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Known bad actors (creators, contracts)
    CREATE TABLE IF NOT EXISTS blacklist (
      address TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('creator', 'token', 'contract')),
      reason TEXT,
      rug_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Daily stats
    CREATE TABLE IF NOT EXISTS daily_stats (
      date TEXT PRIMARY KEY,
      total_trades INTEGER DEFAULT 0,
      winning_trades INTEGER DEFAULT 0,
      losing_trades INTEGER DEFAULT 0,
      total_volume_sol REAL DEFAULT 0,
      realized_pnl_sol REAL DEFAULT 0,
      tokens_sniped INTEGER DEFAULT 0,
      tokens_skipped INTEGER DEFAULT 0,
      rugs_avoided INTEGER DEFAULT 0
    );

    -- Session state (for bot recovery)
    CREATE TABLE IF NOT EXISTS bot_state (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_trades_wallet ON trades(wallet_id);
    CREATE INDEX IF NOT EXISTS idx_trades_token ON trades(token_mint);
    CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at);
    CREATE INDEX IF NOT EXISTS idx_positions_wallet ON positions(wallet_id);
    CREATE INDEX IF NOT EXISTS idx_positions_token ON positions(token_mint);
    CREATE INDEX IF NOT EXISTS idx_outcomes_creator ON token_outcomes(creator_address);
    CREATE INDEX IF NOT EXISTS idx_outcomes_label ON token_outcomes(outcome_label);
    CREATE INDEX IF NOT EXISTS idx_blacklist_type ON blacklist(type);
  `);

  logger.info('Database initialized', { path: dbPath });
  return db;
}

// Query helpers
export interface TradeRecord {
  id: string;
  walletId: string;
  tokenMint: string;
  tokenName?: string;
  tokenSymbol?: string;
  side: 'buy' | 'sell';
  amountSol: number;
  amountTokens: number;
  price: number;
  txSignature?: string;
  aiScore?: number;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: Date;
}

export interface PositionRecord {
  id: string;
  walletId: string;
  tokenMint: string;
  tokenName?: string;
  tokenSymbol?: string;
  entryPrice: number;
  currentPrice?: number;
  highestPrice?: number;
  amountTokens: number;
  remainingTokens: number;
  costBasisSol: number;
  realizedPnlSol: number;
  stopLossPct?: number;
  takeProfitTiers?: { multiplier: number; sellPct: number }[];
  openedAt: Date;
}

export interface TokenOutcome {
  tokenMint: string;
  tokenName?: string;
  creatorAddress?: string;
  initialScore?: number;
  featuresJson?: string;
  maxPriceMultiple?: number;
  timeToPeakMs?: number;
  isRug: boolean;
  outcomeLabel?: string;
}

export function getOpenPositions(db: Database.Database, walletId?: string): PositionRecord[] {
  const query = walletId
    ? `SELECT * FROM positions WHERE wallet_id = ? ORDER BY opened_at DESC`
    : `SELECT * FROM positions ORDER BY opened_at DESC`;
  
  const rows = walletId 
    ? db.prepare(query).all(walletId) 
    : db.prepare(query).all();
  
  return (rows as any[]).map(row => ({
    id: row.id,
    walletId: row.wallet_id,
    tokenMint: row.token_mint,
    tokenName: row.token_name,
    tokenSymbol: row.token_symbol,
    entryPrice: row.entry_price,
    currentPrice: row.current_price,
    highestPrice: row.highest_price,
    amountTokens: row.amount_tokens,
    remainingTokens: row.remaining_tokens,
    costBasisSol: row.cost_basis_sol,
    realizedPnlSol: row.realized_pnl_sol,
    stopLossPct: row.stop_loss_pct,
    takeProfitTiers: row.take_profit_tiers ? JSON.parse(row.take_profit_tiers) : undefined,
    openedAt: new Date(row.opened_at),
  }));
}

export function getTodayStats(db: Database.Database) {
  const today = new Date().toISOString().split('T')[0];
  const row = db.prepare(`
    SELECT * FROM daily_stats WHERE date = ?
  `).get(today) as any;

  if (!row) {
    return {
      date: today,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalVolumeSol: 0,
      realizedPnlSol: 0,
      tokensSniped: 0,
      tokensSkipped: 0,
      rugsAvoided: 0,
    };
  }

  return {
    date: row.date,
    totalTrades: row.total_trades,
    winningTrades: row.winning_trades,
    losingTrades: row.losing_trades,
    totalVolumeSol: row.total_volume_sol,
    realizedPnlSol: row.realized_pnl_sol,
    tokensSniped: row.tokens_sniped,
    tokensSkipped: row.tokens_skipped,
    rugsAvoided: row.rugs_avoided,
  };
}

export function updateDailyStat(
  db: Database.Database,
  stat: keyof ReturnType<typeof getTodayStats>,
  increment: number = 1
) {
  const today = new Date().toISOString().split('T')[0];
  const columnMap: Record<string, string> = {
    totalTrades: 'total_trades',
    winningTrades: 'winning_trades',
    losingTrades: 'losing_trades',
    totalVolumeSol: 'total_volume_sol',
    realizedPnlSol: 'realized_pnl_sol',
    tokensSniped: 'tokens_sniped',
    tokensSkipped: 'tokens_skipped',
    rugsAvoided: 'rugs_avoided',
  };

  const column = columnMap[stat];
  if (!column) return;

  db.prepare(`
    INSERT INTO daily_stats (date, ${column})
    VALUES (?, ?)
    ON CONFLICT(date) DO UPDATE SET ${column} = ${column} + ?
  `).run(today, increment, increment);
}

export function isBlacklisted(db: Database.Database, address: string): boolean {
  const row = db.prepare(
    `SELECT 1 FROM blacklist WHERE address = ?`
  ).get(address);
  return !!row;
}

export function addToBlacklist(
  db: Database.Database,
  address: string,
  type: 'creator' | 'token' | 'contract',
  reason?: string
) {
  db.prepare(`
    INSERT OR IGNORE INTO blacklist (address, type, reason, rug_count)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(address) DO UPDATE SET rug_count = rug_count + 1
  `).run(address, type, reason || null);
}
