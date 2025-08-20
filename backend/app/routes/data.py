from fastapi import APIRouter, Request
from app.services.dhan_client import get_holdings, get_positions, get_orders, get_trade_history
from app.utils.response import success, error

router = APIRouter()

@router.get("/holdings")
def holdings(request: Request):
    try:
        return success(get_holdings(), request.state.trace_id)
    except Exception as e:
        return error("DHAN_ERROR", str(e), trace_id=request.state.trace_id)

@router.get("/positions")
def positions(request: Request):
    try:
        return success(get_positions(), request.state.trace_id)
    except Exception as e:
        return error("DHAN_ERROR", str(e), trace_id=request.state.trace_id)

@router.get("/orders")
def orders(request: Request):
    try:
        return success(get_orders(), request.state.trace_id)
    except Exception as e:
        return error("DHAN_ERROR", str(e), trace_id=request.state.trace_id)

@router.get("/trades")
def trades(request: Request):
    try:
        from datetime import datetime, timedelta
        # Default to last 7 days if no dates provided
        today = datetime.now()
        week_ago = today - timedelta(days=7)
        from_date = week_ago.strftime('%Y-%m-%d')
        to_date = today.strftime('%Y-%m-%d')
        
        return success(get_trade_history(from_date, to_date), request.state.trace_id)
    except Exception as e:
        return error("DHAN_ERROR", str(e), trace_id=request.state.trace_id)

@router.get("/pnl")
def pnl(request: Request):
    try:
        from app.services.dhan_client import get_pnl
        return success(get_pnl(), request.state.trace_id)
    except Exception as e:
        return error("DHAN_ERROR", str(e), trace_id=request.state.trace_id)
