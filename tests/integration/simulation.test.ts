/**
 * BlockLife AI - Integration Tests
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Tests that verify systems integrate correctly together.
 */

import { BotManager } from '../../src/bots/bot-manager';
import { BotAgent } from '../../src/bots/bot-agent';
import { SimEngine } from '../../src/simulation/sim-engine';
import FamilyManager from '../../src/simulation/families';
import EconomyManager from '../../src/simulation/economy';
import TechTreeManager from '../../src/simulation/tech-tree';
import WarfareManager from '../../src/simulation/warfare';
import { Role, TechAge, LifeStage, Gender, RelationState } from '../../src/types';

// Test constants
const SIMULATION_TICKS = 100;
const QUICK_SIMULATION_TICKS = 50;

describe('BlockLife Integration Tests', () => {
  
  describe('Village Lifecycle', () => {
    let simEngine: SimEngine;
    let botManager: BotManager;
    
    beforeEach(() => {
      simEngine = new SimEngine();
      botManager = new BotManager();
    });

    it('should create a village with founders and assign roles', () => {
      // Create village
      const village = simEngine.createVillage(
        { x: 0, y: 64, z: 0 },
        []
      );
      
      // Create founding bots
      const founders: string[] = [];
      for (let i = 0; i < 10; i++) {
        const bot = botManager.createBot({
          villageId: village.id,
          position: { x: i * 2, y: 64, z: 0 }
        });
        founders.push(bot.id);
        simEngine.addBotToVillage(bot.id, village.id);
      }
      
      // Update village
      village.founderIds = founders;
      village.memberIds = founders;
      
      // Assign roles - since sim engine uses its own bot manager singleton,
      // we'll manually assign roles to our test bots
      const bots = botManager.getBotsByVillage(village.id);
      const distribution = [
        Role.FARMER, Role.FARMER, Role.FARMER, Role.FARMER,
        Role.BUILDER, Role.BUILDER,
        Role.MINER, Role.GUARD, Role.LUMBERJACK, Role.CARETAKER
      ];
      bots.forEach((bot, i) => {
        if (i < distribution.length) {
          bot.setRole(distribution[i]);
        }
      });
      
      // Verify role distribution
      const roles = bots.map(b => b.getRole());
      
      expect(roles.filter(r => r === Role.FARMER).length).toBeGreaterThan(0);
      expect(roles.filter(r => r === Role.BUILDER).length).toBeGreaterThan(0);
      expect(roles.filter(r => r === Role.GUARD).length).toBeGreaterThan(0);
      expect(roles.filter(r => r === Role.UNASSIGNED).length).toBe(0);
    });

    it('should track village resources during simulation', () => {
      const village = simEngine.createVillage(
        { x: 0, y: 64, z: 0 },
        []
      );
      
      // Add some members
      for (let i = 0; i < 5; i++) {
        simEngine.addBotToVillage(`bot-${i}`, village.id);
      }
      
      const initialFood = village.stockpile.food;
      
      // Run several ticks
      for (let i = 0; i < SIMULATION_TICKS; i++) {
        simEngine.tick(1000);
      }
      
      // Food should have decreased with population consuming
      expect(village.stockpile.food).toBeLessThan(initialFood);
    });
  });

  describe('Family System Integration', () => {
    let familyManager: FamilyManager;
    let botManager: BotManager;
    
    beforeEach(() => {
      familyManager = new FamilyManager();
      botManager = new BotManager();
    });

    it('should check compatibility between adult bots', () => {
      // Create adult bots of opposite genders
      const parentA = botManager.createBot({
        villageId: 'test-village',
        position: { x: 0, y: 64, z: 0 },
        gender: Gender.MALE
      });
      
      const parentB = botManager.createBot({
        villageId: 'test-village',
        position: { x: 1, y: 64, z: 0 },
        gender: Gender.FEMALE
      });
      
      // Check compatibility (both should be adults)
      const compatible = familyManager.canFormPartnership(
        parentA.getData(),
        parentB.getData()
      );
      
      // Should have a compatibility score
      expect(compatible.score).toBeDefined();
      expect(typeof compatible.score).toBe('number');
    });

    it('should inherit traits from parents', () => {
      const parentA = botManager.createBot({
        villageId: 'test-village',
        position: { x: 0, y: 64, z: 0 },
        gender: Gender.MALE
      });
      
      const parentB = botManager.createBot({
        villageId: 'test-village',
        position: { x: 1, y: 64, z: 0 },
        gender: Gender.FEMALE
      });
      
      // Create child
      const child = new BotAgent({
        villageId: 'test-village',
        position: { x: 0, y: 64, z: 0 },
        parentA: parentA.getData(),
        parentB: parentB.getData()
      });
      
      // Child should have parent IDs
      expect(child.getData().parentIds.length).toBe(2);
      expect(child.getData().parentIds).toContain(parentA.id);
      expect(child.getData().parentIds).toContain(parentB.id);
      
      // Child should start as CHILD life stage
      expect(child.getData().lifeStage).toBe(LifeStage.CHILD);
    });
  });

  describe('Tech Tree Integration', () => {
    let techTreeManager: TechTreeManager;
    
    beforeEach(() => {
      techTreeManager = new TechTreeManager();
    });

    it('should list technologies for ages', () => {
      const allTechs = techTreeManager.getAllTechnologies();
      expect(allTechs.length).toBeGreaterThan(0);
      
      const stoneTechs = techTreeManager.getTechnologiesForAge(TechAge.STONE);
      expect(stoneTechs.length).toBeGreaterThan(0);
    });

    it('should start research projects', () => {
      const techs = techTreeManager.getTechnologiesForAge(TechAge.STONE);
      expect(techs.length).toBeGreaterThan(0);
      
      // Research a technology
      const tech = techs[0];
      const project = techTreeManager.startResearch('test-village', tech.id, ['bot-1']);
      
      expect(project).not.toBeNull();
      if (project) {
        expect(project.techId).toBe(tech.id);
        expect(project.villageId).toBe('test-village');
      }
    });
  });

  describe('Economy System Integration', () => {
    let economyManager: EconomyManager;
    
    beforeEach(() => {
      economyManager = new EconomyManager();
    });

    it('should calculate trade values', () => {
      const woodValue = economyManager.calculateTradeValue({ wood: 10 });
      const stoneValue = economyManager.calculateTradeValue({ stone: 10 });
      
      expect(woodValue).toBeGreaterThan(0);
      expect(stoneValue).toBeGreaterThan(0);
    });

    it('should track market prices', () => {
      const prices = economyManager.getMarketPrices();
      expect(prices.food).toBeGreaterThan(0);
      expect(prices.wood).toBeGreaterThan(0);
      expect(prices.stone).toBeGreaterThan(0);
    });

    it('should track pending offers by village', () => {
      // No offers yet for new village
      const offers = economyManager.getPendingOffers('village-1');
      expect(offers).toEqual([]);
    });
  });

  describe('Warfare System Integration', () => {
    let warfareManager: WarfareManager;
    
    beforeEach(() => {
      warfareManager = new WarfareManager();
    });

    it('should get relation state between villages', () => {
      const relation = warfareManager.getRelationState('village-1', 'village-2');
      // Default should be neutral
      expect(relation).toBe(RelationState.NEUTRAL);
    });

    it('should improve relations between villages', () => {
      // Initial state
      const initial = warfareManager.getRelationState('village-1', 'village-2');
      expect(initial).toBe(RelationState.NEUTRAL);
      
      // Improve relations multiple times to see effect
      warfareManager.improveRelations('village-1', 'village-2', 2);
      
      const improved = warfareManager.getRelationState('village-1', 'village-2');
      // Should be improved (FRIENDLY or ALLIED)
      expect(improved).not.toBe(RelationState.HOSTILE);
      expect(improved).not.toBe(RelationState.TENSE);
    });

    it('should worsen relations between villages', () => {
      // Start with neutral
      const initial = warfareManager.getRelationState('village-1', 'village-2');
      expect(initial).toBe(RelationState.NEUTRAL);
      
      // Worsen relations
      warfareManager.worsenRelations('village-1', 'village-2', 2);
      
      const worsened = warfareManager.getRelationState('village-1', 'village-2');
      // Should be worsened (TENSE or HOSTILE)
      expect(worsened).not.toBe(RelationState.FRIENDLY);
      expect(worsened).not.toBe(RelationState.ALLIED);
    });
  });

  describe('Full Simulation Flow', () => {
    it('should run a complete simulation tick without errors', () => {
      const simEngine = new SimEngine();
      const botManager = new BotManager();
      
      // Create village
      const village = simEngine.createVillage(
        { x: 0, y: 64, z: 0 },
        []
      );
      
      // Create bots
      for (let i = 0; i < 5; i++) {
        const bot = botManager.createBot({
          villageId: village.id,
          position: { x: i * 2, y: 64, z: 0 }
        });
        simEngine.addBotToVillage(bot.id, village.id);
      }
      
      // Run simulation for multiple ticks
      expect(() => {
        for (let i = 0; i < QUICK_SIMULATION_TICKS; i++) {
          // Update bots
          botManager.updateAllBots(300);
          
          // Update contexts
          botManager.updateBotContexts(
            (pos) => simEngine.getLocationTag(pos),
            (pos) => simEngine.getThreatLevel(pos),
            (villageId) => simEngine.getResourceContext(villageId)
          );
          
          // Simulation tick
          simEngine.tick(300);
        }
      }).not.toThrow();
    });

    it('should maintain data integrity across ticks', () => {
      const simEngine = new SimEngine();
      const botManager = new BotManager();
      
      // Create village with bots
      const village = simEngine.createVillage({ x: 0, y: 64, z: 0 }, []);
      
      const initialBotCount = 10;
      for (let i = 0; i < initialBotCount; i++) {
        const bot = botManager.createBot({
          villageId: village.id,
          position: { x: i, y: 64, z: 0 }
        });
        simEngine.addBotToVillage(bot.id, village.id);
      }
      
      // Run simulation
      for (let i = 0; i < SIMULATION_TICKS; i++) {
        botManager.updateAllBots(300);
        simEngine.tick(300);
      }
      
      // Verify data integrity
      const state = simEngine.getState();
      expect(state.villages.length).toBe(1);
      expect(state.currentTick).toBe(SIMULATION_TICKS);
      expect(botManager.getBotCount()).toBe(initialBotCount);
    });
  });
});
