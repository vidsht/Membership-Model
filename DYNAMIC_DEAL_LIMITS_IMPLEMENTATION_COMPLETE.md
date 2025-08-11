# Dynamic Deal Limits Implementation Guide

## Overview
This implementation provides dynamic deal limits based on business plans with admin-customizable overrides per business.

## Features Implemented

### ✅ 1. Backend Logic (merchant.js)
- **Dynamic Deal Calculation**: `user.dealLimit = user.customDealLimit || user.dealPostingLimit || user.maxDealsPerMonth || 0`
- **Monthly Tracking**: Counts deals created in current month using `DATE_FORMAT(created_at, '%Y-%m')`
- **Plan Integration**: Falls back to plan-based limits when no custom limit is set
- **Deal Posting Middleware**: `checkDealPostingLimit` validates before allowing deal creation

### ✅ 2. Database Structure
- **businesses.customDealLimit**: INT column for custom monthly deal limits
- **Plan Integration**: Compatible with existing plans table (`max_deals_per_month` column)
- **Current Month Tracking**: Real-time calculation of deals posted this month

### ✅ 3. Admin Panel Enhancement
- **Business Partners Management**: Added custom deal limit field in edit forms
- **Visual Indicators**: Custom limits displayed with star icon and color coding
- **Database Updates**: Admin can override plan limits for specific businesses

### ✅ 4. Merchant Dashboard
- **Real-time Display**: Shows current usage vs limit with progress bars
- **Custom Limit Badges**: Highlights when custom limits are applied
- **Smart Button Logic**: Deal creation button disabled when limit reached
- **Upgrade Suggestions**: Different messages for custom vs plan limits

### ✅ 5. API Endpoints
- **GET /merchant/dashboard**: Returns comprehensive deal usage stats
- **PUT /admin/partners/:id**: Supports updating customDealLimit
- **POST /merchant/deals**: Validates against current limits before creation

## Implementation Details

### Backend Logic Flow:
```javascript
// 1. Calculate current month usage
const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
const dealsThisMonth = await queryAsync(`
  SELECT COUNT(*) as count 
  FROM deals 
  WHERE businessId = ? AND DATE_FORMAT(created_at, '%Y-%m') = ?
`, [businessId, currentMonth]);

// 2. Determine effective limit (custom overrides plan)
const effectiveLimit = customDealLimit || planDealLimit || 0;

// 3. Check if can post more deals
const canPostDeals = effectiveLimit === -1 || dealsThisMonth < effectiveLimit;
```

### Frontend Integration:
```jsx
// Display with custom limit indicator
{businessInfo.customDealLimit && (
  <span className="custom-limit-badge">
    <i className="fas fa-star"></i> Custom
  </span>
)}

// Smart deal creation button
<button 
  disabled={!stats.canPostDeals}
  onClick={() => stats.canPostDeals ? setShowDealForm(true) : showLimitMessage()}
>
  Create New Deal
</button>
```

### Admin Interface:
```jsx
// Custom deal limit field in business edit form
<input 
  type="number" 
  value={editingPartner.customDealLimit || ''} 
  onChange={(e) => setEditingPartner({
    ...editingPartner,
    customDealLimit: e.target.value ? parseInt(e.target.value) : null
  })}
  placeholder="Leave empty to use plan default"
/>
```

## Database Schema Updates

### businesses table:
```sql
ALTER TABLE businesses 
ADD COLUMN customDealLimit INT DEFAULT NULL 
COMMENT 'Custom monthly deal limit override for this business';
```

### plans table (existing):
```sql
-- Already has max_deals_per_month column for plan-based limits
SELECT `key`, name, max_deals_per_month FROM plans WHERE type = 'merchant';
```

## Usage Examples

### Example 1: Plan-based Limit
- Business: "Restaurant ABC"
- Plan: Gold Business (10 deals/month)
- Custom Limit: NULL
- **Effective Limit**: 10 deals/month

### Example 2: Custom Override
- Business: "Premium Partner XYZ"  
- Plan: Basic Business (2 deals/month)
- Custom Limit: 25
- **Effective Limit**: 25 deals/month (admin override)

### Example 3: Unlimited Custom
- Business: "VIP Partner"
- Plan: Any plan
- Custom Limit: -1
- **Effective Limit**: Unlimited deals

## API Response Format

### Dashboard Data:
```json
{
  "data": {
    "stats": {
      "actualDealsThisMonth": 3,
      "dealLimit": 15,
      "dealLimitRemaining": 12,
      "canPostDeals": true
    },
    "business": {
      "customDealLimit": 15,
      "businessName": "Test Business"
    },
    "plan": {
      "name": "Gold Business",
      "dealPostingLimit": 10
    }
  }
}
```

### Admin Partners List:
```json
{
  "merchants": [
    {
      "id": 123,
      "businessName": "Restaurant ABC",
      "customDealLimit": 25,
      "planName": "Basic Business"
    }
  ]
}
```

## Testing Results

✅ **Database Structure**: customDealLimit column exists and functional
✅ **Custom Limit Updates**: Successfully tested setting custom limits via admin
✅ **Calculation Logic**: Verified custom limits override plan defaults
✅ **Frontend Display**: Custom limits displayed with visual indicators
✅ **Deal Creation**: Proper validation and user feedback when limits reached

## File Modifications Summary

### Backend Files:
- `routes/merchant.js`: Enhanced with custom deal limit logic
- `routes/admin.js`: Added customDealLimit to partner management
- `database_schema.sql`: Documents customDealLimit column

### Frontend Files:
- `components/admin/BusinessPartners/PartnerList.jsx`: Added custom limit column and edit field
- `components/admin/BusinessPartners/MerchantManagementEnhanced.jsx`: Added custom limit form field
- `pages/MerchantDashboard.jsx`: Enhanced display with custom limit indicators
- `styles/MerchantDashboard.css`: Added styling for custom limit badges and disabled states
- `components/admin/BusinessPartners/PartnerList.css`: Added deal limit display styling

### Test Files:
- `test-custom-deal-limits.js`: Comprehensive testing script for verification

## Deployment Notes

1. **Database Migration**: The customDealLimit column already exists in production
2. **Backward Compatibility**: Maintains existing plan-based limits as fallbacks  
3. **Admin Training**: Admins can now set custom limits in business partner management
4. **Merchant Experience**: Enhanced dashboard with clear limit visibility

## Future Enhancements

1. **Bulk Custom Limit Updates**: Admin interface for bulk limit changes
2. **Limit History Tracking**: Audit trail of custom limit changes
3. **Automated Limit Adjustments**: Based on business performance metrics
4. **Advanced Notifications**: Email alerts when businesses approach their limits
5. **Limit Analytics**: Dashboard showing limit usage across all businesses

This implementation provides a flexible, admin-controlled deal limit system that maintains plan-based defaults while allowing per-business customization.
