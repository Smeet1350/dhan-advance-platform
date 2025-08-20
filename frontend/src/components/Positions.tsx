import { useState } from "react";
import { useApiQuery, queryKeys } from "../api";
import { api } from "../api";

export default function Positions() {
  const [squareOffStatus, setSquareOffStatus] = useState<{[key: string]: 'idle' | 'loading' | 'success' | 'error'}>({});
  const [squareOffMessage, setSquareOffMessage] = useState<{[key: string]: string}>({});
  const [confirmDialog, setConfirmDialog] = useState<{show: boolean, positionId: string, symbol: string} | null>(null);
  
  const { data, isLoading, error, refetch } = useApiQuery(
    queryKeys.positions,
    "/positions"
  );

  console.log("Positions component render:", { data, isLoading, error });

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Current Positions</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Current Positions</h2>
        <div className="text-red-400">Error loading positions: {error.message}</div>
      </div>
    );
  }

  // Safely extract positions data
  const positionsData = data?.data?.data;
  console.log("Positions data received:", positionsData);
  
  // Ensure positions is an array
  let positions = Array.isArray(positionsData) ? positionsData : [];
  
  // TESTING: Add mock position for demonstration if no real positions exist
  if (positions.length === 0) {
    console.log("🔧 Adding mock position for testing square-off functionality");
    positions = [
      {
        id: "TEST_POS_001",
        tradingSymbol: "RELIANCE",
        buyOrSell: "BUY",
        netQty: 100,
        averagePrice: 2500.50,
        lastTradedPrice: 2520.00,
        positionId: "TEST_POS_001"
      }
    ];
  }

  const handleSquareOff = async (positionId: string, symbol: string) => {
    // Show confirmation dialog first
    setConfirmDialog({ show: true, positionId, symbol });
  };

  const confirmSquareOff = async () => {
    if (!confirmDialog) return;
    
    const { positionId, symbol } = confirmDialog;
    
    try {
      setSquareOffStatus(prev => ({ ...prev, [positionId]: 'loading' }));
      setSquareOffMessage(prev => ({ ...prev, [positionId]: 'Squaring off position...' }));
      
      console.log(`🚨🚨 CONFIRMED: Squaring off position: ${positionId} (${symbol})`);
      
      const response = await api.post(`/actions/squareoff/${positionId}/confirm`);
      
      if (response.data.ok) {
        setSquareOffStatus(prev => ({ ...prev, [positionId]: 'success' }));
        setSquareOffMessage(prev => ({ ...prev, [positionId]: `✅✅ ${response.data.data.message}` }));
        
        console.log(`✅✅ Square-off confirmed and successful for position ${positionId}:`, response.data);
        
        // Refresh positions data after successful square-off
        setTimeout(() => {
          refetch();
          setSquareOffStatus(prev => ({ ...prev, [positionId]: 'idle' }));
          setSquareOffMessage(prev => ({ ...prev, [positionId]: '' }));
        }, 3000);
        
      } else {
        throw new Error(response.data.error?.message || 'Square-off failed');
      }
      
    } catch (error: any) {
      console.error(`❌❌ Square-off error for position ${positionId}:`, error);
      
      setSquareOffStatus(prev => ({ ...prev, [positionId]: 'error' }));
      setSquareOffMessage(prev => ({ 
        ...prev, 
        [positionId]: `❌❌ ${error.response?.data?.error?.message || error.message || 'Square-off failed'}` 
      }));
      
      // Reset error status after 5 seconds
      setTimeout(() => {
        setSquareOffStatus(prev => ({ ...prev, [positionId]: 'idle' }));
        setSquareOffMessage(prev => ({ ...prev, [positionId]: '' }));
      }, 5000);
    } finally {
      setConfirmDialog(null);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-4">Current Positions</h2>
      
      {/* TESTING: Show test mode indicator */}
      {positions.length > 0 && positions[0]?.id === "TEST_POS_001" && (
        <div className="mb-4 p-3 bg-yellow-900 border border-yellow-600 rounded-lg">
          <div className="flex items-center">
            <span className="text-yellow-400 text-lg mr-2">🧪</span>
            <span className="text-yellow-200 text-sm">
              <strong>Test Mode:</strong> Showing mock position for square-off testing. 
              Click the 🚨 Square Off button to test the functionality.
            </span>
          </div>
        </div>
      )}
      
      {positions.length === 0 ? (
        <div className="text-gray-400">
          No open positions
          {/* TESTING: Add test button when no positions */}
          <div className="mt-3">
            <button
              onClick={() => handleSquareOff("TEST_POS_001", "RELIANCE")}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
            >
              🧪 Test Square-Off (Mock Position)
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-2">Position ID</th>
                <th className="text-left p-2">Symbol</th>
                <th className="text-left p-2">Side</th>
                <th className="text-left p-2">Quantity</th>
                <th className="text-left p-2">Entry Price</th>
                <th className="text-left p-2">LTP</th>
                <th className="text-left p-2">P&L</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position: any, index: number) => {
                const positionId = position.id || position.positionId || `pos_${index}`;
                const currentStatus = squareOffStatus[positionId] || 'idle';
                const currentMessage = squareOffMessage[positionId] || '';
                
                return (
                  <tr key={index} className="border-b border-gray-700">
                    <td className="p-2 text-xs font-mono text-gray-400">{positionId}</td>
                    <td className="p-2 font-medium">{position.tradingSymbol}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        position.buyOrSell === 'BUY' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {position.buyOrSell}
                      </span>
                    </td>
                    <td className="p-2">{position.netQty}</td>
                    <td className="p-2">₹{position.averagePrice || 'N/A'}</td>
                    <td className="p-2">₹{position.lastTradedPrice || 'N/A'}</td>
                    <td className="p-2 text-green-400">+₹0</td>
                    <td className="p-2">
                      <div className="space-y-2">
                        <button
                          onClick={() => handleSquareOff(positionId, position.tradingSymbol)}
                          disabled={currentStatus === 'loading'}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            currentStatus === 'loading'
                              ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                              : currentStatus === 'success'
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : currentStatus === 'error'
                              ? 'bg-red-700 hover:bg-red-800 text-white'
                              : 'bg-red-600 hover:bg-red-700 text-white'
                          }`}
                        >
                          {currentStatus === 'loading' ? '⏳ Processing...' : '🚨 Square Off'}
                        </button>
                        
                        {currentMessage && (
                          <div className={`text-xs ${
                            currentStatus === 'success' ? 'text-green-400' : 
                            currentStatus === 'error' ? 'text-red-400' : 'text-blue-400'
                          }`}>
                            {currentMessage}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="text-red-500 text-2xl mr-3">🚨</div>
              <h3 className="text-xl font-semibold text-white">Confirm Square-Off</h3>
            </div>
            
            <div className="text-gray-300 mb-6">
              <p className="mb-2">Are you sure you want to square off this position?</p>
              <div className="bg-gray-700 p-3 rounded">
                <p><strong>Symbol:</strong> {confirmDialog.symbol}</p>
                <p><strong>Position ID:</strong> <span className="font-mono text-sm">{confirmDialog.positionId}</span></p>
              </div>
              <p className="text-red-400 text-sm mt-3">
                ⚠️ This action cannot be undone and will close your position immediately.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSquareOff}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium"
              >
                🚨 Confirm Square-Off
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
