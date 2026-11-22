import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Phone,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  LoaderCircle,
  KeyRound
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { sendMoney } from "../../services/walletService";
import { PIN_LENGTH, getErrorMessage } from "../../services/profileService";
import { formatTaka } from "../../utils/transactionView";

import "./SendMoney.css";

export default function SendMoney({ onBack }) {
  const { user, profile, wallet } = useAuth();
  const navigate = useNavigate();
  const balance = wallet?.balance ?? 0;

  const [pin, setPin] = useState("");
  const [phone, setPhone] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [transactionId, setTransactionId] = useState("");

  const handleContinue = (e) => {
    e.preventDefault();
    setError("");

    if (!/^01[3-9]\d{8}$/.test(phone)) {
      setError("Enter a valid Bangladesh mobile number.");
      return;
    }

    if (!Number.isInteger(Number(amount)) || Number(amount) < 1) {
      setError("Enter a whole amount of at least ৳1.");
      return;
    }

    if (Number(amount) > balance) {
      setError("Insufficient balance. Use Cash In to add money first.");
      return;
    }

    if (!recipient.trim()) {
      setError("Enter recipient name.");
      return;
    }

    setStep(2);
  };

  

const handleConfirm = async () => {
  try {
    setLoading(true);
    setError("");

    if (!user?.uid) {
      throw new Error("Please login first.");
    }

    const result = await sendMoney({
      recipientPhone: phone,
      recipientName: recipient,
      amount: Number(amount),
      pin,
      reference
    });

    setTransactionId(result.id);
    setPin("");
    setStep(3);

  } catch (err) {
    console.error("Transaction Error:", err);
    setError(getErrorMessage(err));
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="send-page">

      <header className="send-header">
        <button onClick={onBack} className="send-back">
          <ArrowLeft size={21} />
        </button>

        <div>
          <h2>Send Money</h2>
          <p>Transfer securely with NextPay</p>
        </div>

        <ShieldCheck color="#D9468D" size={25} />
      </header>

      {step === 1 && (
        <form onSubmit={handleContinue}>

          <div className="send-card">
            <div className="send-icon">
              <User size={27} />
            </div>

            <h3>Recipient Information</h3>
            <p>Who would you like to send money to?</p>

            <label>Recipient Mobile Number</label>
            <div className="send-input">
              <Phone size={18} />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                maxLength={11}
                inputMode="numeric"
                required
              />
            </div>

            <label>Recipient Name</label>
            <div className="send-input">
              <User size={18} />
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Enter recipient name"
                required
              />
            </div>
          </div>

          <div className="send-card">
            <h3>Transfer Amount</h3>
            <p>Available balance: ৳ {formatTaka(balance)}</p>

            <label>Amount (BDT)</label>

            <div className="amount-input">
              <span>৳</span>
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <label>Reference (Optional)</label>
            <input
              className="reference-input"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="What's this transfer for?"
            />
          </div>

          {error && <p className="send-error">{error}</p>}

          <button type="submit" className="send-primary">
            Continue <ArrowRight size={19} />
          </button>

        </form>
      )}

      {step === 2 && (
        <div className="send-card confirmation-card">
          <div className="send-icon">
            <Wallet size={27} />
          </div>

          <h3>Confirm Transfer</h3>
          <p>Please review your transaction details.</p>

          <div className="summary-row">
            <span>Recipient</span>
            <strong>{recipient}</strong>
          </div>

          <div className="summary-row">
            <span>Mobile Number</span>
            <strong>{phone}</strong>
          </div>

          <div className="summary-row">
            <span>Reference</span>
            <strong>{reference || "N/A"}</strong>
          </div>

          <div className="summary-total">
            <span>Transfer Amount</span>
            <h2>৳ {Number(amount).toLocaleString("en-US")}</h2>
          </div>

          <label>Transaction PIN</label>
          <div className="send-input">
            <KeyRound size={18} />
            <input
              type="password"
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))
              }
              placeholder={`Enter your ${PIN_LENGTH}-digit PIN`}
              inputMode="numeric"
              autoComplete="off"
              maxLength={PIN_LENGTH}
            />
          </div>

          {profile && !profile.hasPin && (
            <p className="send-error">
              You haven't set a PIN yet.{" "}
              <button
                type="button"
                className="send-linkbtn"
                onClick={() => navigate("/profile")}
              >
                Set it in Profile
              </button>
            </p>
          )}

          {error && <p className="send-error">{error}</p>}

          <button
            className="send-primary"
            onClick={handleConfirm}
            disabled={loading || pin.length !== PIN_LENGTH}
          >
            {loading ? (
              <><LoaderCircle size={19} /> Processing...</>
            ) : (
              <>Confirm Send <ArrowRight size={19} /></>
            )}
          </button>

          <button
            className="send-secondary"
            onClick={() => setStep(1)}
          >
            Edit Details
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="send-card success-card">
          <CheckCircle2 size={65} color="#20A574" />

          <h2>Money Sent!</h2>
          <p>The money has been moved to {recipient}'s wallet.</p>

          <h1>৳ {Number(amount).toLocaleString("en-US")}</h1>

          <div className="summary-row">
            <span>Recipient</span>
            <strong>{recipient}</strong>
          </div>

          <div className="summary-row">
            <span>Mobile</span>
            <strong>{phone}</strong>
          </div>

          <div className="summary-row">
            <span>Transaction ID</span>
            <strong>{transactionId}</strong>
          </div>

          <div className="summary-row">
            <span>New Balance</span>
            <strong>৳ {formatTaka(balance)}</strong>
          </div>

          <button
            className="send-primary"
            onClick={onBack}
          >
            Back to Home
          </button>
        </div>
      )}

    </div>
  );
}
