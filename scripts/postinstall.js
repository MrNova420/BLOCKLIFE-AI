#!/usr/bin/env node
/**
 * BlockLife AI - Post-Install Setup
 * Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
 * 
 * Runs after npm install to set up default configuration and check for AI models.
 */

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(msg, color = 'reset') {
  console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
}

function logStep(step, msg) {
  console.log(`${COLORS.cyan}[${step}]${COLORS.reset} ${msg}`);
}

// Check if a module is available
function checkModule(moduleName) {
  try {
    require(moduleName);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║           BLOCKLIFE AI - POST-INSTALL SETUP                ║', 'cyan');
  log('║     Copyright © 2025 WeNova Interactive                    ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');

  // Step 1: Create required directories
  logStep('1/6', 'Creating directories...');
  const dirs = [
    'data',
    'data/logs',
    'data/snapshots',
    'config',
    'public',
    'models'
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`  ✓ Created ${dir}/`, 'green');
    }
  }

  // Step 2: Create default config if not exists
  logStep('2/6', 'Setting up configuration...');
  const configPath = 'config/default.json';
  if (!fs.existsSync(configPath)) {
    const defaultConfig = {
      minecraft: {
        host: 'localhost',
        port: 25565,
        version: '1.20.4',
        usernamePrefix: 'BlockLife_',
        edition: 'java'
      },
      simulation: {
        performanceMode: 'AUTO',
        maxBots: 50,
        tickRateMs: 300,
        aiEnabled: true,
        autoSave: true,
        saveIntervalMs: 60000
      },
      ai: {
        provider: 'stub',
        model: 'tinyllama',
        maxBatchSize: 10,
        minBatchSize: 3,
        decisionIntervalMs: 8000,
        timeoutMs: 5000,
        fallbackEnabled: true,
        ollama: {
          host: 'localhost',
          port: 11434
        }
      },
      logging: {
        level: 'info',
        categories: ['system', 'ai', 'sim', 'perf'],
        file: './data/logs/blocklife.log',
        maxSize: '10MB',
        maxFiles: 5
      },
      data: {
        dir: './data',
        snapshotsDir: './data/snapshots',
        maxSnapshots: 10
      }
    };
    
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    log('  ✓ Created default configuration', 'green');
  } else {
    log('  ✓ Configuration already exists', 'green');
  }

  // Step 3: Check optional dependencies
  logStep('3/6', 'Checking optional features...');
  
  const sqliteAvailable = checkModule('better-sqlite3');
  const bedrockAvailable = checkModule('bedrock-protocol');
  
  // node-llama-cpp requires dynamic import (ESM)
  let llamaAvailable = false;
  try {
    // Just check if the package directory exists
    const llamaPath = path.join(process.cwd(), 'node_modules', 'node-llama-cpp');
    llamaAvailable = fs.existsSync(llamaPath);
  } catch {
    llamaAvailable = false;
  }

  if (sqliteAvailable) {
    log('  ✓ SQLite storage (better-sqlite3) - faster data storage', 'green');
  } else {
    log('  ⚠ SQLite storage - not available (using JSON fallback)', 'yellow');
  }

  if (bedrockAvailable) {
    log('  ✓ Bedrock Edition support - connect to Bedrock servers', 'green');
  } else {
    log('  ⚠ Bedrock Edition - not available (Java Edition works)', 'yellow');
  }

  if (llamaAvailable) {
    log('  ✓ Local AI models (node-llama-cpp) - run AI locally', 'green');
  } else {
    log('  ⚠ Local AI models - not available (use Ollama instead)', 'yellow');
  }

  // Step 4: Check for Ollama
  logStep('4/6', 'Checking for Ollama AI runtime...');
  let ollamaInstalled = false;
  
  try {
    execSync('which ollama || where ollama', { stdio: 'pipe' });
    ollamaInstalled = true;
    log('  ✓ Ollama is installed', 'green');
  } catch {
    log('  ⚠ Ollama not found - AI models won\'t be available until installed', 'yellow');
    log('    Install from: https://ollama.com/download', 'yellow');
  }

  // Step 5: Try to check Ollama models
  logStep('5/6', 'Checking AI models...');
  if (ollamaInstalled) {
    try {
      // Check if fetch is available (Node.js 18+)
      if (typeof fetch === 'undefined') {
        log('  ℹ Skipping Ollama check (Node.js 18+ required for fetch)', 'blue');
        log('  ℹ BlockLife will check for models when started', 'blue');
      } else {
        // Check if Ollama is running
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch('http://localhost:11434/api/tags', {
          signal: controller.signal
        }).catch(() => null).finally(() => clearTimeout(timeoutId));
        
        if (response && response.ok) {
          const data = await response.json();
          const models = data.models?.map(m => m.name) || [];
          
          if (models.length === 0) {
            log('  ℹ No AI models installed yet', 'blue');
            log('  ℹ You can install models from the dashboard after starting BlockLife', 'blue');
            log('  ℹ Or run: ollama pull tinyllama', 'blue');
          } else {
            log(`  ✓ Found ${models.length} AI model(s): ${models.slice(0, 3).join(', ')}${models.length > 3 ? '...' : ''}`, 'green');
          }
        } else {
          log('  ⚠ Ollama is not running - start it with: ollama serve', 'yellow');
        }
      }
    } catch (e) {
      log('  ⚠ Could not check Ollama status', 'yellow');
    }
  } else {
    log('  ℹ Skipping model check (Ollama not installed)', 'blue');
    log('  ℹ BlockLife will use built-in rule-based AI instead', 'blue');
  }

  // Step 6: Finalize
  logStep('6/6', 'Finalizing setup...');
  const gitignorePath = '.gitignore';
  const gitignoreAdditions = [
    '',
    '# BlockLife data',
    'data/',
    'models/',
    '*.log'
  ];
  
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf8');
    if (!content.includes('# BlockLife data')) {
      fs.appendFileSync(gitignorePath, gitignoreAdditions.join('\n'));
      log('  ✓ Updated .gitignore', 'green');
    }
  }

  // Done!
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'green');
  log('║                 SETUP COMPLETE! ✓                          ║', 'green');
  log('╚════════════════════════════════════════════════════════════╝', 'green');
  console.log('\n');
  
  // Show feature summary
  log('Available Features:', 'bright');
  log('  ✓ Core simulation engine', 'green');
  log('  ✓ Web dashboard at http://localhost:3000', 'green');
  log('  ✓ Java Edition Minecraft support', 'green');
  log('  ✓ Built-in AI rules', 'green');
  if (sqliteAvailable) log('  ✓ SQLite storage (faster)', 'green');
  if (bedrockAvailable) log('  ✓ Bedrock Edition support', 'green');
  if (llamaAvailable) log('  ✓ Local AI models', 'green');
  if (ollamaInstalled) log('  ✓ Ollama AI integration', 'green');
  console.log('');
  
  log('To start BlockLife:', 'bright');
  console.log('');
  log('  npm start', 'cyan');
  console.log('');
  log('Or use the start script for auto-restart:', 'bright');
  console.log('');
  log('  bash scripts/start.sh', 'cyan');
  console.log('\n');
  log('Enjoy BlockLife! 🌍', 'green');
  console.log('\n');
}

main().catch(console.error);
