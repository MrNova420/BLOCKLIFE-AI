# BlockLife AI

**A Living Minecraft Civilization Engine**

Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill

---

## ⚠️ Important: This is a LOCAL Application

**BlockLife is NOT a website.** It is a local application that runs entirely on YOUR computer.

- ✅ Runs locally on your machine
- ✅ Dashboard at `localhost:3000` is only accessible from YOUR device
- ✅ All data stays on your computer
- ✅ No external servers, no cloud, no accounts required
- ✅ AI runs locally via Ollama (on your machine)

👉 **For detailed security and privacy information, see [SECURITY-AND-PRIVACY.md](SECURITY-AND-PRIVACY.md)**

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

BlockLife works on Android via Termux. There are two setup options depending on what features you need.

### Option 1: Quick Setup (Basic Features)

This gets you running quickly with core features:

```bash
pkg update && pkg install nodejs-lts git python clang make
git clone https://github.com/MrNova420/BLOCKLIFE-AI.git
cd BLOCKLIFE-AI
bash scripts/setup-termux.sh
```

**Features available:**
- ✅ Core simulation engine
- ✅ Web dashboard
- ✅ Java Edition Minecraft
- ✅ Ollama AI / Built-in rules
- ⚠️ Bedrock Edition (may not compile)
- ⚠️ Local AI models (may not compile)

### Option 2: Full Setup (All Features)

For Bedrock Edition and local AI models, use proot-distro to run a full Linux environment:

```bash
pkg update && pkg install proot-distro
git clone https://github.com/MrNova420/BLOCKLIFE-AI.git
cd BLOCKLIFE-AI
bash scripts/setup-termux-full.sh
```

This installs Ubuntu inside Termux where native modules compile properly.

**Features available:**
- ✅ Everything from Quick Setup
- ✅ Bedrock Edition Minecraft
- ✅ Local AI models (node-llama-cpp)
- ✅ SQLite storage (faster)

### Running After Full Setup

```bash
# Enter the Ubuntu environment
proot-distro login ubuntu

# Start BlockLife
cd ~/BLOCKLIFE-AI
npm start
```

### Tips for Termux

- **Full Setup recommended** for Bedrock Edition or local AI
- **Quick Setup** is fine for Java Edition with Ollama
- Use **ECO mode** for better battery life
- Data is stored in the `data/` directory

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

### Bedrock Edition not working on Termux?

The `bedrock-protocol` package requires native compilation which may fail on standard Termux. 

**Solution:** Use the full setup with proot-distro:
```bash
bash scripts/setup-termux-full.sh
```

This runs Ubuntu inside Termux where native modules compile properly.

### Local AI models not working on Termux?

The `node-llama-cpp` package requires native compilation. Use the full setup:
```bash
bash scripts/setup-termux-full.sh
```

Or use Ollama instead (works without native compilation):
```bash
# Install Ollama and pull a model
ollama pull tinyllama
ollama serve
```

### Error: "gyp: Undefined variable android_ndk_path"

This error occurs when native modules try to compile on Termux without Android NDK.

**Solutions:**
1. **For basic features:** Run `bash scripts/setup-termux.sh` - core features work without native modules
2. **For all features:** Run `bash scripts/setup-termux-full.sh` - uses Ubuntu via proot-distro

---

## ❓ Frequently Asked Questions

### Is this a website?
**No.** BlockLife is a local application that runs on your computer. The "dashboard" at `localhost:3000` is just a control panel on YOUR machine - it's not a public website.

### Does this collect my data?
**No.** There are no external servers, no analytics, no tracking. Everything runs locally on your device.

### What is "localhost:3000"?
`localhost` means "your own computer." When you run BlockLife, it starts a local web server just for the control panel. Only you can access it from your device.

### Do I need an account?
**No.** There is no registration, no login, no accounts. Just run the application and use it.

### Is my data sent anywhere?
**No.** All bot data, village data, and settings stay on your computer. The only network connections are:
1. To YOUR Minecraft server (that you specify)
2. To Ollama running on YOUR machine (if you use AI features)

For more details, see the **[Security & Privacy Documentation](SECURITY-AND-PRIVACY.md)**.

---

## License

MIT License - See LICENSE file

---

## Credits

Created by **WeNova Interactive**

Lead Developer: **Kayden Shawn Massengill**

---

*Building worlds that live.*
