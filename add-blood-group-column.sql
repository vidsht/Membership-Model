-- Add blood group column to users table
ALTER TABLE users ADD COLUMN bloodGroup VARCHAR(10) DEFAULT NULL AFTER dob;

-- Update the column comment
ALTER TABLE users MODIFY COLUMN bloodGroup VARCHAR(10) DEFAULT NULL COMMENT 'Blood group (A+, A-, B+, B-, AB+, AB-, O+, O-)';

-- Create index for blood group for potential filtering
CREATE INDEX idx_users_bloodGroup ON users(bloodGroup);
