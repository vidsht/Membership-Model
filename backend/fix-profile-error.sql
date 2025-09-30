-- SOLUTION: Add missing database columns
-- Run these SQL commands in your database:

USE your_database_name;

-- Check if columns exist first
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME IN ('employer_name', 'years_in_ghana');

-- Add employer_name column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS employer_name VARCHAR(255) NULL;

-- Add years_in_ghana column if it doesn't exist  
ALTER TABLE users ADD COLUMN IF NOT EXISTS years_in_ghana INT NULL;

-- Verify columns were added
DESCRIBE users;

-- Test that the columns work
SELECT id, fullName, employer_name, years_in_ghana FROM users LIMIT 1;