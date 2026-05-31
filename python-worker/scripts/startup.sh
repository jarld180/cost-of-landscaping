#!/bin/bash
# Startup script for parallel crawler workers
# Usage: ./startup.sh [num_workers]
# Default: 10 workers

NUM_WORKERS=${1:-10}
PIDFILE="/tmp/crawler-workers.pids"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKER_DIR="$(dirname "$SCRIPT_DIR")"

cd "$WORKER_DIR" || exit 1

# Load environment variables from systemd service file
SYSTEMD_SERVICE="/etc/systemd/system/crawler-worker.service"
if [ -f "$SYSTEMD_SERVICE" ]; then
  eval $(grep '^Environment=' "$SYSTEMD_SERVICE" | sed 's/Environment=//g' | tr ' ' '\n' | grep '=' | sed 's/^/export /')
else
  echo "Error: Systemd service file not found. Env vars not loaded."
  exit 1
fi

# Activate virtual environment
if [ -f ".venv/bin/activate" ]; then
  source .venv/bin/activate
else
  echo "Error: Virtual environment not found at $WORKER_DIR/.venv"
  exit 1
fi

# Clear pid file
> "$PIDFILE"

echo "Starting $NUM_WORKERS crawler workers..."

for i in $(seq 1 $NUM_WORKERS); do
  python -m src.main &
  echo $! >> "$PIDFILE"
  echo "Started worker $i (PID: $!)"
  sleep 0.5  # Stagger startup slightly to avoid thundering herd
done

echo ""
echo "Launched $NUM_WORKERS workers"
echo "PIDs stored in $PIDFILE"
echo ""
echo "Monitor memory: watch -n 5 'free -h'"
echo "Monitor workers: tail -f /var/log/syslog | grep crawler"
echo "Shutdown: ./scripts/shutdown.sh"
