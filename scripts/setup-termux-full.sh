#!/bin/bash
# BlockLife AI - Full Termux Setup (with proot-distro)
# Copyright © 2025 WeNova Interactive / Kayden Shawn Massengill
#
# This script sets up a full Linux environment inside Termux using proot-distro
# which allows native modules (bedrock-protocol, node-llama-cpp) to compile properly.

echo "========================================"
echo "  BlockLife AI - Full Termux Setup"
echo "  (Using proot-distro for native modules)"
echo "========================================"
echo ""

# Check if running in Termux
if [ -z "$PREFIX" ]; then
    echo "Error: This script must be run in Termux on Android."
    exit 1
fi

echo "This script will:"
echo "  1. Install proot-distro"
echo "  2. Set up Ubuntu Linux inside Termux"
echo "  3. Install Node.js and build tools in Ubuntu"
echo "  4. Install BlockLife with ALL features"
echo ""
echo "This requires about 1GB of storage and takes 10-20 minutes."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "[1/5] Installing proot-distro..."
pkg update -y
pkg install -y proot-distro

echo ""
echo "[2/5] Installing Ubuntu (this takes a few minutes)..."
proot-distro install ubuntu

echo ""
echo "[3/5] Setting up Ubuntu environment..."

# Get the ubuntu rootfs directory
UBUNTU_ROOTFS="$PREFIX/var/lib/proot-distro/installed-rootfs/ubuntu"

# Create setup script inside the ubuntu rootfs so it's accessible from proot
SETUP_SCRIPT="$UBUNTU_ROOTFS/root/blocklife-setup.sh"

cat > "$SETUP_SCRIPT" << 'UBUNTU_SCRIPT'
#!/bin/bash
echo "Setting up Ubuntu environment..."

# Update and install dependencies
apt update
apt install -y curl git build-essential python3 cmake

# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo ""
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Clone or update BlockLife
cd ~
if [ -d "BLOCKLIFE-AI" ]; then
    echo "Updating existing BlockLife installation..."
    cd BLOCKLIFE-AI
    git pull
else
    echo "Cloning BlockLife..."
    git clone https://github.com/MrNova420/BLOCKLIFE-AI.git
    cd BLOCKLIFE-AI
fi

echo ""
echo "[4/5] Installing dependencies (this may take several minutes)..."
npm install

echo ""
echo "[5/5] Building BlockLife..."
npm run build

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "Checking features:"

# Check what's available
if node -e "require('better-sqlite3')" 2>/dev/null; then
    echo "  ✓ SQLite storage"
else
    echo "  ✗ SQLite storage"
fi

if node -e "require('bedrock-protocol')" 2>/dev/null; then
    echo "  ✓ Bedrock Edition"
else
    echo "  ✗ Bedrock Edition"
fi

if node --input-type=module -e "await import('node-llama-cpp')" 2>/dev/null; then
    echo "  ✓ Local AI models"
else
    echo "  ✗ Local AI models"
fi

echo ""
echo "To start BlockLife:"
echo "  cd ~/BLOCKLIFE-AI && npm start"
echo ""

# Clean up setup script
rm -f ~/blocklife-setup.sh
UBUNTU_SCRIPT

chmod +x "$SETUP_SCRIPT"

echo ""
echo "[4/5] Running setup inside Ubuntu..."
proot-distro login ubuntu -- /bin/bash /root/blocklife-setup.sh

echo ""
echo "========================================"
echo "  Installation Complete!"
echo "========================================"
echo ""
echo "To run BlockLife with full features:"
echo ""
echo "  proot-distro login ubuntu"
echo "  cd ~/BLOCKLIFE-AI"
echo "  npm start"
echo ""
echo "You can create an alias for easier access:"
echo "  echo 'alias blocklife=\"proot-distro login ubuntu -- bash -c \\\"cd ~/BLOCKLIFE-AI && npm start\\\"\"' >> ~/.bashrc"
echo "  source ~/.bashrc"
echo "  blocklife"
echo ""
