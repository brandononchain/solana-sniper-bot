# 🎯 Solana Pump.fun Sniper Bot

A high-performance memecoin sniping bot for Solana's Pump.fun platform with AI-powered analysis, multiple trading strategies, and comprehensive risk management.

## ✨ Features

### Core
- **🚀 Real-time Sniping** - WebSocket listener for instant new token detection
- **🤖 AI-Powered Analysis** - Scores tokens 0-100 using creator history, patterns, and market context
- **🛡️ Scam Protection** - Multi-layer filtering (mint authority, freeze, honeypot, blacklists)
- **📊 Risk Management** - Position sizing, trailing stops, take-profit tiers, daily loss limits

### Trading
- **⚡ MEV Protection** - Jito bundle support for front-run protection
- **📈 Multiple Strategies** - Momentum, Sniper, Conservative, Degen modes
- **💰 Auto Take-Profit** - Tiered profit-taking at configurable multipliers
- **🛑 Trailing Stops** - Dynamic stop-loss that follows price up

### Wallet & Security
- **🔐 HD Wallets** - Secure derivation with encrypted storage
- **💳 Burner Wallets** - Generate fresh wallets for trading
- **🔄 Auto-Sweep** - Profits swept to cold wallet automatically

### Monitoring
- **🖥️ Terminal UI** - Beautiful real-time dashboard with hotkeys
- **🌐 Web Dashboard** - Mobile-friendly monitoring interface
- **📱 Telegram Alerts** - Real-time notifications for trades
- **📝 Paper Trading** - Test strategies without risking real SOL

### Intelligence
- **📚 ML Training** - Collects outcome data to improve scoring
- **📊 Pattern Analysis** - Learns from historical performance
- **🎯 Strategy Optimization** - Auto-adjusts weights based on results

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Solana RPC endpoint (Helius, QuickNode, or Triton)
- SOL for trading

### Installation

```bash
git clone <repo>
cd solana-sniper-bot
npm install
```

### Setup

```bash
npm run setup
```

This will:
1. Create your `config.yaml`
2. Generate a burner wallet
3. Initialize the database
4. Show your deposit address

### Fund & Start

```bash
# Send SOL to the wallet address shown
# Then start the bot:
npm start
```

---

## 📖 Usage

### Terminal UI
```bash
npm start           # Launch with TUI
npm start -- --headless  # Logs only (for VPS)
```

### Paper Trading (Test Mode)
```bash
npm run paper       # Simulate trades without real SOL
```

### Web Dashboard
```bash
# Enable in config.yaml, then:
npm run web
# Open http://localhost:3000?token=YOUR_TOKEN
```

---

## ⌨️ TUI Controls

| Key | Action |
|-----|--------|
| `S` | Start/Stop bot |
| `P` | Pause/Resume |
| `K` | Kill all positions (emergency) |
| `R` | Risk settings |
| `W` | Wallet info |
| `Q` | Quit |

---

## 🎮 Trading Strategies

### Default (Balanced)
Standard AI-based sniping with moderate risk parameters.

### Momentum
```yaml
bot:
  strategy: "momentum"
```
- Focuses on tokens with strong buy pressure
- Quick entries, quick exits on reversal
- Tighter stops, faster profit-taking

### Sniper
```yaml
bot:
  strategy: "sniper"
```
- Pure speed play - be first
- Minimal analysis, maximum speed
- Small positions, tight time limits

### Conservative
```yaml
bot:
  strategy: "conservative"
```
- High selectivity (score ≥75)
- Thorough due diligence
- Wider stops, let winners run

### Degen 🦧
```yaml
bot:
  strategy: "degen"
```
- APE MODE
- Lower score threshold
- Diamond hands (wide stops)
- Meme name detection for extra hype

---

## ⚙️ Configuration

### Key Settings

```yaml
# Trading
trading:
  buy:
    min_score: 65        # AI score threshold
    amount_sol: 0.05     # Per trade
    use_jito: true       # MEV protection

# Risk
risk:
  max_positions: 5
  max_daily_loss_sol: 0.5
  trailing_stop_pct: 20

# Take Profits
trading:
  sell:
    take_profit_tiers:
      - multiplier: 2
        sell_pct: 25
      - multiplier: 5
        sell_pct: 50
```

### Telegram Notifications

```yaml
notifications:
  telegram:
    enabled: true
    bot_token: "YOUR_BOT_TOKEN"  # From @BotFather
    chat_id: "YOUR_CHAT_ID"      # From @userinfobot
```

### Web Dashboard

```yaml
web:
  enabled: true
  port: 3000
  auth_token: "random-secure-string"
```

---

## 🤖 AI Scoring

Tokens are scored 0-100 based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Creator Age | 15% | Wallet history length |
| Mint Renounced | 20% | Can't mint more tokens |
| Social Presence | 10% | Twitter/Telegram links |
| Name Quality | 10% | Not suspicious patterns |
| Market Timing | 15% | Peak trading hours |
| Early Buyers | 15% | Initial buy pressure |
| Liquidity | 15% | Pool depth |

### Training the AI

```bash
npm run train update    # Update token outcomes
npm run train analyze   # Show pattern analysis
npm run train weights   # Get optimized weights
npm run train export    # Export training data
```

---

## 📁 Project Structure

```
solana-sniper-bot/
├── src/
│   ├── index.ts           # CLI entry point
│   ├── config.ts          # Configuration
│   ├── core/
│   │   ├── bot.ts         # Main orchestrator
│   │   ├── listener.ts    # Pump.fun WebSocket
│   │   ├── executor.ts    # Transaction execution
│   │   ├── risk-manager.ts
│   │   ├── price-tracker.ts
│   │   └── simulator.ts   # Paper trading
│   ├── strategies/
│   │   ├── base.ts        # Strategy interface
│   │   ├── momentum.ts
│   │   ├── sniper.ts
│   │   ├── conservative.ts
│   │   └── degen.ts
│   ├── ai/
│   │   ├── analyzer.ts    # Token scoring
│   │   └── trainer.ts     # ML training
│   ├── filters/
│   │   └── scam-filter.ts
│   ├── wallet/
│   │   ├── manager.ts     # HD wallets
│   │   └── crypto.ts      # Encryption
│   ├── notifications/
│   │   └── telegram.ts
│   ├── web/
│   │   └── server.ts      # Dashboard
│   ├── db/
│   │   └── schema.ts      # SQLite
│   ├── tui/
│   │   └── app.tsx        # Terminal UI
│   └── utils/
│       ├── logger.ts
│       ├── constants.ts
│       └── health.ts
├── data/
│   └── bot.db             # Database
├── config.yaml
└── package.json
```

---

## 🔒 Security

1. **Burner Wallets** - Never use your main wallet
2. **Encrypted Storage** - Keys encrypted with AES-256
3. **Auto-Sweep** - Profits moved to cold wallet
4. **Private RPC** - Use authenticated endpoints
5. **Loss Limits** - Auto-stop on daily limits

---

## 📊 CLI Commands

```bash
# Bot control
npm start              # Start with TUI
npm start -- --headless  # Headless mode

# Wallet management
npm run cli wallet --list
npm run cli wallet --new [label]
npm run cli wallet --balance
npm run cli wallet --sweep <address>

# Statistics
npm run cli stats
npm run cli stats --days 30

# AI training
npm run train update
npm run train analyze
npm run train weights
```

---

## ⚠️ Disclaimer

**USE AT YOUR OWN RISK**

- Memecoin trading is extremely risky
- You can lose all your funds
- This bot is for educational purposes
- Past performance doesn't guarantee future results
- Always start with small amounts you can afford to lose
- Never invest more than you can afford to lose

---

## 📜 License

MIT

---

## 🙏 Credits

Built with:
- [@solana/web3.js](https://github.com/solana-labs/solana-web3.js)
- [Ink](https://github.com/vadimdemedes/ink) (React for CLI)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Jito](https://jito.wtf) for MEV protection
