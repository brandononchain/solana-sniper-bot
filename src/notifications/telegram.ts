/**
 * Telegram Bot Notifications
 * 
 * Sends real-time alerts for:
 * - New token snipes
 * - Take profit hits
 * - Stop loss triggers
 * - Daily summaries
 */

import { logger } from '../utils/logger.js';

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  alertOnBuy: boolean;
  alertOnSell: boolean;
  alertOnStopLoss: boolean;
  dailySummary: boolean;
  dailySummaryHour: number; // 0-23 UTC
}

export interface TradeAlert {
  type: 'buy' | 'sell' | 'stop_loss' | 'take_profit';
  token: string;
  symbol: string;
  amount: number;
  price: number;
  pnlPct?: number;
  pnlSol?: number;
  txSignature?: string;
  score?: number;
  reasons?: string[];
}

export class TelegramNotifier {
  private config: TelegramConfig;
  private baseUrl: string;

  constructor(config: TelegramConfig) {
    this.config = config;
    this.baseUrl = `https://api.telegram.org/bot${config.botToken}`;
  }

  /**
   * Send a message to the configured chat
   */
  private async send(text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<boolean> {
    if (!this.config.enabled || !this.config.botToken || !this.config.chatId) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.config.chatId,
          text,
          parse_mode: parseMode,
          disable_web_page_preview: true,
        }),
      });

      const result = await response.json() as any;
      
      if (!result.ok) {
        logger.warn('Telegram send failed', { error: result.description });
        return false;
      }

      return true;
    } catch (err) {
      logger.warn('Telegram send error', { error: String(err) });
      return false;
    }
  }

  /**
   * Send a trade alert
   */
  async sendTradeAlert(alert: TradeAlert): Promise<void> {
    // Check if this alert type is enabled
    if (alert.type === 'buy' && !this.config.alertOnBuy) return;
    if (alert.type === 'sell' && !this.config.alertOnSell) return;
    if (alert.type === 'stop_loss' && !this.config.alertOnStopLoss) return;

    const emoji = {
      buy: '🟢',
      sell: '🔴',
      stop_loss: '🛑',
      take_profit: '💰',
    }[alert.type];

    const action = {
      buy: 'BOUGHT',
      sell: 'SOLD',
      stop_loss: 'STOP LOSS',
      take_profit: 'TAKE PROFIT',
    }[alert.type];

    let message = `${emoji} <b>${action}</b>\n\n`;
    message += `<b>Token:</b> ${alert.symbol} (${alert.token.slice(0, 8)}...)\n`;
    message += `<b>Amount:</b> ${alert.amount.toFixed(4)} SOL\n`;
    message += `<b>Price:</b> ${alert.price.toExponential(4)}\n`;

    if (alert.pnlPct !== undefined) {
      const pnlEmoji = alert.pnlPct >= 0 ? '📈' : '📉';
      message += `${pnlEmoji} <b>P&L:</b> ${alert.pnlPct >= 0 ? '+' : ''}${alert.pnlPct.toFixed(1)}%`;
      if (alert.pnlSol !== undefined) {
        message += ` (${alert.pnlSol >= 0 ? '+' : ''}${alert.pnlSol.toFixed(4)} SOL)`;
      }
      message += '\n';
    }

    if (alert.score !== undefined) {
      message += `<b>AI Score:</b> ${alert.score}/100\n`;
    }

    if (alert.reasons && alert.reasons.length > 0) {
      message += `<b>Reasons:</b> ${alert.reasons.slice(0, 3).join(', ')}\n`;
    }

    if (alert.txSignature) {
      message += `\n<a href="https://solscan.io/tx/${alert.txSignature}">View on Solscan</a>`;
    }

    await this.send(message);
  }

  /**
   * Send new token detected alert (before buy decision)
   */
  async sendNewTokenAlert(token: {
    name: string;
    symbol: string;
    mint: string;
    score: number;
    recommendation: string;
    reasons: string[];
    riskFactors: string[];
  }): Promise<void> {
    const emoji = token.recommendation === 'BUY' ? '🎯' : '👀';
    
    let message = `${emoji} <b>NEW TOKEN</b>\n\n`;
    message += `<b>${token.name}</b> ($${token.symbol})\n`;
    message += `<code>${token.mint}</code>\n\n`;
    message += `<b>Score:</b> ${token.score}/100\n`;
    message += `<b>Action:</b> ${token.recommendation}\n`;

    if (token.reasons.length > 0) {
      message += `\n✅ ${token.reasons.slice(0, 3).join('\n✅ ')}\n`;
    }

    if (token.riskFactors.length > 0) {
      message += `\n⚠️ ${token.riskFactors.slice(0, 3).join('\n⚠️ ')}\n`;
    }

    message += `\n<a href="https://pump.fun/${token.mint}">View on Pump.fun</a>`;

    await this.send(message);
  }

  /**
   * Send daily summary
   */
  async sendDailySummary(stats: {
    date: string;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    totalVolumeSol: number;
    realizedPnlSol: number;
    tokensSniped: number;
    rugsAvoided: number;
    openPositions: number;
    portfolioValue: number;
  }): Promise<void> {
    if (!this.config.dailySummary) return;

    const winRate = stats.totalTrades > 0 
      ? ((stats.winningTrades / stats.totalTrades) * 100).toFixed(1)
      : '0';

    const pnlEmoji = stats.realizedPnlSol >= 0 ? '📈' : '📉';

    let message = `📊 <b>DAILY SUMMARY</b> - ${stats.date}\n\n`;
    
    message += `${pnlEmoji} <b>P&L:</b> ${stats.realizedPnlSol >= 0 ? '+' : ''}${stats.realizedPnlSol.toFixed(4)} SOL\n`;
    message += `📊 <b>Win Rate:</b> ${winRate}%\n`;
    message += `🔄 <b>Trades:</b> ${stats.totalTrades} (${stats.winningTrades}W / ${stats.losingTrades}L)\n`;
    message += `💰 <b>Volume:</b> ${stats.totalVolumeSol.toFixed(2)} SOL\n\n`;
    
    message += `🎯 <b>Tokens Sniped:</b> ${stats.tokensSniped}\n`;
    message += `🛡️ <b>Rugs Avoided:</b> ${stats.rugsAvoided}\n`;
    message += `📂 <b>Open Positions:</b> ${stats.openPositions}\n`;
    message += `💼 <b>Portfolio Value:</b> ${stats.portfolioValue.toFixed(4)} SOL`;

    await this.send(message);
  }

  /**
   * Send error/warning alert
   */
  async sendAlert(level: 'info' | 'warning' | 'error', message: string): Promise<void> {
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
    }[level];

    await this.send(`${emoji} <b>${level.toUpperCase()}</b>\n\n${message}`);
  }

  /**
   * Send position update
   */
  async sendPositionUpdate(position: {
    token: string;
    symbol: string;
    pnlPct: number;
    pnlSol: number;
    action: string;
    currentPrice: number;
    entryPrice: number;
  }): Promise<void> {
    const emoji = position.pnlPct >= 0 ? '📈' : '📉';
    
    let message = `${emoji} <b>POSITION UPDATE</b>\n\n`;
    message += `<b>Token:</b> $${position.symbol}\n`;
    message += `<b>Entry:</b> ${position.entryPrice.toExponential(4)}\n`;
    message += `<b>Current:</b> ${position.currentPrice.toExponential(4)}\n`;
    message += `<b>P&L:</b> ${position.pnlPct >= 0 ? '+' : ''}${position.pnlPct.toFixed(1)}% (${position.pnlSol >= 0 ? '+' : ''}${position.pnlSol.toFixed(4)} SOL)\n`;
    message += `<b>Action:</b> ${position.action}`;

    await this.send(message);
  }

  /**
   * Test the connection
   */
  async test(): Promise<boolean> {
    return this.send('🤖 <b>Solana Sniper Bot</b> connected successfully!');
  }
}
