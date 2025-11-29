# BlockLife AI

**A Living Minecraft Civilization Engine**

Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill

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
- 📱 **Mobile-Friendly** - Designed to run on Termux/Android
- ⚡ **Performance Governor** - Auto-adjusts to keep your device healthy

---

## Quick Start

### Prerequisites

- Node.js 18+
- A Minecraft server (Java Edition)

### Installation

```bash
# Clone the repository
git clone https://github.com/MrNova420/BLOCKLIFE-AI.git
cd BLOCKLIFE-AI

# Install dependencies
npm install

# Build
npm run build
```

### Running

```bash
# Start the simulation
npm start

# Or for development
npm run dev

# View dashboard
npm run dashboard
```

### Termux Setup (Android)

```bash
# Run the setup script
bash scripts/setup-termux.sh

# Then start
npm start
```

---

## Configuration

Edit `config/default.json` to customize:

```json
{
  "minecraft": {
    "host": "localhost",
    "port": 25565
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
- **AUTO** - Adjusts based on device health

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

See [docs/DEVELOPMENT-PLAN.md](docs/DEVELOPMENT-PLAN.md) for the full specification.

---

## License

MIT License - See LICENSE file

---

## Credits

Created by **WeNova Interactive**

Lead Developer: **Kayden Shawn Massengill**

---

*Building worlds that live.*
