import Holdings from "./components/Holdings";
import Positions from "./components/Positions";
import Orders from "./components/Orders";
import Trades from "./components/Trades";
import PnL from "./components/PnL";
import Debug from "./components/Debug";

function App() {
  return (
    <div className="p-4 space-y-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-4xl font-bold">Dhan Dashboard</h1>
      <Debug />
      <PnL />
      <Holdings />
      <Positions />
      <Orders />
      <Trades />
    </div>
  );
}

export default App;
