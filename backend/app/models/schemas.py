from pydantic import BaseModel, Field
from typing import Optional, List, Union
from datetime import datetime
from decimal import Decimal
from enum import Enum

# Enums
class Side(str, Enum):
    LONG = "LONG"
    SHORT = "SHORT"

class OrderType(str, Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"
    STOP_LIMIT = "STOP_LIMIT"

class OrderStatus(str, Enum):
    PENDING = "PENDING"
    PARTIALLY_FILLED = "PARTIALLY_FILLED"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"

# DTOs as specified in requirements
class Holding(BaseModel):
    """Holding DTO: isin, symbol, qty, avg_price, ltp, value, day_change"""
    isin: str = Field(..., description="ISIN code")
    symbol: str = Field(..., description="Trading symbol")
    qty: int = Field(..., description="Quantity held")
    avg_price: float = Field(..., description="Average purchase price")
    ltp: float = Field(..., description="Last traded price")
    value: float = Field(..., description="Current market value")
    day_change: float = Field(..., description="Day's change in value")

class Position(BaseModel):
    """Position DTO: id, symbol, side(LONG|SHORT), qty, avg_price, ltp, unrealized"""
    id: str = Field(..., description="Position ID")
    symbol: str = Field(..., description="Trading symbol")
    side: Side = Field(..., description="Position side (LONG/SHORT)")
    qty: int = Field(..., description="Position quantity")
    avg_price: float = Field(..., description="Average entry price")
    ltp: float = Field(..., description="Last traded price")
    unrealized: float = Field(..., description="Unrealized P&L")

class Order(BaseModel):
    """Order DTO: order_id, symbol, side, type, price, qty, filled_qty, status, placed_at"""
    order_id: str = Field(..., description="Unique order identifier")
    symbol: str = Field(..., description="Trading symbol")
    side: Side = Field(..., description="Order side (LONG/SHORT)")
    type: OrderType = Field(..., description="Order type")
    price: float = Field(..., description="Order price")
    qty: int = Field(..., description="Order quantity")
    filled_qty: int = Field(..., description="Filled quantity")
    status: OrderStatus = Field(..., description="Order status")
    placed_at: datetime = Field(..., description="Order placement time")

class Trade(BaseModel):
    """Trade DTO: trade_id, order_id, symbol, side, price, qty, time"""
    trade_id: str = Field(..., description="Unique trade identifier")
    order_id: str = Field(..., description="Associated order ID")
    symbol: str = Field(..., description="Trading symbol")
    side: Side = Field(..., description="Trade side (LONG/SHORT)")
    price: float = Field(..., description="Trade price")
    qty: int = Field(..., description="Trade quantity")
    time: datetime = Field(..., description="Trade execution time")

class PnLSymbol(BaseModel):
    """P&L data for a specific symbol"""
    symbol: str = Field(..., description="Trading symbol")
    side: Side = Field(..., description="Position side")
    qty: int = Field(..., description="Quantity")
    avg: float = Field(..., description="Average price")
    ltp: float = Field(..., description="Last traded price")
    unrealized: float = Field(..., description="Unrealized P&L")
    today_pnl: float = Field(..., description="Today's P&L")

class PnLTotals(BaseModel):
    """P&L totals"""
    realized: float = Field(..., description="Realized P&L")
    unrealized: float = Field(..., description="Unrealized P&L")
    day: float = Field(..., description="Day's P&L")
    currency: str = Field(..., description="Currency (INR)")

class PnL(BaseModel):
    """PnL payload: { totals:{ realized, unrealized, day, currency, updatedAt, tradingDay }, perSymbol:[{symbol, side, qty, avg, ltp, unrealized, todayPnL}], updatedAt, tradingDay }"""
    totals: PnLTotals = Field(..., description="P&L totals")
    per_symbol: List[PnLSymbol] = Field(..., alias="perSymbol", description="P&L per symbol")
    updated_at: datetime = Field(..., alias="updatedAt", description="Last update time")
    trading_day: str = Field(..., alias="tradingDay", description="Trading day")

# Canonical error codes
class ErrorCode(str, Enum):
    DHAN_UNAUTHORIZED = "DHAN_UNAUTHORIZED"
    DHAN_TIMEOUT = "DHAN_TIMEOUT"
    DHAN_RATE_LIMIT = "DHAN_RATE_LIMIT"
    UPSTREAM_FAIL = "UPSTREAM_FAIL"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    POSITION_NOT_OPEN = "POSITION_NOT_OPEN"
    ORDER_REJECTED = "ORDER_REJECTED"
    ZERO_QTY = "ZERO_QTY"
    LTP_STALE = "LTP_STALE"

# API Response wrapper
class APIResponse(BaseModel):
    """Standard API response wrapper"""
    ok: bool = Field(..., description="Success status")
    data: Optional[Union[dict, list, Holding, Position, Order, Trade, PnL]] = Field(None, description="Response data")
    error: Optional[dict] = Field(None, description="Error details if any")
    trace_id: Optional[str] = Field(None, description="Request trace ID")
