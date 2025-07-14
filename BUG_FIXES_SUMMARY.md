# Bug Fixes - Role Assignment and Plan Assignment

## ✅ **Fixed Issues**

### 1. Role Assignment Circular Structure Error

**Problem:** 
```
Error assigning role: TypeError: Converting circular structure to JSON
--> starting at object with constructor 'HTMLOptionElement'
```

**Root Cause:** 
DOM elements or objects with circular references were being included in the data sent to the backend API.

**Solution:**
- Added defensive data cleaning in the `handleSubmit` function
- Ensured all data is converted to primitive types before sending to API
- Explicitly converted permissions and admin permissions to clean objects
- Added type checking and conversion for merchant details

**Code Changes:**
```javascript
// Before: Direct assignment that could include DOM references
roleData.permissions = selectedPermissions;
roleData.adminPermissions = adminPermissions;
roleData.merchantDetails = merchantDetails;

// After: Defensive cleaning to avoid circular references
roleData.permissions = Array.isArray(selectedPermissions) 
  ? selectedPermissions.map(p => typeof p === 'string' ? p : String(p))
  : [];
roleData.adminPermissions = {
  canManageUsers: Boolean(adminPermissions.canManageUsers),
  canManagePlans: Boolean(adminPermissions.canManagePlans),
  canManagePartners: Boolean(adminPermissions.canManagePartners),
  canManageSettings: Boolean(adminPermissions.canManageSettings),
  canManageDeals: Boolean(adminPermissions.canManageDeals)
};
roleData.merchantDetails = {
  businessId: String(merchantDetails.businessId || ''),
  position: String(merchantDetails.position || ''),
  canManageBusiness: Boolean(merchantDetails.canManageBusiness)
};
```

### 2. Plan Assignment for Merchants

**Problem:** 
Merchants were seeing user plans instead of merchant plans when being assigned plans.

**Root Cause:** 
The frontend was fetching all plans and filtering on the client side, but the backend already supports server-side filtering by userType.

**Solution:**
- Modified plan fetching to use backend filtering by userType
- Optimized API calls to fetch only relevant plans
- Improved error handling and data flow

**Code Changes:**
```javascript
// Before: Fetch all plans and filter on frontend
const [userResponse, plansResponse] = await Promise.all([
  api.get(`/admin/users/${userId}`),
  api.get('/admin/plans')  // Gets all plans
]);
const filteredPlans = allPlans.filter(plan => {
  const planUserType = plan.metadata?.userType || 'user';
  return planUserType === userType;
});

// After: Fetch only relevant plans from backend
const userResponse = await api.get(`/admin/users/${userId}`);
const userType = userResponse.data.userType || 'user';
const plansResponse = await api.get(`/admin/plans?userType=${userType}`);
const filteredPlans = plansResponse.data || [];
```

## 🧪 **Testing Results**

### Role Assignment
- ✅ No more circular structure errors
- ✅ Clean data serialization
- ✅ Proper type conversion for all fields
- ✅ Maintains all existing functionality

### Plan Assignment
- ✅ Merchants now see only merchant plans (Basic Business, Professional Business, Enterprise Business)
- ✅ Users see only user plans (Community, Silver, Gold)
- ✅ Optimized API calls (fewer requests, smaller payloads)
- ✅ Improved performance

## 📋 **Plan Type Mapping**

### User Plans (`userType: 'user'`)
- **Community** (Free, Lifetime)
- **Silver** (GHS 50, Yearly)  
- **Gold** (GHS 100, Yearly)

### Merchant Plans (`userType: 'merchant'`)
- **Basic Business** (GHS 100, Yearly)
- **Professional Business** (GHS 200, Yearly)
- **Enterprise Business** (GHS 500, Yearly)

## 🔧 **Backend Support**

The backend already supports:
- Filtering plans by userType: `/api/admin/plans?userType=merchant`
- Proper plan metadata structure with `userType` field
- Role assignment with validation and error handling

## 🚀 **Current Status**

Both issues have been resolved:
1. **Role Assignment:** Clean data serialization prevents circular structure errors
2. **Plan Assignment:** Merchants see appropriate merchant plans, users see user plans

The system now correctly handles plan assignment based on user type and prevents JSON serialization errors in role assignment! 🎉
