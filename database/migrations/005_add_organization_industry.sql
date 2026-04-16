-- Migration: Add industry column to organizations table
-- Date: 2026-04-08

-- Add industry column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS industry VARCHAR(50) DEFAULT 'other' AFTER organization_name;

-- Add index for industry filtering
CREATE INDEX IF NOT EXISTS idx_industry ON organizations(industry);

-- Rename default organization to something meaningful
UPDATE organizations 
SET organization_name = 'Demo Manufacturing Organization' 
WHERE organization_name = 'Default Organization';

-- Update default organization to have a meaningful industry
UPDATE organizations 
SET industry = 'general' 
WHERE industry IS NULL AND organization_name = 'Demo Manufacturing Organization';

-- Update any remaining organizations to have a default industry
UPDATE organizations 
SET industry = 'other' 
WHERE industry IS NULL;
