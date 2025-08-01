-- SQL to add communities table and manage community options
-- This allows admin to dynamically add/remove community options

-- Create communities table for dynamic community management
CREATE TABLE IF NOT EXISTS communities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    displayOrder INT DEFAULT 999,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_active (isActive),
    INDEX idx_order (displayOrder)
);

-- Insert default community options
INSERT INTO communities (name, description, displayOrder, isActive) VALUES
('General', 'General Indian Community', 1, TRUE),
('Gujarati', 'Gujarati Community', 2, TRUE),
('Punjabi', 'Punjabi Community', 3, TRUE),
('Tamil', 'Tamil Community', 4, TRUE),
('Telugu', 'Telugu Community', 5, TRUE),
('Bengali', 'Bengali Community', 6, TRUE),
('Marathi', 'Marathi Community', 7, TRUE),
('Hindi', 'Hindi Community', 8, TRUE),
('Rajasthani', 'Rajasthani Community', 9, TRUE),
('South Indian', 'South Indian Community', 10, TRUE),
('North Indian', 'North Indian Community', 11, TRUE),
('Jain', 'Jain Community', 12, TRUE),
('Sindhi', 'Sindhi Community', 13, TRUE),
('Others', 'Other Communities', 99, TRUE);

-- Update the users table constraints if needed (they should already exist based on the current structure)
-- The following are likely already present, but adding for completeness:

-- ALTER TABLE users MODIFY COLUMN dob DATE NULL;
-- ALTER TABLE users MODIFY COLUMN community VARCHAR(100) NULL;
-- ALTER TABLE users MODIFY COLUMN country VARCHAR(100) DEFAULT 'Ghana';
-- ALTER TABLE users MODIFY COLUMN state VARCHAR(100) NULL;
-- ALTER TABLE users MODIFY COLUMN city VARCHAR(100) NULL;

-- Create user_types table for the "I'm a *" dropdown options
CREATE TABLE IF NOT EXISTS user_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    displayOrder INT DEFAULT 999,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_active (isActive),
    INDEX idx_order (displayOrder)
);

-- Insert default user type options
INSERT INTO user_types (name, description, displayOrder, isActive) VALUES
('Student', 'Students', 1, TRUE),
('Housewife', 'Housewife', 2, TRUE),
('Working Professional', 'Working Professional', 3, TRUE),
('Business Owner', 'Business Owner', 4, TRUE),
('Retired', 'Retired', 5, TRUE),
('Others', 'Others', 99, TRUE);

-- Add userCategory field to users table to store the "I'm a *" selection
ALTER TABLE users ADD COLUMN IF NOT EXISTS userCategory VARCHAR(100) NULL;

-- Add foreign key constraints (optional, for data integrity)
-- ALTER TABLE users ADD CONSTRAINT fk_user_community 
--   FOREIGN KEY (community) REFERENCES communities(name) ON UPDATE CASCADE;
-- ALTER TABLE users ADD CONSTRAINT fk_user_category 
--   FOREIGN KEY (userCategory) REFERENCES user_types(name) ON UPDATE CASCADE;
