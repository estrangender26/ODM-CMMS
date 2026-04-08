-- Migration: Add industry column to organizations table
-- Date: 2026-04-08

-- Add industry column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS industry VARCHAR(50) DEFAULT 'other' AFTER organization_name;

-- Add index for industry filtering
CREATE INDEX IF NOT EXISTS idx_industry ON organizations(industry);

-- Update existing organizations to have a default industry
UPDATE organizations 
SET industry = 'other' 
WHERE industry IS NULL;
