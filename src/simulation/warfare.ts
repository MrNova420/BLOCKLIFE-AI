/**
 * BlockLife AI - Warfare & Diplomacy System
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Handles conflict, diplomacy, and inter-village relations.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  Village, 
  RelationState, 
  Position,
  ResourceStock,
  HistoricalEvent
} from '../types';
import { getVillageManager } from './villages';
import { getBotManager } from '../bots/bot-manager';
import { createLogger } from '../utils/logger';

const logger = createLogger('warfare');

/**
 * Diplomatic agreement between villages
 */
export interface DiplomaticAgreement {
  id: string;
  type: 'PEACE' | 'TRADE' | 'ALLIANCE' | 'NON_AGGRESSION' | 'TRIBUTE';
  village1Id: string;
  village2Id: string;
  terms: string[];
  tributeAmount?: Partial<ResourceStock>;
  tributeFromId?: string;
  signedAt: number;
  expiresAt?: number;
  status: 'ACTIVE' | 'EXPIRED' | 'BROKEN';
}

/**
 * War declaration
 */
export interface War {
  id: string;
  attackerId: string;
  defenderId: string;
  cause: string;
  declaredAt: number;
  endedAt?: number;
  battles: Battle[];
  status: 'ACTIVE' | 'VICTORY_ATTACKER' | 'VICTORY_DEFENDER' | 'PEACE' | 'STALEMATE';
  casualties: {
    attacker: number;
    defender: number;
  };
}

/**
 * Battle in a war
 */
export interface Battle {
  id: string;
  warId: string;
  location: Position;
  attackerForce: string[];  // Bot IDs
  defenderForce: string[];  // Bot IDs
  occurredAt: number;
  result: 'ATTACKER_WIN' | 'DEFENDER_WIN' | 'DRAW';
  attackerCasualties: number;
  defenderCasualties: number;
  description: string;
}

/**
 * Raid event
 */
export interface Raid {
  id: string;
  raiderId: string;
  targetId: string;
  force: string[];  // Bot IDs
  stolenResources?: Partial<ResourceStock>;
  occurredAt: number;
  success: boolean;
  casualties: number;
}

/**
 * Diplomatic action
 */
export interface DiplomaticAction {
  id: string;
  type: 'PROPOSE_PEACE' | 'PROPOSE_ALLIANCE' | 'SEND_GIFT' | 'THREATEN' | 'DEMAND_TRIBUTE' | 'BREAK_AGREEMENT';
  fromVillageId: string;
  toVillageId: string;
  ambassadorId: string;
  gift?: Partial<ResourceStock>;
  demandAmount?: Partial<ResourceStock>;
  createdAt: number;
  respondedAt?: number;
  response?: 'ACCEPTED' | 'REJECTED' | 'IGNORED';
}

/**
 * Warfare & Diplomacy Manager
 */
export class WarfareManager {
  private agreements: Map<string, DiplomaticAgreement> = new Map();
  private wars: Map<string, War> = new Map();
  private raids: Map<string, Raid> = new Map();
  private pendingActions: Map<string, DiplomaticAction> = new Map();
  
  private readonly RELATION_CHANGE_PER_ACTION = 10;
  private readonly MIN_RELATION_FOR_ALLIANCE = 70;
  private readonly WAR_DECLARATION_RELATION_DROP = 50;
  private readonly BATTLE_OUTCOME_VARIANCE = 0.3;  // 30% randomness in battles

  constructor() {
    logger.info('Warfare Manager initialized');
  }

  // ========================
  // DIPLOMACY
  // ========================

  /**
   * Get relationship state between two villages
   */
  getRelationState(village1Id: string, village2Id: string): RelationState {
    const villageManager = getVillageManager();
    const village1 = villageManager.getVillage(village1Id);
    
    if (!village1) return RelationState.NEUTRAL;
    
    const relation = village1.villageRelations.find(r => r.targetVillageId === village2Id);
    return relation?.state || RelationState.NEUTRAL;
  }

  /**
   * Set relationship state between two villages
   */
  setRelationState(village1Id: string, village2Id: string, state: RelationState): void {
    const villageManager = getVillageManager();
    const village1 = villageManager.getVillage(village1Id);
    const village2 = villageManager.getVillage(village2Id);
    
    if (!village1 || !village2) return;
    
    // Update village1's view of village2
    const relation1 = village1.villageRelations.find(r => r.targetVillageId === village2Id);
    if (relation1) {
      relation1.state = state;
    } else {
      village1.villageRelations.push({
        targetVillageId: village2Id,
        state,
        history: [],
        lastInteraction: Date.now()
      });
    }
    
    // Update village2's view of village1
    const relation2 = village2.villageRelations.find(r => r.targetVillageId === village1Id);
    if (relation2) {
      relation2.state = state;
    } else {
      village2.villageRelations.push({
        targetVillageId: village1Id,
        state,
        history: [],
        lastInteraction: Date.now()
      });
    }
    
    logger.info(`Relation between ${village1.name} and ${village2.name} set to ${state}`);
  }

  /**
   * Improve relations between villages
   */
  improveRelations(village1Id: string, village2Id: string, amount: number = 1): RelationState {
    const current = this.getRelationState(village1Id, village2Id);
    const states = [RelationState.HOSTILE, RelationState.TENSE, RelationState.NEUTRAL, RelationState.FRIENDLY, RelationState.ALLIED];
    const currentIndex = states.indexOf(current);
    
    if (currentIndex < states.length - 1) {
      const newIndex = Math.min(states.length - 1, currentIndex + amount);
      this.setRelationState(village1Id, village2Id, states[newIndex]);
      return states[newIndex];
    }
    
    return current;
  }

  /**
   * Worsen relations between villages
   */
  worsenRelations(village1Id: string, village2Id: string, amount: number = 1): RelationState {
    const current = this.getRelationState(village1Id, village2Id);
    const states = [RelationState.HOSTILE, RelationState.TENSE, RelationState.NEUTRAL, RelationState.FRIENDLY, RelationState.ALLIED];
    const currentIndex = states.indexOf(current);
    
    if (currentIndex > 0) {
      const newIndex = Math.max(0, currentIndex - amount);
      this.setRelationState(village1Id, village2Id, states[newIndex]);
      return states[newIndex];
    }
    
    return current;
  }

  /**
   * Create diplomatic action
   */
  createDiplomaticAction(
    type: DiplomaticAction['type'],
    fromVillageId: string,
    toVillageId: string,
    ambassadorId: string,
    options?: { gift?: Partial<ResourceStock>; demandAmount?: Partial<ResourceStock> }
  ): DiplomaticAction {
    const action: DiplomaticAction = {
      id: uuidv4(),
      type,
      fromVillageId,
      toVillageId,
      ambassadorId,
      gift: options?.gift,
      demandAmount: options?.demandAmount,
      createdAt: Date.now()
    };
    
    this.pendingActions.set(action.id, action);
    logger.info(`Diplomatic action created: ${type} from ${fromVillageId} to ${toVillageId}`);
    
    return action;
  }

  /**
   * Respond to diplomatic action
   */
  respondToAction(actionId: string, response: 'ACCEPTED' | 'REJECTED'): boolean {
    const action = this.pendingActions.get(actionId);
    if (!action || action.response) return false;
    
    action.response = response;
    action.respondedAt = Date.now();
    
    if (response === 'ACCEPTED') {
      this.applyDiplomaticAction(action);
    }
    
    return true;
  }

  /**
   * Apply effects of an accepted diplomatic action
   */
  private applyDiplomaticAction(action: DiplomaticAction): void {
    const villageManager = getVillageManager();
    const fromVillage = villageManager.getVillage(action.fromVillageId);
    const toVillage = villageManager.getVillage(action.toVillageId);
    
    if (!fromVillage || !toVillage) return;
    
    switch (action.type) {
      case 'PROPOSE_PEACE':
        // End any active war
        this.endWar(action.fromVillageId, action.toVillageId, 'PEACE');
        this.setRelationState(action.fromVillageId, action.toVillageId, RelationState.NEUTRAL);
        this.createAgreement('PEACE', action.fromVillageId, action.toVillageId, ['No aggression']);
        break;
        
      case 'PROPOSE_ALLIANCE':
        this.setRelationState(action.fromVillageId, action.toVillageId, RelationState.ALLIED);
        this.createAgreement('ALLIANCE', action.fromVillageId, action.toVillageId, ['Mutual defense', 'Trade priority']);
        break;
        
      case 'SEND_GIFT':
        if (action.gift) {
          // Transfer resources
          for (const [resource, amount] of Object.entries(action.gift)) {
            const key = resource as keyof ResourceStock;
            fromVillage.stockpile[key] -= (amount || 0);
            toVillage.stockpile[key] += (amount || 0);
          }
          this.improveRelations(action.fromVillageId, action.toVillageId);
        }
        break;
        
      case 'DEMAND_TRIBUTE':
        if (action.demandAmount) {
          this.createAgreement('TRIBUTE', action.fromVillageId, action.toVillageId, 
            ['Regular tribute payments'],
            action.demandAmount,
            action.toVillageId
          );
        }
        break;
        
      case 'BREAK_AGREEMENT':
        // Find and break any agreements between these villages
        for (const agreement of this.agreements.values()) {
          if ((agreement.village1Id === action.fromVillageId && agreement.village2Id === action.toVillageId) ||
              (agreement.village2Id === action.fromVillageId && agreement.village1Id === action.toVillageId)) {
            agreement.status = 'BROKEN';
          }
        }
        this.worsenRelations(action.fromVillageId, action.toVillageId, 2);
        break;
    }
  }

  /**
   * Create a diplomatic agreement
   */
  createAgreement(
    type: DiplomaticAgreement['type'],
    village1Id: string,
    village2Id: string,
    terms: string[],
    tributeAmount?: Partial<ResourceStock>,
    tributeFromId?: string
  ): DiplomaticAgreement {
    const agreement: DiplomaticAgreement = {
      id: uuidv4(),
      type,
      village1Id,
      village2Id,
      terms,
      tributeAmount,
      tributeFromId,
      signedAt: Date.now(),
      status: 'ACTIVE'
    };
    
    this.agreements.set(agreement.id, agreement);
    logger.info(`Agreement created: ${type} between ${village1Id} and ${village2Id}`);
    
    return agreement;
  }

  /**
   * Get agreements for a village
   */
  getAgreements(villageId: string): DiplomaticAgreement[] {
    return Array.from(this.agreements.values()).filter(
      a => a.status === 'ACTIVE' && (a.village1Id === villageId || a.village2Id === villageId)
    );
  }

  // ========================
  // WARFARE
  // ========================

  /**
   * Declare war
   */
  declareWar(attackerId: string, defenderId: string, cause: string): War | null {
    const villageManager = getVillageManager();
    const attacker = villageManager.getVillage(attackerId);
    const defender = villageManager.getVillage(defenderId);
    
    if (!attacker || !defender) return null;
    
    // Check if already at war
    const existingWar = this.getActiveWar(attackerId, defenderId);
    if (existingWar) {
      logger.warn('Villages already at war');
      return existingWar;
    }
    
    // Break any existing agreements
    for (const agreement of this.agreements.values()) {
      if ((agreement.village1Id === attackerId && agreement.village2Id === defenderId) ||
          (agreement.village2Id === attackerId && agreement.village1Id === defenderId)) {
        agreement.status = 'BROKEN';
      }
    }
    
    const war: War = {
      id: uuidv4(),
      attackerId,
      defenderId,
      cause,
      declaredAt: Date.now(),
      battles: [],
      status: 'ACTIVE',
      casualties: { attacker: 0, defender: 0 }
    };
    
    this.wars.set(war.id, war);
    this.setRelationState(attackerId, defenderId, RelationState.HOSTILE);
    
    logger.info(`War declared: ${attacker.name} vs ${defender.name} - ${cause}`);
    
    return war;
  }

  /**
   * Get active war between two villages
   */
  getActiveWar(village1Id: string, village2Id: string): War | undefined {
    for (const war of this.wars.values()) {
      if (war.status !== 'ACTIVE') continue;
      if ((war.attackerId === village1Id && war.defenderId === village2Id) ||
          (war.attackerId === village2Id && war.defenderId === village1Id)) {
        return war;
      }
    }
    return undefined;
  }

  /**
   * Get all active wars for a village
   */
  getActiveWars(villageId: string): War[] {
    return Array.from(this.wars.values()).filter(
      w => w.status === 'ACTIVE' && (w.attackerId === villageId || w.defenderId === villageId)
    );
  }

  /**
   * Fight a battle
   */
  fightBattle(
    warId: string,
    location: Position,
    attackerForce: string[],
    defenderForce: string[]
  ): Battle | null {
    const war = this.wars.get(warId);
    if (!war || war.status !== 'ACTIVE') return null;
    
    const botManager = getBotManager();
    
    // Calculate combat strength
    const attackerStrength = this.calculateCombatStrength(attackerForce);
    const defenderStrength = this.calculateCombatStrength(defenderForce);
    
    // Add some randomness
    const attackerRoll = attackerStrength * (1 + (Math.random() - 0.5) * this.BATTLE_OUTCOME_VARIANCE);
    const defenderRoll = defenderStrength * (1 + (Math.random() - 0.5) * this.BATTLE_OUTCOME_VARIANCE);
    
    // Determine winner
    let result: Battle['result'];
    let attackerCasualties: number;
    let defenderCasualties: number;
    
    const ratio = attackerRoll / (defenderRoll || 1);
    
    if (ratio > 1.5) {
      result = 'ATTACKER_WIN';
      attackerCasualties = Math.floor(attackerForce.length * 0.1);
      defenderCasualties = Math.floor(defenderForce.length * 0.5);
    } else if (ratio < 0.67) {
      result = 'DEFENDER_WIN';
      attackerCasualties = Math.floor(attackerForce.length * 0.5);
      defenderCasualties = Math.floor(defenderForce.length * 0.1);
    } else {
      result = 'DRAW';
      attackerCasualties = Math.floor(attackerForce.length * 0.3);
      defenderCasualties = Math.floor(defenderForce.length * 0.3);
    }
    
    // Apply casualties (mark bots as dead)
    const killBots = (botIds: string[], count: number) => {
      const toKill = botIds.slice(0, count);
      for (const botId of toKill) {
        const agent = botManager.getBot(botId);
        if (agent) {
          agent.die('combat');
        }
      }
    };
    
    killBots(attackerForce, attackerCasualties);
    killBots(defenderForce, defenderCasualties);
    
    // Update war casualties
    war.casualties.attacker += attackerCasualties;
    war.casualties.defender += defenderCasualties;
    
    const villageManager = getVillageManager();
    const attacker = villageManager.getVillage(war.attackerId);
    const defender = villageManager.getVillage(war.defenderId);
    
    const battle: Battle = {
      id: uuidv4(),
      warId,
      location,
      attackerForce,
      defenderForce,
      occurredAt: Date.now(),
      result,
      attackerCasualties,
      defenderCasualties,
      description: this.generateBattleDescription(
        attacker?.name || 'Unknown',
        defender?.name || 'Unknown',
        result,
        attackerCasualties + defenderCasualties
      )
    };
    
    war.battles.push(battle);
    logger.info(`Battle fought: ${battle.description}`);
    
    return battle;
  }

  /**
   * Calculate combat strength of a force
   */
  private calculateCombatStrength(botIds: string[]): number {
    const botManager = getBotManager();
    let strength = 0;
    
    for (const botId of botIds) {
      const agent = botManager.getBot(botId);
      if (agent && !agent.isDead()) {
        const data = agent.getData();
        // Base strength from combat skill and personality
        strength += data.skills.combat;
        strength += data.personality.bravery * 0.3;
        strength += data.personality.aggression * 0.2;
        // Equipment would add more here
        strength += 10;  // Base strength per bot
      }
    }
    
    return strength;
  }

  /**
   * Generate battle description
   */
  private generateBattleDescription(
    attackerName: string,
    defenderName: string,
    result: Battle['result'],
    totalCasualties: number
  ): string {
    if (result === 'ATTACKER_WIN') {
      return `Forces of ${attackerName} defeated ${defenderName}'s defenders. ${totalCasualties} fell.`;
    } else if (result === 'DEFENDER_WIN') {
      return `${defenderName} repelled the attack from ${attackerName}. ${totalCasualties} fell.`;
    } else {
      return `The battle between ${attackerName} and ${defenderName} ended inconclusively. ${totalCasualties} fell.`;
    }
  }

  /**
   * End a war
   */
  endWar(village1Id: string, village2Id: string, result: War['status']): boolean {
    const war = this.getActiveWar(village1Id, village2Id);
    if (!war) return false;
    
    war.status = result;
    war.endedAt = Date.now();
    
    logger.info(`War ended: ${result}`);
    
    return true;
  }

  /**
   * Execute a raid
   */
  executeRaid(raiderId: string, targetId: string, force: string[]): Raid {
    const villageManager = getVillageManager();
    const raider = villageManager.getVillage(raiderId);
    const target = villageManager.getVillage(targetId);
    
    const raidStrength = this.calculateCombatStrength(force);
    const defenseRating = target?.defenseRating || 10;
    
    // Calculate success
    const successChance = raidStrength / (defenseRating * 2);
    const success = Math.random() < successChance;
    
    let stolenResources: Partial<ResourceStock> | undefined;
    let casualties = 0;
    
    if (success && target) {
      // Steal some resources
      stolenResources = {
        food: Math.floor(target.stockpile.food * 0.2),
        wood: Math.floor(target.stockpile.wood * 0.1),
        iron: Math.floor(target.stockpile.iron * 0.1)
      };
      
      // Apply theft
      for (const [resource, amount] of Object.entries(stolenResources)) {
        const key = resource as keyof ResourceStock;
        target.stockpile[key] -= (amount || 0);
        if (raider) {
          raider.stockpile[key] += (amount || 0);
        }
      }
      
      casualties = Math.floor(force.length * 0.1);
    } else {
      casualties = Math.floor(force.length * 0.3);
    }
    
    // Apply casualties
    const botManager = getBotManager();
    for (let i = 0; i < casualties && i < force.length; i++) {
      const agent = botManager.getBot(force[i]);
      if (agent) {
        agent.die('raid');
      }
    }
    
    const raid: Raid = {
      id: uuidv4(),
      raiderId,
      targetId,
      force,
      stolenResources,
      occurredAt: Date.now(),
      success,
      casualties
    };
    
    this.raids.set(raid.id, raid);
    
    // Worsen relations
    this.worsenRelations(raiderId, targetId, 2);
    
    logger.info(`Raid ${success ? 'succeeded' : 'failed'}: ${raider?.name} -> ${target?.name}`);
    
    return raid;
  }

  /**
   * Serialize for persistence
   */
  serialize(): {
    agreements: DiplomaticAgreement[];
    wars: War[];
    raids: Raid[];
    pendingActions: DiplomaticAction[];
  } {
    return {
      agreements: Array.from(this.agreements.values()),
      wars: Array.from(this.wars.values()),
      raids: Array.from(this.raids.values()),
      pendingActions: Array.from(this.pendingActions.values())
    };
  }

  /**
   * Load from persistence
   */
  load(data: {
    agreements?: DiplomaticAgreement[];
    wars?: War[];
    raids?: Raid[];
    pendingActions?: DiplomaticAction[];
  }): void {
    this.agreements.clear();
    this.wars.clear();
    this.raids.clear();
    this.pendingActions.clear();
    
    for (const agreement of data.agreements || []) {
      this.agreements.set(agreement.id, agreement);
    }
    
    for (const war of data.wars || []) {
      this.wars.set(war.id, war);
    }
    
    for (const raid of data.raids || []) {
      this.raids.set(raid.id, raid);
    }
    
    for (const action of data.pendingActions || []) {
      this.pendingActions.set(action.id, action);
    }
    
    logger.info(`Loaded warfare data`);
  }
}

// Singleton
let warfareManagerInstance: WarfareManager | null = null;

export function getWarfareManager(): WarfareManager {
  if (!warfareManagerInstance) {
    warfareManagerInstance = new WarfareManager();
  }
  return warfareManagerInstance;
}

export function resetWarfareManager(): void {
  warfareManagerInstance = null;
}

export default WarfareManager;
