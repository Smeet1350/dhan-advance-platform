from dhanhq import dhanhq
from app.utils.logger import logger
from typing import Dict, List, Any, Optional
from datetime import datetime

# Temporary hardcoded config (replace later with secure store)
CLIENT_ID = "1107860004"
ACCESS_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzU2ODM2NDA4LCJ0b2tlbkNvbnN1bWVyVHlwZSI6IlNFTEYiLCJ3ZWJob29rVXJsIjoiIiwiZGhhbkNsaWVudElkIjoiMTEwNzg2MDAwNCJ9.3cuzgiY0Qm2Id8wpMW0m90_ZxJ0TJRTV5fZ0tpAwWo3S1Mv5HbpcDNwXxXVepnOUHMRDck_AbArIoVOmlA68Dg"

# Initialize Dhan client
try:
    dhan = dhanhq(CLIENT_ID, ACCESS_TOKEN)
    logger.info("Dhan client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Dhan client: {e}")
    dhan = None

def get_holdings() -> Optional[Dict[str, Any]]:
    """
    Get current holdings/portfolio from Dhan API
    
    Returns:
        Dict containing holdings data or None if failed
    """
    try:
        logger.info("Fetching holdings from Dhan API")
        result = dhan.get_holdings()
        logger.info("Holdings fetched successfully")
        return result
    except Exception as e:
        logger.error(f"Failed to fetch holdings: {e}")
        return None

def get_positions() -> Optional[Dict[str, Any]]:
    """
    Get current positions from Dhan API
    
    Returns:
        Dict containing positions data or None if failed
    """
    try:
        logger.info("Fetching positions from Dhan API")
        result = dhan.get_positions()
        logger.info("Positions fetched successfully")
        return result
    except Exception as e:
        logger.error(f"Failed to fetch positions: {e}")
        return None

def get_orders() -> Optional[Dict[str, Any]]:
    """
    Get current orders from Dhan API
    
    Returns:
        Dict containing orders data or None if failed
    """
    try:
        logger.info("Fetching orders from Dhan API")
        # Note: get_orders method doesn't exist in dhanhq
        # Using a placeholder - implement based on actual Dhan API
        logger.info("Orders endpoint - implement based on actual Dhan API")
        return {"message": "Orders endpoint - implement based on actual Dhan API"}
    except Exception as e:
        logger.error(f"Failed to fetch orders: {e}")
        return None

def get_trade_history(from_date: str = None, to_date: str = None) -> Optional[Dict[str, Any]]:
    """
    Get trade history from Dhan API
    
    Args:
        from_date: Start date for trade history (format: YYYY-MM-DD)
        to_date: End date for trade history (format: YYYY-MM-DD)
        
    Returns:
        Dict containing trade history data or None if failed
    """
    try:
        logger.info(f"Fetching trade history from {from_date} to {to_date}")
        if from_date and to_date:
            result = dhan.get_trade_history(from_date, to_date)
            logger.info("Trade history fetched successfully")
            return result
        else:
            logger.warning("Trade history requires from_date and to_date parameters")
            return {"message": "Trade history requires from_date and to_date parameters"}
    except Exception as e:
        logger.error(f"Failed to fetch trade history: {e}")
        return None

def squareoff_position(position_id: str) -> Optional[Dict[str, Any]]:
    """
    Square off a specific position with safety checks
    
    Args:
        position_id: ID of the position to square off
        
    Returns:
        Dict containing square off result or None if failed
    """
    try:
        # Validate position ID
        if not position_id or not position_id.strip():
            raise ValueError("Position ID is required")
        
        logger.info(f"Squaring off position: {position_id}")
        
        # First, verify the position exists and is active
        positions = get_positions()
        if not positions:
            raise ValueError("Unable to fetch current positions")
        
        # Handle different possible data structures
        positions_data = []
        if isinstance(positions.get('data'), dict):
            positions_data = positions.get('data', {}).get('data', [])
        elif isinstance(positions.get('data'), list):
            positions_data = positions.get('data', [])
        else:
            positions_data = positions.get('data', [])
        
        if not positions_data:
            raise ValueError("No current positions found")
        
        # Find the specific position
        position_found = False
        position_data = None
        
        for position in positions_data:
            if str(position.get('id', '')).strip() == str(position_id).strip():
                position_found = True
                position_data = position
                break
        
        if not position_found:
            raise ValueError(f"Position with ID {position_id} not found")
        
        # Check if position can be squared off
        net_qty = position_data.get('netQty', 0)
        if net_qty == 0:
            raise ValueError(f"Position {position_id} has zero quantity - nothing to square off")
        
        # Additional safety checks
        trading_symbol = position_data.get('tradingSymbol', 'N/A')
        side = position_data.get('side', 'N/A')
        
        # Log position details before square-off
        logger.info(f"Position details - ID: {position_id}, Symbol: {trading_symbol}, "
                   f"Quantity: {net_qty}, Side: {side}")
        
        # Confirm square-off action (in production, you might want additional confirmation)
        logger.warning(f"ATTEMPTING SQUARE-OFF: Position {position_id} ({trading_symbol}) - {net_qty} shares")
        
        # Execute square-off through Dhan API
        result = dhan.squareoff_position(position_id)
        
        if result and result.get('status') == 'success':
            logger.info(f"Position {position_id} squared off successfully")
            return {
                "status": "success",
                "message": f"Position {position_id} squared off successfully",
                "position_id": position_id,
                "symbol": trading_symbol,
                "quantity": net_qty,
                "side": side,
                "timestamp": datetime.now().isoformat(),
                "api_response": result
            }
        else:
            raise Exception(f"Square-off failed for position {position_id}: {result}")
            
    except ValueError as e:
        logger.warning(f"Square-off validation error for position {position_id}: {e}")
        raise e
    except Exception as e:
        logger.error(f"Failed to square off position {position_id}: {e}")
        raise e

def get_pnl() -> Optional[Dict[str, Any]]:
    """
    Get P&L (Profit & Loss) data from Dhan API
    
    Returns:
        Dict containing P&L data or None if failed
    """
    try:
        logger.info("Fetching P&L data from Dhan API")
        # Note: This is a placeholder - implement based on actual Dhan API
        # You may need to calculate P&L from positions and trade history
        logger.info("P&L data fetched successfully")
        return {"message": "P&L endpoint - implement based on Dhan API"}
    except Exception as e:
        logger.error(f"Failed to fetch P&L data: {e}")
        return None
