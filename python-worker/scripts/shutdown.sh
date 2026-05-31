#!/bin/bash
# Shutdown script for parallel crawler workers
# Gracefully stops all workers started by startup.sh

PIDFILE="/tmp/crawler-workers.pids"

if [ -f "$PIDFILE" ]; then
  echo "Stopping workers from pidfile..."
  while read pid; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" && echo "Stopped worker $pid"
    else
      echo "Worker $pid already stopped"
    fi
  done < "$PIDFILE"
  rm "$PIDFILE"
  echo ""
  echo "All workers stopped"
else
  echo "No pidfile found at $PIDFILE"
  echo "Killing all python crawler processes..."
  pkill -f "python -m src.main"
  echo "Done"
fi
