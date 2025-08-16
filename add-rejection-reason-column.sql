-- Add rejection_reason column to deal_redemptions table
-- This allows merchants to provide specific reasons when rejecting redemption requests

ALTER TABLE deal_redemptions 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL AFTER status,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER rejection_reason;

-- Update existing records to have updated_at value
UPDATE deal_redemptions 
SET updated_at = redeemed_at 
WHERE updated_at IS NULL;
