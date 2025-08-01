# Database Migration & Cleanup Plan

## Current Issues Identified

### 1. Mixed Database Usage
- **Problem:** Code uses both MongoDB/Mongoose models AND MySQL direct queries
- **Files affected:** 
  - `backend/routes/admin.js` - Uses both User.find() and db.query()
  - `backend/routes/merchant.js` - Imports User model but uses db.query()
  - All models in `/backend/models/` are Mongoose schemas

### 2. Unused Dependencies
- `mongoose` - Still in package.json but not needed
- `connect-mongo` - MongoDB session store not used
- `memory-fs` - Unclear usage

### 3. Missing Database Structure
- No SQL schema file found
- Tables inferred from queries only
- Missing required fields in users table

## Migration Steps

### Step 1: Remove MongoDB Dependencies ✅
- Remove mongoose models
- Remove mongoose from package.json
- Remove connect-mongo
- Clean up imports

### Step 2: Create MySQL Schema ✅
- Define complete table structure
- Add missing user fields
- Create migration script

### Step 3: Update Backend Code ✅
- Replace all Mongoose usage with SQL queries
- Standardize error handling
- Update admin.js to use SQL only

### Step 4: Test & Validate ✅
- Verify all endpoints work
- Test authentication flows
- Validate data operations

## Execution Plan

1. **Backup current working state**
2. **Remove unused models and dependencies**
3. **Create proper MySQL schema**
4. **Update admin.js to use SQL queries only**
5. **Test all functionality**
6. **Clean up package.json**
