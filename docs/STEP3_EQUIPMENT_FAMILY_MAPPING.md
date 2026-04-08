# Step 3: Equipment Type to Family Mapping

## Overview

Template families group equipment types by common characteristics for standardized maintenance template assignment. Each family defines:
- Applicable equipment keywords
- Industry applicability
- Template rules (task kinds, frequencies)
- Safety profiles

## Template Families

### Rotating Equipment Families

| Family Code | Family Name | Equipment Keywords | Industries |
|-------------|-------------|-------------------|------------|
| CENTRIFUGAL_PUMP | Centrifugal Pump | pump, centrifugal, end suction, split case, multistage | WATER_WASTEWATER_UTILITIES, OIL_GAS, POWER_UTILITIES, MANUFACTURING |
| POSITIVE_DISPLACEMENT_PUMP | Positive Displacement Pump | pump, gear, screw, lobe, vane, diaphragm | OIL_GAS, MANUFACTURING, WATER_WASTEWATER_UTILITIES |
| FAN_BLOWER | Fan/Blower | fan, blower, ventilation, axial, centrifugal | WATER_WASTEWATER_UTILITIES, BUILDINGS_FACILITIES, MANUFACTURING |
| COMPRESSOR | Compressor | compressor, air compressor, gas compressor, screw, reciprocating | OIL_GAS, MANUFACTURING, BUILDINGS_FACILITIES |
| TURBINE | Turbine | turbine, steam turbine, gas turbine, hydro turbine | POWER_UTILITIES, OIL_GAS |

### Electrical Equipment Families

| Family Code | Family Name | Equipment Keywords | Industries |
|-------------|-------------|-------------------|------------|
| ELECTRIC_MOTOR | Electric Motor | motor, electric motor, induction, synchronous | ALL |
| TRANSFORMER | Transformer | transformer, power transformer, distribution transformer | POWER_UTILITIES, MANUFACTURING, OIL_GAS |
| SWITCHGEAR | Switchgear | switchgear, circuit breaker, breaker, switch, busbar | POWER_UTILITIES, MANUFACTURING, OIL_GAS, BUILDINGS_FACILITIES |
| UPS_BATTERY | UPS/Battery System | ups, battery, inverter, charger, uninterruptible | BUILDINGS_FACILITIES, POWER_UTILITIES, MANUFACTURING |

### Heat Transfer Equipment Families

| Family Code | Family Name | Equipment Keywords | Industries |
|-------------|-------------|-------------------|------------|
| HEAT_EXCHANGER | Heat Exchanger | heat exchanger, cooler, heater, condenser, reboiler | OIL_GAS, POWER_UTILITIES, MANUFACTURING |
| BOILER | Boiler | boiler, steam generator, water tube, fire tube | POWER_UTILITIES, MANUFACTURING, OIL_GAS |
| HVAC_UNIT | HVAC Unit | hvac, air handler, chiller, cooling tower, rtu, ahu | BUILDINGS_FACILITIES, MANUFACTURING |

### Static/Structural Equipment Families

| Family Code | Family Name | Equipment Keywords | Industries |
|-------------|-------------|-------------------|------------|
| STORAGE_TANK | Storage Tank | tank, vessel, silos, bin, storage | OIL_GAS, WATER_WASTEWATER_UTILITIES, MANUFACTURING |
| PIPELINE_VALVE | Pipeline/Valve | valve, pipeline, piping, control valve, relief valve | OIL_GAS, WATER_WASTEWATER_UTILITIES, POWER_UTILITIES |

### Conveyance Equipment Families

| Family Code | Family Name | Equipment Keywords | Industries |
|-------------|-------------|-------------------|------------|
| CONVEYOR | Conveyor | conveyor, belt conveyor, screw conveyor, bucket elevator | MANUFACTURING, OIL_GAS |
| ELEVATOR_LIFT | Elevator/Lift | elevator, lift, hoist, vertical transport | BUILDINGS_FACILITIES, MANUFACTURING |

### Instrumentation Families

| Family Code | Family Name | Equipment Keywords | Industries |
|-------------|-------------|-------------------|------------|
| PROCESS_INSTRUMENT | Process Instrument | transmitter, sensor, meter, gauge, analyzer, instrument | ALL |
| FIRE_GAS_DETECTOR | Fire/Gas Detector | detector, smoke detector, gas detector, fire alarm | ALL |

## Template Rules by Family

Each family generates templates with these task kinds:

### Example: CENTRIFUGAL_PUMP
```javascript
template_rules: [
  { task_kind: 'inspection', frequency: 'weekly', estimated_duration: 15 },
  { task_kind: 'measurement', frequency: 'monthly', estimated_duration: 30 },
  { task_kind: 'lubrication', frequency: 'quarterly', estimated_duration: 45 },
  { task_kind: 'safety_check', frequency: 'monthly', estimated_duration: 20 }
]
```

This generates 4 system templates per equipment type in this family.

## Mapping Algorithm

```javascript
function getFamilyForEquipmentType(typeName, typeCode, className) {
  const searchText = `${typeName} ${typeCode} ${className}`.toLowerCase();
  
  for (const [familyCode, family] of Object.entries(TemplateFamilies)) {
    for (const keyword of family.equipment_keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return familyCode;
      }
    }
  }
  
  return null; // No family match - equipment type gets no system templates
}
```

### Priority
Keywords are matched in order of specificity. First match wins.

### Fallback
Equipment types that don't match any family:
- Logged for manual review
- No system templates auto-generated
- Can still have organization-specific templates created manually

## Generated Template Naming

```
Template Code: {FAMILY_CODE}_{TASK_KIND}_{INDEX}
Example: CENTRIFUGAL_PUMP_INSPECTION_1

Template Name: {Family Name} - {Task Kind}
Example: Centrifugal Pump - Inspection
```

## Template Properties

All generated system templates have:
- `organization_id = NULL` (system template)
- `is_system = TRUE`
- `is_editable = FALSE`
- `task_kind` (one of 9 canonical values)
- `maintenance_type = 'preventive'`
- `is_active = TRUE`

## Safety Profiles

Each family defines a safety profile with:
- **PPE**: Required and recommended personal protective equipment
- **Isolation**: Required isolation procedures
- **Hazards**: Key hazards to be aware of

These populate:
- `task_template_safety_controls` table (template-level)
- `task_template_steps.safety_note` (step-level)
- `task_template_steps.is_visual_only`
- `task_template_steps.requires_equipment_stopped`
- `task_template_steps.prohibit_if_running`
- `task_template_steps.prohibit_opening_covers`
