#region Using declarations
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using System.Xml.Serialization;
using NinjaTrader.Cbi;
using NinjaTrader.Gui;
using NinjaTrader.Gui.Chart;
using NinjaTrader.Gui.SuperDom;
using NinjaTrader.Gui.Tools;
using NinjaTrader.Data;
using NinjaTrader.NinjaScript;
using NinjaTrader.Core.FloatingPoint;
using NinjaTrader.NinjaScript.Indicators;
using NinjaTrader.NinjaScript.DrawingTools;
#endregion

namespace NinjaTrader.NinjaScript.Strategies
{
    /// <summary>
    /// PropFirmSniper - A strategy designed to pass prop firm evaluations
    /// Combines Opening Range Breakout with VWAP confluence and strict risk management
    /// Works with any data feed (Rithmic, CQG, Kinetick, etc.)
    /// </summary>
    public class PropFirmSniper : Strategy
    {
        #region Variables
        
        // Opening Range
        private double orHigh = 0;
        private double orLow = 0;
        private bool orComplete = false;
        private DateTime orStartTime;
        private DateTime orEndTime;
        
        // VWAP calculation (data feed agnostic)
        private double vwapSum = 0;
        private double volumeSum = 0;
        private double vwap = 0;
        
        // Session tracking
        private double sessionPnL = 0;
        private int sessionTrades = 0;
        private bool tradingAllowed = true;
        private DateTime lastResetDate = DateTime.MinValue;
        
        // Evaluation tracking
        private double evalStartingBalance = 0;
        private double peakBalance = 0;
        private double currentDrawdown = 0;
        
        // Trade management
        private double entryPrice = 0;
        private int tradeDirection = 0; // 1 = long, -1 = short
        private bool breakoutTriggered = false;
        
        // ATR for dynamic stops
        private ATR atr;
        
        #endregion

        #region Properties
        
        [NinjaScriptProperty]
        [Display(Name = "Account Size", Description = "Evaluation account size", Order = 1, GroupName = "1. Evaluation Settings")]
        public double AccountSize { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Profit Target", Description = "Evaluation profit target", Order = 2, GroupName = "1. Evaluation Settings")]
        public double EvalProfitTarget { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Max Drawdown", Description = "Maximum trailing drawdown allowed", Order = 3, GroupName = "1. Evaluation Settings")]
        public double MaxDrawdown { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Daily Loss Limit", Description = "Maximum loss per day (0 = no limit)", Order = 4, GroupName = "1. Evaluation Settings")]
        public double DailyLossLimit { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Trailing Drawdown", Description = "True = trailing drawdown, False = static", Order = 5, GroupName = "1. Evaluation Settings")]
        public bool UseTrailingDrawdown { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "OR Start (minutes after open)", Description = "Minutes after session open to start OR", Order = 1, GroupName = "2. Opening Range Settings")]
        public int ORStartMinutes { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "OR Duration (minutes)", Description = "Duration of opening range period", Order = 2, GroupName = "2. Opening Range Settings")]
        public int ORDurationMinutes { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Breakout Buffer (ticks)", Description = "Ticks beyond OR for valid breakout", Order = 3, GroupName = "2. Opening Range Settings")]
        public int BreakoutBufferTicks { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Use VWAP Filter", Description = "Require price above/below VWAP for direction", Order = 1, GroupName = "3. Filters")]
        public bool UseVWAPFilter { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Min OR Size (ticks)", Description = "Minimum opening range size", Order = 2, GroupName = "3. Filters")]
        public int MinORSizeTicks { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Max OR Size (ticks)", Description = "Maximum opening range size", Order = 3, GroupName = "3. Filters")]
        public int MaxORSizeTicks { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Min Volume Filter", Description = "Minimum volume on breakout bar", Order = 4, GroupName = "3. Filters")]
        public int MinBreakoutVolume { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Risk Per Trade (%)", Description = "Percentage of remaining drawdown to risk", Order = 1, GroupName = "4. Risk Management")]
        public double RiskPercentage { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Stop Loss (ticks)", Description = "Initial stop loss in ticks", Order = 2, GroupName = "4. Risk Management")]
        public int StopLossTicks { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Profit Target 1 (ticks)", Description = "First profit target in ticks", Order = 3, GroupName = "4. Risk Management")]
        public int ProfitTarget1Ticks { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Profit Target 2 (ticks)", Description = "Second profit target in ticks (runner)", Order = 4, GroupName = "4. Risk Management")]
        public int ProfitTarget2Ticks { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Break Even After (ticks)", Description = "Move stop to break even after X ticks profit", Order = 5, GroupName = "4. Risk Management")]
        public int BreakEvenTicks { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Max Trades Per Day", Description = "Maximum number of trades per session", Order = 6, GroupName = "4. Risk Management")]
        public int MaxTradesPerDay { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Daily Profit Target", Description = "Stop trading after reaching this daily profit", Order = 7, GroupName = "4. Risk Management")]
        public double DailyProfitTarget { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Session Start Hour", Description = "Trading session start hour (0-23)", Order = 1, GroupName = "5. Session Times")]
        public int SessionStartHour { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Session Start Minute", Description = "Trading session start minute (0-59)", Order = 2, GroupName = "5. Session Times")]
        public int SessionStartMinute { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Session End Hour", Description = "Trading session end hour (0-23)", Order = 3, GroupName = "5. Session Times")]
        public int SessionEndHour { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Session End Minute", Description = "Trading session end minute (0-59)", Order = 4, GroupName = "5. Session Times")]
        public int SessionEndMinute { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Use ATR Stops", Description = "Use ATR-based dynamic stops instead of fixed", Order = 1, GroupName = "6. Advanced")]
        public bool UseATRStops { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "ATR Period", Description = "ATR period for dynamic stops", Order = 2, GroupName = "6. Advanced")]
        public int ATRPeriod { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "ATR Multiplier", Description = "ATR multiplier for stop distance", Order = 3, GroupName = "6. Advanced")]
        public double ATRMultiplier { get; set; }
        
        #endregion

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Description = @"PropFirmSniper - Designed to pass prop firm evaluations with Opening Range Breakout + VWAP strategy";
                Name = "PropFirmSniper";
                Calculate = Calculate.OnBarClose;
                EntriesPerDirection = 1;
                EntryHandling = EntryHandling.AllEntries;
                IsExitOnSessionCloseStrategy = true;
                ExitOnSessionCloseSeconds = 30;
                IsFillLimitOnTouch = false;
                MaximumBarsLookBack = MaximumBarsLookBack.TwoHundredFiftySix;
                OrderFillResolution = OrderFillResolution.Standard;
                Slippage = 1;
                StartBehavior = StartBehavior.WaitUntilFlat;
                TimeInForce = TimeInForce.Gtc;
                TraceOrders = false;
                RealtimeErrorHandling = RealtimeErrorHandling.StopCancelClose;
                StopTargetHandling = StopTargetHandling.PerEntryExecution;
                BarsRequiredToTrade = 20;
                IsInstantiatedOnEachOptimizationIteration = true;
                
                // Default evaluation settings (Apex 50K example)
                AccountSize = 50000;
                EvalProfitTarget = 3000;
                MaxDrawdown = 2500;
                DailyLossLimit = 0; // Apex doesn't have daily limit
                UseTrailingDrawdown = true;
                
                // Opening Range settings
                ORStartMinutes = 0;
                ORDurationMinutes = 15;
                BreakoutBufferTicks = 2;
                
                // Filters
                UseVWAPFilter = true;
                MinORSizeTicks = 8;
                MaxORSizeTicks = 40;
                MinBreakoutVolume = 500;
                
                // Risk Management
                RiskPercentage = 1.0;
                StopLossTicks = 12;
                ProfitTarget1Ticks = 16;
                ProfitTarget2Ticks = 32;
                BreakEvenTicks = 10;
                MaxTradesPerDay = 3;
                DailyProfitTarget = 500;
                
                // Session times (NY session default)
                SessionStartHour = 9;
                SessionStartMinute = 30;
                SessionEndHour = 15;
                SessionEndMinute = 0;
                
                // Advanced
                UseATRStops = false;
                ATRPeriod = 14;
                ATRMultiplier = 1.5;
            }
            else if (State == State.Configure)
            {
                // Add secondary data series if needed for volume analysis
            }
            else if (State == State.DataLoaded)
            {
                // Initialize ATR
                atr = ATR(ATRPeriod);
                
                // Initialize eval tracking
                evalStartingBalance = AccountSize;
                peakBalance = AccountSize;
            }
        }

        protected override void OnBarUpdate()
        {
            if (CurrentBar < BarsRequiredToTrade)
                return;
            
            // Reset daily tracking on new session
            ResetDailyTracking();
            
            // Update VWAP (data feed agnostic calculation)
            UpdateVWAP();
            
            // Check if trading is allowed
            if (!IsTradingAllowed())
            {
                // Flatten if we have positions and trading is no longer allowed
                if (Position.MarketPosition != MarketPosition.Flat)
                {
                    ExitLong("Session End", "Long");
                    ExitShort("Session End", "Short");
                }
                return;
            }
            
            // Update opening range
            UpdateOpeningRange();
            
            // Manage existing positions
            ManagePosition();
            
            // Look for new entries only if OR is complete and we're flat
            if (orComplete && Position.MarketPosition == MarketPosition.Flat && !breakoutTriggered)
            {
                CheckForBreakout();
            }
        }

        #region VWAP Calculation (Data Feed Agnostic)
        
        private void UpdateVWAP()
        {
            // Reset VWAP at session start
            if (Bars.IsFirstBarOfSession)
            {
                vwapSum = 0;
                volumeSum = 0;
                vwap = 0;
            }
            
            // Calculate typical price
            double typicalPrice = (High[0] + Low[0] + Close[0]) / 3.0;
            
            // Accumulate
            vwapSum += typicalPrice * Volume[0];
            volumeSum += Volume[0];
            
            // Calculate VWAP
            if (volumeSum > 0)
                vwap = vwapSum / volumeSum;
        }
        
        #endregion

        #region Opening Range Logic
        
        private void UpdateOpeningRange()
        {
            DateTime sessionStart = new DateTime(Time[0].Year, Time[0].Month, Time[0].Day, 
                SessionStartHour, SessionStartMinute, 0);
            
            orStartTime = sessionStart.AddMinutes(ORStartMinutes);
            orEndTime = orStartTime.AddMinutes(ORDurationMinutes);
            
            // Reset OR on new session
            if (Bars.IsFirstBarOfSession)
            {
                orHigh = 0;
                orLow = double.MaxValue;
                orComplete = false;
                breakoutTriggered = false;
            }
            
            // Build opening range
            if (Time[0] >= orStartTime && Time[0] < orEndTime)
            {
                if (High[0] > orHigh)
                    orHigh = High[0];
                if (Low[0] < orLow)
                    orLow = Low[0];
            }
            
            // Mark OR as complete
            if (Time[0] >= orEndTime && !orComplete && orHigh > 0 && orLow < double.MaxValue)
            {
                orComplete = true;
                
                // Draw OR on chart
                Draw.Rectangle(this, "OR_" + Time[0].ToShortDateString(), false, 
                    orStartTime, orHigh, orEndTime, orLow, Brushes.Transparent, Brushes.DodgerBlue, 30);
                
                // Log OR details
                Print(string.Format("{0} Opening Range: High={1}, Low={2}, Size={3} ticks", 
                    Time[0].ToShortDateString(), orHigh, orLow, (orHigh - orLow) / TickSize));
            }
        }
        
        #endregion

        #region Entry Logic
        
        private void CheckForBreakout()
        {
            // Validate OR size
            double orSize = (orHigh - orLow) / TickSize;
            if (orSize < MinORSizeTicks || orSize > MaxORSizeTicks)
            {
                Print("OR size outside acceptable range: " + orSize + " ticks");
                return;
            }
            
            // Calculate breakout levels
            double longEntry = orHigh + (BreakoutBufferTicks * TickSize);
            double shortEntry = orLow - (BreakoutBufferTicks * TickSize);
            
            // Volume filter
            if (Volume[0] < MinBreakoutVolume)
                return;
            
            // Long breakout
            if (Close[0] > longEntry)
            {
                // VWAP filter - price should be above VWAP for longs
                if (UseVWAPFilter && Close[0] < vwap)
                {
                    Print("Long breakout rejected - price below VWAP");
                    return;
                }
                
                EnterTrade(1); // Long
            }
            // Short breakout
            else if (Close[0] < shortEntry)
            {
                // VWAP filter - price should be below VWAP for shorts
                if (UseVWAPFilter && Close[0] > vwap)
                {
                    Print("Short breakout rejected - price above VWAP");
                    return;
                }
                
                EnterTrade(-1); // Short
            }
        }
        
        private void EnterTrade(int direction)
        {
            // Calculate position size based on risk
            int quantity = CalculatePositionSize();
            if (quantity <= 0)
            {
                Print("Position size calculation returned 0 - trade skipped");
                return;
            }
            
            // Calculate stop distance
            int stopTicks = UseATRStops ? (int)(atr[0] * ATRMultiplier / TickSize) : StopLossTicks;
            
            // Set stops and targets
            SetStopLoss(CalculationMode.Ticks, stopTicks);
            SetProfitTarget("Target1", CalculationMode.Ticks, ProfitTarget1Ticks);
            
            if (direction == 1)
            {
                EnterLong(quantity, "Long");
                tradeDirection = 1;
            }
            else
            {
                EnterShort(quantity, "Short");
                tradeDirection = -1;
            }
            
            entryPrice = Close[0];
            breakoutTriggered = true;
            sessionTrades++;
            
            Print(string.Format("ENTRY: {0} {1} contracts at {2}, Stop: {3} ticks, Target: {4} ticks",
                direction == 1 ? "LONG" : "SHORT", quantity, Close[0], stopTicks, ProfitTarget1Ticks));
        }
        
        private int CalculatePositionSize()
        {
            // Calculate remaining drawdown buffer
            double remainingDrawdown = MaxDrawdown - currentDrawdown;
            if (remainingDrawdown <= 0)
                return 0;
            
            // Calculate dollar risk
            double dollarRisk = remainingDrawdown * (RiskPercentage / 100.0);
            
            // Calculate ticks to risk
            int stopTicks = UseATRStops ? (int)(atr[0] * ATRMultiplier / TickSize) : StopLossTicks;
            
            // Calculate tick value (works for any instrument)
            double tickValue = Instrument.MasterInstrument.PointValue * TickSize;
            
            // Calculate position size
            double riskPerContract = stopTicks * tickValue;
            int quantity = (int)Math.Floor(dollarRisk / riskPerContract);
            
            // Minimum 1, maximum based on account
            return Math.Max(1, Math.Min(quantity, 10));
        }
        
        #endregion

        #region Position Management
        
        private void ManagePosition()
        {
            if (Position.MarketPosition == MarketPosition.Flat)
                return;
            
            double unrealizedPnL = Position.GetUnrealizedProfitLoss(PerformanceUnit.Currency, Close[0]);
            double ticksInProfit = 0;
            
            if (Position.MarketPosition == MarketPosition.Long)
                ticksInProfit = (Close[0] - Position.AveragePrice) / TickSize;
            else if (Position.MarketPosition == MarketPosition.Short)
                ticksInProfit = (Position.AveragePrice - Close[0]) / TickSize;
            
            // Move to break even
            if (ticksInProfit >= BreakEvenTicks)
            {
                if (Position.MarketPosition == MarketPosition.Long)
                    SetStopLoss(CalculationMode.Price, Position.AveragePrice + TickSize);
                else
                    SetStopLoss(CalculationMode.Price, Position.AveragePrice - TickSize);
            }
            
            // Trail stop after first target
            if (ticksInProfit >= ProfitTarget1Ticks)
            {
                double trailStop = 0;
                if (Position.MarketPosition == MarketPosition.Long)
                    trailStop = Close[0] - (StopLossTicks * TickSize * 0.5);
                else
                    trailStop = Close[0] + (StopLossTicks * TickSize * 0.5);
                
                SetStopLoss(CalculationMode.Price, trailStop);
            }
        }
        
        #endregion

        #region Risk Management
        
        private void ResetDailyTracking()
        {
            if (Time[0].Date != lastResetDate)
            {
                sessionPnL = 0;
                sessionTrades = 0;
                tradingAllowed = true;
                lastResetDate = Time[0].Date;
                breakoutTriggered = false;
                
                Print("=== New Trading Day: " + Time[0].ToShortDateString() + " ===");
            }
        }
        
        private bool IsTradingAllowed()
        {
            // Check time window
            DateTime currentTime = Time[0];
            DateTime sessionStart = new DateTime(currentTime.Year, currentTime.Month, currentTime.Day,
                SessionStartHour, SessionStartMinute, 0);
            DateTime sessionEnd = new DateTime(currentTime.Year, currentTime.Month, currentTime.Day,
                SessionEndHour, SessionEndMinute, 0);
            
            if (currentTime < sessionStart || currentTime >= sessionEnd)
                return false;
            
            // Check max trades per day
            if (sessionTrades >= MaxTradesPerDay)
            {
                if (tradingAllowed)
                    Print("Max trades per day reached: " + MaxTradesPerDay);
                tradingAllowed = false;
                return false;
            }
            
            // Check daily loss limit
            if (DailyLossLimit > 0 && sessionPnL <= -DailyLossLimit)
            {
                if (tradingAllowed)
                    Print("Daily loss limit reached: $" + DailyLossLimit);
                tradingAllowed = false;
                return false;
            }
            
            // Check daily profit target
            if (sessionPnL >= DailyProfitTarget)
            {
                if (tradingAllowed)
                    Print("Daily profit target reached: $" + DailyProfitTarget);
                tradingAllowed = false;
                return false;
            }
            
            // Check evaluation drawdown
            if (currentDrawdown >= MaxDrawdown * 0.9) // 90% of max drawdown - get cautious
            {
                if (tradingAllowed)
                    Print("WARNING: Approaching max drawdown - trading halted");
                tradingAllowed = false;
                return false;
            }
            
            return tradingAllowed;
        }
        
        protected override void OnExecutionUpdate(Execution execution, string executionId, double price, 
            int quantity, MarketPosition marketPosition, string orderId, DateTime time)
        {
            // Update P&L tracking
            if (execution.Order != null && execution.Order.OrderState == OrderState.Filled)
            {
                if (SystemPerformance.AllTrades.Count > 0)
                {
                    Trade lastTrade = SystemPerformance.AllTrades[SystemPerformance.AllTrades.Count - 1];
                    if (lastTrade.Exit.Time.Date == Time[0].Date)
                    {
                        sessionPnL = SystemPerformance.AllTrades
                            .Where(t => t.Exit.Time.Date == Time[0].Date)
                            .Sum(t => t.ProfitCurrency);
                        
                        // Update drawdown tracking
                        double currentBalance = evalStartingBalance + SystemPerformance.AllTrades.Sum(t => t.ProfitCurrency);
                        
                        if (UseTrailingDrawdown && currentBalance > peakBalance)
                            peakBalance = currentBalance;
                        
                        currentDrawdown = peakBalance - currentBalance;
                        
                        Print(string.Format("Trade closed. Session P&L: ${0:F2}, Total P&L: ${1:F2}, Drawdown: ${2:F2}",
                            sessionPnL, currentBalance - evalStartingBalance, currentDrawdown));
                        
                        // Check if evaluation passed
                        if (currentBalance - evalStartingBalance >= EvalProfitTarget)
                        {
                            Print("*** EVALUATION PROFIT TARGET REACHED! ***");
                        }
                    }
                }
            }
        }
        
        #endregion

        #region Chart Display
        
        protected override void OnRender(ChartControl chartControl, ChartScale chartScale)
        {
            base.OnRender(chartControl, chartScale);
            
            // Draw VWAP line
            if (vwap > 0)
            {
                int vwapY = chartScale.GetYByValue(vwap);
                SharpDX.Direct2D1.Brush vwapBrush = Brushes.Orange.ToDxBrush(RenderTarget);
                RenderTarget.DrawLine(
                    new SharpDX.Vector2(ChartPanel.X, vwapY),
                    new SharpDX.Vector2(ChartPanel.X + ChartPanel.W, vwapY),
                    vwapBrush, 2);
                vwapBrush.Dispose();
            }
        }
        
        #endregion
    }
}
