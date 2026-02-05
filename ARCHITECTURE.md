# Solana Pump.fun Sniper Bot - Architecture

## Overview
A high-performance memecoin sniping bot targeting Pump.fun token launches on Solana, with AI-powered analysis, advanced risk management, and burner wallet architecture.

## Design Decisions

### Interface Choice: **Terminal UI (TUI) + Optional Web Dashboard**

**Why TUI over pure Web UI:**
- **Speed**: No HTTP overhead, direct memory access, sub-millisecond response
- **Reliability**: No browser dependencies, runs headless on VPS
- **Security**: No exposed web ports to attack
- **Control**: Real-time hotkeys for emergency stops

**Web Dashboard (optional, read-heavy):**
- Analytics and historical data visualization
- Mobile monitoring (read-only by default)
- Runs on separate port, not in critical path

### Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SNIPER BOT CORE                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Listener   │  │   Executor   │  │    Risk Manager      │  │
│  │  (WebSocket) │  │  (TX Engine) │  │  (Position/Exposure) │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  AI Analyzer │  │ Scam Filter  │  │    Wallet Manager    │  │
│  │  (Scoring)   │  │  (Rug Check) │  │  (Burner Generation) │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      DATA / MEMORY LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   SQLite DB  │  │  Trade Log   │  │   AI Training Data   │  │
│  │  (State)     │  │  (History)   │  │   (Outcomes/Learn)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Pump.fun Listener
- WebSocket connection to Solana RPC (Helius/Triton recommended)
- Monitors Pump.fun program for new token deployments
- Filters by bonding curve creation events
- **Latency target**: <50ms from on-chain to bot

### 2. AI Token Analyzer
Scores tokens 0-100 based on:
- **Creator Analysis**: Wallet age, history, prior rugs
- **Token Metadata**: Name patterns, suspicious keywords
- **Social Signals**: Twitter/Telegram presence (if detectable)
- **Market Context**: Current market conditions, trending narratives
- **On-chain Patterns**: Similar to known scam patterns

### 3. Scam/Rug Filter (Hard Rules)
Auto-reject if:
- Mint authority NOT renounced
- Freeze authority enabled
- Creator wallet linked to known rugs
- Honeypot patterns detected
- Metadata is mutable
- No LP lock (for graduated tokens)

### 4. Risk Manager
- **Position Sizing**: % of portfolio per trade (configurable)
- **Max Concurrent Positions**: Limit open trades
- **Daily Loss Limit**: Stop trading after X% drawdown
- **Per-Token Exposure**: Max SOL per single token
- **Trailing Stop Loss**: Dynamic exit on reversal
- **Take Profit Tiers**: Scale out at targets

### 5. Execution Engine
- **Jito bundles** for front-run protection
- **Priority fee optimization** (dynamic based on network)
- **Slippage protection** with configurable tolerance
- **Retry logic** with exponential backoff
- **MEV protection** via private transactions

### 6. Wallet Manager
- Generate fresh burner wallets on demand
- HD wallet derivation from master seed
- Auto-sweep profits to cold wallet
- Track P&L per burner wallet
- One-click wallet rotation

## Data Storage

### SQLite Schema (Primary)
```sql
-- Wallets
CREATE TABLE wallets (
    id TEXT PRIMARY KEY,
    public_key TEXT UNIQUE,
    encrypted_private_key TEXT,
    created_at TIMESTAMP,
    is_active BOOLEAN,
    total_pnl REAL
);

-- Trades
CREATE TABLE trades (
    id TEXT PRIMARY KEY,
    wallet_id TEXT,
    token_mint TEXT,
    token_name TEXT,
    side TEXT, -- 'buy' or 'sell'
    amount_sol REAL,
    amount_tokens REAL,
    price REAL,
    tx_signature TEXT,
    ai_score REAL,
    created_at TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id)
);

-- Positions (open)
CREATE TABLE positions (
    id TEXT PRIMARY KEY,
    wallet_id TEXT,
    token_mint TEXT,
    token_name TEXT,
    entry_price REAL,
    current_price REAL,
    amount_tokens REAL,
    cost_basis_sol REAL,
    stop_loss REAL,
    take_profit REAL,
    opened_at TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id)
);

-- AI Training Data
CREATE TABLE token_outcomes (
    token_mint TEXT PRIMARY KEY,
    initial_score REAL,
    features_json TEXT,
    max_price_multiple REAL,
    time_to_peak_ms INTEGER,
    is_rug BOOLEAN,
    outcome_label TEXT, -- 'winner', 'loser', 'rug', 'slow_bleed'
    created_at TIMESTAMP
);

-- Config
CREATE TABLE config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP
);
```

### AI Training Data Collection
Every token analyzed gets logged with:
- All input features at decision time
- Outcome (price action over 1h, 4h, 24h)
- Classification (rug, pump, slow bleed, moon)
- Used to retrain/fine-tune scoring model

## Configuration

```yaml
# config.yaml
bot:
  enabled: true
  mode: "aggressive" # conservative, moderate, aggressive

rpc:
  primary: "https://mainnet.helius-rpc.com/?api-key=XXX"
  fallback: "https://api.mainnet-beta.solana.com"
  ws: "wss://mainnet.helius-rpc.com/?api-key=XXX"

trading:
  buy:
    enabled: true
    min_score: 70           # AI score threshold
    amount_sol: 0.1         # SOL per snipe
    max_slippage_bps: 500   # 5%
    priority_fee_lamports: 100000
    use_jito: true
  
  sell:
    trailing_stop_pct: 15   # Sell if drops 15% from peak
    take_profit_tiers:
      - multiplier: 2       # 2x
        sell_pct: 30        # Sell 30% of position
      - multiplier: 5       # 5x
        sell_pct: 40
      - multiplier: 10      # 10x
        sell_pct: 30        # Remaining 30%
    
risk:
  max_positions: 5
  max_daily_loss_sol: 1.0
  max_single_token_sol: 0.5
  pause_after_consecutive_losses: 3

filters:
  require_mint_renounced: true
  require_freeze_disabled: true
  min_creator_wallet_age_hours: 24
  blacklist_patterns:
    - "test"
    - "rug"
    - "scam"

wallet:
  auto_sweep_threshold_sol: 1.0
  sweep_to_address: "YOUR_COLD_WALLET"

ai:
  model: "local"  # or "openai" for GPT analysis
  confidence_threshold: 0.7
```

## Security Measures

1. **Wallet Encryption**: Private keys encrypted at rest with user password
2. **No External Key Exposure**: Keys never leave the machine
3. **RPC Privacy**: Use private RPC endpoints
4. **Transaction Privacy**: Jito bundles for MEV protection
5. **Auto-Sweep**: Profits moved to cold wallet automatically
6. **Kill Switch**: Instant stop via hotkey or API

## TUI Interface Layout

```
┌─ SOLANA SNIPER ─────────────────────────────────────────────────┐
│ Status: 🟢 ACTIVE    Wallet: 7xK...m3Q    Balance: 2.45 SOL    │
├─────────────────────────────────────────────────────────────────┤
│ OPEN POSITIONS (3/5)                                            │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ $PEPE    +127%  0.05 SOL → 0.11 SOL   SL: -15%  TP: 5x     │ │
│ │ $DOGE2    +34%  0.1 SOL  → 0.13 SOL   SL: -15%  TP: 5x     │ │
│ │ $MOON     -8%   0.1 SOL  → 0.09 SOL   SL: -15%  TP: 5x     │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ LIVE FEED                                                       │
│ 14:23:01 [NEW] $CATGIRL score:82 → SNIPING 0.1 SOL...          │
│ 14:23:01 [BUY] $CATGIRL bought @ 0.000001 (tx: 4xR...)         │
│ 14:22:45 [SKIP] $RUGCOIN score:23 (below threshold)            │
│ 14:22:30 [TP1] $PEPE hit 2x, sold 30%                          │
├─────────────────────────────────────────────────────────────────┤
│ TODAY: +0.45 SOL (+18%)   TRADES: 12 (8W/4L)   WIN: 67%        │
├─────────────────────────────────────────────────────────────────┤
│ [S]ettings  [P]ause  [K]ill All  [W]allet  [H]elp  [Q]uit      │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Language**: TypeScript (Node.js) - fast enough, great Solana libs
- **Solana SDK**: @solana/web3.js, @coral-xyz/anchor
- **TUI**: blessed / blessed-contrib or ink (React for CLI)
- **Database**: better-sqlite3 (synchronous, fast)
- **AI**: Local scoring model + optional OpenAI for deep analysis
- **Web Dashboard**: Optional React + Vite (separate process)

## File Structure

```
solana-sniper-bot/
├── src/
│   ├── index.ts              # Entry point
│   ├── config.ts             # Configuration loader
│   ├── core/
│   │   ├── listener.ts       # Pump.fun event listener
│   │   ├── executor.ts       # Transaction execution
│   │   ├── risk-manager.ts   # Risk management logic
│   │   └── position-tracker.ts
│   ├── ai/
│   │   ├── analyzer.ts       # Token scoring
│   │   ├── features.ts       # Feature extraction
│   │   └── trainer.ts        # Model training from outcomes
│   ├── filters/
│   │   ├── scam-filter.ts    # Rug/scam detection
│   │   └── patterns.ts       # Known bad patterns
│   ├── wallet/
│   │   ├── manager.ts        # Wallet generation/management
│   │   └── crypto.ts         # Encryption utilities
│   ├── db/
│   │   ├── schema.ts         # Database schema
│   │   └── queries.ts        # Database operations
│   ├── tui/
│   │   ├── app.tsx           # Main TUI application
│   │   ├── components/       # UI components
│   │   └── hooks/            # State hooks
│   └── utils/
│       ├── logger.ts
│       ├── constants.ts
│       └── helpers.ts
├── web/                      # Optional web dashboard
├── data/
│   ├── bot.db               # SQLite database
│   └── training/            # AI training data
├── config.yaml
├── package.json
└── tsconfig.json
```

## Next Steps

1. Set up project structure and dependencies
2. Implement wallet manager (burner generation)
3. Build Pump.fun listener
4. Create basic scam filters
5. Implement execution engine
6. Add AI scoring (start simple, iterate)
7. Build TUI interface
8. Add risk management
9. Optional: Web dashboard

Ready to start building?
