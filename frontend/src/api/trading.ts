import { api } from './index';

// Trading API Service
export const tradingApi = {
  // Square-off Actions
  squareoffPosition: async (positionId: string, quantity?: number) => {
    const params = quantity ? `?quantity=${quantity}` : '';
    return api.fetch(`/squareoff/${positionId}${params}`, {
      method: 'POST',
    });
  },

  squareoffAllPositions: async (confirm: boolean = false) => {
    return api.fetch('/squareoff/bulk', {
      method: 'POST',
      body: JSON.stringify({ confirm }),
    });
  },

  // Order Management
  placeOrder: async (orderData: {
    symbol: string;
    side: 'LONG' | 'SHORT';
    type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
    quantity: number;
    price?: number;
  }) => {
    return api.fetch('/orders/place', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  modifyOrder: async (orderId: string, modifyData: {
    price?: number;
    quantity?: number;
    type?: string;
  }) => {
    return api.fetch(`/orders/${orderId}/modify`, {
      method: 'PUT',
      body: JSON.stringify(modifyData),
    });
  },

  cancelOrder: async (orderId: string, confirm: boolean = false) => {
    return api.fetch(`/orders/${orderId}?confirm=${confirm}`, {
      method: 'DELETE',
    });
  },

  // Risk Analysis
  getPositionRisk: async (positionId: string) => {
    return api.fetch(`/positions/${positionId}/risk`);
  },
};

// Trading Types
export interface OrderData {
  symbol: string;
  side: 'LONG' | 'SHORT';
  type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  quantity: number;
  price?: number;
}

export interface ModifyOrderData {
  price?: number;
  quantity?: number;
  type?: string;
}

export interface SquareOffResult {
  message: string;
  position_id: string;
  quantity: number;
  order_id: string;
  status: string;
}

export interface BulkSquareOffResult {
  message: string;
  total_positions: number;
  successful: number;
  failed: number;
  results: Array<{
    position_id: string;
    symbol: string;
    quantity: number;
    status: string;
    order_id?: string;
    error?: string;
  }>;
}

export interface OrderResult {
  message: string;
  order_id: string;
  status: string;
  order_details?: any;
  modifications?: any;
}

export interface RiskMetrics {
  position_id: string;
  symbol: string;
  current_value: number;
  unrealized_pnl: number;
  pnl_percentage: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  stop_loss_suggestion: number;
  take_profit_suggestion: number;
  position_size: number;
  avg_price: number;
  ltp: number;
}
