"""
HTTP health check server for crawler worker.

Runs on port 8080 and provides:
- GET /health - Returns {"status": "ok", "uptime": N} if healthy
- GET /health - Returns {"status": "error", "message": "..."} (500) if Supabase unreachable
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import time
from datetime import datetime, timezone
from typing import Optional
import logging


class HealthCheckHandler(BaseHTTPRequestHandler):
    """HTTP request handler for health checks."""
    
    # Class variables set by HealthServer
    start_time: float = time.time()
    supabase_client: Optional[object] = None
    
    def do_GET(self):
        """Handle GET requests."""
        if self.path == '/health':
            self._handle_health()
        else:
            self.send_error(404, 'Not Found')
    
    def _handle_health(self):
        """Handle /health endpoint."""
        try:
            # Check Supabase connectivity
            if self.supabase_client:
                # Simple query to verify connection
                result = self.supabase_client.table('background_jobs').select('id').limit(1).execute()
                # If we get here, Supabase is reachable
            
            # Calculate uptime
            uptime_seconds = int(time.time() - self.start_time)
            
            # Return success
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            response = {
                'status': 'ok',
                'uptime': uptime_seconds,
                'timestamp': datetime.now(timezone.utc).isoformat(),
            }
            
            self.wfile.write(json.dumps(response).encode('utf-8'))
        
        except Exception as e:
            # Supabase unreachable or other error
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            response = {
                'status': 'error',
                'message': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat(),
            }
            
            self.wfile.write(json.dumps(response).encode('utf-8'))
    
    def log_message(self, format, *args):
        """Override to use logging instead of stderr."""
        logging.info(f"Health check: {format % args}")


class HealthServer:
    """HTTP server for health checks."""
    
    def __init__(self, port: int = 8080, supabase_client=None):
        self.port = port
        self.supabase_client = supabase_client
        self.server: Optional[HTTPServer] = None
    
    def start(self):
        """Start the health check server in a separate thread."""
        # Set class variables for handler
        HealthCheckHandler.start_time = time.time()
        HealthCheckHandler.supabase_client = self.supabase_client
        
        self.server = HTTPServer(('0.0.0.0', self.port), HealthCheckHandler)
        logging.info(f"Health check server listening on port {self.port}")
        
        # Run in current thread (will be called from a thread in main.py)
        self.server.serve_forever()
    
    def stop(self):
        """Stop the health check server."""
        if self.server:
            self.server.shutdown()
            logging.info("Health check server stopped")
