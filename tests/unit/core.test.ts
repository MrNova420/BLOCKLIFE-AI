/**
 * BlockLife AI - Basic Test
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 */

import { BotManager } from '../../src/bots/bot-manager';
import { BotAgent } from '../../src/bots/bot-agent';
import { SimEngine } from '../../src/simulation/sim-engine';
import { StubAiClient } from '../../src/mind/ai-client';
import { Role, ThreatLevel } from '../../src/types';

describe('BlockLife Core Systems', () => {
  
  describe('BotAgent', () => {
    it('should create a bot with default values', () => {
      const bot = new BotAgent({
        villageId: 'test-village',
        position: { x: 0, y: 64, z: 0 }
      });
      
      expect(bot.id).toBeDefined();
      expect(bot.name).toBeDefined();
      expect(bot.getRole()).toBe(Role.UNASSIGNED);
      expect(bot.isDead()).toBe(false);
    });

    it('should update needs over time', () => {
      const bot = new BotAgent({
        villageId: 'test-village',
        position: { x: 0, y: 64, z: 0 }
      });
      
      const initialHunger = bot.getNeeds().hunger;
      bot.updateNeeds(60000); // 1 minute
      
      expect(bot.getNeeds().hunger).toBeGreaterThan(initialHunger);
    });

    it('should apply decisions', () => {
      const bot = new BotAgent({
        villageId: 'test-village',
        position: { x: 0, y: 64, z: 0 }
      });
      
      bot.applyDecision({
        id: bot.id,
        intent: 'TEND_FARM'
      });
      
      expect(bot.isIdle()).toBe(false);
    });
  });

  describe('BotManager', () => {
    it('should create and track bots', () => {
      const manager = new BotManager();
      
      const bot = manager.createBot({
        villageId: 'test-village',
        position: { x: 0, y: 64, z: 0 }
      });
      
      expect(manager.getBotCount()).toBe(1);
      expect(manager.getBot(bot.id)).toBe(bot);
    });

    it('should filter bots by village', () => {
      const manager = new BotManager();
      
      manager.createBot({
        villageId: 'village-1',
        position: { x: 0, y: 64, z: 0 }
      });
      
      manager.createBot({
        villageId: 'village-2',
        position: { x: 100, y: 64, z: 0 }
      });
      
      expect(manager.getBotsByVillage('village-1').length).toBe(1);
      expect(manager.getBotsByVillage('village-2').length).toBe(1);
    });
  });

  describe('SimEngine', () => {
    it('should create a new civilization', () => {
      const engine = new SimEngine();
      const state = engine.getState();
      
      expect(state.id).toBeDefined();
      expect(state.villages).toHaveLength(0);
    });

    it('should create villages', () => {
      const engine = new SimEngine();
      
      const village = engine.createVillage(
        { x: 0, y: 64, z: 0 },
        ['founder-1']
      );
      
      expect(village.name).toBeDefined();
      expect(engine.getAllVillages().length).toBe(1);
    });

    it('should determine location tags', () => {
      const engine = new SimEngine();
      
      engine.createVillage(
        { x: 0, y: 64, z: 0 },
        []
      );
      
      const centerTag = engine.getLocationTag({ x: 0, y: 64, z: 0 });
      const wildernessTag = engine.getLocationTag({ x: 1000, y: 64, z: 1000 });
      
      expect(centerTag).toContain('CENTER');
      expect(wildernessTag).toBe('WILDERNESS');
    });
  });

  describe('StubAiClient', () => {
    it('should return decisions for bots', async () => {
      const client = new StubAiClient();
      
      const response = await client.getBotBatchDecisions({
        mode: 'BOT_BATCH_DECISION',
        world: {
          timeOfDay: 'DAY' as any,
          era: 'DAWN',
          globalThreatLevel: ThreatLevel.LOW
        },
        bots: [{
          id: 'bot-1',
          role: Role.FARMER,
          lifeStage: 'ADULT' as any,
          needs: { hunger: 80, energy: 30, safety: 20, social: 40, purpose: 50 },
          mood: 'NEUTRAL' as any,
          locationTag: 'VILLAGE_CENTER',
          nearbyThreatLevel: ThreatLevel.NONE,
          resourceContext: ['FOOD_STOCK_LOW'],
          recentEvents: []
        }]
      });
      
      expect(response.decisions).toHaveLength(1);
      expect(response.decisions[0].id).toBe('bot-1');
      expect(response.decisions[0].intent).toBe('EAT'); // High hunger should trigger EAT
    });

    it('should handle threats appropriately', async () => {
      const client = new StubAiClient();
      
      const response = await client.getBotBatchDecisions({
        mode: 'BOT_BATCH_DECISION',
        world: {
          timeOfDay: 'NIGHT' as any,
          era: 'DAWN',
          globalThreatLevel: ThreatLevel.HIGH
        },
        bots: [{
          id: 'bot-1',
          role: Role.FARMER,
          lifeStage: 'ADULT' as any,
          needs: { hunger: 30, energy: 30, safety: 90, social: 40, purpose: 50 },
          mood: 'AFRAID' as any,
          locationTag: 'WILDERNESS',
          nearbyThreatLevel: ThreatLevel.HIGH,
          resourceContext: [],
          recentEvents: []
        }]
      });
      
      expect(response.decisions[0].intent).toBe('FLEE_TO_SAFETY');
    });
  });
});
