# BlockLife AI

**A Living Minecraft Civilization Engine**

Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill

---

## 🚀 Quick Start (Just Two Commands!)

```bash
npm install && npm start
```

That's it! The web dashboard opens automatically at **http://localhost:3000**

From there you can:
1. Configure your Minecraft server (Java or Bedrock Edition)
2. Choose an AI model (or use built-in rules)
3. Start the simulation
4. Control everything via natural language chat

---

## What is BlockLife?

BlockLife is a **living Minecraft civilization** that runs autonomously. Not a script. Not an automation tool. A tiny universe, evolving on your device.

**The Core Experience:**
- You set it up, walk away
- Come back hours or days later
- The world has changed
- Bots built new structures
- Some died, some had children
- Villages grew, split, or went to war
- They talk about things that happened when you weren't there
- They know they're in a block world (Jumanji vibe)

**This is civilization in your pocket - for real.**

---

## Features

- 🤖 **Intelligent Bots** - Each bot has personality, skills, needs, and memories
- 🏘️ **Village System** - Bots form and manage villages with roles and economy
- 👨‍👩‍👧‍👦 **Family System** - Bots reproduce, inherit traits, and form family lines
- ⚔️ **Conflict & Diplomacy** - Villages interact, trade, ally, or go to war
- 📜 **History & Lore** - Events are recorded and turned into legends
- 🎯 **Self-Awareness** - Bots know they exist in a block world
- 🌐 **Web Dashboard** - Beautiful control panel at localhost:3000
- 💬 **Natural Language** - Control everything with chat commands
- 🎮 **Java & Bedrock** - Works with both Minecraft editions
- 🤖 **AI Models** - Supports Ollama, OpenAI, or built-in rules
- 📱 **Mobile-Friendly** - Runs on Termux/Android
- ⚡ **24/7 Stable** - Auto-recovery and device protection
- 📊 **Full Logging** - Track everything bots do

---

## Installation

### Prerequisites

- Node.js 18+ (Download: https://nodejs.org)
- A Minecraft server (Java or Bedrock Edition)

### Setup

```bash
# Clone the repository
git clone https://github.com/MrNova420/BLOCKLIFE-AI.git
cd BLOCKLIFE-AI

# Install and start (automatic setup!)
npm install && npm start
```

The dashboard opens at **http://localhost:3000**

### Chat Commands (in Dashboard)

| Command | What it does |
|---------|--------------|
| `build a castle` | Bots start building a castle |
| `mine for diamonds` | Send bots mining |
| `farm wheat` | Start farming operations |
| `explore the mountains` | Send bots exploring |
| `attack enemies` | Engage in combat |
| `tell Erik to build a house` | Direct specific bots |
| `status` | Show system status |
| `help` | List all commands |

---

## Configuration

### From Dashboard (Recommended)

Use the web dashboard to configure everything - no file editing needed!

### Manual Configuration

Edit `config/default.json`:

```json
{
  "minecraft": {
    "host": "your-server.com",
    "port": 25565,
    "edition": "java"
  },
  "simulation": {
    "maxBots": 50,
    "tickRateMs": 300
  }
}
```

### Performance Modes

- **ECO** - Battery-safe, 15-30 bots
- **NORMAL** - Balanced, 30-60 bots  
- **PERFORMANCE** - Full power, 60-120+ bots
- **AUTO** - Adjusts based on device health (recommended)

---

## AI Models

BlockLife works with or without AI models:

| Option | Description |
|--------|-------------|
| **Built-in Rules** | Works out of the box, no setup needed |
| **Ollama (Local)** | Free, runs on your machine |
| **OpenAI** | Requires API key |

Install Ollama from https://ollama.com for the best experience.

---

## Termux Setup (Android)

```bash
# Install Node.js
pkg install nodejs

# Clone and run
git clone https://github.com/MrNova420/BLOCKLIFE-AI.git
cd BLOCKLIFE-AI
npm install && npm start
```

---

## Project Structure

```
blocklife-ai/
├── src/
│   ├── main.ts              # Entry point
│   ├── orchestrator/        # Main loop
│   ├── bots/                # Bot agents
│   ├── simulation/          # Civilization logic
│   ├── mind/                # AI integration
│   ├── panel/               # Web dashboard
│   ├── knowledge/           # Minecraft data
│   ├── persistence/         # Storage
│   └── utils/               # Utilities
├── config/                  # Configuration
├── scripts/                 # Startup scripts
├── data/                    # Runtime data
└── docs/                    # Documentation
```

---

## Development Status

See [PROGRESS.md](PROGRESS.md) for current development status.

See [docs/SETUP-GUIDE.md](docs/SETUP-GUIDE.md) for detailed setup instructions.

---

## License

MIT License - See LICENSE file

---

## Credits

Created by **WeNova Interactive**

Lead Developer: **Kayden Shawn Massengill**

---

*Building worlds that live.*
