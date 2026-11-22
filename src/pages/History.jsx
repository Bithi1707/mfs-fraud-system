import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  ShoppingBag,
  LoaderCircle
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useTransactions } from "../hooks/useTransactions";
import {
  describeTransaction,
  formatDateTime,
  formatTaka
} from "../utils/transactionView";

import "./Home.css";
import "./History.css";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "in", label: "Money in" },
  { id: "out", label: "Money out" }
];

export default function History() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { transactions, loading, error } = useTransactions(user?.uid);
  const [filter, setFilter] = useState("all");

  const rows = transactions
    .map((item) => ({ item, view: describeTransaction(item, user?.uid) }))
    .filter(({ view }) => filter === "all" || view.direction === filter);

  return (
    <div className="hist-page">
      <header className="hist-header">
        <button
          className="hist-back"
          onClick={() => navigate("/")}
          aria-label="Back to home"
        >
          <ArrowLeft size={21} />
        </button>

        <div>
          <h2>Transaction History</h2>
          <p>{transactions.length} total</p>
        </div>
      </header>

      <div className="hist-filters" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            className={filter === f.id ? "active" : ""}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="hist-error">{error}</p>}

      <div className="transaction-list">
        {loading ? (
          <div className="empty-state">
            <LoaderCircle size={18} className="hist-spin" /> Loading...
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state">No transactions here yet.</div>
        ) : (
          rows.map(({ item, view }) => {
            const incoming = view.direction === "in";

            return (
              <div className="transaction-item" key={item.id}>
                <div className={`transaction-icon ${view.kind}`}>
                  {view.kind === "receive" ? (
                    <ArrowDownLeft size={21} />
                  ) : view.kind === "send" ? (
                    <ArrowUpRight size={21} />
                  ) : view.kind === "cashout" ? (
                    <Banknote size={20} />
                  ) : (
                    <ShoppingBag size={20} />
                  )}
                </div>

                <div className="transaction-info">
                  <h4>{view.title}</h4>
                  <p>{view.detail}</p>
                  <small>{formatDateTime(item)}</small>
                </div>

                <div className="transaction-amount">
                  <strong className={incoming ? "credit" : ""}>
                    {incoming ? "+" : "-"} ৳{formatTaka(item.amount)}
                  </strong>
                  <span>
                    {item.status === "COMPLETED" ? "Completed" : "Submitted"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
