-- Migration: Add image fields to users, businesses, and deals tables
-- Run this SQL script to add image support to existing tables

-- Add profile photo field to users table
ALTER TABLE users ADD COLUMN profilePhoto VARCHAR(255) NULL AFTER profilePicture;
ALTER TABLE users ADD COLUMN profilePhotoUploadedAt TIMESTAMP NULL AFTER profilePhoto;

-- Add logo field to businesses table  
ALTER TABLE businesses ADD COLUMN logo VARCHAR(255) NULL AFTER businessLicense;
ALTER TABLE businesses ADD COLUMN logoUploadedAt TIMESTAMP NULL AFTER logo;

-- Add banner image field to deals table
ALTER TABLE deals ADD COLUMN bannerImage VARCHAR(255) NULL AFTER imageUrl;
ALTER TABLE deals ADD COLUMN bannerUploadedAt TIMESTAMP NULL AFTER bannerImage;

-- Create indexes for better performance
CREATE INDEX idx_users_profile_photo ON users(profilePhoto);
CREATE INDEX idx_businesses_logo ON businesses(logo);
CREATE INDEX idx_deals_banner ON deals(bannerImage);

-- Migrate existing imageUrl data from deals to bannerImage (if needed)
UPDATE deals SET bannerImage = imageUrl WHERE imageUrl IS NOT NULL AND bannerImage IS NULL;
