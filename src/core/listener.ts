import { Connection, PublicKey, Logs, Context } from '@solana/web3.js';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { PUMP_FUN_PROGRAM_ID, PUMP_FUN_BONDING_CURVE_SEED } from '../utils/constants.js';
import { PumpFunApiClient } from '../api/pumpfun-client.js';

export interface NewTokenEvent {
  signature: string;
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  creator: string;
  bondingCurve: string;
  timestamp: number;
  slot: number;
}

export interface PumpFunListenerConfig {
  wsEndpoint: string;
  commitment?: 'processed' | 'confirmed' | 'finalized';
  rapidApiKey?: string;
}

/**
 * Listens for new Pump.fun token creations in real-time
 */
export class PumpFunListener extends EventEmitter {
  private connection: Connection;
  private wsConnection?: Connection;
  private subscriptionId?: number;
  private isRunning = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private apiClient: PumpFunApiClient;

  constructor(private config: PumpFunListenerConfig) {
    super();
    this.connection = new Connection(config.wsEndpoint, {
      commitment: config.commitment || 'confirmed',
      wsEndpoint: config.wsEndpoint.replace('https://', 'wss://').replace('http://', 'ws://'),
    });
    this.apiClient = new PumpFunApiClient({
      rapidApiKey: config.rapidApiKey,
    });
  }

  /**
   * Start listening for new token events
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Listener already running');
      return;
    }

    this.isRunning = true;
    await this.subscribe();
    logger.info('🔊 Pump.fun listener started');
  }

  /**
   * Stop listening
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    
    if (this.subscriptionId !== undefined) {
      try {
        await this.connection.removeOnLogsListener(this.subscriptionId);
      } catch (err) {
        // Ignore unsubscribe errors
      }
      this.subscriptionId = undefined;
    }
    
    logger.info('Pump.fun listener stopped');
  }

  /**
   * Subscribe to Pump.fun program logs
   */
  private async subscribe(): Promise<void> {
    try {
      this.subscriptionId = this.connection.onLogs(
        PUMP_FUN_PROGRAM_ID,
        (logs: Logs, ctx: Context) => {
          this.handleLogs(logs, ctx).catch(err => {
            logger.error('Error handling logs', { error: String(err) });
          });
        },
        this.config.commitment || 'confirmed'
      );

      this.reconnectAttempts = 0;
      logger.debug('Subscribed to Pump.fun logs');

    } catch (err) {
      logger.error('Failed to subscribe to logs', { error: String(err) });
      await this.handleReconnect();
    }
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private async handleReconnect(): Promise<void> {
    if (!this.isRunning) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached');
      this.emit('error', new Error('Max reconnect attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    logger.warn(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (this.isRunning) {
      await this.subscribe();
    }
  }

  /**
   * Parse logs for new token creation events
   */
  private async handleLogs(logs: Logs, ctx: Context): Promise<void> {
    if (logs.err) return; // Skip failed transactions

    // Look for token creation events in logs
    const logMessages = logs.logs;
    
    // Pump.fun "create" instruction signature
    const isCreateEvent = logMessages.some(log => 
      log.includes('Program log: Instruction: Create') ||
      log.includes('Create')  // Simplified check
    );

    if (!isCreateEvent) return;

    try {
      // Parse the token creation event
      const tokenEvent = await this.parseCreateEvent(logs.signature, ctx.slot);
      
      if (tokenEvent) {
        logger.newToken(tokenEvent.symbol || tokenEvent.name, 0); // Score will be added later
        this.emit('newToken', tokenEvent);
      }
    } catch (err) {
      logger.debug('Failed to parse create event', { 
        signature: logs.signature, 
        error: String(err) 
      });
    }
  }

  /**
   * Parse a token creation transaction
   */
  private async parseCreateEvent(signature: string, slot: number): Promise<NewTokenEvent | null> {
    try {
      // Fetch full transaction details
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!tx || !tx.meta) return null;

      // Find the Pump.fun create instruction
      const instructions = tx.transaction.message.instructions;
      
      // Look for token mint in post-token balances
      const postBalances = tx.meta.postTokenBalances || [];
      
      // Find newly created token (will be first token balance for creator)
      const tokenBalance = postBalances.find(b => 
        b.uiTokenAmount.uiAmount === 0 || // New token
        b.owner && !b.owner.startsWith('11111') // Not system program
      );

      if (!tokenBalance) return null;

      const mint = tokenBalance.mint;

      // Get token metadata from Pump.fun API
      const metadata = await this.fetchTokenMetadata(mint);

      // Find creator (fee payer is usually the creator)
      const creator = metadata?.creator ||
        tx.transaction.message.accountKeys[0]?.pubkey?.toBase58() || '';

      // Derive bonding curve PDA (deterministic from mint)
      const bondingCurve = metadata?.bondingCurve || this.deriveBondingCurve(mint);

      return {
        signature,
        mint,
        name: metadata?.name || 'Unknown',
        symbol: metadata?.symbol || 'UNK',
        uri: metadata?.uri || '',
        creator,
        bondingCurve,
        timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
        slot,
      };
    } catch (err) {
      logger.debug('Failed to fetch transaction', { signature, error: String(err) });
      return null;
    }
  }

  /**
   * Fetch token metadata from Pump.fun API
   */
  private async fetchTokenMetadata(mint: string): Promise<{
    name: string;
    symbol: string;
    uri: string;
    creator?: string;
    bondingCurve?: string;
    twitter?: string;
    telegram?: string;
    website?: string;
  } | null> {
    try {
      // Fetch from Pump.fun API (supports both RapidAPI and direct)
      const tokenInfo = await this.apiClient.getTokenInfoRapidApi(mint);

      if (tokenInfo) {
        return {
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          uri: tokenInfo.metadata_uri || tokenInfo.image_uri || '',
          creator: tokenInfo.creator,
          bondingCurve: tokenInfo.bonding_curve,
          twitter: tokenInfo.twitter,
          telegram: tokenInfo.telegram,
          website: tokenInfo.website,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Derive bonding curve PDA from token mint
   */
  private deriveBondingCurve(mint: string): string {
    const mintPk = new PublicKey(mint);
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from(PUMP_FUN_BONDING_CURVE_SEED), mintPk.toBuffer()],
      PUMP_FUN_PROGRAM_ID
    );
    return bondingCurve.toBase58();
  }

  /**
   * Find bonding curve from transaction accounts or derive from mint
   */
  private findBondingCurve(tx: any, mint?: string): string | null {
    // Prefer derivation from mint (deterministic and correct)
    if (mint) {
      return this.deriveBondingCurve(mint);
    }

    // Fallback: look for PDA in transaction accounts
    const accounts = tx.transaction.message.accountKeys;
    for (const account of accounts) {
      const pubkey = account.pubkey?.toBase58?.() || account.toBase58?.();
      if (!pubkey) continue;
      // Skip system/token programs
      if (pubkey === '11111111111111111111111111111111' ||
          pubkey === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
        continue;
      }
      // Check if account is owned by Pump.fun program
      const accountMeta = account.source || account.owner;
      if (accountMeta === PUMP_FUN_PROGRAM_ID.toBase58()) {
        return pubkey;
      }
    }

    return null;
  }

  /**
   * Get connection for other operations
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Check if listener is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

/**
 * Alternative: Poll-based listener for when WebSocket is unavailable
 */
export class PumpFunPoller extends EventEmitter {
  private connection: Connection;
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastSignature?: string;
  private pollIntervalMs = 1000;

  constructor(rpcEndpoint: string) {
    super();
    this.connection = new Connection(rpcEndpoint, 'confirmed');
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    
    // Get initial signature
    const sigs = await this.connection.getSignaturesForAddress(PUMP_FUN_PROGRAM_ID, { limit: 1 });
    this.lastSignature = sigs[0]?.signature;

    this.pollInterval = setInterval(() => this.poll(), this.pollIntervalMs);
    logger.info('Pump.fun poller started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    logger.info('Pump.fun poller stopped');
  }

  private async poll(): Promise<void> {
    try {
      const sigs = await this.connection.getSignaturesForAddress(
        PUMP_FUN_PROGRAM_ID,
        { until: this.lastSignature, limit: 10 }
      );

      if (sigs.length > 0) {
        this.lastSignature = sigs[0].signature;

        // Process new signatures (oldest first)
        for (const sig of sigs.reverse()) {
          if (sig.err) continue;
          
          // Emit for processing
          this.emit('signature', sig.signature);
        }
      }
    } catch (err) {
      logger.error('Poll error', { error: String(err) });
    }
  }
}
