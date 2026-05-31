#!/bin/bash
set -e

echo "Installing Chrome/Chromium dependencies for SeleniumBase..."

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "Cannot detect OS"
    exit 1
fi

# Install dependencies based on OS
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    echo "Installing dependencies for Ubuntu/Debian..."
    sudo apt-get update
    sudo apt-get install -y \
        chromium-browser \
        chromium-chromedriver \
        xvfb \
        libglib2.0-0 \
        libnss3 \
        libgconf-2-4 \
        libfontconfig1 \
        libxss1 \
        libappindicator3-1 \
        libasound2 \
        libatk-bridge2.0-0 \
        libgtk-3-0 \
        libx11-xcb1 \
        libxcomposite1 \
        libxcursor1 \
        libxdamage1 \
        libxi6 \
        libxtst6 \
        libcups2 \
        libxrandr2 \
        libpangocairo-1.0-0 \
        libatk1.0-0 \
        libcairo-gobject2 \
        libgdk-pixbuf2.0-0 \
        libpango-1.0-0
    
    echo "Dependencies installed successfully"
    
elif [ "$OS" = "amzn" ] || [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    echo "Installing dependencies for Amazon Linux/CentOS/RHEL..."
    sudo yum install -y \
        chromium \
        chromium-headless \
        xorg-x11-server-Xvfb \
        liberation-fonts \
        nss \
        atk \
        cups-libs \
        libXcomposite \
        libXcursor \
        libXdamage \
        libXext \
        libXi \
        libXrandr \
        libXScrnSaver \
        libXtst \
        pango \
        at-spi2-atk \
        gtk3
    
    echo "Dependencies installed successfully"
    
else
    echo "Unsupported OS: $OS"
    echo "Please install Chrome/Chromium and dependencies manually"
    exit 1
fi

echo ""
echo "Installation complete!"
echo "Next steps:"
echo "1. Install Python dependencies: cd python-worker && uv sync"
echo "2. Install Playwright browsers: uv run playwright install chromium"
echo "3. Set environment variables in systemd service file"
echo "4. Copy service file: sudo cp systemd/crawler-worker.service /etc/systemd/system/"
echo "5. Reload systemd: sudo systemctl daemon-reload"
echo "6. Enable service: sudo systemctl enable crawler-worker"
echo "7. Start service: sudo systemctl start crawler-worker"
