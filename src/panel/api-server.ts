/**
 * BlockLife AI - Command & Observatory Panel API Server
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * HTTP/WebSocket API for the BCOP control panel.
 */

import http from 'http';
import { getSimEngine } from '../simulation/sim-engine';
import { getBotManager } from '../bots/bot-manager';
import { createLogger } from '../utils/logger';

const logger = createLogger('api');

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface OverviewData {
  era: string;
  simulationDays: number;
  currentTick: number;
  population: { total: number; adults: number; children: number; elders: number };
  villages: { id: string; name: string; population: number; prosperity: number }[];
  globalMood: string;
  resources: { food: number; wood: number; stone: number; iron: number };
  uptime: number;
}

export interface BotDetailData {
  id: string;
  name: string;
  age: number;
  lifeStage: string;
  role: string;
  village: string;
  personality: Record<string, number>;
  skills: Record<string, number>;
  needs: Record<string, number>;
  mood: string;
  health: number;
  currentTask?: string;
  relationships: { name: string; type: string; strength: number }[];
  recentEvents: string[];
}

export interface CommandRequest {
  type: 'SET_ROLE' | 'SET_POLICY' | 'CREATE_PROJECT' | 'SEND_TO' | 'PROTECT';
  target: string;
  params: Record<string, unknown>;
}

export class ApiServer {
  private server: http.Server | null = null;
  private startTime: number = Date.now();

  start(port: number = 3000): void {
    this.server = http.createServer((req, res) => this.handleRequest(req, res));
    this.server.listen(port, () => {
      logger.info(`BCOP API server running on port ${port}`);
    });
  }

  stop(): void {
    this.server?.close();
    logger.info('API server stopped');
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const url = req.url || '/';
    const method = req.method || 'GET';

    try {
      if (method === 'GET') {
        if (url === '/api/overview') {
          this.sendJson(res, this.getOverview());
        } else if (url === '/api/villages') {
          this.sendJson(res, this.getVillages());
        } else if (url.startsWith('/api/villages/')) {
          const id = url.split('/')[3];
          this.sendJson(res, this.getVillageDetail(id));
        } else if (url.startsWith('/api/bots/')) {
          const id = url.split('/')[3];
          this.sendJson(res, this.getBotDetail(id));
        } else if (url === '/api/events') {
          this.sendJson(res, this.getEvents());
        } else if (url === '/api/timeline') {
          this.sendJson(res, this.getTimeline());
        } else {
          this.sendError(res, 404, 'Not found');
        }
      } else if (method === 'POST') {
        const body = await this.readBody(req);
        if (url === '/api/controls/command') {
          this.sendJson(res, this.executeCommand(JSON.parse(body)));
        } else if (url === '/api/ai/chat') {
          this.sendJson(res, await this.handleAiChat(JSON.parse(body)));
        } else {
          this.sendError(res, 404, 'Not found');
        }
      } else {
        this.sendError(res, 405, 'Method not allowed');
      }
    } catch (err) {
      logger.error('API error:', err);
      this.sendError(res, 500, 'Internal server error');
    }
  }

  private getOverview(): ApiResponse<OverviewData> {
    const sim = getSimEngine();
    const bots = getBotManager();
    const state = sim.getState();
    const allBots = bots.getAllBots();
    const living = allBots.filter(b => !b.isDead());

    let totalFood = 0, totalWood = 0, totalStone = 0, totalIron = 0;
    state.villages.forEach(v => {
      totalFood += v.stockpile.food;
      totalWood += v.stockpile.wood;
      totalStone += v.stockpile.stone;
      totalIron += v.stockpile.iron;
    });

    return {
      success: true,
      data: {
        era: state.era,
        simulationDays: Math.floor(state.simulationDays),
        currentTick: state.currentTick,
        population: {
          total: living.length,
          adults: living.filter(b => b.getData().lifeStage === 'ADULT').length,
          children: living.filter(b => b.getData().lifeStage === 'CHILD').length,
          elders: living.filter(b => b.getData().lifeStage === 'ELDER').length
        },
        villages: state.villages.map(v => ({
          id: v.id, name: v.name, population: v.memberIds.length, prosperity: v.prosperity
        })),
        globalMood: this.calculateGlobalMood(living),
        resources: { food: totalFood, wood: totalWood, stone: totalStone, iron: totalIron },
        uptime: Date.now() - this.startTime
      },
      timestamp: Date.now()
    };
  }

  private getVillages(): ApiResponse { return { success: true, data: getSimEngine().getAllVillages(), timestamp: Date.now() }; }
  private getVillageDetail(id: string): ApiResponse { return { success: true, data: getSimEngine().getVillage(id), timestamp: Date.now() }; }
  
  private getBotDetail(id: string): ApiResponse<BotDetailData | null> {
    const bot = getBotManager().getBot(id);
    if (!bot) return { success: false, error: 'Bot not found', timestamp: Date.now() };
    const data = bot.getData();
    return {
      success: true,
      data: {
        id: data.id, name: data.name, age: data.age, lifeStage: data.lifeStage,
        role: data.role, village: data.villageId, 
        personality: { ...data.personality } as Record<string, number>,
        skills: { ...data.skills } as Record<string, number>, 
        needs: { ...data.needs } as Record<string, number>, 
        mood: data.mood, health: data.health,
        currentTask: data.currentTask?.type,
        relationships: data.relationships.map(r => ({ name: r.targetId, type: r.type, strength: r.strength })),
        recentEvents: []
      },
      timestamp: Date.now()
    };
  }

  private getEvents(): ApiResponse {
    const events: unknown[] = [];
    getSimEngine().getAllVillages().forEach(v => events.push(...v.historicalEvents.slice(-20)));
    return { success: true, data: events.slice(-50), timestamp: Date.now() };
  }

  private getTimeline(): ApiResponse {
    const timeline: unknown[] = [];
    getSimEngine().getAllVillages().forEach(v => {
      v.historicalEvents.filter(e => e.significance > 50).forEach(e => timeline.push(e));
    });
    return { success: true, data: timeline.sort((a: any, b: any) => a.timestamp - b.timestamp), timestamp: Date.now() };
  }

  private executeCommand(cmd: CommandRequest): ApiResponse {
    logger.info(`Executing command: ${cmd.type} on ${cmd.target}`);
    // Command execution logic here
    return { success: true, data: { executed: cmd.type, target: cmd.target }, timestamp: Date.now() };
  }

  private async handleAiChat(req: { message: string }): Promise<ApiResponse> {
    // AI copilot chat - returns analysis/suggestions
    return { success: true, data: { response: `Analyzing: "${req.message}"...` }, timestamp: Date.now() };
  }

  private calculateGlobalMood(bots: any[]): string {
    if (bots.length === 0) return 'Unknown';
    const moods = bots.map(b => b.getData().mood);
    const happyCount = moods.filter(m => m === 'HAPPY').length;
    const stressedCount = moods.filter(m => m === 'STRESSED' || m === 'AFRAID').length;
    if (happyCount > bots.length * 0.6) return 'Prosperous';
    if (stressedCount > bots.length * 0.4) return 'Anxious';
    return 'Calm';
  }

  private sendJson(res: http.ServerResponse, data: unknown): void {
    res.writeHead(200);
    res.end(JSON.stringify(data));
  }

  private sendError(res: http.ServerResponse, code: number, message: string): void {
    res.writeHead(code);
    res.end(JSON.stringify({ success: false, error: message, timestamp: Date.now() }));
  }

  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }
}

export const apiServer = new ApiServer();
export default ApiServer;
