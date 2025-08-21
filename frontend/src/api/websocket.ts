import { config } from '../config';

export interface WebSocketMessage {
  event: string;
  data?: any;
  timestamp?: string;
  channels?: string[];
}

export interface WebSocketClient {
  connect(): Promise<void>;
  disconnect(): void;
  subscribe(channels: string[]): void;
  unsubscribe(channels: string[]): void;
  onMessage(callback: (message: WebSocketMessage) => void): void;
  onConnect(callback: () => void): void;
  onDisconnect(callback: () => void): void;
  onError(callback: (error: Event) => void): void;
}

class WebSocketClientImpl implements WebSocketClient {
  private ws: WebSocket | null = null;
  private messageCallbacks: ((message: WebSocketMessage) => void)[] = [];
  private connectCallbacks: (() => void)[] = [];
  private disconnectCallbacks: (() => void)[] = [];
  private errorCallbacks: ((error: Event) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = config.WS_URL;
        console.log('🔌 Connecting to WebSocket:', wsUrl);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.reconnectAttempts = 0;
          this.connectCallbacks.forEach(callback => callback());
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('📥 WebSocket message received:', message);
            this.messageCallbacks.forEach(callback => callback(message));
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };
        
        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          this.disconnectCallbacks.forEach(callback => callback());
          
          // Attempt to reconnect if not manually closed
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.errorCallbacks.forEach(callback => callback(error));
          reject(error);
        };
        
      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      console.log('🔌 Disconnecting WebSocket');
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
  }

  subscribe(channels: string[]): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        event: 'subscribe',
        channels: channels
      };
      console.log('📤 Subscribing to channels:', channels);
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket not connected, cannot subscribe');
    }
  }

  unsubscribe(channels: string[]): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        event: 'unsubscribe',
        channels: channels
      };
      console.log('📤 Unsubscribing from channels:', channels);
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket not connected, cannot unsubscribe');
    }
  }

  onMessage(callback: (message: WebSocketMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  onConnect(callback: () => void): void {
    this.connectCallbacks.push(callback);
  }

  onDisconnect(callback: () => void): void {
    this.disconnectCallbacks.push(callback);
  }

  onError(callback: (error: Event) => void): void {
    this.errorCallbacks.push(callback);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const websocketClient = new WebSocketClientImpl();
