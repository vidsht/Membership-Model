import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/global.css';

const Footer = () => {
  const navigate = useNavigate();

  // Navigate to path and ensure the destination page is scrolled to the hero section (id='hero') or top
  const goToHero = (e, path) => {
    if (e && e.preventDefault) e.preventDefault();
    navigate(path);
    // allow the route to render then scroll
    setTimeout(() => {
      const hero = document.getElementById('hero');
      if (hero && typeof hero.scrollIntoView === 'function') {
        hero.scrollIntoView({ behavior: 'smooth' });
      } else if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 60);
  };

  return (
    <footer>
      <div className="footer-content">
        <div className="footer-column">
          <h3>Indians in Ghana</h3>
          <p>Connecting the Indian community in Ghana through membership, business opportunities, and exclusive benefits.</p>
          <div className="footer-social-icons">
            <a href=" https://www.facebook.com/profile.php?id=61565930895123" target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook-f"></i></a>
            <a href="https://www.instagram.com/indians_in_ghana" target="_blank" rel="noopener noreferrer"><i className="fab fa-instagram"></i></a>
            <a href="https://www.youtube.com/channel/UCh0RgaDreZwXpo3nbMAoEYw" target="_blank" rel="noopener noreferrer"><i className="fab fa-youtube"></i></a>
            <a href="https://whatsapp.com/channel/0029Vb67LBOG3R3k14CA7y03" target="_blank" rel="noopener noreferrer"><i className="fab fa-whatsapp"></i></a>
          </div>
        </div>

        <div className="footer-column">
          <h3>Quick Links</h3>
          <ul>
            <li><Link to="/about" onClick={(e) => goToHero(e, '/about')}>About Us</Link></li>
            <li><Link to="/contact" onClick={(e) => goToHero(e, '/contact')}>Contact Us</Link></li>
            <li><Link to="/terms" onClick={(e) => goToHero(e, '/terms')}>Terms and Conditions</Link></li>
            <li><Link to="/disclaimer" onClick={(e) => goToHero(e, '/disclaimer')}>Disclaimer</Link></li>
          </ul>
        </div>

        <div className="footer-column">
          <h3>Membership</h3>
          <ul>
            <li><Link to="/unified-registration" onClick={(e) => goToHero(e, '/unified-registration')}>Register as a User</Link></li>
            <li><Link to="/unified-registration" onClick={(e) => goToHero(e, '/unified-registration')}>Register as Business</Link></li>
            <li><Link to="/member-benefits" onClick={(e) => goToHero(e, '/member-benefits')}>Member's Benefits</Link></li>
            <li><Link to="/business-benefits" onClick={(e) => goToHero(e, '/business-benefits')}>Business Benefits</Link></li>
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
        <p>&copy; {new Date().getFullYear()} indiansinghana.com | All Rights Reserved. | Made with ❤️ By <a href="https://www.linkedin.com/in/vidushi-tiwari-43ba331bb" target="_blank" rel="noopener noreferrer" className="footer-author-link">Vidushi Tiwari</a> | Concept & Initiative by Sachin</p>
      </div>
    </footer>
  );
};

export default Footer;
