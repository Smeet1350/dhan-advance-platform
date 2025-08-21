import { VirtualizedTable } from './VirtualizedTable';
import type { Position, Holding, Order, Trade } from '../api'; // Assuming these types are available

// Helper for currency formatting
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

// Helper for status/side/type colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-blue-500/20 text-blue-300 border-blue-400/40';
    case 'FILLED':
      return 'bg-green-500/20 text-green-300 border-green-400/40';
    case 'CANCELLED':
      return 'bg-red-500/20 text-red-300 border-red-400/40';
    case 'REJECTED':
      return 'bg-red-500/20 text-red-300 border-red-400/40';
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-400/40';
  }
};

const getSideColor = (side: string) => {
  return side === 'LONG' 
    ? 'bg-green-500/20 text-green-300 border-green-400/40' 
    : 'bg-red-500/20 text-red-300 border-red-400/40';
};

const getOrderTypeColor = (type: string) => {
  switch (type) {
    case 'MARKET':
      return 'bg-purple-500/20 text-purple-300 border-purple-400/40';
    case 'LIMIT':
      return 'bg-orange-500/20 text-orange-300 border-orange-400/40';
    case 'STOP':
      return 'bg-red-500/20 text-red-300 border-red-400/40';
    case 'STOP_LIMIT':
      return 'bg-red-500/20 text-red-300 border-red-400/40';
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-400/40';
  }
};

// Positions Table
export const VirtualizedPositionsTable: React.FC<{ data: Position[]; onRowClick?: (item: Position) => void }> = ({ data, onRowClick }) => {
  const columns = [
    { key: 'symbol', header: 'Symbol', render: (position: Position) => position.symbol },
    { key: 'side', header: 'Side', render: (position: Position) => (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSideColor(position.side)}`}>
        {position.side}
      </span>
    )},
    { key: 'qty', header: 'Quantity', render: (position: Position) => position.qty.toLocaleString() },
    { key: 'avg_price', header: 'Avg Price', render: (position: Position) => `₹${position.avg_price}` },
    { key: 'ltp', header: 'LTP', render: (position: Position) => `₹${position.ltp}` },
    { key: 'unrealized', header: 'Unrealized P&L', render: (position: Position) => (
      <span className={`font-semibold ${position.unrealized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        ₹{position.unrealized.toLocaleString()}
      </span>
    )},
  ];
  return <VirtualizedTable data={data} columns={columns} getKey={(p: Position) => p.id} onRowClick={onRowClick} />;
};

// Holdings Table
export const VirtualizedHoldingsTable: React.FC<{ data: Holding[]; onRowClick?: (item: Holding) => void }> = ({ data, onRowClick }) => {
  const columns = [
    { key: 'symbol', header: 'Symbol', render: (holding: Holding) => holding.symbol },
    { key: 'qty', header: 'Quantity', render: (holding: Holding) => holding.qty.toLocaleString() },
    { key: 'avg_price', header: 'Avg Price', render: (holding: Holding) => `₹${holding.avg_price}` },
    { key: 'ltp', header: 'LTP', render: (holding: Holding) => `₹${holding.ltp}` },
    { key: 'value', header: 'Market Value', render: (holding: Holding) => formatCurrency(holding.value) },
    { key: 'day_change', header: 'Day Change', render: (holding: Holding) => (
      <span className={`font-semibold ${holding.day_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        ₹{holding.day_change.toLocaleString()}
      </span>
    )},
  ];
  return <VirtualizedTable data={data} columns={columns} getKey={(h: Holding) => h.isin} onRowClick={onRowClick} />;
};

// Orders Table
export const VirtualizedOrdersTable: React.FC<{ data: Order[]; onRowClick?: (item: Order) => void }> = ({ data, onRowClick }) => {
  const columns = [
    { key: 'order_id', header: 'Order ID', render: (order: Order) => order.order_id },
    { key: 'symbol', header: 'Symbol', render: (order: Order) => order.symbol },
    { key: 'side', header: 'Side', render: (order: Order) => (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSideColor(order.side)}`}>
        {order.side}
      </span>
    )},
    { key: 'type', header: 'Type', render: (order: Order) => (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getOrderTypeColor(order.type)}`}>
        {order.type}
      </span>
    )},
    { key: 'qty', header: 'Quantity', render: (order: Order) => order.qty.toLocaleString() },
    { key: 'filled_qty', header: 'Filled', render: (order: Order) => order.filled_qty.toLocaleString() },
    { key: 'price', header: 'Price', render: (order: Order) => `₹${order.price}` },
    { key: 'status', header: 'Status', render: (order: Order) => (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
        {order.status}
      </span>
    )},
    { key: 'placed_at', header: 'Placed At', render: (order: Order) => new Date(order.placed_at).toLocaleString() },
  ];
  return <VirtualizedTable data={data} columns={columns} getKey={(o: Order) => o.order_id} onRowClick={onRowClick} />;
};

// Trades Table
export const VirtualizedTradesTable: React.FC<{ data: Trade[]; onRowClick?: (item: Trade) => void }> = ({ data, onRowClick }) => {
  const columns = [
    { key: 'trade_id', header: 'Trade ID', render: (trade: Trade) => trade.trade_id },
    { key: 'order_id', header: 'Order ID', render: (trade: Trade) => trade.order_id },
    { key: 'symbol', header: 'Symbol', render: (trade: Trade) => trade.symbol },
    { key: 'side', header: 'Side', render: (trade: Trade) => (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSideColor(trade.side)}`}>
        {trade.side}
      </span>
    )},
    { key: 'qty', header: 'Quantity', render: (trade: Trade) => trade.qty.toLocaleString() },
    { key: 'price', header: 'Price', render: (trade: Trade) => `₹${trade.price}` },
    { key: 'time', header: 'Time', render: (trade: Trade) => new Date(trade.time).toLocaleString() },
  ];
  return <VirtualizedTable data={data} columns={columns} getKey={(t: Trade) => t.trade_id} onRowClick={onRowClick} />;
};
