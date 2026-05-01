import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import maldastation from "../Assets/drmOffice.jpg";
import { institutes } from "../data/institutes";


export const HeroBooking: React.FC = () => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const heroImages = [
    { src: maldastation, alt: "Malda Town Railway Station" },
    
  ];


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    navigate('/booking');
  };

  return (
    <section id="home" className="hero">
      <div className="container hero-grid">
        <div className="hero-text">
          <div className="hero-carousel">
            <div className="hero-carousel-images">
              {heroImages.map((image, index) => (
                <img
                  key={index}
                  src={image.src}
                  alt={image.alt}
                  className={`hero-carousel-image ${index === currentImageIndex ? 'active' : ''}`}
                />
              ))}
            </div>
            <div className="hero-carousel-dots">
              {heroImages.map((_, index) => (
                <button
                  key={index}
                  className={`hero-carousel-dot ${index === currentImageIndex ? 'active' : ''}`}
                  onClick={() => setCurrentImageIndex(index)}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="hero-form-card">
          <h2>Book Your Institute</h2>
          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Select Institute<span className="required">*</span></span>
              <select required>
                <option value="">Select Institute</option>
                {institutes.map((inst) => (
                  <option 
                    key={inst.id} 
                    value={inst.id}
                    disabled={inst.blocked}
                    style={{ 
                      color: inst.blocked ? '#999' : 'inherit',
                      fontStyle: inst.blocked ? 'italic' : 'normal'
                    }}
                  >
                    {inst.name.split(',')[0]} {inst.blocked ? '(Unavailable)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Booking Date<span className="required">*</span></span>
              <input
                type="date"
                placeholder="DD-MM-YYYY"
                required
              />
            </label>

            <label className="field">
              <span>Purpose of Booking<span className="required">*</span></span>
              <select required>
                <option value="">Select purpose of booking</option>
                <option>Seminar/Workshop</option>
                <option>Wedding/Reception</option>
                <option>Birthday/Ceremony</option>
                <option>Cultural Event</option>
                <option>Others</option>
              </select>
            </label>

            <button type="submit" className="primary-button full-width">
              Book Now
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

