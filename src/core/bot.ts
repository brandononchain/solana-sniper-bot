import { Connection } from '@solana/web3.js';
import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';
import { logger } from '../utils/logger.js';
import { initializeDatabase, getOpenPositions, updateDailyStat } from '../db/schema.js';
import { WalletManager } from '../wallet/manager.js';
import { PumpFunListener, type NewTokenEvent } from './listener.js';
import { TradeExecutor, type TradeResult } from './executor.js';
import { RiskManager, type PositionAction } from './risk-manager.js';
import { ScamFilter, type TokenMetadata } from '../filters/scam-filter.js';
import { TokenAnalyzer, type AnalysisResult } from '../ai/analyzer.js';
import { POSITION_CHECK_INTERVAL_MS, PRICE_UPDATE_INTERVAL_MS } from '../utils/constants.js';
import type { Config } from '../config.js';
import type { Database } from 'better-sqlite3';

export interface BotStatus {
  isRunning: boolean;
  mode: string;
  activeWallet?: string;
  balance?: number;
  openPositions: number;
  todayTrades: number;
  todayPnl: number;
  tokensAnalyzed: number;
  tokensBought: number;
}

export interface BotEvents {
  'status': (status: BotStatus) => void;
  'newToken': (event: NewTokenEvent, analysis: AnalysisResult) => void;
  'trade': (type: 'buy' | 'sell', result: TradeResult & { token: string }) => void;
  'position': (action: PositionAction & { token: string; pnlPct: number }) => void;
  'error': (error: Error) => void;
}

/**
 * Main Sniper Bot orchestrator
 */
export class SniperBot extends EventEmitter {
  private config: Config;
  private db: Database;
  private connection: Connection;
  private walletManager: WalletManager;
  private listener: PumpFunListener;
  private executor: TradeExecutor;
  private riskManager: RiskManager;
  private scamFilter: ScamFilter;
  private analyzer: TokenAnalyzer;

  private isRunning = false;
  private positionCheckInterval?: NodeJS.Timeout;
  private tokensAnalyzed = 0;
  private tokensBought = 0;

  constructor(config: Config, dbPath = 'data/bot.db') {
    super();
    this.config = config;

    // Initialize database
    this.db = initializeDatabase(dbPath);

    // Initialize connection
    this.connection = new Connection(config.rpc.primary, {
      commitment: 'confirmed',
      wsEndpoint: config.rpc.ws,
    });

    // Initialize components
    this.walletManager = new WalletManager(
      this.connection,
      this.db,
      config.wallet.encryption_password
    );

    this.listener = new PumpFunListener({
      wsEndpoint: config.rpc.ws || config.rpc.primary,
      commitment: 'confirmed',
    });

    this.executor = new TradeExecutor(this.connection, this.db, {
      useJito: config.trading.buy.use_jito,
      jitoTipLamports: config.trading.buy.jito_tip_lamports,
      priorityFeeLamports: config.trading.buy.priority_fee_lamports,
      maxSlippageBps: config.trading.buy.max_slippage_bps,
      maxRetries: 3,
      confirmationTimeout: 30000,
    });

    this.riskManager = new RiskManager(this.db, {
      maxPositions: config.risk.max_positions,
      maxDailyLossSol: config.risk.max_daily_loss_sol,
      maxSingleTokenSol: config.risk.max_single_token_sol,
      pauseAfterConsecutiveLosses: config.risk.pause_after_consecutive_losses,
      minBalanceSol: config.risk.min_balance_sol,
      trailingStopPct: config.trading.sell.trailing_stop_pct,
      takeProfitTiers: config.trading.sell.take_profit_tiers.map(t => ({
        multiplier: t.multiplier,
        sellPct: t.sellPct,
      })),
    });

    this.scamFilter = new ScamFilter(this.connection, this.db, {
      requireMintRenounced: config.filters.require_mint_renounced,
      requireFreezeDisabled: config.filters.require_freeze_disabled,
      minCreatorWalletAgeHours: config.filters.min_creator_wallet_age_hours,
      maxCreatorRugCount: config.filters.max_creator_rug_count,
      blacklistPatterns: config.filters.blacklist_patterns,
    });

    this.analyzer = new TokenAnalyzer(this.connection, this.db, {
      mode: config.ai.mode,
      openaiApiKey: config.ai.openai_api_key,
      confidenceThreshold: config.ai.confidence_threshold,
      weights: {
        creatorAge: config.ai.weights.creator_age,
        mintRenounced: config.ai.weights.mint_renounced,
        socialPresence: config.ai.weights.social_presence,
        nameQuality: config.ai.weights.name_quality,
        marketTiming: config.ai.weights.market_timing,
        earlyBuyers: config.ai.weights.early_buyers,
        liquidityDepth: config.ai.weights.liquidity_depth,
      },
    });

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Set up internal event handlers
   */
  private setupEventHandlers(): void {
    // Handle new tokens from listener
    this.listener.on('newToken', async (event: NewTokenEvent) => {
      if (!this.isRunning || !this.config.bot.enabled) return;
      await this.handleNewToken(event);
    });

    // Handle listener errors
    this.listener.on('error', (err: Error) => {
      logger.error('Listener error', { error: err.message });
      this.emit('error', err);
    });
  }

  /**
   * Initialize the bot (create/load wallets)
   */
  async initialize(): Promise<void> {
    // Try to load existing master seed
    const loaded = await this.walletManager.loadMasterSeed();
    
    if (!loaded) {
      // First run - generate new mnemonic
      const mnemonic = await this.walletManager.initialize();
      logger.info('🔑 New wallet seed generated. BACK THIS UP:');
      console.log('\n' + '='.repeat(60));
      console.log('MNEMONIC (KEEP SECRET):');
      console.log(mnemonic);
      console.log('='.repeat(60) + '\n');
    }

    // Ensure we have at least one wallet
    const wallets = this.walletManager.getAllWallets();
    if (wallets.length === 0) {
      const wallet = await this.walletManager.createBurnerWallet('default');
      await this.walletManager.setActiveWallet(wallet.id);
      logger.info(`Created default wallet: ${wallet.publicKey}`);
      console.log('\n📬 Send SOL to this address to start trading:');
      console.log(wallet.publicKey + '\n');
    } else {
      // Use existing active wallet or first wallet
      const active = wallets.find(w => w.isActive) || wallets[0];
      await this.walletManager.setActiveWallet(active.id);
    }

    logger.info('Bot initialized');
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Bot already running');
      return;
    }

    // Check balance
    const balance = await this.walletManager.getActiveBalance();
    if (balance.sol < this.config.risk.min_balance_sol) {
      const wallet = this.walletManager.getActiveWallet();
      logger.warn(`Insufficient balance: ${balance.sol.toFixed(4)} SOL`);
      console.log(`\n⚠️  Need at least ${this.config.risk.min_balance_sol} SOL to trade.`);
      console.log(`Send SOL to: ${wallet?.publicKey}\n`);
    }

    this.isRunning = true;

    // Start listener
    await this.listener.start();

    // Start position monitoring
    this.startPositionMonitoring();

    logger.info('🚀 Sniper bot started', {
      mode: this.config.bot.mode,
      wallet: this.walletManager.getActiveWallet()?.publicKey.slice(0, 8),
    });

    this.emit('status', await this.getStatus());
  }

  /**
   * Stop the bot
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    // Stop listener
    await this.listener.stop();

    // Stop position monitoring
    if (this.positionCheckInterval) {
      clearInterval(this.positionCheckInterval);
      this.positionCheckInterval = undefined;
    }

    logger.info('Bot stopped');
    this.emit('status', await this.getStatus());
  }

  /**
   * Handle a new token event
   */
  private async handleNewToken(event: NewTokenEvent): Promise<void> {
    this.tokensAnalyzed++;

    const token: TokenMetadata = {
      mint: event.mint,
      name: event.name,
      symbol: event.symbol,
      uri: event.uri,
      creator: event.creator,
    };

    // Quick pre-filter
    const quickCheck = this.scamFilter.quickFilter(token);
    if (!quickCheck.passed) {
      logger.trade('SKIP', token.symbol, quickCheck.reason || 'Failed quick filter');
      updateDailyStat(this.db, 'tokensSkipped', 1);
      return;
    }

    // Full scam analysis
    const filterResult = await this.scamFilter.analyzeToken(token);
    if (!filterResult.passed) {
      logger.trade('SKIP', token.symbol, filterResult.reasons.join(', '));
      updateDailyStat(this.db, 'tokensSkipped', 1);
      if (filterResult.reasons.some(r => r.includes('rug') || r.includes('honeypot'))) {
        updateDailyStat(this.db, 'rugsAvoided', 1);
      }
      return;
    }

    // AI analysis
    const analysis = await this.analyzer.analyze(token, filterResult);
    this.emit('newToken', event, analysis);

    // Check if we should buy
    if (analysis.recommendation !== 'BUY') {
      logger.trade('SKIP', token.symbol, `Score: ${analysis.score} (min: ${this.config.trading.buy.min_score})`);
      updateDailyStat(this.db, 'tokensSkipped', 1);
      return;
    }

    if (analysis.score < this.config.trading.buy.min_score) {
      logger.trade('SKIP', token.symbol, `Score ${analysis.score} below threshold ${this.config.trading.buy.min_score}`);
      updateDailyStat(this.db, 'tokensSkipped', 1);
      return;
    }

    // Risk check
    const balance = await this.walletManager.getActiveBalance();
    const riskCheck = this.riskManager.canTrade(
      this.config.trading.buy.amount_sol,
      balance.sol
    );

    if (!riskCheck.allowed) {
      logger.trade('SKIP', token.symbol, riskCheck.reason || 'Risk check failed');
      return;
    }

    const amountSol = riskCheck.suggestedAmount || this.config.trading.buy.amount_sol;

    // Execute buy
    await this.executeBuy(event, analysis, amountSol);
  }

  /**
   * Execute a buy order
   */
  private async executeBuy(
    event: NewTokenEvent,
    analysis: AnalysisResult,
    amountSol: number
  ): Promise<void> {
    const keypair = this.walletManager.getActiveKeypair();
    const wallet = this.walletManager.getActiveWallet()!;

    logger.info(`🎯 Sniping ${event.symbol} (score: ${analysis.score})`, {
      amount: amountSol,
      reasons: analysis.reasons.slice(0, 2),
    });

    const result = await this.executor.buy(keypair, {
      mint: event.mint,
      bondingCurve: event.bondingCurve,
      amountSol,
      slippageBps: this.config.trading.buy.max_slippage_bps,
    });

    if (result.success) {
      this.tokensBought++;
      updateDailyStat(this.db, 'tokensSniped', 1);
      updateDailyStat(this.db, 'totalVolumeSol', amountSol);

      // Create position
      this.db.prepare(`
        INSERT INTO positions (
          id, wallet_id, token_mint, token_name, token_symbol,
          entry_price, entry_tx, highest_price, amount_tokens, remaining_tokens,
          cost_basis_sol, stop_loss_pct, take_profit_tiers
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        nanoid(),
        wallet.id,
        event.mint,
        event.name,
        event.symbol,
        result.price,
        result.signature,
        result.price,
        result.amountOut,
        result.amountOut,
        amountSol,
        this.config.trading.sell.trailing_stop_pct,
        JSON.stringify(this.config.trading.sell.take_profit_tiers)
      );

      this.emit('trade', 'buy', { ...result, token: event.symbol });
    } else {
      logger.error(`Buy failed for ${event.symbol}`, { error: result.error });
      this.emit('error', new Error(result.error));
    }
  }

  /**
   * Start monitoring positions for exit conditions
   */
  private startPositionMonitoring(): void {
    this.positionCheckInterval = setInterval(async () => {
      if (!this.isRunning) return;
      await this.checkPositions();
    }, POSITION_CHECK_INTERVAL_MS);
  }

  /**
   * Check all positions for exit conditions
   */
  private async checkPositions(): Promise<void> {
    const positions = getOpenPositions(this.db);
    
    for (const position of positions) {
      try {
        // Get current price
        const currentPrice = await this.executor.getPrice(
          position.tokenMint, // This should be bonding curve, but we're simplifying
          position.tokenMint
        );

        if (currentPrice === 0) continue; // Skip if price unavailable

        // Update position price
        this.db.prepare(`
          UPDATE positions SET 
            current_price = ?,
            highest_price = MAX(highest_price, ?),
            last_updated = datetime('now')
          WHERE id = ?
        `).run(currentPrice, currentPrice, position.id);

        // Check risk manager
        const action = this.riskManager.checkPosition(position, currentPrice);
        const pnlPct = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

        this.emit('position', {
          ...action,
          token: position.tokenSymbol || position.tokenMint.slice(0, 8),
          pnlPct,
        });

        if (action.action !== 'HOLD') {
          await this.executePositionAction(position, action, currentPrice);
        }
      } catch (err) {
        logger.debug('Position check error', { 
          position: position.id, 
          error: String(err) 
        });
      }
    }
  }

  /**
   * Execute a position action (sell partial/all)
   */
  private async executePositionAction(
    position: any,
    action: PositionAction,
    currentPrice: number
  ): Promise<void> {
    const keypair = this.walletManager.getActiveKeypair();
    const sellPct = action.sellPct || 100;
    const tokensToSell = position.remainingTokens * (sellPct / 100);

    logger.position(
      position.tokenSymbol || position.tokenMint.slice(0, 8),
      ((currentPrice - position.entryPrice) / position.entryPrice) * 100,
      action.reason
    );

    const result = await this.executor.sell(keypair, {
      mint: position.tokenMint,
      bondingCurve: position.tokenMint, // Simplified
      amountTokens: tokensToSell,
    });

    if (result.success) {
      const pnlSol = result.amountOut - (position.costBasisSol * (sellPct / 100));
      
      // Update position
      if (sellPct >= 100) {
        // Close position
        this.db.prepare(`DELETE FROM positions WHERE id = ?`).run(position.id);
        this.riskManager.clearTierTracking(position.id);
      } else {
        // Update remaining
        this.db.prepare(`
          UPDATE positions SET 
            remaining_tokens = remaining_tokens - ?,
            realized_pnl_sol = realized_pnl_sol + ?
          WHERE id = ?
        `).run(tokensToSell, pnlSol, position.id);
      }

      // Record result
      this.riskManager.recordTradeResult(pnlSol > 0, pnlSol);
      this.walletManager.updatePnl(position.walletId, pnlSol);
      updateDailyStat(this.db, 'totalVolumeSol', result.amountOut);

      this.emit('trade', 'sell', { 
        ...result, 
        token: position.tokenSymbol || position.tokenMint.slice(0, 8) 
      });
    }
  }

  /**
   * Get current bot status
   */
  async getStatus(): Promise<BotStatus> {
    const wallet = this.walletManager.getActiveWallet();
    const balance = wallet ? await this.walletManager.getBalance(wallet.publicKey) : null;
    const positions = getOpenPositions(this.db);
    const riskStatus = this.riskManager.getStatus();

    return {
      isRunning: this.isRunning,
      mode: this.config.bot.mode,
      activeWallet: wallet?.publicKey,
      balance: balance?.sol,
      openPositions: positions.length,
      todayTrades: riskStatus.openPositions,
      todayPnl: riskStatus.dailyPnl,
      tokensAnalyzed: this.tokensAnalyzed,
      tokensBought: this.tokensBought,
    };
  }

  /**
   * Get wallet manager instance
   */
  getWalletManager(): WalletManager {
    return this.walletManager;
  }

  /**
   * Get risk manager instance
   */
  getRiskManager(): RiskManager {
    return this.riskManager;
  }

  /**
   * Pause trading
   */
  pause(): void {
    this.riskManager.pause();
    this.emit('status', this.getStatus());
  }

  /**
   * Resume trading
   */
  resume(): void {
    this.riskManager.resume();
    this.emit('status', this.getStatus());
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<Config>): void {
    Object.assign(this.config, updates);
    
    // Update risk manager config
    if (updates.risk) {
      this.riskManager.updateConfig({
        maxPositions: updates.risk.max_positions,
        maxDailyLossSol: updates.risk.max_daily_loss_sol,
        maxSingleTokenSol: updates.risk.max_single_token_sol,
        pauseAfterConsecutiveLosses: updates.risk.pause_after_consecutive_losses,
        minBalanceSol: updates.risk.min_balance_sol,
      });
    }

    logger.info('Configuration updated');
  }

  /**
   * Close all positions immediately
   */
  async closeAllPositions(): Promise<void> {
    const positions = getOpenPositions(this.db);
    const keypair = this.walletManager.getActiveKeypair();

    logger.warn(`🚨 Closing all ${positions.length} positions`);

    for (const position of positions) {
      await this.executor.sell(keypair, {
        mint: position.tokenMint,
        bondingCurve: position.tokenMint,
        amountTokens: position.remainingTokens,
      });
    }

    // Clear all positions from DB
    this.db.prepare(`DELETE FROM positions`).run();
    logger.info('All positions closed');
  }
}
