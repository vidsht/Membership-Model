-- Fix Database Schema Issues
-- Remove duplicate messageId column and standardize template types

-- Step 1: Check if messageId column exists
DESCRIBE email_notifications;

-- Step 2: Remove duplicate messageId column (keep message_id)
ALTER TABLE email_notifications DROP COLUMN IF EXISTS messageId;

-- Step 3: Standardize template types in database to use underscore convention
UPDATE email_notifications 
SET type = CASE 
  WHEN type = 'password-reset' THEN 'password_reset'
  WHEN type = 'User Welcome Message' THEN 'user_welcome'
  ELSE type
END
WHERE type IN ('password-reset', 'User Welcome Message');

-- Step 4: Clean up any other inconsistent template types
UPDATE email_notifications 
SET type = REPLACE(REPLACE(type, '-', '_'), ' ', '_')
WHERE type LIKE '%-%' OR type LIKE '% %';

-- Step 5: Update email_templates table if it exists
UPDATE email_templates 
SET type = CASE 
  WHEN type = 'password-reset' THEN 'password_reset'
  WHEN type = 'User Welcome Message' THEN 'user_welcome'
  ELSE type
END
WHERE type IN ('password-reset', 'User Welcome Message');

UPDATE email_templates 
SET type = REPLACE(REPLACE(type, '-', '_'), ' ', '_')
WHERE type LIKE '%-%' OR type LIKE '% %';

-- Verify changes
SELECT DISTINCT type FROM email_notifications ORDER BY type;
SELECT DISTINCT type FROM email_templates ORDER BY type;