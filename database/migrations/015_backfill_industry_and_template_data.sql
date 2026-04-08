-- Migration: Backfill Industry and Template Data
-- Description: Backfill existing data after Step 2 schema changes
-- Author: System
-- Date: 2026-04-08

-- ============================================================================
-- 1. Backfill task_templates: set is_system, is_editable, task_kind
-- ============================================================================

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

-- ============================================================================
-- 2. Backfill task_template_steps: set new safety fields to safe defaults
-- ============================================================================

-- Set is_visual_only to FALSE for all existing steps
UPDATE task_template_steps 
SET is_visual_only = FALSE 
WHERE is_visual_only IS NULL;

-- Set requires_equipment_stopped to FALSE for all existing steps
UPDATE task_template_steps 
SET requires_equipment_stopped = FALSE 
WHERE requires_equipment_stopped IS NULL;

-- Set prohibit_if_running to FALSE for all existing steps
UPDATE task_template_steps 
SET prohibit_if_running = FALSE 
WHERE prohibit_if_running IS NULL;

-- Set prohibit_opening_covers to FALSE for all existing steps
UPDATE task_template_steps 
SET prohibit_opening_covers = FALSE 
WHERE prohibit_opening_covers IS NULL;

-- ============================================================================
-- 3. Set default safety values in safety_controls (if applicable)
-- ============================================================================

-- Ensure all existing controls have is_active set
UPDATE safety_controls 
SET is_active = TRUE 
WHERE is_active IS NULL;

-- ============================================================================
-- 4. Verify backfill
-- ============================================================================

SELECT 
    'task_templates' as table_name,
    COUNT(*) as total,
    SUM(CASE WHEN is_system = TRUE THEN 1 ELSE 0 END) as system_count,
    SUM(CASE WHEN is_system = FALSE THEN 1 ELSE 0 END) as org_count
FROM task_templates
UNION ALL
SELECT 
    'industries' as table_name,
    COUNT(*) as total,
    NULL as system_count,
    NULL as org_count
FROM industries;
