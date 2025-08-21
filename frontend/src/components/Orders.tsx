import React from 'react';
import { motion } from 'framer-motion';
import { useOrders } from '../api';
import type { Order } from '../api';

const Orders: React.FC = () => {
  const { data: ordersData, isLoading, error, refetch } = useOrders();

  if (isLoading) {
    return (
      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5"></div>
        <div className="relative animate-pulse">
          <div className="h-8 bg-white/20 rounded-2xl mb-6 w-1/3"></div>
          <div className="h-96 bg-white/20 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-pink-500/5"></div>
        <div className="relative text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Error Loading Orders</h3>
          <p className="text-blue-200 mb-6">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!ordersData || ordersData.length === 0) {
    return (
      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-500/5 to-blue-500/5"></div>
        <div className="relative text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">No Orders Found</h3>
          <p className="text-blue-200">Start trading to see your order history.</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-500/20 text-blue-300 border-blue-400/40';
      case 'COMPLETED':
        return 'bg-green-500/20 text-green-300 border-green-400/40';
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-300 border-red-400/40';
      case 'REJECTED':
        return 'bg-red-500/20 text-red-300 border-red-400/40';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-400/40';
    }
  };

  const getSideColor = (side: string) => {
    return side === 'LONG' 
      ? 'bg-green-500/20 text-green-300 border-green-400/40' 
      : 'bg-red-500/20 text-red-300 border-red-400/40';
  };

  const getOrderTypeColor = (type: string) => {
    switch (type) {
      case 'MARKET':
        return 'bg-purple-500/20 text-purple-300 border-purple-400/40';
      case 'LIMIT':
        return 'bg-orange-500/20 text-orange-300 border-orange-400/40';
      case 'STOP_LOSS':
        return 'bg-red-500/20 text-red-300 border-red-400/40';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-400/40';
    }
  };

  const totalOrders = ordersData.length;
  const openOrders = ordersData.filter(order => order.status === 'PENDING').length;
  const completedOrders = ordersData.filter(order => order.status === 'FILLED').length;
  const cancelledOrders = ordersData.filter(order => order.status === 'CANCELLED').length;

  return (
    <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-red-500/5 to-pink-500/5"></div>
      
      {/* Header with Summary Stats */}
      <div className="relative bg-gradient-to-r from-white/20 to-white/10 px-8 py-6 border-b border-white/20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Order History</h2>
            <p className="text-blue-200">
              {totalOrders} order{totalOrders !== 1 ? 's' : ''} • Trading activity
            </p>
          </div>
          
          {/* Summary Stats */}
          <div className="flex flex-wrap gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <p className="text-xs text-blue-200 mb-1">Total</p>
              <p className="text-lg font-bold text-white">{totalOrders}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <p className="text-xs text-blue-200 mb-1">Open</p>
              <p className="text-lg font-bold text-blue-400">{openOrders}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <p className="text-xs text-blue-200 mb-1">Completed</p>
              <p className="text-lg font-bold text-green-400">{completedOrders}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <p className="text-xs text-blue-200 mb-1">Cancelled</p>
              <p className="text-lg font-bold text-red-400">{cancelledOrders}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="relative p-8">
        <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/20">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Symbol</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Side</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Filled</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Placed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {ordersData.map((order: Order, index: number) => (
                  <motion.tr
                    key={order.order_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="hover:bg-white/5 transition-all duration-200 group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white group-hover:text-blue-200 transition-colors">
                        {order.order_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                      {order.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getSideColor(order.side)}`}>
                        {order.side}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getOrderTypeColor(order.type)}`}>
                        {order.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                      {formatCurrency(order.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                      {order.qty.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                      {order.filled_qty.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                      {new Date(order.placed_at).toLocaleString('en-IN', { 
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'short',
                        timeStyle: 'short'
                      })}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;
