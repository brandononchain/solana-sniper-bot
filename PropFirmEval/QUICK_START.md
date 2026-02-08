# PropFirmSniper - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Install Files
```
Copy these to: Documents\NinjaTrader 8\bin\Custom\

Strategies\
├── PropFirmSniper.cs          (Basic version)
└── PropFirmSniperV2_MultiSession.cs  (Advanced version)

Indicators\
└── EvalTracker.cs             (Progress overlay)
```

### 2. Compile
- NinjaTrader > New > NinjaScript Editor
- Press F5

### 3. Configure for Your Eval

**Apex 50K:**
```
Account Size: 50000
Profit Target: 3000
Max Drawdown: 2500
Daily Loss Limit: 0
Trailing Drawdown: TRUE
```

**TopStep 50K:**
```
Account Size: 50000
Profit Target: 3000
Max Drawdown: 2000
Daily Loss Limit: 1000
Trailing Drawdown: FALSE
```

### 4. Attach to Chart
- ES or NQ, 5-minute chart
- Right-click > Strategies > PropFirmSniper
- Enable, set to "Live"

## ⚡ Key Settings to Tweak

| Setting | Conservative | Aggressive |
|---------|--------------|------------|
| Risk % | 0.5% | 1.5% |
| Max Trades/Day | 2 | 4 |
| Daily Target | $300 | $600 |
| Stop Loss | 15 ticks | 10 ticks |

## 🎯 The Game Plan

**Week 1:** Build buffer ($500+ ahead)
**Week 2:** Maintain pace
**Week 3+:** Reduce risk, coast to finish

## ⚠️ Don't Forget

- [ ] Test on SIM first (at least 1 week)
- [ ] Check prop firm rules for trading hours
- [ ] Avoid FOMC / NFP days
- [ ] Stop trading when daily target hit
- [ ] Never revenge trade

## 🆘 Common Issues

**No trades?**
→ Check session times match your timezone
→ Verify OR is completing (see output window)

**Too many losses?**
→ Increase stop loss
→ Reduce max trades per day
→ Enable more filters

**Missing moves?**
→ Reduce breakout buffer
→ Disable VWAP filter

---

Good luck! 🍀
