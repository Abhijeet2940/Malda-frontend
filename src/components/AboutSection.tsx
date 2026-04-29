import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { institutes } from "../data/institutes";
import indianRailwaysLogo from "../Assests/sr-dpo.jpeg";
import maldaRailway from "../Assests/mriFront.jpeg";

const headerCarouselImages = [
  { src: maldaRailway, alt: "Malda Railway" },
];

export const AboutSection: React.FC = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % headerCarouselImages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="page-section">
      <div className="container">
        {/* About Header */}
        <div className="about-header">
          <div className="about-header-content">
            <h1>About Malda Division <br />Railway Institute</h1>
            <p className="about-header-subtitle">Eastern Railway</p>
            <p className="about-header-description">
              Malda Division Railway Institute, Eastern Railway serves as the central hub for railway employee welfare and community engagement. Our institutes enable seamless online reservations for events and facilities across the Malda Division. From seminars and training sessions to cultural programs and recreational activities, our platform streamlines bookings across three institutes, ensuring a smooth experience for organizing official and community events.
            </p>
            <button className="primary-button" onClick={() => navigate("/booking")}>
              Book Now
            </button>
          </div>
          <div className="about-header-image">
            <div className="about-carousel">
              {headerCarouselImages.map((img, i) => (
                <img
                  key={i}
                  src={img.src}
                  alt={img.alt}
                  className={`about-carousel-img${i === current ? " active" : ""}`}
                />
              ))}
              <div className="about-carousel-dots">
                {headerCarouselImages.map((_, i) => (
                  <button
                    key={i}
                    className={`about-carousel-dot${i === current ? " active" : ""}`}
                    onClick={() => setCurrent(i)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

          {/* Institutes Section */}
          <div className="about-institutes">
            <h2></h2>
            <div className="institutes-grid">
              {institutes.map((inst) => (
                <div key={inst.id} className="institute-simple-card">
                  <div className="institute-card-image">
                    <img src={inst.images} alt={inst.name} />
                  </div>
                  <div className="institute-card-body">
                    <h3>{inst.name}</h3>
                    <p className="institute-location">📍 {inst.location}</p>
                    <p className="institute-desc">{inst.description}</p>
                    <div className="institute-card-buttons">
                      <button className="primary-button" onClick={() => navigate("/booking")}>Book Now</button>
                      <button 
                        className="secondary-button"
                        onClick={() => navigate(`/institute/${inst.id}`)}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Section */}
          <div className="about-team">
            <h2>Meet Our Team</h2>
            
            <div className="team-head">
              <div className="team-head-image">
                <img src={indianRailwaysLogo} alt="SR-DPO" className="team-head-img" />
              </div>
              <div className="team-head-content">
                <h3>Malda Division Railway Institute</h3>
                <div className="team-member">
                  <h4>Indrajeet</h4>
                  <p className="member-role">Senior Divisional Personnel Officer</p>
                  <p className="member-contact">📧 srdpomalda@gmail.com</p>
                </div>
                <div className="team-member">
                  <h4>Rajeev Kumar</h4>
                  <p className="member-role">Divisional Personnel Officer</p>
                  <p className="member-contact">📧 dpomalda@gmail.com</p>
                    <p>📞 +91 9002-024620</p>
                </div>
              </div>
            </div>

            <div className="team-institutes">
              <div className="team-institute-group">
                <h4>Malda Railway Institute</h4>
                <div className="team-members-list">
                  <div className="team-member-item">
                    <h5>Aditya Surya</h5>
                    <p>(Welfare Inspector)</p>
                    <p>📧 aditya.2411@gov.in</p>
                    <p>📞 +91 90020-24630</p>
                  </div>
                  <div className="team-member-item">
                    <h5>Nirjan Kumar</h5>
                    <p>(Office Superintendent)</p>
                    <p>📧 nirjantarapati@gmail.com</p>
                    <p>📞 +91 90461-96830</p>
                  </div>
                </div>
              </div>

              <div className="team-institute-group">
                <h4>Sahibganj Railway Institute</h4>
                <div className="team-members-list">
                  <div className="team-member-item">
                    <h5>Bikash Chandra Ghosh</h5>
                    <p>(Welfare Inspector)</p>
                    <p>📧 bikash.031971@gov.in</p>
                    <p>📞 +91 9002-024637</p>
                  </div>
                  <div className="team-member-item">
                    <h5>Lorem Ipsum</h5>
                    <p>(Office Superintendent)</p>
                  </div>
                </div>
              </div>

              <div className="team-institute-group">
                <h4>Bhagalpur Railway Institute</h4>
                <div className="team-members-list">
                  <div className="team-member-item">
                    <h5>Meraj</h5>
                    <p>(Welfare Inspector)</p>
                    <p>📧 mdmeraj.2508@gov.in</p>
                    <p>📞 +91 9002-024638</p>
                  </div>
                  <div className="team-member-item">
                    <h5>Lorem Ipsum</h5>
                    <p>(Office Superintendent)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

