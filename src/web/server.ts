/**
 * Web Dashboard Server
 * 
 * Provides a REST API and WebSocket for real-time monitoring.
 * Designed for mobile-friendly monitoring (read-heavy, minimal control).
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { getOpenPositions, getTodayStats } from '../db/schema.js';
import type { SniperBot, BotStatus } from '../core/bot.js';
import type { Database } from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface WebConfig {
  port: number;
  authToken: string;
}

export class WebDashboard {
  private server: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private bot: SniperBot;
  private db: Database;
  private config: WebConfig;
  private clients: Set<WebSocket> = new Set();

  constructor(bot: SniperBot, db: Database, config: WebConfig) {
    this.bot = bot;
    this.db = db;
    this.config = config;

    // Create HTTP server
    this.server = createServer((req, res) => this.handleRequest(req, res));

    // Create WebSocket server
    this.wss = new WebSocketServer({ server: this.server });
    this.wss.on('connection', (ws, req) => this.handleWebSocket(ws, req));

    // Subscribe to bot events
    this.setupBotEvents();
  }

  /**
   * Start the server
   */
  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, () => {
        logger.info(`🌐 Web dashboard running on http://localhost:${this.config.port}`);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close();
      this.server.close(() => resolve());
    });
  }

  /**
   * Handle HTTP requests
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const path = url.pathname;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Auth check for API routes
    if (path.startsWith('/api/') && this.config.authToken) {
      const auth = req.headers.authorization;
      if (auth !== `Bearer ${this.config.authToken}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
    }

    try {
      // Route handling
      if (path === '/' || path === '/index.html') {
        await this.serveHtml(res);
      } else if (path === '/api/status') {
        await this.apiStatus(res);
      } else if (path === '/api/positions') {
        await this.apiPositions(res);
      } else if (path === '/api/trades') {
        await this.apiTrades(req, res);
      } else if (path === '/api/stats') {
        await this.apiStats(req, res);
      } else if (path === '/api/wallet') {
        await this.apiWallet(res);
      } else if (path === '/api/control' && req.method === 'POST') {
        await this.apiControl(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (err) {
      logger.error('Web request error', { path, error: String(err) });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  /**
   * Serve the dashboard HTML
   */
  private async serveHtml(res: ServerResponse): Promise<void> {
    const html = this.getDashboardHtml();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  /**
   * API: Get bot status
   */
  private async apiStatus(res: ServerResponse): Promise<void> {
    const status = await this.bot.getStatus();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
  }

  /**
   * API: Get open positions
   */
  private async apiPositions(res: ServerResponse): Promise<void> {
    const positions = getOpenPositions(this.db);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(positions));
  }

  /**
   * API: Get recent trades
   */
  private async apiTrades(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const trades = this.db.prepare(`
      SELECT * FROM trades 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(limit);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(trades));
  }

  /**
   * API: Get statistics
   */
  private async apiStats(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const days = parseInt(url.searchParams.get('days') || '7');

    const stats = this.db.prepare(`
      SELECT * FROM daily_stats 
      ORDER BY date DESC 
      LIMIT ?
    `).all(days);

    const totals = this.db.prepare(`
      SELECT 
        SUM(total_trades) as totalTrades,
        SUM(winning_trades) as totalWins,
        SUM(losing_trades) as totalLosses,
        SUM(total_volume_sol) as totalVolume,
        SUM(realized_pnl_sol) as totalPnl
      FROM daily_stats
    `).get();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ daily: stats, totals }));
  }

  /**
   * API: Get wallet info
   */
  private async apiWallet(res: ServerResponse): Promise<void> {
    const wm = this.bot.getWalletManager();
    const wallet = wm.getActiveWallet();
    
    if (!wallet) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No active wallet' }));
      return;
    }

    const balance = await wm.getBalance(wallet.publicKey);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      publicKey: wallet.publicKey,
      balance: balance.sol,
      totalPnl: wallet.totalPnl,
    }));
  }

  /**
   * API: Control bot (start/stop/pause)
   */
  private async apiControl(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await this.readBody(req);
    const { action } = JSON.parse(body);

    switch (action) {
      case 'start':
        await this.bot.start();
        break;
      case 'stop':
        await this.bot.stop();
        break;
      case 'pause':
        this.bot.pause();
        break;
      case 'resume':
        this.bot.resume();
        break;
      case 'closeAll':
        await this.bot.closeAllPositions();
        break;
      default:
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unknown action' }));
        return;
    }

    const status = await this.bot.getStatus();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, status }));
  }

  /**
   * Handle WebSocket connections
   */
  private handleWebSocket(ws: WebSocket, req: IncomingMessage): void {
    // Auth check
    const url = new URL(req.url || '/', `ws://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (this.config.authToken && token !== this.config.authToken) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    this.clients.add(ws);
    logger.debug('WebSocket client connected', { clients: this.clients.size });

    // Send initial state
    this.bot.getStatus().then(status => {
      ws.send(JSON.stringify({ type: 'status', data: status }));
    });

    ws.on('close', () => {
      this.clients.delete(ws);
    });

    ws.on('error', () => {
      this.clients.delete(ws);
    });
  }

  /**
   * Broadcast to all WebSocket clients
   */
  private broadcast(type: string, data: unknown): void {
    const message = JSON.stringify({ type, data });
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  /**
   * Subscribe to bot events for broadcasting
   */
  private setupBotEvents(): void {
    this.bot.on('status', (status: BotStatus) => {
      this.broadcast('status', status);
    });

    this.bot.on('newToken', (event, analysis) => {
      this.broadcast('newToken', { event, analysis });
    });

    this.bot.on('trade', (type, result) => {
      this.broadcast('trade', { type, ...result });
    });

    this.bot.on('position', (update) => {
      this.broadcast('position', update);
    });

    // Also broadcast log entries
    logger.addListener((entry) => {
      this.broadcast('log', entry);
    });
  }

  /**
   * Read request body
   */
  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }

  /**
   * Get the dashboard HTML (embedded for simplicity)
   */
  private getDashboardHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🎯 Solana Sniper Bot</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0f;
      color: #e0e0e0;
      min-height: 100vh;
      padding: 1rem;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { text-align: center; margin-bottom: 1rem; color: #00d4ff; }
    .card {
      background: #1a1a2e;
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 1rem;
      border: 1px solid #2a2a4e;
    }
    .card-title {
      font-size: 0.875rem;
      color: #888;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
    }
    .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid #2a2a4e;
    }
    .status-row:last-child { border-bottom: none; }
    .status-label { color: #888; }
    .status-value { font-weight: 600; }
    .status-value.positive { color: #00ff88; }
    .status-value.negative { color: #ff4444; }
    .status-value.active { color: #00ff88; }
    .status-value.inactive { color: #ff4444; }
    .positions { max-height: 300px; overflow-y: auto; }
    .position {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem;
      background: #0a0a15;
      border-radius: 8px;
      margin-bottom: 0.5rem;
    }
    .position-token { font-weight: 600; color: #00d4ff; }
    .position-pnl { font-weight: 600; }
    .logs {
      max-height: 200px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 0.75rem;
      background: #0a0a15;
      padding: 0.5rem;
      border-radius: 8px;
    }
    .log-entry { padding: 0.25rem 0; border-bottom: 1px solid #1a1a2e; }
    .log-time { color: #666; }
    .log-info { color: #00d4ff; }
    .log-warn { color: #ffaa00; }
    .log-error { color: #ff4444; }
    .controls {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.1s, opacity 0.1s;
    }
    button:active { transform: scale(0.98); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-start { background: #00ff88; color: #000; }
    .btn-stop { background: #ff4444; color: #fff; }
    .btn-pause { background: #ffaa00; color: #000; }
    .btn-danger { background: #ff0044; color: #fff; }
    @media (max-width: 600px) {
      .status-row { flex-direction: column; align-items: flex-start; gap: 0.25rem; }
      button { flex: 1; min-width: 45%; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎯 Solana Sniper Bot</h1>
    
    <div class="card">
      <div class="card-title">Status</div>
      <div class="status-row">
        <span class="status-label">Bot Status</span>
        <span id="botStatus" class="status-value">Loading...</span>
      </div>
      <div class="status-row">
        <span class="status-label">Wallet</span>
        <span id="wallet" class="status-value">-</span>
      </div>
      <div class="status-row">
        <span class="status-label">Balance</span>
        <span id="balance" class="status-value">-</span>
      </div>
      <div class="status-row">
        <span class="status-label">Today's P&L</span>
        <span id="todayPnl" class="status-value">-</span>
      </div>
      <div class="status-row">
        <span class="status-label">Open Positions</span>
        <span id="openPositions" class="status-value">-</span>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Controls</div>
      <div class="controls">
        <button id="btnStart" class="btn-start" onclick="control('start')">▶ Start</button>
        <button id="btnStop" class="btn-stop" onclick="control('stop')">■ Stop</button>
        <button id="btnPause" class="btn-pause" onclick="control('pause')">⏸ Pause</button>
        <button id="btnCloseAll" class="btn-danger" onclick="if(confirm('Close all positions?'))control('closeAll')">🚨 Close All</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Open Positions</div>
      <div id="positionsList" class="positions">
        <div style="color:#666;text-align:center;padding:1rem;">No positions</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Live Feed</div>
      <div id="logs" class="logs"></div>
    </div>
  </div>

  <script>
    const API_TOKEN = new URLSearchParams(location.search).get('token') || '';
    const API_BASE = location.origin;
    const WS_URL = location.protocol === 'https:' 
      ? 'wss://' + location.host + '?token=' + API_TOKEN
      : 'ws://' + location.host + '?token=' + API_TOKEN;

    let ws;
    const logs = [];

    function connectWS() {
      ws = new WebSocket(WS_URL);
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        handleMessage(msg);
      };
      ws.onclose = () => setTimeout(connectWS, 3000);
      ws.onerror = () => ws.close();
    }

    function handleMessage(msg) {
      switch(msg.type) {
        case 'status':
          updateStatus(msg.data);
          break;
        case 'log':
          addLog(msg.data);
          break;
        case 'trade':
          addLog({ level: 'info', message: \`\${msg.type === 'buy' ? '🟢' : '🔴'} \${msg.data.token}: \${msg.data.amountIn} SOL\`, timestamp: new Date().toLocaleTimeString() });
          break;
      }
    }

    function updateStatus(status) {
      document.getElementById('botStatus').textContent = status.isRunning ? '🟢 ACTIVE' : '🔴 STOPPED';
      document.getElementById('botStatus').className = 'status-value ' + (status.isRunning ? 'active' : 'inactive');
      document.getElementById('wallet').textContent = status.activeWallet ? status.activeWallet.slice(0,4) + '...' + status.activeWallet.slice(-4) : '-';
      document.getElementById('balance').textContent = status.balance?.toFixed(4) + ' SOL' || '-';
      
      const pnl = status.todayPnl || 0;
      document.getElementById('todayPnl').textContent = (pnl >= 0 ? '+' : '') + pnl.toFixed(4) + ' SOL';
      document.getElementById('todayPnl').className = 'status-value ' + (pnl >= 0 ? 'positive' : 'negative');
      
      document.getElementById('openPositions').textContent = status.openPositions || 0;
    }

    function addLog(entry) {
      logs.unshift(entry);
      if (logs.length > 50) logs.pop();
      renderLogs();
    }

    function renderLogs() {
      const el = document.getElementById('logs');
      el.innerHTML = logs.map(l => 
        \`<div class="log-entry"><span class="log-time">\${l.timestamp}</span> <span class="log-\${l.level}">\${l.message}</span></div>\`
      ).join('');
    }

    async function control(action) {
      try {
        const res = await fetch(API_BASE + '/api/control', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + API_TOKEN
          },
          body: JSON.stringify({ action })
        });
        const data = await res.json();
        if (data.status) updateStatus(data.status);
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    async function loadPositions() {
      try {
        const res = await fetch(API_BASE + '/api/positions', {
          headers: { 'Authorization': 'Bearer ' + API_TOKEN }
        });
        const positions = await res.json();
        const el = document.getElementById('positionsList');
        if (positions.length === 0) {
          el.innerHTML = '<div style="color:#666;text-align:center;padding:1rem;">No positions</div>';
        } else {
          el.innerHTML = positions.map(p => {
            const pnl = p.currentPrice ? ((p.currentPrice - p.entryPrice) / p.entryPrice * 100) : 0;
            return \`<div class="position">
              <span class="position-token">\${p.tokenSymbol || p.tokenMint.slice(0,6)}</span>
              <span class="position-pnl" style="color:\${pnl >= 0 ? '#00ff88' : '#ff4444'}">\${pnl >= 0 ? '+' : ''}\${pnl.toFixed(1)}%</span>
            </div>\`;
          }).join('');
        }
      } catch (err) {
        console.error('Failed to load positions:', err);
      }
    }

    // Initial load
    connectWS();
    loadPositions();
    setInterval(loadPositions, 5000);
  </script>
</body>
</html>`;
  }
}
