-- Add QR code support to equipment table
-- Run this migration to enable QR label generation

-- Add QR code columns to equipment table
ALTER TABLE equipment 
ADD COLUMN qr_code VARCHAR(100) NULL AFTER code,
ADD COLUMN qr_data VARCHAR(500) NULL AFTER qr_code,
ADD COLUMN qr_generated_at DATETIME NULL AFTER qr_data;

-- Add index for QR code lookup
CREATE INDEX idx_equipment_qr_code ON equipment(qr_code);

-- Add index for efficient filtering
CREATE INDEX idx_equipment_qr_status ON equipment(organization_id, qr_code);

-- Update equipment model to include QR fields
-- This migration enables the QR label generation feature
