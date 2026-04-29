import React, { useState } from "react";

export const ContactSection: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    (e.target as HTMLFormElement).reset();
  };

  return (
    <>
      {/* Contact Hero Banner */}
      <section className="contact-hero">
        <div className="container">
          <h1>Contact Us</h1>
        </div>
      </section>

      {/* Contact Content */}
      <section className="page-section">
      <div className="container">
        {/* Google Map */}
        <div className="contact-map-container">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3667.5247829829607!2d88.11888342346908!3d25.00213087720298!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39506d31e1ff391b%3A0x1234567890abcdef!2sMalda%20Railway%20Institute!5e0!3m2!1sen!2sin!4v1234567890"
            width="100%"
            height="400"
            style={{ border: 0, borderRadius: "0.9rem" }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Malda Railway Institute Location"
            ></iframe>
        </div>

        <h2>Get in Touch</h2>
        
        <div className="contact-content">
          {/* Left Side - Contact Information */}
          <div className="contact-info">
            <p className="contact-intro">
              Have any questions or need information about our institutes? 
              We'd love to hear from you. Reach out to us through any of the 
              following channels.
            </p>

            <div className="contact-details">
              <div className="contact-item">
                <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <div>
                  <p><a href="tel:+91-9046196830">+91-9046196830</a></p>
                </div>
              </div>
              <div className="contact-item">
                <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <div>
                  <p>Malda Railway Institute, Malda Division, Eastern Railway</p>
                </div>
              </div>
              <div className="contact-item">
                <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                </svg>
                <div>
                  <p><a href="mailto:niranjan.2505@gov.in">niranjan.2505@gov.in</a></p>
                </div>
              </div>
            </div>

            <div className="social-links">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon" title="Facebook">
                <span>f</span>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon" title="Twitter">
                <span>𝕏</span>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-icon" title="YouTube">
                <span>▶</span>
              </a>
            </div>
          </div>

          {/* Right Side - Contact Form */}
          <form className="contact-form" onSubmit={onSubmit}>
            <div className="form-row">
              <label className="field">
                <span>
                  Name<span className="required">*</span>
                </span>
                <input type="text" placeholder="Enter your name" required />
              </label>
              <label className="field">
                <span>
                  Email<span className="required">*</span>
                </span>
                <input type="email" placeholder="Enter your email" required />
              </label>
            </div>
            <label className="field">
              <span>Message<span className="required">*</span></span>
              <textarea rows={5} placeholder="Write your message here..." required />
            </label>
            <button type="submit" className="primary-button">
              Submit
            </button>
            {submitted && (
              <p style={{ color: "#16a34a", margin: "0.5rem 0 0", fontSize: "0.9rem" }}>
                ✓ Submitted successfully!
              </p>
            )}
          </form>
        </div>
      </div>
      </section>
    </>
  );
};

