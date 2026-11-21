import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Payment from "./transactions/Payment";
import {
  Wallet,
  Bell,
  Eye,
  EyeOff,
  Send,
  Banknote,
  ShoppingBag,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  ChevronRight,
  Home as HomeIcon,
  Clock,
  User,
  Grid2X2,
  ShieldCheck,
  CreditCard,
  LogOut,
  QrCode
} from "lucide-react";

import "../App.css";

import "./Home.css";


const services = [
  {
    name: "Send Money",
    description: "Transfer money",
    icon: Send,
    color: "pink"
  },
  {
    name: "Mobile Recharge",
    description: "Recharge mobile balance",
    icon: Banknote,
    color: "orange"
  },
  {
    name: "Cash Out",
    description: "Withdraw money",
    icon: Banknote,
    color: "purple"
  },
  {
    name: "Cash In",
    description: "Add cash",
    icon: Plus,
    color: "green"
  },
  {
    name: "Payment",
    description: "Pay merchants",
    icon: ShoppingBag,
    color: "orange"
  }
];

// Demo transactions: Firebase integration will come later.
const transactions = [
  {
    id: 1,
    name: "Rahim Ahmed",
    detail: "Transfer · 017XXXXXXXX",
    amount: 1500,
    date: "Today, 10:42 AM",
    type: "send",
    status: "Successful"
  },
  {
    id: 2,
    name: "Cash Out",
    detail: "Agent · 018XXXXXXXX",
    amount: 2000,
    date: "Today, 09:15 AM",
    type: "cashout",
    status: "Successful"
  },
  {
    id: 3,
    name: "Cash In",
    detail: "Agent · 019XXXXXXXX",
    amount: 5000,
    date: "Yesterday, 06:20 PM",
    type: "receive",
    status: "Successful"
  },
  {
    id: 4,
    name: "Shopping Payment",
    detail: "Merchant Payment",
    amount: 850,
    date: "Yesterday, 02:10 PM",
    type: "payment",
    status: "Successful"
  }
];

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [balanceVisible, setBalanceVisible] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Home");
  const [activeTransaction, setActiveTransaction] = useState(null);
  const userName = user?.displayName || "Finora User";
  const firstName = userName.split(" ")[0];

  const filteredTransactions = transactions.filter((item) =>
    `${item.name} ${item.detail} ${item.type}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  
  const handleService = (service) => {

  if (service === "Send Money") {
    navigate("/send-money");
    return;
  }

  if (service === "Payment") {
    navigate("/payment");
    return;
  }

  alert(`${service} interface is coming soon!`);
};


  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Unable to logout. Please try again.");
    }
  };

  return (
    <div className="finora-page">
      {activeTransaction === "Payment" ? (

      <Payment
        onBack={() => setActiveTransaction(null)}
      />

    ) : (
      <main className="finora-container">

        {/* HEADER */}
        <header className="finora-header">
          <div className="finora-brand">
            <div className="brand-logo">
              <Wallet size={23} />
            </div>

            <div>
              <h2>NextPay<span>.</span></h2>
              <p>Mobile Financial Services</p>
            </div>
          </div>

          <div className="header-actions">
            <button className="notification-button" aria-label="Notifications">
              <Bell size={20} />
              <span className="notification-dot"></span>
            </button>

            <button className="profile-button">
              {firstName.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        {/* WELCOME */}
        <section className="welcome-section">
          <div>
            <span className="welcome-tag">WELCOME BACK</span>
            <h1>Hello, {firstName}! <span>👋</span></h1>
            <p>Here's your financial overview.</p>
          </div>

          <div className="verified-badge">
            <ShieldCheck size={14} />
            Verified
          </div>
        </section>

        {/* BALANCE CARD */}
        <section className="balance-card">
          <div className="balance-card-top">
            <div className="balance-label">
              <Wallet size={17} />
              <span>Available Balance</span>
            </div>

            <button
              className="balance-toggle"
              onClick={() => setBalanceVisible(!balanceVisible)}
              aria-label="Toggle balance"
            >
              {balanceVisible ? <Eye size={19} /> : <EyeOff size={19} />}
            </button>
          </div>

          <h2 className="balance-amount">
            {balanceVisible ? (
              <>৳ 24,580<span>.50</span></>
            ) : (
              "৳ ••••••••"
            )}
          </h2>

          {/* <div className="balance-footer">
            <span>Wallet Account</span>
            <span>•••• 4582</span>
          </div> */}

          <div className="balance-circle circle-one"></div>
          <div className="balance-circle circle-two"></div>
        </section>

        {/* SERVICES */}
        <section className="services-section">
          <div className="section-heading">
            <div>
              <h2>Our Services</h2>
              <p>What would you like to do today?</p>
            </div>

            {/* <button
              className="see-all-button"
              onClick={() => setActiveTab("Services")}
            >
              View all <ChevronRight size={16} />
            </button> */}
          </div>

          <div className="services-grid">
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <button
                  className="service-item"
                  key={service.name}
                  onClick={() => handleService(service.name)}
                >
                  <div className={`service-icon ${service.color}`}>
                    <Icon size={23} strokeWidth={2} />
                  </div>

                  <strong>{service.name}</strong>
                  <small>{service.description}</small>
                </button>
              );
            })}
          </div>
        </section>

        {/* SECURITY BANNER */}
        <section className="security-banner">
          <div className="security-content">
            <span>SMART & SECURE</span>
            <h3>Your money,<br />your control.</h3>
            <p>Manage transactions with confidence.</p>
          </div>

          <div className="security-icon">
            <ShieldCheck size={43} />
            <span>✦</span>
          </div>
        </section>

        {/* TRANSACTION HISTORY */}
        <section className="transactions-section">
          <div className="section-heading">
            <div>
              <h2>Recent Transactions</h2>
              <p>Your latest wallet activity</p>
            </div>

            <button
              className="see-all-button"
              onClick={() => setActiveTab("History")}
            >
              See all <ChevronRight size={16} />
            </button>
          </div>

          <div className="transaction-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="transaction-list">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((item) => (
                <div className="transaction-item" key={item.id}>
                  <div className={`transaction-icon ${item.type}`}>
                    {item.type === "receive" ? (
                      <ArrowDownLeft size={21} />
                    ) : item.type === "send" ? (
                      <ArrowUpRight size={21} />
                    ) : item.type === "cashout" ? (
                      <Banknote size={20} />
                    ) : item.type === "debit" ? (
                      <CreditCard size={20} />
                    ) : (
                      <ShoppingBag size={20} />
                    )}
                  </div>

                  <div className="transaction-info">
                    <h4>{item.name}</h4>
                    <p>{item.detail}</p>
                    <small>{item.date}</small>
                  </div>

                  <div className="transaction-amount">
                    <strong className={item.type === "receive" ? "credit" : ""}>
                      {item.type === "receive" ? "+" : "-"} ৳
                      {item.amount.toLocaleString("en-US", {
                        minimumFractionDigits: 2
                      })}
                    </strong>
                    <span>{item.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                No matching transactions found.
              </div>
            )}
          </div>
        </section>

        {/* BOTTOM NAVIGATION */}
        <nav className="bottom-navigation">
          {[
            { name: "Home", icon: HomeIcon },
            { name: "History", icon: Clock },
            { name: "Scan", icon: QrCode },
            { name: "Services", icon: Grid2X2 },
            { name: "Profile", icon: User }
          ].map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.name}
                className={`bottom-nav-item ${
                  activeTab === tab.name ? "active" : ""
                }`}
                onClick={() => {
                  if (tab.name === "Profile") {
                    handleLogout();
                  } else {
                    setActiveTab(tab.name);
                  }
                }}
              >
                <Icon size={21} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>

        {/* LOGOUT */}
        <button className="logout-button" onClick={handleLogout}>
          <LogOut size={15} />
          Logout
        </button>

      </main>
    )}
    </div>
  );
}

