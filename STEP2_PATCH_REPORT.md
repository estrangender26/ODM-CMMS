# Step 2 Patch Report

**Date:** 2026-04-08  
**Status:** Patched & Ready

---

## Required Fixes Applied

### 1. ✅ task_kind Canonical Set
**Status:** Already correct in codebase  
**Location:** `src/models/task-template.model.js` (lines 20-30)

```javascript
static TASK_KINDS = {
  INSPECTION: 'inspection',
  MEASUREMENT: 'measurement',
  CLEANING: 'cleaning',
  LUBRICATION: 'lubrication',
  ADJUSTMENT: 'adjustment',
  TIGHTENING: 'tightening',
  TESTING: 'testing',
  CALIBRATION: 'calibration',
  SAFETY_CHECK: 'safety_check'
};
```

**Verified:** `operation` and `safety` NOT in the set.

---

### 2. ✅ is_visual_only Default Changed
**Status:** Already correct in migration  
**Location:** `database/migrations/014_add_industry_layer.sql` (line 222)

```sql
ALTER TABLE task_template_steps ADD COLUMN is_visual_only BOOLEAN DEFAULT TRUE
```

**Verified:** Default is `TRUE`, not `FALSE`.

---

### 3. ✅ Organization Industry Invariants Enforced
**Files Modified:**

#### `src/controllers/industry.controller.js`
- **`assignToOrganization`**: Auto-sets first industry as default
- **`removeFromOrganization`**: Blocks removal of last industry, blocks removal of default
- **`setDefault`**: New endpoint for setting default industry

**Invariants Enforced:**
```javascript
// Invariant 1: At least one industry
if (industries.length <= 1) {
  return 403: 'Cannot remove the last industry'
}

// Invariant 2: Cannot remove default
if (targetIndustry.is_default) {
  return 403: 'Cannot remove the default industry. Set another as default first.'
}

// Invariant 3: First industry auto-defaults
const shouldBeDefault = isFirstIndustry || is_default;
```

#### `src/models/industry.model.js`
- Added `setDefaultForOrganization()`: Unsets all, then sets new default

#### `src/routes/industry.routes.js`
- Added `POST /my-organization/set-default` route

---

### 4. ✅ System Template Guards Enforced
**Files Modified:**

#### `src/controllers/task-template.controller.js`

**Update Guard (lines 425-436):**
```javascript
const isEditable = await TaskTemplate.isEditable(id);
if (!isEditable) {
  return res.status(403).json({
    message: 'System templates cannot be modified. Clone the template to make changes.',
    code: 'SYSTEM_TEMPLATE_IMMUTABLE'
  });
}
```

**Delete Guard (lines 500-508):**
```javascript
const isSystem = await TaskTemplate.isSystemTemplate(id);
if (isSystem) {
  return res.status(403).json({
    message: 'System templates cannot be deleted',
    code: 'SYSTEM_TEMPLATE_IMMUTABLE'
  });
}
```

**Verified:** Guards exist in controller layer (not just model helpers).

---

### 5. ✅ UI Behavior Documented
**File Created:** `docs/STEP2_UI_BEHAVIOR.md`

**Key Requirements:**
- System templates: Show "System" badge, Hide Edit/Delete, Show Clone
- Org templates: Show Edit/Delete, Hide Clone (or secondary)
- Clone dialog: Pre-fill name with "(Copy)", validate, navigate to clone
- Industry UI: Block unchecking last industry, enforce single default

---

### 6. ✅ Industry Backfill Policy Documented
**File Created:** `docs/STEP2_BACKFILL_POLICY.md`

**Key Policies:**
- **Fallback default**: `WATER_WASTEWATER_UTILITIES`
- **Heuristic mapping**: Keyword matching for equipment types
- **Confidence levels**: High (auto), Low (fallback), Multiple (all + first default)
- **Audit trail**: Log all assignments for admin review

---

### 7. ✅ Clone Restriction Enforced
**File Modified:** `src/controllers/task-template.controller.js` (lines 297-342)

```javascript
// RESTRICTION: Only system templates can be cloned (Step 2)
if (!source.is_system) {
  return res.status(403).json({
    message: 'Only system templates can be cloned',
    code: 'CLONE_RESTRICTION_SYSTEM_ONLY'
  });
}
```

**Verified:** Clone is restricted to `is_system = TRUE` templates only.

---

## Files Changed Summary

| File | Lines | Change Type |
|------|-------|-------------|
| `src/controllers/industry.controller.js` | +45/-10 | Added invariants, new setDefault |
| `src/models/industry.model.js` | +15 | Added setDefaultForOrganization |
| `src/routes/industry.routes.js` | +1 | Added set-default route |
| `src/controllers/task-template.controller.js` | +8/-5 | Added clone restriction |
| `docs/STEP2_UI_BEHAVIOR.md` | +130 | New documentation |
| `docs/STEP2_BACKFILL_POLICY.md` | +165 | New documentation |

---

## Verification Checklist

- [x] task_kind uses canonical set (9 values, no operation/safety)
- [x] is_visual_only defaults to TRUE
- [x] Org cannot remove last industry (403 error)
- [x] Org cannot remove default without setting another
- [x] First industry auto-sets as default
- [x] System template update blocked with 403
- [x] System template delete blocked with 403
- [x] Clone restricted to system templates only
- [x] UI behavior documented
- [x] Backfill policy documented with fallback

---

## Ready for Approval ✅

All required fixes have been applied. Step 2 is ready for deployment.
