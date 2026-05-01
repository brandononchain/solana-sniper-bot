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
  fastMode?: boolean;
}

function toHttpEndpoint(endpoint: string): string {
  return endpoint.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
}

function toWsEndpoint(endpoint: string): string {
  return endpoint.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
}

/**
 * Listens for new Pump.fun token creations in real-time.
 *
 * fastMode avoids metadata API calls on the hot path. It emits deterministic mint/bonding-curve
 * data as soon as the parsed transaction is available, then lets the buy path decide quickly.
 */
export class PumpFunListener extends EventEmitter {
  private connection: Connection;
  private subscriptionId?: number;
  private isRunning = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private apiClient: PumpFunApiClient;
  private seenSignatures = new Set<string>();

  constructor(private config: PumpFunListenerConfig) {
    super();
    const rpcEndpoint = toHttpEndpoint(config.wsEndpoint);
    const wsEndpoint = toWsEndpoint(config.wsEndpoint);
    this.connection = new Connection(rpcEndpoint, {
      commitment: config.commitment || 'processed',
      wsEndpoint,
    });
    this.apiClient = new PumpFunApiClient({ rapidApiKey: config.rapidApiKey });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Listener already running');
      return;
    }
    this.isRunning = true;
    await this.subscribe();
    logger.info('🔊 Pump.fun listener started', { commitment: this.config.commitment || 'processed', fastMode: !!this.config.fastMode });
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.subscriptionId !== undefined) {
      try { await this.connection.removeOnLogsListener(this.subscriptionId); } catch {}
      this.subscriptionId = undefined;
    }
    logger.info('Pump.fun listener stopped');
  }

  private async subscribe(): Promise<void> {
    try {
      this.subscriptionId = this.connection.onLogs(
        PUMP_FUN_PROGRAM_ID,
        (logs: Logs, ctx: Context) => {
          void this.handleLogs(logs, ctx).catch(err => logger.error('Error handling logs', { error: String(err) }));
        },
        this.config.commitment || 'processed'
      );
      this.reconnectAttempts = 0;
      logger.debug('Subscribed to Pump.fun logs');
    } catch (err) {
      logger.error('Failed to subscribe to logs', { error: String(err) });
      await this.handleReconnect();
    }
  }

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
    if (this.isRunning) await this.subscribe();
  }

  private async handleLogs(logs: Logs, ctx: Context): Promise<void> {
    if (logs.err || this.seenSignatures.has(logs.signature)) return;
    this.seenSignatures.add(logs.signature);
    if (this.seenSignatures.size > 5_000) this.seenSignatures.clear();

    const isCreateEvent = logs.logs.some(log =>
      log.includes('Program log: Instruction: Create') ||
      log.includes('Instruction: Create')
    );
    if (!isCreateEvent) return;

    try {
      const tokenEvent = await this.parseCreateEvent(logs.signature, ctx.slot);
      if (tokenEvent) {
        logger.newToken(tokenEvent.symbol || tokenEvent.name, 0);
        this.emit('newToken', tokenEvent);
      }
    } catch (err) {
      logger.debug('Failed to parse create event', { signature: logs.signature, error: String(err) });
    }
  }

  private async parseCreateEvent(signature: string, slot: number): Promise<NewTokenEvent | null> {
    try {
      const tx = await this.connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: this.config.commitment || 'processed',
      });
      if (!tx || !tx.meta) return null;

      const postBalances = tx.meta.postTokenBalances || [];
      const tokenBalance = postBalances.find(b => b.mint && b.uiTokenAmount.decimals === 6);
      if (!tokenBalance) return null;

      const mint = tokenBalance.mint;
      const creator = tx.transaction.message.accountKeys[0]?.pubkey?.toBase58() || tokenBalance.owner || '';
      const bondingCurve = this.deriveBondingCurve(mint);

      if (this.config.fastMode) {
        return {
          signature,
          mint,
          name: mint.slice(0, 8),
          symbol: mint.slice(0, 4).toUpperCase(),
          uri: '',
          creator,
          bondingCurve,
          timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
          slot,
        };
      }

      const metadata = await this.fetchTokenMetadata(mint);
      return {
        signature,
        mint,
        name: metadata?.name || mint.slice(0, 8),
        symbol: metadata?.symbol || mint.slice(0, 4).toUpperCase(),
        uri: metadata?.uri || '',
        creator: metadata?.creator || creator,
        bondingCurve: metadata?.bondingCurve || bondingCurve,
        timestamp: tx.blockTime ? tx.blockTime * 1000 : Date.now(),
        slot,
      };
    } catch (err) {
      logger.debug('Failed to fetch transaction', { signature, error: String(err) });
      return null;
    }
  }

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
      const tokenInfo = await this.apiClient.getTokenInfoRapidApi(mint);
      if (!tokenInfo) return null;
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
    } catch {
      return null;
    }
  }

  private deriveBondingCurve(mint: string): string {
    const mintPk = new PublicKey(mint);
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from(PUMP_FUN_BONDING_CURVE_SEED), mintPk.toBuffer()],
      PUMP_FUN_PROGRAM_ID
    );
    return bondingCurve.toBase58();
  }

  getConnection(): Connection { return this.connection; }
  isActive(): boolean { return this.isRunning; }
}

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
    const sigs = await this.connection.getSignaturesForAddress(PUMP_FUN_PROGRAM_ID, { limit: 1 });
    this.lastSignature = sigs[0]?.signature;
    this.pollInterval = setInterval(() => void this.poll(), this.pollIntervalMs);
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
      const sigs = await this.connection.getSignaturesForAddress(PUMP_FUN_PROGRAM_ID, { until: this.lastSignature, limit: 10 });
      if (sigs.length > 0) {
        this.lastSignature = sigs[0].signature;
        for (const sig of sigs.reverse()) {
          if (!sig.err) this.emit('signature', sig.signature);
        }
      }
    } catch (err) {
      logger.error('Poll error', { error: String(err) });
    }
  }
}
