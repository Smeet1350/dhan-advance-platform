interface ErrorLog {
  id: string;
  timestamp: string;
  message: string;
  traceId?: string;
  error?: any;
  component?: string;
  metadata?: Record<string, any>;
}

class ErrorLogger {
  private errors: ErrorLog[] = [];
  private maxErrors = 10;
  private listeners: Set<(errors: ErrorLog[]) => void> = new Set();

  // Add error to the log
  addError(error: Omit<ErrorLog, 'id' | 'timestamp'>) {
    const errorLog: ErrorLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...error
    };

    this.errors = [errorLog, ...this.errors.slice(0, this.maxErrors - 1)];
    
    // Notify listeners
    this.notifyListeners();
    
    // Also log to console for development
    if (import.meta.env.DEV) {
      console.error('Error logged:', errorLog);
    }
  }

  // Get all errors
  getErrors(): ErrorLog[] {
    return [...this.errors];
  }

  // Clear all errors
  clearErrors() {
    this.errors = [];
    this.notifyListeners();
  }

  // Add listener for error updates
  addListener(listener: (errors: ErrorLog[]) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener([...this.errors]);
      } catch (error) {
        console.error('Error in error logger listener:', error);
      }
    });
  }

  // Log API error
  logApiError(message: string, error: any, traceId?: string, component?: string) {
    this.addError({
      message,
      error,
      traceId,
      component: component || 'API',
      metadata: {
        type: 'api',
        url: error?.config?.url,
        method: error?.config?.method,
        status: error?.response?.status
      }
    });
  }

  // Log WebSocket error
  logWsError(message: string, error: any, component?: string) {
    this.addError({
      message,
      error,
      component: component || 'WebSocket',
      metadata: {
        type: 'websocket',
        wsUrl: error?.target?.url
      }
    });
  }

  // Log component error
  logComponentError(message: string, error: any, component: string, traceId?: string) {
    this.addError({
      message,
      error,
      traceId,
      component,
      metadata: {
        type: 'component',
        componentName: component
      }
    });
  }

  // Log validation error
  logValidationError(message: string, field?: string, value?: any, component?: string) {
    this.addError({
      message,
      component: component || 'Validation',
      metadata: {
        type: 'validation',
        field,
        value: value !== undefined ? String(value).slice(0, 100) : undefined
      }
    });
  }
}

// Create singleton instance
export const errorLogger = new ErrorLogger();

// Export types
export type { ErrorLog };

// Export convenience functions
export const logApiError = (message: string, error: any, traceId?: string, component?: string) => {
  errorLogger.logApiError(message, error, traceId, component);
};

export const logWsError = (message: string, error: any, component?: string) => {
  errorLogger.logWsError(message, error, component);
};

export const logComponentError = (message: string, error: any, component: string, traceId?: string) => {
  errorLogger.logComponentError(message, error, component, traceId);
};

export const logValidationError = (message: string, field?: string, value?: any, component?: string) => {
  errorLogger.logValidationError(message, field, value, component);
};
