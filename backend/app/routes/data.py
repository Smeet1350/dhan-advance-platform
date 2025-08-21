from fastapi import APIRouter, Request, Query
from typing import Optional
from app.services.dhan_client import dhan_client
from app.utils.response import (
    success, error, validation_error, upstream_error,
    unauthorized_error, timeout_error, rate_limit_error
)
from app.models.schemas import ErrorCode
from app.utils.logger import logger

router = APIRouter()

@router.get("/holdings")
def holdings(request: Request):
    """Get current holdings/portfolio"""
    try:
        holdings_data = dhan_client.fetch_holdings()
        return success(holdings_data, request.state.trace_id)
    except Exception as e:
        logger.error(f"Failed to fetch holdings: {e}", extra={"trace_id": request.state.trace_id})
        return upstream_error("Failed to fetch holdings", {"error": str(e)}, request.state.trace_id)

@router.get("/positions")
def positions(request: Request):
    """Get current positions"""
    try:
        positions_data = dhan_client.fetch_positions()
        return success(positions_data, request.state.trace_id)
    except Exception as e:
        logger.error(f"Failed to fetch positions: {e}", extra={"trace_id": request.state.trace_id})
        return upstream_error("Failed to fetch positions", {"error": str(e)}, request.state.trace_id)

@router.get("/orders")
def orders(request: Request, status: Optional[str] = Query(None, description="Filter by order status")):
    """Get current orders, optionally filtered by status"""
    try:
        orders_data = dhan_client.fetch_orders(status)
        return success(orders_data, request.state.trace_id)
    except Exception as e:
        logger.error(f"Failed to fetch orders: {e}", extra={"trace_id": request.state.trace_id})
        return upstream_error("Failed to fetch orders", {"error": str(e)}, request.state.trace_id)

@router.get("/trades")
def trades(
    request: Request,
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get trade history within date range"""
    try:
        # Default to last 7 days if no dates provided
        if not from_date or not to_date:
            from datetime import datetime, timedelta
            today = datetime.now()
            week_ago = today - timedelta(days=7)
            from_date = week_ago.strftime('%Y-%m-%d')
            to_date = today.strftime('%Y-%m-%d')
        
        trades_data = dhan_client.fetch_trades(from_date, to_date)
        return success(trades_data, request.state.trace_id)
    except Exception as e:
        logger.error(f"Failed to fetch trades: {e}", extra={"trace_id": request.state.trace_id})
        return upstream_error("Failed to fetch trades", {"error": str(e)}, request.state.trace_id)

@router.get("/pnl")
def pnl(request: Request):
    """Get P&L data"""
    try:
        logger.info("PnL endpoint called")
        pnl_data = dhan_client.get_pnl()
        logger.info(f"PnL data returned: {pnl_data is not None}")
        if pnl_data is None:
            return upstream_error("Failed to calculate P&L", {"error": "Unable to calculate P&L"}, request.state.trace_id)
        return success(pnl_data, request.state.trace_id)
    except Exception as e:
        logger.error(f"Failed to fetch P&L: {e}", extra={"trace_id": request.state.trace_id})
        return upstream_error("Failed to fetch P&L", {"error": str(e)}, request.state.trace_id)

@router.get("/debug/pnl")
def debug_pnl(request: Request):
    """Debug endpoint to test PnL calculation"""
    try:
        logger.info("Debug PnL endpoint called")
        
        # Test direct method call
        positions = dhan_client.fetch_positions()
        logger.info(f"Fetched {len(positions)} positions")
        
        # Test PnL calculation
        pnl_data = dhan_client.get_pnl()
        logger.info(f"PnL calculation result: {pnl_data is not None}")
        
        return success({
            "positions_count": len(positions),
            "pnl_calculation_success": pnl_data is not None,
            "pnl_data": pnl_data
        }, request.state.trace_id)
    except Exception as e:
        logger.error(f"Debug PnL failed: {e}", extra={"trace_id": request.state.trace_id})
        import traceback
        return upstream_error("Debug PnL failed", {"error": str(e), "traceback": traceback.format_exc()}, request.state.trace_id)

@router.get("/debug/client")
def debug_client(request: Request):
    """Debug endpoint to test client methods"""
    try:
        logger.info("Debug client endpoint called")
        
        # Test basic client properties
        client_info = {
            "use_mock": dhan_client.use_mock,
            "has_dhan": dhan_client.dhan is not None,
            "methods": [method for method in dir(dhan_client) if not method.startswith('_')]
        }
        
        # Test a simple method
        try:
            holdings = dhan_client.fetch_holdings()
            client_info["holdings_count"] = len(holdings)
            client_info["holdings_success"] = True
        except Exception as e:
            client_info["holdings_success"] = False
            client_info["holdings_error"] = str(e)
        
        # Test PnL method specifically
        try:
            pnl_method = getattr(dhan_client, 'get_pnl', None)
            client_info["has_get_pnl_method"] = pnl_method is not None
            client_info["get_pnl_type"] = str(type(pnl_method)) if pnl_method else None
        except Exception as e:
            client_info["get_pnl_check_error"] = str(e)
        
        return success(client_info, request.state.trace_id)
    except Exception as e:
        logger.error(f"Debug client failed: {e}", extra={"trace_id": request.state.trace_id})
        import traceback
        return upstream_error("Debug client failed", {"error": str(e), "traceback": traceback.format_exc()}, request.state.trace_id)

@router.get("/debug/pnl-model")
def debug_pnl_model(request: Request):
    """Debug endpoint to test PnL model creation directly"""
    try:
        logger.info("Debug PnL model endpoint called")
        
        from app.models.schemas import PnL, PnLTotals, PnLSymbol
        from datetime import datetime
        
        # Test creating a simple PnL model
        try:
            # Create a simple PnLSymbol
            symbol_pnl = PnLSymbol(
                symbol="TEST",
                side="LONG",
                qty=100,
                avg=100.0,
                ltp=110.0,
                unrealized=1000.0,
                today_pnl=0.0
            )
            logger.info("PnLSymbol created successfully")
        except Exception as e:
            logger.error(f"Failed to create PnLSymbol: {e}")
            return upstream_error("PnLSymbol creation failed", {"error": str(e)}, request.state.trace_id)
        
        try:
            # Create PnLTotals
            totals = PnLTotals(
                realized=0.0,
                unrealized=1000.0,
                day=0.0,
                currency="INR",
                updated_at=datetime.now(),
                trading_day=datetime.now().strftime('%Y-%m-%d')
            )
            logger.info("PnLTotals created successfully")
        except Exception as e:
            logger.error(f"Failed to create PnLTotals: {e}")
            return upstream_error("PnLTotals creation failed", {"error": str(e)}, request.state.trace_id)
        
        try:
            # Create PnL
            pnl = PnL(
                totals=totals,
                per_symbol=[symbol_pnl]
            )
            logger.info("PnL created successfully")
            return success({"pnl_creation": "success", "pnl_data": pnl}, request.state.trace_id)
        except Exception as e:
            logger.error(f"Failed to create PnL: {e}")
            return upstream_error("PnL creation failed", {"error": str(e)}, request.state.trace_id)
        
    except Exception as e:
        logger.error(f"Debug PnL model failed: {e}", extra={"trace_id": request.state.trace_id})
        import traceback
        return upstream_error("Debug PnL model failed", {"error": str(e), "traceback": traceback.format_exc()}, request.state.trace_id)

@router.get("/ltp")
def ltp(request: Request, symbols: str = Query(..., description="Comma-separated list of symbols")):
    """Get Last Traded Price for symbols"""
    try:
        symbol_list = [s.strip() for s in symbols.split(',') if s.strip()]
        if not symbol_list:
            return validation_error("At least one symbol is required", {"symbols": symbols}, request.state.trace_id)
        
        ltp_data = dhan_client.fetch_ltp(symbol_list)
        return success(ltp_data, request.state.trace_id)
    except Exception as e:
        logger.error(f"Failed to fetch LTP: {e}", extra={"trace_id": request.state.trace_id})
        return upstream_error("Failed to fetch LTP", {"error": str(e)}, request.state.trace_id)
