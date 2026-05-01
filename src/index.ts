#!/usr/bin/env node
import { Command } from 'commander';
import { loadConfig, validateRpc } from './config.js';
import { SniperBot } from './core/bot.js';
import { initializeDatabase } from './db/schema.js';

const program = new Command();

program
  .name('solana-sniper')
  .description('High-performance Pump.fun memecoin sniper bot')
  .version('1.0.0');

program
  .command('start', { isDefault: true })
  .description('Start the sniper bot')
  .option('-c, --config <path>', 'Config file path', 'config.yaml')
  .option('--headless', 'Run without TUI')
  .option('--paper', 'Run in paper trading mode without submitting live transactions')
  .option('--paper-balance <sol>', 'Starting paper balance in SOL', '1')
  .action(async (options) => {
    try {
      const config = loadConfig(options.config);
      const rpcValid = await validateRpc(config.rpc.primary);
      if (!rpcValid) {
        console.error('Failed to connect to RPC. Check your config.');
        process.exit(1);
      }

      const paper = Boolean(options.paper);
      const paperStartingBalanceSol = Number.parseFloat(options.paperBalance || '1');

      if (options.headless || paper) {
        const bot = new SniperBot(config, paper ? 'data/paper-bot.db' : 'data/bot.db', {
          paper,
          paperStartingBalanceSol: Number.isFinite(paperStartingBalanceSol) ? paperStartingBalanceSol : 1,
        });
        await bot.initialize();
        await bot.start();

        process.on('SIGINT', async () => {
          console.log('\nShutting down...');
          await bot.stop();
          process.exit(0);
        });

        console.log(paper
          ? 'Bot running in paper mode. Press Ctrl+C to stop.'
          : 'Bot running in headless mode. Press Ctrl+C to stop.'
        );
      } else {
        const { spawn } = await import('child_process');
        const tui = spawn('npx', ['tsx', 'src/tui/app.tsx'], { stdio: 'inherit', cwd: process.cwd() });
        tui.on('exit', (code) => process.exit(code || 0));
      }
    } catch (err) {
      console.error('Failed to start:', err);
      process.exit(1);
    }
  });

program
  .command('setup')
  .description('Interactive setup wizard')
  .action(async () => {
    console.log('Solana Sniper Bot Setup\n');
    const { createInterface } = await import('readline');
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const question = (q: string): Promise<string> => new Promise(resolve => rl.question(q, resolve));

    try {
      const { existsSync, copyFileSync, readFileSync, writeFileSync } = await import('fs');
      if (!existsSync('config.yaml')) {
        console.log('Creating config.yaml from template...');
        copyFileSync('config.example.yaml', 'config.yaml');
      }

      console.log('\nRPC Configuration');
      const rpcUrl = await question('Enter your RPC URL: ');
      if (rpcUrl) {
        let configContent = readFileSync('config.yaml', 'utf-8');
        configContent = configContent.replace(/primary: ".*"/, `primary: "${rpcUrl}"`);
        configContent = configContent.replace(/ws: ".*"/, `ws: "${rpcUrl.replace('https://', 'wss://')}"`);
        writeFileSync('config.yaml', configContent);
        console.log('RPC configured');
      }

      console.log('\nWallet Encryption');
      const password = await question('Enter encryption password for wallets, minimum 8 characters: ');
      if (password && password.length >= 8) {
        let configContent = readFileSync('config.yaml', 'utf-8');
        configContent = configContent.replace(/encryption_password: ".*"/, `encryption_password: "${password}"`);
        writeFileSync('config.yaml', configContent);
        console.log('Password set');
      }

      console.log('\nTrading Settings');
      const amountSol = await question('SOL amount per trade, default 0.05: ');
      if (amountSol) {
        let configContent = readFileSync('config.yaml', 'utf-8');
        configContent = configContent.replace(/amount_sol: [\d.]+/, `amount_sol: ${parseFloat(amountSol)}`);
        writeFileSync('config.yaml', configContent);
      }

      console.log('\nInitializing database...');
      initializeDatabase('data/bot.db');
      console.log('Database ready');

      console.log('\nGenerating wallet...');
      const config = loadConfig();
      const bot = new SniperBot(config);
      await bot.initialize();
      const wallet = bot.getWalletManager().getActiveWallet();
      console.log('\nYOUR TRADING WALLET:');
      console.log(wallet?.publicKey);
      console.log('\nSend only small test SOL to this burner wallet.');
      console.log('\nSetup complete. Run `npm start` to begin or `npm run paper` to test.');
    } catch (err) {
      console.error('Setup error:', err);
    } finally {
      rl.close();
    }
  });

program
  .command('wallet')
  .description('Wallet management')
  .option('-l, --list', 'List all wallets')
  .option('-n, --new [label]', 'Create new burner wallet')
  .option('-b, --balance', 'Show active wallet balance')
  .option('-s, --sweep <address>', 'Sweep funds to address')
  .action(async (options) => {
    const config = loadConfig();
    const bot = new SniperBot(config);
    await bot.initialize();
    const wm = bot.getWalletManager();

    if (options.list) {
      const wallets = wm.getAllWallets();
      console.log('\nWallets:\n');
      for (const w of wallets) {
        const balance = await wm.getBalance(w.publicKey);
        const active = w.isActive ? '[active]' : '        ';
        console.log(`${active} ${w.publicKey}`);
        console.log(`   Balance: ${balance.sol.toFixed(4)} SOL | PnL: ${w.totalPnl.toFixed(4)} SOL`);
        console.log(`   Label: ${w.label || 'none'} | Created: ${w.createdAt}\n`);
      }
    }

    if (options.new !== undefined) {
      const label = typeof options.new === 'string' ? options.new : undefined;
      const wallet = await wm.createBurnerWallet(label);
      console.log('\nNew wallet created:');
      console.log(wallet.publicKey);
    }

    if (options.balance) {
      const balance = await wm.getActiveBalance();
      const wallet = wm.getActiveWallet();
      console.log(`\nActive Wallet: ${wallet?.publicKey}`);
      console.log(`Balance: ${balance.sol.toFixed(4)} SOL`);
    }

    if (options.sweep) {
      const sig = await wm.sweepToColdWallet(options.sweep);
      if (sig) {
        console.log(`\nSwept to ${options.sweep}`);
        console.log(`Signature: ${sig}`);
      }
    }
  });

program
  .command('stats')
  .description('Show trading statistics')
  .option('-d, --days <n>', 'Days of history', '7')
  .action(async (options) => {
    const { default: Database } = await import('better-sqlite3');
    const db = new Database('data/bot.db');
    const days = parseInt(options.days);
    const stats = db.prepare(`
      SELECT date, total_trades, winning_trades, losing_trades, total_volume_sol,
             realized_pnl_sol, tokens_sniped, rugs_avoided
      FROM daily_stats ORDER BY date DESC LIMIT ?
    `).all(days) as any[];

    console.log('\nTrading Statistics\n');
    console.log('Date       | Trades | W/L    | Volume   | PnL      | Sniped | Rugs Avoided');
    console.log('-'.repeat(80));
    let totalPnl = 0;
    let totalTrades = 0;
    let totalWins = 0;
    for (const s of stats.reverse()) {
      totalPnl += s.realized_pnl_sol;
      totalTrades += s.total_trades;
      totalWins += s.winning_trades;
      console.log(
        `${s.date} | ${String(s.total_trades).padStart(6)} | ${s.winning_trades}/${s.losing_trades}`.padEnd(25) +
        ` | ${s.total_volume_sol.toFixed(2).padStart(8)} | ${s.realized_pnl_sol.toFixed(4).padStart(8)}` +
        ` | ${String(s.tokens_sniped).padStart(6)} | ${s.rugs_avoided}`
      );
    }
    console.log('-'.repeat(80));
    const winRate = totalTrades > 0 ? (totalWins / totalTrades * 100).toFixed(1) : '0';
    console.log(`\nTotal PnL: ${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(4)} SOL`);
    console.log(`Win Rate: ${winRate}%`);
    db.close();
  });

program
  .command('config')
  .description('View configuration')
  .option('-s, --show', 'Show current config')
  .action(async (options) => {
    if (options.show) {
      const { readFileSync } = await import('fs');
      console.log(readFileSync('config.yaml', 'utf-8'));
    }
  });

program.parse();
