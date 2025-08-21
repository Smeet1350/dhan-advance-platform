import './App.css';
import WebSocketStatus from './components/WebSocketStatus';
import PnL from './components/PnL';
import Positions from './components/Positions';
import Holdings from './components/Holdings';
import Orders from './components/Orders';
import Trades from './components/Trades';
import DebugPanel from './components/DebugPanel';
import { useWebSocket, ConnectionState } from './api';

function App() {
  const { connectionState, rtt, reconnectAttempts } = useWebSocket((message) => {
    console.log('WebSocket message received:', message);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse-slow" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Header with Glassmorphism */}
      <header className="relative bg-white/10 backdrop-blur-xl border-b border-white/20 shadow-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Dhan Advance Platform
                  </h1>
                  <p className="text-blue-200 text-sm">Professional Trading Automation</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 backdrop-blur-sm rounded-full border border-green-500/30">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-300">Live Trading</span>
              </div>
            </div>
            
            <WebSocketStatus
              connectionState={connectionState}
              rtt={rtt}
              reconnectAttempts={reconnectAttempts}
            />
          </div>
          
          {/* Enhanced KPI Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-8">
            <div className="group relative overflow-hidden bg-gradient-to-br from-blue-600/20 to-blue-700/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm font-medium mb-1">Total P&L</p>
                  <p className="text-3xl font-bold text-white">₹6,89,100</p>
                  <p className="text-blue-300 text-xs mt-1">+12.5% today</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="group relative overflow-hidden bg-gradient-to-br from-green-600/20 to-green-700/20 backdrop-blur-xl rounded-2xl p-6 border border-green-500/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-green-200 text-sm font-medium mb-1">Realized P&L</p>
                  <p className="text-3xl font-bold text-white">₹0</p>
                  <p className="text-green-300 text-xs mt-1">No closed positions</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="group relative overflow-hidden bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 backdrop-blur-xl rounded-2xl p-6 border border-yellow-500/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-yellow-200 text-sm font-medium mb-1">Unrealized P&L</p>
                  <p className="text-3xl font-bold text-white">₹6,89,100</p>
                  <p className="text-yellow-300 text-xs mt-1">Live updates</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="group relative overflow-hidden bg-gradient-to-br from-purple-600/20 to-purple-700/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm font-medium mb-1">Day P&L</p>
                  <p className="text-3xl font-bold text-white">₹6,89,100</p>
                  <p className="text-purple-300 text-xs mt-1">Session performance</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Connection Status Banners with Glassmorphism */}
      {connectionState === ConnectionState.RECONNECTING && (
        <div className="relative bg-gradient-to-r from-yellow-600/20 to-orange-600/20 backdrop-blur-xl border border-yellow-500/30 px-4 py-3 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-yellow-200 font-medium">🔄 Reconnecting to server... Attempt {reconnectAttempts}/10</span>
          </div>
        </div>
      )}

      {connectionState === ConnectionState.OFFLINE && (
        <div className="relative bg-gradient-to-r from-red-600/20 to-pink-600/20 backdrop-blur-xl border border-red-500/30 px-4 py-3 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-red-400 rounded-full animate-pulse"></div>
            <span className="text-red-200 font-medium">❌ Connection lost. Using fallback polling mode.</span>
          </div>
        </div>
      )}

      {/* Main Content Area with Glassmorphism */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* P&L Section */}
        <div className="animate-fade-in">
          <PnL />
        </div>

        {/* Data Tables Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Positions - Full Width */}
          <div className="xl:col-span-2 animate-slide-up" style={{animationDelay: '0.1s'}}>
            <Positions />
          </div>

          {/* Holdings */}
          <div className="animate-slide-up" style={{animationDelay: '0.2s'}}>
            <Holdings />
          </div>

          {/* Orders */}
          <div className="animate-slide-up" style={{animationDelay: '0.3s'}}>
            <Orders />
          </div>

          {/* Trades - Full Width */}
          <div className="xl:col-span-2 animate-slide-up" style={{animationDelay: '0.4s'}}>
            <Trades />
          </div>
        </div>
      </main>

      {/* Footer with Glassmorphism */}
      <footer className="relative bg-white/5 backdrop-blur-xl border-t border-white/20 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div className="text-blue-200 text-sm">
              © 2024 Dhan Advance Platform. Built with FastAPI, React, and WebSocket.
            </div>
            <div className="flex space-x-6 text-blue-200 text-sm">
              <a href="#" className="hover:text-white transition-colors duration-200">Documentation</a>
              <a href="#" className="hover:text-white transition-colors duration-200">Support</a>
              <a href="#" className="hover:text-white transition-colors duration-200">API</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Debug Panel */}
      <DebugPanel />
    </div>
  );
}

export default App;
