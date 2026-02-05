/**
 * Strategy Index
 * 
 * Exports all available trading strategies
 */

export { TradingStrategy, StrategyDecision, ExitDecision, StrategyContext, StrategyRegistry } from './base.js';
export { MomentumStrategy } from './momentum.js';
export { SniperStrategy } from './sniper.js';
export { ConservativeStrategy } from './conservative.js';
export { DegenStrategy } from './degen.js';

import { StrategyRegistry } from './base.js';
import { MomentumStrategy } from './momentum.js';
import { SniperStrategy } from './sniper.js';
import { ConservativeStrategy } from './conservative.js';
import { DegenStrategy } from './degen.js';

/**
 * Create a strategy registry with all built-in strategies
 */
export function createStrategyRegistry(): StrategyRegistry {
  const registry = new StrategyRegistry();
  
  registry.register(new MomentumStrategy());
  registry.register(new SniperStrategy());
  registry.register(new ConservativeStrategy());
  registry.register(new DegenStrategy());
  
  return registry;
}

/**
 * Get strategy by name
 */
export function getStrategy(name: string) {
  const registry = createStrategyRegistry();
  registry.setActive(name);
  return registry.getActive();
}
