import React from 'react';
import { motion } from 'framer-motion';
import { ConnectionState } from '../api';

interface WebSocketStatusProps {
  connectionState: string;
  rtt: number;
  reconnectAttempts: number;
}

const WebSocketStatus: React.FC<WebSocketStatusProps> = ({ connectionState, rtt, reconnectAttempts }) => {
  const getStatusConfig = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return {
          color: 'from-green-500 to-emerald-600',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-400/30',
          textColor: 'text-green-300',
          icon: '🟢',
          text: 'Connected',
          pulse: true
        };
      case ConnectionState.CONNECTING:
        return {
          color: 'from-blue-500 to-indigo-600',
          bgColor: 'bg-blue-500/20',
          borderColor: 'border-blue-400/30',
          textColor: 'text-blue-300',
          icon: '🔄',
          text: 'Connecting...',
          pulse: true
        };
      case ConnectionState.RECONNECTING:
        return {
          color: 'from-yellow-500 to-orange-600',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-400/30',
          textColor: 'text-yellow-300',
          icon: '🔄',
          text: `Reconnecting (${reconnectAttempts})`,
          pulse: true
        };
      case ConnectionState.OFFLINE:
        return {
          color: 'from-red-500 to-pink-600',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-400/30',
          textColor: 'text-red-300',
          icon: '🔴',
          text: 'Offline',
          pulse: false
        };
      default:
        return {
          color: 'from-gray-500 to-slate-600',
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-400/30',
          textColor: 'text-gray-300',
          icon: '⚪',
          text: 'Unknown',
          pulse: false
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`relative group overflow-hidden bg-gradient-to-r ${statusConfig.color} backdrop-blur-xl rounded-2xl px-4 py-3 border ${statusConfig.borderColor} shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative flex items-center space-x-3">
        {/* Status Icon */}
        <div className={`w-3 h-3 bg-gradient-to-br ${statusConfig.color} rounded-full ${statusConfig.pulse ? 'animate-pulse' : ''}`}></div>
        
        {/* Status Text */}
        <div className="flex flex-col">
          <span className={`text-sm font-semibold ${statusConfig.textColor}`}>
            {statusConfig.text}
          </span>
          {connectionState === ConnectionState.CONNECTED && (
            <span className="text-xs text-green-200">
              RTT: {rtt}ms
            </span>
          )}
        </div>
        
        {/* Connection Quality Indicator */}
        {connectionState === ConnectionState.CONNECTED && (
          <div className="ml-2">
            <div className="flex space-x-1">
              {[1, 2, 3].map((bar) => (
                <div
                  key={bar}
                  className={`w-1 h-${bar} bg-green-400 rounded-full ${
                    rtt < 100 ? 'opacity-100' : rtt < 200 ? 'opacity-70' : 'opacity-40'
                  }`}
                ></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default WebSocketStatus;
