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
using NinjaTrader.NinjaScript.DrawingTools;
#endregion

namespace NinjaTrader.NinjaScript.Indicators
{
    /// <summary>
    /// EvalTracker - Visual overlay showing evaluation progress, drawdown status, and trade stats
    /// Displays key metrics in real-time on your chart
    /// </summary>
    public class EvalTracker : Indicator
    {
        #region Variables
        
        private double startingBalance;
        private double currentPnL;
        private double peakBalance;
        private double currentDrawdown;
        private double dailyPnL;
        private int totalTrades;
        private int winningTrades;
        private DateTime lastResetDate = DateTime.MinValue;
        
        // Colors
        private Brush positiveColor;
        private Brush negativeColor;
        private Brush warningColor;
        private Brush neutralColor;
        
        #endregion

        #region Properties
        
        [NinjaScriptProperty]
        [Display(Name = "Account Size", Order = 1, GroupName = "Evaluation Settings")]
        public double AccountSize { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Profit Target", Order = 2, GroupName = "Evaluation Settings")]
        public double ProfitTarget { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Max Drawdown", Order = 3, GroupName = "Evaluation Settings")]
        public double MaxDrawdown { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Daily Loss Limit", Order = 4, GroupName = "Evaluation Settings")]
        public double DailyLossLimit { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Trailing Drawdown", Order = 5, GroupName = "Evaluation Settings")]
        public bool TrailingDrawdown { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Show Panel", Order = 1, GroupName = "Display")]
        public bool ShowPanel { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Panel Location", Order = 2, GroupName = "Display")]
        public TextPosition PanelLocation { get; set; }
        
        [NinjaScriptProperty]
        [Display(Name = "Font Size", Order = 3, GroupName = "Display")]
        public int FontSize { get; set; }
        
        #endregion

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Description = @"Displays evaluation progress and risk metrics on chart";
                Name = "EvalTracker";
                Calculate = Calculate.OnBarClose;
                IsOverlay = true;
                DisplayInDataBox = false;
                DrawOnPricePanel = true;
                IsSuspendedWhileInactive = true;
                
                // Defaults for Apex 50K
                AccountSize = 50000;
                ProfitTarget = 3000;
                MaxDrawdown = 2500;
                DailyLossLimit = 0;
                TrailingDrawdown = true;
                
                // Display
                ShowPanel = true;
                PanelLocation = TextPosition.TopRight;
                FontSize = 12;
            }
            else if (State == State.Configure)
            {
                startingBalance = AccountSize;
                peakBalance = AccountSize;
            }
            else if (State == State.DataLoaded)
            {
                positiveColor = Brushes.LimeGreen;
                negativeColor = Brushes.Red;
                warningColor = Brushes.Orange;
                neutralColor = Brushes.White;
            }
        }

        protected override void OnBarUpdate()
        {
            if (CurrentBar < 1)
                return;
            
            // Reset daily tracking
            if (Time[0].Date != lastResetDate)
            {
                dailyPnL = 0;
                lastResetDate = Time[0].Date;
            }
            
            // Get account performance from NinjaTrader
            if (Account != null)
            {
                currentPnL = Account.Get(AccountItem.RealizedProfitLoss, Currency.UsDollar);
                
                double currentBalance = startingBalance + currentPnL;
                
                // Update peak balance for trailing drawdown
                if (TrailingDrawdown && currentBalance > peakBalance)
                    peakBalance = currentBalance;
                
                // Calculate drawdown
                if (TrailingDrawdown)
                    currentDrawdown = peakBalance - currentBalance;
                else
                    currentDrawdown = startingBalance - currentBalance;
                
                // Ensure drawdown is not negative
                currentDrawdown = Math.Max(0, currentDrawdown);
            }
        }

        protected override void OnRender(ChartControl chartControl, ChartScale chartScale)
        {
            base.OnRender(chartControl, chartScale);
            
            if (!ShowPanel)
                return;
            
            // Build status text
            StringBuilder sb = new StringBuilder();
            
            // Header
            sb.AppendLine("═══ EVAL TRACKER ═══");
            sb.AppendLine();
            
            // Progress
            double progress = (currentPnL / ProfitTarget) * 100;
            sb.AppendLine($"📊 Progress: {progress:F1}%");
            sb.AppendLine($"   P&L: ${currentPnL:F2} / ${ProfitTarget:F2}");
            sb.AppendLine();
            
            // Drawdown
            double ddPercent = (currentDrawdown / MaxDrawdown) * 100;
            string ddStatus = ddPercent < 50 ? "✅" : ddPercent < 75 ? "⚠️" : "🚨";
            sb.AppendLine($"{ddStatus} Drawdown: ${currentDrawdown:F2}");
            sb.AppendLine($"   Remaining: ${MaxDrawdown - currentDrawdown:F2} ({100 - ddPercent:F1}%)");
            sb.AppendLine();
            
            // Daily (if applicable)
            if (DailyLossLimit > 0)
            {
                double dailyUsed = Math.Max(0, -dailyPnL);
                double dailyRemaining = DailyLossLimit - dailyUsed;
                sb.AppendLine($"📅 Daily Loss: ${dailyUsed:F2} / ${DailyLossLimit:F2}");
                sb.AppendLine($"   Remaining: ${dailyRemaining:F2}");
                sb.AppendLine();
            }
            
            // Risk status
            string riskLevel;
            if (ddPercent < 50)
                riskLevel = "🟢 NORMAL";
            else if (ddPercent < 70)
                riskLevel = "🟡 CAUTION";
            else if (ddPercent < 85)
                riskLevel = "🟠 WARNING";
            else
                riskLevel = "🔴 DANGER";
            
            sb.AppendLine($"Risk Level: {riskLevel}");
            
            // Draw the panel
            DrawTextPanel(sb.ToString(), chartControl);
        }
        
        private void DrawTextPanel(string text, ChartControl chartControl)
        {
            // Calculate position
            float x, y;
            float padding = 10;
            
            switch (PanelLocation)
            {
                case TextPosition.TopRight:
                    x = ChartPanel.W - 200;
                    y = padding;
                    break;
                case TextPosition.TopLeft:
                    x = padding;
                    y = padding;
                    break;
                case TextPosition.BottomRight:
                    x = ChartPanel.W - 200;
                    y = ChartPanel.H - 200;
                    break;
                case TextPosition.BottomLeft:
                    x = padding;
                    y = ChartPanel.H - 200;
                    break;
                default:
                    x = ChartPanel.W - 200;
                    y = padding;
                    break;
            }
            
            // Create text format
            SharpDX.DirectWrite.TextFormat textFormat = new SharpDX.DirectWrite.TextFormat(
                Core.Globals.DirectWriteFactory,
                "Consolas",
                SharpDX.DirectWrite.FontWeight.Normal,
                SharpDX.DirectWrite.FontStyle.Normal,
                FontSize);
            
            // Create brushes
            SharpDX.Direct2D1.SolidColorBrush bgBrush = new SharpDX.Direct2D1.SolidColorBrush(
                RenderTarget, new SharpDX.Color(20, 20, 30, 220));
            SharpDX.Direct2D1.SolidColorBrush borderBrush = new SharpDX.Direct2D1.SolidColorBrush(
                RenderTarget, new SharpDX.Color(100, 100, 120, 255));
            SharpDX.Direct2D1.SolidColorBrush textBrush = new SharpDX.Direct2D1.SolidColorBrush(
                RenderTarget, SharpDX.Color.White);
            
            // Draw background
            SharpDX.RectangleF rect = new SharpDX.RectangleF(x, y, 190, 180);
            RenderTarget.FillRectangle(rect, bgBrush);
            RenderTarget.DrawRectangle(rect, borderBrush, 1);
            
            // Draw text
            RenderTarget.DrawText(text, textFormat, 
                new SharpDX.RectangleF(x + 5, y + 5, 180, 170), textBrush);
            
            // Dispose
            textFormat.Dispose();
            bgBrush.Dispose();
            borderBrush.Dispose();
            textBrush.Dispose();
        }
    }
}
