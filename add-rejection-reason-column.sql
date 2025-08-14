-- Add rejection_reason column to deals table for storing rejection reasons
ALTER TABLE deals ADD COLUMN rejection_reason TEXT NULL AFTER status;

-- Add index for rejection_reason for better performance
CREATE INDEX idx_deals_rejection_reason ON deals(rejection_reason(100));
