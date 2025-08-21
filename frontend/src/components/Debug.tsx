import { useState } from "react";
import { api } from "../api";

export default function Debug() {
  const [status, setStatus] = useState<string>("Ready to test");
  const [data, setData] = useState<any>(null);

  const testAPI = async () => {
    try {
      setStatus("Testing API connection...");
      const response = await api.fetch("/healthz");
      setStatus("API connected successfully!");
      setData(response);
    } catch (error: any) {
      setStatus(`API Error: ${error.message}`);
      console.error("Debug API Error:", error);
    }
  };

  const testHoldings = async () => {
    try {
      setStatus("Testing holdings endpoint...");
      const response = await api.holdings();
      setStatus("Holdings fetched successfully!");
      setData(response);
    } catch (error: any) {
      setStatus(`Holdings Error: ${error.message}`);
      console.error("Debug Holdings Error:", error);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-4">
      <h2 className="text-2xl font-semibold mb-4">Debug Panel</h2>
      <div className="space-y-4">
        <div>
          <button 
            onClick={testAPI}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mr-2"
          >
            Test API Connection
          </button>
          <button 
            onClick={testHoldings}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
          >
            Test Holdings
          </button>
        </div>
        <div className="text-sm">
          <div className="mb-2">Status: <span className="text-yellow-400">{status}</span></div>
          {data && (
            <div>
              <div className="mb-2">Response:</div>
              <pre className="bg-gray-700 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
