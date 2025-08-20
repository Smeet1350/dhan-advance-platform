import { useApiQuery, queryKeys } from "../api";

export default function Trades() {
  const { data, isLoading, error } = useApiQuery(
    queryKeys.trades,
    "/trades"
  );

  console.log("Trades component render:", { data, isLoading, error });

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Trade History</h2>
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
        <h2 className="text-2xl font-semibold mb-4">Trade History</h2>
        <div className="text-red-400">Error loading trades: {error.message}</div>
      </div>
    );
  }

  // Safely extract trades data - handle nested structure
  const tradesData = data?.data?.data;
  console.log("Trades data received:", tradesData);
  
  // Ensure trades is an array
  const trades = Array.isArray(tradesData) ? tradesData : [];

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-4">Trade History</h2>
      {trades.length === 0 ? (
        <div className="text-gray-400">No trades found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-2">Order ID</th>
                <th className="text-left p-2">Symbol</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Quantity</th>
                <th className="text-left p-2">Price</th>
                <th className="text-left p-2">Value</th>
                <th className="text-left p-2">Product</th>
                <th className="text-left p-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade: any, index: number) => {
                // Use the actual field names from Dhan API
                const quantity = trade.tradedQuantity || 0;
                const price = trade.tradedPrice || 0;
                const value = quantity * price;
                
                return (
                  <tr key={index} className="border-b border-gray-700">
                    <td className="p-2 font-mono text-xs">{trade.orderId || 'N/A'}</td>
                    <td className="p-2 font-medium">{trade.customSymbol || trade.tradingSymbol || 'N/A'}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        (trade.transactionType || '').toUpperCase() === 'BUY' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {trade.transactionType || 'N/A'}
                      </span>
                    </td>
                    <td className="p-2">{quantity}</td>
                    <td className="p-2">₹{price.toFixed(2)}</td>
                    <td className="p-2">₹{value.toFixed(2)}</td>
                    <td className="p-2 text-xs">{trade.productType || 'N/A'}</td>
                    <td className="p-2 text-xs">{trade.tradeDate || 'N/A'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
