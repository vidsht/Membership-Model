-- SQL commands to add the new user fields
-- Run these commands manually in your database if the migration script can't connect

-- Add employer_name column
ALTER TABLE users ADD COLUMN employer_name VARCHAR(255) NULL AFTER bloodGroup;

-- Add years_in_ghana column  
ALTER TABLE users ADD COLUMN years_in_ghana INT NULL AFTER employer_name;

-- Verify the columns were added
DESCRIBE users;