from pydantic import BaseModel, Field
from typing import Optional, List, Union
from datetime import datetime
from decimal import Decimal

# Base response models
class BaseResponse(BaseModel):
    """Base response model for all API endpoints"""
    status: str = Field(..., description="Response status (success/error)")
    remarks: Optional[str] = Field(None, description="Additional remarks or messages")

# Holdings models
class Holding(BaseModel):
    """Individual holding/portfolio item"""
    exchange: str = Field(..., description="Exchange (NSE, BSE, etc.)")
    trading_symbol: str = Field(..., alias="tradingSymbol", description="Trading symbol (e.g., TATASTEEL)")
    security_id: str = Field(..., alias="securityId", description="Security identifier")
    isin: str = Field(..., description="ISIN code")
    total_qty: int = Field(..., alias="totalQty", description="Total quantity held")
    dp_qty: int = Field(..., alias="dpQty", description="DP quantity")
    t1_qty: int = Field(..., alias="t1Qty", description="T+1 quantity")
    mtf_t1_qty: int = Field(..., alias="mtf_t1_qty", description="MTF T+1 quantity")
    mtf_qty: int = Field(..., alias="mtf_qty", description="MTF quantity")
    available_qty: int = Field(..., alias="availableQty", description="Available quantity for trading")
    collateral_qty: int = Field(..., alias="collateralQty", description="Collateral quantity")
    avg_cost_price: float = Field(..., alias="avgCostPrice", description="Average cost price")
    last_traded_price: float = Field(..., alias="lastTradedPrice", description="Last traded price")
    
    # Computed fields
    @property
    def market_value(self) -> float:
        """Calculate current market value"""
        return self.total_qty * self.last_traded_price
    
    @property
    def unrealized_pnl(self) -> float:
        """Calculate unrealized P&L"""
        return (self.last_traded_price - self.avg_cost_price) * self.total_qty
    
    @property
    def pnl_percentage(self) -> float:
        """Calculate P&L percentage"""
        if self.avg_cost_price > 0:
            return ((self.last_traded_price - self.avg_cost_price) / self.avg_cost_price) * 100
        return 0.0

    class Config:
        populate_by_name = True
        json_encoders = {
            Decimal: lambda v: float(v)
        }

class HoldingsResponse(BaseResponse):
    """Response model for holdings endpoint"""
    data: List[Holding] = Field(..., description="List of holdings")

# Positions models
class Position(BaseModel):
    """Individual position item"""
    symbol: str = Field(..., description="Trading symbol")
    qty: float = Field(..., description="Position quantity")
    avg_price: float = Field(..., description="Average entry price")
    pnl: float = Field(..., description="Current P&L")
    
    # Additional fields from Dhan API
    exchange_segment: Optional[str] = Field(None, alias="exchangeSegment", description="Exchange segment")
    product_type: Optional[str] = Field(None, alias="productType", description="Product type (CNC, MIS, etc.)")
    side: Optional[str] = Field(None, description="Position side (LONG/SHORT)")
    
    class Config:
        populate_by_name = True

class PositionsResponse(BaseResponse):
    """Response model for positions endpoint"""
    data: List[Position] = Field(..., description="List of positions")

# Orders models
class Order(BaseModel):
    """Individual order item"""
    order_id: str = Field(..., alias="orderId", description="Unique order identifier")
    symbol: str = Field(..., description="Trading symbol")
    status: str = Field(..., description="Order status")
    price: float = Field(..., description="Order price")
    qty: float = Field(..., description="Order quantity")
    
    # Additional fields from Dhan API
    exchange_order_id: Optional[str] = Field(None, alias="exchangeOrderId", description="Exchange order ID")
    order_type: Optional[str] = Field(None, alias="orderType", description="Order type (MARKET, LIMIT, etc.)")
    product_type: Optional[str] = Field(None, alias="productType", description="Product type")
    transaction_type: Optional[str] = Field(None, alias="transactionType", description="Transaction type (BUY/SELL)")
    create_time: Optional[str] = Field(None, alias="createTime", description="Order creation time")
    
    class Config:
        populate_by_name = True

class OrdersResponse(BaseResponse):
    """Response model for orders endpoint"""
    data: List[Order] = Field(..., description="List of orders")

# Trade History models
class Trade(BaseModel):
    """Individual trade item"""
    dhan_client_id: str = Field(..., alias="dhanClientId", description="Dhan client ID")
    order_id: str = Field(..., alias="orderId", description="Order ID")
    exchange_order_id: str = Field(..., alias="exchangeOrderId", description="Exchange order ID")
    exchange_trade_id: str = Field(..., alias="exchangeTradeId", description="Exchange trade ID")
    transaction_type: str = Field(..., alias="transactionType", description="Transaction type (BUY/SELL)")
    exchange_segment: str = Field(..., alias="exchangeSegment", description="Exchange segment")
    product_type: str = Field(..., alias="productType", description="Product type")
    order_type: str = Field(..., alias="orderType", description="Order type")
    custom_symbol: str = Field(..., alias="customSymbol", description="Trading symbol")
    security_id: str = Field(..., alias="securityId", description="Security ID")
    traded_quantity: int = Field(..., alias="tradedQuantity", description="Traded quantity")
    traded_price: float = Field(..., alias="tradedPrice", description="Traded price")
    isin: str = Field(..., description="ISIN code")
    instrument: str = Field(..., description="Instrument type")
    exchange_time: str = Field(..., alias="exchangeTime", description="Exchange trade time")
    
    # Charges
    sebi_tax: float = Field(..., alias="sebiTax", description="SEBI tax")
    stt: float = Field(..., alias="stt", description="Securities Transaction Tax")
    brokerage_charges: float = Field(..., alias="brokerageCharges", description="Brokerage charges")
    service_tax: float = Field(..., alias="serviceTax", description="Service tax")
    exchange_transaction_charges: float = Field(..., alias="exchangeTransactionCharges", description="Exchange transaction charges")
    stamp_duty: float = Field(..., alias="stampDuty", description="Stamp duty")
    
    class Config:
        populate_by_name = True
        json_encoders = {
            Decimal: lambda v: float(v)
        }

class TradeHistoryResponse(BaseResponse):
    """Response model for trade history endpoint"""
    data: List[Trade] = Field(..., description="List of trades")

# P&L models
class PnLSummary(BaseModel):
    """P&L summary for a symbol or overall portfolio"""
    symbol: str = Field(..., description="Trading symbol")
    total_qty: int = Field(..., description="Total quantity")
    avg_buy_price: float = Field(..., description="Average buy price")
    avg_sell_price: Optional[float] = Field(None, description="Average sell price")
    current_price: float = Field(..., description="Current market price")
    realized_pnl: float = Field(..., description="Realized P&L")
    unrealized_pnl: float = Field(..., description="Unrealized P&L")
    total_pnl: float = Field(..., description="Total P&L")
    pnl_percentage: float = Field(..., description="P&L percentage")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }

class PnLResponse(BaseResponse):
    """Response model for P&L endpoint"""
    data: List[PnLSummary] = Field(..., description="List of P&L summaries")

# Error models
class ErrorDetail(BaseModel):
    """Error detail information"""
    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Error message")
    details: Optional[dict] = Field(None, description="Additional error details")

class ErrorResponse(BaseModel):
    """Standard error response model"""
    status: str = Field("error", description="Response status")
    error: ErrorDetail = Field(..., description="Error details")
    remarks: Optional[str] = Field(None, description="Additional remarks")

# API Response wrapper (consistent with our response utility)
class APIResponse(BaseModel):
    """Standard API response wrapper"""
    ok: bool = Field(..., description="Success status")
    data: Optional[Union[dict, list]] = Field(None, description="Response data")
    error: Optional[ErrorDetail] = Field(None, description="Error details if any")
    trace_id: Optional[str] = Field(None, description="Request trace ID")
