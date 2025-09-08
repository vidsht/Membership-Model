import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/disclaimer.css';

const Disclaimer = () => {
  return (
    <div className="disclaimer-page">
      <div className="disclaimer-hero">
        <div className="container">
          <div className="disclaimer-hero-content">
            <h1>
              <i className="fas fa-exclamation-triangle"></i>
              Disclaimer
            </h1>
            <p>Important information about the use of our platform and services</p>
            <div className="disclaimer-meta">
              <div className="last-updated">
                <i className="fas fa-calendar-alt"></i>
                Last updated: {new Date().toLocaleDateString('en-GB', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="disclaimer-content">
        <div className="container">
          <div className="disclaimer-main">
            <div className="disclaimer-text-content">
              
              <section className="disclaimer-section">
                <h2>General Information</h2>
                <p>
                  The information provided on this platform is for general informational purposes only. 
                  While we strive to keep the information up to date and correct, we make no representations 
                  or warranties of any kind, express or implied, about the completeness, accuracy, reliability, 
                  suitability or availability with respect to the platform or the information, products, 
                  services, or related graphics contained on the platform for any purpose.
                </p>
              </section>

              <section className="disclaimer-section">
                <h2>Membership Benefits and Services</h2>
                <div className="disclaimer-points">
                  <div className="point">
                    <i className="fas fa-info-circle"></i>
                    <div>
                      <h4>Service Availability</h4>
                      <p>Membership benefits and services are subject to availability and may change without prior notice. The Indians in Ghana community reserves the right to modify, suspend, or discontinue any service at any time.</p>
                    </div>
                  </div>
                  <div className="point">
                    <i className="fas fa-handshake"></i>
                    <div>
                      <h4>Business Partner Deals</h4>
                      <p>Deals and offers from business partners are provided by third parties. We do not guarantee the quality, availability, or terms of these offers. Any disputes should be resolved directly with the respective business partner.</p>
                    </div>
                  </div>
                  <div className="point">
                    <i className="fas fa-shield-alt"></i>
                    <div>
                      <h4>No Warranties</h4>
                      <p>We provide our platform on an "as is" basis without any warranties, express or implied, including but not limited to merchantability, fitness for a particular purpose, or non-infringement.</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="disclaimer-section">
                <h2>Limitation of Liability</h2>
                <p>
                  In no event shall the Indians in Ghana community, its officers, directors, employees, 
                  or agents be liable for any indirect, incidental, special, punitive, or consequential 
                  damages whatsoever arising out of or in connection with your use of this platform, 
                  whether based on warranty, contract, tort, or any other legal theory.
                </p>
                <p>
                  This includes, but is not limited to, damages for loss of profits, goodwill, use, 
                  data, or other intangible losses, even if we have been advised of the possibility 
                  of such damages.
                </p>
              </section>

              <section className="disclaimer-section">
                <h2>Third-Party Links and Content</h2>
                <p>
                  Our platform may contain links to external websites or reference third-party businesses 
                  and services. We do not control these external sites and are not responsible for their 
                  content, privacy policies, or practices. Inclusion of any link does not imply endorsement 
                  by us of the site or its content.
                </p>
                <div className="warning-box">
                  <i className="fas fa-exclamation-triangle"></i>
                  <div>
                    <h4>User Responsibility</h4>
                    <p>Users are responsible for verifying the accuracy and legitimacy of third-party offers and services before engaging with them.</p>
                  </div>
                </div>
              </section>

              <section className="disclaimer-section">
                <h2>Data Accuracy</h2>
                <p>
                  While we make every effort to ensure that member information and business details 
                  are accurate, we cannot guarantee the completeness or accuracy of all data. 
                  Members and business partners are responsible for keeping their information current 
                  and accurate.
                </p>
              </section>

              <section className="disclaimer-section">
                <h2>Technical Issues</h2>
                <p>
                  We strive to maintain continuous platform availability, but we cannot guarantee 
                  uninterrupted service. Technical issues, maintenance, or unforeseen circumstances 
                  may temporarily affect platform functionality. We are not liable for any inconvenience 
                  or losses resulting from such interruptions.
                </p>
              </section>

              <section className="disclaimer-section">
                <h2>Governing Law</h2>
                <p>
                  This disclaimer shall be governed by and construed in accordance with the laws of Ghana. 
                  Any disputes arising under this disclaimer shall be subject to the exclusive jurisdiction 
                  of the courts of Ghana.
                </p>
              </section>

            </div>

            <div className="disclaimer-actions">
              <div className="action-buttons">
                <Link to="/" className="btn btn-secondary-home">
                  <i className="fas fa-home"></i>
                  Back to Home
                </Link>
                <Link to="/contact" className="btn btn-primary-home">
                  <i className="fas fa-envelope"></i>
                  Contact Support
                </Link>
              </div>
              
              <div className="help-text">
                <p>
                  <i className="fas fa-info-circle"></i>
                  This disclaimer applies to all users of the Indians in Ghana membership platform. 
                  By using our services, you acknowledge that you have read and understood this disclaimer.
                </p>
              </div>
            </div>
          </div>

          <div className="disclaimer-sidebar">
            <div className="quick-nav">
              <h3>Quick Navigation</h3>
              <ul>
                <li><a href="/unified-registration">Register Now</a></li>
                <li><a href="/member-benefits">Member Benefits</a></li>
                <li><a href="/business-benefits">Business Benefits</a></li>
                <li><a href="/deals">Deal Redemption</a></li>
                <li><a href="/business-directory">Business Partners</a></li>
                <li><a href="/about">About Us</a></li>
                <li><a href="/disclaimer">Disclaimer</a></li>
                <li><a href="/contact">Contact</a></li>
              </ul>
            </div>

            <div className="disclaimer-summary">
              <h3>Key Points</h3>
              <div className="summary-points">
                <div className="summary-point">
                  <i className="fas fa-exclamation-circle"></i>
                  <span>Information provided "as is"</span>
                </div>
                <div className="summary-point">
                  <i className="fas fa-exclamation-circle"></i>
                  <span>No warranties on third-party services</span>
                </div>
                <div className="summary-point">
                  <i className="fas fa-exclamation-circle"></i>
                  <span>Limited liability for platform use</span>
                </div>
                <div className="summary-point">
                  <i className="fas fa-exclamation-circle"></i>
                  <span>Users verify third-party offers</span>
                </div>
              </div>
            </div>

            <div className="legal-notice">
              <h3>Legal Notice</h3>
              <p>
                This disclaimer is part of our legal framework and should be read in conjunction 
                with our <Link to="/terms">Terms and Conditions</Link> and Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;
