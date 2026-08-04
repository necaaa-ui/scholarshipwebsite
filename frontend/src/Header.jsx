// src/Header.jsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

// Import your logo images - adjust paths as needed
import AlumniLogo from './assets/images/Nec-alumni-association.jpeg';
import NECLogo from './assets/images//NEC-college Logo.png';

const Header = ({ 
  title = "NEC Alumni Association", 
  subtitle = "Scholarship Management Dashboard",
  userEmail = null,
  showLogout = false,
  onLogout = null,
  showBackButton = false,
  onBack = null,
  backButtonText = "Back"
}) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('userEmail');
      window.location.reload();
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="dashboard-header">
      <div className="header-content">
        <div className="logo-container">
          {/* Left Logo - NEC College */}
          <div className="logo-side left-logo">
            <img 
              src={NECLogo} 
              alt="NEC College Logo" 
              className="college-logo"
            />
          </div>

          {/* Center Title */}
          <div className="center-title">
            <h1>{title}</h1>
            <p className="subtitle">{subtitle}</p>
            {userEmail && (
              <p className="user-email-info">
                <span>Logged in as: </span>
                <span className="email-value">{userEmail}</span>
              </p>
            )}
          </div>

          {/* Right Logo - Alumni Association */}
          <div className="logo-side right-logo">
            <img 
              src={AlumniLogo} 
              alt="NEC Alumni Association Logo" 
              className="alumni-logo"
            />
          </div>
        </div>

        {/* Header Actions */}
        <div className="header-actions">
          {showBackButton && (
            <button className="header-back-btn" onClick={handleBack}>
              ← {backButtonText}
            </button>
          )}
          {showLogout && userEmail && (
            <button 
              className="logout-button" 
              onClick={handleLogout}
              title="Logout"
            >
              <span className="logout-text">Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;