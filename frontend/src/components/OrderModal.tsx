import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { tradingApi } from '../api/trading';
import type { OrderData } from '../api/trading';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol?: string;
  side?: 'LONG' | 'SHORT';
  onOrderPlaced?: (orderId: string) => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({ 
  isOpen, 
  onClose, 
  symbol = '', 
  side = 'LONG',
  onOrderPlaced 
}) => {
  const [formData, setFormData] = useState<OrderData>({
    symbol: symbol,
    side: side,
    type: 'MARKET',
    quantity: 0,
    price: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate form data
      if (!formData.symbol || formData.quantity <= 0) {
        throw new Error('Please fill in all required fields');
      }

      if (formData.type === 'LIMIT' && (!formData.price || formData.price <= 0)) {
        throw new Error('Price is required for limit orders');
      }

      // Place order
      const response = await tradingApi.placeOrder(formData);
      
      if ((response as any).ok && (response as any).data) {
        onOrderPlaced?.((response as any).data.order_id);
        onClose();
      } else {
        throw new Error((response as any).error?.message || 'Failed to place order');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof OrderData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Place New Order</h2>
            <p className="text-blue-200">Enter order details to execute trade</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Symbol */}
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Symbol *
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => handleInputChange('symbol', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter symbol (e.g., RELIANCE)"
                required
              />
            </div>

            {/* Side Selection */}
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Side *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleInputChange('side', 'LONG')}
                  className={`px-4 py-3 rounded-xl border transition-all duration-200 ${
                    formData.side === 'LONG'
                      ? 'bg-green-500/20 border-green-400/40 text-green-300'
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                  }`}
                >
                  LONG
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('side', 'SHORT')}
                  className={`px-4 py-3 rounded-xl border transition-all duration-200 ${
                    formData.side === 'SHORT'
                      ? 'bg-red-500/20 border-red-400/40 text-red-300'
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                  }`}
                >
                  SHORT
                </button>
              </div>
            </div>

            {/* Order Type */}
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Order Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
                <option value="STOP">Stop Loss</option>
                <option value="STOP_LIMIT">Stop Limit</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter quantity"
                min="1"
                required
              />
            </div>

            {/* Price (for Limit orders) */}
            {formData.type === 'LIMIT' && (
              <div>
                <label className="block text-sm font-medium text-blue-200 mb-2">
                  Price *
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter price"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3 text-red-300 text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl border border-white/20 transition-all duration-200"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Placing...
                  </div>
                ) : (
                  'Place Order'
                )}
              </button>
            </div>
          </form>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
