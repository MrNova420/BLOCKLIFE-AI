# BlockLife AI - Security & Privacy Information

**Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill**

---

## 🔒 What This Project IS and IS NOT

### ✅ What BlockLife IS:

- **A LOCAL application** that runs entirely on YOUR computer/device
- A Minecraft bot simulation engine that connects to YOUR Minecraft server
- A local web dashboard accessible ONLY at `http://localhost:3000` on YOUR device
- An open-source project you can inspect, modify, and control

### ❌ What BlockLife is NOT:

- **NOT a public website** - There is no external website for this project
- **NOT a cloud service** - Nothing runs on external servers
- **NOT collecting your data** - We don't have servers to collect data
- **NOT requiring registration** - There is no account system, no login, no sign-up
- **NOT using external APIs by default** - The AI runs locally via Ollama on your machine

---

## 🌐 Network Connections

BlockLife makes the following network connections:

### 1. Minecraft Server Connection (Required)
- **What**: Connects bot clients to YOUR specified Minecraft server
- **Where**: The server address YOU provide (e.g., `localhost:25565` or your server IP)
- **Why**: This is the core functionality - bots need to connect to play in your world
- **Control**: You specify the server in the dashboard

### 2. Ollama AI (Optional - Local)
- **What**: Communicates with Ollama AI running on YOUR machine
- **Where**: `http://localhost:11434` (your local machine only)
- **Why**: For AI-powered bot decision making
- **Control**: Ollama must be installed and running locally by YOU

### 3. Web Research (Optional - Disabled by Default)
- **What**: Can search for Minecraft information online
- **Where**: Only trusted Minecraft information sites (minecraft.wiki, etc.)
- **Why**: To help AI learn building techniques, recipes, strategies
- **Control**: **DISABLED BY DEFAULT** - You must explicitly enable it in the dashboard
- **Note**: Currently uses built-in knowledge database, not actual web searches

---

## 💻 The "localhost:3000" Dashboard

The web dashboard at `http://localhost:3000` is:

- **LOCAL ONLY** - Only accessible from your own computer
- **NOT a public website** - Other people cannot access it
- **Your control panel** - For managing the simulation

When you run `npm start`, it opens a web browser pointing to YOUR local machine. This is standard for many development tools and applications. It's not creating a public website.

### What "localhost" means:
- `localhost` = your own computer
- `127.0.0.1` = the IP address for your own computer
- Port `3000` = just a door number on your computer for this specific application

**Anyone searching for "BlockLife" on the internet will NOT find your running instance.** Your dashboard is only visible to you, on your device.

---

## 🔐 Data Storage

All data is stored locally on YOUR device:

```
BLOCKLIFE-AI/
├── data/                    # Your simulation data
│   ├── logs/               # Application logs
│   ├── snapshots/          # Simulation state saves
│   └── web-research-config.json  # Your settings
├── config/                  # Your configuration
│   └── default.json        # Your server/AI settings
```

### What we store:
- Bot names, personalities, and stats (locally generated)
- Village data and history
- Your configuration preferences
- Application logs for debugging

### What we DON'T store:
- Personal information
- Account credentials (there are no accounts)
- Payment information
- Location data
- Usage analytics

---

## 🛡️ Security Best Practices

### For Your Minecraft Server:
1. Use `online-mode=false` only on private/LAN servers you control
2. Don't expose your server to the public internet unless you understand the risks
3. Consider using a whitelist on your Minecraft server

### For BlockLife:
1. Only download BlockLife from the official GitHub repository
2. Review the source code if you have concerns
3. Keep your Node.js installation updated

---

## ❓ FAQ: Common Security Questions

### Q: I found a website with "BlockLife" - is that you?
**A:** No. This project does not have any external website. If you found something online:
- It may be someone else's unrelated project with a similar name
- It may be a repository hosting site showing the code (like GitHub)
- It may be someone copying/misusing the project name

The only official presence is the GitHub repository at:
`https://github.com/MrNova420/BLOCKLIFE-AI`

### Q: Does this project collect my data?
**A:** No. There are no external servers, no analytics, no data collection. Everything runs locally.

### Q: Is the AI sending my data somewhere?
**A:** No. The AI (Ollama) runs entirely on your local machine. Your bot conversations and decisions stay on your device.

### Q: Why does it open a web browser?
**A:** The browser is just showing a local control panel from YOUR computer. It's like a graphical interface for the application. It's not connecting to the internet.

### Q: Can other people see my bots/villages?
**A:** Only if they are on the same Minecraft server as you and can see the bots in-game. The web dashboard is only accessible from your device.

### Q: Is this project affiliated with Mojang/Microsoft?
**A:** No. This is an independent, unofficial fan project. Minecraft is a trademark of Mojang/Microsoft.

---

## 📧 Contact & Support

If you have security concerns or questions:

1. **Open a GitHub Issue**: https://github.com/MrNova420/BLOCKLIFE-AI/issues
2. **Review the source code**: The entire project is open source

---

## 📜 License

This project is licensed under the MIT License. You are free to:
- Use it privately
- Modify it
- Distribute it
- Inspect all the code

See the [LICENSE](LICENSE) file for details.

---

*This document was created to address user concerns about project transparency and data privacy.*

*Last updated: November 2025*
