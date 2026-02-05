import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import bs58 from 'bs58';
import { nanoid } from 'nanoid';
import { encrypt, decrypt } from './crypto.js';
import { logger } from '../utils/logger.js';
import type { Database } from 'better-sqlite3';

export interface Wallet {
  id: string;
  publicKey: string;
  encryptedPrivateKey: string;
  createdAt: Date;
  isActive: boolean;
  totalPnl: number;
  label?: string;
}

export interface WalletBalance {
  sol: number;
  lamports: bigint;
}

export class WalletManager {
  private connection: Connection;
  private db: Database;
  private password: string;
  private activeWallet?: Keypair;
  private masterSeed?: Buffer;

  constructor(connection: Connection, db: Database, password: string) {
    this.connection = connection;
    this.db = db;
    this.password = password;
  }

  /**
   * Initialize with an existing mnemonic or generate new one
   */
  async initialize(mnemonic?: string): Promise<string> {
    if (!mnemonic) {
      mnemonic = bip39.generateMnemonic(256); // 24 words
    }
    
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    this.masterSeed = await bip39.mnemonicToSeed(mnemonic);
    
    // Store encrypted mnemonic in config
    const encryptedMnemonic = encrypt(mnemonic, this.password);
    this.db.prepare(`
      INSERT OR REPLACE INTO config (key, value, updated_at)
      VALUES ('master_mnemonic', ?, datetime('now'))
    `).run(encryptedMnemonic);

    logger.info('Wallet manager initialized');
    return mnemonic;
  }

  /**
   * Load existing master seed from database
   */
  async loadMasterSeed(): Promise<boolean> {
    const row = this.db.prepare(
      `SELECT value FROM config WHERE key = 'master_mnemonic'`
    ).get() as { value: string } | undefined;

    if (!row) return false;

    try {
      const mnemonic = decrypt(row.value, this.password);
      this.masterSeed = await bip39.mnemonicToSeed(mnemonic);
      return true;
    } catch (err) {
      logger.error('Failed to decrypt master seed - wrong password?');
      return false;
    }
  }

  /**
   * Generate a new burner wallet derived from master seed
   */
  async createBurnerWallet(label?: string): Promise<Wallet> {
    if (!this.masterSeed) {
      throw new Error('Master seed not initialized');
    }

    // Get next derivation index
    const countRow = this.db.prepare(
      `SELECT COUNT(*) as count FROM wallets`
    ).get() as { count: number };
    const index = countRow.count;

    // Derive keypair using BIP44 path for Solana
    const path = `m/44'/501'/${index}'/0'`;
    const derived = derivePath(path, this.masterSeed.toString('hex'));
    const keypair = Keypair.fromSeed(derived.key);

    // Encrypt private key
    const privateKeyBase58 = bs58.encode(keypair.secretKey);
    const encryptedPrivateKey = encrypt(privateKeyBase58, this.password);

    const wallet: Wallet = {
      id: nanoid(),
      publicKey: keypair.publicKey.toBase58(),
      encryptedPrivateKey,
      createdAt: new Date(),
      isActive: true,
      totalPnl: 0,
      label,
    };

    // Store in database
    this.db.prepare(`
      INSERT INTO wallets (id, public_key, encrypted_private_key, created_at, is_active, total_pnl, label)
      VALUES (?, ?, ?, datetime('now'), 1, 0, ?)
    `).run(wallet.id, wallet.publicKey, wallet.encryptedPrivateKey, label || null);

    logger.info(`Created burner wallet: ${wallet.publicKey.slice(0, 8)}...${wallet.publicKey.slice(-4)}`);
    return wallet;
  }

  /**
   * Get keypair for a wallet
   */
  getKeypair(wallet: Wallet): Keypair {
    const privateKeyBase58 = decrypt(wallet.encryptedPrivateKey, this.password);
    const secretKey = bs58.decode(privateKeyBase58);
    return Keypair.fromSecretKey(secretKey);
  }

  /**
   * Set the active wallet for trading
   */
  async setActiveWallet(walletId: string): Promise<void> {
    const wallet = this.getWalletById(walletId);
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }

    // Deactivate all wallets
    this.db.prepare(`UPDATE wallets SET is_active = 0`).run();
    
    // Activate selected wallet
    this.db.prepare(`UPDATE wallets SET is_active = 1 WHERE id = ?`).run(walletId);
    
    this.activeWallet = this.getKeypair(wallet);
    logger.info(`Active wallet set to: ${wallet.publicKey.slice(0, 8)}...`);
  }

  /**
   * Get the currently active wallet keypair
   */
  getActiveKeypair(): Keypair {
    if (!this.activeWallet) {
      throw new Error('No active wallet set');
    }
    return this.activeWallet;
  }

  /**
   * Get active wallet info
   */
  getActiveWallet(): Wallet | undefined {
    const row = this.db.prepare(`
      SELECT id, public_key as publicKey, encrypted_private_key as encryptedPrivateKey,
             created_at as createdAt, is_active as isActive, total_pnl as totalPnl, label
      FROM wallets WHERE is_active = 1
    `).get() as Wallet | undefined;
    return row;
  }

  /**
   * Get wallet by ID
   */
  getWalletById(id: string): Wallet | undefined {
    const row = this.db.prepare(`
      SELECT id, public_key as publicKey, encrypted_private_key as encryptedPrivateKey,
             created_at as createdAt, is_active as isActive, total_pnl as totalPnl, label
      FROM wallets WHERE id = ?
    `).get(id) as Wallet | undefined;
    return row;
  }

  /**
   * Get all wallets
   */
  getAllWallets(): Wallet[] {
    return this.db.prepare(`
      SELECT id, public_key as publicKey, encrypted_private_key as encryptedPrivateKey,
             created_at as createdAt, is_active as isActive, total_pnl as totalPnl, label
      FROM wallets ORDER BY created_at DESC
    `).all() as Wallet[];
  }

  /**
   * Get wallet balance
   */
  async getBalance(publicKey: string | PublicKey): Promise<WalletBalance> {
    const pk = typeof publicKey === 'string' ? new PublicKey(publicKey) : publicKey;
    const lamports = await this.connection.getBalance(pk);
    return {
      lamports: BigInt(lamports),
      sol: lamports / LAMPORTS_PER_SOL,
    };
  }

  /**
   * Get active wallet balance
   */
  async getActiveBalance(): Promise<WalletBalance> {
    const wallet = this.getActiveWallet();
    if (!wallet) {
      throw new Error('No active wallet');
    }
    return this.getBalance(wallet.publicKey);
  }

  /**
   * Update wallet P&L
   */
  updatePnl(walletId: string, pnlChange: number): void {
    this.db.prepare(`
      UPDATE wallets SET total_pnl = total_pnl + ? WHERE id = ?
    `).run(pnlChange, walletId);
  }

  /**
   * Sweep funds to cold wallet
   */
  async sweepToColdWallet(
    coldWalletAddress: string,
    leaveBalanceSol = 0.01
  ): Promise<string | null> {
    const { Connection, SystemProgram, Transaction, sendAndConfirmTransaction } = await import('@solana/web3.js');
    
    const activeWallet = this.getActiveWallet();
    if (!activeWallet) {
      throw new Error('No active wallet');
    }

    const balance = await this.getBalance(activeWallet.publicKey);
    const leaveAmount = leaveBalanceSol * LAMPORTS_PER_SOL;
    const sweepAmount = Number(balance.lamports) - leaveAmount - 5000; // 5000 for tx fee

    if (sweepAmount <= 0) {
      logger.warn('Insufficient balance to sweep');
      return null;
    }

    const keypair = this.getKeypair(activeWallet);
    const coldWallet = new PublicKey(coldWalletAddress);

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: coldWallet,
        lamports: sweepAmount,
      })
    );

    try {
      const signature = await sendAndConfirmTransaction(this.connection, tx, [keypair]);
      logger.info(`Swept ${(sweepAmount / LAMPORTS_PER_SOL).toFixed(4)} SOL to cold wallet`, {
        signature,
        coldWallet: coldWalletAddress,
      });
      return signature;
    } catch (err) {
      logger.error('Failed to sweep funds', { error: String(err) });
      throw err;
    }
  }

  /**
   * Export wallet (for backup)
   */
  exportWallet(walletId: string): { publicKey: string; privateKey: string } {
    const wallet = this.getWalletById(walletId);
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletId}`);
    }
    const privateKey = decrypt(wallet.encryptedPrivateKey, this.password);
    return {
      publicKey: wallet.publicKey,
      privateKey,
    };
  }

  /**
   * Import an existing wallet
   */
  async importWallet(privateKeyBase58: string, label?: string): Promise<Wallet> {
    const secretKey = bs58.decode(privateKeyBase58);
    const keypair = Keypair.fromSecretKey(secretKey);
    const encryptedPrivateKey = encrypt(privateKeyBase58, this.password);

    const wallet: Wallet = {
      id: nanoid(),
      publicKey: keypair.publicKey.toBase58(),
      encryptedPrivateKey,
      createdAt: new Date(),
      isActive: false,
      totalPnl: 0,
      label,
    };

    this.db.prepare(`
      INSERT INTO wallets (id, public_key, encrypted_private_key, created_at, is_active, total_pnl, label)
      VALUES (?, ?, ?, datetime('now'), 0, 0, ?)
    `).run(wallet.id, wallet.publicKey, wallet.encryptedPrivateKey, label || null);

    logger.info(`Imported wallet: ${wallet.publicKey.slice(0, 8)}...`);
    return wallet;
  }
}
