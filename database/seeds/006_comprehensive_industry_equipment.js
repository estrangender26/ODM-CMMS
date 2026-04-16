/**
 * Comprehensive Cross-Industry Equipment Seed
 * Adds equipment types for mining, oil & gas, power generation, chemical, and general manufacturing
 */

const { pool } = require('../../src/config/database');

const SEED_BATCH_ID = 'step6_comprehensive_equipment_v1';

// ============================================================
// DATA DEFINITIONS
// ============================================================

const newCategories = [
  { code: 'HAUL', name: 'Haulage', description: 'Material transport and hauling equipment' },
  { code: 'CRUSH', name: 'Crushing', description: 'Size reduction and crushing equipment' },
  { code: 'MILL', name: 'Milling', description: 'Grinding and milling equipment' },
  { code: 'DRILL', name: 'Drilling', description: 'Drilling and boring equipment' },
  { code: 'EXCAV', name: 'Excavation', description: 'Earth moving and excavation equipment' },
  { code: 'TURB', name: 'Turbine', description: 'Steam and gas turbines' },
  { code: 'BOIL', name: 'Boiler', description: 'Steam generation boilers' },
  { code: 'COOL', name: 'Cooling', description: 'Cooling towers and heat rejection' },
  { code: 'POLL', name: 'Pollution Control', description: 'Emissions and pollution control' },
  { code: 'ASH', name: 'Ash Handling', description: 'Coal ash handling systems' },
  { code: 'REACT', name: 'Reactor', description: 'Chemical reaction vessels' },
  { code: 'DIST', name: 'Distillation', description: 'Separation and distillation columns' },
  { code: 'DRY', name: 'Drying', description: 'Drying and evaporation equipment' },
  { code: 'SEP_CH', name: 'Chemical Separation', description: 'Filtration and centrifugation' },
  { code: 'CNC', name: 'CNC Machine', description: 'Computer numerical control machines' },
  { code: 'PRESS', name: 'Press', description: 'Forming and pressing equipment' },
  { code: 'INJECT', name: 'Injection Molding', description: 'Plastic and metal injection molding' },
  { code: 'ROBOT', name: 'Robot', description: 'Industrial robots and automation' },
  { code: 'WELD', name: 'Welding', description: 'Welding and joining equipment' },
  { code: 'PAINT', name: 'Paint', description: 'Coating and painting systems' },
  { code: 'PACKAGE', name: 'Packaging', description: 'Packaging and palletizing equipment' },
  { code: 'WELL', name: 'Wellhead', description: 'Oil and gas wellhead equipment' },
  { code: 'SEP_OG', name: 'Separator', description: 'Oil and gas separation equipment' },
  { code: 'HEAT_OG', name: 'Heater', description: 'Oil and gas heating equipment' },
  { code: 'METER', name: 'Metering', description: 'Flow and composition metering' },
  { code: 'BOP', name: 'BOP', description: 'Blowout prevention equipment' },
  { code: 'RIG', name: 'Rig', description: 'Drilling rig equipment' },
  { code: 'SUBSEA', name: 'Subsea', description: 'Subsea production equipment' },
  { code: 'TANK_OG', name: 'Storage Tank', description: 'Oil and gas storage vessels' },
  { code: 'FLARE', name: 'Flare', description: 'Flare and vent systems' },
  { code: 'STACK', name: 'Stack', description: 'Chimneys and exhaust stacks' },
  { code: 'MAT_HAND', name: 'Material Handling', description: 'Forklifts and material transport' },
  { code: 'HRSG', name: 'HRSG', description: 'Heat recovery steam generators' },
  { code: 'COMP_GEN', name: 'General Compressor', description: 'General purpose compressors' },
  { code: 'HVAC', name: 'HVAC', description: 'Heating ventilation and air conditioning' },
  { code: 'DUST_COLL', name: 'Dust Collection', description: 'Dust and fume collection' },
  { code: 'HEAT_EX', name: 'Heat Exchanger', description: 'Heat transfer equipment' },
  { code: 'TREAT', name: 'Treatment', description: 'Treatment and filtration units' },
];

// Equipment types organized by: category_code, class_name, type_code, type_name, description, industries[], family_code
const newEquipmentTypes = [
  // ===== MINING =====
  { cat: 'HAUL', class: 'Haul Truck', code: 'HAUL_TRK', name: 'Haul Truck', desc: 'Large rigid-frame off-highway mining truck', industries: ['mining', 'general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'HAUL', class: 'Dump Truck', code: 'ART_DUMP', name: 'Articulated Dump Truck', desc: 'Articulated frame off-road dump truck', industries: ['mining', 'general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'HAUL', class: 'Wheel Loader', code: 'WHL_LOAD', name: 'Wheel Loader', desc: 'Large wheel loader for loading and hauling', industries: ['mining', 'general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'EXCAV', class: 'Hydraulic Shovel', code: 'HYD_SHOVEL', name: 'Hydraulic Shovel', desc: 'Large hydraulic mining shovel', industries: ['mining'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'EXCAV', class: 'Rope Shovel', code: 'ROPE_SHOVEL', name: 'Rope Shovel', desc: 'Electric rope mining shovel', industries: ['mining'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'EXCAV', class: 'Bulldozer', code: 'BULLDOZER', name: 'Bulldozer', desc: 'Tracked crawler tractor with blade', industries: ['mining', 'general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'EXCAV', class: 'Motor Grader', code: 'MOTOR_GRADER', name: 'Motor Grader', desc: 'Heavy equipment with long blade for grading', industries: ['mining', 'general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'DRILL', class: 'Rotary Drill', code: 'ROT_DRILL', name: 'Rotary Drill', desc: 'Large rotary blasthole drill rig', industries: ['mining'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'DRILL', class: 'DTH Drill', code: 'DTH_DRILL', name: 'DTH Drill', desc: 'Down-the-hole hammer drill', industries: ['mining'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'DRILL', class: 'Roof Bolter', code: 'ROOF_BOLT', name: 'Roof Bolter', desc: 'Underground roof bolting machine', industries: ['mining'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'DRILL', class: 'Continuous Miner', code: 'CONT_MINER', name: 'Continuous Miner', desc: 'Underground continuous mining machine', industries: ['mining'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'DRILL', class: 'Longwall Shearer', code: 'LWSHEARER', name: 'Longwall Shearer', desc: 'Underground longwall coal shearer', industries: ['mining'], family: 'ELECTRICAL_FAMILY' },
  { cat: 'CRUSH', class: 'Jaw Crusher', code: 'JAW_CRUSH', name: 'Jaw Crusher', desc: 'Primary jaw crusher for size reduction', industries: ['mining', 'general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'CRUSH', class: 'Cone Crusher', code: 'CONE_CRUSH', name: 'Cone Crusher', desc: 'Secondary cone crusher', industries: ['mining', 'general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'CRUSH', class: 'Gyratory Crusher', code: 'GYR_CRUSH', name: 'Gyratory Crusher', desc: 'Primary gyratory crusher', industries: ['mining'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'CRUSH', class: 'Impact Crusher', code: 'IMP_CRUSH', name: 'Impact Crusher', desc: 'Horizontal or vertical shaft impact crusher', industries: ['mining', 'general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'MILL', class: 'SAG Mill', code: 'SAG_MILL', name: 'SAG Mill', desc: 'Semi-autogenous grinding mill', industries: ['mining'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'MILL', class: 'Ball Mill', code: 'BALL_MILL', name: 'Ball Mill', desc: 'Ball grinding mill', industries: ['mining', 'power_gen', 'general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'MILL', class: 'Rod Mill', code: 'ROD_MILL', name: 'Rod Mill', desc: 'Rod grinding mill', industries: ['mining'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'MILL', class: 'Vertical Mill', code: 'VERT_MILL', name: 'Vertical Mill', desc: 'Vertical roller mill', industries: ['mining', 'power_gen'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'CONV', class: 'Overland Conveyor', code: 'OVL_CONV', name: 'Overland Conveyor', desc: 'Long-distance bulk material conveyor', industries: ['mining', 'power_gen', 'general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'CONV', class: 'Bucket Elevator', code: 'BUCK_ELEV', name: 'Bucket Elevator', desc: 'Vertical bulk material elevator', industries: ['mining', 'general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'CONV', class: 'Apron Feeder', code: 'APRON_FEED', name: 'Apron Feeder', desc: 'Heavy-duty apron plate feeder', industries: ['mining', 'power_gen'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'CONV', class: 'Vibrating Feeder', code: 'VIB_FEED', name: 'Vibrating Feeder', desc: 'Electromechanical vibrating feeder', industries: ['mining', 'general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'PUMP', class: 'Mine Dewatering Pump', code: 'MINE_DW_PUMP', name: 'Mine Dewatering Pump', desc: 'High-head mine dewatering pump', industries: ['mining', 'water_ww'], family: 'PUMP_FAMILY' },
  { cat: 'PUMP', class: 'Slurry Pump', code: 'SLURRY_PUMP', name: 'Slurry Pump', desc: 'Heavy-duty slurry handling pump', industries: ['mining', 'general'], family: 'PUMP_FAMILY' },
  { cat: 'GEAR', class: 'Mine Hoist', code: 'MINE_HOIST', name: 'Mine Hoist', desc: 'Underground shaft mine hoist', industries: ['mining'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'MOTOR', class: 'Winder Motor', code: 'WINDER_MOTOR', name: 'Winder Motor', desc: 'Mine winder electric motor', industries: ['mining'], family: 'ELECTRICAL_FAMILY' },
  { cat: 'INST', class: 'Gas Detector', code: 'GAS_DETECT', name: 'Gas Detector', desc: 'Underground toxic gas detection system', industries: ['mining', 'oil_gas', 'chemical'], family: 'SAFETY_EQUIPMENT_FAMILY' },
  { cat: 'BLOW', class: 'Mine Ventilation Fan', code: 'MINE_FAN', name: 'Mine Ventilation Fan', desc: 'Primary or booster mine ventilation fan', industries: ['mining'], family: 'AIR_SYSTEM_FAMILY' },

  // ===== OIL & GAS =====
  { cat: 'WELL', class: 'Wellhead Assembly', code: 'WELLHEAD', name: 'Wellhead Assembly', desc: 'Oil and gas wellhead with casing heads', industries: ['oil_gas'], family: 'VALVE_FAMILY' },
  { cat: 'WELL', class: 'Christmas Tree', code: 'XMAS_TREE', name: 'Christmas Tree', desc: 'Wellhead assembly of valves and fittings', industries: ['oil_gas'], family: 'VALVE_FAMILY' },
  { cat: 'SEP_OG', class: 'Production Separator', code: 'PROD_SEP', name: 'Production Separator', desc: 'Two or three phase production separator', industries: ['oil_gas', 'chemical'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'SEP_OG', class: 'Test Separator', code: 'TEST_SEP', name: 'Test Separator', desc: 'Well test separator', industries: ['oil_gas'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'SEP_OG', class: 'Coalescer', code: 'COALESCER', name: 'Coalescer', desc: 'Liquid-liquid coalescing separator', industries: ['oil_gas', 'chemical'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'HEAT_OG', class: 'Heater Treater', code: 'HEATER_TREAT', name: 'Heater Treater', desc: 'Oil-water emulsion treating heater', industries: ['oil_gas'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'HEAT_OG', class: 'Indirect Heater', code: 'INDIR_HEAT', name: 'Indirect Heater', desc: 'Indirect fired line heater', industries: ['oil_gas'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'COMP', class: 'Gas Compressor', code: 'GAS_COMP', name: 'Gas Compressor', desc: 'High pressure natural gas compressor', industries: ['oil_gas', 'chemical', 'general'], family: 'AIR_SYSTEM_FAMILY' },
  { cat: 'COMP', class: 'Reciprocating Compressor', code: 'RECIP_COMP_OG', name: 'Reciprocating Compressor', desc: 'Reciprocating piston compressor', industries: ['oil_gas', 'chemical', 'general'], family: 'AIR_SYSTEM_FAMILY' },
  { cat: 'COMP', class: 'Screw Compressor', code: 'SCREW_COMP_OG', name: 'Screw Compressor', desc: 'Rotary screw gas compressor', industries: ['oil_gas', 'chemical', 'general'], family: 'AIR_SYSTEM_FAMILY' },
  { cat: 'PIPE', class: 'Subsea Pipeline', code: 'SUBSEA_PIPE', name: 'Subsea Pipeline', desc: 'Offshore subsea production pipeline', industries: ['oil_gas'], family: 'PIPELINE_FAMILY' },
  { cat: 'PIPE', class: 'Flowline', code: 'FLOWLINE', name: 'Flowline', desc: 'Well to facility production flowline', industries: ['oil_gas'], family: 'PIPELINE_FAMILY' },
  { cat: 'PIPE', class: 'Gathering Line', code: 'GATH_LINE', name: 'Gathering Line', desc: 'Multi-well gathering pipeline system', industries: ['oil_gas'], family: 'PIPELINE_FAMILY' },
  { cat: 'PIPE', class: 'Pig Launcher', code: 'PIG_LAUNCH', name: 'Pig Launcher', desc: 'Pipeline pig launching receiver', industries: ['oil_gas'], family: 'PIPING_COMPONENT_FAMILY' },
  { cat: 'PIPE', class: 'Pig Receiver', code: 'PIG_REC', name: 'Pig Receiver', desc: 'Pipeline pig receiving trap', industries: ['oil_gas'], family: 'PIPING_COMPONENT_FAMILY' },
  { cat: 'TANK_OG', class: 'Bullet Tank', code: 'BULLET_TANK', name: 'Bullet Tank', desc: 'Horizontal bullet shaped pressure vessel', industries: ['oil_gas', 'chemical'], family: 'STATIC_CONTAINMENT_FAMILY' },
  { cat: 'TANK_OG', class: 'Spherical Tank', code: 'SPH_TANK', name: 'Spherical Tank', desc: 'Spherical pressure storage vessel', industries: ['oil_gas', 'chemical'], family: 'STATIC_CONTAINMENT_FAMILY' },
  { cat: 'TANK_OG', class: 'API Tank', code: 'API_TANK', name: 'API Atmospheric Tank', desc: 'Large cylindrical atmospheric storage tank', industries: ['oil_gas', 'chemical'], family: 'STATIC_CONTAINMENT_FAMILY' },
  { cat: 'FLARE', class: 'Flare Stack', code: 'FLARE_STK', name: 'Flare Stack', desc: 'Elevated flare for hydrocarbon disposal', industries: ['oil_gas', 'chemical'], family: 'STRUCTURE_FAMILY' },
  { cat: 'FLARE', class: 'Enclosed Flare', code: 'ENC_FLARE', name: 'Enclosed Flare', desc: 'Ground enclosed combustion flare', industries: ['oil_gas', 'chemical'], family: 'STRUCTURE_FAMILY' },
  { cat: 'HEAT_OG', class: 'Shell and Tube Exchanger', code: 'SHELL_TUBE_OG', name: 'Shell and Tube Exchanger', desc: 'Shell and tube heat exchanger', industries: ['oil_gas', 'power_gen', 'chemical'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'HEAT_OG', class: 'Plate Exchanger', code: 'PLATE_EX_OG', name: 'Plate Exchanger', desc: 'Gasketed or welded plate heat exchanger', industries: ['oil_gas', 'power_gen', 'chemical'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'HEAT_OG', class: 'Air Cooler', code: 'AIR_COOLER', name: 'Air Cooler', desc: 'Fin-fan air cooled heat exchanger', industries: ['oil_gas', 'power_gen', 'chemical'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'TREAT', class: 'Dehydrator', code: 'DEHYDRATOR', name: 'TEG Dehydrator', desc: 'Triethylene glycol gas dehydration unit', industries: ['oil_gas', 'chemical'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'TREAT', class: 'Molecular Sieve', code: 'MOL_SIEVE', name: 'Molecular Sieve', desc: 'Adsorption dehydration unit', industries: ['oil_gas', 'chemical'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'METER', class: 'Orifice Meter', code: 'ORIF_METER', name: 'Orifice Meter', desc: 'Differential pressure orifice flow meter', industries: ['oil_gas', 'power_gen', 'chemical'], family: 'INSTRUMENT_FAMILY' },
  { cat: 'METER', class: 'Ultrasonic Meter', code: 'ULTRA_METER', name: 'Ultrasonic Meter', desc: 'Ultrasonic flow meter', industries: ['oil_gas', 'water_ww', 'chemical'], family: 'INSTRUMENT_FAMILY' },
  { cat: 'METER', class: 'Coriolis Meter', code: 'CORIOLIS', name: 'Coriolis Meter', desc: 'Coriolis mass flow meter', industries: ['oil_gas', 'chemical'], family: 'INSTRUMENT_FAMILY' },
  { cat: 'METER', class: 'Multiphase Meter', code: 'MULTIPHASE', name: 'Multiphase Meter', desc: 'Oil-gas-water multiphase flow meter', industries: ['oil_gas'], family: 'INSTRUMENT_FAMILY' },
  { cat: 'TREAT', class: 'Slug Catcher', code: 'SLUG_CATCH', name: 'Slug Catcher', desc: 'Pipeline slug catching vessel', industries: ['oil_gas'], family: 'STATIC_CONTAINMENT_FAMILY' },
  { cat: 'BOP', class: 'Blowout Preventer', code: 'BOP', name: 'Blowout Preventer', desc: 'Subsurface or surface BOP stack', industries: ['oil_gas'], family: 'SAFETY_EQUIPMENT_FAMILY' },
  { cat: 'PUMP', class: 'Triplex Pump', code: 'TRIPLEX_PUMP', name: 'Triplex Mud Pump', desc: 'High pressure triplex drilling pump', industries: ['oil_gas', 'mining'], family: 'PUMP_FAMILY' },
  { cat: 'RIG', class: 'Drawworks', code: 'DRAWWORKS', name: 'Drawworks', desc: 'Drilling rig hoisting winch', industries: ['oil_gas'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'RIG', class: 'Top Drive', code: 'TOP_DRIVE', name: 'Top Drive', desc: 'Rotary drilling top drive system', industries: ['oil_gas'], family: 'ELECTRICAL_FAMILY' },
  { cat: 'TREAT', class: 'Shale Shaker', code: 'SHALE_SHAKE', name: 'Shale Shaker', desc: 'Solids control shale shaker', industries: ['oil_gas', 'mining'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'TREAT', class: 'Desander', code: 'DESANDER', name: 'Desander', desc: 'Hydrocyclone desander', industries: ['oil_gas', 'mining'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'TREAT', class: 'Desilter', code: 'DESILTER', name: 'Desilter', desc: 'Hydrocyclone desilter', industries: ['oil_gas', 'mining'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'SUBSEA', class: 'Subsea Tree', code: 'SUBSEA_TREE', name: 'Subsea Tree', desc: 'Subsea production tree', industries: ['oil_gas'], family: 'VALVE_FAMILY' },
  { cat: 'SUBSEA', class: 'Subsea Manifold', code: 'SUB_MANIFOLD', name: 'Subsea Manifold', desc: 'Subsea distribution manifold', industries: ['oil_gas'], family: 'VALVE_FAMILY' },

  // ===== POWER GENERATION =====
  { cat: 'TURB', class: 'Gas Turbine', code: 'GAS_TURB', name: 'Gas Turbine', desc: 'Heavy duty or aero-derivative gas turbine', industries: ['power_gen', 'oil_gas'], family: 'AIR_SYSTEM_FAMILY' },
  { cat: 'TURB', class: 'Steam Turbine', code: 'STEAM_TURB', name: 'Steam Turbine', desc: 'Condensing or back-pressure steam turbine', industries: ['power_gen'], family: 'AIR_SYSTEM_FAMILY' },
  { cat: 'TURB', class: 'Aero Gas Turbine', code: 'AERO_TURB', name: 'Aero-Derivative Gas Turbine', desc: 'Aero-derivative lightweight gas turbine', industries: ['power_gen', 'oil_gas'], family: 'AIR_SYSTEM_FAMILY' },
  { cat: 'HRSG', class: 'HRSG', code: 'HRSG', name: 'HRSG', desc: 'Heat recovery steam generator', industries: ['power_gen'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'HRSG', class: 'Triple Pressure HRSG', code: 'TRIP_HRSG', name: 'Triple Pressure HRSG', desc: 'Triple pressure level HRSG', industries: ['power_gen'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'BOIL', class: 'Drum Boiler', code: 'DRUM_BOIL', name: 'Drum Boiler', desc: 'Natural or forced circulation drum boiler', industries: ['power_gen'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'BOIL', class: 'Once-Through Boiler', code: 'OT_BOIL', name: 'Once-Through Boiler', desc: 'Supercritical once-through boiler', industries: ['power_gen'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'MILL', class: 'Coal Pulverizer', code: 'COAL_PULV', name: 'Coal Pulverizer', desc: 'Bowl mill or ball tube coal pulverizer', industries: ['power_gen'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'COOL', class: 'Condenser', code: 'CONDENSER', name: 'Condenser', desc: 'Surface steam condenser', industries: ['power_gen'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'COOL', class: 'Air-Cooled Condenser', code: 'ACC', name: 'Air-Cooled Condenser', desc: 'Air cooled steam condenser', industries: ['power_gen'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'COOL', class: 'Cooling Tower', code: 'COOL_TWR', name: 'Mechanical Draft Cooling Tower', desc: 'Induced or forced draft cooling tower', industries: ['power_gen', 'chemical', 'general'], family: 'STRUCTURE_FAMILY' },
  { cat: 'COOL', class: 'Natural Draft Tower', code: 'NAT_COOL_TWR', name: 'Natural Draft Cooling Tower', desc: 'Hyperbolic natural draft cooling tower', industries: ['power_gen'], family: 'STRUCTURE_FAMILY' },
  { cat: 'PUMP', class: 'Boiler Feed Pump', code: 'BFP', name: 'Boiler Feed Pump', desc: 'High pressure boiler feedwater pump', industries: ['power_gen'], family: 'PUMP_FAMILY' },
  { cat: 'PUMP', class: 'Condensate Pump', code: 'COND_PUMP', name: 'Condensate Pump', desc: 'Condensate extraction pump', industries: ['power_gen'], family: 'PUMP_FAMILY' },
  { cat: 'PUMP', class: 'Circulating Water Pump', code: 'CW_PUMP', name: 'Circulating Water Pump', desc: 'Cooling water circulation pump', industries: ['power_gen', 'water_ww'], family: 'PUMP_FAMILY' },
  { cat: 'GEN', class: 'Generator', code: 'GEN_TG', name: 'Turbo Generator', desc: 'Steam or gas turbine driven generator', industries: ['power_gen'], family: 'ELECTRICAL_FAMILY' },
  { cat: 'GEN', class: 'Hydrogen-Cooled Generator', code: 'H2_GEN', name: 'Hydrogen-Cooled Generator', desc: 'Hydrogen cooled turbo generator', industries: ['power_gen'], family: 'ELECTRICAL_FAMILY' },
  { cat: 'TRAN', class: 'Step-Up Transformer', code: 'STEP_UP_XFMR', name: 'Step-Up Transformer', desc: 'Generator step-up transformer', industries: ['power_gen', 'oil_gas'], family: 'ELECTRICAL_FAMILY' },
  { cat: 'TRAN', class: 'Unit Transformer', code: 'UNIT_XFMR', name: 'Unit Transformer', desc: 'Unit auxiliary transformer', industries: ['power_gen'], family: 'ELECTRICAL_FAMILY' },
  { cat: 'SWGR', class: 'GIS Switchgear', code: 'GIS_SWGR', name: 'GIS Switchgear', desc: 'Gas insulated switchgear', industries: ['power_gen', 'oil_gas'], family: 'ELECTRICAL_FAMILY' },
  { cat: 'SWGR', class: 'Air-Insulated Switchgear', code: 'AIS_SWGR', name: 'Air-Insulated Switchgear', desc: 'Air insulated open switchyard', industries: ['power_gen'], family: 'ELECTRICAL_FAMILY' },
  { cat: 'POLL', class: 'Selective Catalytic Reduction', code: 'SCR', name: 'SCR', desc: 'NOx selective catalytic reduction system', industries: ['power_gen', 'chemical'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'POLL', class: 'Electrostatic Precipitator', code: 'ESP', name: 'ESP', desc: 'Electrostatic particulate precipitator', industries: ['power_gen'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'POLL', class: 'Baghouse Filter', code: 'BAGHOUSE', name: 'Baghouse Filter', desc: 'Pulse jet fabric filter', industries: ['power_gen', 'general', 'mining'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'POLL', class: 'Wet Scrubber', code: 'WET_SCRUB', name: 'Wet Scrubber', desc: 'SO2 wet flue gas desulfurization scrubber', industries: ['power_gen', 'chemical'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'POLL', class: 'Dry Scrubber', code: 'DRY_SCRUB', name: 'Dry Scrubber', desc: 'Dry sorbent injection scrubber', industries: ['power_gen'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'STACK', class: 'Chimney', code: 'CHIMNEY', name: 'Chimney/Stack', desc: 'Reinforced concrete or steel stack', industries: ['power_gen', 'oil_gas', 'chemical'], family: 'STRUCTURE_FAMILY' },
  { cat: 'ASH', class: 'Bottom Ash Conveyor', code: 'BOT_ASH_CONV', name: 'Bottom Ash Conveyor', desc: 'Submerged or dry bottom ash conveyor', industries: ['power_gen'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'ASH', class: 'Fly Ash Silo', code: 'FLY_ASH_SILO', name: 'Fly Ash Silo', desc: 'Pneumatic fly ash storage silo', industries: ['power_gen'], family: 'STATIC_CONTAINMENT_FAMILY' },
  { cat: 'ASH', class: 'Stacker', code: 'STACKER', name: 'Stacker', desc: 'Coal or ash radial stacker', industries: ['power_gen', 'mining'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'ASH', class: 'Reclaimer', code: 'RECLAIMER', name: 'Reclaimer', desc: 'Coal or ash bridge or bucket wheel reclaimer', industries: ['power_gen', 'mining'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'PUMP', class: 'Limestone Slurry Pump', code: 'LIME_SLUR_PUMP', name: 'Limestone Slurry Pump', desc: 'FGD limestone slurry recirculation pump', industries: ['power_gen'], family: 'PUMP_FAMILY' },
  { cat: 'TREAT', class: 'FGD Absorber', code: 'FGD_ABSORB', name: 'FGD Absorber', desc: 'Flue gas desulfurization absorber tower', industries: ['power_gen'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'TREAT', class: 'Deaerator', code: 'DEAERATOR', name: 'Deaerator', desc: 'Steam deaerating feedwater heater', industries: ['power_gen'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'HEAT_OG', class: 'LP Heater', code: 'LP_HEATER', name: 'LP Feedwater Heater', desc: 'Low pressure regenerative feedwater heater', industries: ['power_gen'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'HEAT_OG', class: 'HP Heater', code: 'HP_HEATER', name: 'HP Feedwater Heater', desc: 'High pressure regenerative feedwater heater', industries: ['power_gen'], family: 'TREATMENT_UNIT_FAMILY' },

  // ===== CHEMICAL PROCESSING =====
  { cat: 'REACT', class: 'Batch Reactor', code: 'BATCH_REACT', name: 'Batch Reactor', desc: 'Jacketed batch chemical reactor', industries: ['chemical'], family: 'STATIC_CONTAINMENT_FAMILY' },
  { cat: 'REACT', class: 'CSTR', code: 'CSTR', name: 'CSTR', desc: 'Continuous stirred tank reactor', industries: ['chemical'], family: 'STATIC_CONTAINMENT_FAMILY' },
  { cat: 'REACT', class: 'Plug Flow Reactor', code: 'PFR', name: 'Plug Flow Reactor', desc: 'Tubular plug flow reactor', industries: ['chemical'], family: 'STATIC_CONTAINMENT_FAMILY' },
  { cat: 'REACT', class: 'Fixed Bed Reactor', code: 'FIX_BED_REACT', name: 'Fixed Bed Reactor', desc: 'Catalytic fixed bed reactor', industries: ['chemical', 'oil_gas'], family: 'STATIC_CONTAINMENT_FAMILY' },
  { cat: 'REACT', class: 'Fluidized Bed Reactor', code: 'FLUID_BED_REACT', name: 'Fluidized Bed Reactor', desc: 'Fluidized bed chemical reactor', industries: ['chemical', 'power_gen'], family: 'STATIC_CONTAINMENT_FAMILY' },
  { cat: 'DIST', class: 'Distillation Column', code: 'DIST_COL', name: 'Distillation Column', desc: 'Tray or packed distillation column', industries: ['chemical', 'oil_gas'], family: 'STATIC_CONTAINMENT_FAMILY' },
  { cat: 'DIST', class: 'Packed Column', code: 'PACKED_COL', name: 'Packed Column', desc: 'Random or structured packed column', industries: ['chemical', 'oil_gas'], family: 'STATIC_CONTAINMENT_FAMILY' },
  { cat: 'DIST', class: 'Tray Column', code: 'TRAY_COL', name: 'Tray Column', desc: 'Sieve or valve tray distillation column', industries: ['chemical', 'oil_gas'], family: 'STATIC_CONTAINMENT_FAMILY' },
  { cat: 'DIST', class: 'Reactive Distillation', code: 'REACT_DIST', name: 'Reactive Distillation Column', desc: 'Combined reaction and distillation column', industries: ['chemical'], family: 'STATIC_CONTAINMENT_FAMILY' },
  { cat: 'HEAT_OG', class: 'Double Pipe Exchanger', code: 'DP_EX', name: 'Double Pipe Heat Exchanger', desc: 'Hairpin double pipe exchanger', industries: ['chemical', 'oil_gas'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'HEAT_OG', class: 'Spiral Exchanger', code: 'SPIRAL_EX', name: 'Spiral Heat Exchanger', desc: 'Spiral plate heat exchanger', industries: ['chemical', 'oil_gas'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'MIX', class: 'Agitated Vessel', code: 'AGIT_VESSEL', name: 'Agitated Vessel', desc: 'Jacketed agitated mixing vessel', industries: ['chemical', 'oil_gas'], family: 'MIXER_FAMILY' },
  { cat: 'MIX', class: 'Jet Mixer', code: 'JET_MIXER', name: 'Jet Mixer', desc: 'Liquid jet eductor mixer', industries: ['chemical', 'water_ww'], family: 'MIXER_FAMILY' },
  { cat: 'MIX', class: 'Static Mixer', code: 'STATIC_MIXER', name: 'Static Mixer', desc: 'In-line static mixing element', industries: ['chemical', 'oil_gas', 'water_ww'], family: 'MIXER_FAMILY' },
  { cat: 'DRY', class: 'Rotary Dryer', code: 'ROT_DRY', name: 'Rotary Dryer', desc: 'Direct or indirect rotary drum dryer', industries: ['chemical', 'mining', 'general'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'DRY', class: 'Spray Dryer', code: 'SPRAY_DRY', name: 'Spray Dryer', desc: 'Atomizing spray drying tower', industries: ['chemical', 'general'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'DRY', class: 'Fluid Bed Dryer', code: 'FB_DRY', name: 'Fluid Bed Dryer', desc: 'Vibrating fluid bed dryer', industries: ['chemical', 'general'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'DRY', class: 'Freeze Dryer', code: 'FREEZE_DRY', name: 'Freeze Dryer', desc: 'Lyophilization freeze dryer', industries: ['chemical', 'general'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'SEP_CH', class: 'Decanter Centrifuge', code: 'DECANT_CENT', name: 'Decanter Centrifuge', desc: 'Horizontal solid bowl decanter', industries: ['chemical', 'oil_gas', 'mining'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'SEP_CH', class: 'Basket Centrifuge', code: 'BASKET_CENT', name: 'Basket Centrifuge', desc: 'Vertical peeler or pusher basket centrifuge', industries: ['chemical'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'SEP_CH', class: 'Disc Stack Centrifuge', code: 'DISC_CENT', name: 'Disc Stack Centrifuge', desc: 'High speed disc bowl separator', industries: ['chemical', 'oil_gas'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'SEP_CH', class: 'Pressure Filter', code: 'PRESS_FILT', name: 'Pressure Filter', desc: 'Plate and frame or vertical pressure filter', industries: ['chemical', 'mining'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'SEP_CH', class: 'Rotary Vacuum Filter', code: 'RVF', name: 'Rotary Vacuum Filter', desc: 'Rotary drum vacuum filter', industries: ['chemical', 'mining'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'SEP_CH', class: 'Belt Filter', code: 'BELT_FILT', name: 'Belt Filter', desc: 'Horizontal vacuum belt filter', industries: ['chemical', 'mining'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'SEP_CH', class: 'Leaf Filter', code: 'LEAF_FILT', name: 'Leaf Filter', desc: 'Pressure leaf or Niagara filter', industries: ['chemical'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'TANK_OG', class: 'Storage Silo', code: 'STOR_SILO', name: 'Storage Silo', desc: 'Chemical storage silo or hopper', industries: ['chemical', 'general'], family: 'STATIC_CONTAINMENT_FAMILY' },
  { cat: 'TANK_OG', class: 'Day Bin', code: 'DAY_BIN', name: 'Day Bin', desc: 'Intermediate process day bin', industries: ['chemical', 'general'], family: 'STATIC_CONTAINMENT_FAMILY' },
  { cat: 'PUMP', class: 'Chemical Transfer Pump', code: 'CHEM_TRANS_PUMP', name: 'Chemical Transfer Pump', desc: 'ANSI or ISO chemical process pump', industries: ['chemical', 'oil_gas', 'water_ww'], family: 'PUMP_FAMILY' },
  { cat: 'PUMP', class: 'Metering Pump', code: 'METER_PUMP', name: 'Metering Pump', desc: 'Positive displacement dosing pump', industries: ['chemical', 'water_ww', 'oil_gas'], family: 'PUMP_FAMILY' },
  { cat: 'PUMP', class: 'Mag Drive Pump', code: 'MAG_DRIVE_PUMP', name: 'Magnetic Drive Pump', desc: 'Sealless magnetic drive centrifugal pump', industries: ['chemical', 'oil_gas'], family: 'PUMP_FAMILY' },
  { cat: 'COMP', class: 'Diaphragm Compressor', code: 'DIAPH_COMP', name: 'Diaphragm Compressor', desc: 'High purity diaphragm gas compressor', industries: ['chemical', 'oil_gas'], family: 'AIR_SYSTEM_FAMILY' },
  { cat: 'COMP', class: 'Liquid Ring Compressor', code: 'LIQ_RING_COMP', name: 'Liquid Ring Compressor', desc: 'Liquid ring vacuum compressor', industries: ['chemical', 'general'], family: 'AIR_SYSTEM_FAMILY' },
  { cat: 'BLOW', class: 'Process Blower', code: 'PROC_BLOW', name: 'Process Blower', desc: 'Roots or centrifugal process blower', industries: ['chemical', 'water_ww', 'general'], family: 'AIR_SYSTEM_FAMILY' },
  { cat: 'TREAT', class: 'Crystallizer', code: 'CRYSTAL', name: 'Crystallizer', desc: 'Forced circulation or draft tube crystallizer', industries: ['chemical'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'TREAT', class: 'Evaporator', code: 'EVAPORATOR', name: 'Evaporator', desc: 'Single or multiple effect evaporator', industries: ['chemical'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'TREAT', class: 'Falling Film Evaporator', code: 'FF_EVAP', name: 'Falling Film Evaporator', desc: 'Falling film tubular evaporator', industries: ['chemical'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'TREAT', class: 'Forced Circulation Evaporator', code: 'FC_EVAP', name: 'Forced Circulation Evaporator', desc: 'Forced circulation evaporator with crystallizer', industries: ['chemical'], family: 'TREATMENT_UNIT_FAMILY' },

  // ===== GENERAL MANUFACTURING =====
  { cat: 'CNC', class: 'CNC Mill', code: 'CNC_MILL', name: 'CNC Milling Machine', desc: '3 to 5 axis CNC machining center', industries: ['general', 'mining', 'oil_gas'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'CNC', class: 'CNC Lathe', code: 'CNC_LATHE', name: 'CNC Lathe', desc: 'Turning center with live tooling', industries: ['general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'CNC', class: 'Grinding Machine', code: 'GRIND_MACH', name: 'Grinding Machine', desc: 'Surface or cylindrical CNC grinder', industries: ['general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'CNC', class: 'EDM Machine', code: 'EDM_MACH', name: 'EDM Machine', desc: 'Wire or sinker electrical discharge machine', industries: ['general'], family: 'ELECTRICAL_FAMILY' },
  { cat: 'PRESS', class: 'Hydraulic Press', code: 'HYD_PRESS', name: 'Hydraulic Press', desc: 'Hydraulic forming or stamping press', industries: ['general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'PRESS', class: 'Mechanical Press', code: 'MECH_PRESS', name: 'Mechanical Press', desc: 'Mechanical flywheel stamping press', industries: ['general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'PRESS', class: 'Servo Press', code: 'SERVO_PRESS', name: 'Servo Press', desc: 'Servo motor driven stamping press', industries: ['general'], family: 'ELECTRICAL_FAMILY' },
  { cat: 'PRESS', class: 'Blanking Press', code: 'BLANK_PRESS', name: 'Blanking Press', desc: 'High speed blanking and piercing press', industries: ['general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'INJECT', class: 'Injection Molding Machine', code: 'INJECT_MACH', name: 'Injection Molding Machine', desc: 'Plastic injection molding press', industries: ['general', 'chemical'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'INJECT', class: 'Blow Molding Machine', code: 'BLOW_MACH', name: 'Blow Molding Machine', desc: 'Extrusion or injection blow molder', industries: ['general', 'chemical'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'INJECT', class: 'Extrusion Machine', code: 'EXTR_MACH', name: 'Extrusion Machine', desc: 'Single or twin screw extruder', industries: ['general', 'chemical'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'INJECT', class: 'Thermoforming Machine', code: 'THERMO_MACH', name: 'Thermoforming Machine', desc: 'Vacuum or pressure thermoformer', industries: ['general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'ROBOT', class: 'Articulated Robot', code: 'ART_ROBOT', name: 'Articulated Robot', desc: '6-axis articulated industrial robot', industries: ['general', 'chemical'], family: 'ELECTRICAL_FAMILY' },
  { cat: 'ROBOT', class: 'SCARA Robot', code: 'SCARA_ROBOT', name: 'SCARA Robot', desc: 'Selective compliance assembly robot arm', industries: ['general'], family: 'ELECTRICAL_FAMILY' },
  { cat: 'ROBOT', class: 'Cartesian Robot', code: 'CART_ROBOT', name: 'Cartesian Robot', desc: 'Gantry style cartesian robot', industries: ['general'], family: 'ELECTRICAL_FAMILY' },
  { cat: 'ROBOT', class: 'Collaborative Robot', code: 'COBOT', name: 'Collaborative Robot', desc: 'Force-limited collaborative robot', industries: ['general'], family: 'ELECTRICAL_FAMILY' },
  { cat: 'CONV', class: 'Roller Conveyor', code: 'ROLL_CONV', name: 'Roller Conveyor', desc: 'Gravity or powered roller conveyor', industries: ['general', 'mining'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'CONV', class: 'Chain Conveyor', code: 'CHAIN_CONV', name: 'Chain Conveyor', desc: 'Drag or overhead chain conveyor', industries: ['general', 'mining'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'CONV', class: 'Overhead Conveyor', code: 'OH_CONV', name: 'Overhead Conveyor', desc: 'I-beam or power and free conveyor', industries: ['general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'MAT_HAND', class: 'Forklift', code: 'FORKLIFT', name: 'Forklift', desc: 'Counterbalance forklift truck', industries: ['general', 'mining', 'chemical'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'MAT_HAND', class: 'Reach Truck', code: 'REACH_TRK', name: 'Reach Truck', desc: 'Narrow aisle reach forklift', industries: ['general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'MAT_HAND', class: 'Order Picker', code: 'ORDER_PICK', name: 'Order Picker', desc: 'Man-up order picking truck', industries: ['general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'MAT_HAND', class: 'Pallet Jack', code: 'PALLET_JACK', name: 'Pallet Jack', desc: 'Manual or electric pallet truck', industries: ['general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'COMP_GEN', class: 'Rotary Screw Compressor', code: 'ROT_SCREW_COMP', name: 'Rotary Screw Compressor', desc: 'Oil-flooded or oil-free rotary screw compressor', industries: ['general', 'chemical', 'oil_gas'], family: 'AIR_SYSTEM_FAMILY' },
  { cat: 'COMP_GEN', class: 'Reciprocating Air Compressor', code: 'RECIP_AIR_COMP', name: 'Reciprocating Air Compressor', desc: 'Piston type air compressor', industries: ['general'], family: 'AIR_SYSTEM_FAMILY' },
  { cat: 'COMP_GEN', class: 'Centrifugal Air Compressor', code: 'CENT_AIR_COMP', name: 'Centrifugal Air Compressor', desc: 'Dynamic centrifugal air compressor', industries: ['general', 'chemical'], family: 'AIR_SYSTEM_FAMILY' },
  { cat: 'HVAC', class: 'Rooftop Unit', code: 'RTU', name: 'Rooftop HVAC Unit', desc: 'Packaged rooftop air conditioner', industries: ['general', 'chemical'], family: 'AIR_SYSTEM_FAMILY' },
  { cat: 'HVAC', class: 'Chiller', code: 'CHILLER', name: 'Chiller', desc: 'Vapor compression or absorption chiller', industries: ['general', 'chemical', 'power_gen'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'HVAC', class: 'Air Handling Unit', code: 'AHU', name: 'Air Handling Unit', desc: 'Central station air handler', industries: ['general', 'chemical'], family: 'AIR_SYSTEM_FAMILY' },
  { cat: 'DUST_COLL', class: 'Dust Collector', code: 'DUST_COLL', name: 'Dust Collector', desc: 'Cartridge or baghouse dust collector', industries: ['general', 'mining'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'DUST_COLL', class: 'Cartridge Collector', code: 'CART_COLL', name: 'Cartridge Collector', desc: 'Pleated cartridge dust collector', industries: ['general', 'mining'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'DUST_COLL', class: 'Cyclone Separator', code: 'CYCLONE', name: 'Cyclone Separator', desc: 'Inertial cyclone dust separator', industries: ['general', 'mining', 'power_gen'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'PAINT', class: 'Spray Booth', code: 'SPRAY_BOOTH', name: 'Spray Booth', desc: 'Wet or dry filter paint spray booth', industries: ['general'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'PAINT', class: 'Powder Coating Booth', code: 'POWDER_BOOTH', name: 'Powder Coating Booth', desc: 'Electrostatic powder coating booth', industries: ['general'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'PAINT', class: 'E-Coat System', code: 'ECOAT', name: 'E-Coat System', desc: 'Electrophoretic deposition paint system', industries: ['general'], family: 'TREATMENT_UNIT_FAMILY' },
  { cat: 'WELD', class: 'MIG Welder', code: 'MIG_WELD', name: 'MIG Welder', desc: 'Gas metal arc welding machine', industries: ['general', 'mining', 'oil_gas'], family: 'ELECTRICAL_FAMILY' },
  { cat: 'WELD', class: 'TIG Welder', code: 'TIG_WELD', name: 'TIG Welder', desc: 'Gas tungsten arc welding machine', industries: ['general'], family: 'ELECTRICAL_FAMILY' },
  { cat: 'WELD', class: 'Resistance Welder', code: 'RES_WELD', name: 'Resistance Welder', desc: 'Spot or seam resistance welder', industries: ['general'], family: 'ELECTRICAL_FAMILY' },
  { cat: 'PACKAGE', class: 'Packaging Machine', code: 'PKG_MACH', name: 'Packaging Machine', desc: 'Form-fill-seal packaging machine', industries: ['general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'PACKAGE', class: 'Palletizer', code: 'PALLETIZER', name: 'Palletizer', desc: 'Robotic or conventional palletizer', industries: ['general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'PACKAGE', class: 'Case Packer', code: 'CASE_PACK', name: 'Case Packer', desc: 'Automatic case packing machine', industries: ['general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'PACKAGE', class: 'Labeling Machine', code: 'LABEL_MACH', name: 'Labeling Machine', desc: 'Pressure sensitive label applicator', industries: ['general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'PACKAGE', class: 'Shrink Wrapper', code: 'SHRINK_WRAP', name: 'Shrink Wrapper', desc: 'Shrink film bundling wrapper', industries: ['general'], family: 'MECHANICAL_HANDLING_FAMILY' },
  { cat: 'MAT_HAND', class: 'AGV', code: 'AGV', name: 'Automated Guided Vehicle', desc: 'Laser or magnetic guided autonomous vehicle', industries: ['general'], family: 'ELECTRICAL_FAMILY' },
];

// Step definitions for templates (simplified from 005_system_task_templates_v2.js)
const StepDefinitions = {
  inspection: [
    { step_no: 1, step_type: 'inspection', instruction: 'Visually inspect exterior for leaks, corrosion, or physical damage', data_type: 'dropdown', options: JSON.stringify(['Good', 'Minor Issues', 'Major Issues', 'Critical']), is_required: true, is_visual_only: true, safety_note: 'Visual inspection only - maintain safe distance from rotating parts', requires_equipment_stopped: false, prohibit_if_running: false, prohibit_opening_covers: false },
    { step_no: 2, step_type: 'inspection', instruction: 'Check for abnormal noise or vibration during operation', data_type: 'dropdown', options: JSON.stringify(['Normal', 'Slight Anomaly', 'Moderate Anomaly', 'Severe Anomaly']), is_required: true, is_visual_only: true, safety_note: 'Do not touch equipment while running', requires_equipment_stopped: false, prohibit_if_running: false, prohibit_opening_covers: false },
    { step_no: 3, step_type: 'inspection', instruction: 'Verify all safety guards, covers, and shields are in place and secure', data_type: 'boolean', is_required: true, is_visual_only: true, safety_note: 'Never operate without guards in place', requires_equipment_stopped: false, prohibit_if_running: false, prohibit_opening_covers: true },
    { step_no: 4, step_type: 'inspection', instruction: 'Check indicator lights, gauges, and display panels for normal readings', data_type: 'text', is_required: true, is_visual_only: true, safety_note: 'Record any abnormal readings for trending', requires_equipment_stopped: false, prohibit_if_running: false, prohibit_opening_covers: false },
  ],
  measurement: [
    { step_no: 1, step_type: 'measurement', instruction: 'Record operating temperature', data_type: 'number', is_required: true, is_visual_only: false, safety_note: 'Use proper PPE when accessing measurement points', requires_equipment_stopped: false, prohibit_if_running: false, prohibit_opening_covers: false },
    { step_no: 2, step_type: 'measurement', instruction: 'Record operating pressure', data_type: 'number', is_required: true, is_visual_only: false, safety_note: 'Ensure pressure gauges are functional', requires_equipment_stopped: false, prohibit_if_running: false, prohibit_opening_covers: false },
    { step_no: 3, step_type: 'measurement', instruction: 'Measure vibration level', data_type: 'number', is_required: false, is_visual_only: false, safety_note: 'Use calibrated vibration meter', requires_equipment_stopped: false, prohibit_if_running: false, prohibit_opening_covers: false },
  ],
  lubrication: [
    { step_no: 1, step_type: 'lubrication', instruction: 'Check oil level and condition', data_type: 'dropdown', options: JSON.stringify(['Full/Clean', 'Full/Dark', 'Low', 'Contaminated']), is_required: true, is_visual_only: false, safety_note: 'Ensure equipment is locked out before opening fill ports', requires_equipment_stopped: true, prohibit_if_running: true, prohibit_opening_covers: false },
    { step_no: 2, step_type: 'lubrication', instruction: 'Top up or replace lubricant as required', data_type: 'boolean', is_required: false, is_visual_only: false, safety_note: 'Use correct lubricant grade', requires_equipment_stopped: true, prohibit_if_running: true, prohibit_opening_covers: false },
  ],
  safety_check: [
    { step_no: 1, step_type: 'safety_check', instruction: 'Verify emergency stop functions correctly', data_type: 'boolean', is_required: true, is_visual_only: false, safety_note: 'Coordinate with control room before E-stop test', requires_equipment_stopped: false, prohibit_if_running: false, prohibit_opening_covers: false },
    { step_no: 2, step_type: 'safety_check', instruction: 'Check fire suppression and safety systems', data_type: 'boolean', is_required: true, is_visual_only: true, safety_note: 'Do not discharge suppression systems', requires_equipment_stopped: false, prohibit_if_running: false, prohibit_opening_covers: false },
  ],
  testing: [
    { step_no: 1, step_type: 'testing', instruction: 'Perform functional test of protective devices', data_type: 'boolean', is_required: true, is_visual_only: false, safety_note: 'Follow test procedures strictly', requires_equipment_stopped: false, prohibit_if_running: false, prohibit_opening_covers: false },
    { step_no: 2, step_type: 'testing', instruction: 'Record test results and any anomalies', data_type: 'text', is_required: true, is_visual_only: false, safety_note: 'Document deviations immediately', requires_equipment_stopped: false, prohibit_if_running: false, prohibit_opening_covers: false },
  ],
  cleaning: [
    { step_no: 1, step_type: 'cleaning', instruction: 'Remove accumulated debris and contamination', data_type: 'boolean', is_required: true, is_visual_only: false, safety_note: 'Use appropriate cleaning agents', requires_equipment_stopped: false, prohibit_if_running: false, prohibit_opening_covers: false },
    { step_no: 2, step_type: 'cleaning', instruction: 'Clean filters, screens, or strainers', data_type: 'boolean', is_required: true, is_visual_only: false, safety_note: 'Wear PPE during cleaning', requires_equipment_stopped: false, prohibit_if_running: false, prohibit_opening_covers: false },
  ],
  adjustment: [
    { step_no: 1, step_type: 'adjustment', instruction: 'Check alignment and clearances', data_type: 'boolean', is_required: true, is_visual_only: false, safety_note: 'Use proper measuring tools', requires_equipment_stopped: true, prohibit_if_running: true, prohibit_opening_covers: false },
    { step_no: 2, step_type: 'adjustment', instruction: 'Adjust settings to specification', data_type: 'text', is_required: false, is_visual_only: false, safety_note: 'Record before and after values', requires_equipment_stopped: true, prohibit_if_running: true, prohibit_opening_covers: false },
  ],
  calibration: [
    { step_no: 1, step_type: 'calibration', instruction: 'Verify calibration against known standard', data_type: 'boolean', is_required: true, is_visual_only: false, safety_note: 'Use certified calibration equipment', requires_equipment_stopped: false, prohibit_if_running: false, prohibit_opening_covers: false },
    { step_no: 2, step_type: 'calibration', instruction: 'Record calibration drift if any', data_type: 'text', is_required: true, is_visual_only: false, safety_note: 'Adjust or replace if out of tolerance', requires_equipment_stopped: false, prohibit_if_running: false, prohibit_opening_covers: false },
  ],
  tightening: [
    { step_no: 1, step_type: 'tightening', instruction: 'Inspect fasteners for looseness or corrosion', data_type: 'boolean', is_required: true, is_visual_only: false, safety_note: 'Use torque wrench for critical fasteners', requires_equipment_stopped: false, prohibit_if_running: false, prohibit_opening_covers: false },
    { step_no: 2, step_type: 'tightening', instruction: 'Torque fasteners to specification', data_type: 'boolean', is_required: false, is_visual_only: false, safety_note: 'Follow tightening sequence', requires_equipment_stopped: false, prohibit_if_running: false, prohibit_opening_covers: false },
  ],
};

// ============================================================
// SEED FUNCTION
// ============================================================

async function seed() {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 1. Create seed batch record
    await connection.execute(
      `INSERT INTO seed_batches (batch_id, batch_name, batch_version, entity_type, entity_count) 
       VALUES (?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE batch_name = VALUES(batch_name), batch_version = VALUES(batch_version)`,
      [SEED_BATCH_ID, 'Comprehensive Industry Equipment', '1.0.0', 'equipment_type']
    );
    
    // 2. Get existing data lookups
    const [existingCategories] = await connection.execute('SELECT id, category_code FROM equipment_categories');
    const categoryMap = Object.fromEntries(existingCategories.map(c => [c.category_code, c.id]));
    
    const [existingClasses] = await connection.execute('SELECT id, class_name, category_id FROM equipment_classes');
    const classMap = {};
    existingClasses.forEach(c => {
      classMap[`${c.category_id}:${c.class_name}`] = c.id;
    });
    
    const [industries] = await connection.execute('SELECT id, code FROM industries WHERE is_active = TRUE');
    const industryMap = Object.fromEntries(industries.map(i => [i.code, i.id]));
    
    const [familyRules] = await connection.execute('SELECT family_code, task_kind, frequency_value, frequency_unit, estimated_duration_minutes FROM template_family_rules WHERE is_active = TRUE');
    const rulesByFamily = {};
    familyRules.forEach(r => {
      if (!rulesByFamily[r.family_code]) rulesByFamily[r.family_code] = [];
      rulesByFamily[r.family_code].push(r);
    });
    
    // 3. Insert categories
    for (const cat of newCategories) {
      if (categoryMap[cat.code]) continue;
      const [result] = await connection.execute(
        'INSERT INTO equipment_categories (category_code, category_name, description) VALUES (?, ?, ?)',
        [cat.code, cat.name, cat.description]
      );
      categoryMap[cat.code] = result.insertId;
    }
    
    // 4. Insert classes
    const classNamesNeeded = {};
    newEquipmentTypes.forEach(et => {
      const catId = categoryMap[et.cat];
      const key = `${catId}:${et.class}`;
      if (!classMap[key]) {
        classNamesNeeded[key] = { catCode: et.cat, className: et.class };
      }
    });
    
    for (const { catCode, className } of Object.values(classNamesNeeded)) {
      const catId = categoryMap[catCode];
      const classCode = className.toUpperCase().replace(/\s+/g, '_').substring(0, 20);
      const [result] = await connection.execute(
        'INSERT INTO equipment_classes (category_id, class_code, class_name, description) VALUES (?, ?, ?, ?)',
        [catId, classCode, className, className]
      );
      classMap[`${catId}:${className}`] = result.insertId;
    }
    
    // 5. Insert equipment types
    let equipmentTypesInserted = 0;
    let familyMappingsInserted = 0;
    let industryMappingsInserted = 0;
    let templatesCreated = 0;
    let stepsCreated = 0;
    
    for (const et of newEquipmentTypes) {
      const catId = categoryMap[et.cat];
      const classId = classMap[`${catId}:${et.class}`];
      
      // Check if already exists
      const [existing] = await connection.execute(
        'SELECT id FROM equipment_types WHERE type_code = ? AND class_id = ?',
        [et.code, classId]
      );
      
      let equipmentTypeId;
      if (existing.length > 0) {
        equipmentTypeId = existing[0].id;
      } else {
        const [result] = await connection.execute(
          'INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES (?, ?, ?, ?, ?)',
          [classId, et.code, et.name, et.desc, '']
        );
        equipmentTypeId = result.insertId;
        equipmentTypesInserted++;
      }
      
      // Family mapping
      try {
        await connection.execute(
          'INSERT INTO equipment_type_family_mappings (equipment_type_id, family_code, mapping_source) VALUES (?, ?, ?)',
          [equipmentTypeId, et.family, 'seed']
        );
        familyMappingsInserted++;
      } catch (e) {
        if (e.code !== 'ER_DUP_ENTRY') throw e;
      }
      
      // Industry mappings
      for (const indCode of et.industries) {
        const industryId = industryMap[indCode];
        if (!industryId) continue;
        try {
          await connection.execute(
            'INSERT INTO equipment_type_industries (equipment_type_id, industry_id) VALUES (?, ?)',
            [equipmentTypeId, industryId]
          );
          industryMappingsInserted++;
        } catch (e) {
          if (e.code !== 'ER_DUP_ENTRY') throw e;
        }
      }
      
      // Create system templates from family rules
      const rules = rulesByFamily[et.family] || [];
      for (const rule of rules) {
        const templateCode = `SYS-${et.code}-${rule.task_kind.toUpperCase()}`;
        
        // Determine primary industry for template (first in list or general)
        let primaryIndustryId = industryMap[et.industries[0]];
        if (!primaryIndustryId && et.industries.includes('general')) {
          primaryIndustryId = industryMap['general'];
        }
        
        const [tmplResult] = await connection.execute(
          `INSERT INTO task_templates (
            template_code, template_name, description, equipment_type_id, industry_id,
            maintenance_type, task_kind, task_scope, frequency_value, frequency_unit,
            estimated_duration_minutes, is_system, is_editable, is_active, version,
            seed_batch_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, FALSE, TRUE, 1, ?, NOW())`,
          [
            templateCode,
            `${et.name} - ${rule.task_kind.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
            `System ${rule.task_kind} template for ${et.name}`,
            equipmentTypeId,
            primaryIndustryId,
            rule.task_kind,
            rule.task_kind,
            'system',
            rule.frequency_value,
            rule.frequency_unit,
            rule.estimated_duration_minutes,
            SEED_BATCH_ID
          ]
        );
        
        const templateId = tmplResult.insertId;
        templatesCreated++;
        
        // Link to seed batch
        await connection.execute(
          'INSERT INTO seed_batch_entities (batch_id, entity_type, entity_id) VALUES (?, ?, ?)',
          [SEED_BATCH_ID, 'task_template', templateId]
        );
        
        // Create steps
        const steps = StepDefinitions[rule.task_kind] || StepDefinitions.inspection;
        for (const step of steps) {
          await connection.execute(
            `INSERT INTO task_template_steps (
              task_template_id, step_no, step_type, instruction, data_type, options,
              is_required, is_visual_only, safety_note, requires_equipment_stopped,
              prohibit_if_running, prohibit_opening_covers
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              templateId, step.step_no, step.step_type, step.instruction, step.data_type,
              step.options || null, step.is_required ? 1 : 0, step.is_visual_only ? 1 : 0,
              step.safety_note || null, step.requires_equipment_stopped ? 1 : 0,
              step.prohibit_if_running ? 1 : 0, step.prohibit_opening_covers ? 1 : 0
            ]
          );
          stepsCreated++;
        }
      }
    }
    
    // Update batch count
    await connection.execute(
      'UPDATE seed_batches SET entity_count = ? WHERE batch_id = ?',
      [equipmentTypesInserted + templatesCreated, SEED_BATCH_ID]
    );
    
    await connection.commit();
    
    console.log('=== Comprehensive Industry Equipment Seed Complete ===');
    console.log(`Equipment types inserted: ${equipmentTypesInserted}`);
    console.log(`Family mappings inserted: ${familyMappingsInserted}`);
    console.log(`Industry mappings inserted: ${industryMappingsInserted}`);
    console.log(`Templates created: ${templatesCreated}`);
    console.log(`Steps created: ${stepsCreated}`);
    
  } catch (error) {
    await connection.rollback();
    console.error('Seed failed:', error);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

seed();
