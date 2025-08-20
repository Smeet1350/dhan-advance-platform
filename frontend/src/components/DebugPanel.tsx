import { useState, useEffect, useCallback } from 'react';
import { config } from '../config';
import { errorLogger, type ErrorLog } from '../services/errorLogger';

interface DebugPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function DebugPanel({ isVisible, onClose }: DebugPanelProps) {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [lastWsMessage, setLastWsMessage] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<'healthy' | 'unhealthy' | 'checking'>('checking');

  // Listen to error logger updates
  useEffect(() => {
    const unsubscribe = errorLogger.addListener(setErrors);
    return unsubscribe;
  }, []);

  // Check API health
  const checkApiHealth = useCallback(async () => {
    try {
      setApiStatus('checking');
      const response = await fetch(`${config.api.baseURL}/healthz`);
      if (response.ok) {
        setApiStatus('healthy');
      } else {
        setApiStatus('unhealthy');
      }
    } catch (error) {
      setApiStatus('unhealthy');
    }
  }, []);

  // Copy trace ID bundle
  const copyTraceIdBundle = useCallback(async (traceId: string) => {
    const errorBundle = {
      timestamp: new Date().toISOString(),
      traceId,
      apiBase: config.api.baseURL,
      wsStatus,
      userAgent: navigator.userAgent,
      url: window.location.href,
      errors: errors.filter(e => e.traceId === traceId)
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorBundle, null, 2));
      
      // Show success feedback
      const originalText = document.activeElement?.textContent;
      if (document.activeElement) {
        (document.activeElement as HTMLElement).textContent = '✅ Copied!';
        setTimeout(() => {
          if (document.activeElement) {
            (document.activeElement as HTMLElement).textContent = originalText || 'Copy Trace ID';
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback: show in alert
      alert('Error bundle copied to console. Check DevTools console.');
      console.log('Error Bundle for Trace ID:', traceId, errorBundle);
    }
  }, [wsStatus, errors]);

  // Copy all errors bundle
  const copyAllErrorsBundle = useCallback(async () => {
    const allErrorsBundle = {
      timestamp: new Date().toISOString(),
      apiBase: config.api.baseURL,
      wsStatus,
      userAgent: navigator.userAgent,
      url: window.location.href,
      totalErrors: errors.length,
      errors: errors
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(allErrorsBundle, null, 2));
      alert('✅ All errors copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      console.log('All Errors Bundle:', allErrorsBundle);
      alert('Error bundle copied to console. Check DevTools console.');
    }
  }, [wsStatus, errors]);

  // Listen for WebSocket status updates
  useEffect(() => {
    const handleWsStatusUpdate = (event: CustomEvent) => {
      setWsStatus(event.detail.status);
      if (event.detail.message) {
        setLastWsMessage(event.detail.message);
      }
    };

    window.addEventListener('ws-status-update', handleWsStatusUpdate as EventListener);
    return () => {
      window.removeEventListener('ws-status-update', handleWsStatusUpdate as EventListener);
    };
  }, []);

  // Listen for global errors
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      errorLogger.addError({
        message: event.message,
        error: event.error,
        component: 'Global'
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      errorLogger.addError({
        message: event.reason?.message || 'Unhandled Promise Rejection',
        error: event.reason,
        component: 'Promise'
      });
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Check API health on mount and every 30 seconds
  useEffect(() => {
    checkApiHealth();
    const interval = setInterval(checkApiHealth, 30000);
    return () => clearInterval(interval);
  }, [checkApiHealth]);

  // Add sample error for testing
  useEffect(() => {
    errorLogger.addError({
      message: 'Sample error for testing debug panel',
      traceId: 'sample-trace-123',
      component: 'DebugPanel'
    });
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🐛</span>
            <h2 className="text-xl font-semibold text-white">Debug Panel</h2>
            <span className="text-sm text-gray-400">(Ctrl+D to toggle)</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* System Status */}
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">API Status</div>
                <div className={`text-lg font-medium ${
                  apiStatus === 'healthy' ? 'text-green-400' :
                  apiStatus === 'unhealthy' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {apiStatus === 'healthy' ? '🟢 Healthy' :
                   apiStatus === 'unhealthy' ? '🔴 Unhealthy' : '🟡 Checking...'}
                </div>
                <div className="text-xs text-gray-500 mt-1">{config.api.baseURL}</div>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">WebSocket Status</div>
                <div className={`text-lg font-medium ${
                  wsStatus === 'connected' ? 'text-green-400' :
                  wsStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {wsStatus === 'connected' ? '🟢 Connected' :
                   wsStatus === 'connecting' ? '🟡 Connecting...' : '🔴 Disconnected'}
                </div>
                {lastWsMessage && (
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    Last: {JSON.stringify(lastWsMessage).slice(0, 50)}...
                  </div>
                )}
              </div>

              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">Error Count</div>
                <div className="text-lg font-medium text-red-400">{errors.length}</div>
                <div className="text-xs text-gray-500 mt-1">Last 10 errors</div>
              </div>
            </div>
          </div>

          {/* Error Logs */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Error Logs</h3>
              <button
                onClick={copyAllErrorsBundle}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              >
                📋 Copy All Errors
              </button>
            </div>

            {errors.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No errors logged</div>
            ) : (
              <div className="space-y-3">
                {errors.map((error) => (
                  <div key={error.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-red-400 text-sm font-medium">
                            {error.component || 'Unknown'}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {new Date(error.timestamp).toLocaleTimeString()}
                          </span>
                          {error.traceId && (
                            <span className="text-blue-400 text-xs font-mono">
                              Trace: {error.traceId.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                        <div className="text-white text-sm mb-2">{error.message}</div>
                        {error.error && (
                          <div className="text-gray-400 text-xs font-mono bg-gray-900 p-2 rounded">
                            {error.error.stack || error.error.toString()}
                          </div>
                        )}
                      </div>
                      {error.traceId && (
                        <button
                          onClick={() => copyTraceIdBundle(error.traceId!)}
                          className="ml-3 px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs whitespace-nowrap"
                        >
                          Copy Trace ID
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="p-6 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={checkApiHealth}
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              >
                🔄 Refresh API Status
              </button>
              <button
                onClick={() => {
                  errorLogger.clearErrors();
                }}
                className="p-3 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
              >
                🗑️ Clear Error Logs
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
