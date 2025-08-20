import { useApiQuery, queryKeys } from "../api";

export default function Positions() {
  const { data, isLoading, error } = useApiQuery(
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
  const positions = Array.isArray(positionsData) ? positionsData : [];

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-4">Current Positions</h2>
      {positions.length === 0 ? (
        <div className="text-gray-400">No open positions</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
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
              {positions.map((position: any, index: number) => (
                <tr key={index} className="border-b border-gray-700">
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
                    <button className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs">
                      Square Off
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
