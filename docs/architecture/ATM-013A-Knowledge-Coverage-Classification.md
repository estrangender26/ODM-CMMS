# ATM-013A — Atiman Knowledge Coverage Classification

Repository: `estrangender26/ODM-CMMS`
Base: `main @ 31c9610`
Date: 2026-08-10
Status: Investigation only — no data or file changes.

> **Documentation status notice**
> - **Status:** Historical investigation evidence.
> - **Authority:** Not approved architecture. The abstract/leaf classification requires future validation.
> - **Historical base:** `main @ 31c9610`.
> - **Reviewed against:** `main @ 34cae1fad779ff45220fd1783025e6cfc442b44f`.
> - **Clarification:** The legacy three-template pattern is a migration artifact, not an architectural requirement that every equipment type must have exactly three templates.

## Summary

The current Atiman Knowledge Foundation contains 282 equipment types, each with exactly three shared task templates (Inspection, Safety_check, Testing). However, **98 of 311 equipment classes (31.5%) have zero equipment types**, and several top-level categories are entirely type-empty. This report classifies those gaps using repository evidence and the legacy MySQL source.

## 1. Equipment Classes

### Classes With Types

- **Count:** 213 of 311 classes (68.5%)
- These classes map to at least one equipment type and have shared task templates available.
- Top-covered domains: Electrical Equipment (24 types), Pump (22), Instrumentation (18), Treatment (12), Valve (10), Conveyor (10), Heater (9), Mixer (8), Compressor (7), Motor (7).

### Classes With Zero Types

- **Count:** 98 of 311 classes (31.5%)
- Spread across 23 categories.

### Classification of Zero-Type Classes

Evidence from the schema and naming patterns shows two clear groups:

#### A. Abstract / Container Classes (should not get synthetic types)

These classes are generic engineering groupings that already have more specific classes elsewhere in the taxonomy. Creating types for them would duplicate coverage.

| Category | Class | Evidence |
|----------|-------|----------|
| Rotating Equipment | Pump | Already a top-level category with 22 types |
| Rotating Equipment | Motor | Already a top-level category with 7 types |
| Rotating Equipment | Compressor | Already a top-level category with 7 types |
| Rotating Equipment | Fan and Blower | Already a top-level category “Blower” with 6 types |
| Rotating Equipment | Mixing Equipment | Already a top-level category “Mixer” with 8 types |
| Rotating Equipment | Turbine | Already a top-level category with 9 types |
| Rotating Equipment | Transmission Equipment | Already covered under Gearbox / classes |
| Static Equipment | Vessel | Already a top-level category “Storage Tank” with 5 types |
| Static Equipment | Tank | Duplicate category exists |
| Static Equipment | Separator | Already a top-level category with 9 types |
| Static Equipment | Heat Exchanger | Empty category 222 also named “Heat Exchanger” |
| Static Equipment | Filtration Equipment | Already covered under Filter categories |
| Instrumentation and Control | Analyzer | Also exists under Instrumentation with 18 types |
| Instrumentation and Control | Flow Instrument | Generic; Instrumentation has specific types |
| Instrumentation and Control | Level Instrument | Generic; Instrumentation has specific types |
| Instrumentation and Control | Pressure Instrument | Generic; Instrumentation has specific types |
| Instrumentation and Control | Temperature Instrument | Generic; Instrumentation has specific types |
| Piping Systems | Pipeline | Also a top-level category “Pipeline” with 5 types |
| Piping Systems | Piping Assembly | Generic; covered by Pipeline types |
| Piping Systems | Pipe Fitting | Generic; no legacy evidence |
| Piping Systems | Strainer | Generic; no legacy evidence |
| Utility Equipment | Boiler | Also a top-level category “Boiler” with 2 types |
| Utility Equipment | Air Dryer | Generic; no legacy evidence |
| Utility Equipment | Water Treatment Unit | Generic; overlaps Treatment category (12 types) |
| Valves | Control Valve | Also exists under category “Valve” (singular) with 9 types |
| Valves | Isolation Valve | Also exists under category “Valve” (singular) |
| Valves | Relief Valve | Also exists under category “Valve” (singular) |
| Valves | Actuated Valve | Also exists under category “Valve” (singular) |
| Valve | Surge Anticipator | Redundant with Valve types |

**Recommendation:** mark these as abstract/container classes and remove or hide their empty categories in the Knowledge Browser.

#### B. Leaf Classes That Genuinely Need Equipment Types

These classes are concrete engineering leaf classes with no current type. They represent the highest-value population candidates because they have no equivalent coverage elsewhere.

| Category | Class | Migration Source Evidence |
|----------|-------|---------------------------|
| Blower | Regenerative Blower | Legacy class exists; distinct from Centrifugal / Rotary Lobe |
| Blower | Screw Blower | Legacy class exists; distinct blower technology |
| Compressor | Centrifugal Compressor | Legacy class exists; major compressor family |
| Compressor | Scroll Compressor | Legacy class exists; common HVAC compressor |
| Conveyor | Belt Conveyor | Legacy class exists; widely used material handling |
| Conveyor | Pneumatic Conveyor | Legacy class exists; distinct from belt/apron/bucket |
| Filter | Activated Carbon Filter | Legacy class exists; distinct filtration technology |
| Filter | Bag Filter | Legacy class exists; common dust/control equipment |
| Filter | Cartridge Filter | Legacy class exists; common dust/control equipment |
| Filter | Disc Filter | Legacy class exists; water/wastewater equipment |
| Filter | Drum Filter | Legacy class exists; water/wastewater equipment |
| Gearbox | Bevel Gearbox | Legacy class exists; distinct gearing |
| Gearbox | Helical Gearbox | Legacy class exists; distinct gearing |
| Gearbox | Planetary Gearbox | Legacy class exists; distinct gearing |
| Gearbox | Worm Gearbox | Legacy class exists; distinct gearing |
| Generator | Diesel Generator | Legacy class exists; distinct prime mover |
| Generator | Gas Generator | Legacy class exists; distinct prime mover |
| Generator | Hydro Generator | Legacy class exists; distinct prime mover |
| Generator | Wind Generator | Legacy class exists; distinct prime mover |
| HVAC Equipment | Cooling Tower | Legacy class exists; major HVAC asset |
| HVAC Equipment | Fan Coil Unit | Legacy class exists; major HVAC asset |
| Instrumentation | Analyzer | Legacy class exists; overlaps but distinct from I&C analyzer |
| Instrumentation | Differential Pressure | Legacy class exists; specific transmitter family |
| Instrumentation | Vibration Sensor | Legacy class exists; specific sensor family |
| Mixer | Submersible Mixer | Legacy class exists; distinct from agitated vessel |
| Mixer | Surface Aerator | Legacy class exists; distinct from agitated vessel |
| Motor | AC Synchronous Motor | Legacy class exists; distinct from AC induction |
| Motor | DC Motor | Legacy class exists; distinct motor family |
| Motor | Explosion Proof Motor | Legacy class exists; special environment motor |
| Motor | Servo Motor | Legacy class exists; motion-control motor |
| Motor | Submersible Motor | Legacy class exists; distinct from pump motor |
| Pipeline | Ductile Iron | Legacy class exists; specific material |
| Pipeline | HDPE Pipeline | Legacy class exists; specific material |
| Pipeline | PVC Pipeline | Legacy class exists; specific material |
| Pipeline | Stainless Pipeline | Legacy class exists; specific material |
| Pipeline | Steel Pipeline | Legacy class exists; specific material |
| PLC | HMI | Legacy class exists; distinct PLC component |
| PLC | RTU | Legacy class exists; distinct PLC component |
| Pump | Diaphragm Pump | Legacy class exists; distinct positive-displacement pump |
| Pump | Grinder Pump | Legacy class exists; distinct wastewater pump |
| Pump | Peristaltic Pump | Legacy class exists; distinct positive-displacement pump |
| Pump | Screw Pump | Legacy class exists; distinct positive-displacement pump |
| Screen | Band Screen | Legacy class exists; wastewater screening |
| Screen | Drum Screen | Legacy class exists; wastewater screening |
| SCADA | Historian | Legacy class exists; distinct SCADA component |
| SCADA | SCADA Server | Legacy class exists; distinct SCADA component |
| SCADA | SCADA Workstation | Legacy class exists; distinct SCADA component |
| Safety Systems | Emergency Wash Equipment | Legacy class exists; safety asset |
| Safety Systems | Fire Protection Equipment | Legacy class exists; safety asset |
| Safety Systems | Gas Detection Equipment | Legacy class exists; safety asset |
| Structures | Access Structure | Legacy class exists; civil/structural asset |
| Structures | Support Structure | Legacy class exists; civil/structural asset |
| Switchgear | Low Voltage Switchgear | Legacy class exists; voltage-specific |
| Switchgear | Medium Voltage Switchgear | Legacy class exists; voltage-specific |
| Switchgear | Motor Control Center | Legacy class exists; distinct switchgear assembly |
| Switchgear | VFD Panel | Legacy class exists; distinct switchgear assembly |
| Transformer | Distribution Transformer | Legacy class exists; application-specific |
| Transformer | Dry Type Transformer | Legacy class exists; cooling-specific |
| Transformer | Oil Filled Transformer | Legacy class exists; cooling-specific |
| Transformer | Power Transformer | Legacy class exists; application-specific |
| UPS | Line Interactive UPS | Legacy class exists; topology-specific |
| UPS | Online UPS | Legacy class exists; topology-specific |
| UPS | Standby UPS | Legacy class exists; topology-specific |

**Count of high-value leaf classes needing types:** approximately 58.

## 2. Equipment Types

### Template and Step Coverage

- **Total types:** 282
- **Types with ≥1 template:** 282 (100%)
- **Types with zero templates:** 0
- **Templates per type:** exactly 3 (Inspection, Safety_check, Testing)
- **Average steps per type:** ~11 (range observed 10–12)

### Template Naming Pattern

Every type has templated names of the form `{Type Name} - {Kind}`:

- `AC Motor - Inspection`
- `AC Motor - Safety_check`
- `AC Motor - Testing`

There are **no template-name collisions across types** because each name is type-specific. Within a type, the three kinds are deliberately distinct.

### Step-Level Pattern

- All 846 templates have steps.
- All steps are `instruction`-type only.
- No measurement, numeric, checklist, or pass/fail step types are used.
- `activity_code_id` on steps is not populated from the legacy extract.

## 3. Largest Real Gaps

### Rotating Equipment Category

- **Classes:** 6 (Pump, Motor, Compressor, Fan and Blower, Mixing Equipment, Turbine, Transmission Equipment)
- **Types:** 0
- **Templates:** 0
- **Steps:** 0

This is entirely an abstract container. The real coverage lives in:

- Category **Pump** (22 types)
- Category **Motor** (7 types)
- Category **Compressor** (7 types)
- Category **Blower** (6 types — includes Fan/Blower leaf coverage)
- Category **Mixer** (8 types)
- Category **Turbine** (9 types)
- Category **Gearbox** (1 type) — but Gearbox itself has 4 leaf classes with no types.

**Conclusion:** Rotating Equipment should be treated as an **abstract engineering grouping**, not a migration target.

### Fan and Blower Class

- Located under `Rotating Equipment` category.
- Has zero types in that container.
- Category `Blower` already contains 6 concrete types (Multistage Centrifugal, Single Stage Centrifugal, Mine Ventilation Fan, Process Blower, Tri-Lobe Blower, Twin Lobe Blower).
- Missing leaf classes under Blower: `Regenerative Blower`, `Screw Blower`.

**Conclusion:** migrate “Fan and Blower” coverage to the `Blower` category; add Regenerative and Screw Blower types if engineering content can be authored.

### Static Equipment Category

- Classes: Vessel, Tank, Separator, Heat Exchanger, Filtration Equipment.
- All zero types.
- Real coverage lives in:
  - Storage Tank (5 types)
  - Separator (9 types)
  - Heat Exchanger (empty duplicate category)
  - Filter (6 types) and sub-categories

**Conclusion:** Static Equipment is an abstract container. The duplicate “Heat Exchanger” empty category should be removed or merged.

### Instrumentation and Control vs. Instrumentation

- Both categories have an `Analyzer` class.
- Instrumentation has 18 concrete types; Instrumentation and Control is entirely class-level abstraction.

**Conclusion:** Instrumentation and Control is an abstract container; keep Instrumentation as the operational category.

## 4. Recommended First Evidence-Backed Population Batch

Based strictly on repository/legacy evidence, the first batch should focus on the **concrete leaf classes that have no equivalent coverage elsewhere**. These are real engineering categories already present in the legacy class list but missing types.

### Batch 1A — Leaf Blower Types

| Class | Proposed Type |
|-------|---------------|
| Regenerative Blower | Regenerative Blower |
| Screw Blower | Screw Blower |

Rationale: Blower category already has 6 types; these two are the only leaf classes without types.

### Batch 1B — Leaf Filter Types

| Class | Proposed Type |
|-------|---------------|
| Activated Carbon Filter | Activated Carbon Filter |
| Bag Filter | Bag Filter |
| Cartridge Filter | Cartridge Filter |
| Disc Filter | Disc Filter |
| Drum Filter | Drum Filter |

Rationale: Filter category has 6 existing types; these five classes are concrete, widely used in water/wastewater and dust control.

### Batch 1C — Leaf Motor Types

| Class | Proposed Type |
|-------|---------------|
| AC Synchronous Motor | AC Synchronous Motor |
| DC Motor | DC Motor |
| Explosion Proof Motor | Explosion Proof Motor |
| Servo Motor | Servo Motor |
| Submersible Motor | Submersible Motor |

Rationale: Motor category has 7 existing types (mostly AC induction / brake variants); these are distinct real-world motor families.

### Batch 1D — Leaf Pump Types

| Class | Proposed Type |
|-------|---------------|
| Diaphragm Pump | Diaphragm Pump |
| Grinder Pump | Grinder Pump |
| Peristaltic Pump | Peristaltic Pump |
| Screw Pump | Screw Pump |

Rationale: Pump is the most covered category (22 types). These four positive-displacement / special-service pumps are genuine missing leaf families.

### Batch 1E — Leaf Generator / HVAC Types

| Class | Proposed Type |
|-------|---------------|
| Diesel Generator | Diesel Generator |
| Gas Generator | Gas Generator |
| Hydro Generator | Hydro Generator |
| Wind Generator | Wind Generator |
| Cooling Tower | Cooling Tower |
| Fan Coil Unit | Fan Coil Unit |

### Batch 1F — Instrumentation / SCADA / Safety Leaf Types

| Category | Class | Proposed Type |
|----------|-------|---------------|
| Instrumentation | Analyzer | Analyzer |
| Instrumentation | Differential Pressure | Differential Pressure Transmitter |
| Instrumentation | Vibration Sensor | Vibration Sensor |
| SCADA | Historian | Historian |
| SCADA | SCADA Server | SCADA Server |
| SCADA | SCADA Workstation | SCADA Workstation |
| Safety Systems | Emergency Wash Equipment | Emergency Wash Station |
| Safety Systems | Fire Protection Equipment | Fire Protection Panel |
| Safety Systems | Gas Detection Equipment | Gas Detector |

### Batch 1G — Pipeline / Structures / Gearbox / PLC / UPS / Transformer / Switchgear

These categories already have some types or are highly concrete; the missing leaf classes should be added only after the high-frequency batches above.

## Implementation Notes

- Each new equipment type needs a **type_code** (unique short code) and a **class_id**.
- Each new type should receive the same three template kinds (Inspection, Safety_check, Testing) using existing step patterns, or explicit empty templates if no steps can be authored.
- **Do not invent engineering content** beyond the class name and reasonable type identity. Steps should be generic and safe if authoritative content is unavailable.
- The abstract/container categories (Rotating Equipment, Static Equipment, Instrumentation and Control, Valves plural, Piping Systems, Utility Equipment, Heat Exchanger duplicate) should be **marked abstract** in the Knowledge Browser or removed after architectural approval.

## Conclusion

- **98 zero-type classes** break down into roughly:
  - **~40 abstract/container classes** (duplicates or superset groupings)
  - **~58 concrete leaf classes** that deserve new equipment types
- **282 existing types are fully templated** with 3 templates and ~11 steps each.
- **Rotating Equipment / Fan and Blower** are container gaps, not content gaps; real coverage lives in Pump, Motor, Blower, Mixer, Turbine, etc.
- The first evidence-backed population batch should add approximately **40–50 new equipment types** across Blower, Filter, Motor, Pump, Generator, HVAC, Instrumentation, SCADA, and Safety Systems.

STOP for ChatGPT architecture review.
