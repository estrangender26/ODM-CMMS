-- =====================================================
-- ODM-CMMS Database Schema
-- =====================================================

-- Create database
CREATE DATABASE IF NOT EXISTS odm_cmms 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE odm_cmms;

-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role ENUM('admin', 'operator', 'supervisor') DEFAULT 'operator',
  is_active BOOLEAN DEFAULT TRUE,
  last_login DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role (role),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- FACILITIES
-- =====================================================

CREATE TABLE facilities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  description TEXT,
  address TEXT,
  city VARCHAR(50),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  country VARCHAR(50) DEFAULT 'USA',
  status ENUM('active', 'inactive', 'under_maintenance') DEFAULT 'active',
  manager_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- EQUIPMENT
-- =====================================================

CREATE TABLE equipment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  facility_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50),
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  location VARCHAR(100),
  install_date DATE,
  warranty_expiry DATE,
  status ENUM('operational', 'maintenance', 'out_of_order', 'retired') DEFAULT 'operational',
  criticality ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  purchase_cost DECIMAL(12, 2),
  purchase_date DATE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_facility (facility_id),
  INDEX idx_status (status),
  INDEX idx_category (category),
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TASK MASTER (Task Templates)
-- =====================================================

CREATE TABLE task_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_code VARCHAR(20) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  task_type ENUM('inspection', 'maintenance', 'repair', 'calibration', 'cleaning', 'lubrication') NOT NULL,
  estimated_duration INT COMMENT 'Estimated duration in minutes',
  required_skills TEXT,
  safety_instructions TEXT,
  required_tools TEXT,
  required_parts TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_type (task_type),
  INDEX idx_active (is_active),
  INDEX idx_code (task_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SCHEDULES (Preventive Maintenance Schedules)
-- =====================================================

CREATE TABLE schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  schedule_code VARCHAR(20) NOT NULL UNIQUE,
  equipment_id INT NOT NULL,
  task_master_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  frequency_type ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'hours_based', 'custom') NOT NULL,
  frequency_value INT DEFAULT 1 COMMENT 'Number of frequency units',
  frequency_hours INT COMMENT 'Hours-based scheduling',
  day_of_week TINYINT COMMENT '0-6 for weekly (Sunday=0)',
  day_of_month TINYINT COMMENT '1-31 for monthly',
  month_of_year TINYINT COMMENT '1-12 for yearly',
  start_date DATE NOT NULL,
  end_date DATE,
  next_due_date DATE,
  estimated_hours INT,
  assigned_to INT,
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
  FOREIGN KEY (task_master_id) REFERENCES task_master(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_equipment (equipment_id),
  INDEX idx_task (task_master_id),
  INDEX idx_next_due (next_due_date),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- WORK ORDERS
-- =====================================================

CREATE TABLE work_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  wo_number VARCHAR(20) NOT NULL UNIQUE,
  schedule_id INT,
  equipment_id INT NOT NULL,
  task_master_id INT,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  wo_type ENUM('preventive', 'corrective', 'predictive', 'emergency', 'project') DEFAULT 'corrective',
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  status ENUM('open', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled', 'closed') DEFAULT 'open',
  assigned_to INT,
  requested_by INT,
  requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  scheduled_start DATETIME,
  scheduled_end DATETIME,
  actual_start DATETIME,
  actual_end DATETIME,
  estimated_hours INT,
  actual_hours INT,
  completion_notes TEXT,
  completion_percentage INT DEFAULT 0,
  is_recurring BOOLEAN DEFAULT FALSE,
  parent_wo_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE SET NULL,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
  FOREIGN KEY (task_master_id) REFERENCES task_master(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_wo_id) REFERENCES work_orders(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_assigned (assigned_to),
  INDEX idx_equipment (equipment_id),
  INDEX idx_schedule (schedule_id),
  INDEX idx_dates (scheduled_start, scheduled_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- WORK ORDER NOTES/COMMENTS
-- =====================================================

CREATE TABLE work_order_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  work_order_id INT NOT NULL,
  user_id INT NOT NULL,
  note TEXT NOT NULL,
  note_type ENUM('general', 'update', 'delay', 'parts_needed', 'safety', 'completion') DEFAULT 'general',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_wo (work_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- INSPECTION POINTS (Checkpoints for tasks)
-- =====================================================

CREATE TABLE inspection_points (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_master_id INT NOT NULL,
  point_code VARCHAR(20) NOT NULL,
  description VARCHAR(500) NOT NULL,
  input_type ENUM('numeric', 'text', 'boolean', 'select', 'multiselect', 'photo') NOT NULL DEFAULT 'numeric',
  min_value DECIMAL(10, 2),
  max_value DECIMAL(10, 2),
  unit_of_measure VARCHAR(20),
  expected_value VARCHAR(255),
  acceptable_values TEXT COMMENT 'JSON array for select/multiselect',
  is_critical BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  help_text TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (task_master_id) REFERENCES task_master(id) ON DELETE CASCADE,
  UNIQUE KEY unique_point_code (task_master_id, point_code),
  INDEX idx_task (task_master_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- INSPECTION READINGS (Actual readings from operators)
-- =====================================================

CREATE TABLE inspection_readings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  work_order_id INT NOT NULL,
  inspection_point_id INT NOT NULL,
  equipment_id INT NOT NULL,
  reading_value VARCHAR(255),
  reading_numeric DECIMAL(10, 2),
  reading_text TEXT,
  reading_boolean BOOLEAN,
  reading_photo_url VARCHAR(500),
  is_passing BOOLEAN,
  notes TEXT,
  taken_by INT NOT NULL,
  taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (inspection_point_id) REFERENCES inspection_points(id) ON DELETE CASCADE,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
  FOREIGN KEY (taken_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_wo (work_order_id),
  INDEX idx_point (inspection_point_id),
  INDEX idx_equipment (equipment_id),
  INDEX idx_taken (taken_by, taken_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- ATTACHMENTS
-- =====================================================

CREATE TABLE attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entity_type ENUM('work_order', 'equipment', 'task_master', 'inspection_reading') NOT NULL,
  entity_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT,
  mime_type VARCHAR(100),
  uploaded_by INT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- AUDIT LOG
-- =====================================================

CREATE TABLE audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, full_name, role, is_active) VALUES
('admin', 'admin@odm-cmms.com', '$2a$10$YourHashedPasswordHere', 'System Administrator', 'admin', TRUE);

-- Sample operator users (password: operator123)
INSERT INTO users (username, email, password_hash, full_name, role, is_active) VALUES
('operator1', 'operator1@odm-cmms.com', '$2a$10$YourHashedPasswordHere', 'John Operator', 'operator', TRUE),
('operator2', 'operator2@odm-cmms.com', '$2a$10$YourHashedPasswordHere', 'Jane Technician', 'operator', TRUE);

-- Sample facilities
INSERT INTO facilities (name, code, description, address, city, state) VALUES
('Main Plant', 'PLANT-01', 'Primary manufacturing facility', '123 Industrial Way', 'Manufacturing City', 'CA'),
('Warehouse A', 'WH-A-01', 'Storage and distribution center', '456 Warehouse Blvd', 'Logistics Town', 'TX');

-- Sample equipment
INSERT INTO equipment (facility_id, name, code, description, category, manufacturer, model, location, status, criticality) VALUES
(1, 'Assembly Line A', 'EQ-001', 'Main assembly production line', 'Production', 'Acme Corp', 'AL-5000', 'Building A, Floor 1', 'operational', 'critical'),
(1, 'Packaging Machine 1', 'EQ-002', 'Automated packaging system', 'Packaging', 'PackMaster', 'PM-200', 'Building A, Floor 2', 'operational', 'high'),
(1, 'HVAC System Main', 'EQ-003', 'Main heating and cooling system', 'HVAC', 'ClimateControl', 'CC-500', 'Roof', 'operational', 'medium'),
(2, 'Forklift 1', 'EQ-004', 'Electric forklift for warehouse', 'Material Handling', 'LiftKing', 'LK-3000', 'Warehouse Floor', 'operational', 'low');

-- Sample task master templates
INSERT INTO task_master (task_code, title, description, task_type, estimated_duration, required_tools, is_active) VALUES
('INS-DAILY', 'Daily Equipment Inspection', 'Visual inspection of equipment for leaks, unusual noises, and proper operation', 'inspection', 15, 'Flashlight, Inspection form', TRUE),
('MAINT-WEEKLY', 'Weekly Lubrication', 'Lubricate all moving parts per manufacturer specifications', 'lubrication', 30, 'Grease gun, Oil can, Rags', TRUE),
('CALIB-MONTHLY', 'Monthly Calibration', 'Calibrate sensors and measuring devices', 'calibration', 60, 'Calibration kit, Test weights', TRUE),
('CLEAN-WEEKLY', 'Weekly Deep Clean', 'Thorough cleaning of equipment surfaces and components', 'cleaning', 45, 'Cleaning supplies, Brushes', TRUE);

-- Sample inspection points for daily inspection
INSERT INTO inspection_points (task_master_id, point_code, description, input_type, min_value, max_value, unit_of_measure, expected_value, is_critical, sort_order, help_text) VALUES
(1, 'TEMP', 'Operating Temperature', 'numeric', 50, 90, '°F', '70-80', TRUE, 1, 'Check temperature gauge reading'),
(1, 'VIBRATION', 'Vibration Level', 'numeric', 0, 5, 'mm/s', '< 3', FALSE, 2, 'Use vibration meter'),
(1, 'NOISE', 'Unusual Noises', 'boolean', NULL, NULL, NULL, 'false', TRUE, 3, 'Listen for grinding, squealing, or knocking'),
(1, 'LEAKS', 'Visible Leaks', 'boolean', NULL, NULL, NULL, 'false', TRUE, 4, 'Check all seals and connections'),
(1, 'CONDITION', 'Overall Condition', 'select', NULL, NULL, NULL, 'good', FALSE, 5, 'Select from: excellent, good, fair, poor');

-- Sample schedules
INSERT INTO schedules (schedule_code, equipment_id, task_master_id, title, frequency_type, frequency_value, day_of_week, start_date, next_due_date, estimated_hours, priority, is_active) VALUES
('SCH-001', 1, 1, 'Daily Line A Inspection', 'daily', 1, NULL, '2024-01-01', '2024-01-02', 0.25, 'high', TRUE),
('SCH-002', 1, 2, 'Weekly Line A Lubrication', 'weekly', 1, 5, '2024-01-01', '2024-01-05', 0.5, 'medium', TRUE),
('SCH-003', 2, 1, 'Daily Packaging Inspection', 'daily', 1, NULL, '2024-01-01', '2024-01-02', 0.25, 'high', TRUE);

-- Sample work orders
INSERT INTO work_orders (wo_number, schedule_id, equipment_id, task_master_id, title, description, wo_type, priority, status, assigned_to, scheduled_start, estimated_hours, completion_percentage) VALUES
('WO-2024-0001', 1, 1, 1, 'Daily Line A Inspection - Jan 2', 'Perform daily inspection of Assembly Line A', 'preventive', 'high', 'assigned', 2, '2024-01-02 08:00:00', 0.25, 0),
('WO-2024-0002', NULL, 2, NULL, 'Packaging Machine Belt Replacement', 'Replace worn conveyor belt on Packaging Machine 1', 'corrective', 'urgent', 'open', NULL, NULL, 2, 0),
('WO-2024-0003', 3, 2, 1, 'Daily Packaging Inspection - Jan 2', 'Perform daily inspection of Packaging Machine', 'preventive', 'high', 'completed', 3, '2024-01-02 08:00:00', 0.25, 100);
