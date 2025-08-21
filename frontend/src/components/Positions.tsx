import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePositions, useWebSocket } from '../api';
import { DataMerger } from '../api/merge';
import type { Position } from '../api';
import type { PositionsDelta } from '../api/merge';

const Positions: React.FC = () => {
  const { data: positionsData, isLoading, error, refetch } = usePositions();
  const [livePositions, setLivePositions] = useState<Position[]>([]);
  const [lastSequence, setLastSequence] = useState(0);

  const { connectionState, sendResume } = useWebSocket((message) => {
    if (message.type === 'positions.delta') {
      const update = message as PositionsDelta;
      if (update.seq > lastSequence) {
        if (livePositions.length > 0) {
          const updated = DataMerger.mergePositions(livePositions, update);
          setLivePositions(updated);
        } else if (positionsData) {
          const updated = DataMerger.mergePositions(positionsData, update);
          setLivePositions(updated);
        }
        setLastSequence(update.seq);
      }
    }
  });

  useEffect(() => {
    if (positionsData && livePositions.length === 0) {
      setLivePositions(positionsData);
    }
  }, [positionsData, livePositions]);

  useEffect(() => {
    if (connectionState === 'connected' && lastSequence > 0) {
      sendResume(lastSequence);
    }
  }, [connectionState, lastSequence, sendResume]);

  const displayData = livePositions.length > 0 ? livePositions : positionsData;

  if (isLoading) {
    return (
      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5"></div>
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
          <h3 className="text-2xl font-bold text-white mb-3">Error Loading Positions</h3>
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

  if (!displayData || displayData.length === 0) {
    return (
      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-500/5 to-blue-500/5"></div>
        <div className="relative text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">No Open Positions</h3>
          <p className="text-blue-200">Start trading to see your current positions.</p>
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

  const getPnLColor = (value: number) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-blue-200';
  };

  const getSideColor = (side: string) => {
    return side === 'LONG' 
      ? 'bg-green-500/20 text-green-300 border-green-400/40' 
      : 'bg-red-500/20 text-red-300 border-red-400/40';
  };

  const totalUnrealizedPnL = displayData.reduce((sum, pos) => sum + (pos.unrealized || 0), 0);
  const totalQuantity = displayData.reduce((sum, pos) => sum + pos.qty, 0);
  const longPositions = displayData.filter(pos => pos.side === 'LONG').length;
  const shortPositions = displayData.filter(pos => pos.side === 'SHORT').length;

  return (
    <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-blue-500/5 to-purple-500/5"></div>
      
      {/* Header with Summary Stats */}
      <div className="relative bg-gradient-to-r from-white/20 to-white/10 px-8 py-6 border-b border-white/20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Current Positions</h2>
            <p className="text-blue-200">
              {displayData.length} active position{displayData.length !== 1 ? 's' : ''} • Real-time updates
            </p>
          </div>
          
          {/* Summary Stats */}
          <div className="flex flex-wrap gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <p className="text-xs text-blue-200 mb-1">Total P&L</p>
              <p className={`text-lg font-bold ${getPnLColor(totalUnrealizedPnL)}`}>
                {formatCurrency(totalUnrealizedPnL)}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <p className="text-xs text-blue-200 mb-1">Total Qty</p>
              <p className="text-lg font-bold text-white">{totalQuantity.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
              <p className="text-xs text-blue-200 mb-1">Long/Short</p>
              <p className="text-lg font-bold text-white">{longPositions}/{shortPositions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="relative p-8">
        <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/20">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Symbol</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Side</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Avg Price</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">LTP</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Unrealized P&L</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                <AnimatePresence>
                  {displayData.map((position: Position, index: number) => (
                    <motion.tr
                      key={position.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="hover:bg-white/5 transition-all duration-200 group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white group-hover:text-blue-200 transition-colors">
                          {position.symbol}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getSideColor(position.side)}`}>
                          {position.side}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                        {position.qty.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                        {formatCurrency(position.avg_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                        {formatCurrency(position.ltp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getPnLColor(position.unrealized || 0)}`}>
                          {formatCurrency(position.unrealized || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105">
                            Square Off
                          </button>
                          <button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105">
                            Modify
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Positions;
