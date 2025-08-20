import { useApiQuery, queryKeys } from "../api";

export default function PnL() {
  const { data: holdingsData, isLoading: holdingsLoading, error: holdingsError } = useApiQuery(
    queryKeys.holdings,
    "/holdings"
  );

  const { data: positionsData, isLoading: positionsLoading, error: positionsError } = useApiQuery(
    queryKeys.positions,
    "/positions"
  );

  const { data: tradesData, isLoading: tradesLoading, error: tradesError } = useApiQuery(
    queryKeys.trades,
    "/trades"
  );

  console.log("PnL component render:", { 
    holdings: holdingsData, 
    positions: positionsData,
    trades: tradesData,
    holdingsLoading,
    positionsLoading,
    tradesLoading,
    holdingsError,
    positionsError,
    tradesError
  });

  if (holdingsLoading || positionsLoading || tradesLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Profit & Loss Summary</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (holdingsError || positionsError || tradesError) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Profit & Loss Summary</h2>
        <div className="text-red-400">
          Error loading data: {holdingsError?.message || positionsError?.message || tradesError?.message}
        </div>
      </div>
    );
  }

  // Calculate PnL from holdings data
  const holdings = Array.isArray(holdingsData?.data?.data) ? holdingsData.data.data : [];
  const positions = Array.isArray(positionsData?.data?.data) ? positionsData.data.data : [];
  const trades = Array.isArray(tradesData?.data?.data) ? tradesData.data.data : [];

  let totalInvested = 0;
  let totalCurrentValue = 0;
  let dailyPnL = 0;

  // Calculate PnL for holdings
  holdings.forEach((holding: any) => {
    const quantity = holding.totalQty || 0;
    const avgPrice = holding.avgPrice || 0;
    const currentPrice = holding.lastTradedPrice || 0;
    
    const invested = quantity * avgPrice;
    const currentValue = quantity * currentPrice;
    
    totalInvested += invested;
    totalCurrentValue += currentValue;
  });

  // Calculate PnL for positions
  positions.forEach((position: any) => {
    const quantity = Math.abs(position.netQty || 0);
    const avgPrice = position.averagePrice || 0;
    const currentPrice = position.lastTradedPrice || 0;
    
    const invested = quantity * avgPrice;
    const currentValue = quantity * currentPrice;
    
    totalInvested += invested;
    totalCurrentValue += currentValue;
  });

  // Calculate daily PnL from today's trades
  const today = new Date().toISOString().split('T')[0];
  trades.forEach((trade: any) => {
    if (trade.tradeDate === today) {
      const quantity = trade.tradedQuantity || 0;
      const price = trade.tradedPrice || 0;
      const value = quantity * price;
      
      if (trade.transactionType === 'BUY') {
        dailyPnL -= value; // Money spent on buying
      } else if (trade.transactionType === 'SELL') {
        dailyPnL += value; // Money received from selling
      }
    }
  });

  const totalPnL = totalCurrentValue - totalInvested;
  const pnlPercentage = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-4">Profit & Loss Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Total Invested</div>
          <div className="text-2xl font-bold">₹{totalInvested.toLocaleString()}</div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">Current Value</div>
          <div className="text-2xl font-bold">₹{totalCurrentValue.toLocaleString()}</div>
        </div>
        
        <div className={`rounded-lg p-4 ${totalPnL >= 0 ? 'bg-green-700' : 'bg-red-700'}`}>
          <div className="text-sm text-gray-200">Total P&L</div>
          <div className="text-2xl font-bold">
            {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toLocaleString()}
          </div>
          <div className="text-sm">
            {pnlPercentage >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%
          </div>
        </div>

        <div className={`rounded-lg p-4 ${dailyPnL >= 0 ? 'bg-blue-700' : 'bg-orange-700'}`}>
          <div className="text-sm text-gray-200">Today's P&L</div>
          <div className="text-2xl font-bold">
            {dailyPnL >= 0 ? '+' : ''}₹{dailyPnL.toLocaleString()}
          </div>
          <div className="text-xs text-gray-300">From trades</div>
        </div>
      </div>

      {holdings.length === 0 && positions.length === 0 && (
        <div className="text-gray-400">No holdings or positions found to calculate P&L</div>
      )}
    </div>
  );
}
