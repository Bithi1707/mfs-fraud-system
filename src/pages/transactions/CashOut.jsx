
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  LoaderCircle,
  KeyRound,
  UserRound,
  BadgeCheck,
  Banknote,
  LockKeyhole,
  RotateCcw
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { cashOut } from "../../services/walletService";
import { PIN_LENGTH, getErrorMessage } from "../../services/profileService";
import { formatTaka } from "../../utils/transactionView";

import "./CashOut.css";

export default function CashOut({ onBack }) {
  const { user, profile, wallet } = useAuth();
  const navigate = useNavigate();

  const balance = wallet?.balance ?? 0;

  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [agent, setAgent] = useState(null);
  const [transactionId, setTransactionId] = useState("");
  const [newBalance, setNewBalance] = useState(0);

  const handleContinue = async (e) => {
    e.preventDefault();
    setError("");
    setAgent(null);

    if (!/^01[3-9]\d{8}$/.test(phone)) {
      setError("Enter a valid Bangladesh agent mobile number.");
      return;
    }

    if (!Number.isInteger(Number(amount)) || Number(amount) < 1) {
      setError("Enter a whole amount of at least ৳1.");
      return;
    }

    if (Number(amount) > balance) {
      setError("Insufficient balance. Please add money first.");
      return;
    }

    if (!user?.uid) {
      setError("Please login first.");
      return;
    }

    try {
      setLoading(true);

      // Verify agent before showing confirmation.
      const result = await cashOut({
        mode: "verify",
        agentPhone: phone
      });

      setAgent(result.agent);
      setStep(2);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError("");

      if (!user?.uid) {
        throw new Error("Please login first.");
      }

      if (!profile?.hasPin) {
        throw new Error(
          "Set your transaction PIN from the Profile page first."
        );
      }

      const result = await cashOut({
        mode: "submit",
        agentPhone: phone,
        amount: Number(amount),
        pin
      });

      setTransactionId(result.id);
      setNewBalance(result.newBalance);
      setPin("");
      setStep(3);
    } catch (err) {
      console.error("Cash Out Error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/");
    }
  };

  const handleReset = () => {
    setPhone("");
    setAmount("");
    setPin("");
    setAgent(null);
    setTransactionId("");
    setError("");
    setStep(1);
  };

  return (
    <div className="cashout-page">

      {/* HEADER */}
      <header className="cashout-header">
        <button
          onClick={handleBack}
          className="cashout-back"
          aria-label="Go back"
        >
          <ArrowLeft size={21} />
        </button>

        <div className="cashout-header-text">
          <h2>Cash Out</h2>
          <p>Withdraw money securely</p>
        </div>

        <div className="cashout-security">
          <ShieldCheck size={23} />
        </div>
      </header>

      {/* PROGRESS */}
      {step !== 3 && (
        <div className="cashout-progress">
          <div className="cashout-progress-track">
            <div
              className={`cashout-progress-fill ${
                step === 2 ? "step-two" : ""
              }`}
            />
          </div>

          <div className="cashout-progress-labels">
            <span className={step === 1 ? "active" : "completed"}>
              01. Details
            </span>
            <span className={step === 2 ? "active" : ""}>
              02. Confirm
            </span>
          </div>
        </div>
      )}

      {/* STEP 1 */}
      {step === 1 && (
        <form onSubmit={handleContinue}>

          <section className="cashout-hero">
            <div className="cashout-hero-icon">
              <Banknote size={32} />
            </div>

            <div>
              <span className="cashout-eyebrow">NEXT PAY WALLET</span>
              <h1>Cash Out</h1>
              <p>Withdraw your money through a verified NextPay agent.</p>
            </div>
          </section>

          {/* BALANCE */}
          <section className="cashout-balance-card">
            <div className="cashout-balance-top">
              <div className="cashout-balance-icon">
                <Wallet size={19} />
              </div>

              <span>Available Balance</span>

              <ShieldCheck size={18} />
            </div>

            <h2>
              ৳ {formatTaka(balance)}
            </h2>

            <p>Your current wallet balance</p>
          </section>

          {/* AGENT */}
          <section className="cashout-card">

            <div className="cashout-section-title">
              <div className="cashout-section-icon">
                <UserRound size={21} />
              </div>

              <div>
                <h3>Agent Information</h3>
                <p>Enter the registered agent number</p>
              </div>
            </div>

            <label>Agent Mobile Number</label>

            <div className="cashout-input">
              <Phone size={18} />

              <span className="cashout-country-code">+88</span>

              <input
                type="tel"
                value={phone}
                onChange={(e) =>
                  setPhone(
                    e.target.value.replace(/\D/g, "").slice(0, 11)
                  )
                }
                placeholder="01XXXXXXXXX"
                maxLength={11}
                inputMode="numeric"
                autoComplete="off"
                required
              />
            </div>

            <div className="cashout-hint">
              <ShieldCheck size={14} />
              Only active NextPay agents are accepted.
            </div>

          </section>

          {/* AMOUNT */}
          <section className="cashout-card">

            <div className="cashout-section-title">
              <div className="cashout-section-icon amount-icon">
                <Banknote size={21} />
              </div>

              <div>
                <h3>Withdrawal Amount</h3>
                <p>How much would you like to withdraw?</p>
              </div>
            </div>

            <label>Amount (BDT)</label>

            <div className="cashout-amount-input">
              <span>৳</span>

              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
              />
            </div>

            <div className="cashout-quick-amounts">
              {[500, 1000, 2000, 5000].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={Number(amount) === value ? "selected" : ""}
                  onClick={() => setAmount(String(value))}
                >
                  ৳{value.toLocaleString("en-US")}
                </button>
              ))}
            </div>

            <div className="cashout-amount-note">
              <span>Available</span>
              <strong>৳ {formatTaka(balance)}</strong>
            </div>

          </section>

          {error && (
            <div className="cashout-error">
              <ShieldCheck size={17} />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="cashout-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle className="cashout-spinner" size={19} />
                Verifying Agent...
              </>
            ) : (
              <>
                Continue
                <ArrowRight size={19} />
              </>
            )}
          </button>

          <div className="cashout-footer-note">
            <LockKeyhole size={14} />
            Your transaction is protected by NextPay security.
          </div>

        </form>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="cashout-confirmation">

          <section className="cashout-card">

            <div className="cashout-confirm-icon">
              <ShieldCheck size={28} />
            </div>

            <h3>Review Cash Out</h3>
            <p>Please verify the details before confirming.</p>

            {/* VERIFIED AGENT */}
            <div className="cashout-agent-box">
              <div className="cashout-agent-avatar">
                <UserRound size={25} />
              </div>

              <div className="cashout-agent-info">
                <span>VERIFIED AGENT</span>
                <h4>{agent?.name}</h4>
                <p>{agent?.phone}</p>
              </div>

              <BadgeCheck size={23} />
            </div>

            <div className="cashout-summary">
              <div className="cashout-summary-row">
                <span>Agent Name</span>
                <strong>{agent?.name}</strong>
              </div>

              <div className="cashout-summary-row">
                <span>Agent Number</span>
                <strong>{phone}</strong>
              </div>

              <div className="cashout-summary-row">
                <span>Transaction Type</span>
                <strong>Cash Out</strong>
              </div>

              <div className="cashout-summary-row">
                <span>Transaction Fee</span>
                <strong>৳0.00</strong>
              </div>
            </div>

            <div className="cashout-total">
              <span>You will withdraw</span>
              <h2>৳ {formatTaka(Number(amount))}</h2>
              <p>Amount deducted from your wallet</p>
            </div>

            <div className="cashout-balance-after">
              <span>Remaining Balance</span>
              <strong>
                ৳ {formatTaka(balance - Number(amount))}
              </strong>
            </div>

          </section>

          {/* PIN */}
          <section className="cashout-card cashout-pin-card">

            <div className="cashout-section-title">
              <div className="cashout-section-icon">
                <KeyRound size={21} />
              </div>

              <div>
                <h3>Transaction PIN</h3>
                <p>Enter your PIN to authorize this withdrawal.</p>
              </div>
            </div>

            <div className="cashout-input">
              <KeyRound size={18} />

              <input
                type="password"
                value={pin}
                onChange={(e) =>
                  setPin(
                    e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH)
                  )
                }
                placeholder={`Enter ${PIN_LENGTH}-digit PIN`}
                inputMode="numeric"
                autoComplete="off"
                maxLength={PIN_LENGTH}
              />
            </div>

            {profile && !profile.hasPin && (
              <p className="cashout-error">
                You haven't set a transaction PIN.{" "}
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                >
                  Set PIN
                </button>
              </p>
            )}

          </section>

          {error && (
            <div className="cashout-error">
              {error}
            </div>
          )}

          <button
            className="cashout-primary"
            onClick={handleConfirm}
            disabled={
              loading ||
              pin.length !== PIN_LENGTH ||
              !profile?.hasPin
            }
          >
            {loading ? (
              <>
                <LoaderCircle className="cashout-spinner" size={19} />
                Processing...
              </>
            ) : (
              <>
                Confirm Cash Out
                <ArrowRight size={19} />
              </>
            )}
          </button>

          <button
            className="cashout-secondary"
            onClick={() => {
              setError("");
              setPin("");
              setStep(1);
            }}
            disabled={loading}
          >
            <ArrowLeft size={17} />
            Edit Details
          </button>

        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <section className="cashout-card cashout-success">

          <div className="cashout-success-icon">
            <CheckCircle2 size={55} />
          </div>

          <span className="cashout-success-tag">
            TRANSACTION SUCCESSFUL
          </span>

          <h2>Cash Out Complete!</h2>

          <p>
            Your withdrawal transaction has been completed successfully.
          </p>

          <div className="cashout-success-amount">
            <span>Withdrawn Amount</span>
            <h1>৳ {formatTaka(Number(amount))}</h1>
          </div>

          <div className="cashout-success-details">

            <div className="cashout-summary-row">
              <span>Agent Name</span>
              <strong>{agent?.name}</strong>
            </div>

            <div className="cashout-summary-row">
              <span>Agent Number</span>
              <strong>{phone}</strong>
            </div>

            <div className="cashout-summary-row">
              <span>Transaction ID</span>
              <strong>{transactionId}</strong>
            </div>

            <div className="cashout-summary-row">
              <span>Status</span>
              <strong className="cashout-completed">
                COMPLETED
              </strong>
            </div>

            <div className="cashout-summary-row">
              <span>Remaining Balance</span>
              <strong>৳ {formatTaka(newBalance)}</strong>
            </div>

          </div>

          <button
            className="cashout-primary"
            onClick={handleBack}
          >
            Back to Home
            <ArrowRight size={19} />
          </button>

          <button
            className="cashout-secondary"
            onClick={handleReset}
          >
            <RotateCcw size={17} />
            Make Another Cash Out
          </button>

        </section>
      )}

    </div>
  );
}
