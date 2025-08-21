import React from 'react';
import { useOrders } from '../api';
import { VirtualizedOrdersTable } from './VirtualizedTables';

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
          <h3 className="text-3xl font-bold text-white mb-3">Error Loading Orders</h3>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2zm0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-3xl font-bold text-white mb-3">No Orders Found</h3>
          <p className="text-blue-200">Start trading to see your order history.</p>
        </div>
      </div>
    );
  }

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
        <VirtualizedOrdersTable 
          data={ordersData} 
          onRowClick={(order) => console.log('Order clicked:', order)}
        />
      </div>
    </div>
  );
};

export default Orders;
