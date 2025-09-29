import React, { useState, useEffect } from 'react';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';
import './WhatsAppBusinessSettings.css';

/**
 * WhatsApp Business Settings Component
 * Allows admins to view status and test WhatsApp Business API integration
 */
const WhatsAppBusinessSettings = () => {
  const { showNotification } = useNotification();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testLoading, setTestLoading] = useState(false);
  const [testMessage, setTestMessage] = useState({
    phone: '',
    message: '🎉 Test message from Indians in Ghana WhatsApp Business API!\n\nThis is a test to verify our WhatsApp Business integration is working correctly.\n\n📞 If you received this message, our system is configured properly.\n\n🇮🇳 Indians In Ghana Team 🇬🇭'
  });
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    fetchWhatsAppStatus();
  }, []);

  const fetchWhatsAppStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/whatsapp/status');
      if (response.data.success) {
        setStatus(response.data);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
      showNotification('Failed to load WhatsApp status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setTestLoading(true);
      const response = await api.post('/admin/whatsapp/test-connection');
      if (response.data.success) {
        showNotification('WhatsApp connection test completed', 'success');
        setTestResult(response.data.testResult);
        // Refresh status after test
        await fetchWhatsAppStatus();
      }
    } catch (error) {
      console.error('Error testing WhatsApp connection:', error);
      showNotification('Failed to test WhatsApp connection', 'error');
    } finally {
      setTestLoading(false);
    }
  };

  const sendTestMessage = async () => {
    try {
      if (!testMessage.phone.trim()) {
        showNotification('Please enter a phone number', 'error');
        return;
      }

      setTestLoading(true);
      const response = await api.post('/admin/whatsapp/test-message', testMessage);
      
      if (response.data.success) {
        const result = response.data.result;
        if (result.success) {
          showNotification('Test message sent successfully!', 'success');
          setTestResult(result);
        } else {
          showNotification(`Test message failed: ${result.error}`, 'error');
          setTestResult(result);
        }
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      const errorMessage = error.response?.data?.message || 'Failed to send test message';
      showNotification(errorMessage, 'error');
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="whatsapp-settings loading">
        <div className="loading-spinner"></div>
        <p>Loading WhatsApp Business status...</p>
      </div>
    );
  }

  const { configuration, connection, instructions } = status || {};
  const isConfigured = configuration?.configured;
  const connectionSuccess = connection?.success;

  return (
    <div className="whatsapp-settings">
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>WhatsApp Business API Settings</h3>
          <p>Configure and test WhatsApp Business integration for automated notifications</p>
        </div>

        {/* Configuration Status */}
        <div className="config-status">
          <h4>Configuration Status</h4>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">API Configuration:</span>
              <span className={`status-badge ${isConfigured ? 'success' : 'error'}`}>
                {isConfigured ? '✅ Configured' : '❌ Not Configured'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Phone Number ID:</span>
              <span className={`status-badge ${configuration?.hasPhoneNumberId ? 'success' : 'error'}`}>
                {configuration?.hasPhoneNumberId ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Access Token:</span>
              <span className={`status-badge ${configuration?.hasAccessToken ? 'success' : 'error'}`}>
                {configuration?.hasAccessToken ? '✅ Set' : '❌ Missing'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">API Version:</span>
              <span className="status-value">{configuration?.apiVersion || 'Unknown'}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Mode:</span>
              <span className={`status-badge ${configuration?.mode === 'production' ? 'success' : 'warning'}`}>
                {configuration?.mode === 'production' ? '🚀 Production' : '🔧 Development'}
              </span>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        {isConfigured && (
          <div className="connection-status">
            <h4>Connection Status</h4>
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">API Connection:</span>
                <span className={`status-badge ${connectionSuccess ? 'success' : 'error'}`}>
                  {connectionSuccess ? '✅ Connected' : '❌ Failed'}
                </span>
              </div>
              {connection?.phoneNumber && (
                <div className="status-item">
                  <span className="status-label">Phone Number:</span>
                  <span className="status-value">{connection.phoneNumber}</span>
                </div>
              )}
              {connection?.status && (
                <div className="status-item">
                  <span className="status-label">Status:</span>
                  <span className="status-value">{connection.status}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Setup Instructions */}
        {!isConfigured && (
          <div className="setup-instructions">
            <h4>Setup Instructions</h4>
            <div className="instruction-card">
              <p><strong>To configure WhatsApp Business API:</strong></p>
              <ol>
                <li>Set up a WhatsApp Business Cloud API account</li>
                <li>Get your Phone Number ID from the WhatsApp API dashboard</li>
                <li>Generate an Access Token with messaging permissions</li>
                <li>Add these environment variables to your server:</li>
              </ol>
              <div className="env-variables">
                <code>WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id</code><br/>
                <code>WHATSAPP_ACCESS_TOKEN=your_access_token</code>
              </div>
              <p>
                <strong>Documentation: </strong>
                <a href={instructions?.documentation} target="_blank" rel="noopener noreferrer">
                  WhatsApp Cloud API Documentation
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Test Section */}
        {isConfigured && (
          <div className="test-section">
            <h4>Test WhatsApp Integration</h4>
            
            <div className="test-controls">
              <button
                className="btn btn-secondary"
                onClick={testConnection}
                disabled={testLoading}
              >
                {testLoading ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            <div className="test-message-section">
              <h5>Send Test Message</h5>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  value={testMessage.phone}
                  onChange={(e) => setTestMessage(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+233501234567 or 0501234567"
                  className="form-control"
                />
                <p className="field-description">
                  Enter a Ghana phone number in international format (+233) or local format (0)
                </p>
              </div>

              <div className="form-group">
                <label>Test Message</label>
                <textarea
                  value={testMessage.message}
                  onChange={(e) => setTestMessage(prev => ({ ...prev, message: e.target.value }))}
                  rows="8"
                  className="form-control"
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={sendTestMessage}
                disabled={testLoading || !testMessage.phone.trim()}
              >
                {testLoading ? 'Sending...' : 'Send Test Message'}
              </button>
            </div>
          </div>
        )}

        {/* Test Results */}
        {testResult && (
          <div className="test-results">
            <h4>Test Results</h4>
            <div className={`result-card ${testResult.success ? 'success' : 'error'}`}>
              <div className="result-header">
                <span className={`result-status ${testResult.success ? 'success' : 'error'}`}>
                  {testResult.success ? '✅ Success' : '❌ Failed'}
                </span>
                {testResult.phone && (
                  <span className="result-phone">To: {testResult.phone}</span>
                )}
              </div>
              
              {testResult.success && testResult.messageId && (
                <div className="result-details">
                  <p><strong>Message ID:</strong> {testResult.messageId}</p>
                  <p><strong>Status:</strong> {testResult.status}</p>
                  {testResult.mode && (
                    <p><strong>Mode:</strong> {testResult.mode}</p>
                  )}
                </div>
              )}

              {!testResult.success && testResult.error && (
                <div className="result-error">
                  <p><strong>Error:</strong> {testResult.error}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Notification Status */}
        <div className="notification-status">
          <h4>Notification Services</h4>
          <div className="service-grid">
            <div className="service-item">
              <span className="service-name">Birthday Greetings</span>
              <span className={`service-status ${isConfigured ? 'active' : 'manual'}`}>
                {isConfigured ? '📱 WhatsApp Business' : '📝 Manual/Logged'}
              </span>
            </div>
            <div className="service-item">
              <span className="service-name">Plan Expiry Warnings</span>
              <span className={`service-status ${isConfigured ? 'active' : 'manual'}`}>
                {isConfigured ? '📱 WhatsApp Business' : '📝 Manual/Logged'}
              </span>
            </div>
            <div className="service-item">
              <span className="service-name">Deal Approvals</span>
              <span className={`service-status ${isConfigured ? 'active' : 'manual'}`}>
                {isConfigured ? '📱 WhatsApp Business' : '📝 Manual/Logged'}
              </span>
            </div>
          </div>
          <p className="service-note">
            {isConfigured 
              ? 'WhatsApp Business API is configured. Messages will be sent automatically.'
              : 'WhatsApp Business API not configured. Messages will be logged for manual sending.'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppBusinessSettings;