import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';
import { config } from '../config';

// API Configuration
const API_BASE = config.API_BASE;
const WS_URL = config.WS_URL;

// WebSocket Connection States
export const ConnectionState = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  OFFLINE: 'offline'
} as const;

export type ConnectionStateType = typeof ConnectionState[keyof typeof ConnectionState];

// WebSocket Message Types
export const MessageType = {
  HELLO: 'hello',
  PING: 'ping',
  PONG: 'pong',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  RESUME: 'resume',
  RESUME_ACK: 'resume.ack',
  RESUME_NACK: 'resume.nack',
  POSITIONS_DELTA: 'positions.delta',
  ORDERS_DELTA: 'orders.delta',
  HOLDINGS_DELTA: 'holdings.delta',
  TRADES_DELTA: 'trades.delta',
  PNL_UPDATE: 'pnl.update',
  POSITIONS_SUMMARY: 'positions.summary',
  ORDERS_SUMMARY: 'orders.summary',
  HOLDINGS_SUMMARY: 'holdings.summary',
  TRADES_SUMMARY: 'trades.summary',
  ERROR: 'error'
} as const;

export type MessageTypeType = typeof MessageType[keyof typeof MessageType];

// Data Types
export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  qty: number;
  avg_price: number;
  ltp: number;
  unrealized: number;
}

export interface Order {
  order_id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  price: number;
  qty: number;
  filled_qty: number;
  status: 'PENDING' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  placed_at: string;
}

export interface Holding {
  isin: string;
  symbol: string;
  qty: number;
  avg_price: number;
  ltp: number;
  value: number;
  day_change: number;
}

export interface Trade {
  trade_id: string;
  order_id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  price: number;
  qty: number;
  time: string;
}

export interface PnLTotals {
  realized: number;
  unrealized: number;
  day: number;
  currency: string;
}

export interface PnLSymbol {
  symbol: string;
  side: 'LONG' | 'SHORT';
  qty: number;
  avg: number;
  ltp: number;
  unrealized: number;
  today_pnl: number;
}

export interface PnL {
  totals: PnLTotals;
  perSymbol: PnLSymbol[];
  updatedAt: string;
  tradingDay: string;
}

// API Response Types
export interface APIResponse<T> {
  ok: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  trace_id?: string;
}

// REST API Functions
export const api = {
  async fetch<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data: APIResponse<T> = await response.json();
    if (!data.ok) {
      throw new Error(data.error?.message || 'API request failed');
    }
    return data.data;
  },

  positions: () => api.fetch<Position[]>('/positions'),
  orders: (status?: string) => api.fetch<Order[]>(`/orders${status ? `?status=${status}` : ''}`),
  holdings: () => api.fetch<Holding[]>('/holdings'),
  trades: () => api.fetch<Trade[]>('/trades'),
  pnl: () => api.fetch<PnL>('/pnl'),
  ltp: (symbols: string[]) => api.fetch<Record<string, number>>(`/ltp?symbols=${symbols.join(',')}`)
};

// TanStack Query Hooks
export const usePositions = () => {
  return useQuery({
    queryKey: ['positions'],
    queryFn: api.positions,
    refetchInterval: 30000, // 30s fallback polling
    staleTime: 5000, // 5s stale time
  });
};

export const useOrders = (status?: string) => {
  return useQuery({
    queryKey: ['orders', status],
    queryFn: () => api.orders(status),
    refetchInterval: 60000, // 1min fallback polling
    staleTime: 10000, // 10s stale time
  });
};

export const useHoldings = () => {
  return useQuery({
    queryKey: ['holdings'],
    queryFn: api.holdings,
    refetchInterval: 300000, // 5min fallback polling
    staleTime: 60000, // 1min stale time
  });
};

export const useTrades = () => {
  return useQuery({
    queryKey: ['trades'],
    queryFn: api.trades,
    refetchInterval: 600000, // 10min fallback polling
    staleTime: 300000, // 5min stale time
  });
};

export const usePnL = () => {
  return useQuery({
    queryKey: ['pnl'],
    queryFn: api.pnl,
    refetchInterval: 30000, // 30s fallback polling
    staleTime: 5000, // 5s stale time
  });
};

// WebSocket Client with State Management
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private heartbeatInterval: number | null = null;
  private reconnectTimeout: number | null = null;
  public connectionState: ConnectionStateType = ConnectionState.OFFLINE;
  public rtt = 0;
  public lastPingTime = 0;

  constructor(
    private onStateChange: (state: ConnectionStateType) => void,
    private onMessage: (message: any) => void
  ) {}

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.setConnectionState(ConnectionState.CONNECTING);
    
    try {
      this.ws = new WebSocket(WS_URL);
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.setConnectionState(ConnectionState.OFFLINE);
      this.scheduleReconnect();
    }
  }

  private handleOpen() {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.setConnectionState(ConnectionState.CONNECTED);
    this.startHeartbeat();
    this.subscribeToAllChannels();
  }

  private handleMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data);
      this.onMessage(message);
      
      // Handle hello message
      if (message.type === MessageType.HELLO) {
        console.log('Received hello:', message);
      }
      
      // Handle pong for RTT calculation
      if (message.type === MessageType.PONG) {
        this.calculateRTT();
      }
      
      // Handle resume.ack to replay missed messages
      if (message.type === MessageType.RESUME_ACK) {
        this.handleResumeAck(message);
      }
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent) {
    console.log('WebSocket closed:', event.code, event.reason);
    this.cleanup();
    
    if (event.code !== 1000) { // Not a normal closure
      this.setConnectionState(ConnectionState.RECONNECTING);
      this.scheduleReconnect();
    } else {
      this.setConnectionState(ConnectionState.OFFLINE);
    }
  }

  private handleError(error: Event) {
    console.error('WebSocket error:', error);
    this.setConnectionState(ConnectionState.OFFLINE);
  }

  private cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.ws = null;
  }

  private setConnectionState(state: ConnectionStateType) {
    this.connectionState = state;
    this.onStateChange(state);
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setConnectionState(ConnectionState.OFFLINE);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    this.reconnectTimeout = setTimeout(() => {
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      this.connect();
    }, delay);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendPing();
      }
    }, 10000); // Send ping every 10s
  }

  private sendPing() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.lastPingTime = Date.now();
      this.ws.send(JSON.stringify({
        type: MessageType.PING,
        clientTime: new Date().toISOString()
      }));
    }
  }

  private calculateRTT() {
    if (this.lastPingTime > 0) {
      this.rtt = Date.now() - this.lastPingTime;
    }
  }

  private subscribeToAllChannels() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: MessageType.SUBSCRIBE,
        channels: ['positions', 'orders', 'holdings', 'trades', 'pnl']
      }));
    }
  }

  private handleResumeAck(message: any) {
    if (message.missedEvents > 0) {
      console.log(`Resuming with ${message.missedEvents} missed events`);
      // The server will send missed events automatically
    }
  }

  sendResume(lastSeq: number) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: MessageType.RESUME,
        lastSeq,
        channels: ['positions', 'orders', 'holdings', 'trades', 'pnl']
      }));
    }
  }

  disconnect() {
    this.cleanup();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
    }
    this.setConnectionState(ConnectionState.OFFLINE);
  }

  getConnectionStatus() {
    return {
      state: this.connectionState,
      rtt: this.rtt,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// React Hook for WebSocket Client
export const useWebSocket = (onMessage: (message: any) => void) => {
  const [connectionState, setConnectionState] = useState<ConnectionStateType>(ConnectionState.OFFLINE);
  const [rtt, setRtt] = useState(0);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const wsRef = useRef<WebSocketClient | null>(null);

  const handleStateChange = useCallback((state: ConnectionStateType) => {
    setConnectionState(state);
  }, []);

  const handleMessage = useCallback((message: any) => {
    onMessage(message);
  }, [onMessage]);

  useEffect(() => {
    wsRef.current = new WebSocketClient(handleStateChange, handleMessage);
    wsRef.current.connect();

    return () => {
      wsRef.current?.disconnect();
    };
  }, [handleStateChange, handleMessage]);

  // Update status every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current) {
        const status = wsRef.current.getConnectionStatus();
        setRtt(status.rtt);
        setReconnectAttempts(status.reconnectAttempts);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const sendResume = useCallback((lastSeq: number) => {
    wsRef.current?.sendResume(lastSeq);
  }, []);

  return {
    connectionState,
    rtt,
    reconnectAttempts,
    sendResume,
    connect: () => wsRef.current?.connect(),
    disconnect: () => wsRef.current?.disconnect()
  };
};
