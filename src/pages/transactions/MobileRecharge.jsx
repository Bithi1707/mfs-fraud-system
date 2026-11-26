
import { useState } from "react";
import {
    ArrowLeft,
    Smartphone,
    ShieldCheck,
    CheckCircle2,
    LoaderCircle,
    Zap,
    AlertCircle
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import {
    mobileRecharge,
    detectOperator
} from "../../services/walletService";

import { getErrorMessage } from "../../services/profileService";
import { formatTaka } from "../../utils/transactionView";

import "./SendMoney.css";
import "./MobileRecharge.css";

const OPERATORS = [
    { name: "Grameenphone", short: "GP", color: "#159B55" },
    { name: "Robi", short: "RB", color: "#E53935" },
    { name: "Airtel", short: "AT", color: "#E5398B" },
    { name: "Banglalink", short: "BL", color: "#F39C12" },
    { name: "Teletalk", short: "TT", color: "#159BCA" }
];

const QUICK_AMOUNTS = [20, 50, 100, 200, 500, 1000];

// 016 prefix is shared by Robi and Airtel.
const getCompatibleOperators = (detectedOperator, phone) => {
    if (phone?.startsWith("016")) {
        return ["Robi", "Airtel"];
    }

    return detectedOperator ? [detectedOperator] : [];
};

export default function MobileRecharge({ onBack }) {
    const { wallet } = useAuth();

    const [operator, setOperator] = useState("");
    const [phone, setPhone] = useState("");
    const [connectionType, setConnectionType] = useState("Prepaid");
    const [amount, setAmount] = useState("");
    const [pin, setPin] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);

    const balance = Number(wallet?.balance ?? 0);

    const validPhone = /^01[3-9]\d{8}$/.test(phone);

    // Detect operator only for a valid phone number.
    const detectedOperator = validPhone ? detectOperator(phone) : null;

    const compatibleOperators = getCompatibleOperators(
        detectedOperator,
        phone
    );

    const operatorMismatch =
        Boolean(operator) &&
        validPhone &&
        Boolean(detectedOperator) &&
        !compatibleOperators.includes(operator);

    const handlePhoneChange = (value) => {
        const cleanPhone = value.replace(/\D/g, "").slice(0, 11);

        setPhone(cleanPhone);
        setError("");

        // Clear selected operator if it is incompatible with new number.
        const detected = /^01[3-9]\d{8}$/.test(cleanPhone)
            ? detectOperator(cleanPhone)
            : null;

        const compatible = getCompatibleOperators(detected, cleanPhone);

        if (operator && !compatible.includes(operator)) {
            setOperator("");
        }
    };

    const handleOperatorChange = (selectedOperator) => {
        setOperator(selectedOperator);
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!operator) {
            setError("Please select a mobile operator.");
            return;
        }

        if (!validPhone) {
            setError("Enter a valid 11-digit Bangladesh mobile number.");
            return;
        }

        if (!detectedOperator) {
            setError("Unable to detect mobile operator from this number.");
            return;
        }

        if (!compatibleOperators.includes(operator)) {
            setError(
                `This number belongs to ${detectedOperator}. Please select the correct operator.`
            );
            return;
        }

        const value = Number(amount);

        if (!Number.isInteger(value) || value < 1) {
            setError("Enter a valid recharge amount.");
            return;
        }

        if (value > balance) {
            setError("Insufficient wallet balance.");
            return;
        }

        if (!/^\d{5}$/.test(pin)) {
            setError("Enter your 5-digit transaction PIN.");
            return;
        }

        try {
            setLoading(true);

            const response = await mobileRecharge({
                phone,
                operator,
                connectionType,
                amount: value,
                pin
            });

            setResult(response);

        } catch (err) {
            console.error("Mobile recharge error:", err);
            setError(getErrorMessage(err));

        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setResult(null);
        setPhone("");
        setAmount("");
        setPin("");
        setOperator("");
        setConnectionType("Prepaid");
        setError("");
    };

    const rechargeDisabled =
        loading ||
        !operator ||
        !validPhone ||
        !detectedOperator ||
        !compatibleOperators.includes(operator) ||
        !amount ||
        !pin;

    return (
        <div className="send-page">

            <header className="send-header">
                <button
                    type="button"
                    onClick={onBack}
                    className="send-back"
                    aria-label="Back"
                >
                    <ArrowLeft size={21} />
                </button>

                <div>
                    <h2>Mobile Recharge</h2>
                    <p>Recharge any mobile number</p>
                </div>

                <ShieldCheck color="#D9468D" size={25} />
            </header>

            {!result && (
                <form onSubmit={handleSubmit}>

                    <div className="send-card recharge-card">

                        <div className="send-icon">
                            <Smartphone size={27} />
                        </div>

                        <h3>Current balance</h3>
                        <p>৳ {formatTaka(balance)}</p>

                        <label>Select Operator</label>

                        <div className="operator-grid">
                            {OPERATORS.map((item) => (
                                <button
                                    type="button"
                                    key={item.name}
                                    className={`operator-item ${
                                        operator === item.name ? "selected" : ""
                                    }`}
                                    onClick={() =>
                                        handleOperatorChange(item.name)
                                    }
                                >
                                    <span
                                        className="operator-logo"
                                        style={{ background: item.color }}
                                    >
                                        {item.short}
                                    </span>

                                    <span>{item.name}</span>
                                </button>
                            ))}
                        </div>

                        <label htmlFor="recharge-phone">
                            Mobile Number
                        </label>

                        <div className="recharge-phone-input">
                            <Smartphone size={19} />

                            <input
                                id="recharge-phone"
                                type="tel"
                                inputMode="numeric"
                                maxLength={11}
                                placeholder="01XXXXXXXXX"
                                value={phone}
                                onChange={(e) =>
                                    handlePhoneChange(e.target.value)
                                }
                                required
                            />
                        </div>

                        {phone.length === 11 && validPhone && (
                            <div
                                style={{
                                    marginTop: 10,
                                    padding: "10px 12px",
                                    borderRadius: 10,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    background: operatorMismatch
                                        ? "#FEE2E2"
                                        : "#DCFCE7",
                                    color: operatorMismatch
                                        ? "#B91C1C"
                                        : "#15803D",
                                    fontSize: 13
                                }}
                            >
                                <AlertCircle size={17} />

                                {operatorMismatch
                                    ? `This number belongs to ${detectedOperator}. Please select the correct operator.`
                                    : phone.startsWith("016")
                                        ? "016 prefix: Select Robi or Airtel."
                                        : `Detected operator: ${detectedOperator}`}
                            </div>
                        )}

                        {phone.length === 11 && !validPhone && (
                            <p
                                style={{
                                    color: "#DC2626",
                                    fontSize: 13,
                                    marginTop: 8
                                }}
                            >
                                Invalid Bangladesh mobile number.
                            </p>
                        )}

                        <label>Connection Type</label>

                        <div className="connection-options">
                            {["Prepaid", "Postpaid"].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    className={
                                        connectionType === type ? "active" : ""
                                    }
                                    onClick={() => setConnectionType(type)}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        <label>Recharge Amount (BDT)</label>

                        <div className="amount-input">
                            <span>৳</span>

                            <input
                                type="number"
                                min="1"
                                step="1"
                                placeholder="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </div>

                        <div className="recharge-quick-amounts">
                            {QUICK_AMOUNTS.map((value) => (
                                <button
                                    type="button"
                                    key={value}
                                    className={
                                        Number(amount) === value ? "active" : ""
                                    }
                                    onClick={() => setAmount(String(value))}
                                >
                                    ৳{value}
                                </button>
                            ))}
                        </div>

                        <label htmlFor="recharge-pin">
                            Transaction PIN
                        </label>

                        <input
                            id="recharge-pin"
                            className="recharge-pin-input"
                            type="password"
                            inputMode="numeric"
                            maxLength={5}
                            placeholder="Enter 5-digit PIN"
                            value={pin}
                            onChange={(e) =>
                                setPin(
                                    e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 5)
                                )
                            }
                            required
                        />

                        <div className="recharge-notice">
                            <ShieldCheck size={16} />
                            <span>
                                Your transaction is protected by your NextPay PIN.
                            </span>
                        </div>

                    </div>

                    {error && (
                        <p className="send-error">{error}</p>
                    )}

                    <button
                        className="send-primary"
                        type="submit"
                        disabled={rechargeDisabled}
                        style={{
                            opacity: rechargeDisabled ? 0.55 : 1,
                            cursor: rechargeDisabled
                                ? "not-allowed"
                                : "pointer"
                        }}
                    >
                        {loading ? (
                            <>
                                <LoaderCircle size={19} />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Zap size={19} />
                                Recharge Now
                            </>
                        )}
                    </button>

                </form>
            )}

            {result && (
                <div className="send-card success-card">

                    <CheckCircle2 size={65} color="#20A574" />

                    <h2>Recharge Submitted!</h2>

                    <p>
                        Your demo recharge transaction has been recorded.
                    </p>

                    <h1>৳ {formatTaka(result.amount)}</h1>

                    <div className="summary-row">
                        <span>Mobile Number</span>
                        <strong>{result.phone}</strong>
                    </div>

                    <div className="summary-row">
                        <span>Operator</span>
                        <strong>{result.operator}</strong>
                    </div>

                    <div className="summary-row">
                        <span>Connection</span>
                        <strong>{result.connectionType}</strong>
                    </div>

                    <div className="summary-row">
                        <span>New Balance</span>
                        <strong>
                            ৳ {formatTaka(result.newBalance)}
                        </strong>
                    </div>

                    <div className="summary-row">
                        <span>Transaction ID</span>
                        <strong>{result.id}</strong>
                    </div>

                    <div className="recharge-demo-notice">
                        Demo mode: No actual mobile balance was sent.
                    </div>

                    <button
                        type="button"
                        className="send-secondary"
                        onClick={resetForm}
                    >
                        Recharge Again
                    </button>

                    <button
                        type="button"
                        className="send-primary"
                        onClick={onBack}
                        style={{ marginTop: 10 }}
                    >
                        Back to Home
                    </button>

                </div>
            )}

        </div>
    );
}
