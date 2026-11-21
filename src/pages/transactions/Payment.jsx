import { useState } from "react";
import {
  ArrowLeft,
  Store,
  Hash,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  LoaderCircle,
  FileText
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { saveTransaction } from "../../services/transactionService";

import "./Payment.css";

export default function Payment({ onBack }) {
  const { user } = useAuth();
  console.log("Payment authenticated user:", user);
  console.log("Payment user UID:", user?.uid);
  const [merchant, setMerchant] = useState("");
  const [merchantNumber, setMerchantNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [transactionId, setTransactionId] = useState("");

  const handleContinue = (e) => {
    e.preventDefault();
    setError("");

    if (!merchant.trim()) {
      setError("Enter merchant name.");
      return;
    }

    if (!merchantNumber.trim()) {
      setError("Enter merchant account or number.");
      return;
    }

    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    setStep(2);
  };

  
const handleConfirm = async () => {
  try {
    setError("");

    if (!user?.uid) {
      setError("Please login first.");
      return;
    }

    setLoading(true);

    const result = await saveTransaction({
      userId: user.uid,
      type: "payment",
      merchant,
      merchantNumber,
      amount,
      reference
    });

    setTransactionId(result.id);
    setStep(3);

  } catch (err) {
    console.error("Payment error:", err);
    setError(err.message || "Payment could not be recorded.");
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="payment-page">

      <header className="payment-header">
        <button onClick={onBack} className="payment-back">
          <ArrowLeft size={21} />
        </button>

        <div>
          <h2>Merchant Payment</h2>
          <p>Pay securely with NextPay</p>
        </div>

        <ShieldCheck color="#D9468D" size={25} />
      </header>

      {step === 1 && (
        <form onSubmit={handleContinue}>

          <div className="payment-card">
            <div className="payment-icon">
              <Store size={27} />
            </div>

            <h3>Merchant Information</h3>
            <p>Enter the merchant details for your payment.</p>

            <label>Merchant Name</label>
            <div className="payment-input">
              <Store size={18} />
              <input
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="Enter merchant name"
                required
              />
            </div>

            <label>Merchant Account / Number</label>
            <div className="payment-input">
              <Hash size={18} />
              <input
                value={merchantNumber}
                onChange={(e) => setMerchantNumber(e.target.value)}
                placeholder="Enter merchant number"
                required
              />
            </div>
          </div>

          <div className="payment-card">
            <h3>Payment Details</h3>

            <label>Payment Amount (BDT)</label>

            <div className="payment-amount">
              <span>৳</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <label>Reference (Optional)</label>
            <div className="payment-input">
              <FileText size={18} />
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Payment description"
              />
            </div>
          </div>

          {error && <p className="payment-error">{error}</p>}

          <button type="submit" className="payment-primary">
            Continue <ArrowRight size={19} />
          </button>

        </form>
      )}

      {step === 2 && (
        <div className="payment-card confirmation-card">

          <div className="payment-icon">
            <Wallet size={27} />
          </div>

          <h3>Confirm Payment</h3>
          <p>Review your merchant payment details.</p>

          <div className="payment-summary">
            <div className="payment-summary-row">
              <span>Merchant</span>
              <strong>{merchant}</strong>
            </div>

            <div className="payment-summary-row">
              <span>Merchant Number</span>
              <strong>{merchantNumber}</strong>
            </div>

            <div className="payment-summary-row">
              <span>Reference</span>
              <strong>{reference || "N/A"}</strong>
            </div>
          </div>

          <div className="payment-total">
            <span>Total Payment</span>
            <h2>৳ {Number(amount).toLocaleString("en-US", {
              minimumFractionDigits: 2
            })}</h2>
          </div>

          {error && <p className="payment-error">{error}</p>}

          <button
            className="payment-primary"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle size={19} />
                Processing...
              </>
            ) : (
              <>
                Confirm Payment <ArrowRight size={19} />
              </>
            )}
          </button>

          <button
            className="payment-secondary"
            onClick={() => setStep(1)}
            disabled={loading}
          >
            Edit Details
          </button>

        </div>
      )}

      {step === 3 && (
        <div className="payment-card payment-success">

          <CheckCircle2 size={65} color="#20A574" />

          <h2>Payment Recorded!</h2>
          <p>Your merchant payment has been saved successfully.</p>

          <h1>
            ৳ {Number(amount).toLocaleString("en-US", {
              minimumFractionDigits: 2
            })}
          </h1>

          <div className="payment-summary-row">
            <span>Merchant</span>
            <strong>{merchant}</strong>
          </div>

          <div className="payment-summary-row">
            <span>Merchant Number</span>
            <strong>{merchantNumber}</strong>
          </div>

          <div className="payment-summary-row">
            <span>Transaction ID</span>
            <strong>{transactionId}</strong>
          </div>

          <button className="payment-primary" onClick={onBack}>
            Back to Home
          </button>

        </div>
      )}

    </div>
  );
}
