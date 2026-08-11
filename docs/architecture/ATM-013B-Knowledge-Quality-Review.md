# ATM-013B — Atiman Knowledge Foundation Quality Review

Repository: `estrangender26/ODM-CMMS`
Base: `main @ 31c9610`
Date: 2026-08-10
Status: Investigation only — no code, schema, or data changes.

> **Documentation status notice**
> - **Status:** Historical investigation evidence.
> - **Authority:** Not approved architecture. Quality percentages are qualitative estimates, not measured statistics.
> - **Historical base:** `main @ 31c9610`.
> - **Reviewed against:** `main @ 34cae1fad779ff45220fd1783025e6cfc442b44f`.
> - **Purpose:** Preserved as quality-investigation evidence for future normalization work.

## Scope

Review the existing 846 task templates / 3,099 task steps imported from legacy ODM-CMMS data to determine whether they are good enough to become the canonical Atiman Knowledge Foundation standard, or whether they should be redesigned before adding the ~58 missing leaf equipment types identified in ATM-013A.

## Executive Summary

The imported template set is **broad but shallow**. Every equipment type has exactly three templates (Inspection, Safety_check, Testing) with mechanically generated instructions. Some templates are surprisingly equipment-specific and technically meaningful; others are generic electrical-equipment boilerplate pasted onto unrelated assets.

**Verdict:** The three-template *pattern* is a reasonable architectural skeleton, but the *content* is inconsistent. We should **reuse the pattern and the strong specific content**, while **revising or replacing the generic boilerplate** before scaling to new equipment types.

## Template Structure Observations

| Attribute | Value | Assessment |
|-----------|-------|------------|
| Templates per type | exactly 3 | Consistent, but rigid |
| Template kinds | Inspection, Safety_check, Testing | Clear semantic roles |
| Frequency | 1 month for every template | **Not appropriate** — one-size-fits-all |
| Duration | 60 minutes for every template | **Not appropriate** — ignores complexity |
| Maintenance type | `preventive` for every template | Too narrow |
| Task kind | `inspection`, `safety_check`, `testing` | Useful classification |
| Step type | `instruction` only | **Major limitation** — no measurements, pass/fail, or readings |
| Activity code linkage | none populated | Missed opportunity |
| Safety notes | 0 populated | **Major safety gap** |
| Numeric acceptance criteria | 0 populated | **No acceptance criteria** |

## Sample Quality Assessment

### 1. Pump — End Suction Pump

**Reusable.**

- Inspection steps are specific to centrifugal pumps: impeller, casing, wear rings, seals, bearings, coupling alignment, NPSH, cavitation, seal leakage.
- Safety_check includes guards, minimum-flow protection, bearing-temperature alarm, isolation valves.
- Testing includes flow, head, power, vibration, bearing temperatures.

Assessment: **strong**; equipment-specific, technically meaningful, and appropriate for operators.

### 2. Blower — Multistage Centrifugal

**Reusable.**

- Inspection covers impellers, diffusers, intercoolers, labyrinth seals, bearing temperatures, inlet guide vanes, blow-off valves, surge control, aftercooler drains.
- Safety_check references surge control, bearing-temperature trip, vibration trip, interstage relief valves, rupture discs.
- Testing includes performance test, shaft vibration, phase angle, surge margin.

Assessment: **strong**; reflects real centrifugal-compressor/blower engineering concerns.

### 3. Motor — TEFC Motor

**Mixed.**

- Inspection: “Inspect windings, contacts, and insulation … on TEFC Motor.” The phrase is appended to a generic motor template.
- Steps include cooling system, terminals, control system, vibration/noise/odor.
- Safety_check: arc flash, emergency stop, fire suppression.
- Testing: insulation resistance, protection relays, temperature rise.

Assessment: **acceptable but generic**. It applies to almost any enclosed electrical machine, not specifically TEFC motors. The “TEFC” name is cosmetic. Not harmful, but not authoritative either.

### 4. Generator — Turbo Generator

**Weak / generic.**

- Uses the exact same five inspection steps as TEFC Motor, Step-Up Transformer, and 9 other unrelated electrical assets:
  1. Inspect windings, contacts, and insulation for overheating or damage
  2. Check cooling system, oil level, or heatsink condition
  3. Verify terminals, busbars, and connections
  4. Examine control system, sensors, and protection relays
  5. Check for vibration, noise, and abnormal odor

Assessment: **should be revised**. A turbo generator needs rotor, bearings, excitation, hydrogen seal, stator winding, vibration, partial discharge, etc. The generic electrical template is misleading at this scale.

### 5. Gearbox — Mine Hoist

**Reusable.**

- Inspection: hoist rope, drum lining, brake pads/calipers, head sheave bearings, cage/guide shoe wear.
- Safety_check: overwind/underwind/slack-rope protection, brake holding capacity, emergency arresting gear, safety dogs.
- Testing: static/dynamic brake tests, rope tension balance, torque limiter, overwind/underwind trip response.

Assessment: **strong**; specific to mine hoisting. Note: this is the only type under Gearbox, yet the class name is “Mine Hoist,” which is application-specific rather than a generic gearbox class.

### 6. Filter — Reverse Osmosis

**Reusable.**

- Inspection: pressure vessels, end caps, O-rings, high-pressure pump, energy recovery device, membrane element serial flow path, cartridge filters, antiscalant dosing, fouling indicators.
- Safety_check: high-pressure relief valves, rupture discs, chemical PPE, interlocks.
- Testing: normalized permeate flow, salt rejection, differential pressure, SDT/probe test, CIP efficacy.

Assessment: **strong**; reflects real membrane-system maintenance.

### 7. Instrumentation — Electromagnetic Flow Meter

**Reusable.**

- Inspection: flow tube liner abrasion/delamination, electrode coating/corrosion, grounding rings/straps, transmitter housing/cable glands, partial filling/slug flow.
- Safety_check: empty-pipe detection, electrical isolation, high-temperature gasket/liner.
- Testing: calibrate with simulator/prover, zero point, output linearity.

Assessment: **strong**; specific to electromagnetic flow measurement.

### 8. Transformer — Step-Up Transformer

**Weak / generic.**

- Uses the same five generic electrical-machine steps as Turbo Generator and TEFC Motor.
- No mention of oil analysis, Buchholz relay, transformer turns ratio, winding resistance, bushing/power-factor testing, or OLTC.

Assessment: **should be revised**. Transformers have very specific maintenance requirements; the generic template misses them.

## Reusable vs. Weak Content

### Strong / Reusable Content (approximate share: 60–70%)

- Pump templates (across all 22 types)
- Blower templates
- Reverse Osmosis and membrane-filter templates
- Electromagnetic / instrumentation flow-meter templates
- Mine Hoist template
- Many type-specific Inspection templates that mention real components

### Acceptable but Generic Content (approximate share: 20–30%)

- Motor templates (generic enclosed-motor steps)
- Some electrical-equipment templates
- Safety_check templates that repeat common plant-safety items

### Weak / Should Be Revised (approximate share: 10–20%)

- Turbo Generator and large electrical machine templates using the generic 5-step electrical boilerplate
- Step-Up / Unit Transformer templates missing transformer-specific diagnostics
- Any template where the same exact instruction appears across unrelated asset classes

## Canonical Atiman Maintenance-Template Model

Based on this review, the canonical Atiman task-template model should preserve the three-template pattern but enrich it:

```
Equipment Type
  ├── Inspection    (visual, condition, lubrication, leakage, alignment)
  ├── Safety Check  (guards, interlocks, PPE, isolation, alarms, emergency devices)
  └── Testing       (measurement, calibration, performance verification, functional test)
```

Each template should contain steps of multiple types:

| Step Type | Purpose |
|-----------|---------|
| `instruction` | Verbal guidance / observation |
| `measurement` | Numeric reading with min/max/unit |
| `check` | Pass/fail or yes/no verification |
| `selection` | Choose from options |
| `photo` | Visual evidence capture |

Each step should support:

- `activity_code_id` (link to activity_codes taxonomy)
- `data_type`, `expected_value`, `min_value`, `max_value`, `unit`
- `is_required`
- `safety_note` (specific to the step, not generic)
- `is_visual_only`, `requires_equipment_stopped`, `prohibit_if_running`

Template-level attributes should support:

- Variable `frequency_value` + `frequency_unit` (not fixed 1 month)
- Variable `estimated_duration_minutes` (not fixed 60)
- `maintenance_type` expanded beyond `preventive` to include predictive, corrective, condition-based
- `priority`, `required_skills`, `required_tools`

## Recommendation: Expand Current Pattern or Redesign?

**Recommendation: Expand the current pattern, but first normalize the weak generic templates.**

The rigid 3-template structure is a valuable product convention — it makes the Knowledge Browser predictable and the operator experience consistent. However, adding ~58 new leaf types with the same low-quality boilerplate would damage Atiman’s credibility as an engineering knowledge system.

### Required pre-expansion work

1. **Content audit and classification:** tag every existing template as strong, acceptable, or weak.
2. **Revision of weak templates:** rewrite generic electrical-machine boilerplate for turbo generators, large motors, transformers, switchgear, UPS, etc.
3. **Add acceptance criteria:** convert qualitative instructions into measurable steps where possible (vibration limits, temperature limits, differential pressure limits).
4. **Populate safety notes:** currently zero safety notes exist despite a dedicated table and UI fields.
5. **Populate activity_code_id:** link step instructions to the 19 imported activity codes.

### After normalization

- Add the ~58 missing leaf equipment types identified in ATM-013A.
- For each new type, create three templates following the canonical model.
- Populate steps using the equipment class name and authoritative generic maintenance guidance; do not invent site-specific procedures.

## Conclusion

**The existing maintenance knowledge is a usable foundation, not a finished product.**

- **Pattern:** worth preserving and making canonical.
- **Strong content:** roughly 60–70% of templates, especially pumps, blowers, filters, instrumentation, and application-specific assets.
- **Weak content:** generic electrical-machine boilerplate reused across transformers, generators, and motors; must be revised before scaling.
- **Critical missing capabilities:** acceptance criteria, numeric measurement steps, safety notes, activity-code linkage, and variable frequency/duration.

**Next recommended step:** ATM-013C — Template Quality Normalization Plan, which classifies every existing template, lists the weak ones for revision, and defines the canonical step model before any new leaf-type population.

STOP for ChatGPT architecture review.
