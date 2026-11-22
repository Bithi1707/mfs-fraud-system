
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SendMoney from "./pages/transactions/SendMoney";
import Payment from "./pages/transactions/Payment";
import Profile from "./pages/Profile";
import History from "./pages/History";
import CashIn from "./pages/transactions/CashIn";

function SendMoneyRoute() {
  const navigate = useNavigate();

  return (
    <ProtectedRoute>
      <SendMoney onBack={() => navigate("/")} />
    </ProtectedRoute>
  );
}

function CashInRoute() {
  const navigate = useNavigate();

  return (
    <ProtectedRoute>
      <CashIn onBack={() => navigate("/")} />
    </ProtectedRoute>
  );
}

function PaymentRoute() {
  const navigate = useNavigate();

  return (
    <ProtectedRoute>
      <Payment onBack={() => navigate("/")} />
    </ProtectedRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route
            path="/send-money"
            element={<SendMoneyRoute />}
          />

          <Route path="/cash-in" element={<CashInRoute />} />

          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/payment"
            element={<PaymentRoute />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
