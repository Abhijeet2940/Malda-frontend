import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { institutes } from "../data/institutes";
import indianRailwaysLogo from "../Assets/Indian Railways.png";

export const Header: React.FC = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location]);

  const handleInstituteClick = (id: string) => {
    navigate(`/institute/${id}`);
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="logo">
          <img src={indianRailwaysLogo} alt="Indian Railways" className="logo-img" />
          <div className="logo-text">
            <span className="logo-line1">Malda Division Railway Institute</span>
            <span className="logo-line2">Eastern Railway</span>

          </div>
        </div>
        
        <button 
          className="hamburger-menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className={`nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <NavLink to="/" end onClick={handleNavClick}>
            Home
          </NavLink>
          <NavLink to="/about" onClick={handleNavClick}>About</NavLink>
          <div className="nav-item-with-dropdown">
            <button
              className="nav-link-button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              Institutes
            </button>
            {dropdownOpen && (
              <div className="dropdown-menu">
                {institutes.map((inst) => (
                  <button
                    key={inst.id}
                    className="dropdown-item"
                    onClick={() => handleInstituteClick(inst.id)}
                  >
                    {inst.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <NavLink to="/gallery" onClick={handleNavClick}>Gallery</NavLink>
          <NavLink to="/contact" onClick={handleNavClick}>Contact Us</NavLink>
        </nav>
      </div>
    </header>
  );
};

