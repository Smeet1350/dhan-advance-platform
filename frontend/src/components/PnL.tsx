import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePnL, useWebSocket } from '../api';
import { DataMerger } from '../api/merge';
import type { PnL as PnLType, PnLSymbol } from '../api';
import type { PnLUpdate } from '../api/merge';

const PnL: React.FC = () => {
  const { data: pnlData, isLoading, error, refetch } = usePnL();
  const [livePnL, setLivePnL] = useState<PnLType | null>(null);
  const [lastSequence, setLastSequence] = useState(0);

  const { connectionState, sendResume } = useWebSocket((message) => {
    if (message.type === 'pnl.update') {
      const update = message as PnLUpdate;
      if (update.seq > lastSequence) {
        if (livePnL) {
          const updated = DataMerger.updatePnL(livePnL, update);
          setLivePnL(updated);
        } else if (pnlData) {
          const updated = DataMerger.updatePnL(pnlData, update);
          setLivePnL(updated);
        }
        setLastSequence(update.seq);
      }
    }
  });

  useEffect(() => {
    if (pnlData && !livePnL) {
      setLivePnL(pnlData);
    }
  }, [pnlData, livePnL]);

  useEffect(() => {
    if (connectionState === 'connected' && lastSequence > 0) {
      sendResume(lastSequence);
    }
  }, [connectionState, lastSequence, sendResume]);

  const displayData = livePnL || pnlData;

  if (isLoading) {
    return (
      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
        <div className="relative animate-pulse">
          <div className="h-8 bg-white/20 rounded-2xl mb-6 w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-white/20 rounded-2xl"></div>
            ))}
          </div>
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
          <h3 className="text-2xl font-bold text-white mb-3">Error Loading P&L Data</h3>
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

  if (!displayData) {
    return (
      <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-500/5 to-blue-500/5"></div>
        <div className="relative text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">No P&L Data Available</h3>
          <p className="text-blue-200">Start trading to see your profit and loss information.</p>
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

  const getPnLBackground = (value: number) => {
    if (value > 0) return 'bg-green-500/20 border-green-400/40';
    if (value < 0) return 'bg-red-500/20 border-red-400/40';
    return 'bg-blue-500/20 border-blue-400/40';
  };

  return (
    <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5"></div>
      
      {/* Header */}
      <div className="relative bg-gradient-to-r from-white/20 to-white/10 px-8 py-6 border-b border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Portfolio P&L</h2>
            <p className="text-blue-200">
              Last updated: {displayData.updatedAt ? new Date(displayData.updatedAt).toLocaleString('en-IN', { 
                timeZone: 'Asia/Kolkata',
                dateStyle: 'medium',
                timeStyle: 'short'
              }) : 'N/A'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-200 mb-1">Trading Day</p>
            <p className="text-xl font-semibold text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {displayData.tradingDay}
            </p>
          </div>
        </div>
      </div>

      {/* P&L Summary Cards */}
      <div className="relative p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`group relative overflow-hidden bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-xl rounded-2xl p-6 border ${getPnLBackground(displayData.totals.realized)} shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-blue-200">Realized P&L</h3>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className={`text-3xl font-bold ${getPnLColor(displayData.totals.realized)}`}>
              {formatCurrency(displayData.totals.realized)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`group relative overflow-hidden bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 backdrop-blur-xl rounded-2xl p-6 border ${getPnLBackground(displayData.totals.unrealized)} shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-yellow-200">Unrealized P&L</h3>
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className={`text-3xl font-bold ${getPnLColor(displayData.totals.unrealized)}`}>
              {formatCurrency(displayData.totals.unrealized)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`group relative overflow-hidden bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-xl rounded-2xl p-6 border ${getPnLBackground(displayData.totals.day)} shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-purple-200">Day P&L</h3>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className={`text-3xl font-bold ${getPnLColor(displayData.totals.day)}`}>
              {formatCurrency(displayData.totals.day)}
            </p>
          </motion.div>
        </div>

        {/* Symbol-wise P&L Table */}
        <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-white/10 to-white/5 border-b border-white/20">
            <h3 className="text-xl font-semibold text-white">Symbol-wise P&L</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/20">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Symbol</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Side</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Avg Price</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">LTP</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Unrealized P&L</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-blue-200 uppercase tracking-wider">Today P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                <AnimatePresence>
                  {displayData.perSymbol.map((symbol: PnLSymbol, index: number) => (
                    <motion.tr
                      key={symbol.symbol}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="hover:bg-white/5 transition-all duration-200 group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white group-hover:text-blue-200 transition-colors">
                          {symbol.symbol}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          symbol.side === 'LONG'
                            ? 'bg-green-500/20 text-green-300 border border-green-400/40'
                            : 'bg-red-500/20 text-red-300 border border-red-400/40'
                        }`}>
                          {symbol.side}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                        {symbol.qty.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                        {formatCurrency(symbol.avg)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-200">
                        {formatCurrency(symbol.ltp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getPnLColor(symbol.unrealized)}`}>
                          {formatCurrency(symbol.unrealized)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getPnLColor(symbol.today_pnl)}`}>
                          {formatCurrency(symbol.today_pnl)}
                        </span>
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

export default PnL;
