// Simple test to verify authentication is working
// Usage: node verify-auth.js

const axios = require('axios');

async function verifyAuth() {
  try {
    console.log('🔍 Testing authentication flow...\n');
    
    // Test backend health
    console.log('1. Testing backend health...');
    const healthResponse = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Backend is running:', healthResponse.data.status);
    
    // Create axios instance with credentials
    const api = axios.create({
      baseURL: 'http://localhost:5000/api',
      withCredentials: true
    });
    
    // First, try to login as admin
    console.log('\n2. Attempting admin login...');
    const loginResponse = await api.post('/auth/login', {
      email: 'admin@indiansinghana.org',
      password: 'admin123'
    });
    
    console.log('✅ Login successful for:', loginResponse.data.user.email);
    
    // Extract cookies from login response
    const cookies = loginResponse.headers['set-cookie'];
    console.log('📝 Session cookies received:', cookies?.length || 0, 'cookies');
    
    // Now try to access admin partners with cookies
    console.log('\n3. Testing admin partners access...');
    const partnersResponse = await api.get('/admin/partners', {
      headers: {
        Cookie: cookies ? cookies.join('; ') : ''
      }
    });
    
    console.log('✅ Partners fetched successfully:', partnersResponse.data.partners?.length || 0, 'partners');
    
    // Test getting a specific partner (using first partner if available)
    if (partnersResponse.data.partners && partnersResponse.data.partners.length > 0) {
      const firstPartner = partnersResponse.data.partners[0];
      console.log('\n4. Testing partner status update...');
      console.log('   Partner ID:', firstPartner.id);
      console.log('   Current status:', firstPartner.status);
      
      // Try to update the partner status
      const statusResponse = await api.put(`/admin/partners/${firstPartner.id}/status`, {
        status: firstPartner.status === 'approved' ? 'suspended' : 'approved'
      }, {
        headers: {
          Cookie: cookies ? cookies.join('; ') : ''
        }
      });
      
      console.log('✅ Status update successful:', statusResponse.data.message);
    } else {
      console.log('⚠️  No partners found to test status update');
    }
    
    console.log('\n🎉 All authentication tests passed!');
    
  } catch (error) {
    console.error('\n❌ Authentication test failed:');
    console.error('   Error:', error.message);
    console.error('   Status:', error.response?.status);
    console.error('   Status Text:', error.response?.statusText);
    console.error('   Data:', error.response?.data);
    
    if (error.response?.status === 401) {
      console.error('\n💡 This is a 401 Unauthorized error - the issue you\'re experiencing!');
    }
  }
}

verifyAuth();
