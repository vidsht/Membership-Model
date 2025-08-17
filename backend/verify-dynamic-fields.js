const mysql = require('mysql2/promise');

async function verifyDynamicFields() {
    let connection;
    
    try {
        // Database connection
        connection = await mysql.createConnection({
            host: 'auth-db1388.hstgr.io',
            user: 'u214148440_SachinHursale',
            password: 'Membership@2025',
            database: 'u214148440_membership01'
        });
        
        console.log('✅ Connected to MySQL Database');
        
        // First, check the structure of the settings table
        const [settingsStructure] = await connection.execute("DESCRIBE settings");
        console.log('\n📋 Settings table structure:');
        settingsStructure.forEach(column => {
            console.log(`  ${column.Field}: ${column.Type}`);
        });
        
        // Check all data in settings table
        const [allSettings] = await connection.execute("SELECT * FROM settings");
        console.log('\n📊 All Settings in Database:');
        allSettings.forEach(row => {
            console.log(`  ${JSON.stringify(row)}`);
        });
        
        // Check if business_categories table exists
        const [businessCatTables] = await connection.execute(
            "SHOW TABLES LIKE 'business_categories'"
        );
        
        // Check if deal_categories table exists  
        const [dealCatTables] = await connection.execute(
            "SHOW TABLES LIKE 'deal_categories'"
        );
        
        console.log('\n📋 Table Status:');
        console.log(`  business_categories table: ${businessCatTables.length > 0 ? 'EXISTS' : 'MISSING'}`);
        console.log(`  deal_categories table: ${dealCatTables.length > 0 ? 'EXISTS' : 'MISSING'}`);
        
        // Test fetching dynamic data as the API would
        console.log('\n🔍 Testing API-style data fetching:');
        
        for (const row of settingsRows) {
            const fieldType = row.setting_key.split('.')[1];
            const data = JSON.parse(row.setting_value);
            const activeData = data.filter(item => item.active !== false);
            console.log(`  ${fieldType}: ${activeData.length} active options available`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

verifyDynamicFields();
