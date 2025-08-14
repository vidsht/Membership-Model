-- Fix deals table status enum to include all required values
ALTER TABLE deals MODIFY COLUMN status ENUM('active', 'inactive', 'expired', 'scheduled', 'pending_approval', 'rejected') DEFAULT 'pending_approval';
