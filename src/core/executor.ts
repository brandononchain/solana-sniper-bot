import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  ComputeBudgetProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { nanoid } from 'nanoid';
import { logger } from '../utils/logger.js';
import { PUMP_FUN_PROGRAM_ID, JITO_TIP_ACCOUNTS } from '../utils/constants.js';
import type { Database } from 'better-sqlite3';

export interface ExecutorConfig {
  useJito: boolean;
  jitoTipLamports: number;
  priorityFeeLamports: number;
  maxSlippageBps: number;
  maxRetries: number;
  confirmationTimeout: number;
}

export interface BuyParams {
  mint: string;
  bondingCurve: string;
  amountSol: number;
  minTokensOut?: number;
  slippageBps?: number;
}

export interface SellParams {
  mint: string;
  bondingCurve: string;
  amountTokens: number;
  minSolOut?: number;
  slippageBps?: number;
}

export interface TradeResult {
  success: boolean;
  signature?: string;
  error?: string;
  amountIn: number;
  amountOut: number;
  price: number;
}

export class TradeExecutor {
  private connection: Connection;
  private db: Database;
  private config: ExecutorConfig;
  private jitoEndpoint = 'https://mainnet.block-engine.jito.wtf/api/v1/bundles';

  constructor(connection: Connection, db: Database, config: ExecutorConfig) {
    this.connection = connection;
    this.db = db;
    this.config = config;
  }

  /**
   * Execute a buy order
   */
  async buy(keypair: Keypair, params: BuyParams): Promise<TradeResult> {
    const tradeId = nanoid();
    const walletId = this.getWalletId(keypair.publicKey.toBase58());
    const slippage = params.slippageBps || this.config.maxSlippageBps;

    logger.info(`📥 Initiating buy: ${params.amountSol} SOL`, {
      mint: params.mint,
      slippage: `${slippage / 100}%`,
    });

    // Record pending trade
    this.recordTrade(tradeId, walletId, params.mint, 'buy', params.amountSol, 0, 0, 'pending');

    try {
      // Build the buy transaction
      const tx = await this.buildBuyTransaction(keypair, params, slippage);

      // Execute with retry logic
      const signature = await this.executeWithRetry(keypair, tx);

      // Get actual amounts from transaction
      const result = await this.parseTradeResult(signature, params.mint);

      // Update trade record
      this.updateTrade(tradeId, {
        status: 'confirmed',
        signature,
        amountTokens: result.amountOut,
        price: result.price,
      });

      logger.trade('BUY', params.mint.slice(0, 8), 
        `${params.amountSol} SOL → ${result.amountOut.toFixed(0)} tokens @ ${result.price.toExponential(2)}`
      );

      return {
        success: true,
        signature,
        amountIn: params.amountSol,
        amountOut: result.amountOut,
        price: result.price,
      };

    } catch (err) {
      const errorMsg = String(err);
      this.updateTrade(tradeId, { status: 'failed', error: errorMsg });
      
      logger.error(`Buy failed: ${errorMsg}`, { mint: params.mint });
      
      return {
        success: false,
        error: errorMsg,
        amountIn: params.amountSol,
        amountOut: 0,
        price: 0,
      };
    }
  }

  /**
   * Execute a sell order
   */
  async sell(keypair: Keypair, params: SellParams): Promise<TradeResult> {
    const tradeId = nanoid();
    const walletId = this.getWalletId(keypair.publicKey.toBase58());
    const slippage = params.slippageBps || this.config.maxSlippageBps;

    logger.info(`📤 Initiating sell: ${params.amountTokens} tokens`, {
      mint: params.mint,
      slippage: `${slippage / 100}%`,
    });

    // Record pending trade
    this.recordTrade(tradeId, walletId, params.mint, 'sell', 0, params.amountTokens, 0, 'pending');

    try {
      // Build the sell transaction
      const tx = await this.buildSellTransaction(keypair, params, slippage);

      // Execute with retry logic
      const signature = await this.executeWithRetry(keypair, tx);

      // Get actual amounts from transaction
      const result = await this.parseTradeResult(signature, params.mint);

      // Update trade record
      this.updateTrade(tradeId, {
        status: 'confirmed',
        signature,
        amountSol: result.amountOut,
        price: result.price,
      });

      logger.trade('SELL', params.mint.slice(0, 8),
        `${params.amountTokens} tokens → ${result.amountOut.toFixed(4)} SOL @ ${result.price.toExponential(2)}`
      );

      return {
        success: true,
        signature,
        amountIn: params.amountTokens,
        amountOut: result.amountOut,
        price: result.price,
      };

    } catch (err) {
      const errorMsg = String(err);
      this.updateTrade(tradeId, { status: 'failed', error: errorMsg });
      
      logger.error(`Sell failed: ${errorMsg}`, { mint: params.mint });
      
      return {
        success: false,
        error: errorMsg,
        amountIn: params.amountTokens,
        amountOut: 0,
        price: 0,
      };
    }
  }

  /**
   * Build a buy transaction for Pump.fun
   */
  private async buildBuyTransaction(
    keypair: Keypair,
    params: BuyParams,
    slippageBps: number
  ): Promise<Transaction> {
    const tx = new Transaction();
    const mint = new PublicKey(params.mint);
    const bondingCurve = new PublicKey(params.bondingCurve);

    // Add priority fee
    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ 
        microLamports: this.config.priorityFeeLamports 
      })
    );

    // Get or create associated token account
    const ata = await getAssociatedTokenAddress(mint, keypair.publicKey);
    const ataInfo = await this.connection.getAccountInfo(ata);
    
    if (!ataInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          keypair.publicKey,
          ata,
          keypair.publicKey,
          mint
        )
      );
    }

    // Calculate amounts with slippage
    const amountLamports = params.amountSol * LAMPORTS_PER_SOL;
    const minTokensOut = params.minTokensOut || 0;

    // Build Pump.fun buy instruction
    // Note: This is a simplified version - real implementation needs actual Pump.fun IDL
    const buyIx = await this.buildPumpFunBuyInstruction(
      keypair.publicKey,
      mint,
      bondingCurve,
      ata,
      amountLamports,
      minTokensOut,
      slippageBps
    );

    tx.add(buyIx);

    // Add Jito tip if enabled
    if (this.config.useJito && this.config.jitoTipLamports > 0) {
      const tipAccount = JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)];
      tx.add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: tipAccount,
          lamports: this.config.jitoTipLamports,
        })
      );
    }

    // Set recent blockhash
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = keypair.publicKey;

    return tx;
  }

  /**
   * Build a sell transaction for Pump.fun
   */
  private async buildSellTransaction(
    keypair: Keypair,
    params: SellParams,
    slippageBps: number
  ): Promise<Transaction> {
    const tx = new Transaction();
    const mint = new PublicKey(params.mint);
    const bondingCurve = new PublicKey(params.bondingCurve);

    // Add priority fee
    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ 
        microLamports: this.config.priorityFeeLamports 
      })
    );

    // Get associated token account
    const ata = await getAssociatedTokenAddress(mint, keypair.publicKey);

    // Calculate minimum SOL out with slippage
    const minSolOut = params.minSolOut || 0;

    // Build Pump.fun sell instruction
    const sellIx = await this.buildPumpFunSellInstruction(
      keypair.publicKey,
      mint,
      bondingCurve,
      ata,
      params.amountTokens,
      minSolOut,
      slippageBps
    );

    tx.add(sellIx);

    // Add Jito tip if enabled
    if (this.config.useJito && this.config.jitoTipLamports > 0) {
      const tipAccount = JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)];
      tx.add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: tipAccount,
          lamports: this.config.jitoTipLamports,
        })
      );
    }

    // Set recent blockhash
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = keypair.publicKey;

    return tx;
  }

  /**
   * Build Pump.fun buy instruction
   * This is a simplified placeholder - real implementation needs the actual Pump.fun IDL
   */
  private async buildPumpFunBuyInstruction(
    buyer: PublicKey,
    mint: PublicKey,
    bondingCurve: PublicKey,
    buyerAta: PublicKey,
    amountLamports: number,
    minTokensOut: number,
    slippageBps: number
  ): Promise<TransactionInstruction> {
    // In production, you would use the actual Pump.fun IDL and Anchor
    // This is a placeholder structure
    
    const keys = [
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: buyerAta, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    // Instruction data (simplified - needs actual Pump.fun serialization)
    const data = Buffer.alloc(24);
    data.writeUInt8(0, 0); // Buy instruction discriminator
    data.writeBigUInt64LE(BigInt(amountLamports), 8);
    data.writeBigUInt64LE(BigInt(minTokensOut), 16);

    return new TransactionInstruction({
      programId: PUMP_FUN_PROGRAM_ID,
      keys,
      data,
    });
  }

  /**
   * Build Pump.fun sell instruction
   */
  private async buildPumpFunSellInstruction(
    seller: PublicKey,
    mint: PublicKey,
    bondingCurve: PublicKey,
    sellerAta: PublicKey,
    amountTokens: number,
    minSolOut: number,
    slippageBps: number
  ): Promise<TransactionInstruction> {
    const keys = [
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: seller, isSigner: true, isWritable: true },
      { pubkey: sellerAta, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    const data = Buffer.alloc(24);
    data.writeUInt8(1, 0); // Sell instruction discriminator
    data.writeBigUInt64LE(BigInt(Math.floor(amountTokens)), 8);
    data.writeBigUInt64LE(BigInt(Math.floor(minSolOut * LAMPORTS_PER_SOL)), 16);

    return new TransactionInstruction({
      programId: PUMP_FUN_PROGRAM_ID,
      keys,
      data,
    });
  }

  /**
   * Execute transaction with retry logic
   */
  private async executeWithRetry(keypair: Keypair, tx: Transaction): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        if (this.config.useJito) {
          return await this.sendViaJito(keypair, tx);
        } else {
          return await sendAndConfirmTransaction(
            this.connection,
            tx,
            [keypair],
            { commitment: 'confirmed', maxRetries: 2 }
          );
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        
        // Don't retry certain errors
        const errMsg = lastError.message.toLowerCase();
        if (errMsg.includes('insufficient') || 
            errMsg.includes('already processed') ||
            errMsg.includes('blockhash not found')) {
          throw lastError;
        }

        if (attempt < this.config.maxRetries) {
          logger.warn(`Retry ${attempt}/${this.config.maxRetries}`, { error: lastError.message });
          await new Promise(r => setTimeout(r, 500 * attempt));
          
          // Refresh blockhash
          const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
          tx.recentBlockhash = blockhash;
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Send transaction via Jito for MEV protection
   */
  private async sendViaJito(keypair: Keypair, tx: Transaction): Promise<string> {
    tx.sign(keypair);
    const serialized = tx.serialize();
    const base64Tx = serialized.toString('base64');

    const response = await fetch(this.jitoEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sendBundle',
        params: [[base64Tx]],
      }),
    });

    const result = await response.json() as any;
    
    if (result.error) {
      throw new Error(`Jito error: ${result.error.message}`);
    }

    // Wait for bundle confirmation
    const bundleId = result.result;
    return await this.waitForBundleConfirmation(bundleId, tx);
  }

  /**
   * Wait for Jito bundle confirmation
   */
  private async waitForBundleConfirmation(bundleId: string, tx: Transaction): Promise<string> {
    const signature = tx.signature ? tx.signature.toString('base64') : '';
    
    // Poll for confirmation
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      
      const response = await fetch(this.jitoEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBundleStatuses',
          params: [[bundleId]],
        }),
      });

      const result = await response.json() as any;
      const status = result.result?.value?.[0];
      
      if (status?.confirmation_status === 'confirmed' || status?.confirmation_status === 'finalized') {
        return signature;
      }
      
      if (status?.err) {
        throw new Error(`Bundle failed: ${JSON.stringify(status.err)}`);
      }
    }

    throw new Error('Bundle confirmation timeout');
  }

  /**
   * Parse trade result from transaction
   */
  private async parseTradeResult(signature: string, mint: string): Promise<{
    amountOut: number;
    price: number;
  }> {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx?.meta) {
        return { amountOut: 0, price: 0 };
      }

      // Parse token balance changes
      const preBalances = tx.meta.preTokenBalances || [];
      const postBalances = tx.meta.postTokenBalances || [];

      // Find the token balance change for this mint
      const preBalance = preBalances.find(b => b.mint === mint);
      const postBalance = postBalances.find(b => b.mint === mint);

      const tokenChange = (postBalance?.uiTokenAmount?.uiAmount || 0) - 
                         (preBalance?.uiTokenAmount?.uiAmount || 0);

      // Parse SOL balance change
      const solChange = (tx.meta.postBalances[0] - tx.meta.preBalances[0]) / LAMPORTS_PER_SOL;

      const amountOut = Math.abs(tokenChange);
      const price = Math.abs(solChange / tokenChange) || 0;

      return { amountOut, price };
    } catch (err) {
      logger.warn('Failed to parse trade result', { signature, error: String(err) });
      return { amountOut: 0, price: 0 };
    }
  }

  /**
   * Get wallet ID from public key
   */
  private getWalletId(publicKey: string): string {
    const row = this.db.prepare(
      `SELECT id FROM wallets WHERE public_key = ?`
    ).get(publicKey) as { id: string } | undefined;
    return row?.id || 'unknown';
  }

  /**
   * Record a trade in the database
   */
  private recordTrade(
    id: string,
    walletId: string,
    mint: string,
    side: 'buy' | 'sell',
    amountSol: number,
    amountTokens: number,
    price: number,
    status: string
  ): void {
    this.db.prepare(`
      INSERT INTO trades (id, wallet_id, token_mint, side, amount_sol, amount_tokens, price, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, walletId, mint, side, amountSol, amountTokens, price, status);
  }

  /**
   * Update a trade record
   */
  private updateTrade(id: string, updates: {
    status?: string;
    signature?: string;
    amountSol?: number;
    amountTokens?: number;
    price?: number;
    error?: string;
  }): void {
    const sets: string[] = [];
    const values: any[] = [];

    if (updates.status) { sets.push('status = ?'); values.push(updates.status); }
    if (updates.signature) { sets.push('tx_signature = ?'); values.push(updates.signature); }
    if (updates.amountSol !== undefined) { sets.push('amount_sol = ?'); values.push(updates.amountSol); }
    if (updates.amountTokens !== undefined) { sets.push('amount_tokens = ?'); values.push(updates.amountTokens); }
    if (updates.price !== undefined) { sets.push('price = ?'); values.push(updates.price); }
    if (updates.error) { sets.push('error_message = ?'); values.push(updates.error); }
    if (updates.status === 'confirmed') { sets.push('confirmed_at = datetime("now")'); }

    if (sets.length === 0) return;

    values.push(id);
    this.db.prepare(`UPDATE trades SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }

  /**
   * Get current token price from bonding curve
   */
  async getPrice(bondingCurve: string, mint: string): Promise<number> {
    // In production, you would fetch the bonding curve state and calculate the price
    // This is a placeholder
    try {
      const accountInfo = await this.connection.getAccountInfo(new PublicKey(bondingCurve));
      if (!accountInfo) return 0;

      // Parse bonding curve state (needs actual Pump.fun data layout)
      // For now, return 0 to indicate unknown
      return 0;
    } catch {
      return 0;
    }
  }
}
