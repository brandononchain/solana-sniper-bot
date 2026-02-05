#!/usr/bin/env tsx
import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
import { SniperBot, type BotStatus } from '../core/bot.js';
import { loadConfig } from '../config.js';
import { logger, type LogEntry } from '../utils/logger.js';
import { getOpenPositions, getTodayStats } from '../db/schema.js';

// Header component
const Header: React.FC<{ status: BotStatus | null }> = ({ status }) => {
  const statusIcon = status?.isRunning ? '🟢' : '🔴';
  const statusText = status?.isRunning ? 'ACTIVE' : 'STOPPED';
  const walletShort = status?.activeWallet 
    ? `${status.activeWallet.slice(0, 4)}...${status.activeWallet.slice(-4)}` 
    : 'None';

  return (
    <Box borderStyle="single" borderColor="cyan" paddingX={1}>
      <Box width="33%">
        <Text>Status: {statusIcon} </Text>
        <Text color={status?.isRunning ? 'green' : 'red'}>{statusText}</Text>
      </Box>
      <Box width="33%" justifyContent="center">
        <Text>Wallet: </Text>
        <Text color="yellow">{walletShort}</Text>
      </Box>
      <Box width="33%" justifyContent="flex-end">
        <Text>Balance: </Text>
        <Text color="cyan">{status?.balance?.toFixed(4) || '0.0000'} SOL</Text>
      </Box>
    </Box>
  );
};

// Positions component
const Positions: React.FC<{ positions: any[] }> = ({ positions }) => {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
      <Text bold color="white">OPEN POSITIONS ({positions.length})</Text>
      <Box marginTop={1} flexDirection="column">
        {positions.length === 0 ? (
          <Text color="gray">No open positions</Text>
        ) : (
          positions.slice(0, 5).map((pos, i) => {
            const pnlPct = pos.currentPrice 
              ? ((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * 100 
              : 0;
            const pnlColor = pnlPct >= 0 ? 'green' : 'red';
            const symbol = pos.tokenSymbol || pos.tokenMint.slice(0, 6);
            
            return (
              <Box key={pos.id}>
                <Box width={12}>
                  <Text color="yellow">${symbol}</Text>
                </Box>
                <Box width={10}>
                  <Text color={pnlColor}>
                    {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                  </Text>
                </Box>
                <Box width={20}>
                  <Text color="gray">
                    {pos.costBasisSol.toFixed(3)} SOL
                  </Text>
                </Box>
                <Text color="gray">SL: -{pos.stopLossPct || 20}%</Text>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};

// Log feed component
const LogFeed: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} height={10}>
      <Text bold color="white">LIVE FEED</Text>
      <Box marginTop={1} flexDirection="column">
        {logs.slice(-7).map((log, i) => (
          <Text key={i} color={
            log.level === 'error' ? 'red' :
            log.level === 'warn' ? 'yellow' :
            log.level === 'info' ? 'blue' : 'gray'
          }>
            {log.timestamp} {log.message}
          </Text>
        ))}
      </Box>
    </Box>
  );
};

// Stats component
const Stats: React.FC<{ stats: any }> = ({ stats }) => {
  const winRate = stats.totalTrades > 0 
    ? ((stats.winningTrades / stats.totalTrades) * 100).toFixed(0) 
    : '0';
  const pnlColor = stats.realizedPnlSol >= 0 ? 'green' : 'red';

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1}>
      <Box width="25%">
        <Text>TODAY: </Text>
        <Text color={pnlColor}>
          {stats.realizedPnlSol >= 0 ? '+' : ''}{stats.realizedPnlSol.toFixed(4)} SOL
        </Text>
      </Box>
      <Box width="25%">
        <Text>TRADES: </Text>
        <Text color="white">{stats.totalTrades}</Text>
        <Text color="gray"> ({stats.winningTrades}W/{stats.losingTrades}L)</Text>
      </Box>
      <Box width="25%">
        <Text>WIN: </Text>
        <Text color={Number(winRate) >= 50 ? 'green' : 'red'}>{winRate}%</Text>
      </Box>
      <Box width="25%">
        <Text>SNIPED: </Text>
        <Text color="cyan">{stats.tokensSniped}</Text>
      </Box>
    </Box>
  );
};

// Help bar component
const HelpBar: React.FC = () => {
  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1}>
      <Text color="gray">
        <Text color="cyan">[S]</Text>tart/Stop  
        <Text color="cyan">[P]</Text>ause  
        <Text color="cyan">[K]</Text>ill All  
        <Text color="cyan">[W]</Text>allet  
        <Text color="cyan">[R]</Text>isk  
        <Text color="cyan">[H]</Text>elp  
        <Text color="cyan">[Q]</Text>uit
      </Text>
    </Box>
  );
};

// Settings modal
const SettingsModal: React.FC<{ 
  visible: boolean; 
  onClose: () => void;
  bot: SniperBot | null;
}> = ({ visible, onClose, bot }) => {
  if (!visible || !bot) return null;

  const riskStatus = bot.getRiskManager().getStatus();

  return (
    <Box 
      position="absolute" 
      marginLeft={10} 
      marginTop={5}
      borderStyle="double" 
      borderColor="yellow" 
      paddingX={2}
      paddingY={1}
      flexDirection="column"
    >
      <Text bold color="yellow">⚙️  RISK SETTINGS</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>Max Positions: {riskStatus.maxPositions}</Text>
        <Text>Open Positions: {riskStatus.openPositions}</Text>
        <Text>Daily P&L: {riskStatus.dailyPnl.toFixed(4)} SOL</Text>
        <Text>Max Daily Loss: {riskStatus.maxDailyLoss} SOL</Text>
        <Text>Consecutive Losses: {riskStatus.consecutiveLosses}</Text>
        <Text>Paused: {riskStatus.isPaused ? 'Yes' : 'No'}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">Press ESC to close</Text>
      </Box>
    </Box>
  );
};

// Main App
const App: React.FC = () => {
  const { exit } = useApp();
  const [bot, setBot] = useState<SniperBot | null>(null);
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<any>({});
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize bot
  useEffect(() => {
    const init = async () => {
      try {
        const config = loadConfig();
        logger.setLevel(config.logging.level as any);
        
        const sniperBot = new SniperBot(config);
        await sniperBot.initialize();
        
        setBot(sniperBot);
        setStatus(await sniperBot.getStatus());
        setLoading(false);

        // Subscribe to bot events
        sniperBot.on('status', setStatus);
        sniperBot.on('error', (err) => {
          setError(err.message);
          setTimeout(() => setError(null), 5000);
        });

        // Subscribe to logs
        logger.addListener((entry) => {
          setLogs(prev => [...prev.slice(-50), entry]);
        });

      } catch (err) {
        setError(String(err));
        setLoading(false);
      }
    };

    init();

    return () => {
      bot?.stop();
    };
  }, []);

  // Update positions and stats periodically
  useEffect(() => {
    if (!bot) return;

    const interval = setInterval(async () => {
      try {
        const db = (bot as any).db;
        setPositions(getOpenPositions(db));
        setStats(getTodayStats(db));
        setStatus(await bot.getStatus());
      } catch {
        // Ignore update errors
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [bot]);

  // Handle keyboard input
  useInput((input, key) => {
    if (showSettings && key.escape) {
      setShowSettings(false);
      return;
    }

    switch (input.toLowerCase()) {
      case 's':
        if (bot) {
          if (status?.isRunning) {
            bot.stop();
          } else {
            bot.start();
          }
        }
        break;
      case 'p':
        if (bot) {
          if (bot.getRiskManager().getStatus().isPaused) {
            bot.resume();
          } else {
            bot.pause();
          }
        }
        break;
      case 'k':
        bot?.closeAllPositions();
        break;
      case 'r':
        setShowSettings(!showSettings);
        break;
      case 'q':
        bot?.stop().then(() => exit());
        break;
    }
  });

  if (loading) {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> Initializing Solana Sniper Bot...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={80}>
      {/* Title */}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="cyan">🎯 SOLANA SNIPER BOT</Text>
      </Box>

      {/* Error message */}
      {error && (
        <Box borderStyle="single" borderColor="red" paddingX={1} marginBottom={1}>
          <Text color="red">❌ {error}</Text>
        </Box>
      )}

      {/* Header */}
      <Header status={status} />

      {/* Main content */}
      <Box marginTop={1}>
        {/* Positions */}
        <Positions positions={positions} />
      </Box>

      {/* Log feed */}
      <Box marginTop={1}>
        <LogFeed logs={logs} />
      </Box>

      {/* Stats */}
      <Box marginTop={1}>
        <Stats stats={stats} />
      </Box>

      {/* Help bar */}
      <Box marginTop={1}>
        <HelpBar />
      </Box>

      {/* Settings modal */}
      <SettingsModal 
        visible={showSettings} 
        onClose={() => setShowSettings(false)} 
        bot={bot}
      />
    </Box>
  );
};

// Run the app
render(<App />);
