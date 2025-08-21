import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { DataMerger } from '../api/merge';
import { OrderModal } from './OrderModal';
import { ConfirmationModal } from './ConfirmationModal';
import { tradingApi } from '../api/trading';

const Positions: React.FC = () => {
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isSquareOffModalOpen, setIsSquareOffModalOpen] = useState(false);
  const [isBulkSquareOffModalOpen, setIsBulkSquareOffModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { data: positions = [], isLoading: queryLoading, error } = useQuery({
    queryKey: ['positions'],
    queryFn: () => api.fetch('/positions'),
    refetchInterval: 5000,
  });

  // Type assertion for positions data
  const typedPositions = positions as any[];

  const handleSquareOff = async (position: any) => {
    setSelectedPosition(position);
    setIsSquareOffModalOpen(true);
  };

  const handleBulkSquareOff = () => {
    setIsBulkSquareOffModalOpen(true);
  };

  const handlePlaceOrder = (position?: any) => {
    if (position) {
      setSelectedPosition(position);
    }
    setIsOrderModalOpen(true);
  };

  const executeSquareOff = async () => {
    if (!selectedPosition) return;
    
    setIsLoading(true);
    try {
      const response = await tradingApi.squareoffPosition(selectedPosition.id);
      if ((response as any).ok) {
        // Refresh positions data
        window.location.reload();
      }
    } catch (error) {
      console.error('Square-off failed:', error);
    } finally {
      setIsLoading(false);
      setIsSquareOffModalOpen(false);
    }
  };

  const executeBulkSquareOff = async () => {
    setIsLoading(true);
    try {
      const response = await tradingApi.squareoffAllPositions(true);
      if ((response as any).ok) {
        // Refresh positions data
        window.location.reload();
      }
    } catch (error) {
      console.error('Bulk square-off failed:', error);
    } finally {
      setIsLoading(false);
      setIsBulkSquareOffModalOpen(false);
    }
  };

  const handleOrderPlaced = (orderId: string) => {
    console.log('Order placed successfully:', orderId);
    // You can add a toast notification here
  };

  if (queryLoading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/10 rounded-xl w-1/3"></div>
          <div className="h-4 bg-white/10 rounded w-1/2"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-white/10 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 backdrop-blur-xl rounded-3xl border border-red-400/20 p-8 text-center">
        <div className="text-red-400 text-xl mb-2">⚠️</div>
        <h3 className="text-red-300 text-lg font-semibold mb-2">Failed to load positions</h3>
        <p className="text-red-200 text-sm">Please check your connection and try again</p>
      </div>
    );
  }

  if (!typedPositions || typedPositions.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 text-center">
        <div className="text-blue-400 text-4xl mb-4">📊</div>
        <h3 className="text-white text-xl font-semibold mb-2">No Open Positions</h3>
        <p className="text-blue-200 text-sm mb-6">Start trading to see your positions here</p>
        <button
          onClick={() => handlePlaceOrder()}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Place New Order
        </button>
      </div>
    );
  }

  const totalPositions = typedPositions.length;
  const totalValue = typedPositions.reduce((sum: number, pos: any) => sum + (pos.qty * pos.ltp), 0);
  const totalPnL = typedPositions.reduce((sum: number, pos: any) => sum + (pos.unrealized || 0), 0);

  return (
    <>
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
        {/* Header Summary */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Current Positions</h2>
            <p className="text-blue-200">Real-time position tracking and management</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handlePlaceOrder()}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              📈 Place Order
            </button>
            <button
              onClick={handleBulkSquareOff}
              className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-4 py-2 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              🚨 Square All
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-xl rounded-2xl border border-blue-400/30 p-6"
          >
            <div className="text-blue-300 text-sm font-medium mb-2">Total Positions</div>
            <div className="text-3xl font-bold text-white">{totalPositions}</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-xl rounded-2xl border border-green-400/30 p-6"
          >
            <div className="text-green-300 text-sm font-medium mb-2">Portfolio Value</div>
            <div className="text-3xl font-bold text-white">₹{totalValue.toLocaleString()}</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`bg-gradient-to-br backdrop-blur-xl rounded-2xl border p-6 ${
              totalPnL >= 0 
                ? 'from-green-500/20 to-green-600/20 border-green-400/30' 
                : 'from-red-500/20 to-red-600/20 border-red-400/30'
            }`}
          >
            <div className={`text-sm font-medium mb-2 ${
              totalPnL >= 0 ? 'text-green-300' : 'text-red-300'
            }`}>
              Total P&L
            </div>
            <div className={`text-3xl font-bold ${
              totalPnL >= 0 ? 'text-green-300' : 'text-red-300'
            }`}>
              ₹{totalPnL.toLocaleString()}
            </div>
          </motion.div>
        </div>

        {/* Positions Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-4 px-4 text-blue-200 font-semibold">Symbol</th>
                <th className="text-left py-4 px-4 text-blue-200 font-semibold">Side</th>
                <th className="text-left py-4 px-4 text-blue-200 font-semibold">Quantity</th>
                <th className="text-left py-4 px-4 text-blue-200 font-semibold">Avg Price</th>
                <th className="text-left py-4 px-4 text-blue-200 font-semibold">LTP</th>
                <th className="text-left py-4 px-4 text-blue-200 font-semibold">P&L</th>
                <th className="text-left py-4 px-4 text-blue-200 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {typedPositions.map((position: any, index: number) => (
                <motion.tr
                  key={position.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200"
                >
                  <td className="py-4 px-4">
                    <div className="font-semibold text-white">{position.symbol}</div>
                    <div className="text-sm text-blue-200">{position.exchange}</div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      position.side === 'LONG' 
                        ? 'bg-green-500/20 text-green-300 border border-green-400/30' 
                        : 'bg-red-500/20 text-red-300 border border-red-400/30'
                    }`}>
                      {position.side}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-white font-medium">{position.qty}</td>
                  <td className="py-4 px-4 text-white">₹{position.avg_price}</td>
                  <td className="py-4 px-4 text-white">₹{position.ltp}</td>
                  <td className="py-4 px-4">
                    <span className={`font-medium ${
                      (position.unrealized || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ₹{(position.unrealized || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSquareOff(position)}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded-lg text-sm transition-all duration-200 border border-red-400/30 hover:border-red-400/50"
                      >
                        Square Off
                      </button>
                      <button
                        onClick={() => handlePlaceOrder(position)}
                        className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-3 py-1 rounded-lg text-sm transition-all duration-200 border border-blue-400/30 hover:border-blue-400/50"
                      >
                        Modify
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Modal */}
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        symbol={selectedPosition?.symbol}
        side={selectedPosition?.side}
        onOrderPlaced={handleOrderPlaced}
      />

      {/* Square Off Confirmation Modal */}
      <ConfirmationModal
        isOpen={isSquareOffModalOpen}
        onClose={() => setIsSquareOffModalOpen(false)}
        onConfirm={executeSquareOff}
        title="Confirm Square Off"
        message={`Are you sure you want to square off ${selectedPosition?.qty} shares of ${selectedPosition?.symbol}? This action cannot be undone.`}
        confirmText="Square Off"
        cancelText="Cancel"
        type="danger"
        isLoading={isLoading}
      />

      {/* Bulk Square Off Confirmation Modal */}
      <ConfirmationModal
        isOpen={isBulkSquareOffModalOpen}
        onClose={() => setIsBulkSquareOffModalOpen(false)}
        onConfirm={executeBulkSquareOff}
        title="Confirm Bulk Square Off"
        message={`Are you sure you want to square off ALL ${totalPositions} positions? This is a critical action that will close all your open positions.`}
        confirmText="Square All Positions"
        cancelText="Cancel"
        type="danger"
        isLoading={isLoading}
      />
    </>
  );
};

export default Positions;
