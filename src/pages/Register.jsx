
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      await register(name, email, password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Create Account</h1>
        <p>Join Finora Digital Wallet</p>

        <label>Full Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          required
        />

        <label>Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 6 characters"
          required
        />

        {error && <p className="auth-error">{error}</p>}

        <button disabled={loading}>
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </main>
  );
}
