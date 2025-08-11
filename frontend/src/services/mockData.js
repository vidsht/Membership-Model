// Temporary API mock for testing frontend components
const mockData = {
  '/admin/partners/1': {
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
  },
  '/admin/partners/2': {
    success: true,
    merchant: {
      id: 2,
      fullName: 'Jane Doe',
      email: 'jane@anotherbiz.com',
      phone: '+1234567891',
      address: '456 Commerce Ave, City, State',
      community: 'kumasi',
      membershipType: 'premium_business',
      status: 'approved',
      createdAt: '2024-01-02T00:00:00.000Z',
      lastLogin: '2024-01-16T09:15:00.000Z',
      businessId: 2,
      businessName: 'Jane\'s Premium Store',
      businessDescription: 'A premium retail business',
      businessCategory: 'retail',
      businessAddress: '456 Commerce Ave, City, State',
      businessPhone: '+1234567891',
      businessEmail: 'jane@anotherbiz.com',
      website: 'https://janespremium.com',
      businessLicense: 'BL789012',
      taxId: 'TAX789012',
      businessStatus: 'approved',
      customDealLimit: 25,
      planName: 'Premium Business Plan',
      planPrice: 99.99,
      billingCycle: 'monthly',
      currency: 'USD',
      planMaxDeals: 20
    }
  }
};

export default mockData;
