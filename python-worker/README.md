# Stealthy Crawler Worker

Python worker for crawling contractor websites using SeleniumBase CDP Mode + Playwright.

## Architecture

- **SeleniumBase CDP Mode**: Stealth browser launch, CAPTCHA solving
- **Playwright**: Navigation, content extraction, waiting
- **Supabase**: Job queue management via RPC functions

## Requirements

- Python 3.11+
- Chrome/Chromium browser
- Xvfb (for headless mode on Linux)

## Installation

### 1. Install System Dependencies

```bash
cd python-worker
chmod +x scripts/install.sh
./scripts/install.sh
```

### 2. Install Python Dependencies

```bash
uv sync
uv run playwright install chromium
```

### 3. Configure Environment

Create `.env` file:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Development

### Run Tests

```bash
uv run pytest
```

### Run Worker Locally

```bash
source .env
uv run python -m src.main
```

### Health Check

```bash
curl http://localhost:8080/health
```

## Deployment (systemd)

### 1. Create User

```bash
sudo useradd -r -s /bin/false crawler
```

### 2. Install Worker

```bash
sudo mkdir -p /opt/crawler-worker
sudo cp -r . /opt/crawler-worker/
sudo chown -R crawler:crawler /opt/crawler-worker
```

### 3. Configure Service

Edit `systemd/crawler-worker.service` and set:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 4. Install Service

```bash
sudo cp systemd/crawler-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable crawler-worker
sudo systemctl start crawler-worker
```

### 5. Monitor

```bash
# Check status
sudo systemctl status crawler-worker

# View logs
sudo journalctl -u crawler-worker -f

# Health check
curl http://localhost:8080/health
```

## Troubleshooting

### Worker not starting

Check logs:
```bash
sudo journalctl -u crawler-worker -n 50
```

### Supabase connection issues

Test connection:
```bash
cd python-worker
uv run python scripts/smoke_test_supabase.py
```

### Chrome/Chromium issues

Verify installation:
```bash
chromium --version
```

Run in headed mode for debugging:
```bash
# Edit src/crawler.py: sb_cdp.Chrome(locale="en", headed=True)
```
