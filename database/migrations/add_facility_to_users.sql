-- Add facility_id column to users table
ALTER TABLE users 
ADD COLUMN facility_id INT NULL AFTER role,
ADD CONSTRAINT fk_user_facility 
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE SET NULL,
ADD INDEX idx_user_facility (facility_id);
