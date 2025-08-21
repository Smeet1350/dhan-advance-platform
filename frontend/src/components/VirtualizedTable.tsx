import React, { useMemo, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';

interface Column<T> {
  key: string;
  header: string;
  width?: number;
  render: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  height?: number;
  rowHeight?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (item: T, index: number) => void;
  selectedRow?: number;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
  getKey: (item: T) => string;
}

export function VirtualizedTable<T>({
  data,
  columns,
  height = 400,
  rowHeight = 60,
  sortBy,
  sortDirection,
  onSort,
  onRowClick,
  selectedRow,
  className = '',
  emptyMessage = 'No data available',
  loading = false
}: VirtualizedTableProps<T>) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  // Memoize sorted data
  const sortedData = useMemo(() => {
    if (!sortBy || !sortDirection) return data;
    
    return [...data].sort((a, b) => {
      const aValue = (a as any)[sortBy];
      const bValue = (b as any)[sortBy];
      
      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortBy, sortDirection]);

  // Virtualization setup
  const parentRef = React.useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: sortedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  // Handle sort
  const handleSort = useCallback((key: string) => {
    if (onSort) {
      onSort(key);
    }
  }, [onSort]);

  // Handle row click
  const handleRowClick = useCallback((item: T, index: number) => {
    if (onRowClick) {
      onRowClick(item, index);
    }
  }, [onRowClick]);

  // Calculate column widths
  const totalWidth = useMemo(() => {
    return columns.reduce((sum, col) => sum + (col.width || 150), 0);
  }, [columns]);

  if (loading) {
    return (
      <div className={`bg-gray-800/50 rounded-xl border border-gray-700/50 ${className}`}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-700/50 rounded w-1/3"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-700/50 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (sortedData.length === 0) {
    return (
      <div className={`bg-gray-800/50 rounded-xl border border-gray-700/50 ${className}`}>
        <div className="p-8 text-center">
          <div className="text-gray-400 text-4xl mb-4">📊</div>
          <h3 className="text-gray-300 text-lg font-semibold mb-2">No Data Available</h3>
          <p className="text-gray-500 text-sm">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden ${className}`}>
      {/* Table Header */}
      <div className="bg-gray-900/50 border-b border-gray-700/50 sticky top-0 z-10">
        <div className="flex" style={{ width: totalWidth }}>
          {columns.map((column) => (
            <div
              key={column.key}
              className={`px-4 py-3 font-semibold text-gray-300 border-r border-gray-700/50 last:border-r-0 ${
                column.align === 'center' ? 'text-center' : 
                column.align === 'right' ? 'text-right' : 'text-left'
              }`}
              style={{ width: column.width || 150 }}
            >
              <div className="flex items-center justify-between">
                <span>{column.header}</span>
                {column.sortable && (
                  <button
                    onClick={() => handleSort(column.key)}
                    className={`ml-2 p-1 rounded transition-colors ${
                      sortBy === column.key ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
                    }`}
                    aria-label={`Sort by ${column.header}`}
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        sortBy === column.key && sortDirection === 'desc' ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Virtualized Table Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = sortedData[virtualRow.index];
            const isSelected = selectedRow === virtualRow.index;
            const isHovered = hoveredRow === virtualRow.index;

            return (
              <motion.div
                key={virtualRow.index}
                className={`absolute top-0 left-0 w-full cursor-pointer transition-colors duration-200 ${
                  isSelected ? 'bg-blue-600/20' : 
                  isHovered ? 'bg-gray-700/50' : 'hover:bg-gray-700/30'
                }`}
                style={{
                  height: `${rowHeight}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => handleRowClick(item, virtualRow.index)}
                onMouseEnter={() => setHoveredRow(virtualRow.index)}
                onMouseLeave={() => setHoveredRow(null)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: virtualRow.index * 0.02 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex" style={{ width: totalWidth }}>
                  {columns.map((column) => (
                    <div
                      key={column.key}
                      className={`px-4 py-3 border-r border-gray-700/50 last:border-r-0 flex items-center ${
                        column.align === 'center' ? 'justify-center' : 
                        column.align === 'right' ? 'justify-end' : 'justify-start'
                      }`}
                      style={{ width: column.width || 150 }}
                    >
                      {column.render(item, virtualRow.index)}
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Table Footer with Info */}
      <div className="bg-gray-900/30 border-t border-gray-700/50 px-4 py-2">
        <div className="flex justify-between items-center text-sm text-gray-400">
          <span>
            Showing {rowVirtualizer.getVirtualItems().length} of {sortedData.length} rows
          </span>
          <span>
            Total height: {Math.round(rowVirtualizer.getTotalSize() / 1000)}k pixels
          </span>
        </div>
      </div>
    </div>
  );
}

// Specialized table components for common use cases
export function VirtualizedPositionsTable({ data, onRowClick, selectedRow }: {
  data: any[];
  onRowClick?: (item: any, index: number) => void;
  selectedRow?: number;
}) {
  const columns = [
    {
      key: 'symbol',
      header: 'Symbol',
      width: 120,
      render: (item: any) => (
        <div>
          <div className="font-semibold text-white">{item.symbol}</div>
          <div className="text-sm text-blue-200">{item.exchange}</div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'side',
      header: 'Side',
      width: 100,
      render: (item: any) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          item.side === 'LONG' 
            ? 'bg-green-500/20 text-green-300 border border-green-400/30' 
            : 'bg-red-500/20 text-red-300 border border-red-400/30'
        }`}>
          {item.side}
        </span>
      ),
      sortable: true,
      align: 'center' as const,
    },
    {
      key: 'qty',
      header: 'Quantity',
      width: 100,
      render: (item: any) => (
        <span className="text-white font-medium">{item.qty}</span>
      ),
      sortable: true,
      align: 'right' as const,
    },
    {
      key: 'avg_price',
      header: 'Avg Price',
      width: 120,
      render: (item: any) => (
        <span className="text-white">₹{item.avg_price}</span>
      ),
      sortable: true,
      align: 'right' as const,
    },
    {
      key: 'ltp',
      header: 'LTP',
      width: 120,
      render: (item: any) => (
        <span className="text-white">₹{item.ltp}</span>
      ),
      sortable: true,
      align: 'right' as const,
    },
    {
      key: 'unrealized',
      header: 'P&L',
      width: 120,
      render: (item: any) => (
        <span className={`font-medium ${
          (item.unrealized || 0) >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          ₹{(item.unrealized || 0).toFixed(2)}
        </span>
      ),
      sortable: true,
      align: 'right' as const,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 150,
      render: (_item: any) => (
        <div className="flex space-x-2">
          <button className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded-lg text-sm transition-colors border border-red-400/30 hover:border-red-400/50">
            Square Off
          </button>
          <button className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-3 py-1 rounded-lg text-sm transition-colors border border-blue-400/30 hover:border-blue-400/50">
            Modify
          </button>
        </div>
      ),
      align: 'center' as const,
    },
  ];

  return (
    <VirtualizedTable
      data={data}
      columns={columns}
      height={600}
      rowHeight={70}
      onRowClick={onRowClick}
      selectedRow={selectedRow}
      emptyMessage="No open positions found"
      getKey={(item: any) => item.id || item.order_id || item.trade_id}
    />
  );
}

export function VirtualizedOrdersTable({ data, onRowClick, selectedRow }: {
  data: any[];
  onRowClick?: (item: any, index: number) => void;
  selectedRow?: number;
}) {
  const columns = [
    {
      key: 'order_id',
      header: 'Order ID',
      width: 140,
      render: (item: any) => (
        <span className="font-mono text-blue-300 text-sm">{item.order_id}</span>
      ),
      sortable: true,
    },
    {
      key: 'symbol',
      header: 'Symbol',
      width: 120,
      render: (item: any) => (
        <span className="font-semibold text-white">{item.symbol}</span>
      ),
      sortable: true,
    },
    {
      key: 'side',
      header: 'Side',
      width: 100,
      render: (item: any) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          item.side === 'BUY' 
            ? 'bg-green-500/20 text-green-300 border border-green-400/30' 
            : 'bg-red-500/20 text-red-300 border border-red-400/30'
        }`}>
          {item.side}
        </span>
      ),
      sortable: true,
      align: 'center' as const,
    },
    {
      key: 'type',
      header: 'Type',
      width: 100,
      render: (item: any) => (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-400/30">
          {item.type}
        </span>
      ),
      sortable: true,
      align: 'center' as const,
    },
    {
      key: 'qty',
      header: 'Quantity',
      width: 100,
      render: (item: any) => (
        <span className="text-white font-medium">{item.qty}</span>
      ),
      sortable: true,
      align: 'right' as const,
    },
    {
      key: 'price',
      header: 'Price',
      width: 120,
      render: (item: any) => (
        <span className="text-white">₹{item.price}</span>
      ),
      sortable: true,
      align: 'right' as const,
    },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      render: (item: any) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          item.status === 'FILLED' ? 'bg-green-500/20 text-green-300 border border-green-400/30' :
          item.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30' :
          item.status === 'CANCELLED' ? 'bg-red-500/20 text-red-300 border border-red-400/30' :
          'bg-gray-500/20 text-gray-300 border border-gray-400/30'
        }`}>
          {item.status}
        </span>
      ),
      sortable: true,
      align: 'center' as const,
    },
    {
      key: 'placed_at',
      header: 'Placed At',
      width: 150,
      render: (item: any) => (
        <span className="text-gray-300 text-sm">
          {new Date(item.placed_at).toLocaleTimeString()}
        </span>
      ),
      sortable: true,
    },
  ];

  return (
    <VirtualizedTable
      data={data}
      columns={columns}
      height={600}
      rowHeight={70}
      onRowClick={onRowClick}
      selectedRow={selectedRow}
      emptyMessage="No orders found"
      getKey={(item: any) => item.id || item.order_id || item.trade_id}
    />
  );
}

export function VirtualizedHoldingsTable({ data, onRowClick, selectedRow }: {
  data: any[];
  onRowClick?: (item: any, index: number) => void;
  selectedRow?: number;
}) {
  const columns = [
    {
      key: 'symbol',
      header: 'Symbol',
      width: 120,
      render: (item: any) => (
        <div>
          <div className="font-semibold text-white">{item.symbol}</div>
          <div className="text-sm text-blue-200">{item.isin}</div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'qty',
      header: 'Quantity',
      width: 100,
      render: (item: any) => (
        <span className="text-white font-medium">{item.qty}</span>
      ),
      sortable: true,
      align: 'right' as const,
    },
    {
      key: 'avg_price',
      header: 'Avg Price',
      width: 120,
      render: (item: any) => (
        <span className="text-white">₹{item.avg_price}</span>
      ),
      sortable: true,
      align: 'right' as const,
    },
    {
      key: 'ltp',
      header: 'LTP',
      width: 120,
      render: (item: any) => (
        <span className="text-white">₹{item.ltp}</span>
      ),
      sortable: true,
      align: 'right' as const,
    },
    {
      key: 'value',
      header: 'Value',
      width: 120,
      render: (item: any) => (
        <span className="text-white">₹{item.value.toLocaleString()}</span>
      ),
      sortable: true,
      align: 'right' as const,
    },
    {
      key: 'day_change',
      header: 'Day Change',
      width: 120,
      render: (item: any) => (
        <span className={`font-medium ${
          item.day_change >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          ₹{item.day_change.toLocaleString()}
        </span>
      ),
      sortable: true,
      align: 'right' as const,
    },
  ];

  return (
    <VirtualizedTable
      data={data}
      columns={columns}
      height={600}
      rowHeight={70}
      onRowClick={onRowClick}
      selectedRow={selectedRow}
      emptyMessage="No holdings found"
      getKey={(item: any) => item.id || item.order_id || item.trade_id}
    />
  );
}

export function VirtualizedTradesTable({ data, onRowClick, selectedRow }: {
  data: any[];
  onRowClick?: (item: any, index: number) => void;
  selectedRow?: number;
}) {
  const columns = [
    {
      key: 'trade_id',
      header: 'Trade ID',
      width: 140,
      render: (item: any) => (
        <span className="font-mono text-blue-300 text-sm">{item.trade_id}</span>
      ),
      sortable: true,
    },
    {
      key: 'symbol',
      header: 'Symbol',
      width: 120,
      render: (item: any) => (
        <span className="font-semibold text-white">{item.symbol}</span>
      ),
      sortable: true,
    },
    {
      key: 'side',
      header: 'Side',
      width: 100,
      render: (item: any) => (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          item.side === 'BUY' 
            ? 'bg-green-500/20 text-green-300 border border-green-400/30' 
            : 'bg-red-500/20 text-red-300 border border-red-400/30'
        }`}>
          {item.side}
        </span>
      ),
      sortable: true,
      align: 'center' as const,
    },
    {
      key: 'qty',
      header: 'Quantity',
      width: 100,
      render: (item: any) => (
        <span className="text-white font-medium">{item.qty}</span>
      ),
      sortable: true,
      align: 'right' as const,
    },
    {
      key: 'price',
      header: 'Price',
      width: 120,
      render: (item: any) => (
        <span className="text-white">₹{item.price}</span>
      ),
      sortable: true,
      align: 'right' as const,
    },
    {
      key: 'time',
      header: 'Time',
      width: 150,
      render: (item: any) => (
        <span className="text-gray-300 text-sm">
          {new Date(item.time).toLocaleTimeString()}
        </span>
      ),
      sortable: true,
    },
  ];

  return (
    <VirtualizedTable
      data={data}
      columns={columns}
      height={600}
      rowHeight={70}
      onRowClick={onRowClick}
      selectedRow={selectedRow}
      emptyMessage="No trades found"
      getKey={(item: any) => item.id || item.order_id || item.trade_id}
    />
  );
}
