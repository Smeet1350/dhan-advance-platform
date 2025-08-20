import { WS_URL } from "../config";

export function connectWS(onMessage: (msg: any) => void) {
  console.log('🔌 Creating WebSocket connection to:', WS_URL);
  
  const ws = new WebSocket(WS_URL);
  
  // Add error handling
  ws.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
  };
  
  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      console.log('📥 WebSocket message received:', data);
      onMessage(data);
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  };
  
  return ws;
}
