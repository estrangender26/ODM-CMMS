# ODM Template Editor Specification

## Overview
Mobile-first template editor for creating and managing inspection templates linked to equipment types.

## Screen Structure

### 1. Template List (`/mobile/templates`)

**Purpose:** Browse and manage inspection templates

**Layout:**
```
┌─────────────────────────────┐
│ ← Templates          [QR]   │
├─────────────────────────────┤
│ [All] [Pumps] [Motors] ...  │  ← Type filter chips
├─────────────────────────────┤
│ 3 templates                 │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Daily Pump Inspection   │ │ ← Template name
│ │ Centrifugal Pump    [A] │ │ ← Equipment type + status
│ │ 12 items    v2          │ │ ← Meta info
│ │ [Duplicate] [Archive]   │ │ ← Actions
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Weekly Motor Check      │ │
│ │ TEFC Motor          [A] │ │
│ │ 8 items     v1          │ │
│ │ [Duplicate] [Archive]   │ │
│ └─────────────────────────┘ │
│                             │
│         [+] FAB             │  ← Add new template
└─────────────────────────────┘
```

**Actions:**
- Tap template card → Edit template
- Tap "Duplicate" → Create copy
- Tap "Archive" → Deactivate
- Tap "Activate" → Reactivate
- Tap FAB → Create new template

### 2. Template Editor (`/mobile/templates/:id/edit`)

**Purpose:** Edit template details and inspection items

**Layout:**
```
┌─────────────────────────────┐
│ ← Edit Template      [QR]   │
├─────────────────────────────┤
│ Template Name *             │
│ [Daily Pump Inspection    ] │
│                             │
│ Equipment Type *            │
│ [Centrifugal Pump        ▼] │
│ v2                    [A]   │
├─────────────────────────────┤
│ Inspection Items        3   │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ ① [PASS/FAIL]    *   ✏️ 🗑│ │
│ │ Check coupling for wear │ │
│ │ Coupling • Coupling El  │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ② [NUMERIC]      *   ✏️ 🗑│ │
│ │ Check bearing temp      │ │
│ │ Bearing • Bearing DE    │ │
│ └─────────────────────────┘ │
│                             │
│ [+ Add Inspection Item]     │
├─────────────────────────────┤
│ [    Save Changes     ]     │  ← Fixed bottom
└─────────────────────────────┘
```

### 3. Inspection Item Modal

**Purpose:** Add/edit inspection item

**Layout:**
```
┌─────────────────────────────┐
│ Add Item              [X]   │
├─────────────────────────────┤
│ Inspection Prompt *         │
│ [                         │ │
│  Check coupling for wear  │ │
│                         ] │
│                             │
│ Inspection Type *           │
│ [Pass / Fail           ▼]   │
│                             │
│ Subunit (Optional)          │
│ [Coupling Assembly     ▼]   │
│                             │
│ Maintainable Item (Opt)     │
│ [Coupling Element      ▼]   │
│                             │
│ [●] Required                │
├─────────────────────────────┤
│ [Cancel]    [Save Item]     │
└─────────────────────────────┘
```

## UI Component Structure

### Components

1. **Template Card**
   - Header: Name + Status badge
   - Meta: Equipment type
   - Footer: Item count, Version
   - Actions: Duplicate, Archive/Activate

2. **Inspection Item Card**
   - Sequence number (circle)
   - Type badge (color-coded)
   - Required indicator (*)
   - Prompt text
   - Context (Subunit • Maintainable Item)
   - Actions: Edit, Delete

3. **Type Badges**
   - Pass/Fail: Green
   - Numeric: Blue
   - Multiple Choice: Orange
   - Text: Purple
   - Photo: Pink

4. **Form Elements**
   - Large tap targets (min 44px)
   - Clear labels
   - Required field indicators
   - Toggle switches for boolean

## Template Versioning Logic

### Rules:

1. **New Template**
   - Version = 1
   - Status = Active

2. **Edit Active Template**
   - Create new version (version + 1)
   - Old version remains for historical WOs
   - New WOs use latest version

3. **Edit Draft/Archived**
   - Can overwrite same version
   - No new version created

### Database Schema:

```sql
task_templates:
  - id
  - equipment_type_id (FK)
  - name
  - version
  - is_active
  - is_latest
  - created_at
  - updated_at

task_template_steps:
  - id
  - template_id (FK)
  - sequence
  - prompt
  - type (pass_fail|numeric|multiple_choice|text|photo)
  - subunit_id (optional FK)
  - maintainable_item_id (optional FK)
  - is_required
  - options (JSON for multiple_choice)
```

## Inspection Item Data Structure

```javascript
{
  id: "II-001",
  sequence: 1,
  prompt: "Check coupling for wear or damage",
  type: "pass_fail",  // pass_fail | numeric | multiple_choice | text | photo
  subunitId: "SU-001",
  subunitName: "Coupling Assembly",
  maintainableItemId: "MI-001",
  maintainableItemName: "Coupling Element",
  isRequired: true,
  options: null  // Array for multiple_choice: ["No leak", "Minor drip", "Active leak"]
}
```

## Mobile-First Design Rules

### Tap Targets:
- Minimum 44x44px for all interactive elements
- Adequate spacing between buttons

### Typography:
- Large, readable fonts (min 16px for inputs)
- Clear hierarchy (name > prompt > context)

### Layout:
- Single column
- Card-based organization
- Sticky action buttons at bottom
- Modal for item editing (avoids deep navigation)

### Interactions:
- Swipe optional for reorder (not required)
- Tap to edit
- Long-press or explicit delete button
- Immediate feedback

### Minimize Typing:
- Dropdowns for equipment types, subunits
- Toggle switches for boolean
- Optional fields clearly marked

## ISO 14224 Alignment

✅ **Aligned:**
- Templates linked to `equipment_type_id`
- Subunits (Level 4) optional
- Maintainable items (Level 5) optional
- Simple inspection types

❌ **NOT included (SAP complexity removed):**
- No task lists
- No operations
- No work centers
- No durations
- No control keys
- No planner groups

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/mobile/templates` | Template list UI |
| GET | `/mobile/templates/new` | New template UI |
| GET | `/mobile/templates/:id/edit` | Edit template UI |
| GET | `/api/templates` | List templates (JSON) |
| POST | `/api/templates` | Create template |
| PUT | `/api/templates/:id` | Update template |
| POST | `/api/templates/:id/duplicate` | Duplicate template |
| POST | `/api/templates/:id/archive` | Archive template |
| POST | `/api/templates/:id/activate` | Activate template |

## Confirmation

✅ **Mobile-first design:** Large tap targets, simple layout, minimal typing
✅ **ISO 14224 aligned:** Templates → equipment_type, optional subunits/maintainable_items
✅ **No SAP complexity:** No task lists, operations, durations, work centers
✅ **Versioning:** Editing active template creates new version, preserves history
