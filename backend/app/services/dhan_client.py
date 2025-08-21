import asyncio
import random
import time
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Callable
from threading import Thread, Lock
import uuid
from enum import Enum
import structlog
from dateutil import tz

from app.utils.logger import logger
from app.models.schemas import (
    Holding, Position, Order, Trade, PnL, PnLTotals, PnLSymbol,
    Side, OrderType, OrderStatus, ErrorCode
)
from app.utils.response import (
    unauthorized_error, timeout_error, rate_limit_error, 
    upstream_error, validation_error, position_not_open_error,
    order_rejected_error, zero_qty_error, ltp_stale_error
)
from app.settings import settings

# Mock data state
class MockDataState:
    def __init__(self):
        self.lock = Lock()
        self.holdings: List[Holding] = []
        self.positions: List[Position] = []
        self.orders: List[Order] = []
        self.trades: List[Trade] = []
        self.ltp_cache: Dict[str, float] = {}
        self.last_ltp_update = 0
        self.pnl_update_callbacks: List[callable] = []
        
        # Initialize mock data
        self._initialize_mock_data()
        
        # Start LTP update thread
        self._start_ltp_updater()
    
    def add_pnl_update_callback(self, callback: callable):
        """Add callback to be called when PnL should be recalculated"""
        self.pnl_update_callbacks.append(callback)
    
    def _trigger_pnl_update(self):
        """Trigger PnL update callbacks"""
        for callback in self.pnl_update_callbacks:
            try:
                callback()
            except Exception as e:
                logger.error(f"Error in PnL update callback: {e}")
    
    def _initialize_mock_data(self):
        """Initialize realistic mock data"""
        logger.info("Initializing mock data...")
        
        # Generate mock holdings
        for i, symbol in enumerate(settings.MOCK_SYMBOLS):
            isin = f"INE000{i:06d}A"
            qty = random.randint(100, 5000)
            avg_price = random.uniform(100, 2000)
            ltp = avg_price * random.uniform(0.8, 1.2)
            value = qty * ltp
            day_change = value * random.uniform(-0.05, 0.05)
            
            holding = Holding(
                isin=isin,
                symbol=symbol,
                qty=qty,
                avg_price=round(avg_price, 2),
                ltp=round(ltp, 2),
                value=round(value, 2),
                day_change=round(day_change, 2)
            )
            self.holdings.append(holding)
            self.ltp_cache[symbol] = ltp
            logger.info(f"Created mock holding for {symbol}: qty={qty}, avg_price={avg_price}, ltp={ltp}")
        
        logger.info(f"Created {len(self.holdings)} mock holdings")
        
        # Generate mock positions
        for i, symbol in enumerate(settings.MOCK_SYMBOLS[:5]):  # Only first 5 have positions
            position = Position(
                id=f"pos_{i+1:03d}",
                symbol=symbol,
                side=Side.LONG if i % 2 == 0 else Side.SHORT,
                qty=random.randint(100, 2000),
                avg_price=round(random.uniform(100, 2000), 2),
                ltp=self.ltp_cache[symbol],
                unrealized=0.0  # Will be calculated
            )
            self.positions.append(position)
            logger.info(f"Created mock position for {symbol}: id={position.id}, qty={position.qty}, avg_price={position.avg_price}")
        
        logger.info(f"Created {len(self.positions)} mock positions")
        
        # Generate mock orders
        for i in range(10):
            symbol = random.choice(settings.MOCK_SYMBOLS)
            order = Order(
                order_id=f"ord_{i+1:06d}",
                symbol=symbol,
                side=Side.LONG if i % 2 == 0 else Side.SHORT,
                type=random.choice(list(OrderType)),
                price=round(random.uniform(100, 2000), 2),
                qty=random.randint(100, 1000),
                filled_qty=random.randint(0, 1000),
                status=random.choice(list(OrderStatus)),
                placed_at=datetime.now() - timedelta(hours=random.randint(1, 24))
            )
            self.orders.append(order)
        
        logger.info(f"Created {len(self.orders)} mock orders")
        
        # Generate mock trades
        for i in range(20):
            symbol = random.choice(settings.MOCK_SYMBOLS)
            trade = Trade(
                trade_id=f"trd_{i+1:06d}",
                order_id=f"ord_{(i % 10) + 1:06d}",
                symbol=symbol,
                side=Side.LONG if i % 2 == 0 else Side.SHORT,
                price=round(random.uniform(100, 2000), 2),
                qty=random.randint(100, 1000),
                time=datetime.now() - timedelta(days=random.randint(1, 7))
            )
            self.trades.append(trade)
        
        logger.info(f"Created {len(self.trades)} mock trades")
        logger.info("Mock data initialization completed successfully")
    
    def _start_ltp_updater(self):
        """Start background thread to update LTP values"""
        def update_ltp():
            while True:
                try:
                    time.sleep(settings.MOCK_LTP_UPDATE_INTERVAL)
                    self._update_ltp_values()
                except Exception as e:
                    logger.error(f"Error in LTP updater: {e}")
        
        thread = Thread(target=update_ltp, daemon=True)
        thread.start()
    
    def _update_ltp_values(self):
        """Update LTP values with realistic price movements"""
        with self.lock:
            current_time = time.time()
            if current_time - self.last_ltp_update < settings.MOCK_LTP_UPDATE_INTERVAL:
                return
            
            self.last_ltp_update = current_time
            
            for symbol in self.ltp_cache:
                current_ltp = self.ltp_cache[symbol]
                # Random price movement between -2% and +2%
                change_pct = random.uniform(-0.02, 0.02)
                new_ltp = current_ltp * (1 + change_pct)
                self.ltp_cache[symbol] = round(new_ltp, 2)
                
                # Update holdings
                for holding in self.holdings:
                    if holding.symbol == symbol:
                        old_value = holding.value
                        holding.ltp = new_ltp
                        holding.value = holding.qty * new_ltp
                        holding.day_change = holding.value - old_value
                        break
                
                # Update positions
                for position in self.positions:
                    if position.symbol == symbol:
                        position.ltp = new_ltp
                        if position.side == Side.LONG:
                            position.unrealized = (new_ltp - position.avg_price) * position.qty
                        else:
                            position.unrealized = (position.avg_price - new_ltp) * position.qty
                        break
                
                # Trigger PnL recalculation after LTP updates
                self._trigger_pnl_update()

    def get_ltp(self, symbol: str) -> float:
        """Get LTP for a specific symbol from cache"""
        return self.ltp_cache.get(symbol, 0.0)

# Global mock state
mock_state = MockDataState()

class CircuitBreakerState(str, Enum):
    CLOSED = "CLOSED"      # Normal operation
    OPEN = "OPEN"          # Circuit is open, reject requests
    HALF_OPEN = "HALF_OPEN"  # Testing if service is back

class DhanClient:
    """Dhan client wrapper with real/mock capabilities"""
    
    def __init__(self):
        self.dhan = None
        self.use_mock = settings.USE_MOCK_DATA
        
        if not self.use_mock:
            self._initialize_real_client()
        
        # Register PnL update callback for mock data
        if self.use_mock:
            mock_state.add_pnl_update_callback(self._on_pnl_update_triggered)
        
        # Circuit breaker configuration
        self.circuit_breaker_state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.circuit_breaker_threshold = 5  # Failures before opening circuit
        self.circuit_breaker_timeout = 60   # Seconds to wait before half-open
        self.last_failure_time = None
        self.next_attempt_time = None
        
        # Performance tracking
        self.last_api_call = None
        self.api_call_count = 0
        self.error_count = 0

    def _on_pnl_update_triggered(self):
        """Callback triggered when PnL should be recalculated"""
        logger.debug("PnL update triggered - will recalculate on next fetch")
    
    def _initialize_real_client(self):
        """Initialize real Dhan client"""
        try:
            from dhanhq import dhanhq
            self.dhan = dhanhq(settings.DHAN_CLIENT_ID, settings.DHAN_ACCESS_TOKEN)
            logger.info("Real Dhan client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize real Dhan client: {e}")
            logger.info("Falling back to mock data")
            self.use_mock = True
    
    async def _execute_with_circuit_breaker(self, operation: Callable, *args, **kwargs):
        """Execute operation with circuit breaker protection"""
        if self.circuit_breaker_state == CircuitBreakerState.OPEN:
            if self.next_attempt_time and datetime.now() < self.next_attempt_time:
                raise Exception(f"Circuit breaker is OPEN. Next attempt at {self.next_attempt_time}")
            else:
                # Time to test if service is back
                self.circuit_breaker_state = CircuitBreakerState.HALF_OPEN
                logger.info("Circuit breaker transitioning to HALF_OPEN state")
        
        try:
            self.last_api_call = datetime.now()
            self.api_call_count += 1
            
            result = await operation(*args, **kwargs)
            
            # Success - close circuit if it was half-open
            if self.circuit_breaker_state == CircuitBreakerState.HALF_OPEN:
                self.circuit_breaker_state = CircuitBreakerState.CLOSED
                self.failure_count = 0
                logger.info("Circuit breaker closed after successful operation")
            
            return result
            
        except Exception as e:
            self.error_count += 1
            self.last_failure_time = datetime.now()
            self.failure_count += 1
            
            logger.warning(f"Operation failed: {e}. Failure count: {self.failure_count}")
            
            # Check if we should open the circuit
            if self.failure_count >= self.circuit_breaker_threshold:
                self.circuit_breaker_state = CircuitBreakerState.OPEN
                self.next_attempt_time = datetime.now() + timedelta(seconds=self.circuit_breaker_timeout)
                logger.error(f"Circuit breaker OPENED after {self.failure_count} failures. Next attempt at {self.next_attempt_time}")
            
            raise e

    async def fetch_holdings_async(self) -> List[Holding]:
        """Fetch holdings asynchronously with circuit breaker protection"""
        return await self._execute_with_circuit_breaker(self._fetch_holdings_internal)

    async def _fetch_holdings_internal(self) -> List[Holding]:
        """Internal holdings fetch implementation"""
        if self.use_mock:
            await asyncio.sleep(0.1)  # Simulate API delay
            return mock_state.holdings
        else:
            # Real Dhan API implementation would go here
            raise NotImplementedError("Real Dhan API not implemented yet")
    
    async def fetch_positions_async(self) -> List[Position]:
        """Fetch positions asynchronously with circuit breaker protection"""
        return await self._execute_with_circuit_breaker(self._fetch_positions_internal)

    async def _fetch_positions_internal(self) -> List[Position]:
        """Internal positions fetch implementation"""
        if self.use_mock:
            await asyncio.sleep(0.1)  # Simulate API delay
            return mock_state.positions
        else:
            # Real Dhan API implementation would go here
            raise NotImplementedError("Real Dhan API not implemented yet")
    
    async def fetch_orders_async(self, status: Optional[str] = None) -> List[Order]:
        """Fetch orders asynchronously with circuit breaker protection"""
        return await self._execute_with_circuit_breaker(self._fetch_orders_internal, status)

    async def _fetch_orders_internal(self, status: Optional[str] = None) -> List[Order]:
        """Internal orders fetch implementation"""
        if self.use_mock:
            await asyncio.sleep(0.1)  # Simulate API delay
            orders = mock_state.orders
            if status:
                orders = [order for order in orders if order.status == status.upper()]
            return orders
        else:
            # Real Dhan API implementation would go here
            raise NotImplementedError("Real Dhan API not implemented yet")
    
    async def fetch_trades_async(self, from_date: Optional[str] = None, to_date: Optional[str] = None) -> List[Trade]:
        """Fetch trades asynchronously with circuit breaker protection"""
        return await self._execute_with_circuit_breaker(self._fetch_trades_internal, from_date, to_date)

    async def _fetch_trades_internal(self, from_date: Optional[str] = None, to_date: Optional[str] = None) -> List[Trade]:
        """Internal trades fetch implementation"""
        if self.use_mock:
            await asyncio.sleep(0.1)  # Simulate API delay
            return mock_state.trades
        else:
            # Real Dhan API implementation would go here
            raise NotImplementedError("Real Dhan API not implemented yet")
    
    async def fetch_ltp_async(self, symbols: List[str]) -> Dict[str, float]:
        """Fetch LTP asynchronously with circuit breaker protection"""
        return await self._execute_with_circuit_breaker(self._fetch_ltp_internal, symbols)

    async def _fetch_ltp_internal(self, symbols: List[str]) -> Dict[str, float]:
        """Internal LTP fetch implementation"""
        if self.use_mock:
            await asyncio.sleep(0.05)  # Simulate API delay
            return {symbol: mock_state.get_ltp(symbol) for symbol in symbols}
        else:
            # Real Dhan API implementation would go here
            raise NotImplementedError("Real Dhan API not implemented yet")
    
    def squareoff(self, position_id: str) -> Dict[str, Any]:
        """Square off a position"""
        if self.use_mock:
            return self._squareoff_mock(position_id)
        else:
            return self._squareoff_real(position_id)
    
    async def squareoff_async(self, position_id: str) -> Dict[str, Any]:
        """Async version of squareoff"""
        return await self._execute_with_circuit_breaker(self._squareoff_position_internal, position_id)

    async def _squareoff_position_internal(self, position_id: str) -> Dict[str, Any]:
        """Internal square-off implementation"""
        try:
            logger.info(f"Square-off request for position {position_id}")
            if self.use_mock:
                await asyncio.sleep(0.5)  # Simulate processing time
                order_id = f"SO_{position_id}_{int(time.time())}"
                return {
                    "order_id": order_id,
                    "status": "executed",
                    "position_id": position_id,
                    "quantity": 0, # Mock squareoff doesn't specify quantity
                    "execution_time": datetime.now().isoformat()
                }
            else:
                # Real Dhan API implementation would go here
                raise NotImplementedError("Real Dhan API not implemented yet")
        except Exception as e:
            logger.error(f"Error in square-off: {e}")
            return None

    async def squareoff_all_positions_async(self, confirm: bool = False):
        """Square off all positions asynchronously with circuit breaker protection"""
        return await self._execute_with_circuit_breaker(self._squareoff_all_positions_internal, confirm)

    async def _squareoff_all_positions_internal(self, confirm: bool = False):
        """Internal bulk square-off implementation"""
        try:
            if not confirm:
                raise ValueError("Confirmation required for bulk square-off")
            
            logger.info("Bulk square-off request for all positions")
            if self.use_mock:
                await asyncio.sleep(1.0)  # Simulate processing time
                orders = []
                for position in mock_state.positions:
                    order_id = f"SO_BULK_{position.id}_{int(time.time())}"
                    orders.append({
                        "order_id": order_id,
                        "status": "executed",
                        "position_id": position.id,
                        "quantity": position.qty,
                        "execution_time": datetime.now().isoformat()
                    })
                
                return {
                    "status": "completed",
                    "orders_executed": len(orders),
                    "orders": orders
                }
            else:
                # Real Dhan API implementation would go here
                raise NotImplementedError("Real Dhan API not implemented yet")
        except Exception as e:
            logger.error(f"Error in bulk square-off: {e}")
            return None

    async def place_order_async(self, order_data: dict):
        """Place a new order asynchronously with circuit breaker protection"""
        return await self._execute_with_circuit_breaker(self._place_order_internal, order_data)

    async def _place_order_internal(self, order_data: dict):
        """Internal order placement implementation"""
        try:
            logger.info(f"Order placement request: {order_data}")
            if self.use_mock:
                await asyncio.sleep(0.8)  # Simulate processing time
                order_id = f"ORD_{int(time.time())}"
                return {
                    "order_id": order_id,
                    "status": "placed",
                    "symbol": order_data["symbol"],
                    "side": order_data["side"],
                    "type": order_data["type"],
                    "quantity": order_data["quantity"],
                    "price": order_data.get("price", 0),
                    "placed_at": datetime.now().isoformat(),
                    "filled_qty": 0
                }
            else:
                # Real Dhan API implementation would go here
                raise NotImplementedError("Real Dhan API not implemented yet")
        except Exception as e:
            logger.error(f"Error placing order: {e}")
            return None

    async def modify_order_async(self, order_id: str, modify_data: dict):
        """Modify an existing order asynchronously with circuit breaker protection"""
        return await self._execute_with_circuit_breaker(self._modify_order_internal, order_id, modify_data)

    async def _modify_order_internal(self, order_id: str, modify_data: dict):
        """Internal order modification implementation"""
        try:
            logger.info(f"Order modification request for {order_id}: {modify_data}")
            if self.use_mock:
                await asyncio.sleep(0.6)  # Simulate processing time
                return {
                    "order_id": order_id,
                    "status": "modified",
                    "modifications": modify_data,
                    "modified_at": datetime.now().isoformat()
                }
            else:
                # Real Dhan API implementation would go here
                raise NotImplementedError("Real Dhan API not implemented yet")
        except Exception as e:
            logger.error(f"Error modifying order: {e}")
            return None

    async def cancel_order_async(self, order_id: str):
        """Cancel an existing order asynchronously with circuit breaker protection"""
        return await self._execute_with_circuit_breaker(self._cancel_order_internal, order_id)

    async def _cancel_order_internal(self, order_id: str):
        """Internal order cancellation implementation"""
        try:
            logger.info(f"Order cancellation request for {order_id}")
            if self.use_mock:
                await asyncio.sleep(0.3)  # Simulate processing time
                logger.info(f"Mock order cancelled: {order_id}")
                return {
                    "order_id": order_id,
                    "status": "cancelled",
                    "cancelled_at": datetime.now().isoformat()
                }
            else:
                # Real Dhan API implementation would go here
                raise NotImplementedError("Real Dhan API not implemented yet")
        except Exception as e:
            logger.error(f"Error cancelling order: {e}")
            return None

    def get_pnl(self):
        """Calculate accurate P&L with exchange-day boundaries and consistency checks"""
        try:
            logger.info("Starting accurate P&L calculation")
            positions = self.fetch_positions()
            logger.info(f"Fetched {len(positions)} positions")
            
            # Get current IST time for exchange-day boundaries
            from datetime import timezone, timedelta
            ist = timezone(timedelta(hours=5, minutes=30))  # IST = UTC+5:30
            now_ist = datetime.now(ist)
            
            # Determine trading day (IST date)
            trading_day = now_ist.strftime('%Y-%m-%d')
            
            # Calculate per symbol P&L with proper formulas
            per_symbol = []
            total_unrealized = 0.0
            total_realized = 0.0
            total_day_pnl = 0.0
            
            for position in positions:
                try:
                    # Calculate unrealized P&L: signedQty × (LTP - avg_price)
                    signed_qty = position.qty if position.side == Side.LONG else -position.qty
                    unrealized = signed_qty * (position.ltp - position.avg_price)
                    
                    # Round to 2 decimal places (INR currency)
                    unrealized = round(unrealized, 2)
                    
                    # For now, calculate day PnL as unrealized (in real implementation, 
                    # this would be the change since market open)
                    today_pnl = unrealized
                    
                    # Update totals
                    total_unrealized += unrealized
                    total_day_pnl += today_pnl
                    
                    symbol_pnl = PnLSymbol(
                        symbol=position.symbol,
                        side=position.side,
                        qty=position.qty,
                        avg=round(position.avg_price, 2),
                        ltp=round(position.ltp, 2),
                        unrealized=unrealized,
                        today_pnl=today_pnl
                    )
                    per_symbol.append(symbol_pnl)
                    logger.debug(f"Created PnL for {position.symbol}: unrealized={unrealized}, today={today_pnl}")
                    
                except Exception as e:
                    logger.error(f"Failed to create PnL for {position.symbol}: {e}")
                    continue
            
            # Round totals to 2 decimal places
            total_unrealized = round(total_unrealized, 2)
            total_realized = round(total_realized, 2)
            total_day_pnl = round(total_day_pnl, 2)
            
            logger.info(f"Calculated totals - realized: {total_realized}, unrealized: {total_unrealized}, day: {total_day_pnl}")
            
            # Consistency check: Σ(perSymbol.unrealized) ≈ totals.unrealized within ₹0.05
            per_symbol_unrealized_sum = round(sum(symbol.unrealized for symbol in per_symbol), 2)
            drift = abs(per_symbol_unrealized_sum - total_unrealized)
            
            if drift > 0.05:
                logger.warning(f"pnl.drift: Σ(perSymbol.unrealized)={per_symbol_unrealized_sum} != totals.unrealized={total_unrealized}, drift=₹{drift:.2f}")
            else:
                logger.debug(f"PnL consistency check passed: drift=₹{drift:.2f}")
            
            # Create PnLTotals with proper formatting
            try:
                logger.debug("Creating PnLTotals...")
                totals = PnLTotals(
                    realized=total_realized,
                    unrealized=total_unrealized,
                    day=total_day_pnl,
                    currency="INR"
                )
                logger.debug("PnLTotals created successfully")
            except Exception as e:
                logger.error(f"Failed to create PnLTotals: {e}")
                import traceback
                logger.error(f"PnLTotals traceback: {traceback.format_exc()}")
                return None
            
            # Create final PnL model
            try:
                logger.debug("Creating PnL model...")
                logger.debug(f"Model fields: totals={type(totals)}, perSymbol={len(per_symbol)}, updated_at={now_ist}, trading_day={trading_day}")
                
                pnl = PnL(
                    totals=totals,
                    perSymbol=per_symbol,
                    updatedAt=now_ist,
                    tradingDay=trading_day
                )
                
                logger.debug(f"Created PnL model: {pnl}")
                logger.debug(f"PnL model fields: {pnl.__dict__}")
                
                logger.info(f"P&L calculation completed successfully: {len(per_symbol)} symbols, unrealized=₹{total_unrealized:.2f}")
                return pnl
            except Exception as e:
                logger.error(f"Failed to create PnL model: {e}")
                import traceback
                logger.error(f"PnL model traceback: {traceback.format_exc()}")
                return None
            
        except Exception as e:
            logger.error(f"Failed to calculate P&L: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return None
    
    async def get_pnl_async(self):
        """Async version of get_pnl"""
        return await self._execute_with_circuit_breaker(self._get_pnl_internal)

    async def _get_pnl_internal(self) -> PnL:
        """Internal PnL calculation implementation"""
        return self.get_pnl()
    
    def recalculate_pnl(self):
        """Recalculate PnL and return updated data - triggers on position/LTP changes"""
        logger.info("Triggering PnL recalculation due to position/LTP changes")
        return self.get_pnl()
    
    async def recalculate_pnl_async(self):
        """Async version of recalculate_pnl"""
        return await self._execute_with_circuit_breaker(self._recalculate_pnl_internal)

    async def _recalculate_pnl_internal(self) -> PnL:
        """Internal PnL recalculation implementation"""
        return self.recalculate_pnl()

    # New Trading Methods
    async def get_position_risk_metrics(self, position_id: str):
        """Get risk metrics for a specific position asynchronously with circuit breaker protection"""
        return await self._execute_with_circuit_breaker(self._get_position_risk_metrics_internal, position_id)

    async def _get_position_risk_metrics_internal(self, position_id: str):
        """Internal risk metrics implementation"""
        try:
            logger.info(f"Risk metrics request for position {position_id}")
            if self.use_mock:
                await asyncio.sleep(0.2)  # Simulate processing time
                
                # Find the position
                position = next((p for p in mock_state.positions if p.id == position_id), None)
                if not position:
                    return None
                
                # Calculate risk metrics
                notional_value = position.qty * position.ltp
                unrealized_pnl = position.qty * (position.ltp - position.avg_price) if position.side == Side.LONG else position.qty * (position.avg_price - position.ltp)
                
                risk_metrics = {
                    "position_id": position_id,
                    "symbol": position.symbol,
                    "notional_value": round(notional_value, 2),
                    "unrealized_pnl": round(unrealized_pnl, 2),
                    "risk_percentage": round(abs(unrealized_pnl) / notional_value * 100, 2) if notional_value > 0 else 0,
                    "concentration_risk": "LOW" if notional_value < 100000 else "MEDIUM" if notional_value < 500000 else "HIGH",
                    "volatility_risk": "LOW",  # Mock data
                    "liquidity_risk": "LOW",  # Mock data
                    "recommendations": [
                        "Position size is within acceptable limits",
                        "Consider setting stop-loss orders",
                        "Monitor market volatility"
                    ]
                }
                
                return risk_metrics
            else:
                # Real Dhan API implementation would go here
                raise NotImplementedError("Real Dhan API not implemented yet")
        except Exception as e:
            logger.error(f"Error getting risk metrics: {e}")
            return None

    async def _start_ltp_updates(self):
        """Start LTP updates for mock data"""
        while True:
            try:
                await asyncio.sleep(2)  # Update every 2 seconds
                mock_state._update_ltp_cache()
                
                # Trigger PnL recalculation
                if hasattr(mock_state, 'pnl_update_callbacks'):
                    for callback in mock_state.pnl_update_callbacks:
                        try:
                            callback()
                        except Exception as e:
                            logger.error(f"Error in PnL update callback: {e}")
                            
            except Exception as e:
                logger.error(f"Error in LTP update loop: {e}")
                await asyncio.sleep(5)  # Wait longer on error

# Global client instance
dhan_client = DhanClient()

# Legacy functions for backward compatibility
def get_holdings():
    """Legacy function - use dhan_client.fetch_holdings() instead"""
    try:
        return dhan_client.fetch_holdings()
    except Exception as e:
        logger.error(f"Failed to fetch holdings: {e}")
        return []

def get_positions():
    """Legacy function - use dhan_client.fetch_positions() instead"""
    try:
        return dhan_client.fetch_positions()
    except Exception as e:
        logger.error(f"Failed to fetch positions: {e}")
        return []

def get_orders():
    """Legacy function - use dhan_client.fetch_orders() instead"""
    try:
        return dhan_client.fetch_orders()
    except Exception as e:
        logger.error(f"Failed to fetch orders: {e}")
        return []

def get_trade_history(from_date: str = None, to_date: str = None):
    """Legacy function - use dhan_client.fetch_trades() instead"""
    try:
        if not from_date or not to_date:
            from datetime import datetime, timedelta
            today = datetime.now()
            week_ago = today - timedelta(days=7)
            from_date = week_ago.strftime('%Y-%m-%d')
            to_date = today.strftime('%Y-%m-%d')
        return dhan_client.fetch_trades(from_date, to_date)
    except Exception as e:
        logger.error(f"Failed to fetch trade history: {e}")
        return []

def get_pnl():
    """Legacy function - use dhan_client.get_pnl() instead"""
    try:
        return dhan_client.get_pnl()
    except Exception as e:
        logger.error(f"Failed to calculate P&L: {e}")
        return None
