# Logging System Documentation

## Overview
This backend application uses **loguru** for comprehensive logging with the following features:

- **Structured JSON logging** for easy parsing and analysis
- **Automatic log rotation** (1 MB per file)
- **Multiple log levels** (DEBUG, INFO, WARNING, ERROR, SUCCESS)
- **Request/response logging** with trace IDs
- **Performance monitoring** capabilities

## Configuration
The logger is configured in `app/utils/logger.py`:

```python
from loguru import logger

logger.add("logs/app.log", rotation="1 MB", serialize=True)
```

## Usage Examples

### Basic Logging
```python
from app.utils.logger import logger

logger.debug("Debug information")
logger.info("General information")
logger.warning("Warning message")
logger.error("Error message")
logger.success("Success message")
```

### Logging with Context
```python
logger.info("User action", extra={
    "user_id": "12345",
    "action": "login",
    "ip_address": "192.168.1.1"
})
```

### Exception Logging
```python
try:
    # Some operation
    result = risky_operation()
except Exception as e:
    logger.exception(f"Operation failed: {e}")
```

### Performance Logging
```python
import time

start_time = time.time()
# ... perform operation ...
elapsed = time.time() - start_time
logger.info(f"Operation completed in {elapsed:.3f} seconds")
```

## Log File Location
- **Path**: `backend/logs/app.log`
- **Format**: JSON (serialized)
- **Rotation**: 1 MB per file
- **Retention**: Automatic rotation

## Log Structure
Each log entry contains:
- **Timestamp**: ISO format with timezone
- **Level**: Log level (DEBUG, INFO, WARNING, ERROR, SUCCESS)
- **Module**: Source module name
- **Function**: Function name where log was called
- **Line**: Line number in source file
- **Message**: Log message
- **Process/Thread**: Process and thread IDs
- **Elapsed**: Time elapsed since application start

## Integration with FastAPI
The logger is automatically integrated with FastAPI:
- **Startup/Shutdown events** are logged
- **Request/Response middleware** logs all HTTP requests
- **Trace IDs** are generated for request tracking
- **Performance metrics** are captured

## Best Practices
1. **Use appropriate log levels**:
   - DEBUG: Development and debugging
   - INFO: General information
   - WARNING: Something to be aware of
   - ERROR: Something went wrong
   - SUCCESS: Operation completed successfully

2. **Include context** in log messages for better debugging

3. **Use structured logging** with the `extra` parameter

4. **Log exceptions** with `logger.exception()` to capture stack traces

5. **Monitor log file size** and rotation

## Example Output
```json
{
  "text": "2025-08-20 11:05:36.422 | INFO | __main__:demonstrate_logging:41 - User profile updated",
  "record": {
    "elapsed": {"repr": "0:00:00.140615", "seconds": 0.140615},
    "exception": null,
    "extra": {"user_id": "67890", "email": "user@example.com", "action": "profile_update"},
    "file": {"name": "demo_logger.py", "path": "C:\\path\\to\\file"},
    "function": "demonstrate_logging",
    "level": {"icon": "ℹ️", "name": "INFO", "no": 20},
    "line": 41,
    "message": "User profile updated",
    "module": "demo_logger",
    "name": "__main__",
    "process": {"id": 10700, "name": "MainProcess"},
    "thread": {"id": 11496, "name": "MainThread"},
    "time": {"repr": "2025-08-20 11:05:36.422117+05:30", "timestamp": 1755668136.422117}
  }
}
```
