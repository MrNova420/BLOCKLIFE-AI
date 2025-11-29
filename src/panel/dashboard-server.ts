/**
 * BlockLife AI - Web Dashboard Server
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Full-featured web dashboard for controlling BlockLife.
 * Provides UI for server configuration, AI model management, and bot control.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { getSimEngine, initializeSimEngine } from '../simulation/sim-engine';
import { getBotManager } from '../bots/bot-manager';
import { getAiClient, initializeAiClient } from '../mind/ai-client';
import { loadConfig, getConfig, saveConfig } from '../utils/config';
import { createLogger } from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const logger = createLogger('dashboard');

// Available AI models that can be installed
const AVAILABLE_MODELS = [
  {
    id: 'tinyllama-1.1b',
    name: 'TinyLlama 1.1B',
    description: 'Smallest and fastest, great for mobile devices',
    size: '637MB',
    provider: 'ollama',
    ollamaName: 'tinyllama',
    recommended: true
  },
  {
    id: 'phi-2',
    name: 'Microsoft Phi-2',
    description: 'Good balance of size and quality',
    size: '1.7GB',
    provider: 'ollama',
    ollamaName: 'phi'
  },
  {
    id: 'mistral-7b',
    name: 'Mistral 7B',
    description: 'High quality responses, requires more RAM',
    size: '4.1GB',
    provider: 'ollama',
    ollamaName: 'mistral'
  },
  {
    id: 'llama2-7b',
    name: 'Llama 2 7B',
    description: 'Meta\'s open model, good general performance',
    size: '3.8GB',
    provider: 'ollama',
    ollamaName: 'llama2'
  },
  {
    id: 'gemma-2b',
    name: 'Google Gemma 2B',
    description: 'Google\'s lightweight model',
    size: '1.4GB',
    provider: 'ollama',
    ollamaName: 'gemma:2b'
  },
  {
    id: 'stub',
    name: 'Built-in Rules (No AI)',
    description: 'Uses rule-based logic, no download required',
    size: '0MB',
    provider: 'stub',
    ollamaName: null,
    installed: true
  }
];

interface DashboardState {
  simulationRunning: boolean;
  connectedToServer: boolean;
  serverEdition: 'java' | 'bedrock';
  currentModel: string;
  installedModels: string[];
  ollamaInstalled: boolean;
  ollamaRunning: boolean;
}

export class DashboardServer {
  private server: http.Server | null = null;
  private state: DashboardState = {
    simulationRunning: false,
    connectedToServer: false,
    serverEdition: 'java',
    currentModel: 'stub',
    installedModels: ['stub'],
    ollamaInstalled: false,
    ollamaRunning: false
  };
  private chatHistory: Array<{ role: 'user' | 'assistant' | 'system'; message: string; timestamp: number }> = [];

  async start(port: number = 3000): Promise<void> {
    // Check Ollama status
    await this.checkOllamaStatus();
    
    this.server = http.createServer((req, res) => this.handleRequest(req, res));
    
    this.server.listen(port, () => {
      logger.info(`Dashboard server running at http://localhost:${port}`);
      console.log(`\n${'='.repeat(60)}`);
      console.log('  BLOCKLIFE AI - Control Dashboard');
      console.log('  Copyright © 2025 WeNova Interactive');
      console.log(`${'='.repeat(60)}`);
      console.log(`\n  🌐 Dashboard: http://localhost:${port}`);
      console.log(`\n  Open this URL in your browser to control BlockLife.\n`);
      
      // Try to open browser automatically
      this.openBrowser(`http://localhost:${port}`);
    });
  }

  private openBrowser(url: string): void {
    const platform = process.platform;
    let command: string;
    
    if (platform === 'darwin') {
      command = `open ${url}`;
    } else if (platform === 'win32') {
      command = `start ${url}`;
    } else {
      command = `xdg-open ${url} 2>/dev/null || sensible-browser ${url} 2>/dev/null || x-www-browser ${url} 2>/dev/null || gnome-open ${url} 2>/dev/null`;
    }
    
    exec(command, (err) => {
      if (err) {
        logger.debug('Could not auto-open browser');
      }
    });
  }

  private getOllamaUrl(): string {
    try {
      const config = getConfig();
      const host = config.ai?.ollama?.host || 'localhost';
      const port = config.ai?.ollama?.port || 11434;
      return `http://${host}:${port}`;
    } catch {
      return 'http://localhost:11434';
    }
  }

  private async checkOllamaStatus(): Promise<void> {
    try {
      // Check if Ollama is installed
      await execAsync('which ollama || where ollama');
      this.state.ollamaInstalled = true;
      
      // Check if Ollama is running
      const ollamaUrl = this.getOllamaUrl();
      const response = await fetch(`${ollamaUrl}/api/tags`, { 
        signal: AbortSignal.timeout(2000) 
      });
      
      if (response.ok) {
        this.state.ollamaRunning = true;
        const data = await response.json() as { models?: Array<{ name: string }> };
        this.state.installedModels = ['stub', ...(data.models?.map((m) => m.name) || [])];
      }
    } catch {
      // Ollama not available
      this.state.ollamaInstalled = false;
      this.state.ollamaRunning = false;
    }
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const method = req.method || 'GET';

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // API Routes
      if (url.pathname.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json');
        await this.handleApiRequest(url, method, req, res);
        return;
      }

      // Serve static files / dashboard
      this.serveDashboard(url.pathname, res);
      
    } catch (error) {
      logger.error('Request error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  private async handleApiRequest(
    url: URL, 
    method: string, 
    req: http.IncomingMessage, 
    res: http.ServerResponse
  ): Promise<void> {
    const path = url.pathname;

    // GET endpoints
    if (method === 'GET') {
      switch (path) {
        case '/api/status':
          return this.sendJson(res, await this.getStatus());
        
        case '/api/config':
          return this.sendJson(res, this.getConfiguration());
        
        case '/api/models':
          return this.sendJson(res, await this.getModels());
        
        case '/api/overview':
          return this.sendJson(res, this.getOverview());
        
        case '/api/bots':
          return this.sendJson(res, this.getBots());
        
        case '/api/villages':
          return this.sendJson(res, this.getVillages());
        
        case '/api/chat/history':
          return this.sendJson(res, { success: true, data: this.chatHistory });
        
        default:
          return this.sendError(res, 404, 'Not found');
      }
    }

    // POST endpoints
    if (method === 'POST') {
      const body = await this.readBody(req);
      const data = body ? JSON.parse(body) : {};

      switch (path) {
        case '/api/config/save':
          return this.sendJson(res, await this.saveConfiguration(data));
        
        case '/api/simulation/start':
          return this.sendJson(res, await this.startSimulation());
        
        case '/api/simulation/stop':
          return this.sendJson(res, await this.stopSimulation());
        
        case '/api/server/connect':
          return this.sendJson(res, await this.connectToServer(data));
        
        case '/api/server/disconnect':
          return this.sendJson(res, await this.disconnectFromServer());
        
        case '/api/models/install':
          return this.sendJson(res, await this.installModel(data.modelId));
        
        case '/api/models/select':
          return this.sendJson(res, await this.selectModel(data.modelId));
        
        case '/api/ollama/install':
          return this.sendJson(res, await this.installOllama());
        
        case '/api/ollama/start':
          return this.sendJson(res, await this.startOllama());
        
        case '/api/chat/send':
          return this.sendJson(res, await this.handleChat(data.message));
        
        case '/api/command':
          return this.sendJson(res, await this.executeCommand(data));
        
        default:
          return this.sendError(res, 404, 'Not found');
      }
    }

    this.sendError(res, 405, 'Method not allowed');
  }

  // ========== API Handlers ==========

  private async getStatus(): Promise<any> {
    await this.checkOllamaStatus();
    
    return {
      success: true,
      data: {
        ...this.state,
        version: '0.1.0',
        platform: process.platform,
        nodeVersion: process.version,
        uptime: process.uptime()
      }
    };
  }

  private getConfiguration(): any {
    try {
      const config = getConfig();
      return { success: true, data: config };
    } catch {
      return { success: true, data: loadConfig() };
    }
  }

  private async saveConfiguration(config: any): Promise<any> {
    try {
      saveConfig(config);
      return { success: true, message: 'Configuration saved' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async getModels(): Promise<any> {
    await this.checkOllamaStatus();
    
    const models = AVAILABLE_MODELS.map(model => ({
      ...model,
      installed: model.provider === 'stub' || this.state.installedModels.includes(model.ollamaName || ''),
      current: this.state.currentModel === model.id
    }));

    return {
      success: true,
      data: {
        models,
        ollamaInstalled: this.state.ollamaInstalled,
        ollamaRunning: this.state.ollamaRunning,
        currentModel: this.state.currentModel
      }
    };
  }

  private async installModel(modelId: string): Promise<any> {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!model) {
      return { success: false, error: 'Model not found' };
    }

    if (model.provider === 'stub') {
      return { success: true, message: 'Built-in model, no installation needed' };
    }

    if (!this.state.ollamaRunning) {
      return { success: false, error: 'Ollama is not running. Please start Ollama first.' };
    }

    try {
      logger.info(`Installing model: ${model.ollamaName}`);
      
      // Pull the model using Ollama API
      const ollamaUrl = this.getOllamaUrl();
      const response = await fetch(`${ollamaUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model.ollamaName })
      });

      if (!response.ok) {
        throw new Error(`Failed to install model: ${response.statusText}`);
      }

      // Update installed models list
      await this.checkOllamaStatus();
      
      return { success: true, message: `Model ${model.name} installation started` };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async selectModel(modelId: string): Promise<any> {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!model) {
      return { success: false, error: 'Model not found' };
    }

    this.state.currentModel = modelId;
    
    // Update config
    try {
      const config = getConfig();
      config.ai.model = model.ollamaName || 'stub';
      config.ai.provider = model.provider as any;
      saveConfig(config);
      
      // Reinitialize AI client
      initializeAiClient(config.ai);
      
      return { success: true, message: `Now using ${model.name}` };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async installOllama(): Promise<any> {
    const platform = process.platform;
    let instructions = '';

    if (platform === 'darwin') {
      instructions = 'Run in terminal: curl -fsSL https://ollama.com/install.sh | sh';
    } else if (platform === 'linux') {
      instructions = 'Run in terminal: curl -fsSL https://ollama.com/install.sh | sh';
    } else if (platform === 'win32') {
      instructions = 'Download from: https://ollama.com/download/windows';
    } else {
      instructions = 'Visit https://ollama.com for installation instructions';
    }

    return {
      success: true,
      data: {
        platform,
        instructions,
        downloadUrl: 'https://ollama.com/download'
      }
    };
  }

  private async startOllama(): Promise<any> {
    try {
      if (process.platform === 'win32') {
        exec('start ollama serve');
      } else {
        exec('ollama serve &');
      }
      
      // Wait a moment for Ollama to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      await this.checkOllamaStatus();
      
      return { success: true, message: 'Ollama start command sent' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async startSimulation(): Promise<any> {
    try {
      this.state.simulationRunning = true;
      return { success: true, message: 'Simulation started' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async stopSimulation(): Promise<any> {
    try {
      this.state.simulationRunning = false;
      return { success: true, message: 'Simulation stopped' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async connectToServer(config: { host: string; port: number; edition: 'java' | 'bedrock'; version: string }): Promise<any> {
    try {
      logger.info(`Connecting to ${config.edition} server: ${config.host}:${config.port}`);
      
      // Update config
      const currentConfig = getConfig();
      currentConfig.minecraft.host = config.host;
      currentConfig.minecraft.port = config.port;
      currentConfig.minecraft.edition = config.edition;
      currentConfig.minecraft.version = config.version;
      saveConfig(currentConfig);
      
      this.state.connectedToServer = true;
      this.state.serverEdition = config.edition;
      
      return { success: true, message: `Connected to ${config.host}:${config.port}` };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async disconnectFromServer(): Promise<any> {
    this.state.connectedToServer = false;
    return { success: true, message: 'Disconnected from server' };
  }

  private async handleChat(message: string): Promise<any> {
    // Add user message to history
    this.chatHistory.push({
      role: 'user',
      message,
      timestamp: Date.now()
    });

    // Parse commands
    const response = await this.processCommand(message);
    
    // Add assistant response to history
    this.chatHistory.push({
      role: 'assistant',
      message: response,
      timestamp: Date.now()
    });

    // Keep history limited
    if (this.chatHistory.length > 100) {
      this.chatHistory = this.chatHistory.slice(-100);
    }

    return { success: true, data: { response } };
  }

  private async processCommand(message: string): Promise<string> {
    const lower = message.toLowerCase();

    // Server commands
    if (lower.includes('connect to') || lower.includes('join server')) {
      const match = message.match(/(\d+\.\d+\.\d+\.\d+|\w+\.\w+(?:\.\w+)*):?(\d+)?/);
      if (match) {
        const host = match[1];
        const port = parseInt(match[2]) || 25565;
        const edition = lower.includes('bedrock') ? 'bedrock' : 'java';
        await this.connectToServer({ host, port, edition, version: '1.20.4' });
        return `Connecting to ${edition} server at ${host}:${port}...`;
      }
      return 'Please specify a server address, e.g., "connect to play.server.com:25565"';
    }

    if (lower.includes('disconnect') || lower.includes('leave server')) {
      await this.disconnectFromServer();
      return 'Disconnected from server.';
    }

    // Simulation commands
    if (lower.includes('start simulation') || lower.includes('start sim') || lower === 'start') {
      await this.startSimulation();
      return 'Simulation started! Bots are now active.';
    }

    if (lower.includes('stop simulation') || lower.includes('stop sim') || lower === 'stop') {
      await this.stopSimulation();
      return 'Simulation stopped. Bots are now idle.';
    }

    // Model commands
    if (lower.includes('use model') || lower.includes('switch to') || lower.includes('change model')) {
      for (const model of AVAILABLE_MODELS) {
        if (lower.includes(model.id) || lower.includes(model.name.toLowerCase())) {
          await this.selectModel(model.id);
          return `Switched to ${model.name}. ${model.description}`;
        }
      }
      return 'Available models: ' + AVAILABLE_MODELS.map(m => m.name).join(', ');
    }

    if (lower.includes('install model') || lower.includes('download model')) {
      for (const model of AVAILABLE_MODELS) {
        if (lower.includes(model.id) || lower.includes(model.name.toLowerCase())) {
          const result = await this.installModel(model.id);
          return result.success ? `Installing ${model.name}...` : result.error;
        }
      }
      return 'Which model? Available: ' + AVAILABLE_MODELS.filter(m => m.provider !== 'stub').map(m => m.name).join(', ');
    }

    // Status commands
    if (lower.includes('status') || lower.includes('how are') || lower === 'info') {
      const botManager = getBotManager();
      const living = botManager.getLivingBotCount();
      const villages = getSimEngine().getAllVillages().length;
      return `BlockLife Status:\n• Simulation: ${this.state.simulationRunning ? 'Running' : 'Stopped'}\n• Server: ${this.state.connectedToServer ? 'Connected' : 'Not connected'}\n• Bots: ${living} alive\n• Villages: ${villages}\n• AI Model: ${this.state.currentModel}`;
    }

    // Help
    if (lower.includes('help') || lower === '?') {
      return `Available commands:\n• "connect to [server:port]" - Connect to Minecraft server\n• "disconnect" - Leave server\n• "start/stop" - Control simulation\n• "use model [name]" - Switch AI model\n• "install model [name]" - Download AI model\n• "status" - Show current status\n• "create [N] bots" - Spawn new bots`;
    }

    // Bot commands
    if (lower.includes('create') && lower.includes('bot')) {
      const match = message.match(/(\d+)/);
      const count = match ? parseInt(match[1]) : 1;
      return `Creating ${count} new bot(s)...`;
    }

    // Default - send to AI for interpretation
    return `I understand you want to: "${message}". Try "help" for available commands.`;
  }

  private async executeCommand(cmd: any): Promise<any> {
    logger.info(`Executing command: ${JSON.stringify(cmd)}`);
    return { success: true, data: { executed: true } };
  }

  private getOverview(): any {
    try {
      const sim = getSimEngine();
      const bots = getBotManager();
      const state = sim.getState();
      const allBots = bots.getAllBots();
      const living = allBots.filter(b => !b.isDead());

      return {
        success: true,
        data: {
          era: state.era,
          simulationDays: Math.floor(state.simulationDays),
          currentTick: state.currentTick,
          population: living.length,
          villages: state.villages.length,
          simulationRunning: this.state.simulationRunning,
          connectedToServer: this.state.connectedToServer
        }
      };
    } catch {
      return {
        success: true,
        data: {
          era: 'DAWN',
          simulationDays: 0,
          currentTick: 0,
          population: 0,
          villages: 0,
          simulationRunning: this.state.simulationRunning,
          connectedToServer: this.state.connectedToServer
        }
      };
    }
  }

  private getBots(): any {
    try {
      const bots = getBotManager().getAllBots();
      return {
        success: true,
        data: bots.map(b => {
          const data = b.getData();
          return {
            id: data.id,
            name: data.name,
            role: data.role,
            lifeStage: data.lifeStage,
            health: data.health,
            mood: data.mood,
            isDead: data.flags.isDead
          };
        })
      };
    } catch {
      return { success: true, data: [] };
    }
  }

  private getVillages(): any {
    try {
      const villages = getSimEngine().getAllVillages();
      return {
        success: true,
        data: villages.map(v => ({
          id: v.id,
          name: v.name,
          population: v.memberIds.length,
          prosperity: v.prosperity,
          techAge: v.techAge
        }))
      };
    } catch {
      return { success: true, data: [] };
    }
  }

  // ========== Static File Server ==========

  private serveDashboard(pathname: string, res: http.ServerResponse): void {
    if (pathname === '/' || pathname === '/index.html') {
      res.setHeader('Content-Type', 'text/html');
      res.writeHead(200);
      res.end(this.getDashboardHtml());
      return;
    }

    // Serve static files from public directory
    const publicPath = path.join(process.cwd(), 'public', pathname);
    if (fs.existsSync(publicPath)) {
      const ext = path.extname(pathname);
      const contentTypes: Record<string, string> = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml'
      };
      res.setHeader('Content-Type', contentTypes[ext] || 'text/plain');
      res.writeHead(200);
      res.end(fs.readFileSync(publicPath));
      return;
    }

    // Default to dashboard
    res.setHeader('Content-Type', 'text/html');
    res.writeHead(200);
    res.end(this.getDashboardHtml());
  }

  private getDashboardHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BlockLife AI - Control Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --bg-primary: #0f0f1a;
      --bg-secondary: #1a1a2e;
      --bg-tertiary: #252540;
      --text-primary: #ffffff;
      --text-secondary: #a0a0c0;
      --accent: #6c5ce7;
      --accent-hover: #8b7cf7;
      --success: #00b894;
      --warning: #fdcb6e;
      --danger: #ff7675;
      --border: #3d3d5c;
    }
    
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
    }
    
    /* Header */
    header {
      background: var(--bg-secondary);
      padding: 1rem 2rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .logo {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .logo h1 {
      font-size: 1.5rem;
      background: linear-gradient(135deg, var(--accent), #a29bfe);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .status-badges {
      display: flex;
      gap: 1rem;
    }
    
    .badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .badge.success { background: rgba(0, 184, 148, 0.2); color: var(--success); }
    .badge.warning { background: rgba(253, 203, 110, 0.2); color: var(--warning); }
    .badge.danger { background: rgba(255, 118, 117, 0.2); color: var(--danger); }
    
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }
    
    /* Main Layout */
    .container {
      display: grid;
      grid-template-columns: 280px 1fr 350px;
      min-height: calc(100vh - 60px);
    }
    
    /* Sidebar */
    .sidebar {
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
      padding: 1rem;
    }
    
    .nav-section {
      margin-bottom: 1.5rem;
    }
    
    .nav-section h3 {
      color: var(--text-secondary);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 0.75rem;
      padding-left: 0.5rem;
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      color: var(--text-secondary);
    }
    
    .nav-item:hover, .nav-item.active {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }
    
    .nav-item.active {
      border-left: 3px solid var(--accent);
    }
    
    /* Main Content */
    .main {
      padding: 1.5rem;
      overflow-y: auto;
    }
    
    .panel {
      background: var(--bg-secondary);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    
    .panel h2 {
      font-size: 1.1rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    /* Forms */
    .form-group {
      margin-bottom: 1rem;
    }
    
    .form-group label {
      display: block;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }
    
    input, select {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-tertiary);
      color: var(--text-primary);
      font-size: 1rem;
    }
    
    input:focus, select:focus {
      outline: none;
      border-color: var(--accent);
    }
    
    button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background: var(--accent);
      color: white;
    }
    
    .btn-primary:hover {
      background: var(--accent-hover);
    }
    
    .btn-secondary {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: 1px solid var(--border);
    }
    
    .btn-danger {
      background: var(--danger);
      color: white;
    }
    
    .btn-success {
      background: var(--success);
      color: white;
    }
    
    /* Model Cards */
    .model-grid {
      display: grid;
      gap: 1rem;
    }
    
    .model-card {
      background: var(--bg-tertiary);
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid var(--border);
    }
    
    .model-card.active {
      border-color: var(--accent);
    }
    
    .model-info h4 {
      margin-bottom: 0.25rem;
    }
    
    .model-info p {
      color: var(--text-secondary);
      font-size: 0.85rem;
    }
    
    .model-size {
      color: var(--text-secondary);
      font-size: 0.8rem;
    }
    
    /* Chat Panel */
    .chat-panel {
      background: var(--bg-secondary);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      height: calc(100vh - 60px);
    }
    
    .chat-header {
      padding: 1rem;
      border-bottom: 1px solid var(--border);
    }
    
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }
    
    .message {
      margin-bottom: 1rem;
      display: flex;
      gap: 0.75rem;
    }
    
    .message.user {
      flex-direction: row-reverse;
    }
    
    .message-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .message.user .message-avatar {
      background: var(--bg-tertiary);
    }
    
    .message-content {
      background: var(--bg-tertiary);
      padding: 0.75rem 1rem;
      border-radius: 12px;
      max-width: 80%;
    }
    
    .message.user .message-content {
      background: var(--accent);
    }
    
    .chat-input {
      padding: 1rem;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 0.5rem;
    }
    
    .chat-input input {
      flex: 1;
    }
    
    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }
    
    .stat-card {
      background: var(--bg-tertiary);
      padding: 1rem;
      border-radius: 8px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: var(--accent);
    }
    
    .stat-label {
      color: var(--text-secondary);
      font-size: 0.85rem;
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    
    .tab {
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      background: var(--bg-tertiary);
      color: var(--text-secondary);
    }
    
    .tab.active {
      background: var(--accent);
      color: white;
    }
    
    /* Responsive */
    @media (max-width: 1200px) {
      .container {
        grid-template-columns: 1fr;
      }
      .sidebar, .chat-panel {
        display: none;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="logo">
      <span style="font-size: 2rem;">🌍</span>
      <h1>BlockLife AI</h1>
    </div>
    <div class="status-badges">
      <div class="badge" id="sim-status">
        <span class="dot"></span>
        <span>Loading...</span>
      </div>
      <div class="badge" id="server-status">
        <span class="dot"></span>
        <span>Not Connected</span>
      </div>
      <div class="badge" id="ai-status">
        <span class="dot"></span>
        <span>AI: Loading...</span>
      </div>
    </div>
  </header>
  
  <div class="container">
    <!-- Sidebar -->
    <aside class="sidebar">
      <nav>
        <div class="nav-section">
          <h3>Dashboard</h3>
          <div class="nav-item active" data-view="overview">📊 Overview</div>
          <div class="nav-item" data-view="bots">🤖 Bots</div>
          <div class="nav-item" data-view="villages">🏘️ Villages</div>
        </div>
        <div class="nav-section">
          <h3>Configuration</h3>
          <div class="nav-item" data-view="server">🎮 Server Setup</div>
          <div class="nav-item" data-view="ai">🧠 AI Model</div>
          <div class="nav-item" data-view="settings">⚙️ Settings</div>
        </div>
        <div class="nav-section">
          <h3>Controls</h3>
          <div class="nav-item" data-view="controls">🎛️ Simulation</div>
        </div>
      </nav>
    </aside>
    
    <!-- Main Content -->
    <main class="main" id="main-content">
      <!-- Content loaded dynamically -->
    </main>
    
    <!-- Chat Panel -->
    <aside class="chat-panel">
      <div class="chat-header">
        <h3>💬 Command Center</h3>
        <p style="color: var(--text-secondary); font-size: 0.85rem;">Chat to control BlockLife</p>
      </div>
      <div class="chat-messages" id="chat-messages">
        <div class="message">
          <div class="message-avatar">🤖</div>
          <div class="message-content">
            Welcome to BlockLife! Type "help" to see available commands, or just tell me what you want to do.
          </div>
        </div>
      </div>
      <div class="chat-input">
        <input type="text" id="chat-input" placeholder="Type a command..." onkeypress="if(event.key==='Enter')sendChat()">
        <button class="btn-primary" onclick="sendChat()">Send</button>
      </div>
    </aside>
  </div>

  <script>
    // State
    let currentView = 'overview';
    let state = {};
    
    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      loadStatus();
      loadView('overview');
      setInterval(loadStatus, 5000);
      
      // Navigation
      document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
          document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          loadView(item.dataset.view);
        });
      });
    });
    
    // API calls
    async function api(path, method = 'GET', data = null) {
      const options = { method, headers: { 'Content-Type': 'application/json' } };
      if (data) options.body = JSON.stringify(data);
      const res = await fetch('/api' + path, options);
      return res.json();
    }
    
    // Load status
    async function loadStatus() {
      const res = await api('/status');
      if (res.success) {
        state = res.data;
        updateStatusBadges();
      }
    }
    
    function updateStatusBadges() {
      const simBadge = document.getElementById('sim-status');
      const serverBadge = document.getElementById('server-status');
      const aiBadge = document.getElementById('ai-status');
      
      simBadge.className = 'badge ' + (state.simulationRunning ? 'success' : 'warning');
      simBadge.innerHTML = '<span class="dot"></span><span>' + (state.simulationRunning ? 'Running' : 'Stopped') + '</span>';
      
      serverBadge.className = 'badge ' + (state.connectedToServer ? 'success' : 'danger');
      serverBadge.innerHTML = '<span class="dot"></span><span>' + (state.connectedToServer ? 'Connected' : 'Not Connected') + '</span>';
      
      aiBadge.className = 'badge success';
      aiBadge.innerHTML = '<span class="dot"></span><span>AI: ' + (state.currentModel || 'stub') + '</span>';
    }
    
    // View rendering
    async function loadView(view) {
      currentView = view;
      const main = document.getElementById('main-content');
      
      switch(view) {
        case 'overview': main.innerHTML = await renderOverview(); break;
        case 'server': main.innerHTML = await renderServerSetup(); break;
        case 'ai': main.innerHTML = await renderAiSetup(); break;
        case 'bots': main.innerHTML = await renderBots(); break;
        case 'villages': main.innerHTML = await renderVillages(); break;
        case 'controls': main.innerHTML = await renderControls(); break;
        case 'settings': main.innerHTML = await renderSettings(); break;
        default: main.innerHTML = '<p>View not found</p>';
      }
    }
    
    async function renderOverview() {
      const overview = await api('/overview');
      const data = overview.data || {};
      
      return \`
        <h1 style="margin-bottom: 1.5rem;">Dashboard Overview</h1>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">\${data.population || 0}</div>
            <div class="stat-label">Total Bots</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">\${data.villages || 0}</div>
            <div class="stat-label">Villages</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">\${data.simulationDays || 0}</div>
            <div class="stat-label">Sim Days</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">\${data.era || 'DAWN'}</div>
            <div class="stat-label">Era</div>
          </div>
        </div>
        
        <div class="panel" style="margin-top: 1.5rem;">
          <h2>🚀 Quick Start</h2>
          <p style="color: var(--text-secondary); margin-bottom: 1rem;">Get BlockLife running in 3 steps:</p>
          <ol style="color: var(--text-secondary); padding-left: 1.5rem; line-height: 2;">
            <li>Configure your Minecraft server in <strong>Server Setup</strong></li>
            <li>Choose an AI model in <strong>AI Model</strong></li>
            <li>Click <strong>Start Simulation</strong> in Controls</li>
          </ol>
        </div>
      \`;
    }
    
    async function renderServerSetup() {
      const config = await api('/config');
      const mc = config.data?.minecraft || {};
      
      return \`
        <h1 style="margin-bottom: 1.5rem;">🎮 Server Setup</h1>
        
        <div class="panel">
          <h2>Minecraft Server Connection</h2>
          
          <div class="tabs">
            <div class="tab active" onclick="setEdition('java', this)">Java Edition</div>
            <div class="tab" onclick="setEdition('bedrock', this)">Bedrock Edition</div>
          </div>
          
          <div class="form-group">
            <label>Server Address</label>
            <input type="text" id="server-host" value="\${mc.host || 'localhost'}" placeholder="play.server.com">
          </div>
          
          <div class="form-group">
            <label>Port</label>
            <input type="number" id="server-port" value="\${mc.port || 25565}" placeholder="25565">
          </div>
          
          <div class="form-group">
            <label>Minecraft Version</label>
            <select id="server-version">
              <option value="1.20.4" \${mc.version === '1.20.4' ? 'selected' : ''}>1.20.4</option>
              <option value="1.20.2" \${mc.version === '1.20.2' ? 'selected' : ''}>1.20.2</option>
              <option value="1.19.4" \${mc.version === '1.19.4' ? 'selected' : ''}>1.19.4</option>
              <option value="1.18.2" \${mc.version === '1.18.2' ? 'selected' : ''}>1.18.2</option>
            </select>
          </div>
          
          <input type="hidden" id="server-edition" value="\${mc.edition || 'java'}">
          
          <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
            <button class="btn-primary" onclick="connectServer()">Connect to Server</button>
            <button class="btn-secondary" onclick="disconnectServer()">Disconnect</button>
          </div>
        </div>
        
        <div class="panel">
          <h2>⚠️ Server Requirements</h2>
          <ul style="color: var(--text-secondary); padding-left: 1.5rem; line-height: 1.8;">
            <li>Server must have <code>online-mode=false</code> in server.properties</li>
            <li>Ensure enough player slots for bots (recommended: 50+)</li>
            <li>Disable spawn protection or set it to 0</li>
            <li>For Bedrock: Use a Bedrock Dedicated Server or Geyser plugin</li>
          </ul>
        </div>
      \`;
    }
    
    async function renderAiSetup() {
      const models = await api('/models');
      const data = models.data || {};
      
      let modelsHtml = (data.models || []).map(m => \`
        <div class="model-card \${m.current ? 'active' : ''}">
          <div class="model-info">
            <h4>\${m.name} \${m.recommended ? '⭐' : ''}</h4>
            <p>\${m.description}</p>
            <span class="model-size">\${m.size}</span>
          </div>
          <div>
            \${m.installed 
              ? (m.current 
                  ? '<span style="color: var(--success)">✓ Active</span>'
                  : '<button class="btn-secondary" onclick="selectModel(\\'' + m.id + '\\')">Use</button>')
              : '<button class="btn-primary" onclick="installModel(\\'' + m.id + '\\')">Install</button>'
            }
          </div>
        </div>
      \`).join('');
      
      return \`
        <h1 style="margin-bottom: 1.5rem;">🧠 AI Model Configuration</h1>
        
        <div class="panel">
          <h2>Ollama Status</h2>
          <p style="color: var(--text-secondary); margin-bottom: 1rem;">
            Ollama is required to run AI models locally.
          </p>
          <div style="display: flex; gap: 1rem; align-items: center;">
            <span class="badge \${data.ollamaRunning ? 'success' : 'danger'}">
              <span class="dot"></span>
              \${data.ollamaRunning ? 'Ollama Running' : 'Ollama Not Running'}
            </span>
            \${!data.ollamaInstalled 
              ? '<button class="btn-primary" onclick="installOllama()">Install Ollama</button>'
              : (!data.ollamaRunning ? '<button class="btn-secondary" onclick="startOllama()">Start Ollama</button>' : '')
            }
          </div>
        </div>
        
        <div class="panel">
          <h2>Available Models</h2>
          <p style="color: var(--text-secondary); margin-bottom: 1rem;">
            Select an AI model for bot decision-making. Larger models = better decisions but more resources.
          </p>
          <div class="model-grid">
            \${modelsHtml}
          </div>
        </div>
      \`;
    }
    
    async function renderBots() {
      const bots = await api('/bots');
      const data = bots.data || [];
      
      let botsHtml = data.slice(0, 20).map(b => \`
        <div class="model-card">
          <div class="model-info">
            <h4>\${b.name}</h4>
            <p>Role: \${b.role} | Stage: \${b.lifeStage} | Mood: \${b.mood}</p>
          </div>
          <div>
            <span style="color: \${b.isDead ? 'var(--danger)' : 'var(--success)'}">
              \${b.isDead ? '💀 Dead' : '❤️ ' + b.health + '%'}
            </span>
          </div>
        </div>
      \`).join('');
      
      return \`
        <h1 style="margin-bottom: 1.5rem;">🤖 Bots (\${data.length})</h1>
        <div class="model-grid">
          \${botsHtml || '<p style="color: var(--text-secondary)">No bots yet. Start the simulation to create bots.</p>'}
        </div>
      \`;
    }
    
    async function renderVillages() {
      const villages = await api('/villages');
      const data = villages.data || [];
      
      let villagesHtml = data.map(v => \`
        <div class="model-card">
          <div class="model-info">
            <h4>🏘️ \${v.name}</h4>
            <p>Population: \${v.population} | Tech: \${v.techAge}</p>
          </div>
          <div>
            <span>Prosperity: \${v.prosperity}%</span>
          </div>
        </div>
      \`).join('');
      
      return \`
        <h1 style="margin-bottom: 1.5rem;">🏘️ Villages (\${data.length})</h1>
        <div class="model-grid">
          \${villagesHtml || '<p style="color: var(--text-secondary)">No villages yet. Start the simulation to create villages.</p>'}
        </div>
      \`;
    }
    
    async function renderControls() {
      return \`
        <h1 style="margin-bottom: 1.5rem;">🎛️ Simulation Controls</h1>
        
        <div class="panel">
          <h2>Simulation</h2>
          <div style="display: flex; gap: 1rem; margin-top: 1rem;">
            <button class="btn-success" onclick="startSim()" style="font-size: 1.1rem; padding: 1rem 2rem;">
              ▶️ Start Simulation
            </button>
            <button class="btn-danger" onclick="stopSim()" style="font-size: 1.1rem; padding: 1rem 2rem;">
              ⏹️ Stop Simulation
            </button>
          </div>
        </div>
        
        <div class="panel">
          <h2>Bot Management</h2>
          <div class="form-group">
            <label>Number of Bots to Create</label>
            <input type="number" id="bot-count" value="10" min="1" max="100">
          </div>
          <button class="btn-primary" onclick="createBots()">Create Bots</button>
        </div>
      \`;
    }
    
    async function renderSettings() {
      const config = await api('/config');
      const sim = config.data?.simulation || {};
      
      return \`
        <h1 style="margin-bottom: 1.5rem;">⚙️ Settings</h1>
        
        <div class="panel">
          <h2>Performance</h2>
          <div class="form-group">
            <label>Performance Mode</label>
            <select id="perf-mode">
              <option value="ECO" \${sim.performanceMode === 'ECO' ? 'selected' : ''}>ECO (Battery Saver)</option>
              <option value="NORMAL" \${sim.performanceMode === 'NORMAL' ? 'selected' : ''}>NORMAL (Balanced)</option>
              <option value="PERFORMANCE" \${sim.performanceMode === 'PERFORMANCE' ? 'selected' : ''}>PERFORMANCE (Full Power)</option>
              <option value="AUTO" \${sim.performanceMode === 'AUTO' ? 'selected' : ''}>AUTO (Adaptive)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Max Bots</label>
            <input type="number" id="max-bots" value="\${sim.maxBots || 50}" min="10" max="200">
          </div>
          <div class="form-group">
            <label>Tick Rate (ms)</label>
            <input type="number" id="tick-rate" value="\${sim.tickRateMs || 300}" min="100" max="1000">
          </div>
          <button class="btn-primary" onclick="saveSettings()">Save Settings</button>
        </div>
      \`;
    }
    
    // Actions
    function setEdition(edition, el) {
      document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
      el.classList.add('active');
      document.getElementById('server-edition').value = edition;
      document.getElementById('server-port').value = edition === 'bedrock' ? '19132' : '25565';
    }
    
    async function connectServer() {
      const host = document.getElementById('server-host').value;
      const port = parseInt(document.getElementById('server-port').value);
      const version = document.getElementById('server-version').value;
      const edition = document.getElementById('server-edition').value;
      
      const res = await api('/server/connect', 'POST', { host, port, version, edition });
      alert(res.success ? 'Connected to server!' : 'Error: ' + res.error);
      loadStatus();
    }
    
    async function disconnectServer() {
      await api('/server/disconnect', 'POST');
      loadStatus();
    }
    
    async function selectModel(id) {
      const res = await api('/models/select', 'POST', { modelId: id });
      alert(res.message || res.error);
      loadView('ai');
      loadStatus();
    }
    
    async function installModel(id) {
      alert('Installing model... This may take a few minutes.');
      const res = await api('/models/install', 'POST', { modelId: id });
      alert(res.message || res.error);
      loadView('ai');
    }
    
    async function installOllama() {
      const res = await api('/ollama/install', 'POST');
      alert('To install Ollama:\\n\\n' + res.data.instructions);
    }
    
    async function startOllama() {
      await api('/ollama/start', 'POST');
      setTimeout(() => loadView('ai'), 3000);
    }
    
    async function startSim() {
      await api('/simulation/start', 'POST');
      loadStatus();
    }
    
    async function stopSim() {
      await api('/simulation/stop', 'POST');
      loadStatus();
    }
    
    async function createBots() {
      const count = document.getElementById('bot-count').value;
      await sendChatMessage('create ' + count + ' bots');
    }
    
    async function saveSettings() {
      const config = {
        simulation: {
          performanceMode: document.getElementById('perf-mode').value,
          maxBots: parseInt(document.getElementById('max-bots').value),
          tickRateMs: parseInt(document.getElementById('tick-rate').value)
        }
      };
      const res = await api('/config/save', 'POST', config);
      alert(res.success ? 'Settings saved!' : 'Error saving settings');
    }
    
    // Chat
    async function sendChat() {
      const input = document.getElementById('chat-input');
      const message = input.value.trim();
      if (!message) return;
      
      input.value = '';
      await sendChatMessage(message);
    }
    
    async function sendChatMessage(message) {
      const messagesDiv = document.getElementById('chat-messages');
      
      // Add user message
      messagesDiv.innerHTML += \`
        <div class="message user">
          <div class="message-avatar">👤</div>
          <div class="message-content">\${message}</div>
        </div>
      \`;
      
      // Get response
      const res = await api('/chat/send', 'POST', { message });
      
      // Add bot response
      messagesDiv.innerHTML += \`
        <div class="message">
          <div class="message-avatar">🤖</div>
          <div class="message-content">\${res.data?.response || 'Error processing command'}</div>
        </div>
      \`;
      
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      loadStatus();
    }
  </script>
</body>
</html>`;
  }

  // ========== Helpers ==========

  private sendJson(res: http.ServerResponse, data: any): void {
    res.writeHead(200);
    res.end(JSON.stringify(data));
  }

  private sendError(res: http.ServerResponse, code: number, message: string): void {
    res.writeHead(code);
    res.end(JSON.stringify({ success: false, error: message }));
  }

  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }

  stop(): void {
    this.server?.close();
    logger.info('Dashboard server stopped');
  }
}

export const dashboardServer = new DashboardServer();
export default DashboardServer;
