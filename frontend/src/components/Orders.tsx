import { useApiQuery, queryKeys } from "../api";

export default function Orders() {
  const { data, isLoading, error } = useApiQuery(
    queryKeys.orders,
    "/orders"
  );

  console.log("Orders component render:", { data, isLoading, error });

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Order History</h2>
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
        <h2 className="text-2xl font-semibold mb-4">Order History</h2>
        <div className="text-red-400">Error loading orders: {error.message}</div>
      </div>
    );
  }

  // Check if data exists and has the expected structure
  const ordersData = data?.data;
  console.log("Orders data received:", ordersData);

  // If data has a message property, it's a placeholder response
  if (ordersData && typeof ordersData === 'object' && 'message' in ordersData) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Order History</h2>
        <div className="text-gray-400">
          {ordersData.message}
        </div>
      </div>
    );
  }

  // If data is an array, render the table
  const orders = Array.isArray(ordersData) ? ordersData : [];

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-4">Order History</h2>
      {orders.length === 0 ? (
        <div className="text-gray-400">No orders found</div>
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
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any, index: number) => (
                <tr key={index} className="border-b border-gray-700">
                  <td className="p-2 font-mono text-xs">{order.orderId || 'N/A'}</td>
                  <td className="p-2 font-medium">{order.tradingSymbol || 'N/A'}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      order.transactionType === 'BUY' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                      {order.transactionType || 'N/A'}
                    </span>
                  </td>
                  <td className="p-2">{order.quantity || 'N/A'}</td>
                  <td className="p-2">₹{order.price || 'N/A'}</td>
                  <td className="p-2">
                    <span className="px-2 py-1 rounded text-xs bg-yellow-600 text-white">
                      {order.status || 'N/A'}
                    </span>
                  </td>
                  <td className="p-2 text-xs">{order.orderTime || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
