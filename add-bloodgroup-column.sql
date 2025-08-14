-- Add bloodGroup column to users table
-- Run this SQL command directly in your MySQL database

USE membership_model;

-- Check if column exists first
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'membership_model' 
AND TABLE_NAME = 'users' 
AND COLUMN_NAME = 'bloodGroup';

-- Add the column if it doesn't exist
ALTER TABLE users 
ADD COLUMN bloodGroup VARCHAR(5) DEFAULT NULL 
COMMENT 'Blood group of the user (A+, B+, O+, AB+, A-, B-, O-, AB-)';

-- Verify the column was added
DESCRIBE users;
