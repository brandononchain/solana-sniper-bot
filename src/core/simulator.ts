/**
 * Paper Trading Simulator
 * 
 * Test strategies without risking real SOL.
 * Simulates trades using real price data.
 */

import { nanoid } from 'nanoid';
import { logger } from '../utils/logger.js';
import type { Database } from 'better-sqlite3';

export interface SimulatedPosition {
  id: string;
  tokenMint: string;
  tokenSymbol: string;
  entryPrice: number;
  currentPrice: number;
  highestPrice: number;
  amount: number;
  costBasis: number;
  openedAt: number;
}

export interface SimulatedTrade {
  id: string;
  tokenMint: string;
  tokenSymbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: number;
  pnl?: number;
}

export interface SimulatorStats {
  startingBalance: number;
  currentBalance: number;
  totalPnl: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  openPositions: number;
}

export class PaperTrader {
  private balance: number;
  private startingBalance: number;
  private positions: Map<string, SimulatedPosition> = new Map();
  private trades: SimulatedTrade[] = [];
  private db?: Database;

  constructor(startingBalanceSol: number = 1.0, db?: Database) {
    this.startingBalance = startingBalanceSol;
    this.balance = startingBalanceSol;
    this.db = db;
    
    logger.info(`📝 Paper trading mode initialized with ${startingBalanceSol} SOL`);
  }

  /**
   * Simulate a buy
   */
  buy(
    tokenMint: string,
    tokenSymbol: string,
    amountSol: number,
    price: number
  ): { success: boolean; error?: string; tokensReceived?: number } {
    // Check balance
    if (amountSol > this.balance) {
      return { success: false, error: 'Insufficient balance' };
    }

    // Calculate tokens received (simple calculation)
    const tokensReceived = amountSol / price;

    // Deduct from balance
    this.balance -= amountSol;

    // Create or update position
    const existing = this.positions.get(tokenMint);
    if (existing) {
      // Average in
      const totalCost = existing.costBasis + amountSol;
      const totalAmount = existing.amount + tokensReceived;
      existing.entryPrice = totalCost / totalAmount;
      existing.amount = totalAmount;
      existing.costBasis = totalCost;
      existing.currentPrice = price;
    } else {
      this.positions.set(tokenMint, {
        id: nanoid(),
        tokenMint,
        tokenSymbol,
        entryPrice: price,
        currentPrice: price,
        highestPrice: price,
        amount: tokensReceived,
        costBasis: amountSol,
        openedAt: Date.now(),
      });
    }

    // Record trade
    this.trades.push({
      id: nanoid(),
      tokenMint,
      tokenSymbol,
      side: 'buy',
      amount: amountSol,
      price,
      timestamp: Date.now(),
    });

    logger.info(`📝 [SIM] Bought ${tokenSymbol}: ${amountSol.toFixed(4)} SOL @ ${price.toExponential(4)}`);

    return { success: true, tokensReceived };
  }

  /**
   * Simulate a sell
   */
  sell(
    tokenMint: string,
    percentage: number = 100
  ): { success: boolean; error?: string; solReceived?: number; pnl?: number; pnlPct?: number } {
    const position = this.positions.get(tokenMint);
    if (!position) {
      return { success: false, error: 'No position found' };
    }

    const sellAmount = position.amount * (percentage / 100);
    const solReceived = sellAmount * position.currentPrice;
    const costBasisSold = position.costBasis * (percentage / 100);
    const pnl = solReceived - costBasisSold;
    const pnlPct = (pnl / costBasisSold) * 100;

    // Update balance
    this.balance += solReceived;

    // Update or close position
    if (percentage >= 100) {
      this.positions.delete(tokenMint);
    } else {
      position.amount -= sellAmount;
      position.costBasis -= costBasisSold;
    }

    // Record trade
    this.trades.push({
      id: nanoid(),
      tokenMint,
      tokenSymbol: position.tokenSymbol,
      side: 'sell',
      amount: solReceived,
      price: position.currentPrice,
      timestamp: Date.now(),
      pnl,
    });

    const pnlStr = pnl >= 0 ? `+${pnl.toFixed(4)}` : pnl.toFixed(4);
    logger.info(`📝 [SIM] Sold ${position.tokenSymbol}: ${solReceived.toFixed(4)} SOL (${pnlStr} SOL, ${pnlPct.toFixed(1)}%)`);

    return { success: true, solReceived, pnl, pnlPct };
  }

  /**
   * Update price for a position
   */
  updatePrice(tokenMint: string, price: number): void {
    const position = this.positions.get(tokenMint);
    if (position) {
      position.currentPrice = price;
      position.highestPrice = Math.max(position.highestPrice, price);
    }
  }

  /**
   * Get current balance
   */
  getBalance(): number {
    return this.balance;
  }

  /**
   * Get portfolio value (balance + positions)
   */
  getPortfolioValue(): number {
    let positionValue = 0;
    for (const pos of this.positions.values()) {
      positionValue += pos.amount * pos.currentPrice;
    }
    return this.balance + positionValue;
  }

  /**
   * Get open positions
   */
  getPositions(): SimulatedPosition[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get position for a token
   */
  getPosition(tokenMint: string): SimulatedPosition | undefined {
    return this.positions.get(tokenMint);
  }

  /**
   * Get all trades
   */
  getTrades(): SimulatedTrade[] {
    return this.trades;
  }

  /**
   * Get comprehensive stats
   */
  getStats(): SimulatorStats {
    const portfolioValue = this.getPortfolioValue();
    const totalPnl = portfolioValue - this.startingBalance;

    const sellTrades = this.trades.filter(t => t.side === 'sell' && t.pnl !== undefined);
    const wins = sellTrades.filter(t => t.pnl! > 0);
    const losses = sellTrades.filter(t => t.pnl! <= 0);

    return {
      startingBalance: this.startingBalance,
      currentBalance: this.balance,
      totalPnl,
      totalTrades: this.trades.length,
      winningTrades: wins.length,
      losingTrades: losses.length,
      winRate: sellTrades.length > 0 ? wins.length / sellTrades.length : 0,
      avgWin: wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl!, 0) / wins.length : 0,
      avgLoss: losses.length > 0 ? losses.reduce((sum, t) => sum + t.pnl!, 0) / losses.length : 0,
      largestWin: wins.length > 0 ? Math.max(...wins.map(t => t.pnl!)) : 0,
      largestLoss: losses.length > 0 ? Math.min(...losses.map(t => t.pnl!)) : 0,
      openPositions: this.positions.size,
    };
  }

  /**
   * Print stats to console
   */
  printStats(): void {
    const stats = this.getStats();
    const portfolioValue = this.getPortfolioValue();
    const totalReturn = ((portfolioValue - this.startingBalance) / this.startingBalance) * 100;

    console.log('\n📊 PAPER TRADING STATS');
    console.log('═'.repeat(40));
    console.log(`Starting Balance:  ${this.startingBalance.toFixed(4)} SOL`);
    console.log(`Current Balance:   ${this.balance.toFixed(4)} SOL`);
    console.log(`Portfolio Value:   ${portfolioValue.toFixed(4)} SOL`);
    console.log(`Total P&L:         ${stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(4)} SOL (${totalReturn.toFixed(1)}%)`);
    console.log('─'.repeat(40));
    console.log(`Total Trades:      ${stats.totalTrades}`);
    console.log(`Win Rate:          ${(stats.winRate * 100).toFixed(1)}%`);
    console.log(`Winning Trades:    ${stats.winningTrades}`);
    console.log(`Losing Trades:     ${stats.losingTrades}`);
    console.log(`Avg Win:           ${stats.avgWin.toFixed(4)} SOL`);
    console.log(`Avg Loss:          ${stats.avgLoss.toFixed(4)} SOL`);
    console.log(`Largest Win:       ${stats.largestWin.toFixed(4)} SOL`);
    console.log(`Largest Loss:      ${stats.largestLoss.toFixed(4)} SOL`);
    console.log(`Open Positions:    ${stats.openPositions}`);
    console.log('═'.repeat(40) + '\n');
  }

  /**
   * Reset the simulator
   */
  reset(): void {
    this.balance = this.startingBalance;
    this.positions.clear();
    this.trades = [];
    logger.info('📝 Paper trading simulator reset');
  }

  /**
   * Export trades to JSON
   */
  exportTrades(): string {
    return JSON.stringify({
      stats: this.getStats(),
      trades: this.trades,
      positions: this.getPositions(),
    }, null, 2);
  }
}
