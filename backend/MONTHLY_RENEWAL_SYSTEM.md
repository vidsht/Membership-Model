# Monthly Renewal System Documentation

## Overview
The Monthly Renewal System automatically manages deal redemption limits and deal posting limits for users and merchants. It resets monthly counters on the 1st of each month and keeps track of approved redemptions and deals posted within the current calendar month.

## Key Features

### 1. Automatic Monthly Renewal
- **Schedule**: Runs automatically on the 1st day of every month at 12:01 AM (Africa/Accra timezone)
- **Actions**:
  - Resets `monthlyRedemptionCount` to 0 for all users
  - Resets `monthlyDealCount` to 0 for all merchants  
  - Recomputes actual counts from database records (approved redemptions/deals for current month)
  - Sends renewal notification emails to users and merchants

### 2. Real-time Counter Updates
- **Redemption Approval**: When a merchant approves a redemption, the user's `monthlyRedemptionCount` increments automatically
- **Deal Approval**: When an admin approves a deal, the merchant's `monthlyDealCount` increments automatically
- **Calendar Month Logic**: Only counts actions within the current calendar month (YYYY-MM format)

### 3. Database Integration
- **Users Table**: Added columns for monthly tracking
  - `monthlyRedemptionCount`: Current month's approved redemptions
  - `monthlyDealCount`: Current month's approved deals posted
  - `customRedemptionLimit`: Admin-set custom limit (overrides plan default)
  - `lastRenewalDate`: Last renewal processing date

### 4. Frontend Synchronization
- User settings page shows "Redemptions This Month" matching the backend counter
- Merchant dashboard shows deals posted this month matching the backend counter
- Progress bars and limits reflect real-time data

## Database Schema

### Required Columns
```sql
-- Users table extensions
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthlyRedemptionCount INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthlyDealCount INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS customRedemptionLimit INT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lastRenewalDate DATE DEFAULT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_redemptions_user_status_date ON deal_redemptions(user_id, status, redeemed_at);
CREATE INDEX IF NOT EXISTS idx_deals_business_status_created ON deals(businessId, status, created_at);
```

## API Endpoints

### Manual Triggers (Admin Only)
- `POST /api/admin/email/trigger-limits-renewal` - Manually trigger monthly renewal
- `GET /api/admin/email/scheduled-tasks` - Check scheduled task status

### Statistics
- `GET /api/users/profile/with-plan` - Get user profile with plan limits
- Monthly statistics available via `notificationService.getMonthlyStatistics()`

## Files Modified/Created

### Backend Files
1. **`backend/services/notificationService.js`**
   - Added `recomputeMonthlyCounts()` - Recalculates monthly counters from DB
   - Added `incrementUserRedemptionCount()` - Real-time redemption counter update
   - Added `incrementMerchantDealCount()` - Real-time deal counter update
   - Added `getMonthlyStatistics()` - Comprehensive monthly stats

2. **`backend/services/scheduledTasks.js`**
   - Monthly renewal cron job: `'1 0 1 * *'` (1st day, 12:01 AM)
   - Calls `NotificationHooks.onMonthlyLimitsRenewal()`

3. **`backend/routes/merchant.js`**
   - Added counter update when approving redemptions
   - Integration with `notificationService.incrementUserRedemptionCount()`

4. **`backend/routes/admin.js`**
   - Added counter update when approving deals (single and batch)
   - Integration with `notificationService.incrementMerchantDealCount()`

5. **`backend/setup-monthly-renewal-system.js`** (New)
   - Complete setup script for database schema and initial data

6. **`backend/test-monthly-renewal.js`** (New)
   - Interactive testing tool with menu-driven interface

### Frontend Files
1. **`frontend/src/pages/UserSettings.jsx`**
   - Updated "Redemptions This Month" calculation
   - Handles both `redeemedAt` and `redeemed_at` field formats
   - Normalizes status comparison to lowercase 'approved'

## Testing Instructions

### Method 1: Interactive Tester (Recommended)
```powershell
# In backend directory
node test-monthly-renewal.js
```

**Menu Options:**
1. **Setup Database** - First-time database setup with required columns and indexes
2. **Create Test Data** - Creates sample users, merchants, deals, and redemptions
3. **Trigger Manual Renewal** - Tests the monthly renewal process
4. **Check Current Counts** - Shows monthly counters vs raw database counts
5. **View Monthly Statistics** - Displays comprehensive statistics
6. **Test Approval Counters** - Tests real-time counter updates
7. **Reset All Counters** - Resets all monthly counts to 0

### Method 2: API Testing
```powershell
# Start backend server (if not already running)
npm start
```

Below are explicit examples for obtaining an admin token and triggering the manual renewal endpoint using curl (bash) and PowerShell (Windows). Replace the sample admin credentials with a real admin user in your environment.

Bash / curl (requires jq to parse JSON):
```bash
# 1) Login and capture token (returns JSON with token field)
response=$(curl -s -X POST "http://localhost:5001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin_password"}')
TOKEN=$(echo "$response" | jq -r '.token')

# 2) Trigger the monthly limits renewal
curl -v -X POST "http://localhost:5001/api/admin/email/trigger-limits-renewal" \
  -H "Authorization: Bearer $TOKEN"

# 3) Check scheduled task status
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5001/api/admin/email/scheduled-tasks" | jq
```

PowerShell (Windows):
```powershell
# 1) Login and capture token
$loginBody = @{ email = 'admin@example.com'; password = 'admin_password' } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Method Post -Uri 'http://localhost:5001/api/auth/login' -Body $loginBody -ContentType 'application/json'
$token = $loginResp.token

# 2) Trigger the monthly limits renewal
Invoke-RestMethod -Method Post -Uri 'http://localhost:5001/api/admin/email/trigger-limits-renewal' -Headers @{ Authorization = "Bearer $token" }

# 3) Check scheduled task status
Invoke-RestMethod -Uri 'http://localhost:5001/api/admin/email/scheduled-tasks' -Headers @{ Authorization = "Bearer $token" }
```

If your project uses session cookies instead of a JSON token, adjust the login step to store cookies and include them in subsequent requests.

### Method 3: Database Verification
```sql
-- Check current monthly counts
SELECT id, fullName, userType, monthlyRedemptionCount, monthlyDealCount, lastRenewalDate 
FROM users WHERE status = 'active' ORDER BY userType;

-- Verify against actual database records (current month)
SELECT 
  dr.user_id, 
  u.fullName,
  COUNT(*) as actualRedemptions
FROM deal_redemptions dr
JOIN users u ON dr.user_id = u.id
WHERE dr.status = 'approved' 
  AND DATE_FORMAT(dr.redeemed_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
GROUP BY dr.user_id, u.fullName;

-- Check merchant deal counts
SELECT 
  d.businessId, 
  u.fullName,
  COUNT(*) as actualDeals
FROM deals d
JOIN users u ON d.businessId = u.id
WHERE d.status IN ('approved', 'active')
  AND DATE_FORMAT(d.created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
GROUP BY d.businessId, u.fullName;
```

## Quick Setup Guide

### 1. First Time Setup
```powershell
# Run the setup script
cd backend
node setup-monthly-renewal-system.js
```

### 2. Create Test Data
```powershell
# Use the interactive tester
node test-monthly-renewal.js
# Select option 2 to create test data
```

### 3. Test Manual Renewal
```powershell
# Use the interactive tester
node test-monthly-renewal.js
# Select option 3 to trigger manual renewal
```

### 4. Verify Frontend
```powershell
# Start frontend (in separate terminal)
cd frontend
npm run dev

# Navigate to:
# - User Settings page (/settings) - Check "Redemptions This Month"
# - Merchant Dashboard (/merchant/dashboard) - Check deals posted this month
```

## How It Works

### Monthly Renewal Process
1. **Cron Trigger**: Scheduled task runs on 1st of month at 12:01 AM
2. **Reset Counters**: All `monthlyRedemptionCount` and `monthlyDealCount` set to 0
3. **Recompute**: Query database for approved redemptions/deals in current calendar month
4. **Update Counters**: Set counters to actual database counts
5. **Send Emails**: Notify users and merchants about limit renewals

### Real-time Updates
1. **Redemption Approved**: Merchant approves redemption → `incrementUserRedemptionCount()` called
2. **Deal Approved**: Admin approves deal → `incrementMerchantDealCount()` called
3. **Calendar Month Check**: Only increment if action is in current month
4. **Frontend Sync**: Frontend displays match backend counters

### Data Consistency
- **Source of Truth**: Database records (`deal_redemptions`, `deals`) with `status = 'approved'`
- **Performance**: Monthly counters (`monthlyRedemptionCount`, `monthlyDealCount`) for quick access
- **Synchronization**: Monthly renewal ensures counters match database reality
- **Real-time**: Counter increments keep counters current between renewals

## Troubleshooting

### Common Issues
1. **Counters Don't Match**: Run manual renewal to resync
2. **Missing Columns**: Run setup script to add required database columns
3. **Timezone Issues**: Ensure server timezone matches cron schedule (Africa/Accra)
4. **Frontend Mismatch**: Check if frontend uses same date format (calendar month vs 30-day window)

### Debug Commands
```powershell
# Check scheduled tasks status
node -e "console.log(require('./services/scheduledTasks').getTaskStatus())"

# Manual recompute
node -e "require('./services/notificationService').recomputeMonthlyCounts().then(() => process.exit())"

# Check monthly stats
node -e "require('./services/notificationService').getMonthlyStatistics().then(s => console.log(JSON.stringify(s, null, 2))).then(() => process.exit())"
```

## Monitoring

### Log Messages to Watch
- `✅ Monthly limits renewal completed` - Successful renewal
- `📈 Incremented redemption count for user X` - Real-time redemption counter
- `📈 Incremented deal count for merchant X` - Real-time deal counter
- `✅ Recomputed monthlyRedemptionCount and monthlyDealCount` - Successful recomputation

### Health Checks
- Monthly renewal should run automatically on 1st of each month
- Counters should increment when approvals happen
- Frontend counts should match backend counters
- Database indexes should improve query performance

## Future Enhancements

1. **Real-time Decrements**: Handle counter decrements when approvals are revoked
2. **Historical Tracking**: Store monthly statistics for trend analysis
3. **Limit Warnings**: Notify users/merchants when approaching limits
4. **Custom Time Windows**: Support different renewal periods (quarterly, annual)
5. **Audit Trail**: Log all counter changes for debugging

---

This system ensures accurate, real-time tracking of monthly activities while maintaining database consistency and providing automated renewal functionality.
