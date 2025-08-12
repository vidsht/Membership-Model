const mysql = require('mysql2/promise');

async function checkAdminUsers() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'indians_in_ghana'
        });

        const [users] = await connection.execute('SELECT id, email, userType FROM users WHERE userType = "admin" LIMIT 5');
        console.log('Admin users:');
        users.forEach(user => {
            console.log(`ID: ${user.id}, Email: ${user.email}, Type: ${user.userType}`);
        });

        // Also check for deals to test
        const [deals] = await connection.execute('SELECT id, title, status FROM deals LIMIT 5');
        console.log('\nAvailable deals:');
        deals.forEach(deal => {
            console.log(`ID: ${deal.id}, Title: ${deal.title}, Status: ${deal.status}`);
        });

        await connection.end();
    } catch (error) {
        console.error('Database error:', error);
    }
}

checkAdminUsers();
