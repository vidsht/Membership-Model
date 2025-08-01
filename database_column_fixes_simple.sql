-- Simplified SQL script to add missing columns
-- MariaDB compatible version with existence checks

-- Set database
USE u214148440_membership01;

-- Add missing columns to businesses table only if they don't exist
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE table_name = 'businesses' 
   AND table_schema = 'u214148440_membership01' 
   AND column_name = 'currentPlan') = 0,
  'ALTER TABLE businesses ADD COLUMN currentPlan VARCHAR(50) DEFAULT NULL',
  'SELECT "currentPlan column already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE table_name = 'businesses' 
   AND table_schema = 'u214148440_membership01' 
   AND column_name = 'planExpiryDate') = 0,
  'ALTER TABLE businesses ADD COLUMN planExpiryDate DATE DEFAULT NULL',
  'SELECT "planExpiryDate column already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE table_name = 'businesses' 
   AND table_schema = 'u214148440_membership01' 
   AND column_name = 'planStatus') = 0,
  'ALTER TABLE businesses ADD COLUMN planStatus VARCHAR(50) DEFAULT "active"',
  'SELECT "planStatus column already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE table_name = 'businesses' 
   AND table_schema = 'u214148440_membership01' 
   AND column_name = 'dealsUsedThisMonth') = 0,
  'ALTER TABLE businesses ADD COLUMN dealsUsedThisMonth INT DEFAULT 0',
  'SELECT "dealsUsedThisMonth column already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update businesses to have default plan if null
UPDATE businesses SET currentPlan = 'basic_business' WHERE currentPlan IS NULL OR currentPlan = '';

-- Show final status
SELECT 'Database updates completed successfully' as status;
