const mysql = require('mysql2/promise');

async function addBloodGroupColumn() {
    try {
        const connection = await mysql.createConnection({
            host: 'auth-db1388.hstgr.io',
            user: 'u214148440_SachinHursale',
            password: 'Membership@2025',
            database: 'u214148440_membership01'
        });
        
        // Add blood group column to users table
        try {
            await connection.execute('ALTER TABLE users ADD COLUMN bloodGroup VARCHAR(5) DEFAULT NULL');
            console.log('✅ Blood group column added to users table');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ Blood group column already exists in users table');
            } else {
                console.error('❌ Error adding column to users table:', error.message);
            }
        }

        // Add blood group column to merchants table
        try {
            await connection.execute('ALTER TABLE merchants ADD COLUMN bloodGroup VARCHAR(5) DEFAULT NULL');
            console.log('✅ Blood group column added to merchants table');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ Blood group column already exists in merchants table');
            } else {
                console.error('❌ Error adding column to merchants table:', error.message);
            }
        }

        await connection.end();
        console.log('🔌 Database connection closed');
        
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
    }
}

addBloodGroupColumn();
