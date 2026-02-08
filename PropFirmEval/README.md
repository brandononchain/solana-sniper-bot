# PropFirmSniper - NinjaTrader 8 Strategy for Prop Firm Evaluations

A professionally designed strategy to pass futures prop firm evaluations (Apex, TopStep, Earn2Trade, etc.) using Opening Range Breakout with VWAP confluence and strict risk management.

## 🎯 Strategy Overview

**Core Logic:**
- Opening Range Breakout (ORB) identifies high-probability directional moves
- VWAP filter ensures we're trading with institutional order flow
- Volume confirmation reduces false breakouts
- Adaptive position sizing based on remaining drawdown buffer

**Why This Works for Evals:**
1. **Consistency over home runs** - Small, controlled wins compound
2. **Hard daily limits** - Never blow an account on one bad day
3. **Drawdown awareness** - Strategy becomes conservative as you approach limits
4. **Session-based** - Only trades the best setups during optimal hours

## 📦 Installation

### Step 1: Copy the Strategy File
1. Open NinjaTrader 8
2. Go to `Documents\NinjaTrader 8\bin\Custom\Strategies\`
3. Copy `PropFirmSniper.cs` to this folder

### Step 2: Compile
1. In NinjaTrader, go to **New > NinjaScript Editor**
2. Press **F5** to compile
3. You should see "PropFirmSniper" in the output

### Step 3: Add to Chart
1. Open a chart (recommended: ES, NQ, or MES/MNQ for practice)
2. Right-click > **Strategies** > **PropFirmSniper**
3. Configure settings (see presets below)

## ⚙️ Presets for Popular Prop Firms

### Apex Trader Funding - 50K Evaluation
```
Account Size: 50000
Profit Target: 3000
Max Drawdown: 2500 (trailing)
Daily Loss Limit: 0 (Apex doesn't have one)
Use Trailing Drawdown: True
Daily Profit Target: 400-500 (conservative approach)
Max Trades Per Day: 3
```

### Apex Trader Funding - 100K Evaluation
```
Account Size: 100000
Profit Target: 6000
Max Drawdown: 3000 (trailing)
Daily Loss Limit: 0
Use Trailing Drawdown: True
Daily Profit Target: 600-800
Max Trades Per Day: 3
```

### TopStep - 50K Combine
```
Account Size: 50000
Profit Target: 3000
Max Drawdown: 2000
Daily Loss Limit: 1000
Use Trailing Drawdown: False (TopStep uses static)
Daily Profit Target: 400
Max Trades Per Day: 2
```

### Earn2Trade - 50K Gauntlet Mini
```
Account Size: 50000
Profit Target: 3000
Max Drawdown: 2000
Daily Loss Limit: 1000
Use Trailing Drawdown: True
Daily Profit Target: 400
Max Trades Per Day: 3
```

## 📊 Recommended Instruments

### Best for Evaluations:
| Instrument | Tick Value | Why |
|------------|------------|-----|
| **ES** (E-mini S&P) | $12.50 | Most liquid, tightest spreads |
| **NQ** (E-mini Nasdaq) | $5.00 | Good volatility, tight spreads |
| **MES** (Micro E-mini S&P) | $1.25 | Practice with reduced risk |
| **MNQ** (Micro E-mini Nasdaq) | $0.50 | Best for learning |

### Avoid During Eval:
- CL (Crude Oil) - Too volatile, gaps kill accounts
- GC (Gold) - Wide spreads, erratic moves
- 6E (Euro FX) - Low volatility, hard to hit targets

## ⏰ Optimal Trading Sessions

### Primary (Highest Probability):
```
NY Open: 9:30 AM - 11:30 AM ET
- Best volume and cleanest breakouts
- Strategy default session
```

### Secondary:
```
European Open: 3:00 AM - 5:00 AM ET
- Good if you're an early bird
- Adjust session times in settings
```

### Avoid:
- Lunch (11:30 AM - 1:30 PM ET) - Choppy, low volume
- FOMC days - Unpredictable volatility
- First 2 days after major holidays

## 🎛️ Parameter Optimization Guide

### Opening Range Settings
| Parameter | Conservative | Moderate | Aggressive |
|-----------|--------------|----------|------------|
| OR Duration | 15-20 min | 10-15 min | 5-10 min |
| Breakout Buffer | 3-4 ticks | 2-3 ticks | 1-2 ticks |
| Min OR Size | 10 ticks | 8 ticks | 6 ticks |
| Max OR Size | 30 ticks | 40 ticks | 50 ticks |

### Risk Settings
| Parameter | Conservative | Moderate | Aggressive |
|-----------|--------------|----------|------------|
| Risk % | 0.5% | 1.0% | 1.5% |
| Stop Loss | 15 ticks | 12 ticks | 10 ticks |
| PT1 | 12 ticks | 16 ticks | 20 ticks |
| PT2 | 24 ticks | 32 ticks | 40 ticks |
| Max Trades/Day | 2 | 3 | 4 |

### My Recommended "Pass the Eval" Settings:
```
Risk Per Trade: 1.0%
Stop Loss: 12 ticks
Profit Target 1: 16 ticks (1.33 R:R)
Profit Target 2: 32 ticks (runner)
Break Even: 10 ticks
Max Trades Per Day: 3
Daily Profit Target: $400-500 (50K account)
Use VWAP Filter: True
Use ATR Stops: False (keep it simple)
```

## 🛡️ Risk Management Philosophy

### The Golden Rules:
1. **Never risk more than 1% of remaining drawdown** per trade
2. **Stop trading after hitting daily target** - greed kills accounts
3. **3 trades max per day** - overtrading is the #1 account killer
4. **Get cautious at 70% drawdown** - the strategy automatically reduces activity

### Why Trailing Drawdown Changes Everything:
With trailing drawdown, your max loss moves UP with profits. This means:
- Early wins = more buffer
- Strategy locks in profits by reducing risk exposure as you approach target
- You can afford to be aggressive early, conservative late

## 📈 Backtesting Guide

### Step 1: Get Good Data
- **Rithmic/CQG** - Use your prop firm's data feed
- **Kinetick** - Free with NinjaTrader, good enough for testing
- Download at least 3 months of tick data for your instrument

### Step 2: Run Backtest
1. Open Strategy Analyzer
2. Select PropFirmSniper
3. Set date range (avoid known anomaly periods like March 2020)
4. Run with your evaluation's rules

### Step 3: Analyze Results
**Good signs:**
- Win rate > 50%
- Profit factor > 1.5
- Max drawdown < your eval's limit
- Consistent equity curve (no huge spikes/drops)

**Red flags:**
- Profit factor < 1.2 = edge is too small
- Win rate < 40% = adjust filters
- Max drawdown near limit = reduce position size

## 🔧 Troubleshooting

### "Strategy not taking trades"
1. Check if current time is within session hours
2. Verify OR has completed (see print statements)
3. Check if daily limits have been hit
4. Ensure volume filter isn't too strict

### "Stop loss getting hit too often"
1. Increase stop loss by 2-4 ticks
2. Enable ATR stops for dynamic sizing
3. Increase OR duration for cleaner breakouts
4. Add more breakout buffer ticks

### "Missing good moves"
1. Reduce breakout buffer
2. Lower volume filter requirement
3. Increase max OR size
4. Consider disabling VWAP filter (test first!)

### "Too much slippage"
1. Use limit orders (modify strategy if needed)
2. Trade more liquid instruments (ES over RTY)
3. Avoid news events
4. Check your data feed latency

## 📝 Evaluation Timeline Strategy

### Week 1: Build the Buffer
- Trade full size (1% risk)
- Target $150-200/day
- Goal: Get $500+ ahead

### Week 2: Maintain and Extend
- Same approach if on track
- Reduce to 0.75% risk if nervous
- Goal: Reach 50% of target

### Week 3+: Cruise Control
- Reduce risk to 0.5%
- Only take A+ setups
- Stop at smaller daily targets
- Goal: Cross finish line safely

## ⚠️ Disclaimer

This strategy is for educational purposes. Past performance doesn't guarantee future results. Trading futures involves substantial risk of loss. Use on simulation first. The author is not responsible for any losses incurred.

## 🔄 Version History

- **v1.0** (2024) - Initial release
  - Opening Range Breakout core logic
  - VWAP filter
  - Adaptive position sizing
  - Prop firm presets

---

**Questions?** Test thoroughly on sim before going live. Good luck passing your evaluation! 🚀
