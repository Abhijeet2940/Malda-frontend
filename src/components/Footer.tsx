import React, { useState } from "react";
import indianRailwaysLogo from "../Assets/Indian Railways.png";

export const Footer: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    (e.target as HTMLFormElement).reset();
  };

  return (
    <footer className="site-footer" id="contact">
      <div className="container footer-grid">
        <div className="footer-main">
          <div className="footer-brand">
            <img src={indianRailwaysLogo} alt="Indian Railways" className="footer-logo-img" />
            <div className="footer-brand-text">
              <h3>Malda Division Railway Institute</h3>
              <p>Eastern Railway</p>
            </div>
          </div>
          <form
            className="footer-form"
            onSubmit={onSubmit}
          >
            <h4>Submit Your Entries Here</h4>
            <label className="field">
              <span>Name<span className="required">*</span></span>
              <input type="text" placeholder="Enter your name" required />
            </label>
            <label className="field">
              <span>Email<span className="required">*</span></span>
              <input type="email" placeholder="Enter your email" required />
            </label>
            <button type="submit" className="primary-button">
              Submit
            </button>
            {submitted && (
              <p style={{ color: "#4ade80", margin: "0.5rem 0 0", fontSize: "0.9rem" }}>
                ✓ Submitted successfully!
              </p>
            )}
          </form>
        </div>
        <div className="footer-links">
          <div>
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#about">About</a></li>
              <li><a href="#gallery">Gallery</a></li>
              <li><a href="#contact">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h4>Institutes</h4>
            <ul>
              <li>Malda Railway Institute | Malda</li>
              <li>Sahibganj Railway Institue | Sahibganj</li>
              <li>Bhagalpur Railway Institute | Bhagalpur</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>
          All copyright reserved &copy; 2026. Made by TowerLink Network Pvt.
          Ltd. under the guidance of Indrajeet Sr-dpo Malda Division Railway Institute.
        </p>
      </div>
    </footer>
  );
};
