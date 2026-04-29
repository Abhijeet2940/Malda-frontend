import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles.css";

const AdminLogin: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(username, password);
    if (success) {
      navigate("/admin");
    } else {
      setError("Invalid username or password.");
    }
  };

  return (
    <section className="page-section admin-login-page">
      <div className="admin-login-wrapper">
        <h2 className="booking-form-title">Admin Login</h2>
        <form onSubmit={handleSubmit} className="admin-login-form">
          {error && <div className="admin-error">{error}</div>}
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username (e.g. malda-os or sahibganj-wi)"
              required
            />
          </div>
          <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#4b5563' }}>
            Use institute-specific credentials for OS/WI:
            <br />
            malda-os / malda-wi / sahibganj-os / sahibganj-wi / bhagalpur-os / bhagalpur-wi
            <br />
            Common DPO: dpo, SR-DPO: sr-dpo, Admin: admin
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          <button type="submit" className="primary-button full-width">
            Login
          </button>
        </form>
      </div>
    </section>
  );
};

export default AdminLogin;
