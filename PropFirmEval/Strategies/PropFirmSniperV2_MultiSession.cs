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
    /// PropFirmSniper V2 - Multi-Session Edition
    /// Adds: Multiple session support, momentum filter, improved entries
    /// </summary>
    public class PropFirmSniperV2 : Strategy
    {
        #region Variables
        
        // Opening Range per session
        private Dictionary<string, double> sessionORHigh = new Dictionary<string, double>();
        private Dictionary<string, double> sessionORLow = new Dictionary<string, double>();
        private Dictionary<string, bool> sessionORComplete = new Dictionary<string, bool>();
        private Dictionary<string, bool> sessionBreakoutTriggered = new Dictionary<string, bool>();
        
        // VWAP
        private double vwapSum = 0;
        private double volumeSum = 0;
        private double vwap = 0;
        
        // Momentum indicators
        private EMA fastEMA;
        private EMA slowEMA;
        private RSI rsi;
        private ADX adx;
        
        // Session tracking
        private double sessionPnL = 0;
        private int sessionTrades = 0;
        private bool tradingAllowed = true;
        private DateTime lastResetDate = DateTime.MinValue;
        
        // Eval tracking
        private double evalStartingBalance = 0;
        private double peakBalance = 0;
        private double currentDrawdown = 0;
        
        // Current session
        private string currentSession = "";
        
        #endregion

        #region Properties
        
        // ========== EVALUATION SETTINGS ==========
        [NinjaScriptProperty]
        [Display(Name = "Account Size", Order = 1, GroupName = "1. Evaluation")]
        public double AccountSize { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Profit Target", Order = 2, GroupName = "1. Evaluation")]
        public double EvalProfitTarget { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Max Drawdown", Order = 3, GroupName = "1. Evaluation")]
        public double MaxDrawdown { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Daily Loss Limit", Order = 4, GroupName = "1. Evaluation")]
        public double DailyLossLimit { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Trailing Drawdown", Order = 5, GroupName = "1. Evaluation")]
        public bool UseTrailingDrawdown { get; set; }
        
        // ========== SESSION 1: NY OPEN ==========
        [NinjaScriptProperty]
        [Display(Name = "Enable NY Session", Order = 1, GroupName = "2. NY Session (Primary)")]
        public bool EnableNYSession { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "NY Start Hour", Order = 2, GroupName = "2. NY Session (Primary)")]
        public int NYStartHour { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "NY Start Minute", Order = 3, GroupName = "2. NY Session (Primary)")]
        public int NYStartMinute { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "NY End Hour", Order = 4, GroupName = "2. NY Session (Primary)")]
        public int NYEndHour { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "NY OR Duration (min)", Order = 5, GroupName = "2. NY Session (Primary)")]
        public int NYORDuration { get; set; }
        
        // ========== SESSION 2: LONDON ==========
        [NinjaScriptProperty]
        [Display(Name = "Enable London Session", Order = 1, GroupName = "3. London Session")]
        public bool EnableLondonSession { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "London Start Hour", Order = 2, GroupName = "3. London Session")]
        public int LondonStartHour { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "London Start Minute", Order = 3, GroupName = "3. London Session")]
        public int LondonStartMinute { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "London End Hour", Order = 4, GroupName = "3. London Session")]
        public int LondonEndHour { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "London OR Duration (min)", Order = 5, GroupName = "3. London Session")]
        public int LondonORDuration { get; set; }
        
        // ========== SESSION 3: ASIA (optional) ==========
        [NinjaScriptProperty]
        [Display(Name = "Enable Asia Session", Order = 1, GroupName = "4. Asia Session")]
        public bool EnableAsiaSession { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Asia Start Hour", Order = 2, GroupName = "4. Asia Session")]
        public int AsiaStartHour { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Asia Start Minute", Order = 3, GroupName = "4. Asia Session")]
        public int AsiaStartMinute { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Asia End Hour", Order = 4, GroupName = "4. Asia Session")]
        public int AsiaEndHour { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Asia OR Duration (min)", Order = 5, GroupName = "4. Asia Session")]
        public int AsiaORDuration { get; set; }
        
        // ========== ENTRY FILTERS ==========
        [NinjaScriptProperty]
        [Display(Name = "Use VWAP Filter", Order = 1, GroupName = "5. Entry Filters")]
        public bool UseVWAPFilter { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Use EMA Filter", Order = 2, GroupName = "5. Entry Filters")]
        public bool UseEMAFilter { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Fast EMA Period", Order = 3, GroupName = "5. Entry Filters")]
        public int FastEMAPeriod { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Slow EMA Period", Order = 4, GroupName = "5. Entry Filters")]
        public int SlowEMAPeriod { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Use RSI Filter", Order = 5, GroupName = "5. Entry Filters")]
        public bool UseRSIFilter { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "RSI Period", Order = 6, GroupName = "5. Entry Filters")]
        public int RSIPeriod { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "RSI Overbought", Order = 7, GroupName = "5. Entry Filters")]
        public int RSIOverbought { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "RSI Oversold", Order = 8, GroupName = "5. Entry Filters")]
        public int RSIOversold { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Use ADX Filter", Order = 9, GroupName = "5. Entry Filters")]
        public bool UseADXFilter { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "ADX Period", Order = 10, GroupName = "5. Entry Filters")]
        public int ADXPeriod { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Min ADX Value", Order = 11, GroupName = "5. Entry Filters")]
        public double MinADXValue { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Breakout Buffer (ticks)", Order = 12, GroupName = "5. Entry Filters")]
        public int BreakoutBufferTicks { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Min OR Size (ticks)", Order = 13, GroupName = "5. Entry Filters")]
        public int MinORSizeTicks { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Max OR Size (ticks)", Order = 14, GroupName = "5. Entry Filters")]
        public int MaxORSizeTicks { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Min Volume", Order = 15, GroupName = "5. Entry Filters")]
        public int MinBreakoutVolume { get; set; }
        
        // ========== RISK MANAGEMENT ==========
        [NinjaScriptProperty]
        [Display(Name = "Risk Per Trade (%)", Order = 1, GroupName = "6. Risk Management")]
        public double RiskPercentage { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Stop Loss (ticks)", Order = 2, GroupName = "6. Risk Management")]
        public int StopLossTicks { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Target 1 (ticks)", Order = 3, GroupName = "6. Risk Management")]
        public int ProfitTarget1Ticks { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Target 2 (ticks)", Order = 4, GroupName = "6. Risk Management")]
        public int ProfitTarget2Ticks { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Break Even (ticks)", Order = 5, GroupName = "6. Risk Management")]
        public int BreakEvenTicks { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Trail Stop (ticks)", Order = 6, GroupName = "6. Risk Management")]
        public int TrailStopTicks { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Max Trades/Day", Order = 7, GroupName = "6. Risk Management")]
        public int MaxTradesPerDay { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Daily Profit Target", Order = 8, GroupName = "6. Risk Management")]
        public double DailyProfitTarget { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Scale Out %", Order = 9, GroupName = "6. Risk Management")]
        public int ScaleOutPercent { get; set; }
        
        #endregion

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Description = @"PropFirmSniper V2 - Multi-Session ORB Strategy";
                Name = "PropFirmSniperV2";
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
                BarsRequiredToTrade = 50;
                
                // Evaluation defaults (Apex 50K)
                AccountSize = 50000;
                EvalProfitTarget = 3000;
                MaxDrawdown = 2500;
                DailyLossLimit = 0;
                UseTrailingDrawdown = true;
                
                // NY Session (primary)
                EnableNYSession = true;
                NYStartHour = 9;
                NYStartMinute = 30;
                NYEndHour = 11;
                NYORDuration = 15;
                
                // London Session
                EnableLondonSession = false;
                LondonStartHour = 3;
                LondonStartMinute = 0;
                LondonEndHour = 5;
                LondonORDuration = 15;
                
                // Asia Session
                EnableAsiaSession = false;
                AsiaStartHour = 20;
                AsiaStartMinute = 0;
                AsiaEndHour = 22;
                AsiaORDuration = 30;
                
                // Entry Filters
                UseVWAPFilter = true;
                UseEMAFilter = true;
                FastEMAPeriod = 9;
                SlowEMAPeriod = 21;
                UseRSIFilter = false;
                RSIPeriod = 14;
                RSIOverbought = 70;
                RSIOversold = 30;
                UseADXFilter = true;
                ADXPeriod = 14;
                MinADXValue = 20;
                BreakoutBufferTicks = 2;
                MinORSizeTicks = 8;
                MaxORSizeTicks = 40;
                MinBreakoutVolume = 500;
                
                // Risk Management
                RiskPercentage = 1.0;
                StopLossTicks = 12;
                ProfitTarget1Ticks = 16;
                ProfitTarget2Ticks = 32;
                BreakEvenTicks = 10;
                TrailStopTicks = 8;
                MaxTradesPerDay = 3;
                DailyProfitTarget = 500;
                ScaleOutPercent = 50;
            }
            else if (State == State.Configure)
            {
                // Initialize session dictionaries
                sessionORHigh["NY"] = 0;
                sessionORHigh["London"] = 0;
                sessionORHigh["Asia"] = 0;
                
                sessionORLow["NY"] = double.MaxValue;
                sessionORLow["London"] = double.MaxValue;
                sessionORLow["Asia"] = double.MaxValue;
                
                sessionORComplete["NY"] = false;
                sessionORComplete["London"] = false;
                sessionORComplete["Asia"] = false;
                
                sessionBreakoutTriggered["NY"] = false;
                sessionBreakoutTriggered["London"] = false;
                sessionBreakoutTriggered["Asia"] = false;
            }
            else if (State == State.DataLoaded)
            {
                // Initialize indicators
                fastEMA = EMA(FastEMAPeriod);
                slowEMA = EMA(SlowEMAPeriod);
                rsi = RSI(RSIPeriod, 3);
                adx = ADX(ADXPeriod);
                
                // Initialize eval tracking
                evalStartingBalance = AccountSize;
                peakBalance = AccountSize;
                
                // Add plots for indicators
                AddChartIndicator(fastEMA);
                AddChartIndicator(slowEMA);
            }
        }

        protected override void OnBarUpdate()
        {
            if (CurrentBar < BarsRequiredToTrade)
                return;
            
            // Reset daily tracking
            ResetDailyTracking();
            
            // Update VWAP
            UpdateVWAP();
            
            // Determine current session
            currentSession = GetCurrentSession();
            
            // Update OR for active sessions
            if (EnableNYSession) UpdateSessionOR("NY", NYStartHour, NYStartMinute, NYEndHour, NYORDuration);
            if (EnableLondonSession) UpdateSessionOR("London", LondonStartHour, LondonStartMinute, LondonEndHour, LondonORDuration);
            if (EnableAsiaSession) UpdateSessionOR("Asia", AsiaStartHour, AsiaStartMinute, AsiaEndHour, AsiaORDuration);
            
            // Manage existing positions
            if (Position.MarketPosition != MarketPosition.Flat)
            {
                ManagePosition();
                return;
            }
            
            // Check for trade entries
            if (!string.IsNullOrEmpty(currentSession) && IsTradingAllowed())
            {
                CheckForBreakout(currentSession);
            }
        }

        #region Session Management
        
        private string GetCurrentSession()
        {
            DateTime now = Time[0];
            
            // Check NY Session
            if (EnableNYSession && IsWithinSession(now, NYStartHour, NYStartMinute, NYEndHour, 0))
                return "NY";
            
            // Check London Session
            if (EnableLondonSession && IsWithinSession(now, LondonStartHour, LondonStartMinute, LondonEndHour, 0))
                return "London";
            
            // Check Asia Session
            if (EnableAsiaSession && IsWithinSession(now, AsiaStartHour, AsiaStartMinute, AsiaEndHour, 0))
                return "Asia";
            
            return "";
        }
        
        private bool IsWithinSession(DateTime time, int startHour, int startMin, int endHour, int endMin)
        {
            TimeSpan currentTime = time.TimeOfDay;
            TimeSpan startTime = new TimeSpan(startHour, startMin, 0);
            TimeSpan endTime = new TimeSpan(endHour, endMin, 0);
            
            if (startTime < endTime)
                return currentTime >= startTime && currentTime < endTime;
            else // Overnight session
                return currentTime >= startTime || currentTime < endTime;
        }
        
        private void UpdateSessionOR(string session, int startHour, int startMin, int endHour, int orDuration)
        {
            DateTime now = Time[0];
            DateTime orStart = new DateTime(now.Year, now.Month, now.Day, startHour, startMin, 0);
            DateTime orEnd = orStart.AddMinutes(orDuration);
            
            // Reset on new day or session restart
            if (Bars.IsFirstBarOfSession)
            {
                sessionORHigh[session] = 0;
                sessionORLow[session] = double.MaxValue;
                sessionORComplete[session] = false;
                sessionBreakoutTriggered[session] = false;
            }
            
            // Build OR
            if (now >= orStart && now < orEnd)
            {
                if (High[0] > sessionORHigh[session])
                    sessionORHigh[session] = High[0];
                if (Low[0] < sessionORLow[session])
                    sessionORLow[session] = Low[0];
            }
            
            // Mark complete
            if (now >= orEnd && !sessionORComplete[session] && sessionORHigh[session] > 0)
            {
                sessionORComplete[session] = true;
                
                Draw.Rectangle(this, session + "_OR_" + now.ToShortDateString(), false,
                    orStart, sessionORHigh[session], orEnd, sessionORLow[session],
                    Brushes.Transparent, GetSessionColor(session), 25);
                
                Print($"[{session}] OR Complete: High={sessionORHigh[session]}, Low={sessionORLow[session]}");
            }
        }
        
        private Brush GetSessionColor(string session)
        {
            switch (session)
            {
                case "NY": return Brushes.DodgerBlue;
                case "London": return Brushes.Orange;
                case "Asia": return Brushes.Purple;
                default: return Brushes.Gray;
            }
        }
        
        #endregion

        #region VWAP
        
        private void UpdateVWAP()
        {
            if (Bars.IsFirstBarOfSession)
            {
                vwapSum = 0;
                volumeSum = 0;
            }
            
            double tp = (High[0] + Low[0] + Close[0]) / 3.0;
            vwapSum += tp * Volume[0];
            volumeSum += Volume[0];
            
            if (volumeSum > 0)
                vwap = vwapSum / volumeSum;
        }
        
        #endregion

        #region Entry Logic
        
        private void CheckForBreakout(string session)
        {
            if (!sessionORComplete[session] || sessionBreakoutTriggered[session])
                return;
            
            double orHigh = sessionORHigh[session];
            double orLow = sessionORLow[session];
            
            // Validate OR size
            double orSize = (orHigh - orLow) / TickSize;
            if (orSize < MinORSizeTicks || orSize > MaxORSizeTicks)
                return;
            
            // Volume check
            if (Volume[0] < MinBreakoutVolume)
                return;
            
            double longEntry = orHigh + (BreakoutBufferTicks * TickSize);
            double shortEntry = orLow - (BreakoutBufferTicks * TickSize);
            
            // Long breakout
            if (Close[0] > longEntry && PassesLongFilters())
            {
                EnterTrade(1, session);
            }
            // Short breakout
            else if (Close[0] < shortEntry && PassesShortFilters())
            {
                EnterTrade(-1, session);
            }
        }
        
        private bool PassesLongFilters()
        {
            // VWAP filter
            if (UseVWAPFilter && Close[0] < vwap)
                return false;
            
            // EMA filter - price above fast EMA, fast above slow
            if (UseEMAFilter && (Close[0] < fastEMA[0] || fastEMA[0] < slowEMA[0]))
                return false;
            
            // RSI filter - not overbought
            if (UseRSIFilter && rsi[0] > RSIOverbought)
                return false;
            
            // ADX filter - trending
            if (UseADXFilter && adx[0] < MinADXValue)
                return false;
            
            return true;
        }
        
        private bool PassesShortFilters()
        {
            // VWAP filter
            if (UseVWAPFilter && Close[0] > vwap)
                return false;
            
            // EMA filter
            if (UseEMAFilter && (Close[0] > fastEMA[0] || fastEMA[0] > slowEMA[0]))
                return false;
            
            // RSI filter - not oversold
            if (UseRSIFilter && rsi[0] < RSIOversold)
                return false;
            
            // ADX filter
            if (UseADXFilter && adx[0] < MinADXValue)
                return false;
            
            return true;
        }
        
        private void EnterTrade(int direction, string session)
        {
            int qty = CalculatePositionSize();
            if (qty <= 0) return;
            
            // Calculate scale out quantities
            int qty1 = (int)Math.Ceiling(qty * (ScaleOutPercent / 100.0));
            int qty2 = qty - qty1;
            
            SetStopLoss(CalculationMode.Ticks, StopLossTicks);
            
            if (direction == 1)
            {
                if (qty2 > 0)
                {
                    SetProfitTarget("LongT1", CalculationMode.Ticks, ProfitTarget1Ticks);
                    SetProfitTarget("LongT2", CalculationMode.Ticks, ProfitTarget2Ticks);
                    EnterLong(qty1, "LongT1");
                    EnterLong(qty2, "LongT2");
                }
                else
                {
                    SetProfitTarget(CalculationMode.Ticks, ProfitTarget1Ticks);
                    EnterLong(qty, "Long");
                }
            }
            else
            {
                if (qty2 > 0)
                {
                    SetProfitTarget("ShortT1", CalculationMode.Ticks, ProfitTarget1Ticks);
                    SetProfitTarget("ShortT2", CalculationMode.Ticks, ProfitTarget2Ticks);
                    EnterShort(qty1, "ShortT1");
                    EnterShort(qty2, "ShortT2");
                }
                else
                {
                    SetProfitTarget(CalculationMode.Ticks, ProfitTarget1Ticks);
                    EnterShort(qty, "Short");
                }
            }
            
            sessionBreakoutTriggered[session] = true;
            sessionTrades++;
            
            Print($"[{session}] ENTRY: {(direction == 1 ? "LONG" : "SHORT")} {qty} @ {Close[0]}");
        }
        
        private int CalculatePositionSize()
        {
            double remainingDD = MaxDrawdown - currentDrawdown;
            if (remainingDD <= 0) return 0;
            
            double dollarRisk = remainingDD * (RiskPercentage / 100.0);
            double tickValue = Instrument.MasterInstrument.PointValue * TickSize;
            double riskPerContract = StopLossTicks * tickValue;
            
            return Math.Max(1, Math.Min((int)(dollarRisk / riskPerContract), 10));
        }
        
        #endregion

        #region Position Management
        
        private void ManagePosition()
        {
            double ticksProfit = 0;
            
            if (Position.MarketPosition == MarketPosition.Long)
                ticksProfit = (Close[0] - Position.AveragePrice) / TickSize;
            else if (Position.MarketPosition == MarketPosition.Short)
                ticksProfit = (Position.AveragePrice - Close[0]) / TickSize;
            
            // Break even
            if (ticksProfit >= BreakEvenTicks)
            {
                double bePrice = Position.AveragePrice + (Position.MarketPosition == MarketPosition.Long ? TickSize : -TickSize);
                SetStopLoss(CalculationMode.Price, bePrice);
            }
            
            // Trailing stop after first target
            if (ticksProfit >= ProfitTarget1Ticks)
            {
                double trailPrice = Position.MarketPosition == MarketPosition.Long
                    ? Close[0] - (TrailStopTicks * TickSize)
                    : Close[0] + (TrailStopTicks * TickSize);
                SetStopLoss(CalculationMode.Price, trailPrice);
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
                
                // Reset all session breakout flags
                foreach (var key in sessionBreakoutTriggered.Keys.ToList())
                    sessionBreakoutTriggered[key] = false;
            }
        }
        
        private bool IsTradingAllowed()
        {
            if (sessionTrades >= MaxTradesPerDay)
            {
                tradingAllowed = false;
                return false;
            }
            
            if (DailyLossLimit > 0 && sessionPnL <= -DailyLossLimit)
            {
                tradingAllowed = false;
                return false;
            }
            
            if (sessionPnL >= DailyProfitTarget)
            {
                tradingAllowed = false;
                return false;
            }
            
            if (currentDrawdown >= MaxDrawdown * 0.85)
            {
                tradingAllowed = false;
                return false;
            }
            
            return tradingAllowed;
        }
        
        protected override void OnExecutionUpdate(Execution execution, string executionId, double price,
            int quantity, MarketPosition marketPosition, string orderId, DateTime time)
        {
            if (execution.Order?.OrderState == OrderState.Filled && SystemPerformance.AllTrades.Count > 0)
            {
                var todayTrades = SystemPerformance.AllTrades.Where(t => t.Exit.Time.Date == Time[0].Date);
                sessionPnL = todayTrades.Sum(t => t.ProfitCurrency);
                
                double totalPnL = SystemPerformance.AllTrades.Sum(t => t.ProfitCurrency);
                double currentBalance = evalStartingBalance + totalPnL;
                
                if (UseTrailingDrawdown && currentBalance > peakBalance)
                    peakBalance = currentBalance;
                
                currentDrawdown = peakBalance - currentBalance;
                
                Print($"Trade closed. Session: ${sessionPnL:F2}, Total: ${totalPnL:F2}, DD: ${currentDrawdown:F2}");
            }
        }
        
        #endregion
    }
}
