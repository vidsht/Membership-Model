// Mock API responses for testing frontend components
const mockPartnerData = {
  success: true,
  merchant: {
    id: 1,
    fullName: 'John Smith',
    email: 'john@testbusiness.com',
    phone: '+1234567890',
    address: '123 Business St, City, State',
    community: 'accra',
    membershipType: 'basic_business',
    status: 'approved',
    createdAt: '2024-01-01T00:00:00.000Z',
    lastLogin: '2024-01-15T10:30:00.000Z',
    businessId: 1,
    businessName: 'John\'s Test Business',
    businessDescription: 'A test business for demonstration',
    businessCategory: 'restaurant',
    businessAddress: '123 Business St, City, State',
    businessPhone: '+1234567890',
    businessEmail: 'john@testbusiness.com',
    website: 'https://johnstest.com',
    businessLicense: 'BL123456',
    taxId: 'TAX123456',
    businessStatus: 'approved',
    customDealLimit: 10,
    planName: 'Basic Business Plan',
    planPrice: 29.99,
    billingCycle: 'monthly',
    currency: 'USD',
    planMaxDeals: 5
  }
};

// Export for use in testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = mockPartnerData;
}

console.log('Mock partner data for testing:');
console.log(JSON.stringify(mockPartnerData, null, 2));
