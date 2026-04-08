/**
 * Template Family Definitions
 * Step 3: Family-based template assignment for system task templates
 * 
 * A template family groups equipment types by common characteristics
 * for standardized maintenance template assignment.
 */

/**
 * Template Family Structure:
 * - family_code: Unique identifier
 * - family_name: Human-readable name
 * - description: What equipment belongs to this family
 * - applicable_industries: Industries where this family applies
 * - template_rules: How to generate templates for this family
 * - safety_profile: Default safety controls for templates in this family
 */

const TemplateFamilies = {
  // ============================================
  // ROTATING EQUIPMENT FAMILIES
  // ============================================
  
  CENTRIFUGAL_PUMP: {
    family_code: 'CENTRIFUGAL_PUMP',
    family_name: 'Centrifugal Pump',
    description: 'Centrifugal pumps, end-suction, split-case, multistage',
    equipment_keywords: ['pump', 'centrifugal', 'end suction', 'split case', 'multistage'],
    applicable_industries: ['WATER_WASTEWATER_UTILITIES', 'OIL_GAS', 'POWER_UTILITIES', 'MANUFACTURING'],
    template_rules: [
      { task_kind: 'inspection', frequency: 'weekly', estimated_duration: 15 },
      { task_kind: 'measurement', frequency: 'monthly', estimated_duration: 30 },
      { task_kind: 'lubrication', frequency: 'quarterly', estimated_duration: 45 },
      { task_kind: 'safety_check', frequency: 'monthly', estimated_duration: 20 }
    ],
    safety_profile: {
      ppe: ['Safety glasses', 'Work gloves', 'Steel-toed boots'],
      isolation: ['Close suction and discharge valves', 'Lock out motor starter'],
      hazards: ['Rotating parts', 'Pressurized system', 'Hot surfaces']
    }
  },

  POSITIVE_DISPLACEMENT_PUMP: {
    family_code: 'POSITIVE_DISPLACEMENT_PUMP',
    family_name: 'Positive Displacement Pump',
    description: 'Gear pumps, screw pumps, lobe pumps, vane pumps, diaphragm pumps',
    equipment_keywords: ['pump', 'gear', 'screw', 'lobe', 'vane', 'diaphragm', 'positive displacement'],
    applicable_industries: ['OIL_GAS', 'MANUFACTURING', 'WATER_WASTEWATER_UTILITIES'],
    template_rules: [
      { task_kind: 'inspection', frequency: 'weekly', estimated_duration: 15 },
      { task_kind: 'lubrication', frequency: 'monthly', estimated_duration: 30 },
      { task_kind: 'measurement', frequency: 'quarterly', estimated_duration: 45 }
    ],
    safety_profile: {
      ppe: ['Safety glasses', 'Work gloves'],
      isolation: ['Isolate suction and discharge', 'Depressurize before maintenance'],
      hazards: ['High pressure', 'Rotating parts', 'Pinch points']
    }
  },

  FAN_BLOWER: {
    family_code: 'FAN_BLOWER',
    family_name: 'Fan/Blower',
    description: 'Centrifugal fans, axial fans, positive displacement blowers',
    equipment_keywords: ['fan', 'blower', 'ventilation', 'axial', 'centrifugal'],
    applicable_industries: ['WATER_WASTEWATER_UTILITIES', 'BUILDINGS_FACILITIES', 'MANUFACTURING'],
    template_rules: [
      { task_kind: 'inspection', frequency: 'weekly', estimated_duration: 10 },
      { task_kind: 'measurement', frequency: 'monthly', estimated_duration: 20 },
      { task_kind: 'cleaning', frequency: 'quarterly', estimated_duration: 60 },
      { task_kind: 'lubrication', frequency: 'quarterly', estimated_duration: 30 }
    ],
    safety_profile: {
      ppe: ['Safety glasses', 'Hearing protection', 'Dust mask'],
      isolation: ['Lock out fan motor', 'Close dampers'],
      hazards: ['Rotating blades', 'Noise', 'Dust']
    }
  },

  COMPRESSOR: {
    family_code: 'COMPRESSOR',
    family_name: 'Compressor',
    description: 'Reciprocating, rotary screw, centrifugal compressors',
    equipment_keywords: ['compressor', 'air compressor', 'gas compressor', 'screw', 'reciprocating'],
    applicable_industries: ['OIL_GAS', 'MANUFACTURING', 'BUILDINGS_FACILITIES'],
    template_rules: [
      { task_kind: 'inspection', frequency: 'daily', estimated_duration: 10 },
      { task_kind: 'measurement', frequency: 'weekly', estimated_duration: 20 },
      { task_kind: 'lubrication', frequency: 'monthly', estimated_duration: 45 },
      { task_kind: 'safety_check', frequency: 'monthly', estimated_duration: 15 }
    ],
    safety_profile: {
      ppe: ['Safety glasses', 'Hearing protection', 'Work gloves'],
      isolation: ['Isolate and depressurize', 'Lock out starter'],
      hazards: ['High pressure', 'Noise', 'Hot surfaces', 'Rotating parts']
    }
  },

  TURBINE: {
    family_code: 'TURBINE',
    family_name: 'Turbine',
    description: 'Steam turbines, gas turbines, hydraulic turbines',
    equipment_keywords: ['turbine', 'steam turbine', 'gas turbine', 'hydro turbine'],
    applicable_industries: ['POWER_UTILITIES', 'OIL_GAS'],
    template_rules: [
      { task_kind: 'inspection', frequency: 'daily', estimated_duration: 30 },
      { task_kind: 'measurement', frequency: 'weekly', estimated_duration: 60 },
      { task_kind: 'lubrication', frequency: 'monthly', estimated_duration: 120 },
      { task_kind: 'testing', frequency: 'quarterly', estimated_duration: 180 }
    ],
    safety_profile: {
      ppe: ['Safety glasses', 'Hard hat', 'Hearing protection', 'Safety shoes'],
      isolation: ['Steam isolation valves', 'Generator breaker', 'Hydraulic systems'],
      hazards: ['High pressure steam', 'Rotating parts', 'High voltage', 'Hot surfaces']
    }
  },

  // ============================================
  // ELECTRICAL EQUIPMENT FAMILIES
  // ============================================

  ELECTRIC_MOTOR: {
    family_code: 'ELECTRIC_MOTOR',
    family_name: 'Electric Motor',
    description: 'AC motors, DC motors, induction motors, synchronous motors',
    equipment_keywords: ['motor', 'electric motor', 'induction', 'synchronous'],
    applicable_industries: ['ALL'],
    template_rules: [
      { task_kind: 'inspection', frequency: 'monthly', estimated_duration: 15 },
      { task_kind: 'measurement', frequency: 'quarterly', estimated_duration: 30 },
      { task_kind: 'cleaning', frequency: 'quarterly', estimated_duration: 45 },
      { task_kind: 'lubrication', frequency: 'semi_annual', estimated_duration: 30 }
    ],
    safety_profile: {
      ppe: ['Safety glasses', 'Electrical gloves (if work required)'],
      isolation: ['Lock out motor starter', 'Verify zero energy'],
      hazards: ['Electrical shock', 'Rotating parts', 'Hot surfaces']
    }
  },

  TRANSFORMER: {
    family_code: 'TRANSFORMER',
    family_name: 'Transformer',
    description: 'Power transformers, distribution transformers, instrument transformers',
    equipment_keywords: ['transformer', 'power transformer', 'distribution transformer'],
    applicable_industries: ['POWER_UTILITIES', 'MANUFACTURING', 'OIL_GAS'],
    template_rules: [
      { task_kind: 'inspection', frequency: 'monthly', estimated_duration: 20 },
      { task_kind: 'measurement', frequency: 'quarterly', estimated_duration: 45 },
      { task_kind: 'safety_check', frequency: 'monthly', estimated_duration: 15 },
      { task_kind: 'testing', frequency: 'annual', estimated_duration: 120 }
    ],
    safety_profile: {
      ppe: ['Safety glasses', 'Hard hat', 'Arc flash PPE (if required)'],
      isolation: ['De-energize primary and secondary', 'Ground and tag'],
      hazards: ['High voltage', 'Oil (fire hazard)', 'Magnetic fields']
    }
  },

  SWITCHGEAR: {
    family_code: 'SWITCHGEAR',
    family_name: 'Switchgear',
    description: 'Circuit breakers, switches, busbars, protection relays',
    equipment_keywords: ['switchgear', 'circuit breaker', 'breaker', 'switch', 'busbar'],
    applicable_industries: ['POWER_UTILITIES', 'MANUFACTURING', 'OIL_GAS', 'BUILDINGS_FACILITIES'],
    template_rules: [
      { task_kind: 'inspection', frequency: 'monthly', estimated_duration: 30 },
      { task_kind: 'measurement', frequency: 'quarterly', estimated_duration: 45 },
      { task_kind: 'cleaning', frequency: 'semi_annual', estimated_duration: 60 },
      { task_kind: 'testing', frequency: 'annual', estimated_duration: 180 }
    ],
    safety_profile: {
      ppe: ['Safety glasses', 'Hard hat', 'Arc flash PPE'],
      isolation: ['De-energize and verify', 'Apply grounds', 'Lock out'],
      hazards: ['High voltage', 'Arc flash', 'Short circuit']
    }
  },

  UPS_BATTERY: {
    family_code: 'UPS_BATTERY',
    family_name: 'UPS/Battery System',
    description: 'UPS units, battery banks, chargers, inverters',
    equipment_keywords: ['ups', 'battery', 'inverter', 'charger', 'uninterruptible'],
    applicable_industries: ['BUILDINGS_FACILITIES', 'POWER_UTILITIES', 'MANUFACTURING'],
    template_rules: [
      { task_kind: 'inspection', frequency: 'weekly', estimated_duration: 15 },
      { task_kind: 'measurement', frequency: 'monthly', estimated_duration: 20 },
      { task_kind: 'safety_check', frequency: 'monthly', estimated_duration: 10 },
      { task_kind: 'testing', frequency: 'quarterly', estimated_duration: 30 }
    ],
    safety_profile: {
      ppe: ['Safety glasses', 'Acid-resistant gloves', 'Face shield'],
      isolation: ['Turn off charger', 'Disconnect load'],
      hazards: ['Electrical shock', 'Battery acid', 'Hydrogen gas', 'Fire']
    }
  },

  // ============================================
  // HEAT TRANSFER EQUIPMENT FAMILIES
  // ============================================

  HEAT_EXCHANGER: {
    family_code: 'HEAT_EXCHANGER',
    family_name: 'Heat Exchanger',
    description: 'Shell and tube, plate, air-cooled heat exchangers',
    equipment_keywords: ['heat exchanger', 'cooler', 'heater', 'condenser', 'reboiler'],
    applicable_industries: ['OIL_GAS', 'POWER_UTILITIES', 'MANUFACTURING'],
    template_rules: [
      { task_kind: 'inspection', frequency: 'weekly', estimated_duration: 20 },
      { task_kind: 'measurement', frequency: 'monthly', estimated_duration: 30 },
      { task_kind: 'cleaning', frequency: 'semi_annual', estimated_duration: 240 }
    ],
    safety_profile: {
      ppe: ['Safety glasses', 'Work gloves', 'Thermal gloves'],
      isolation: ['Isolate hot/cold fluids', 'Drain and depressurize', 'Allow cooling'],
      hazards: ['Hot surfaces', 'Pressurized fluids', 'Chemical exposure']
    }
  },

  BOILER: {
    family_code: 'BOILER',
    family_name: 'Boiler',
    description: 'Steam boilers, hot water boilers, package boilers',
    equipment_keywords: ['boiler', 'steam generator', 'water tube', 'fire tube'],
    applicable_industries: ['POWER_UTILITIES', 'MANUFACTURING', 'OIL_GAS'],
    template_rules: [
      { task_kind: 'inspection', frequency: 'daily', estimated_duration: 30 },
      { task_kind: 'measurement', frequency: 'weekly', estimated_duration: 45 },
      { task_kind: 'safety_check', frequency: 'daily', estimated_duration: 15 },
      { task_kind: 'testing', frequency: 'monthly', estimated_duration: 60 }
    ],
    safety_profile: {
      ppe: ['Safety glasses', 'Hard hat', 'Safety shoes', 'Thermal PPE'],
      isolation: ['Secure fuel supply', 'Isolate steam', 'Allow cooldown'],
      hazards: ['High pressure steam', 'Hot surfaces', 'Fuel (fire/explosion)', 'Burns']
    }
  },

  HVAC_UNIT: {
    family_code: 'HVAC_UNIT',
    family_name: 'HVAC Unit',
    description: 'Air handlers, chillers, cooling towers, rooftop units',
    equipment_keywords: ['hvac', 'air handler', 'chiller', 'cooling tower', 'rtu', 'ahu'],
    applicable_industries: ['BUILDINGS_FACILITIES', 'MANUFACTURING'],
    template_rules: [
      { task_kind: 'inspection', frequency: 'weekly', estimated_duration: 20 },
      { task_kind: 'measurement', frequency: 'monthly', estimated_duration: 30 },
      { task_kind: 'cleaning', frequency: 'quarterly', estimated_duration: 120 },
      { task_kind: 'adjustment', frequency: 'semi_annual', estimated_duration: 60 }
    ],
    safety_profile: {
      ppe: ['Safety glasses', 'Work gloves'],
      isolation: ['Electrical lockout', 'Close valves'],
      hazards: ['Electrical', 'Rotating parts', 'Refrigerants', 'Heights']
    }
  },

  // ============================================
  // STATIC/STRUCTURAL EQUIPMENT FAMILIES
  // ============================================

  STORAGE_TANK: {
    family_code: 'STORAGE_TANK',
    family_name: 'Storage Tank',
    description: 'Atmospheric tanks, pressure vessels, silos, bins',
    equipment_keywords: ['tank', 'vessel', 'silos', 'bin', 'storage'],
    applicable_industries: ['OIL_GAS', 'WATER_WASTEWATER_UTILITIES', 'MANUFACTURING'],
    template_rules: [
      { task_kind: 'inspection', frequency: 'weekly', estimated_duration: 20 },
      { task_kind: 'measurement', frequency: 'monthly', estimated_duration: 30 },
      { task_kind: 'safety_check', frequency: 'monthly', estimated_duration: 15 }
    ],
    safety_profile: {
      ppe: ['Safety glasses', 'Hard hat', 'Safety shoes'],
      isolation: ['Isolate from process', 'Empty and clean if entry required'],
      hazards: ['Confined space', 'Product exposure', 'Pressure/vacuum', 'Falls']
    }
  },

  PIPELINE_VALVE: {
    family_code: 'PIPELINE_VALVE',
    family_name: 'Pipeline/Valve',
    description: 'Piping systems, manual valves, control valves, relief valves',
    equipment_keywords: ['valve', 'pipeline', 'piping', 'control valve', 'relief valve'],
    applicable_industries: ['OIL_GAS', 'WATER_WASTEWATER_UTILITIES', 'POWER_UTILITIES'],
    template_rules: [
      { task_kind: 'inspection', frequency: 'monthly', estimated_duration: 15 },
      { task_kind: 'measurement', frequency: 'quarterly', estimated_duration: 30 },
      { task_kind: 'adjustment', frequency: 'semi_annual', estimated_duration: 45 },
      { task_kind: 'safety_check', frequency: 'monthly', estimated_duration: 10 }
    ],
    safety_profile: {
      ppe: ['Safety glasses', 'Work gloves'],
      isolation: ['Close block valves', 'Depressurize section'],
      hazards: ['Pressurized fluid', 'Residual product', 'Pinch points']
    }
  },

  // ============================================
  // CONVEYANCE EQUIPMENT FAMILIES
  // ============================================

  CONVEYOR: {
    family_code: 'CONVEYOR',
    family_name: 'Conveyor',
    description: 'Belt conveyors, screw conveyors, chain conveyors, bucket elevators',
    equipment_keywords: ['conveyor', 'belt conveyor', 'screw conveyor', 'bucket elevator'],
    applicable_industries: ['MANUFACTURING', 'OIL_GAS'],
    template_rules: [
      { task_kind: 'inspection', frequency: 'weekly', estimated_duration: 20 },
      { task_kind: 'measurement', frequency: 'monthly', estimated_duration: 30 },
      { task_kind: 'lubrication', frequency: 'monthly', estimated_duration: 45 },
      { task_kind: 'adjustment', frequency: 'quarterly', estimated_duration: 60 }
    ],
    safety_profile: {
      ppe: ['Safety glasses', 'Work gloves', 'Hair/beard net'],
      isolation: ['Lock out motor', 'Secure against motion'],
      hazards: ['Moving parts', 'Nip points', 'Entanglement', 'Noise']
    }
  },

  ELEVATOR_LIFT: {
    family_code: 'ELEVATOR_LIFT',
    family_name: 'Elevator/Lift',
    description: 'Passenger elevators, freight elevators, hoists, lifts',
    equipment_keywords: ['elevator', 'lift', 'hoist', 'vertical transport'],
    applicable_industries: ['BUILDINGS_FACILITIES', 'MANUFACTURING'],
    template_rules: [
      { task_kind: 'inspection', frequency: 'monthly', estimated_duration: 30 },
      { task_kind: 'measurement', frequency: 'quarterly', estimated_duration: 45 },
      { task_kind: 'safety_check', frequency: 'monthly', estimated_duration: 20 },
      { task_kind: 'testing', frequency: 'quarterly', estimated_duration: 60 }
    ],
    safety_profile: {
      ppe: ['Safety glasses', 'Hard hat', 'Safety shoes'],
      isolation: ['Place out of service', 'Lock controls'],
      hazards: ['Falling', 'Electrical', 'Moving car', 'Counterweights']
    }
  },

  // ============================================
  // INSTRUMENTATION FAMILIES
  // ============================================

  PROCESS_INSTRUMENT: {
    family_code: 'PROCESS_INSTRUMENT',
    family_name: 'Process Instrument',
    description: 'Pressure transmitters, temperature transmitters, flow meters, level sensors',
    equipment_keywords: ['transmitter', 'sensor', 'meter', 'gauge', 'analyzer', 'instrument'],
    applicable_industries: ['ALL'],
    template_rules: [
      { task_kind: 'inspection', frequency: 'monthly', estimated_duration: 15 },
      { task_kind: 'measurement', frequency: 'quarterly', estimated_duration: 30 },
      { task_kind: 'calibration', frequency: 'semi_annual', estimated_duration: 60 },
      { task_kind: 'cleaning', frequency: 'quarterly', estimated_duration: 20 }
    ],
    safety_profile: {
      ppe: ['Safety glasses'],
      isolation: ['Isolate process connection', 'Depressurize'],
      hazards: ['Pressurized process', 'Chemical exposure', 'Electrical']
    }
  },

  FIRE_GAS_DETECTOR: {
    family_code: 'FIRE_GAS_DETECTOR',
    family_name: 'Fire/Gas Detector',
    description: 'Smoke detectors, heat detectors, gas detectors, flame detectors',
    equipment_keywords: ['detector', 'smoke detector', 'gas detector', 'fire alarm'],
    applicable_industries: ['ALL'],
    template_rules: [
      { task_kind: 'inspection', frequency: 'weekly', estimated_duration: 10 },
      { task_kind: 'cleaning', frequency: 'monthly', estimated_duration: 15 },
      { task_kind: 'safety_check', frequency: 'monthly', estimated_duration: 10 },
      { task_kind: 'testing', frequency: 'quarterly', estimated_duration: 30 }
    ],
    safety_profile: {
      ppe: ['Safety glasses'],
      isolation: ['Notify fire panel (test mode)', 'Disable release circuits'],
      hazards: ['False alarm', 'Electrical', 'Heights (if mounted high)']
    }
  }
};

/**
 * Equipment Type to Family Mapping Function
 * Maps an equipment type (by name/code) to its template family
 */
function getFamilyForEquipmentType(typeName, typeCode, className = '') {
  const searchText = `${typeName} ${typeCode} ${className}`.toLowerCase();
  
  for (const [familyCode, family] of Object.entries(TemplateFamilies)) {
    for (const keyword of family.equipment_keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return familyCode;
      }
    }
  }
  
  return null; // No family match
}

/**
 * Get all templates that should be created for a family
 */
function getTemplatesForFamily(familyCode) {
  const family = TemplateFamilies[familyCode];
  if (!family) return [];
  
  return family.template_rules.map((rule, index) => ({
    template_code: `${familyCode}_${rule.task_kind.toUpperCase()}_${index + 1}`,
    template_name: `${family.family_name} - ${rule.task_kind.charAt(0).toUpperCase() + rule.task_kind.slice(1)}`,
    task_kind: rule.task_kind,
    frequency: rule.frequency,
    estimated_duration: rule.estimated_duration,
    safety_profile: family.safety_profile
  }));
}

module.exports = {
  TemplateFamilies,
  getFamilyForEquipmentType,
  getTemplatesForFamily
};
