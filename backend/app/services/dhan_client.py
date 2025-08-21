import asyncio
import random
import time
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from threading import Thread, Lock
import uuid

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
        
        # Initialize mock data
        self._initialize_mock_data()
        
        # Start LTP update thread
        self._start_ltp_updater()
    
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

# Global mock state
mock_state = MockDataState()

class DhanClient:
    """Dhan client wrapper with real/mock capabilities"""
    
    def __init__(self):
        self.dhan = None
        self.use_mock = settings.USE_MOCK_DATA
        
        if not self.use_mock:
            self._initialize_real_client()
    
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
    
    def fetch_holdings(self) -> List[Holding]:
        """Fetch holdings from Dhan API or mock data"""
        if self.use_mock:
            return self._fetch_mock_holdings()
        else:
            return self._fetch_real_holdings()
    
    async def fetch_holdings_async(self) -> List[Holding]:
        """Async version of fetch_holdings"""
        return self.fetch_holdings()
    
    def _fetch_mock_holdings(self) -> List[Holding]:
        """Fetch mock holdings"""
        with mock_state.lock:
            return mock_state.holdings.copy()
    
    def _fetch_real_holdings(self) -> List[Holding]:
        """Fetch real holdings from Dhan API"""
        try:
            if not self.dhan:
                raise Exception("Dhan client not initialized")
            
            result = self.dhan.get_holdings()
            
            if not result or 'data' not in result:
                raise Exception("Invalid response from Dhan API")
            
            holdings = []
            for item in result.get('data', []):
                try:
                    holding = Holding(
                        isin=item.get('isin', ''),
                        symbol=item.get('tradingSymbol', ''),
                        qty=item.get('totalQty', 0),
                        avg_price=float(item.get('avgCostPrice', 0)),
                        ltp=float(item.get('lastTradedPrice', 0)),
                        value=float(item.get('lastTradedPrice', 0)) * int(item.get('totalQty', 0)),
                        day_change=0.0  # Calculate from real data if available
                    )
                    holdings.append(holding)
                except Exception as e:
                    logger.warning(f"Failed to parse holding item: {e}")
                    continue
            
            return holdings
            
        except Exception as e:
            logger.error(f"Failed to fetch real holdings: {e}")
            raise
    
    def fetch_positions(self) -> List[Position]:
        """Fetch positions from Dhan API or mock data"""
        if self.use_mock:
            return self._fetch_mock_positions()
        else:
            return self._fetch_real_positions()
    
    async def fetch_positions_async(self) -> List[Position]:
        """Async version of fetch_positions"""
        return self.fetch_positions()
    
    def _fetch_mock_positions(self) -> List[Position]:
        """Fetch mock positions"""
        with mock_state.lock:
            return mock_state.positions.copy()
    
    def _fetch_real_positions(self) -> List[Position]:
        """Fetch real positions from Dhan API"""
        try:
            if not self.dhan:
                raise Exception("Dhan client not initialized")
            
            result = self.dhan.get_positions()
            
            if not result or 'data' not in result:
                raise Exception("Invalid response from Dhan API")
            
            positions = []
            for item in result.get('data', []):
                try:
                    net_qty = int(item.get('netQty', 0))
                    if net_qty == 0:
                        continue  # Skip closed positions
                    
                    side = Side.LONG if net_qty > 0 else Side.SHORT
                    qty = abs(net_qty)
                    
                    position = Position(
                        id=str(item.get('id', '')),
                        symbol=item.get('tradingSymbol', ''),
                        side=side,
                        qty=qty,
                        avg_price=float(item.get('avgPrice', 0)),
                        ltp=float(item.get('ltp', 0)),
                        unrealized=float(item.get('unrealizedPnl', 0))
                    )
                    positions.append(position)
                except Exception as e:
                    logger.warning(f"Failed to parse position item: {e}")
                    continue
            
            return positions
            
        except Exception as e:
            logger.error(f"Failed to fetch real positions: {e}")
            raise
    
    def fetch_orders(self, status: Optional[str] = None) -> List[Order]:
        """Fetch orders from Dhan API or mock data"""
        if self.use_mock:
            return self._fetch_mock_orders(status)
        else:
            return self._fetch_real_orders(status)
    
    async def fetch_orders_async(self, status: Optional[str] = None) -> List[Order]:
        """Async version of fetch_orders"""
        return self.fetch_orders(status)
    
    def _fetch_mock_orders(self, status: Optional[str] = None) -> List[Order]:
        """Fetch mock orders"""
        with mock_state.lock:
            orders = mock_state.orders.copy()
            if status:
                return [order for order in orders if order.status.value == status]
            return orders
    
    def _fetch_real_orders(self, status: Optional[str] = None) -> List[Order]:
        """Fetch real orders from Dhan API"""
        try:
            if not self.dhan:
                raise Exception("Dhan client not initialized")
            
            # Note: Implement based on actual Dhan API
            # This is a placeholder
            logger.warning("Real orders endpoint not implemented - returning empty list")
            return []
            
        except Exception as e:
            logger.error(f"Failed to fetch real orders: {e}")
            raise
    
    def fetch_trades(self, from_date: str, to_date: str) -> List[Trade]:
        """Fetch trades from Dhan API or mock data"""
        if self.use_mock:
            return self._fetch_mock_trades(from_date, to_date)
        else:
            return self._fetch_real_trades(from_date, to_date)
    
    async def fetch_trades_async(self, from_date: str = None, to_date: str = None) -> List[Trade]:
        """Async version of fetch_trades"""
        return self.fetch_trades(from_date, to_date)
    
    def _fetch_mock_trades(self, from_date: str, to_date: str) -> List[Trade]:
        """Fetch mock trades"""
        with mock_state.lock:
            return mock_state.trades.copy()
    
    def _fetch_real_trades(self, from_date: str, to_date: str) -> List[Trade]:
        """Fetch real trades from Dhan API"""
        try:
            if not self.dhan:
                raise Exception("Dhan client not initialized")
            
            result = self.dhan.get_trade_history(from_date, to_date)
            
            if not result or 'data' not in result:
                raise Exception("Invalid response from Dhan API")
            
            trades = []
            for item in result.get('data', []):
                try:
                    side = Side.LONG if item.get('transactionType') == 'BUY' else Side.SHORT
                    
                    trade = Trade(
                        trade_id=str(item.get('exchangeTradeId', '')),
                        order_id=str(item.get('orderId', '')),
                        symbol=item.get('customSymbol', ''),
                        side=side,
                        price=float(item.get('tradedPrice', 0)),
                        qty=int(item.get('tradedQuantity', 0)),
                        time=datetime.fromisoformat(item.get('exchangeTime', ''))
                    )
                    trades.append(trade)
                except Exception as e:
                    logger.warning(f"Failed to parse trade item: {e}")
                    continue
            
            return trades
            
        except Exception as e:
            logger.error(f"Failed to fetch real trades: {e}")
            raise
    
    def fetch_ltp(self, symbols: List[str]) -> Dict[str, float]:
        """Fetch LTP for symbols from Dhan API or mock data"""
        if self.use_mock:
            return self._fetch_mock_ltp(symbols)
        else:
            return self._fetch_real_ltp(symbols)
    
    async def fetch_ltp_async(self, symbols: List[str]) -> Dict[str, float]:
        """Async version of fetch_ltp"""
        return self.fetch_ltp(symbols)
    
    def _fetch_mock_ltp(self, symbols: List[str]) -> Dict[str, float]:
        """Fetch mock LTP values"""
        with mock_state.lock:
            return {symbol: mock_state.ltp_cache.get(symbol, 0.0) for symbol in symbols}
    
    def _fetch_real_ltp(self, symbols: List[str]) -> Dict[str, float]:
        """Fetch real LTP values from Dhan API"""
        try:
            if not self.dhan:
                raise Exception("Dhan client not initialized")
            
            # Note: Implement based on actual Dhan API
            # This is a placeholder
            logger.warning("Real LTP endpoint not implemented - returning empty dict")
            return {}
            
        except Exception as e:
            logger.error(f"Failed to fetch real LTP: {e}")
            raise
    
    def squareoff(self, position_id: str) -> Dict[str, Any]:
        """Square off a position"""
        if self.use_mock:
            return self._squareoff_mock(position_id)
        else:
            return self._squareoff_real(position_id)
    
    async def squareoff_async(self, position_id: str) -> Dict[str, Any]:
        """Async version of squareoff"""
        return self.squareoff(position_id)
    
    def _squareoff_mock(self, position_id: str) -> Dict[str, Any]:
        """Square off mock position"""
        with mock_state.lock:
            position = next((p for p in mock_state.positions if p.id == position_id), None)
            if not position:
                raise ValueError(f"Position {position_id} not found")
            
            if position.qty == 0:
                raise ValueError(f"Position {position_id} has zero quantity")
            
            # Remove position
            mock_state.positions.remove(position)
            
            return {
                "status": "success",
                "message": f"Position {position_id} squared off successfully",
                "position_id": position_id,
                "symbol": position.symbol,
                "quantity": position.qty,
                "side": position.side.value,
                "timestamp": datetime.now().isoformat()
            }
    
    def _squareoff_real(self, position_id: str) -> Dict[str, Any]:
        """Square off real position through Dhan API"""
        try:
            if not self.dhan:
                raise Exception("Dhan client not initialized")
            
            # Note: Implement based on actual Dhan API
            # This is a placeholder
            logger.warning("Real squareoff endpoint not implemented")
            raise Exception("Real squareoff not implemented")
            
        except Exception as e:
            logger.error(f"Failed to square off real position: {e}")
            raise
    
    def get_pnl(self):
        """Calculate P&L from positions and holdings"""
        try:
            logger.info("Starting P&L calculation")
            positions = self.fetch_positions()
            logger.info(f"Fetched {len(positions)} positions")
            holdings = self.fetch_holdings()
            logger.info(f"Fetched {len(holdings)} holdings")
            
            # Calculate totals
            realized = 0.0  # Would need trade history for this
            unrealized = sum(pos.unrealized for pos in positions)
            day = 0.0  # Would need historical data for this
            
            logger.info(f"Calculated totals - realized: {realized}, unrealized: {unrealized}, day: {day}")
            
            # Calculate per symbol P&L
            per_symbol = []
            for position in positions:
                try:
                    symbol_pnl = PnLSymbol(
                        symbol=position.symbol,
                        side=position.side,
                        qty=position.qty,
                        avg=position.avg_price,
                        ltp=position.ltp,
                        unrealized=position.unrealized,
                        today_pnl=0.0  # Would need historical data for this
                    )
                    per_symbol.append(symbol_pnl)
                    logger.info(f"Created PnL for {position.symbol}")
                except Exception as e:
                    logger.error(f"Failed to create PnL for {position.symbol}: {e}")
                    continue
            
            logger.info(f"Created {len(per_symbol)} symbol P&L entries")
            
            # Test creating PnLTotals first
            try:
                logger.info("Creating PnLTotals...")
                totals = PnLTotals(
                    realized=realized,
                    unrealized=unrealized,
                    day=day,
                    currency="INR",
                    updated_at=datetime.now(),
                    trading_day=datetime.now().strftime('%Y-%m-%d')
                )
                logger.info("PnLTotals created successfully")
            except Exception as e:
                logger.error(f"Failed to create PnLTotals: {e}")
                import traceback
                logger.error(f"PnLTotals traceback: {traceback.format_exc()}")
                return None
            
            # Test creating PnL model
            try:
                logger.info("Creating PnL model...")
                pnl = PnL(
                    totals=totals,
                    perSymbol=per_symbol  # Use the alias instead of per_symbol
                )
                logger.info("P&L calculation completed successfully")
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
        return self.get_pnl()

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
