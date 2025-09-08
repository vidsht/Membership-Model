import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/terms.css';

const Terms = () => {
  const staticTermsContent = `
    <h3>1. Introduction</h3>
    <p>Indians In Ghana, operates as an intermediary platform that connects members with independent third-party merchants who provide discounts, offers, and deals. By purchasing and/or using our membership card, users gain access to exclusive offers from participating merchants.<br><strong>Important :</strong> We do not sell or supply any goods or services directly. All offers, products, and services are provided solely by independent merchants.</p>
    <h3>2. Membership & Eligibility</h3>
    <p>Membership is available to individuals aged 18 years and above. Members must provide accurate and up-to-date personal details at the time of registration.</p>
    <ul>
    <li>Membership cards are :<br>- Valid only for the period purchased (monthly/annual, as applicable).<br>- Non-transferable and intended for personal use only.<br>- Limited to one card per individual.</li>
    <li>Renewal of membership is the responsibility of the member.</li>
    <li>Membership fees, where applicable, must be paid in full at the time of registration or renewal.</li>
    </ul>
    <h3>3. Platform’s Role & Disclaimer</h3>
    <p>The Platform serves only as a facilitator between members and merchants. We do not control, own, or guarantee :</p>
    <ul>
    <li>The quality, safety, or legality of merchant goods/services.</li>
    <li>The accuracy or availability of merchant offers.</li>
    <li>The fulfillment of any deal by a merchant.</li>
    </ul>
    <p>Any disputes, complaints, or claims regarding a product, service, or discount must be resolved directly between the member and the merchant.</p>
    <h3>4. Merchant Responsibilities</h3>
    <ul>
    <li>Merchants are solely responsible for :<br>- Ensuring that their offers, discounts, and deals are accurate, valid, and lawful.<br>- Honoring all offers as displayed on the platform.<br>- Providing products or services as promised.</li>
    <li>The Platform reserves the right to :<br>- Suspend or remove merchants who fail to honor deals.<br>- Verify or audit deals for compliance and validity.</li>
    </ul>
    <h3>5. Deals & Offer Terms</h3>
    <ul>
    <li>All offers are subject to the individual terms and conditions set by merchants (e.g., validity periods, usage restrictions, exclusions).</li>
    <li>Offers may change, be updated, or withdrawn without prior notice.</li>
    <li>Deals are valid only for active members holding a valid membership card.</li>
    <li>Members may be asked to show identification alongside their membership card when redeeming offers.</li>
    </ul>
    <h3>6. Refunds & Cancellations</h3>
    <ul>
    <li>Membership fees are generally non-refundable once purchased.</li>
    <li>The Platform is not responsible for refunds or cancellations related to merchant offers.</li>
    <li>For refunds, complaints, or cancellations regarding a specific deal, members must contact the relevant merchant directly.</li>
    </ul>
    <h3>7. Limitation of Liability</h3>
    <ul>
    <li>To the fullest extent permitted by law, the Platform shall not be liable for:</li>
    <li>Any damages, losses, or dissatisfaction resulting from merchant products or services.</li>
    <li>Expired, withdrawn, or unavailable offers.</li>
    <li>Indirect, incidental, or consequential damages of any kind.</li>
    </ul>
    <p>Members use the platform and redeem offers at their own risk.</p>
    <h3>8. Privacy & Data Usage</h3>
    <ul>
    <li>Member and merchant information is collected, stored, and used in accordance with our Privacy Policy.</li>
    <li>Data may be shared with merchants where necessary for fulfilling an offer or discount.</li>
    <li>The Platform will not sell or misuse member data for unauthorized purposes.</li>
    </ul>
    <h3>9. Intellectual Property</h3>
    <ul>
    <li>All content on the Platform, including but not limited to logos, designs, trademarks, membership cards, website content, and marketing materials, remain the exclusive property of Indians In Ghana.</li>
    <li>No content or code may be copied, reproduced, or used without prior written consent.</li>
    </ul>
    <h3>10. Changes to Terms</h3>
    <ul>
    <li>The Platform reserves the right to amend, update, or revise these Terms & Conditions at any time without prior notice.</li>
    <li>Continued use of the Membership and the Platform constitutes acceptance of any revised terms.</li>
    </ul>
  `;

  return (
    <div className="terms-page disclaimer-like">
      <div className="terms-hero">
        <div className="container">
          <div className="terms-hero-content">
            <h1>
              <i className="fas fa-file-contract"></i>
              Terms and Conditions
            </h1>
            <p>Please read these terms and conditions carefully before using our service</p>
            <div className="terms-meta">
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
      <div className="terms-content">
        <div className="container">
          <div className="terms-main">
            <div className="terms-text-content">
              <div 
                className="terms-html-content"
                dangerouslySetInnerHTML={{ 
                  __html: staticTermsContent
                }}
              />
            </div>
            <div className="terms-actions">
              <div className="action-buttons">
                <Link to="/" className="btn btn-secondary">
                  <i className="fas fa-home"></i>
                  Back to Home
                </Link>
                <Link to="/unified-registration" className="btn btn-primary">
                  <i className="fas fa-user-plus"></i>
                  I Agree & Join
                </Link>
              </div>
              <div className="help-text">
                <p>
                  <i className="fas fa-question-circle"></i>
                  Have questions about these terms? 
                  <Link to="/contact"> Contact our support team</Link>
                </p>
              </div>
            </div>
          </div>
          
          <div className="terms-sidebar">
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
            <div className="terms-summary">
              <h3>Key Points</h3>
              <div className="summary-points">
                <div className="summary-point">
                  <i className="fas fa-check-circle"></i>
                  <span>Membership benefits may change</span>
                </div>
                <div className="summary-point">
                  <i className="fas fa-check-circle"></i>
                  <span>Deals subject to merchant terms</span>
                </div>
                <div className="summary-point">
                  <i className="fas fa-check-circle"></i>
                  <span>Privacy protection guaranteed</span>
                </div>
                <div className="summary-point">
                  <i className="fas fa-check-circle"></i>
                  <span>Community guidelines apply</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
