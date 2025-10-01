const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🔍 TRACING REAL ADMIN PASSWORD CHANGE FLOW');
console.log('==========================================');

async function traceAdminPasswordChangeFlow() {
    console.log('🧪 Step 1: Simulating frontend API call to admin route\n');
    
    // Import required modules
    const express = require('express');
    const bcrypt = require('bcryptjs');
    const db = require('./db');
    
    try {
        // Test database connection first
        console.log('📋 Testing database connection...');
        
        // Check if a test user exists
        const queryAsync = (sql, params) => {
            return new Promise((resolve, reject) => {
                db.query(sql, params, (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });
        };
        
        const testUser = await queryAsync('SELECT id, fullName, email FROM users LIMIT 1');
        
        if (testUser.length === 0) {
            console.log('❌ No users found in database');
            return;
        }
        
        console.log('✅ Database connection working');
        console.log('📊 Test user found:', {
            id: testUser[0].id,
            fullName: testUser[0].fullName,
            email: testUser[0].email
        });
        
        // Simulate the exact admin route logic
        console.log('\n🔄 Step 2: Simulating admin route logic...');
        
        const userId = testUser[0].id;
        const newPassword = 'SimulatedNewPass123!';
        const targetUser = testUser[0];
        
        console.log('👤 Target user:', targetUser.fullName);
        console.log('🔐 New password:', newPassword);
        
        // Hash the password (like the admin route does)
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        console.log('✅ Password hashed successfully');
        
        // Update the password in database (SIMULATION - not actually updating)
        console.log('💾 Would update password in database for user ID:', userId);
        
        // Test the notification call
        console.log('\n📧 Step 3: Testing notification call...');
        
        const NotificationHooks = require('./services/notificationHooks');
        
        console.log('📞 Calling NotificationHooks.onPasswordChangedByAdmin()...');
        console.log('Parameters:');
        console.log('  userId:', userId);
        console.log('  userData:', {
            fullName: targetUser.fullName,
            email: targetUser.email,
            tempPassword: newPassword
        });
        
        // Make the call with proper error handling
        try {
            const emailResult = await NotificationHooks.onPasswordChangedByAdmin(userId, {
                fullName: targetUser.fullName,
                email: targetUser.email,
                tempPassword: newPassword
            });
            
            console.log('✅ Notification call completed successfully');
            console.log('📊 Email result:', emailResult);
            
            // Check if email was actually sent
            if (emailResult && emailResult.success) {
                console.log('✅ Email notification was sent successfully!');
            } else {
                console.log('⚠️ Email notification completed but may not have been sent');
            }
            
        } catch (emailError) {
            console.log('❌ Notification call failed with error:');
            console.log('Error:', emailError.message);
            console.log('Stack:', emailError.stack);
        }
        
    } catch (error) {
        console.error('💥 Error in admin password change simulation:', error);
    }
}

async function testFrontendToBackendConnectivity() {
    console.log('\n🔍 Step 4: Testing Frontend to Backend Connectivity\n');
    
    try {
        // Check if the backend server is running
        const serverPort = process.env.PORT || 5001;
        console.log('🌐 Checking if backend server is accessible on port:', serverPort);
        
        // Try to make a basic health check
        try {
            const response = await fetch(`http://localhost:${serverPort}/api/health`);
            if (response.ok) {
                console.log('✅ Backend server is accessible');
            } else {
                console.log('⚠️ Backend server responded but not OK:', response.status);
            }
        } catch (fetchError) {
            console.log('❌ Backend server not accessible:', fetchError.message);
            console.log('   Make sure backend server is running on port', serverPort);
        }
        
        // Check the admin password change route specifically
        console.log('\n🔗 Checking admin password change route...');
        
        // Read the admin route file to verify the endpoint exists
        const fs = require('fs');
        const adminRouteContent = fs.readFileSync('./routes/admin.js', 'utf8');
        
        if (adminRouteContent.includes('PUT') && adminRouteContent.includes('/users/:id/password')) {
            console.log('✅ Admin password change route exists in admin.js');
        } else {
            console.log('❌ Admin password change route not found in admin.js');
        }
        
        // Check if the route includes notification call
        if (adminRouteContent.includes('NotificationHooks.onPasswordChangedByAdmin')) {
            console.log('✅ Route includes notification call');
        } else {
            console.log('❌ Route missing notification call');
        }
        
    } catch (error) {
        console.error('💥 Error checking connectivity:', error);
    }
}

async function runFullTrace() {
    await traceAdminPasswordChangeFlow();
    await testFrontendToBackendConnectivity();
    
    console.log('\n🎯 TRACE SUMMARY:');
    console.log('=================');
    console.log('If the notification call succeeded above but website emails don\'t send:');
    console.log('');
    console.log('POSSIBLE ISSUES:');
    console.log('1. 🌐 Frontend is not actually calling the admin API route');
    console.log('2. 🔐 Authentication middleware is blocking the calls');
    console.log('3. 🚫 CORS issues preventing frontend from reaching backend');
    console.log('4. 🏃 Admin route is completing but notification call is async and failing silently');
    console.log('5. 📱 Frontend is calling a different endpoint than expected');
    console.log('');
    console.log('NEXT STEPS:');
    console.log('1. Check browser network tab when changing password');
    console.log('2. Check backend server logs for incoming requests');
    console.log('3. Verify admin authentication is working');
    console.log('4. Test with backend server running and make real frontend call');
}

runFullTrace();