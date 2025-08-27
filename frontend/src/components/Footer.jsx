import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/global.css';

const Footer = () => {
  return (
    <footer>
      <div className="footer-content">
        <div className="footer-column">
          <h3>Indians in Ghana</h3>
          <p>Connecting the Indian community in Ghana through membership, business opportunities, and exclusive benefits.</p>
          <div className="footer-social-icons">
            <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook-f"></i></a>
            <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter"></i></a>
            <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-instagram"></i></a>
            <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-linkedin-in"></i></a>
          </div>
        </div>

        <div className="footer-column">
          <h3>Quick Links</h3>
          <ul>
            <li><Link to="/member-benefits">Member Benefits</Link></li>
            <li><Link to="/business-benefits">Business Benefits</Link></li>
            <li><Link to="/unified-registration">Join Now</Link></li>
          </ul>
        </div>

        <div className="footer-column">
          <h3>Contact Information</h3>
          <ul>
            <li><i className="fas fa-map-marker-alt"></i> East Legon, Accra</li>
            <li><i className="fas fa-phone"></i> +233 57 232 3912</li>
            <li><i className="fas fa-envelope"></i> support@indiansinghana.com</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; Indians in Ghana. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
