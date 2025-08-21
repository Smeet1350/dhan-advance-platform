import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';

interface DebugStatus {
  timestamp: string;
  system: {
    cpu_percent: number;
    memory_percent: number;
    memory_available_gb: number;
    disk_percent: number;
    disk_free_gb: number;
  };
  process: {
    memory_mb: number;
    cpu_percent: number;
    threads: number;
    open_files: number;
  };
  websocket: {
    active_connections: number;
    total_connections: number;
    last_sequence: number;
    uptime_seconds: number;
    polling_active: boolean;
    last_poll_times: Record<string, string>;
  };
  dhan_client: {
    use_mock_data: boolean;
    last_api_call: string | null;
    api_call_count: number;
    error_count: number;
    circuit_breaker_state: string;
  };
  recent_errors: Array<{
    timestamp: string;
    error_type: string;
    error_message: string;
    trace_id?: string;
    details?: any;
  }>;
  environment: {
    python_version: string;
    platform: string;
    working_directory: string;
  };
}

interface CircuitBreakerStatus {
  dhan_api: {
    state: string;
    failure_count: number;
    last_failure: string | null;
    threshold: number;
    timeout_seconds: number;
    next_attempt: string | null;
  };
  websocket: {
    state: string;
    connection_health: string;
  };
}

interface PerformanceMetrics {
  timestamp: string;
  api_performance: Record<string, {
    avg_response_time_ms: number;
    p95_response_time_ms: number;
    request_count: number;
    error_rate: number;
  }>;
  websocket_performance: {
    message_delivery: {
      avg_latency_ms: number;
      p95_latency_ms: number;
      messages_sent: number;
      delivery_success_rate: number;
    };
    polling: {
      avg_poll_interval_ms: number;
      last_poll_duration_ms: number;
      poll_success_rate: number;
    };
  };
  system_trends: {
    memory_percent: number[];
    cpu_percent: number[];
    trend_duration_minutes: number;
  };
  recommendations: string[];
}

interface WebSocketEvent {
  timestamp: string;
  type: string;
  channel: string | null;
  sequence: number;
  connection_count: number;
  details: any;
}

const DebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'circuit' | 'performance' | 'events' | 'logs'>('status');
  const [debugStatus, setDebugStatus] = useState<DebugStatus | null>(null);
  const [circuitStatus, setCircuitStatus] = useState<CircuitBreakerStatus | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [wsEvents, setWsEvents] = useState<WebSocketEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Hotkey handler
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'd' && event.ctrlKey) {
        event.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Auto-refresh data
  useEffect(() => {
    if (!isVisible) return;

    const refreshData = async () => {
      await fetchDebugData();
    };

    const interval = setInterval(refreshData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [isVisible]);

  const fetchDebugData = useCallback(async () => {
    if (!isVisible) return;

    setIsLoading(true);
    try {
      // Fetch debug status
      const statusResponse = await api.fetch('/debug/status');
      if ((statusResponse as any).ok) {
        setDebugStatus((statusResponse as any).data);
      }

      // Fetch circuit breaker status
      const circuitResponse = await api.fetch('/debug/circuit-breaker/status');
      if ((circuitResponse as any).ok) {
        setCircuitStatus((circuitResponse as any).data);
      }

      // Fetch performance metrics
      const perfResponse = await api.fetch('/debug/performance/metrics');
      if ((perfResponse as any).ok) {
        setPerformanceMetrics((perfResponse as any).data);
      }

      // Fetch WebSocket events
      const eventsResponse = await api.fetch('/debug/websocket/events?limit=20');
      if ((eventsResponse as any).ok) {
        setWsEvents((eventsResponse as any).data.events);
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching debug data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isVisible]);

  const resetCircuitBreaker = async (service: string) => {
    try {
      const response = await api.fetch(`/debug/circuit-breaker/reset?service=${service}`, {
        method: 'POST'
      });
      if ((response as any).ok) {
        // Refresh data
        await fetchDebugData();
      }
    } catch (error) {
      console.error('Error resetting circuit breaker:', error);
    }
  };

  const testWebSocket = async () => {
    try {
      const response = await api.fetch('/debug/websocket/test', {
        method: 'POST'
      });
      if ((response as any).ok) {
        console.log('Test message sent successfully');
      }
    } catch (error) {
      console.error('Error testing WebSocket:', error);
    }
  };

  const copyDebugBundle = () => {
    const debugData = {
      timestamp: new Date().toISOString(),
      debugStatus,
      circuitStatus,
      performanceMetrics,
      wsEvents
    };

    navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/50 w-full max-w-7xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">🔧 Debug Panel</h2>
                <p className="text-gray-300">System monitoring and debugging tools</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={copyDebugBundle}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  📋 Copy Debug Bundle
                </button>
                <button
                  onClick={() => setIsVisible(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex space-x-1 mt-4">
              {[
                { id: 'status', label: 'System Status', icon: '📊' },
                { id: 'circuit', label: 'Circuit Breakers', icon: '⚡' },
                { id: 'performance', label: 'Performance', icon: '🚀' },
                { id: 'events', label: 'WebSocket Events', icon: '🔌' },
                { id: 'logs', label: 'Recent Logs', icon: '📝' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading debug data...</p>
              </div>
            )}

            {/* System Status Tab */}
            {activeTab === 'status' && debugStatus && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* System Metrics */}
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4">🖥️ System Metrics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300">CPU:</span>
                        <span className={`font-mono ${debugStatus.system.cpu_percent > 80 ? 'text-red-400' : 'text-green-400'}`}>
                          {debugStatus.system.cpu_percent}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Memory:</span>
                        <span className={`font-mono ${debugStatus.system.memory_percent > 85 ? 'text-red-400' : 'text-green-400'}`}>
                          {debugStatus.system.memory_percent}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Disk:</span>
                        <span className={`font-mono ${debugStatus.system.disk_percent > 90 ? 'text-red-400' : 'text-green-400'}`}>
                          {debugStatus.system.disk_percent}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* WebSocket Status */}
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4">🔌 WebSocket Status</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Active:</span>
                        <span className="font-mono text-blue-400">{debugStatus.websocket.active_connections}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Total:</span>
                        <span className="font-mono text-blue-400">{debugStatus.websocket.total_connections}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Sequence:</span>
                        <span className="font-mono text-blue-400">{debugStatus.websocket.last_sequence}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Polling:</span>
                        <span className={`font-mono ${debugStatus.websocket.polling_active ? 'text-green-400' : 'text-red-400'}`}>
                          {debugStatus.websocket.polling_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dhan Client Status */}
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4">📡 Dhan Client</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Mode:</span>
                        <span className={`font-mono ${debugStatus.dhan_client.use_mock_data ? 'text-yellow-400' : 'text-green-400'}`}>
                          {debugStatus.dhan_client.use_mock_data ? 'Mock' : 'Real'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">API Calls:</span>
                        <span className="font-mono text-blue-400">{debugStatus.dhan_client.api_call_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Errors:</span>
                        <span className={`font-mono ${debugStatus.dhan_client.error_count > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {debugStatus.dhan_client.error_count}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Circuit:</span>
                        <span className={`font-mono ${
                          debugStatus.dhan_client.circuit_breaker_state === 'CLOSED' ? 'text-green-400' :
                          debugStatus.dhan_client.circuit_breaker_state === 'HALF_OPEN' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {debugStatus.dhan_client.circuit_breaker_state}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Errors */}
                {debugStatus.recent_errors.length > 0 && (
                  <div className="bg-red-900/20 rounded-xl p-4 border border-red-700/50">
                    <h3 className="text-lg font-semibold text-red-300 mb-4">⚠️ Recent Errors</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {debugStatus.recent_errors.map((error, index) => (
                        <div key={index} className="bg-red-900/30 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <span className="text-red-200 text-sm">{error.timestamp}</span>
                            <span className="text-red-300 text-xs bg-red-800/50 px-2 py-1 rounded">
                              {error.error_type}
                            </span>
                          </div>
                          <p className="text-red-100 text-sm mt-1">{error.error_message}</p>
                          {error.trace_id && (
                            <p className="text-red-300 text-xs mt-1">Trace ID: {error.trace_id}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Circuit Breakers Tab */}
            {activeTab === 'circuit' && circuitStatus && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dhan API Circuit Breaker */}
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4">📡 Dhan API Circuit Breaker</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300">State:</span>
                        <span className={`font-mono px-2 py-1 rounded text-sm ${
                          circuitStatus.dhan_api.state === 'CLOSED' ? 'bg-green-600 text-white' :
                          circuitStatus.dhan_api.state === 'HALF_OPEN' ? 'bg-yellow-600 text-white' :
                          'bg-red-600 text-white'
                        }`}>
                          {circuitStatus.dhan_api.state}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Failures:</span>
                        <span className="font-mono text-blue-400">{circuitStatus.dhan_api.failure_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Threshold:</span>
                        <span className="font-mono text-gray-400">{circuitStatus.dhan_api.threshold}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Timeout:</span>
                        <span className="font-mono text-gray-400">{circuitStatus.dhan_api.timeout_seconds}s</span>
                      </div>
                      {circuitStatus.dhan_api.last_failure && (
                        <div className="flex justify-between">
                          <span className="text-gray-300">Last Failure:</span>
                          <span className="font-mono text-red-400 text-sm">
                            {new Date(circuitStatus.dhan_api.last_failure).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                      {circuitStatus.dhan_api.next_attempt && (
                        <div className="flex justify-between">
                          <span className="text-gray-300">Next Attempt:</span>
                          <span className="font-mono text-yellow-400 text-sm">
                            {new Date(circuitStatus.dhan_api.next_attempt).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => resetCircuitBreaker('dhan_api')}
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      🔄 Reset Circuit Breaker
                    </button>
                  </div>

                  {/* WebSocket Circuit Breaker */}
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4">🔌 WebSocket Health</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300">State:</span>
                        <span className="font-mono px-2 py-1 rounded text-sm bg-green-600 text-white">
                          {circuitStatus.websocket.state}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Health:</span>
                        <span className={`font-mono px-2 py-1 rounded text-sm ${
                          circuitStatus.websocket.connection_health === 'HEALTHY' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
                        }`}>
                          {circuitStatus.websocket.connection_health}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={testWebSocket}
                      className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      🧪 Test WebSocket
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Tab */}
            {activeTab === 'performance' && performanceMetrics && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* API Performance */}
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4">🚀 API Performance</h3>
                    <div className="space-y-3">
                      {Object.entries(performanceMetrics.api_performance).map(([endpoint, metrics]) => (
                        <div key={endpoint} className="border-b border-gray-700/50 pb-2">
                          <h4 className="text-blue-300 font-medium">{endpoint}</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>Avg: {metrics.avg_response_time_ms}ms</div>
                            <div>P95: {metrics.p95_response_time_ms}ms</div>
                            <div>Requests: {metrics.request_count}</div>
                            <div>Error Rate: {(metrics.error_rate * 100).toFixed(1)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* WebSocket Performance */}
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <h3 className="text-lg font-semibold text-white mb-4">🔌 WebSocket Performance</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-blue-300 font-medium mb-2">Message Delivery</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Avg Latency: {performanceMetrics.websocket_performance.message_delivery.avg_latency_ms}ms</div>
                          <div>P95 Latency: {performanceMetrics.websocket_performance.message_delivery.p95_latency_ms}ms</div>
                          <div>Messages: {performanceMetrics.websocket_performance.message_delivery.messages_sent}</div>
                          <div>Success Rate: {(performanceMetrics.websocket_performance.message_delivery.delivery_success_rate * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-blue-300 font-medium mb-2">Polling</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Avg Interval: {performanceMetrics.websocket_performance.polling.avg_poll_interval_ms}ms</div>
                          <div>Last Duration: {performanceMetrics.websocket_performance.polling.last_poll_duration_ms}ms</div>
                          <div>Success Rate: {(performanceMetrics.websocket_performance.polling.poll_success_rate * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Trends */}
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <h3 className="text-lg font-semibold text-white mb-4">📈 System Trends (Last {performanceMetrics.system_trends.trend_duration_minutes} minutes)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-blue-300 font-medium mb-2">Memory Usage (%)</h4>
                      <div className="flex space-x-1">
                        {performanceMetrics.system_trends.memory_percent.map((value, index) => (
                          <div
                            key={index}
                            className="bg-blue-600 rounded-t"
                            style={{ height: `${value / 2}px`, width: '20px' }}
                            title={`${value}%`}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-blue-300 font-medium mb-2">CPU Usage (%)</h4>
                      <div className="flex space-x-1">
                        {performanceMetrics.system_trends.cpu_percent.map((value, index) => (
                          <div
                            key={index}
                            className="bg-green-600 rounded-t"
                            style={{ height: `${value * 2}px`, width: '20px' }}
                            title={`${value}%`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-700/50">
                  <h3 className="text-lg font-semibold text-blue-300 mb-4">💡 Recommendations</h3>
                  <ul className="space-y-2">
                    {performanceMetrics.recommendations.map((rec, index) => (
                      <li key={index} className="text-blue-200 text-sm flex items-start">
                        <span className="text-blue-400 mr-2">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* WebSocket Events Tab */}
            {activeTab === 'events' && (
              <div className="space-y-6">
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <h3 className="text-lg font-semibold text-white mb-4">🔌 WebSocket Events (Last 20)</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {wsEvents.map((event, index) => (
                      <div key={index} className="bg-gray-700/50 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <span className="text-gray-300 text-sm">{event.timestamp}</span>
                          <span className="text-blue-400 text-xs bg-blue-800/50 px-2 py-1 rounded">
                            Seq: {event.sequence}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-white font-medium">{event.type}</span>
                          <span className="text-gray-400 text-sm">
                            {event.channel || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-gray-400 text-sm">
                            Connections: {event.connection_count}
                          </span>
                          {Object.keys(event.details).length > 0 && (
                            <span className="text-gray-500 text-xs">
                              {Object.keys(event.details).length} details
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Logs Tab */}
            {activeTab === 'logs' && (
              <div className="space-y-6">
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <h3 className="text-lg font-semibold text-white mb-4">📝 Recent Logs</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    This endpoint currently returns mock data. In production, it would read from actual log files.
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {[
                      {
                        timestamp: "2025-08-21 22:05:37.142",
                        level: "DEBUG",
                        module: "app.ws.live",
                        message: "Emitted pnl delta: seq=36",
                        trace_id: null
                      },
                      {
                        timestamp: "2025-08-21 22:05:37.140",
                        level: "DEBUG",
                        module: "app.services.dhan_client",
                        message: "Created PnL model: totals=PnLTotals(realized=0.0, unrealized=2168861.24, day=2168861.24, currency='INR')",
                        trace_id: null
                      },
                      {
                        timestamp: "2025-08-21 22:05:37.125",
                        level: "DEBUG",
                        module: "app.services.dhan_client",
                        message: "PnL consistency check passed: drift=₹0.00",
                        trace_id: null
                      }
                    ].map((log, index) => (
                      <div key={index} className={`bg-gray-700/50 rounded-lg p-3 border-l-4 ${
                        log.level === 'ERROR' ? 'border-l-red-500' :
                        log.level === 'WARNING' ? 'border-l-yellow-500' :
                        log.level === 'INFO' ? 'border-l-blue-500' :
                        'border-l-gray-500'
                      }`}>
                        <div className="flex justify-between items-start">
                          <span className="text-gray-300 text-sm">{log.timestamp}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            log.level === 'ERROR' ? 'bg-red-600 text-white' :
                            log.level === 'WARNING' ? 'bg-yellow-600 text-white' :
                            log.level === 'INFO' ? 'bg-blue-600 text-white' :
                            'bg-gray-600 text-white'
                          }`}>
                            {log.level}
                          </span>
                        </div>
                        <div className="text-white font-medium mt-1">{log.module}</div>
                        <div className="text-gray-300 text-sm mt-1">{log.message}</div>
                        {log.trace_id && (
                          <div className="text-gray-400 text-xs mt-1">Trace ID: {log.trace_id}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-800/50 p-4 border-t border-gray-700/50">
            <div className="flex justify-between items-center text-sm text-gray-400">
              <span>Press Ctrl+D to toggle debug panel</span>
              {lastRefresh && (
                <span>Last refresh: {lastRefresh.toLocaleTimeString()}</span>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DebugPanel;
