import pytest
from unittest.mock import Mock, patch, MagicMock
import json
from src.health import HealthServer, HealthCheckHandler


def test_health_endpoint_returns_ok():
    """Verify /health returns 200 with ok status when Supabase is reachable."""
    # Mock Supabase client
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.limit.return_value.execute.return_value = Mock()
    
    # Create handler instance without calling __init__
    handler = object.__new__(HealthCheckHandler)
    handler.supabase_client = mock_supabase
    handler.path = '/health'
    
    # Mock response methods
    handler.send_response = Mock()
    handler.send_header = Mock()
    handler.end_headers = Mock()
    handler.wfile = Mock()
    
    # Execute
    handler._handle_health()
    
    # Verify 200 response
    handler.send_response.assert_called_once_with(200)
    
    # Verify JSON response
    written_data = handler.wfile.write.call_args[0][0]
    response = json.loads(written_data.decode('utf-8'))
    
    assert response['status'] == 'ok'
    assert 'uptime' in response
    assert 'timestamp' in response


def test_health_endpoint_returns_error_when_supabase_unreachable():
    """Verify /health returns 500 when Supabase is unreachable."""
    # Mock Supabase client that throws error
    mock_supabase = Mock()
    mock_supabase.table.side_effect = Exception('Connection refused')
    
    # Create handler instance without calling __init__
    handler = object.__new__(HealthCheckHandler)
    handler.supabase_client = mock_supabase
    handler.path = '/health'
    
    # Mock response methods
    handler.send_response = Mock()
    handler.send_header = Mock()
    handler.end_headers = Mock()
    handler.wfile = Mock()
    
    # Execute
    handler._handle_health()
    
    # Verify 500 response
    handler.send_response.assert_called_once_with(500)
    
    # Verify JSON response
    written_data = handler.wfile.write.call_args[0][0]
    response = json.loads(written_data.decode('utf-8'))
    
    assert response['status'] == 'error'
    assert 'message' in response
