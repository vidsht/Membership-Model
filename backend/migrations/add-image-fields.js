// migrations/add-image-fields.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
};

async function runMigration() {
  let connection;
  
  try {
    console.log('🚀 Starting image fields migration...');
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Add profilePhoto column to users table
    try {
      await connection.execute(`
        ALTER TABLE users 
        ADD COLUMN profilePhoto VARCHAR(255) DEFAULT NULL,
        ADD COLUMN profilePhotoUploadedAt TIMESTAMP NULL DEFAULT NULL
      `);
      console.log('✅ Added profilePhoto fields to users table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ profilePhoto fields already exist in users table');
      } else {
        throw error;
      }
    }

    // Add logo column to businesses table
    try {
      await connection.execute(`
        ALTER TABLE businesses 
        ADD COLUMN logo VARCHAR(255) DEFAULT NULL,
        ADD COLUMN logoUploadedAt TIMESTAMP NULL DEFAULT NULL
      `);
      console.log('✅ Added logo fields to businesses table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ logo fields already exist in businesses table');
      } else {
        throw error;
      }
    }

    // Add bannerImage column to deals table
    try {
      await connection.execute(`
        ALTER TABLE deals 
        ADD COLUMN bannerImage VARCHAR(255) DEFAULT NULL,
        ADD COLUMN bannerImageUploadedAt TIMESTAMP NULL DEFAULT NULL
      `);
      console.log('✅ Added bannerImage fields to deals table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ bannerImage fields already exist in deals table');
      } else {
        throw error;
      }
    }

    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('📝 Summary of changes:');
    console.log('   - users table: profilePhoto, profilePhotoUploadedAt');
    console.log('   - businesses table: logo, logoUploadedAt');
    console.log('   - deals table: bannerImage, bannerImageUploadedAt');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
runMigration();
