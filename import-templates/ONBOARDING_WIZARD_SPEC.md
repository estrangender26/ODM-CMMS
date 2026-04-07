# ODM Onboarding Wizard Specification

## Overview
Guided setup flow for new ODM organizations to quickly begin generating work orders automatically.

## Wizard Steps

### Step 1: Create Facility

**Purpose:** Establish top-level asset grouping

**Fields:**
| Field | Required | Type | Notes |
|-------|----------|------|-------|
| facility_name | Yes | Text | Display name |
| timezone | No | Select | Default UTC |

**Rules:**
- Single facility for onboarding
- Multiple facilities can be added later
- No complex hierarchy needed

**Validation:**
- facility_name: Required, min 2 characters

**UI:**
```
STEP 1 OF 5
Create Your First Facility
A facility groups your assets together.

[Facility Name    *]
[Timezone       ▼]

[    Continue    ]
```

---

### Step 2: Import Assets

**Purpose:** Upload equipment using existing CSV import

**Required CSV Fields:**
- facility_name
- asset_name
- equipment_type_code

**System Actions:**
1. Validates equipment_type_code exists in ISO 14224 taxonomy
2. Creates facility if not exists (uses Step 1 facility)
3. Imports assets
4. Links assets to equipment_type
5. Templates inherited automatically

**UI:**
```
STEP 2 OF 5
Import Your Assets
Upload a CSV file with your equipment.

[📄 Tap to upload CSV]

CSV Format:
Required: facility_name, asset_name, equipment_type_code
Optional: description, manufacturer, serial_number
[Download template]

[Back] [Continue (disabled until upload)]
```

**Validation:**
- CSV format check
- equipment_type_code exists in taxonomy
- Required fields present

---

### Step 3: Review Templates

**Purpose:** Activate inspection templates matched to equipment types

**Display:**
- Template name
- Equipment type
- Number of inspection items
- Toggle to activate/deactivate

**Rules:**
- Show only templates matching imported equipment types
- All templates active by default
- User can deactivate unwanted templates
- Cannot edit taxonomy or template content

**UI:**
```
STEP 3 OF 5
Review Templates
Activate the inspection templates you want to use.

[Daily Pump Inspection         ●]
 Centrifugal Pump • 12 items

[Weekly Motor Check            ●]
 TEFC Motor • 8 items

[Monthly Compressor Maint      ●]
 Reciprocating Compressor • 15 items

[Back] [Continue]
```

---

### Step 4: Activate Scheduler

**Purpose:** Enable automatic work order generation

**What the scheduler does:**
- Runs daily
- Creates work orders based on template frequency
- Assigns to default operator
- No manual intervention needed

**UI:**
```
STEP 4 OF 5
Activate Work Order Automation

⚙️
Daily Scheduler
Automatically creates work orders based on 
template frequency (daily, weekly, monthly)

[●] Enabled

How it works:
• Checks daily for templates due
• Creates work orders automatically
• Assigns to default operator
• No manual scheduling needed

[Back] [Continue]
```

---

### Step 5: Confirm Ready

**Purpose:** Show summary and complete setup

**Display:**
- Success icon
- Summary stats (facilities, assets, templates)
- Confirmation message

**UI:**
```
STEP 5 OF 5

✅
You're All Set!
Your ODM maintenance program is ready to go.

┌─────┬─────┬─────┐
│  1  │  3  │  3  │
│ Fac │ Ast │ Tmp │
└─────┴─────┴─────┘

🎯 Work orders will appear automatically
Based on your template schedules

[  Go to Dashboard  ]
```

---

## Navigation Logic

| From | Back | Continue |
|------|------|----------|
| Step 1 | Hidden | → Step 2 |
| Step 2 | → Step 1 | → Step 3 (after upload) |
| Step 3 | → Step 2 | → Step 4 |
| Step 4 | → Step 3 | → Step 5 |
| Step 5 | Hidden | → Dashboard |

## Validation Rules

### Step 1
- facility_name: Required, min 2 chars

### Step 2
- CSV file uploaded
- Valid format
- equipment_type_code exists in taxonomy
- At least 1 asset imported

### Step 3
- At least 1 template active

### Step 4
- Scheduler toggle (optional)

### Step 5
- None (summary only)

## Data Flow

```
Step 1: facility = { name, timezone }
        ↓
Step 2: assets = [ {name, type, ...}, ... ]
        ↓
Step 3: activeTemplates = [id1, id2, ...]
        ↓
Step 4: schedulerEnabled = true/false
        ↓
Step 5: POST /api/onboarding/complete
        { facility, assets, activeTemplates, schedulerEnabled }
        ↓
        Backend:
        - Create facility
        - Import assets
        - Activate templates
        - Enable scheduler
        ↓
        Redirect to /mobile/home
```

## Mobile-First Design

### Layout:
- Full-screen gradient background
- White card for content
- Progress dots at top
- Large tap targets
- Single column

### Typography:
- Large titles (22px)
- Clear labels (14px)
- Good contrast

### Interactions:
- Smooth transitions between steps
- Immediate validation feedback
- Disabled Continue until valid
- Toggle switches for booleans

## ISO 14224 Alignment

✅ **Aligned:**
- Templates linked to equipment_type
- Assets have equipment_type_code
- Subunits/maintainable items optional

✅ **Simple ODM setup:**
- No SAP functional locations
- No complex hierarchy
- No planning parameters
- No work centers

## Not Included

❌ SAP configuration
❌ Functional location mapping
❌ Complex planning parameters
❌ Work center assignment
❌ Control keys
❌ Operations
❌ Task lists

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/mobile/onboarding` | Wizard UI |
| POST | `/api/onboarding/complete` | Finish setup |

## URL

http://localhost:3000/mobile/onboarding
