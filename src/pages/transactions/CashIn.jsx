import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  ShieldCheck,
  CheckCircle2,
  LoaderCircle,
  Wallet
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import {
  CASH_IN_DAILY_LIMIT,
  CASH_IN_MAX_AMOUNT,
  cashIn,
  dhakaDayKey
} from "../../services/walletService";
import { getErrorMessage } from "../../services/profileService";
import { formatTaka } from "../../utils/transactionView";

import "./SendMoney.css";
import "./CashIn.css";

const QUICK_AMOUNTS = [500, 1000, 5000, 10000, 15000];

export default function CashIn({ onBack }) {
  const { wallet } = useAuth();

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const balance = wallet?.balance ?? 0;
  const usedToday = wallet?.cashInDay === dhakaDayKey() ? wallet.cashInCount : 0;
  const left = Math.max(CASH_IN_DAILY_LIMIT - usedToday, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const value = Number(amount);

    if (!Number.isInteger(value) || value < 1) {
      setError("Enter a whole amount of at least ৳1.");
      return;
    }

    if (value > CASH_IN_MAX_AMOUNT) {
      setError(`Maximum per cash in is ৳${CASH_IN_MAX_AMOUNT.toLocaleString("en-US")}.`);
      return;
    }

    try {
      setLoading(true);
      setResult(await cashIn(value));
    } catch (err) {
      console.error("Cash in error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const again = () => {
    setResult(null);
    setAmount("");
  };

  return (
    <div className="send-page">
      <header className="send-header">
        <button onClick={onBack} className="send-back" aria-label="Back">
          <ArrowLeft size={21} />
        </button>

        <div>
          <h2>Cash In</h2>
          <p>Add money to your NextPay wallet</p>
        </div>

        <ShieldCheck color="#D9468D" size={25} />
      </header>

      {!result && (
        <form onSubmit={handleSubmit}>
          <div className="send-card">
            <div className="send-icon">
              <Wallet size={27} />
            </div>

            <h3>Current balance</h3>
            <p>৳ {formatTaka(balance)}</p>

            <label>Amount (BDT)</label>
            <div className="amount-input">
              <span>৳</span>
              <input
                type="number"
                min="1"
                max={CASH_IN_MAX_AMOUNT}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                disabled={left === 0}
                required
              />
            </div>

            <div className="cashin-chips">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setAmount(String(value))}
                  disabled={left === 0}
                >
                  {value.toLocaleString("en-US")}
                </button>
              ))}
            </div>

            <p className="cashin-limit">
              Up to ৳{CASH_IN_MAX_AMOUNT.toLocaleString("en-US")} each time ·{" "}
              {left === 0
                ? "No cash-ins left today. Try again tomorrow."
                : `${left} of ${CASH_IN_DAILY_LIMIT} cash-ins left today`}
            </p>
          </div>

          {error && <p className="send-error">{error}</p>}

          <button className="send-primary" type="submit" disabled={loading || left === 0}>
            {loading ? (
              <><LoaderCircle size={19} /> Adding money...</>
            ) : (
              <><Plus size={19} /> Add money</>
            )}
          </button>
        </form>
      )}

      {result && (
        <div className="send-card success-card">
          <CheckCircle2 size={65} color="#20A574" />

          <h2>Money Added!</h2>
          <p>Your cash in was successful.</p>

          <h1>৳ {formatTaka(result.amount)}</h1>

          <div className="summary-row">
            <span>New Balance</span>
            <strong>৳ {formatTaka(result.newBalance)}</strong>
          </div>

          <div className="summary-row">
            <span>Cash-ins left today</span>
            <strong>{result.cashInsLeft}</strong>
          </div>

          <div className="summary-row">
            <span>Transaction ID</span>
            <strong>{result.id}</strong>
          </div>

          {result.cashInsLeft > 0 && (
            <button className="send-secondary" onClick={again}>
              Cash in again
            </button>
          )}

          <button className="send-primary" onClick={onBack} style={{ marginTop: 10 }}>
            Back to Home
          </button>
        </div>
      )}
    </div>
  );
}
