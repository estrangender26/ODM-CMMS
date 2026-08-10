-- Indexes for Atiman Knowledge Versioning Foundation

CREATE INDEX IF NOT EXISTS idx_knowledge_pack_versions_pack_state
    ON knowledge_pack_versions (knowledge_pack_id, lifecycle_state);

CREATE INDEX IF NOT EXISTS idx_knowledge_pack_versions_effective
    ON knowledge_pack_versions (knowledge_pack_id, effective_from, effective_until);

CREATE INDEX IF NOT EXISTS idx_knowledge_pack_versions_superseded
    ON knowledge_pack_versions (superseded_by_version_id);

CREATE INDEX IF NOT EXISTS idx_task_template_versions_template
    ON task_template_versions (task_template_id, version_number);

CREATE INDEX IF NOT EXISTS idx_task_template_versions_equipment_type
    ON task_template_versions (equipment_type_id);

CREATE INDEX IF NOT EXISTS idx_task_template_versions_pack_version
    ON task_template_versions (knowledge_pack_version_id);

CREATE INDEX IF NOT EXISTS idx_task_template_versions_superseded
    ON task_template_versions (superseded_by_version_id);

CREATE INDEX IF NOT EXISTS idx_task_template_step_versions_template_version
    ON task_template_step_versions (task_template_version_id, step_no);

CREATE INDEX IF NOT EXISTS idx_task_template_step_versions_task_template_step
    ON task_template_step_versions (task_template_step_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_pack_version_items_pack
    ON knowledge_pack_version_items (knowledge_pack_version_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_pack_version_items_item
    ON knowledge_pack_version_items (item_type, item_version_id);
