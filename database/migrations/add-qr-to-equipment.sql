-- =====================================================
-- Migration: Add QR code support to equipment table
-- =====================================================

ALTER TABLE equipment
  ADD COLUMN qr_code VARCHAR(100) NULL AFTER status,
  ADD COLUMN qr_data VARCHAR(500) NULL AFTER qr_code,
  ADD COLUMN qr_generated_at DATETIME NULL AFTER qr_data,
  ADD COLUMN qr_token VARCHAR(32) NULL AFTER qr_generated_at,
  ADD COLUMN qr_token_generated_at DATETIME NULL AFTER qr_token;

CREATE INDEX idx_equipment_qr_code ON equipment(qr_code);
CREATE INDEX idx_equipment_qr_token ON equipment(qr_token);

-- Backfill: generate QR codes for existing assets using their asset code
UPDATE equipment
SET qr_code = code,
    qr_data = code,
    qr_generated_at = NOW()
WHERE qr_code IS NULL;
