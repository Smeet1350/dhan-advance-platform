import { useApiQuery, queryKeys } from "../api";

export default function Holdings() {
  const { data, isLoading, error } = useApiQuery(
    queryKeys.holdings,
    "/holdings"
  );

  console.log("Holdings component render:", { data, isLoading, error });

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Portfolio Holdings</h2>
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
        <h2 className="text-2xl font-semibold mb-4">Portfolio Holdings</h2>
        <div className="text-red-400">Error loading holdings: {error.message}</div>
      </div>
    );
  }

  // Safely extract holdings data
  const holdingsData = data?.data?.data;
  console.log("Holdings data received:", holdingsData);
  
  // Ensure holdings is an array
  const holdings = Array.isArray(holdingsData) ? holdingsData : [];

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-4">Portfolio Holdings</h2>
      {holdings.length === 0 ? (
        <div className="text-gray-400">No holdings found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-2">Symbol</th>
                <th className="text-left p-2">Security ID</th>
                <th className="text-left p-2">Exchange</th>
                <th className="text-left p-2">Total Qty</th>
                <th className="text-left p-2">T1 Qty</th>
                <th className="text-left p-2">Avg Price</th>
                <th className="text-left p-2">LTP</th>
                <th className="text-left p-2">Market Value</th>
                <th className="text-left p-2">P&L</th>
                <th className="text-left p-2">P&L %</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((holding: any, index: number) => {
                const quantity = holding.totalQty || 0;
                const avgPrice = holding.avgPrice || 0;
                const currentPrice = holding.lastTradedPrice || 0;
                const marketValue = quantity * currentPrice;
                const invested = quantity * avgPrice;
                const pnl = marketValue - invested;
                const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
                
                return (
                  <tr key={index} className="border-b border-gray-700">
                    <td className="p-2 font-medium">{holding.tradingSymbol || 'N/A'}</td>
                    <td className="p-2">{holding.securityId || 'N/A'}</td>
                    <td className="p-2">{holding.exchange || 'N/A'}</td>
                    <td className="p-2">{quantity}</td>
                    <td className="p-2">{holding.t1Qty || 0}</td>
                    <td className="p-2">₹{avgPrice.toFixed(2)}</td>
                    <td className="p-2">₹{currentPrice.toFixed(2)}</td>
                    <td className="p-2">₹{marketValue.toFixed(2)}</td>
                    <td className={`p-2 ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                    </td>
                    <td className={`p-2 ${pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                    </td>
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
