# DTOs (Data Transfer Objects) - Pydantic Models

## Overview
This document describes the Pydantic models used for API request/response validation and data serialization in the Dhan Automation Backend.

## Models Structure

### Base Models

#### `BaseResponse`
Base response model for all API endpoints.
```python
class BaseResponse(BaseModel):
    status: str          # Response status (success/error)
    remarks: Optional[str] # Additional remarks or messages
```

#### `APIResponse`
Standard API response wrapper consistent with our response utility.
```python
class APIResponse(BaseModel):
    ok: bool             # Success status
    data: Optional[Union[dict, list]] # Response data
    error: Optional[ErrorDetail]      # Error details if any
    trace_id: Optional[str]           # Request trace ID
```

### Holdings Models

#### `Holding`
Individual holding/portfolio item with computed properties.
```python
class Holding(BaseModel):
    exchange: str                    # Exchange (NSE, BSE, etc.)
    trading_symbol: str              # Trading symbol (e.g., TATASTEEL)
    security_id: str                 # Security identifier
    isin: str                        # ISIN code
    total_qty: int                   # Total quantity held
    dp_qty: int                      # DP quantity
    t1_qty: int                      # T+1 quantity
    mtf_t1_qty: int                 # MTF T+1 quantity
    mtf_qty: int                     # MTF quantity
    available_qty: int               # Available quantity for trading
    collateral_qty: int              # Collateral quantity
    avg_cost_price: float            # Average cost price
    last_traded_price: float         # Last traded price
    
    # Computed Properties
    market_value: float              # Current market value
    unrealized_pnl: float            # Unrealized P&L
    pnl_percentage: float            # P&L percentage
```

**Computed Properties:**
- `market_value`: `total_qty * last_traded_price`
- `unrealized_pnl`: `(last_traded_price - avg_cost_price) * total_qty`
- `pnl_percentage`: `((last_traded_price - avg_cost_price) / avg_cost_price) * 100`

#### `HoldingsResponse`
Response model for holdings endpoint.
```python
class HoldingsResponse(BaseResponse):
    data: List[Holding]  # List of holdings
```

### Positions Models

#### `Position`
Individual position item.
```python
class Position(BaseModel):
    symbol: str                      # Trading symbol
    qty: float                       # Position quantity
    avg_price: float                 # Average entry price
    pnl: float                       # Current P&L
    exchange_segment: Optional[str]  # Exchange segment
    product_type: Optional[str]      # Product type (CNC, MIS, etc.)
    side: Optional[str]              # Position side (LONG/SHORT)
```

#### `PositionsResponse`
Response model for positions endpoint.
```python
class PositionsResponse(BaseResponse):
    data: List[Position]  # List of positions
```

### Orders Models

#### `Order`
Individual order item.
```python
class Order(BaseModel):
    order_id: str                    # Unique order identifier
    symbol: str                      # Trading symbol
    status: str                      # Order status
    price: float                     # Order price
    qty: float                       # Order quantity
    exchange_order_id: Optional[str] # Exchange order ID
    order_type: Optional[str]        # Order type (MARKET, LIMIT, etc.)
    product_type: Optional[str]      # Product type
    transaction_type: Optional[str]  # Transaction type (BUY/SELL)
    create_time: Optional[str]       # Order creation time
```

#### `OrdersResponse`
Response model for orders endpoint.
```python
class OrdersResponse(BaseResponse):
    data: List[Order]  # List of orders
```

### Trade History Models

#### `Trade`
Individual trade item with comprehensive details.
```python
class Trade(BaseModel):
    dhan_client_id: str              # Dhan client ID
    order_id: str                    # Order ID
    exchange_order_id: str           # Exchange order ID
    exchange_trade_id: str           # Exchange trade ID
    transaction_type: str            # Transaction type (BUY/SELL)
    exchange_segment: str            # Exchange segment
    product_type: str                # Product type
    order_type: str                  # Order type
    custom_symbol: str               # Trading symbol
    security_id: str                 # Security ID
    traded_quantity: int             # Traded quantity
    traded_price: float              # Traded price
    isin: str                        # ISIN code
    instrument: str                  # Instrument type
    exchange_time: str               # Exchange trade time
    
    # Charges
    sebi_tax: float                  # SEBI tax
    stt: float                       # Securities Transaction Tax
    brokerage_charges: float         # Brokerage charges
    service_tax: float               # Service tax
    exchange_transaction_charges: float # Exchange transaction charges
    stamp_duty: float                # Stamp duty
```

#### `TradeHistoryResponse`
Response model for trade history endpoint.
```python
class TradeHistoryResponse(BaseResponse):
    data: List[Trade]  # List of trades
```

### P&L Models

#### `PnLSummary`
P&L summary for a symbol or overall portfolio.
```python
class PnLSummary(BaseModel):
    symbol: str                      # Trading symbol
    total_qty: int                   # Total quantity
    avg_buy_price: float             # Average buy price
    avg_sell_price: Optional[float]  # Average sell price
    current_price: float             # Current market price
    realized_pnl: float              # Realized P&L
    unrealized_pnl: float            # Unrealized P&L
    total_pnl: float                 # Total P&L
    pnl_percentage: float            # P&L percentage
```

#### `PnLResponse`
Response model for P&L endpoint.
```python
class PnLResponse(BaseResponse):
    data: List[PnLSummary]  # List of P&L summaries
```

### Error Models

#### `ErrorDetail`
Error detail information.
```python
class ErrorDetail(BaseModel):
    code: str                        # Error code
    message: str                     # Error message
    details: Optional[dict]          # Additional error details
```

#### `ErrorResponse`
Standard error response model.
```python
class ErrorResponse(BaseModel):
    status: str                      # Response status
    error: ErrorDetail               # Error details
    remarks: Optional[str]           # Additional remarks
```

## Key Features

### 1. **Field Aliases**
All models use field aliases to map between Python snake_case and API camelCase:
- `tradingSymbol` → `trading_symbol`
- `avgCostPrice` → `avg_cost_price`
- `lastTradedPrice` → `last_traded_price`

### 2. **Computed Properties**
The `Holding` model includes computed properties for:
- Market value calculation
- Unrealized P&L calculation
- P&L percentage calculation

### 3. **Type Safety**
- Full type hints for all fields
- Optional fields properly marked
- Union types for flexible data handling

### 4. **Validation**
- Pydantic automatic validation
- Field descriptions for API documentation
- Proper error handling

### 5. **Pydantic V2 Compatibility**
- Uses `populate_by_name = True` (V2 syntax)
- JSON encoders for Decimal handling
- Modern Pydantic configuration

## Usage Examples

### Creating a Holding Model
```python
from app.models.schemas import Holding

holding = Holding(
    exchange="NSE",
    tradingSymbol="TATASTEEL",
    securityId="3499",
    isin="INE081A01020",
    totalQty=3,
    avgCostPrice=158.66,
    lastTradedPrice=161.89
)

# Access computed properties
print(f"Market Value: ₹{holding.market_value:.2f}")
print(f"Unrealized P&L: ₹{holding.unrealized_pnl:.2f}")
print(f"P&L %: {holding.pnl_percentage:.2f}%")
```

### Creating a Trade Model
```python
from app.models.schemas import Trade

trade = Trade(
    dhanClientId="1107860004",
    orderId="10125081318204",
    customSymbol="Vodafone Idea",
    tradedQuantity=1,
    tradedPrice=6.4,
    transactionType="BUY"
)
```

### API Response Wrapper
```python
from app.models.schemas import APIResponse, ErrorDetail

# Success response
success_response = APIResponse(
    ok=True,
    data={"message": "Operation successful"},
    trace_id="uuid-here"
)

# Error response
error_response = APIResponse(
    ok=False,
    error=ErrorDetail(
        code="VALIDATION_ERROR",
        message="Invalid input data"
    ),
    trace_id="uuid-here"
)
```

## Integration with Dhan API

These models are designed to work seamlessly with the real Dhan API data structure we discovered:

1. **Holdings**: Maps directly to `dhan.get_holdings()` response
2. **Positions**: Maps to `dhan.get_positions()` response  
3. **Trade History**: Maps to `dhan.get_trade_history()` response
4. **Orders**: Ready for future order management endpoints
5. **P&L**: Ready for calculated P&L data

## Next Steps

With these DTOs in place, you're ready to:
1. **Create API endpoints** that use these models for validation
2. **Build response serialization** for consistent API responses
3. **Implement data transformation** from Dhan API to our models
4. **Add comprehensive validation** for incoming requests
5. **Generate API documentation** using FastAPI's automatic docs

## Testing

All schemas have been tested with real Dhan API data and verified to work correctly:
- ✅ Holdings data validation
- ✅ Trade history data validation  
- ✅ P&L summary creation
- ✅ Response wrapper models
- ✅ No Pydantic V2 warnings
