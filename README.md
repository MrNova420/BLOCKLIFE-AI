# BlockLife AI

**A Living Minecraft Civilization Engine**

Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill

---

## 🚀 Quick Start

```bash
npm install && npm start
```

The web dashboard opens automatically at **http://localhost:3000**

---

## 🎮 How to Use

### Step 1: Start BlockLife
```bash
npm install && npm start
```

### Step 2: Install a Local AI Model (Recommended)

BlockLife uses **locally hosted AI models** via [Ollama](https://ollama.com). This runs entirely on your machine - no cloud, no API keys, no internet required.

```bash
# Install Ollama from https://ollama.com
# Then pull a model:
ollama pull tinyllama      # Fast, ~600MB (recommended for most)
ollama pull mistral        # High quality, ~4GB
ollama pull llama2         # Good general, ~4GB
```

### Step 3: Connect to Your Minecraft Server

In the dashboard:
1. Go to **Server Setup**
2. Enter your Minecraft server address (e.g., `localhost:25565`)
3. Select Java or Bedrock Edition
4. Click **Connect**

### Step 4: Spawn Bots & Start Simulation

Use the chat panel:
```
create 20 bots        # Spawn 20 villagers
start simulation      # Begin the simulation
```

Or click **Start Simulation** in the dashboard.

### Step 5: Command Your Civilization

Talk to the AI in natural language:
```
build a castle
mine for diamonds
tell Erik to farm wheat
explore the mountains
attack the zombies
status
help
```

---

## What is BlockLife?

BlockLife is a **living Minecraft civilization** that runs autonomously. Not a script. Not an automation tool. A tiny universe, evolving on your device.

**The Experience:**
- You start it, connect to your server, and let it run
- Come back hours or days later
- Bots built structures, farmed, mined, fought
- Some died, some had children
- Villages grew, split, or went to war
- They remember what happened and talk about it

**This is civilization in your pocket - for real.**

---

## Features

- 🤖 **Intelligent Bots** - Each bot has personality, needs, and memories
- 🏘️ **Village System** - Bots form and manage villages with roles
- 👨‍👩‍👧‍👦 **Family System** - Bots reproduce and inherit traits
- ⚔️ **Conflict & Diplomacy** - Villages trade, ally, or war
- 📜 **History & Lore** - Events become legends
- 🌐 **Web Dashboard** - Control panel at localhost:3000
- 💬 **Natural Language** - Control everything with chat
- 🎮 **Java & Bedrock** - Both Minecraft editions
- 🤖 **Local AI** - Runs on YOUR machine (Ollama)
- 📱 **Mobile-Friendly** - Works on Android/Termux
- ⚡ **24/7 Stable** - Auto-recovery, device protection
- 📊 **Full Logging** - Track everything

---

## AI Models (Local Only)

BlockLife uses **locally hosted AI models** through Ollama. Everything runs on your machine.

### Available Models (via Dashboard)

| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| TinyLlama | 637MB | ⚡⚡⚡ Fast | Good |
| Phi-2 | 1.7GB | ⚡⚡ Medium | Better |
| Gemma 2B | 1.4GB | ⚡⚡ Medium | Better |
| Mistral 7B | 4.1GB | ⚡ Slower | Best |
| Llama 2 7B | 3.8GB | ⚡ Slower | Best |
| **Built-in Rules** | 0MB | ⚡⚡⚡ Instant | Basic |

### Installing a Model

```bash
# Install Ollama first: https://ollama.com

# Then pull a model:
ollama pull tinyllama   # Recommended for most users
ollama pull mistral     # If you want higher quality
```

### No AI? No Problem!

BlockLife works without any AI model using built-in rules. Select "Built-in Rules (No AI)" in the dashboard.

---

## Chat Commands

| Command | What it does |
|---------|--------------|
| `connect to localhost:25565` | Connect to a server |
| `create 20 bots` | Spawn 20 villagers |
| `spawn 50 civilians` | Spawn 50 civilians |
| `start simulation` | Start the simulation |
| `build a castle` | Command bots to build |
| `mine for diamonds` | Send bots mining |
| `farm wheat` | Start farming |
| `explore the mountains` | Send bots exploring |
| `tell Erik to build` | Direct specific bots |
| `status` | Show system status |
| `help` | List commands |

---

## Configuration

### Performance Modes

- **ECO** - Battery-safe, 15-30 bots
- **NORMAL** - Balanced, 30-60 bots  
- **PERFORMANCE** - Full power, 60-120+ bots
- **AUTO** - Adjusts automatically (recommended)

### Manual Config

Edit `config/default.json`:

```json
{
  "minecraft": {
    "host": "localhost",
    "port": 25565,
    "edition": "java"
  },
  "ai": {
    "provider": "ollama",
    "model": "tinyllama"
  }
}
```

---

## Termux Setup (Android)

```bash
pkg install nodejs
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
│   ├── bots/                # Bot agents & connection
│   ├── simulation/          # Civilization logic
│   ├── mind/                # AI (local Ollama)
│   ├── panel/               # Web dashboard
│   ├── knowledge/           # Minecraft data
│   └── utils/               # Utilities
├── config/                  # Configuration
├── data/                    # Runtime data
└── docs/                    # Documentation
```

---

## Troubleshooting

### Bots not connecting to server?
- Make sure your Minecraft server is running
- Check the server address and port
- For Bedrock, use the correct port (default: 19132)

### AI not working?
- Install Ollama: https://ollama.com
- Pull a model: `ollama pull tinyllama`
- Make sure Ollama is running: `ollama serve`

### Performance issues?
- Use ECO mode in the dashboard
- Reduce bot count
- Use TinyLlama instead of larger models

---

## License

MIT License - See LICENSE file

---

## Credits

Created by **WeNova Interactive**

Lead Developer: **Kayden Shawn Massengill**

---

*Building worlds that live.*
