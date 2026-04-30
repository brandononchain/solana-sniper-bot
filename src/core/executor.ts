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
import bs58 from 'bs58';
import { nanoid } from 'nanoid';
import { logger } from '../utils/logger.js';
import {
  PUMP_FUN_PROGRAM_ID,
  PUMP_FUN_GLOBAL,
  PUMP_FUN_FEE_RECIPIENT,
  PUMP_FUN_EVENT_AUTHORITY,
  PUMP_FUN_BUY_EXACT_SOL_IN_DISCRIMINATOR,
  PUMP_FUN_SELL_DISCRIMINATOR,
  PUMP_FUN_BONDING_CURVE_SEED,
  PUMP_FUN_CREATOR_VAULT_SEED,
  PUMP_FUN_GLOBAL_VOLUME_ACCUMULATOR,
  PUMP_FUN_USER_VOLUME_ACCUMULATOR_SEED,
  PUMP_CURVE_STATE_SIGNATURE,
  PUMP_CURVE_STATE_OFFSETS,
  PUMP_FUN_TOKEN_DECIMALS,
  PUMP_FEE_CONFIG,
  PUMP_FEE_PROGRAM_ID,
  JITO_TIP_ACCOUNTS,
} from '../utils/constants.js';
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

export interface BondingCurveState {
  virtualTokenReserves: bigint;
  virtualSolReserves: bigint;
  realTokenReserves: bigint;
  realSolReserves: bigint;
  tokenTotalSupply: bigint;
  complete: boolean;
  creator?: PublicKey;
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

  async buy(keypair: Keypair, params: BuyParams): Promise<TradeResult> {
    const tradeId = nanoid();
    const walletId = this.getWalletId(keypair.publicKey.toBase58());
    const slippage = params.slippageBps || this.config.maxSlippageBps;

    logger.info(`📥 Initiating buy: ${params.amountSol} SOL`, {
      mint: params.mint,
      slippage: `${slippage / 100}%`,
    });

    this.recordTrade(tradeId, walletId, params.mint, 'buy', params.amountSol, 0, 0, 'pending');

    try {
      const tx = await this.buildBuyTransaction(keypair, params, slippage);
      const signature = await this.executeWithRetry(keypair, tx);
      const result = await this.parseTradeResult(signature, params.mint);

      this.updateTrade(tradeId, {
        status: 'confirmed',
        signature,
        amountTokens: result.amountOut,
        price: result.price,
      });

      logger.trade('BUY', params.mint.slice(0, 8),
        `${params.amountSol} SOL → ${result.amountOut.toFixed(0)} tokens @ ${result.price.toExponential(2)}`
      );

      return { success: true, signature, amountIn: params.amountSol, amountOut: result.amountOut, price: result.price };
    } catch (err) {
      const errorMsg = String(err);
      this.updateTrade(tradeId, { status: 'failed', error: errorMsg });
      logger.error(`Buy failed: ${errorMsg}`, { mint: params.mint });
      return { success: false, error: errorMsg, amountIn: params.amountSol, amountOut: 0, price: 0 };
    }
  }

  async sell(keypair: Keypair, params: SellParams): Promise<TradeResult> {
    const tradeId = nanoid();
    const walletId = this.getWalletId(keypair.publicKey.toBase58());
    const slippage = params.slippageBps || this.config.maxSlippageBps;

    logger.info(`📤 Initiating sell: ${params.amountTokens} tokens`, {
      mint: params.mint,
      slippage: `${slippage / 100}%`,
    });

    this.recordTrade(tradeId, walletId, params.mint, 'sell', 0, params.amountTokens, 0, 'pending');

    try {
      const tx = await this.buildSellTransaction(keypair, params, slippage);
      const signature = await this.executeWithRetry(keypair, tx);
      const result = await this.parseTradeResult(signature, params.mint);

      this.updateTrade(tradeId, {
        status: 'confirmed',
        signature,
        amountSol: result.amountOut,
        price: result.price,
      });

      logger.trade('SELL', params.mint.slice(0, 8),
        `${params.amountTokens} tokens → ${result.amountOut.toFixed(4)} SOL @ ${result.price.toExponential(2)}`
      );

      return { success: true, signature, amountIn: params.amountTokens, amountOut: result.amountOut, price: result.price };
    } catch (err) {
      const errorMsg = String(err);
      this.updateTrade(tradeId, { status: 'failed', error: errorMsg });
      logger.error(`Sell failed: ${errorMsg}`, { mint: params.mint });
      return { success: false, error: errorMsg, amountIn: params.amountTokens, amountOut: 0, price: 0 };
    }
  }

  private async buildBuyTransaction(keypair: Keypair, params: BuyParams, slippageBps: number): Promise<Transaction> {
    const tx = new Transaction();
    const mint = new PublicKey(params.mint);
    const bondingCurve = new PublicKey(params.bondingCurve);

    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 250_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: this.config.priorityFeeLamports })
    );

    const ata = await getAssociatedTokenAddress(mint, keypair.publicKey);
    const ataInfo = await this.connection.getAccountInfo(ata, 'processed');
    if (!ataInfo) {
      tx.add(createAssociatedTokenAccountInstruction(keypair.publicKey, ata, keypair.publicKey, mint));
    }

    const state = await this.getBondingCurveState(params.bondingCurve);
    if (!state) throw new Error('Bonding curve state unavailable');
    if (state.complete) throw new Error('Bonding curve complete; PumpSwap exit/entry path required');

    const creator = state.creator || keypair.publicKey;
    const spendableSolLamports = Math.floor(params.amountSol * LAMPORTS_PER_SOL);
    const calcResult = await this.calculateBuyAmount(params.bondingCurve, params.amountSol);
    const minTokensOut = BigInt(
      Math.max(1, Math.floor(Number(params.minTokensOut ?? calcResult.tokensOut) * (1 - slippageBps / 10000)))
    );

    tx.add(await this.buildPumpFunBuyExactSolInInstruction(
      keypair.publicKey,
      mint,
      bondingCurve,
      creator,
      ata,
      spendableSolLamports,
      minTokensOut
    ));

    if (this.config.useJito && this.config.jitoTipLamports > 0) {
      const tipAccount = JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)];
      tx.add(SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: tipAccount,
        lamports: this.config.jitoTipLamports,
      }));
    }

    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('processed');
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = keypair.publicKey;
    return tx;
  }

  private async buildSellTransaction(keypair: Keypair, params: SellParams, slippageBps: number): Promise<Transaction> {
    const tx = new Transaction();
    const mint = new PublicKey(params.mint);
    const bondingCurve = new PublicKey(params.bondingCurve);

    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 250_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: this.config.priorityFeeLamports })
    );

    const ata = await getAssociatedTokenAddress(mint, keypair.publicKey);
    const state = await this.getBondingCurveState(params.bondingCurve);
    if (!state) throw new Error('Bonding curve state unavailable');
    if (state.complete) throw new Error('Bonding curve complete; PumpSwap sell path required');

    const creator = state.creator || keypair.publicKey;
    const minSolOut = params.minSolOut || 0;

    tx.add(await this.buildPumpFunSellInstruction(
      keypair.publicKey,
      mint,
      bondingCurve,
      creator,
      ata,
      params.amountTokens,
      minSolOut,
      slippageBps
    ));

    if (this.config.useJito && this.config.jitoTipLamports > 0) {
      const tipAccount = JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)];
      tx.add(SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: tipAccount,
        lamports: this.config.jitoTipLamports,
      }));
    }

    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('processed');
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = keypair.publicKey;
    return tx;
  }

  static deriveBondingCurve(mint: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(PUMP_FUN_BONDING_CURVE_SEED), mint.toBuffer()],
      PUMP_FUN_PROGRAM_ID
    )[0];
  }

  static deriveCreatorVault(creator: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(PUMP_FUN_CREATOR_VAULT_SEED), creator.toBuffer()],
      PUMP_FUN_PROGRAM_ID
    )[0];
  }

  static deriveUserVolumeAccumulator(user: PublicKey): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(PUMP_FUN_USER_VOLUME_ACCUMULATOR_SEED), user.toBuffer()],
      PUMP_FUN_PROGRAM_ID
    )[0];
  }

  private async buildPumpFunBuyExactSolInInstruction(
    buyer: PublicKey,
    mint: PublicKey,
    bondingCurve: PublicKey,
    creator: PublicKey,
    buyerAta: PublicKey,
    spendableSolLamports: number,
    minTokensOut: bigint
  ): Promise<TransactionInstruction> {
    const associatedBondingCurve = await getAssociatedTokenAddress(mint, bondingCurve, true);
    const creatorVault = TradeExecutor.deriveCreatorVault(creator);
    const userVolumeAccumulator = TradeExecutor.deriveUserVolumeAccumulator(buyer);

    const keys = [
      { pubkey: PUMP_FUN_GLOBAL, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: buyerAta, isSigner: false, isWritable: true },
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: creatorVault, isSigner: false, isWritable: true },
      { pubkey: PUMP_FUN_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_GLOBAL_VOLUME_ACCUMULATOR, isSigner: false, isWritable: true },
      { pubkey: userVolumeAccumulator, isSigner: false, isWritable: true },
      { pubkey: PUMP_FEE_CONFIG, isSigner: false, isWritable: false },
      { pubkey: PUMP_FEE_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    const data = Buffer.alloc(8 + 8 + 8 + 2);
    PUMP_FUN_BUY_EXACT_SOL_IN_DISCRIMINATOR.copy(data, 0);
    data.writeBigUInt64LE(BigInt(spendableSolLamports), 8);
    data.writeBigUInt64LE(minTokensOut, 16);
    // OptionBool::Some(false). This keeps the account layout current without opting into incentive tracking.
    data.writeUInt8(1, 24);
    data.writeUInt8(0, 25);

    return new TransactionInstruction({ programId: PUMP_FUN_PROGRAM_ID, keys, data });
  }

  private async buildPumpFunSellInstruction(
    seller: PublicKey,
    mint: PublicKey,
    bondingCurve: PublicKey,
    creator: PublicKey,
    sellerAta: PublicKey,
    amountTokens: number,
    minSolOut: number,
    _slippageBps: number
  ): Promise<TransactionInstruction> {
    const associatedBondingCurve = await getAssociatedTokenAddress(mint, bondingCurve, true);
    const creatorVault = TradeExecutor.deriveCreatorVault(creator);

    const keys = [
      { pubkey: PUMP_FUN_GLOBAL, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: sellerAta, isSigner: false, isWritable: true },
      { pubkey: seller, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: creatorVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: PUMP_FEE_CONFIG, isSigner: false, isWritable: false },
      { pubkey: PUMP_FEE_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    const data = Buffer.alloc(8 + 8 + 8);
    PUMP_FUN_SELL_DISCRIMINATOR.copy(data, 0);
    data.writeBigUInt64LE(BigInt(Math.floor(amountTokens * 10 ** PUMP_FUN_TOKEN_DECIMALS)), 8);
    data.writeBigUInt64LE(BigInt(Math.floor(minSolOut * LAMPORTS_PER_SOL)), 16);

    return new TransactionInstruction({ programId: PUMP_FUN_PROGRAM_ID, keys, data });
  }

  private async executeWithRetry(keypair: Keypair, tx: Transaction): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        if (this.config.useJito) return await this.sendViaJito(keypair, tx);
        return await sendAndConfirmTransaction(this.connection, tx, [keypair], {
          commitment: 'confirmed',
          maxRetries: 2,
          skipPreflight: false,
        });
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const errMsg = lastError.message.toLowerCase();
        if (errMsg.includes('insufficient') || errMsg.includes('already processed') || errMsg.includes('blockhash not found')) {
          throw lastError;
        }
        if (attempt < this.config.maxRetries) {
          logger.warn(`Retry ${attempt}/${this.config.maxRetries}`, { error: lastError.message });
          await new Promise(r => setTimeout(r, 350 * attempt));
          const { blockhash } = await this.connection.getLatestBlockhash('processed');
          tx.recentBlockhash = blockhash;
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  private async sendViaJito(keypair: Keypair, tx: Transaction): Promise<string> {
    tx.sign(keypair);
    const serialized = tx.serialize();
    const base64Tx = serialized.toString('base64');
    const signature = tx.signature ? bs58.encode(tx.signature) : '';

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
    if (result.error) throw new Error(`Jito error: ${result.error.message}`);
    return await this.waitForBundleConfirmation(result.result, signature);
  }

  private async waitForBundleConfirmation(bundleId: string, signature: string): Promise<string> {
    for (let i = 0; i < Math.ceil(this.config.confirmationTimeout / 1000); i++) {
      await new Promise(r => setTimeout(r, 1000));
      const response = await fetch(this.jitoEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBundleStatuses', params: [[bundleId]] }),
      });

      const result = await response.json() as any;
      const status = result.result?.value?.[0];
      if (status?.confirmation_status === 'confirmed' || status?.confirmation_status === 'finalized') return signature;
      if (status?.err) throw new Error(`Bundle failed: ${JSON.stringify(status.err)}`);
    }

    throw new Error('Bundle confirmation timeout');
  }

  private async parseTradeResult(signature: string, mint: string): Promise<{ amountOut: number; price: number }> {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
      if (!tx?.meta) return { amountOut: 0, price: 0 };

      const preBalances = tx.meta.preTokenBalances || [];
      const postBalances = tx.meta.postTokenBalances || [];
      const preBalance = preBalances.find(b => b.mint === mint);
      const postBalance = postBalances.find(b => b.mint === mint);
      const tokenChange = (postBalance?.uiTokenAmount?.uiAmount || 0) - (preBalance?.uiTokenAmount?.uiAmount || 0);
      const solChange = (tx.meta.postBalances[0] - tx.meta.preBalances[0]) / LAMPORTS_PER_SOL;
      const amountOut = Math.abs(tokenChange);
      const price = Math.abs(solChange / tokenChange) || 0;
      return { amountOut, price };
    } catch (err) {
      logger.warn('Failed to parse trade result', { signature, error: String(err) });
      return { amountOut: 0, price: 0 };
    }
  }

  private getWalletId(publicKey: string): string {
    const row = this.db.prepare(`SELECT id FROM wallets WHERE public_key = ?`).get(publicKey) as { id: string } | undefined;
    return row?.id || 'unknown';
  }

  private recordTrade(id: string, walletId: string, mint: string, side: 'buy' | 'sell', amountSol: number, amountTokens: number, price: number, status: string): void {
    this.db.prepare(`
      INSERT INTO trades (id, wallet_id, token_mint, side, amount_sol, amount_tokens, price, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, walletId, mint, side, amountSol, amountTokens, price, status);
  }

  private updateTrade(id: string, updates: { status?: string; signature?: string; amountSol?: number; amountTokens?: number; price?: number; error?: string }): void {
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

  async getPrice(bondingCurve: string, _mint: string): Promise<number> {
    try {
      const state = await this.getBondingCurveState(bondingCurve);
      if (!state || state.virtualTokenReserves === 0n) return 0;
      if (state.complete) return 0;
      return (Number(state.virtualSolReserves) / LAMPORTS_PER_SOL) /
        (Number(state.virtualTokenReserves) / 10 ** PUMP_FUN_TOKEN_DECIMALS);
    } catch {
      return 0;
    }
  }

  async isBondingCurveComplete(bondingCurve: string): Promise<boolean> {
    const state = await this.getBondingCurveState(bondingCurve);
    return !!state?.complete;
  }

  async getBondingCurveState(bondingCurve: string): Promise<BondingCurveState | null> {
    try {
      const accountInfo = await this.connection.getAccountInfo(new PublicKey(bondingCurve), 'processed');
      if (!accountInfo?.data || accountInfo.data.byteLength < 49) return null;
      const sig = accountInfo.data.subarray(0, 8);
      if (sig.compare(PUMP_CURVE_STATE_SIGNATURE) !== 0) return null;

      const creator = accountInfo.data.byteLength >= 81
        ? new PublicKey(accountInfo.data.subarray(PUMP_CURVE_STATE_OFFSETS.CREATOR, PUMP_CURVE_STATE_OFFSETS.CREATOR + 32))
        : undefined;

      return {
        virtualTokenReserves: accountInfo.data.readBigUInt64LE(PUMP_CURVE_STATE_OFFSETS.VIRTUAL_TOKEN_RESERVES),
        virtualSolReserves: accountInfo.data.readBigUInt64LE(PUMP_CURVE_STATE_OFFSETS.VIRTUAL_SOL_RESERVES),
        realTokenReserves: accountInfo.data.readBigUInt64LE(PUMP_CURVE_STATE_OFFSETS.REAL_TOKEN_RESERVES),
        realSolReserves: accountInfo.data.readBigUInt64LE(PUMP_CURVE_STATE_OFFSETS.REAL_SOL_RESERVES),
        tokenTotalSupply: accountInfo.data.readBigUInt64LE(PUMP_CURVE_STATE_OFFSETS.TOKEN_TOTAL_SUPPLY),
        complete: accountInfo.data[PUMP_CURVE_STATE_OFFSETS.COMPLETE] !== 0,
        creator,
      };
    } catch {
      return null;
    }
  }

  async calculateBuyAmount(bondingCurve: string, solAmount: number): Promise<{ tokensOut: bigint; priceImpactPct: number }> {
    const state = await this.getBondingCurveState(bondingCurve);
    if (!state || state.complete) return { tokensOut: 0n, priceImpactPct: 0 };

    const solIn = BigInt(Math.floor(solAmount * LAMPORTS_PER_SOL));
    const k = state.virtualSolReserves * state.virtualTokenReserves;
    const newSolReserves = state.virtualSolReserves + solIn;
    const newTokenReserves = k / newSolReserves;
    const tokensOut = state.virtualTokenReserves - newTokenReserves;
    const spotPrice = Number(state.virtualSolReserves) / Number(state.virtualTokenReserves);
    const avgPrice = Number(solIn) / Number(tokensOut || 1n);
    const priceImpactPct = spotPrice > 0 ? ((avgPrice - spotPrice) / spotPrice) * 100 : 0;
    return { tokensOut, priceImpactPct };
  }
}
