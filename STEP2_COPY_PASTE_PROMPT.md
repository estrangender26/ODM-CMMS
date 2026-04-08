# Step 2: Industry Layer & Template Architecture - Copy/Paste Prompt

Execute the following files in order to implement Step 2.

---

## File 1: Database Migration 014
**Path:** `database/migrations/014_add_industry_layer.sql`

```sql
-- Migration: Add Industry Layer and Task Template Architecture
-- Description: Step 2 implementation - Industry taxonomy, template immutability, cloning support
-- Author: System
-- Date: 2026-04-08

-- ============================================================================
-- 1. CREATE INDUSTRIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS industries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_industries_code (code),
    INDEX idx_industries_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. CREATE EQUIPMENT TYPE INDUSTRIES JUNCTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS equipment_type_industries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    equipment_type_id INT NOT NULL,
    industry_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_equipment_industry (equipment_type_id, industry_id),
    FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id) ON DELETE CASCADE,
    FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE CASCADE,
    INDEX idx_equipment_type (equipment_type_id),
    INDEX idx_industry (industry_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. CREATE ORGANIZATION INDUSTRIES JUNCTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_industries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    organization_id INT NOT NULL,
    industry_id INT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_org_industry (organization_id, industry_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE CASCADE,
    INDEX idx_organization (organization_id),
    INDEX idx_industry (industry_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. ADD COLUMNS TO TASK_TEMPLATES
-- ============================================================================

ALTER TABLE task_templates
    ADD COLUMN IF NOT EXISTS industry_id INT NULL AFTER equipment_type_id,
    ADD COLUMN IF NOT EXISTS task_kind VARCHAR(50) NULL AFTER industry_id,
    ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE AFTER task_kind,
    ADD COLUMN IF NOT EXISTS is_editable BOOLEAN DEFAULT TRUE AFTER is_system,
    ADD COLUMN IF NOT EXISTS parent_template_id INT NULL AFTER is_editable,
    ADD FOREIGN KEY IF NOT EXISTS fk_task_templates_industry (industry_id) 
        REFERENCES industries(id) ON DELETE SET NULL,
    ADD FOREIGN KEY IF NOT EXISTS fk_task_templates_parent (parent_template_id) 
        REFERENCES task_templates(id) ON DELETE SET NULL,
    ADD INDEX idx_industry_id (industry_id),
    ADD INDEX idx_task_kind (task_kind),
    ADD INDEX idx_is_system (is_system),
    ADD INDEX idx_parent_template (parent_template_id);

-- ============================================================================
-- 5. ADD SAFETY METADATA COLUMNS TO TASK_TEMPLATE_STEPS
-- ============================================================================

ALTER TABLE task_template_steps
    ADD COLUMN IF NOT EXISTS safety_note TEXT NULL AFTER description,
    ADD COLUMN IF NOT EXISTS is_visual_only BOOLEAN DEFAULT FALSE AFTER safety_note,
    ADD COLUMN IF NOT EXISTS requires_equipment_stopped BOOLEAN DEFAULT FALSE AFTER is_visual_only,
    ADD COLUMN IF NOT EXISTS prohibit_if_running BOOLEAN DEFAULT FALSE AFTER requires_equipment_stopped,
    ADD COLUMN IF NOT EXISTS prohibit_opening_covers BOOLEAN DEFAULT FALSE AFTER prohibit_if_running;
```

---

## File 2: Database Migration 015 (Backfill)
**Path:** `database/migrations/015_backfill_industry_and_template_data.sql`

```sql
-- Migration: Backfill Industry and Template Data
-- Description: Backfill existing data after Step 2 schema changes

-- Mark templates with NULL organization_id as system templates (immutable)
UPDATE task_templates 
SET 
    is_system = TRUE,
    is_editable = FALSE,
    task_kind = COALESCE(task_kind, 'inspection')
WHERE organization_id IS NULL;

-- Mark templates with organization_id as organization templates (editable)
UPDATE task_templates 
SET 
    is_system = FALSE,
    is_editable = TRUE,
    task_kind = COALESCE(task_kind, 'inspection')
WHERE organization_id IS NOT NULL;

-- Set safety field defaults
UPDATE task_template_steps SET is_visual_only = FALSE WHERE is_visual_only IS NULL;
UPDATE task_template_steps SET requires_equipment_stopped = FALSE WHERE requires_equipment_stopped IS NULL;
UPDATE task_template_steps SET prohibit_if_running = FALSE WHERE prohibit_if_running IS NULL;
UPDATE task_template_steps SET prohibit_opening_covers = FALSE WHERE prohibit_opening_covers IS NULL;

-- Verify backfill
SELECT 
    'task_templates' as table_name,
    COUNT(*) as total,
    SUM(CASE WHEN is_system = TRUE THEN 1 ELSE 0 END) as system_count,
    SUM(CASE WHEN is_system = FALSE THEN 1 ELSE 0 END) as org_count
FROM task_templates;
```

---

## File 3: Seed Industries
**Path:** `database/seeds/001_seed_industries.sql`

```sql
-- Seed: Industries for ODM-CMMS Step 2

INSERT INTO industries (code, name, description, icon, is_active) VALUES
('WATER_WASTEWATER_UTILITIES', 'Water & Wastewater Utilities', 'Water treatment plants, wastewater facilities, pumping stations, and distribution systems', 'water', TRUE),
('BUILDINGS_FACILITIES', 'Buildings & Facilities', 'Commercial buildings, HVAC systems, elevators, fire safety, and facility infrastructure', 'building', TRUE),
('MANUFACTURING', 'Manufacturing', 'Production lines, assembly equipment, CNC machines, robotics, and manufacturing systems', 'factory', TRUE),
('POWER_UTILITIES', 'Power Utilities', 'Power generation, substations, transformers, switchgear, and electrical distribution', 'bolt', TRUE),
('OIL_GAS', 'Oil & Gas', 'Upstream, midstream, and downstream oil and gas operations including refineries', 'fire', TRUE)
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    description = VALUES(description),
    is_active = TRUE;

SELECT 'Industries seeded successfully' as result;
```

---

## File 4: Industry Model
**Path:** `src/models/industry.model.js`

```javascript
/**
 * Industry Model
 * Industry layer with equipment type and organization mappings
 */

const db = require('../config/database');

class Industry {
    static async findAll(options = {}) {
        const { active = true } = options;
        let sql = 'SELECT * FROM industries';
        if (active) sql += ' WHERE is_active = TRUE';
        sql += ' ORDER BY name';
        const [rows] = await db.query(sql);
        return rows;
    }

    static async findById(id) {
        const [rows] = await db.query('SELECT * FROM industries WHERE id = ?', [id]);
        return rows[0] || null;
    }

    static async findByCode(code) {
        const [rows] = await db.query('SELECT * FROM industries WHERE code = ? AND is_active = TRUE', [code]);
        return rows[0] || null;
    }

    static async create(data) {
        const { code, name, description, icon } = data;
        const [result] = await db.query(
            'INSERT INTO industries (code, name, description, icon) VALUES (?, ?, ?, ?)',
            [code, name, description, icon]
        );
        return this.findById(result.insertId);
    }

    static async update(id, data) {
        const { name, description, icon, is_active } = data;
        await db.query(
            'UPDATE industries SET name = ?, description = ?, icon = ?, is_active = ? WHERE id = ?',
            [name, description, icon, is_active, id]
        );
        return this.findById(id);
    }
}

class EquipmentTypeIndustry {
    static async mapEquipmentTypeToIndustry(equipmentTypeId, industryId) {
        await db.query(
            'INSERT IGNORE INTO equipment_type_industries (equipment_type_id, industry_id) VALUES (?, ?)',
            [equipmentTypeId, industryId]
        );
        return true;
    }

    static async getIndustriesForEquipmentType(equipmentTypeId) {
        const [rows] = await db.query(
            `SELECT i.* FROM industries i
             JOIN equipment_type_industries eti ON i.id = eti.industry_id
             WHERE eti.equipment_type_id = ? AND i.is_active = TRUE
             ORDER BY i.name`,
            [equipmentTypeId]
        );
        return rows;
    }

    static async getEquipmentTypesForIndustry(industryId) {
        const [rows] = await db.query(
            `SELECT et.* FROM equipment_types et
             JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
             WHERE eti.industry_id = ?
             ORDER BY et.name`,
            [industryId]
        );
        return rows;
    }
}

class OrganizationIndustry {
    static async assignIndustryToOrganization(organizationId, industryId, isDefault = false) {
        await db.query(
            'INSERT INTO organization_industries (organization_id, industry_id, is_default) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE is_default = VALUES(is_default)',
            [organizationId, industryId, isDefault]
        );
        return true;
    }

    static async getIndustriesForOrganization(organizationId) {
        const [rows] = await db.query(
            `SELECT i.*, oi.is_default, oi.created_at as assigned_at 
             FROM industries i
             JOIN organization_industries oi ON i.id = oi.industry_id
             WHERE oi.organization_id = ? AND i.is_active = TRUE
             ORDER BY oi.is_default DESC, i.name`,
            [organizationId]
        );
        return rows;
    }

    static async setDefaultIndustry(organizationId, industryId) {
        await db.query('UPDATE organization_industries SET is_default = FALSE WHERE organization_id = ?', [organizationId]);
        await db.query('UPDATE organization_industries SET is_default = TRUE WHERE organization_id = ? AND industry_id = ?', [organizationId, industryId]);
        return true;
    }

    static async removeIndustryFromOrganization(organizationId, industryId) {
        await db.query('DELETE FROM organization_industries WHERE organization_id = ? AND industry_id = ?', [organizationId, industryId]);
        return true;
    }
}

module.exports = { Industry, EquipmentTypeIndustry, OrganizationIndustry };
```

---

## File 5: Industry Controller
**Path:** `src/controllers/industry.controller.js`

```javascript
/**
 * Industry Controller
 * Industry management and organization assignment
 */

const { Industry, OrganizationIndustry } = require('../models/industry.model');

const industryController = {
    // GET /api/industries - List all active industries
    async getAll(req, res) {
        try {
            const industries = await Industry.findAll({ active: true });
            res.json(industries);
        } catch (error) {
            console.error('Error fetching industries:', error);
            res.status(500).json({ message: 'Failed to fetch industries' });
        }
    },

    // GET /api/industries/:id - Get single industry
    async getById(req, res) {
        try {
            const industry = await Industry.findById(req.params.id);
            if (!industry) return res.status(404).json({ message: 'Industry not found' });
            res.json(industry);
        } catch (error) {
            console.error('Error fetching industry:', error);
            res.status(500).json({ message: 'Failed to fetch industry' });
        }
    },

    // GET /api/organizations/:id/industries - Get organization's industries
    async getOrganizationIndustries(req, res) {
        try {
            const { id: organizationId } = req.params;
            const industries = await OrganizationIndustry.getIndustriesForOrganization(organizationId);
            res.json(industries);
        } catch (error) {
            console.error('Error fetching organization industries:', error);
            res.status(500).json({ message: 'Failed to fetch organization industries' });
        }
    },

    // POST /api/organizations/:id/industries - Assign industry to organization
    async assignIndustryToOrganization(req, res) {
        try {
            const { id: organizationId } = req.params;
            const { industry_id, is_default = false } = req.body;
            
            if (!industry_id) return res.status(400).json({ message: 'industry_id is required' });
            
            await OrganizationIndustry.assignIndustryToOrganization(organizationId, industry_id, is_default);
            const industries = await OrganizationIndustry.getIndustriesForOrganization(organizationId);
            res.json(industries);
        } catch (error) {
            console.error('Error assigning industry:', error);
            res.status(500).json({ message: 'Failed to assign industry' });
        }
    },

    // DELETE /api/organizations/:id/industries/:industryId - Remove industry
    async removeIndustryFromOrganization(req, res) {
        try {
            const { id: organizationId, industryId } = req.params;
            await OrganizationIndustry.removeIndustryFromOrganization(organizationId, industryId);
            const industries = await OrganizationIndustry.getIndustriesForOrganization(organizationId);
            res.json(industries);
        } catch (error) {
            console.error('Error removing industry:', error);
            res.status(500).json({ message: 'Failed to remove industry' });
        }
    },

    // PUT /api/organizations/:id/industries/default - Set default industry
    async setDefaultIndustry(req, res) {
        try {
            const { id: organizationId } = req.params;
            const { industry_id } = req.body;
            
            if (!industry_id) return res.status(400).json({ message: 'industry_id is required' });
            
            await OrganizationIndustry.setDefaultIndustry(organizationId, industry_id);
            const industries = await OrganizationIndustry.getIndustriesForOrganization(organizationId);
            res.json(industries);
        } catch (error) {
            console.error('Error setting default industry:', error);
            res.status(500).json({ message: 'Failed to set default industry' });
        }
    }
};

module.exports = industryController;
```

---

## File 6: Industry Routes
**Path:** `src/routes/industry.routes.js`

```javascript
/**
 * Industry Routes
 */

const express = require('express');
const router = express.Router();
const industryController = require('../controllers/industry.controller');
const { requireAuth, requireAdmin, requireAdminOrSelf } = require('../middleware/auth.middleware');

// Public/List routes
router.get('/', requireAuth, industryController.getAll);
router.get('/:id', requireAuth, industryController.getById);

// Organization industry management (admin only)
router.get('/organizations/:id/industries', requireAuth, requireAdminOrSelf, industryController.getOrganizationIndustries);
router.post('/organizations/:id/industries', requireAuth, requireAdmin, industryController.assignIndustryToOrganization);
router.delete('/organizations/:id/industries/:industryId', requireAuth, requireAdmin, industryController.removeIndustryFromOrganization);
router.put('/organizations/:id/industries/default', requireAuth, requireAdmin, industryController.setDefaultIndustry);

module.exports = router;
```

---

## File 7: Add to Routes Index
**Path:** `src/routes/index.js`

Add this line after the iso-equipment route (around line 29):

```javascript
// Industry Layer (Step 2)
router.use('/industries', require('./industry.routes'));
```

---

## File 8: Add Clone Endpoint to Task Template Routes
**Path:** `src/routes/task-template.routes.js`

Add this route after the `GET /:id` route:

```javascript
/**
 * @route   POST /api/task-templates/:id/clone
 * @desc    Clone a system template to organization
 * @access  Private (Admin/Supervisor)
 */
router.post('/:id/clone', requireAdmin, taskTemplateController.clone);
```

---

## File 9: Add Clone Method to Task Template Controller
**Path:** `src/controllers/task-template.controller.js`

Add this method to the controller:

```javascript
    /**
     * POST /api/task-templates/:id/clone
     * Clone a system template to an organization
     */
    async clone(req, res) {
        try {
            const templateId = parseInt(req.params.id);
            const organizationId = req.user.organization_id;
            const userId = req.user.id;
            
            if (!organizationId) {
                return res.status(400).json({ message: 'User must belong to an organization to clone templates' });
            }
            
            // Get the source template
            const sourceTemplate = await TaskTemplate.findById(templateId);
            if (!sourceTemplate) {
                return res.status(404).json({ message: 'Template not found' });
            }
            
            // Only allow cloning system templates (org_id is null) or templates from same org
            if (sourceTemplate.organization_id && sourceTemplate.organization_id !== organizationId) {
                return res.status(403).json({ message: 'Cannot clone templates from other organizations' });
            }
            
            // Clone the template
            const clonedTemplate = await TaskTemplate.cloneTemplate(templateId, organizationId, userId, {
                name: `${sourceTemplate.name} (Copy)`,
                ...req.body
            });
            
            res.status(201).json(clonedTemplate);
        } catch (error) {
            console.error('Error cloning template:', error);
            res.status(500).json({ message: 'Failed to clone template', error: error.message });
        }
    }
```

---

## File 10: Add Clone Method to Task Template Model
**Path:** `src/models/task-template.model.js`

Add these methods to the TaskTemplate class:

```javascript
    /**
     * Check if a template is a system template (immutable)
     */
    static isSystemTemplate(template) {
        return !template.organization_id && template.is_system === true;
    }

    /**
     * Check if a template is editable
     */
    static isEditable(template) {
        return template.is_editable !== false;
    }

    /**
     * Clone a system template to an organization
     * @param {number} templateId - Source template ID
     * @param {number} organizationId - Target organization ID
     * @param {number} userId - User creating the clone
     * @param {object} customizations - Optional customizations (name, etc.)
     * @returns {object} Cloned template
     */
    static async cloneTemplate(templateId, organizationId, userId, customizations = {}) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Get source template with steps
            const [templates] = await connection.query(
                'SELECT * FROM task_templates WHERE id = ?',
                [templateId]
            );
            
            if (templates.length === 0) {
                throw new Error('Template not found');
            }
            
            const sourceTemplate = templates[0];
            
            // Validate it's a system template or from same org
            if (sourceTemplate.organization_id && sourceTemplate.organization_id !== organizationId) {
                throw new Error('Cannot clone templates from other organizations');
            }
            
            // Get steps
            const [steps] = await connection.query(
                'SELECT * FROM task_template_steps WHERE template_id = ? ORDER BY step_order',
                [templateId]
            );
            
            // Get safety controls
            const [safetyControls] = await connection.query(
                'SELECT * FROM safety_controls WHERE template_id = ?',
                [templateId]
            );
            
            // Create cloned template
            const insertSql = `
                INSERT INTO task_templates 
                (organization_id, name, description, equipment_type_id, industry_id, 
                 estimated_duration, task_kind, is_system, is_editable, parent_template_id,
                 created_by, updated_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `;
            
            const values = [
                organizationId,
                customizations.name || `${sourceTemplate.name} (Copy)`,
                customizations.description || sourceTemplate.description,
                customizations.equipment_type_id || sourceTemplate.equipment_type_id,
                customizations.industry_id || sourceTemplate.industry_id,
                customizations.estimated_duration || sourceTemplate.estimated_duration,
                customizations.task_kind || sourceTemplate.task_kind || 'inspection',
                false, // is_system
                true,  // is_editable
                templateId, // parent_template_id
                userId,
                userId
            ];
            
            const [result] = await connection.query(insertSql, values);
            const clonedTemplateId = result.insertId;
            
            // Clone steps with safety metadata
            for (const step of steps) {
                await connection.query(
                    `INSERT INTO task_template_steps 
                     (template_id, step_order, name, description, type, expected_value, 
                      unit, is_required, safety_note, is_visual_only, requires_equipment_stopped,
                      prohibit_if_running, prohibit_opening_covers, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                    [
                        clonedTemplateId,
                        step.step_order,
                        step.name,
                        step.description,
                        step.type,
                        step.expected_value,
                        step.unit,
                        step.is_required,
                        step.safety_note,
                        step.is_visual_only || false,
                        step.requires_equipment_stopped || false,
                        step.prohibit_if_running || false,
                        step.prohibit_opening_covers || false
                    ]
                );
            }
            
            // Clone safety controls
            for (const control of safetyControls) {
                await connection.query(
                    `INSERT INTO safety_controls 
                     (template_id, name, description, type, is_active, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
                    [clonedTemplateId, control.name, control.description, control.type, control.is_active]
                );
            }
            
            await connection.commit();
            
            // Return cloned template with details
            return this.findByIdWithDetails(clonedTemplateId);
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
```

---

## File 11: Export Industry Model
**Path:** `src/models/index.js`

Add this to the exports:

```javascript
Industry: require('./industry.model'),
```

---

## Execution Steps

1. **Run Migration 014:** Execute the SQL in File 1
2. **Run Migration 015:** Execute the SQL in File 2
3. **Seed Industries:** Execute the SQL in File 3
4. **Create Model:** Save File 4 to `src/models/industry.model.js`
5. **Create Controller:** Save File 5 to `src/controllers/industry.controller.js`
6. **Create Routes:** Save File 6 to `src/routes/industry.routes.js`
7. **Update Routes Index:** Add File 7 to `src/routes/index.js`
8. **Update Task Routes:** Add File 8 to `src/routes/task-template.routes.js`
9. **Update Controller:** Add File 9 to `src/controllers/task-template.controller.js`
10. **Update Model:** Add File 10 to `src/models/task-template.model.js`
11. **Update Model Index:** Add File 11 to `src/models/index.js`
12. **Restart server** and test endpoints

## Verification

```bash
# Test industries endpoint
curl http://localhost:3000/api/industries

# Test clone endpoint (requires auth)
curl -X POST http://localhost:3000/api/task-templates/1/clone \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Industries Reference

| Code | Name |
|------|------|
| WATER_WASTEWATER_UTILITIES | Water & Wastewater Utilities |
| BUILDINGS_FACILITIES | Buildings & Facilities |
| MANUFACTURING | Manufacturing |
| POWER_UTILITIES | Power Utilities |
| OIL_GAS | Oil & Gas |
