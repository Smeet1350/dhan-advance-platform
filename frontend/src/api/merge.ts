import type { Position, Order, Holding, Trade, PnL } from './index';

// Delta Change Types
export interface DeltaChanges<T> {
  upsert: T[];
  remove: string[];
}

export interface PositionsDelta {
  type: string;
  seq: number;
  serverTime: string;
  changes: DeltaChanges<Position>;
}

export interface OrdersDelta {
  type: string;
  seq: number;
  changes: DeltaChanges<Order> & {
    statusCounts?: {
      open: number;
      completed: number;
      cancelled: number;
    };
  };
}

export interface HoldingsDelta {
  type: string;
  seq: number;
  changes: DeltaChanges<Holding>;
}

export interface TradesDelta {
  type: string;
  seq: number;
  changes: DeltaChanges<Trade>;
}

export interface PnLUpdate {
  type: string;
  seq: number;
  totals: PnL['totals'];
  perSymbol: PnL['perSymbol'];
}

// Data Merge Functions
export class DataMerger {
  // Merge positions with delta updates
  static mergePositions(current: Position[], delta: PositionsDelta): Position[] {
    const result = [...current];
    
    // Remove items
    delta.changes.remove.forEach(id => {
      const index = result.findIndex(pos => pos.id === id);
      if (index !== -1) {
        result.splice(index, 1);
      }
    });
    
    // Upsert items (update existing or add new)
    delta.changes.upsert.forEach(updatedPosition => {
      const existingIndex = result.findIndex(pos => pos.id === updatedPosition.id);
      if (existingIndex !== -1) {
        // Update existing position
        result[existingIndex] = { ...result[existingIndex], ...updatedPosition };
      } else {
        // Add new position
        result.push(updatedPosition);
      }
    });
    
    return result;
  }

  // Merge orders with delta updates
  static mergeOrders(current: Order[], delta: OrdersDelta): Order[] {
    const result = [...current];
    
    // Remove items
    delta.changes.remove.forEach(orderId => {
      const index = result.findIndex(order => order.order_id === orderId);
      if (index !== -1) {
        result.splice(index, 1);
      }
    });
    
    // Upsert items
    delta.changes.upsert.forEach(updatedOrder => {
      const existingIndex = result.findIndex(order => order.order_id === updatedOrder.order_id);
      if (existingIndex !== -1) {
        // Update existing order
        result[existingIndex] = { ...result[existingIndex], ...updatedOrder };
      } else {
        // Add new order
        result.push(updatedOrder);
      }
    });
    
    return result;
  }

  // Merge holdings with delta updates
  static mergeHoldings(current: Holding[], delta: HoldingsDelta): Holding[] {
    const result = [...current];
    
    // Remove items
    delta.changes.remove.forEach(isin => {
      const index = result.findIndex(holding => holding.isin === isin);
      if (index !== -1) {
        result.splice(index, 1);
      }
    });
    
    // Upsert items
    delta.changes.upsert.forEach(updatedHolding => {
      const existingIndex = result.findIndex(holding => holding.isin === updatedHolding.isin);
      if (existingIndex !== -1) {
        // Update existing holding
        result[existingIndex] = { ...result[existingIndex], ...updatedHolding };
      } else {
        // Add new holding
        result.push(updatedHolding);
      }
    });
    
    return result;
  }

  // Merge trades with delta updates
  static mergeTrades(current: Trade[], delta: TradesDelta): Trade[] {
    const result = [...current];
    
    // Remove items
    delta.changes.remove.forEach(tradeId => {
      const index = result.findIndex(trade => trade.trade_id === tradeId);
      if (index !== -1) {
        result.splice(index, 1);
      }
    });
    
    // Upsert items
    delta.changes.upsert.forEach(updatedTrade => {
      const existingIndex = result.findIndex(trade => trade.trade_id === updatedTrade.trade_id);
      if (existingIndex !== -1) {
        // Update existing trade
        result[existingIndex] = { ...result[existingIndex], ...updatedTrade };
      } else {
        // Add new trade
        result.push(updatedTrade);
      }
    });
    
    return result;
  }

  // Update PnL with delta
  static updatePnL(current: PnL, update: PnLUpdate): PnL {
    return {
      ...current,
      totals: update.totals,
      perSymbol: update.perSymbol,
      updatedAt: new Date().toISOString()
    };
  }

  // Get order status counts
  static getOrderStatusCounts(orders: Order[]): { open: number; completed: number; cancelled: number } {
    return orders.reduce(
      (counts, order) => {
        const status = order.status.toLowerCase();
        if (status === 'pending' || status === 'partially_filled') {
          counts.open++;
        } else if (status === 'filled') {
          counts.completed++;
        } else if (status === 'cancelled' || status === 'rejected') {
          counts.cancelled++;
        }
        return counts;
      },
      { open: 0, completed: 0, cancelled: 0 }
    );
  }

  // Check if data has changed (for optimization)
  static hasChanged<T>(oldData: T[], newData: T[], idField: keyof T): boolean {
    if (oldData.length !== newData.length) return true;
    
    const oldIds = new Set(oldData.map(item => item[idField]));
    const newIds = new Set(newData.map(item => item[idField]));
    
    if (oldIds.size !== newIds.size) return true;
    
    for (const id of oldIds) {
      if (!newIds.has(id)) return true;
    }
    
    return false;
  }

  // Sort positions by unrealized P&L (highest to lowest)
  static sortPositionsByPnL(positions: Position[]): Position[] {
    return [...positions].sort((a, b) => Math.abs(b.unrealized) - Math.abs(a.unrealized));
  }

  // Sort orders by placement time (newest first)
  static sortOrdersByTime(orders: Order[]): Order[] {
    return [...orders].sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime());
  }

  // Sort trades by execution time (newest first)
  static sortTradesByTime(trades: Trade[]): Trade[] {
    return [...trades].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }

  // Sort holdings by day change (highest to lowest)
  static sortHoldingsByChange(holdings: Holding[]): Holding[] {
    return [...holdings].sort((a, b) => Math.abs(b.day_change) - Math.abs(a.day_change));
  }
}
