import { useState, useEffect } from 'react';
import { connectWS } from '../ws';

export default function WebSocketStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  const handleConnect = () => {
    try {
      setConnectionStatus('connecting');
      
      const websocket = connectWS((message) => {
        setLastMessage(message);
        console.log('📥 WebSocket message received:', message);
        
        // Dispatch message update for debug panel
        window.dispatchEvent(new CustomEvent('ws-status-update', {
          detail: { status: connectionStatus, message }
        }));
        
        // Handle different message types
        if (message.event === 'ping') {
          console.log('🔄 Ping received');
        } else if (message.event === 'subscribed') {
          console.log('✅ Subscription confirmed');
        }
      });
      
      websocket.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        console.log('🔌 WebSocket connected');
        
        // Dispatch status update for debug panel
        window.dispatchEvent(new CustomEvent('ws-status-update', {
          detail: { status: 'connected', message: null }
        }));
        
        // Subscribe to channels
        websocket.send(JSON.stringify({
          type: 'subscribe',
          channels: ['holdings', 'positions', 'orders', 'trades']
        }));
      };
      
      websocket.onclose = () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        console.log('🔌 WebSocket disconnected');
        
        // Dispatch status update for debug panel
        window.dispatchEvent(new CustomEvent('ws-status-update', {
          detail: { status: 'disconnected', message: null }
        }));
      };
      
      websocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('disconnected');
        
        // Dispatch status update for debug panel
        window.dispatchEvent(new CustomEvent('ws-status-update', {
          detail: { status: 'disconnected', message: null }
        }));
      };
      
      setWs(websocket);
      
    } catch (error) {
      console.error('Failed to connect:', error);
      setConnectionStatus('disconnected');
    }
  };

  const handleDisconnect = () => {
    if (ws) {
      ws.close();
      setWs(null);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-400';
      case 'connecting':
        return 'text-yellow-400';
      case 'disconnected':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return '🟢';
      case 'connecting':
        return '🟡';
      case 'disconnected':
        return '🔴';
      default:
        return '⚪';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3">WebSocket Status</h3>
      
      <div className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Status:</span>
          <div className="flex items-center space-x-2">
            <span className={getStatusColor()}>{getStatusIcon()}</span>
            <span className={getStatusColor()}>
              {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
            </span>
          </div>
        </div>

        {/* Connection Controls */}
        <div className="flex space-x-2">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={connectionStatus === 'connecting'}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect'}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Last Message */}
        {lastMessage && (
          <div className="mt-3 p-2 bg-gray-700 rounded text-xs">
            <div className="text-gray-400 mb-1">Last Message:</div>
            <div className="font-mono">
              {JSON.stringify(lastMessage, null, 2)}
            </div>
          </div>
        )}

        {/* Connection Info */}
        {isConnected && (
          <div className="text-xs text-gray-500">
            ✅ Real-time updates active
          </div>
        )}
      </div>
    </div>
  );
}
