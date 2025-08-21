import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  componentCount: number;
}

interface PerformanceOptimizerProps {
  children: React.ReactNode;
  enableMonitoring?: boolean;
  enableLazyLoading?: boolean;
  enableVirtualization?: boolean;
}

export const PerformanceOptimizer: React.FC<PerformanceOptimizerProps> = ({
  children,
  enableMonitoring = true,
  enableLazyLoading = true
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    renderTime: 0,
    componentCount: 0
  });
  const [isMonitoring, setIsMonitoring] = useState(enableMonitoring);
  const [showMetrics, setShowMetrics] = useState(false);

  // Performance monitoring
  useEffect(() => {
    if (!isMonitoring) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measurePerformance = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        const memoryUsage = (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0;
        
        setMetrics(prev => ({
          ...prev,
          fps,
          memoryUsage: Math.round(memoryUsage * 100) / 100
        }));
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measurePerformance);
    };

    measurePerformance();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isMonitoring]);

  // Component count monitoring
  useEffect(() => {
    if (!isMonitoring) return;

    const updateComponentCount = () => {
      const componentCount = document.querySelectorAll('[data-component]').length;
      setMetrics(prev => ({ ...prev, componentCount }));
    };

    const observer = new MutationObserver(updateComponentCount);
    observer.observe(document.body, { childList: true, subtree: true });
    
    updateComponentCount();

    return () => observer.disconnect();
  }, [isMonitoring]);

  // Render time monitoring
  useEffect(() => {
    if (!isMonitoring) return;

    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      setMetrics(prev => ({ ...prev, renderTime: Math.round(renderTime * 100) / 100 }));
    };
  }, [isMonitoring]);

  // Performance recommendations
  const recommendations = useMemo(() => {
    const recs = [];
    
    if (metrics.fps < 30) {
      recs.push('Low FPS detected. Consider reducing animations or optimizing renders.');
    }
    
    if (metrics.memoryUsage > 100) {
      recs.push('High memory usage. Check for memory leaks or optimize data structures.');
    }
    
    if (metrics.renderTime > 16) {
      recs.push('Slow render time. Consider using React.memo or useMemo for expensive components.');
    }
    
    if (metrics.componentCount > 1000) {
      recs.push('High component count. Consider virtualization for large lists.');
    }
    
    return recs;
  }, [metrics]);

  // Toggle monitoring
  const toggleMonitoring = useCallback(() => {
    setIsMonitoring(prev => !prev);
  }, []);

  // Toggle metrics display
  const toggleMetrics = useCallback(() => {
    setShowMetrics(prev => !prev);
  }, []);

  return (
    <div className="relative">
      {/* Performance Monitor Overlay */}
      {isMonitoring && (
        <div className="fixed top-4 right-4 z-50">
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-4 shadow-2xl"
          >
            {/* Toggle Button */}
            <button
              onClick={toggleMetrics}
              className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
            >
              {showMetrics ? '−' : '+'}
            </button>
            
            {/* Metrics Display */}
            <AnimatePresence>
              {showMetrics && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className="text-center">
                    <h3 className="text-sm font-semibold text-white mb-2">Performance Monitor</h3>
                  </div>
                  
                  {/* FPS */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">FPS:</span>
                    <span className={`text-sm font-mono ${
                      metrics.fps >= 50 ? 'text-green-400' : 
                      metrics.fps >= 30 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {metrics.fps}
                    </span>
                  </div>
                  
                  {/* Memory Usage */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Memory:</span>
                    <span className={`text-sm font-mono ${
                      metrics.memoryUsage < 50 ? 'text-green-400' : 
                      metrics.memoryUsage < 100 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {metrics.memoryUsage}MB
                    </span>
                  </div>
                  
                  {/* Render Time */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Render:</span>
                    <span className={`text-sm font-mono ${
                      metrics.renderTime < 16 ? 'text-green-400' : 
                      metrics.renderTime < 33 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {metrics.renderTime}ms
                    </span>
                  </div>
                  
                  {/* Component Count */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Components:</span>
                    <span className="text-sm font-mono text-blue-400">
                      {metrics.componentCount}
                    </span>
                  </div>
                  
                  {/* Recommendations */}
                  {recommendations.length > 0 && (
                    <div className="pt-2 border-t border-gray-700/50">
                      <div className="text-xs text-gray-400 mb-1">Recommendations:</div>
                      <ul className="text-xs text-yellow-300 space-y-1">
                        {recommendations.slice(0, 2).map((rec, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-yellow-400 mr-1">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
      
      {/* Control Panel */}
      <div className="fixed bottom-4 right-4 z-50">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-3 shadow-2xl"
        >
          <div className="flex space-x-2">
            <button
              onClick={toggleMonitoring}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                isMonitoring 
                  ? 'bg-green-600/20 text-green-300 border border-green-400/30' 
                  : 'bg-gray-600/20 text-gray-300 border border-gray-400/30'
              }`}
              title={isMonitoring ? 'Disable Monitoring' : 'Enable Monitoring'}
            >
              {isMonitoring ? '📊' : '📈'}
            </button>
            
            <button
              onClick={toggleMetrics}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-300 border border-blue-400/30 transition-all duration-200"
              title="Toggle Metrics Display"
            >
              {showMetrics ? '👁️' : '📋'}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className={enableLazyLoading ? 'lazy-loading-enabled' : ''}>
        {children}
      </div>
    </div>
  );
};

// Performance HOC
export const withPerformanceOptimization = <P extends object>(
  Component: React.ComponentType<P>,
  options: {
    enableMonitoring?: boolean;
    enableLazyLoading?: boolean;
    enableVirtualization?: boolean;
  } = {}
) => {
  const OptimizedComponent: React.FC<P> = (props) => (
    <PerformanceOptimizer {...options}>
      <Component {...props} />
    </PerformanceOptimizer>
  );
  
  OptimizedComponent.displayName = `withPerformanceOptimization(${Component.displayName || Component.name})`;
  
  return OptimizedComponent;
};

// Performance hooks
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    renderTime: 0,
    componentCount: 0
  });

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measurePerformance = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        const memoryUsage = (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0;
        
        setMetrics(prev => ({
          ...prev,
          fps,
          memoryUsage: Math.round(memoryUsage * 100) / 100
        }));
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measurePerformance);
    };

    measurePerformance();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return metrics;
};

export const useRenderTimer = () => {
  const [renderTime, setRenderTime] = useState(0);

  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      setRenderTime(Math.round((endTime - startTime) * 100) / 100);
    };
  });

  return renderTime;
};

export default PerformanceOptimizer;
