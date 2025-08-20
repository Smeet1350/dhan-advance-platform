import { useState } from "react";
import Holdings from "./components/Holdings";
import Positions from "./components/Positions";
import Orders from "./components/Orders";
import Trades from "./components/Trades";
import PnL from "./components/PnL";
import Debug from "./components/Debug";
import WebSocketStatus from "./components/WebSocketStatus";
import DebugPanel from "./components/DebugPanel";
import { useDebugPanel } from "./hooks/useDebugPanel";

function App() {
  const { isVisible, toggleDebugPanel, closeDebugPanel } = useDebugPanel();

  return (
    <div className="p-4 space-y-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-4xl font-bold">Dhan Dashboard</h1>
      
      {/* Debug Panel Toggle Button */}
      <div className="flex justify-end">
        <button
          onClick={toggleDebugPanel}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium flex items-center space-x-2"
        >
          <span>🐛</span>
          <span>Debug Panel</span>
          <span className="text-xs text-gray-400">(Ctrl+D)</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Debug />
        <WebSocketStatus />
      </div>
      <PnL />
      <Holdings />
      <Positions />
      <Orders />
      <Trades />
      
      {/* Debug Panel */}
      <DebugPanel isVisible={isVisible} onClose={closeDebugPanel} />
    </div>
  );
}

export default App;
