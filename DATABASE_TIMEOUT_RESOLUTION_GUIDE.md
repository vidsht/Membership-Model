# Database ETIMEDOUT Error Resolution Guide

## 🚨 **Emergency Response Checklist**

### Immediate Actions (Do These First)

1. **Run Database Diagnostics**
   ```bash
   cd backend
   node diagnose-database.js
   ```

2. **Check Current Database Host**
   ```bash
   echo "DB_HOST: $DB_HOST"
   echo "DB_NAME: $DB_NAME" 
   echo "DB_USER: $DB_USER"
   ```

3. **Test Direct Connection**
   ```bash
   mysql -h 82.197.82.19 -u [username] -p [database_name]
   ```

## 🔍 **Root Cause Analysis**

### Issue Summary
- **Error**: `Database query error: AggregateError [ETIMEDOUT] ... connect ETIMEDOUT 82.197.82.19:3306`
- **Impact**: Production application experiencing database connectivity failures
- **Environment**: Production vs Development host discrepancy

### Identified Problems

1. **Host Configuration Mismatch**
   - Production errors show IP: `82.197.82.19:3306`
   - Development config uses hostname: `auth-db1388.hstgr.io`
   - **Root Cause**: DNS resolution or environment variable misconfiguration

2. **Connection Pool Limitations**
   - Current limit: 20 connections
   - Production load may exceed pool capacity
   - **Root Cause**: Insufficient connection scaling for production traffic

3. **Timeout Configuration**
   - Current: 60-second timeouts
   - May be too aggressive for production network latency
   - **Root Cause**: Network conditions differ between dev/prod

## 🛠️ **Solution Implementation**

### Step 1: Immediate Database Configuration Fix

**Replace `backend/db.js` with optimized version:**

```javascript
// Use the production-optimized configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  // Production-optimized settings
  connectionLimit: 50,          // Increased from 20
  acquireTimeout: 30000,        // Reduced to 30 seconds
  connectTimeout: 30000,        // Reduced to 30 seconds
  timeout: 120000,              // Increased to 2 minutes
  idleTimeout: 180000,          // Reduced to 3 minutes
  
  // Enhanced reliability
  reconnect: true,
  maxReconnects: 3,
  reconnectDelay: 2000,
  pingInterval: 60000
});
```

### Step 2: Environment Variable Verification

**Check production environment:**
```bash
# Verify these match your actual database
echo $DB_HOST      # Should be your actual database host
echo $DB_PORT      # Should be 3306 (default)
echo $DB_NAME      # Your database name
echo $DB_USER      # Your database username
```

**If environment variables are wrong, update them:**
```bash
export DB_HOST="your-actual-host"  # Use IP or hostname that works
export DB_PORT="3306"
export DB_NAME="your-database-name"
export DB_USER="your-username"
export DB_PASSWORD="your-password"
```

### Step 3: Network Connectivity Testing

**Test different connection methods:**
```bash
# Test direct IP connection
mysql -h 82.197.82.19 -P 3306 -u [username] -p

# Test hostname connection  
mysql -h auth-db1388.hstgr.io -P 3306 -u [username] -p

# Test DNS resolution
nslookup auth-db1388.hstgr.io
ping auth-db1388.hstgr.io
```

### Step 4: Application-Level Fixes

**1. Enable Database Health Monitoring**
```javascript
// Add to server.js
const { DatabaseHealthMonitor } = require('./database-health-monitor');
const healthMonitor = new DatabaseHealthMonitor();

// Add health check endpoint
app.get('/health/database', (req, res) => {
  res.json(healthMonitor.getHealth());
});
```

**2. Implement Enhanced Error Handling**
```javascript
// Replace auth middleware
const { auth, handleDatabaseError } = require('./middleware/auth-enhanced');

// Add error handling middleware
app.use(handleDatabaseError);
```

**3. Add Connection Retry Logic**
```javascript
// Use enhanced database wrapper
const { DatabaseConnectionWrapper } = require('./database-health-monitor');

// Replace direct db.query calls with:
const results = await DatabaseConnectionWrapper.queryWithRetry(query, params);
```

## 🔧 **Production Deployment Steps**

### Deployment Checklist

1. **Backup Current Configuration**
   ```bash
   cp backend/db.js backend/db.js.backup
   cp backend/middleware/auth.js backend/middleware/auth.js.backup
   ```

2. **Deploy Enhanced Files**
   - Copy `db-production-optimized.js` → `db.js`
   - Copy `auth-enhanced.js` → `middleware/auth.js` 
   - Add `database-health-monitor.js`

3. **Update Server.js**
   ```javascript
   // Add health monitoring
   const { DatabaseHealthMonitor } = require('./database-health-monitor');
   const healthMonitor = new DatabaseHealthMonitor();
   
   // Add health endpoint
   app.get('/api/health', (req, res) => {
     res.json({
       status: 'ok',
       database: healthMonitor.getHealth(),
       timestamp: new Date().toISOString()
     });
   });
   ```

4. **Restart Application**
   ```bash
   # Stop current processes
   pm2 stop all
   
   # Start with new configuration
   pm2 start backend/server.js --name "membership-backend"
   pm2 start frontend/package.json --name "membership-frontend"
   
   # Monitor logs
   pm2 logs
   ```

5. **Verify Fix**
   ```bash
   # Check health endpoint
   curl http://your-domain/api/health
   
   # Monitor application logs
   pm2 logs membership-backend
   
   # Run diagnostics
   node backend/diagnose-database.js
   ```

## 🎯 **Monitoring & Prevention**

### Continuous Monitoring

1. **Health Check Endpoint**: `GET /api/health`
2. **Database Metrics**: Connection count, response times, error rates
3. **Alert Thresholds**: 
   - Response time > 5 seconds
   - Error rate > 5%
   - Connection failures > 3 consecutive

### Performance Optimization

1. **Connection Pool Tuning**
   - Monitor active connections
   - Adjust `connectionLimit` based on load
   - Set appropriate `idleTimeout`

2. **Query Optimization**
   - Add indexes for frequently queried columns
   - Use connection pooling for all database operations
   - Implement query caching where appropriate

3. **Infrastructure Improvements**
   - Consider database read replicas
   - Implement connection load balancing
   - Use database monitoring tools

## 📞 **Emergency Contacts & Escalation**

### If Issues Persist

1. **Database Provider Support**
   - Contact your hosting provider (appears to be Hostinger)
   - Provide error logs and diagnostic results
   - Ask about connection limits and network issues

2. **Temporary Workarounds**
   - Increase retry attempts and delays
   - Implement graceful degradation
   - Use cached data where possible
   - Display maintenance messages during peak issues

3. **Long-term Solutions**
   - Consider database migration to more stable provider
   - Implement database clustering
   - Use managed database services (AWS RDS, Google Cloud SQL)

## 📋 **Testing Checklist**

After implementing fixes, verify:

- [ ] Database diagnostic script passes
- [ ] Health check endpoint returns healthy status
- [ ] Application starts without connection errors
- [ ] User authentication works correctly
- [ ] Database queries complete within acceptable time
- [ ] Error handling provides meaningful user feedback
- [ ] Connection pool metrics are within normal ranges

---

**Last Updated**: $(date)
**Status**: Ready for deployment
**Priority**: CRITICAL - Resolve production database connectivity