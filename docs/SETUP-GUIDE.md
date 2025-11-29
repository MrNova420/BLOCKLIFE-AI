# BlockLife AI - Setup Guide

**Complete guide to installing, configuring, and running BlockLife AI**

Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill

---

## Table of Contents

1. [Quick Start (Recommended)](#quick-start-recommended)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Using the Dashboard](#using-the-dashboard)
5. [Minecraft Server Setup](#minecraft-server-setup)
6. [AI Model Configuration](#ai-model-configuration)
7. [Termux (Android) Setup](#termux-android-setup)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start (Recommended)

BlockLife is designed to be easy to use. Just run these commands:

```bash
# Clone and install
git clone https://github.com/MrNova420/BLOCKLIFE-AI.git
cd BLOCKLIFE-AI
npm install

# Start BlockLife (opens dashboard automatically)
npm start
```

That's it! The web dashboard will open automatically at `http://localhost:3000` where you can:
- Configure your Minecraft server (Java or Bedrock Edition)
- Choose and install AI models
- Start/stop the simulation
- Monitor everything in real-time
- Chat with the AI to control bots

---

## Prerequisites

### Required
- **Node.js 18+** - [Download here](https://nodejs.org/)
- **A Minecraft Server** - Java Edition or Bedrock Edition

### Optional (for AI features)
- **Ollama** - For running local AI models - [Download here](https://ollama.com/)

---

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/MrNova420/BLOCKLIFE-AI.git
cd BLOCKLIFE-AI
```

### Step 2: Install Dependencies

```bash
npm install
```

This will:
- Install all required packages
- Create necessary directories (data/, config/, models/)
- Set up default configuration
- Check for Ollama AI runtime

### Step 3: Start BlockLife

```bash
npm start
```

This will:
- Build the project
- Start the web dashboard server
- Open your browser to the control panel
- Wait for you to configure and start the simulation

---

## Using the Dashboard

The web dashboard is your main control center for BlockLife.

### Dashboard Features

#### 📊 Overview
- Real-time statistics (population, villages, era)
- Quick start guide
- System status indicators

#### 🎮 Server Setup
- Configure Minecraft server connection
- Support for both **Java Edition** and **Bedrock Edition**
- Set server address, port, and version
- One-click connect/disconnect

#### 🧠 AI Model
- View available AI models
- Install models with one click
- Switch between models instantly
- Ollama status and management

#### 🤖 Bots
- View all active bots
- See their roles, health, and mood
- Track individual bot activities

#### 🏘️ Villages
- Monitor all villages
- View population and prosperity
- Track technological progress

#### 🎛️ Controls
- Start/stop simulation
- Create new bots
- Adjust performance settings

#### 💬 Chat Panel
- Natural language control
- Type commands like:
  - "connect to play.myserver.com"
  - "start simulation"
  - "use model tinyllama"
  - "create 10 bots"
  - "status"

---

## Minecraft Server Setup

BlockLife connects to your Minecraft server as bot clients.

### Java Edition Setup

1. In your server's `server.properties`:
   ```properties
   online-mode=false
   max-players=100
   spawn-protection=0
   ```

2. In the BlockLife dashboard:
   - Go to **Server Setup**
   - Select **Java Edition**
   - Enter your server address and port (default: 25565)
   - Click **Connect**

### Bedrock Edition Setup

1. Use a Bedrock Dedicated Server or a server with Geyser plugin

2. In the BlockLife dashboard:
   - Go to **Server Setup**
   - Select **Bedrock Edition**
   - Enter your server address and port (default: 19132)
   - Click **Connect**

### Server Options

| Setting | Java Default | Bedrock Default |
|---------|-------------|-----------------|
| Port | 25565 | 19132 |
| Version | 1.20.4 | 1.20.40 |
| Auth | Offline | Offline |

---

## AI Model Configuration

BlockLife supports multiple AI providers for bot decision-making.

### Using the Dashboard (Recommended)

1. Go to **AI Model** in the dashboard
2. If Ollama is not running, click **Start Ollama**
3. Browse available models
4. Click **Install** next to your preferred model
5. Click **Use** to activate it

### Available Models

| Model | Size | Best For |
|-------|------|----------|
| TinyLlama 1.1B ⭐ | 637MB | Mobile devices, quick responses |
| Phi-2 | 1.7GB | Balance of size and quality |
| Gemma 2B | 1.4GB | Google's efficient model |
| Mistral 7B | 4.1GB | High quality (needs more RAM) |
| Llama 2 7B | 3.8GB | General purpose |
| Built-in Rules | 0MB | No AI needed, rule-based |

### Installing Ollama

If you don't have Ollama installed:

**macOS/Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from https://ollama.com/download/windows

After installing, start Ollama:
```bash
ollama serve
```

### Manual Model Installation

```bash
# Install TinyLlama (recommended for most users)
ollama pull tinyllama

# Or install other models
ollama pull phi
ollama pull mistral
ollama pull llama2
```

---

## Termux (Android) Setup

Run BlockLife on your Android device!

### Prerequisites

Install Termux from F-Droid (NOT Play Store):
- [Termux on F-Droid](https://f-droid.org/packages/com.termux/)

### Installation

```bash
# Update packages
pkg update && pkg upgrade -y

# Install Node.js and Git
pkg install nodejs git -y

# Clone BlockLife
git clone https://github.com/MrNova420/BLOCKLIFE-AI.git
cd BLOCKLIFE-AI

# Install dependencies
npm install

# Start BlockLife
npm start
```

### Tips for Mobile

1. **Use ECO mode** for battery life:
   - In dashboard Settings, set Performance Mode to "ECO"

2. **Keep Termux awake**:
   ```bash
   termux-wake-lock
   npm start
   ```

3. **Access dashboard from phone browser**:
   - Open Chrome/Firefox
   - Go to `http://localhost:3000`

---

## Troubleshooting

### Dashboard won't open

- Make sure port 3000 is available
- Try: `DASHBOARD_PORT=8080 npm start`
- Access manually: `http://localhost:3000`

### Can't connect to Minecraft server

- Verify `online-mode=false` in server.properties
- Check firewall settings
- Ensure server is running and accessible
- Try connecting with a regular Minecraft client first

### AI models not working

- Install Ollama: https://ollama.com
- Start Ollama: `ollama serve`
- Check Ollama status in dashboard
- Use "Built-in Rules" as fallback

### Bots not spawning

- Check server spawn protection
- Ensure enough player slots
- Check server console for kick messages

### High CPU/Memory usage

- Switch to ECO performance mode
- Reduce max bots in settings
- Use smaller AI model (TinyLlama)

### Getting Help

1. Check logs in `./data/logs/`
2. Run `npm run status`
3. Open an issue on GitHub

---

## Command Reference

### npm Commands

| Command | Description |
|---------|-------------|
| `npm start` | Build and start with dashboard |
| `npm run dev` | Development mode (auto-reload) |
| `npm run dashboard` | CLI dashboard only |
| `npm run status` | Check simulation status |
| `npm test` | Run tests |
| `npm run build` | Build TypeScript |

### Chat Commands

| Command | Action |
|---------|--------|
| `connect to [server]` | Connect to Minecraft server |
| `disconnect` | Leave server |
| `start` | Start simulation |
| `stop` | Stop simulation |
| `status` | Show current status |
| `use model [name]` | Switch AI model |
| `install model [name]` | Download AI model |
| `create [N] bots` | Spawn new bots |
| `help` | Show all commands |

---

*Need more help? Open an issue on [GitHub](https://github.com/MrNova420/BLOCKLIFE-AI/issues)*
