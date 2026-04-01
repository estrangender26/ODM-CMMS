-- =====================================================
-- ISO 14224 Equipment Hierarchy Seed Data
-- Water and Wastewater Facilities
-- ODM-CMMS Multi-Tenant CMMS
-- =====================================================

-- Clear existing data (for re-seeding)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE failure_modes;
TRUNCATE TABLE task_template_safety_controls;
TRUNCATE TABLE task_template_steps;
TRUNCATE TABLE task_templates;
TRUNCATE TABLE equipment_types;
TRUNCATE TABLE equipment_classes;
TRUNCATE TABLE equipment_categories;
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- PART 1: EQUIPMENT CATEGORIES (ISO 14224 Top Level)
-- =====================================================

INSERT INTO equipment_categories (category_code, category_name, description) VALUES
('PUMP', 'Pump', 'Equipment used to move fluids by mechanical action'),
('MOTOR', 'Motor', 'Electrical machines that convert electrical energy into mechanical energy'),
('BLOW', 'Blower', 'Machines designed to blow air or gas at high pressure'),
('COMP', 'Compressor', 'Devices that increase the pressure of a gas by reducing its volume'),
('VALV', 'Valve', 'Devices that regulate, direct or control the flow of fluids'),
('FILT', 'Filter', 'Devices that remove impurities from fluids or gases'),
('GEAR', 'Gearbox', 'Mechanical units consisting of gears for speed/torque conversion'),
('GEN', 'Generator', 'Devices that convert mechanical energy into electrical energy'),
('TRAN', 'Transformer', 'Static electrical devices that transfer energy between circuits'),
('SWGR', 'Switchgear', 'Electrical disconnect switches, fuses or circuit breakers'),
('UPS', 'UPS', 'Uninterruptible Power Supply systems'),
('PLC', 'PLC', 'Programmable Logic Controllers'),
('SCAD', 'SCADA', 'Supervisory Control and Data Acquisition systems'),
('INST', 'Instrumentation', 'Measuring and control instruments'),
('PIPE', 'Pipeline', 'Piping systems and associated components'),
('MIX', 'Mixer', 'Equipment for blending or mixing fluids or solids'),
('SCRN', 'Screen', 'Equipment for separating solids from fluids'),
('CONV', 'Conveyor', 'Mechanical handling devices for moving materials');

-- =====================================================
-- PART 2: EQUIPMENT CLASSES
-- =====================================================

-- PUMP Classes
SET @cat_pump = (SELECT id FROM equipment_categories WHERE category_code = 'PUMP');
INSERT INTO equipment_classes (category_id, class_code, class_name, description) VALUES
(@cat_pump, 'CENT', 'Centrifugal Pump', 'Pumps that use rotating impellers to increase fluid velocity'),
(@cat_pump, 'RECI', 'Reciprocating Pump', 'Pumps that use back-and-forth motion of pistons or plungers'),
(@cat_pump, 'DIAP', 'Diaphragm Pump', 'Pumps that use flexible diaphragm reciprocating motion'),
(@cat_pump, 'SCRE', 'Screw Pump', 'Pumps that use one or more screws to move fluids'),
(@cat_pump, 'PERI', 'Peristaltic Pump', 'Pumps that use rotating rollers on flexible tubing'),
(@cat_pump, 'SUBM', 'Submersible Pump', 'Pumps designed to operate while submerged in fluid'),
(@cat_pump, 'GRND', 'Grinder Pump', 'Pumps with built-in grinding mechanism for solids');

-- MOTOR Classes
SET @cat_motor = (SELECT id FROM equipment_categories WHERE category_code = 'MOTOR');
INSERT INTO equipment_classes (category_id, class_code, class_name, description) VALUES
(@cat_motor, 'ACIN', 'AC Induction Motor', 'AC motors using electromagnetic induction'),
(@cat_motor, 'ACSY', 'AC Synchronous Motor', 'AC motors rotating at synchronous speed'),
(@cat_motor, 'DC', 'DC Motor', 'Direct current motors'),
(@cat_motor, 'SUBM', 'Submersible Motor', 'Motors designed for submerged operation'),
(@cat_motor, 'EXPL', 'Explosion Proof Motor', 'Motors designed for hazardous environments'),
(@cat_motor, 'SERV', 'Servo Motor', 'Precision controlled motors for automation');

-- VALVE Classes
SET @cat_valv = (SELECT id FROM equipment_categories WHERE category_code = 'VALV');
INSERT INTO equipment_classes (category_id, class_code, class_name, description) VALUES
(@cat_valv, 'GATE', 'Gate Valve', 'Valves that open by lifting a gate out of the fluid path'),
(@cat_valv, 'BUTT', 'Butterfly Valve', 'Valves with rotating disc for flow control'),
(@cat_valv, 'BALL', 'Ball Valve', 'Valves with spherical disc for quick shutoff'),
(@cat_valv, 'CHEC', 'Check Valve', 'Valves allowing flow in one direction only'),
(@cat_valv, 'GLOB', 'Globe Valve', 'Valves for regulating flow in pipelines'),
(@cat_valv, 'DIAP', 'Diaphragm Valve', 'Valves using flexible diaphragm to control flow'),
(@cat_valv, 'NEED', 'Needle Valve', 'Valves for precise flow control'),
(@cat_valv, 'PLUG', 'Plug Valve', 'Valves with tapered or cylindrical plug'),
(@cat_valv, 'CONT', 'Control Valve', 'Valves for automatic process control'),
(@cat_valv, 'RELI', 'Relief Valve', 'Safety valves for pressure protection'),
(@cat_valv, 'SURG', 'Surge Anticipator', 'Valves for water hammer protection');

-- INSTRUMENTATION Classes
SET @cat_inst = (SELECT id FROM equipment_categories WHERE category_code = 'INST');
INSERT INTO equipment_classes (category_id, class_code, class_name, description) VALUES
(@cat_inst, 'PRES', 'Pressure Transmitter', 'Devices for measuring and transmitting pressure'),
(@cat_inst, 'FLOW', 'Flow Meter', 'Devices for measuring fluid flow rate'),
(@cat_inst, 'LEVL', 'Level Transmitter', 'Devices for measuring liquid levels'),
(@cat_inst, 'TEMP', 'Temperature Sensor', 'Devices for measuring temperature'),
(@cat_inst, 'ANAL', 'Analyzer', 'Instruments for chemical/physical analysis'),
(@cat_inst, 'VIB', 'Vibration Sensor', 'Devices for monitoring equipment vibration'),
(@cat_inst, 'DP', 'Differential Pressure', 'Instruments for measuring differential pressure');

-- AUTOMATION Classes
SET @cat_plc = (SELECT id FROM equipment_categories WHERE category_code = 'PLC');
SET @cat_scad = (SELECT id FROM equipment_categories WHERE category_code = 'SCAD');
INSERT INTO equipment_classes (category_id, class_code, class_name, description) VALUES
(@cat_plc, 'PLCC', 'PLC Controller', 'Programmable logic control units'),
(@cat_plc, 'RTU', 'RTU', 'Remote Terminal Units for telemetry'),
(@cat_plc, 'HMI', 'HMI', 'Human Machine Interface devices'),
(@cat_scad, 'SERV', 'SCADA Server', 'Central SCADA control servers'),
(@cat_scad, 'WORK', 'SCADA Workstation', 'Operator workstations for SCADA'),
(@cat_scad, 'HIST', 'Historian', 'Data historians for trend analysis');

-- BLOWER Classes
SET @cat_blow = (SELECT id FROM equipment_categories WHERE category_code = 'BLOW');
INSERT INTO equipment_classes (category_id, class_code, class_name, description) VALUES
(@cat_blow, 'CENT', 'Centrifugal Blower', 'Blowers using centrifugal force'),
(@cat_blow, 'LOBE', 'Rotary Lobe Blower', 'Positive displacement blowers with rotors'),
(@cat_blow, 'SCRE', 'Screw Blower', 'Blowers using screw compression'),
(@cat_blow, 'REGEN', 'Regenerative Blower', 'Blowers using regenerative principle');

-- COMPRESSOR Classes
SET @cat_comp = (SELECT id FROM equipment_categories WHERE category_code = 'COMP');
INSERT INTO equipment_classes (category_id, class_code, class_name, description) VALUES
(@cat_comp, 'SCRE', 'Screw Compressor', 'Rotary screw positive displacement compressors'),
(@cat_comp, 'RECI', 'Reciprocating Compressor', 'Piston-type compressors'),
(@cat_comp, 'CENT', 'Centrifugal Compressor', 'Dynamic compressors using centrifugal force'),
(@cat_comp, 'SCRO', 'Scroll Compressor', 'Compressors using orbiting scroll');

-- FILTER Classes
SET @cat_filt = (SELECT id FROM equipment_categories WHERE category_code = 'FILT');
INSERT INTO equipment_classes (category_id, class_code, class_name, description) VALUES
(@cat_filt, 'BAG', 'Bag Filter', 'Filters using fabric bags'),
(@cat_filt, 'CART', 'Cartridge Filter', 'Filters using replaceable cartridges'),
(@cat_filt, 'SAND', 'Sand Filter', 'Filters using sand media'),
(@cat_filt, 'ACTV', 'Activated Carbon Filter', 'Filters using activated carbon'),
(@cat_filt, 'MEMB', 'Membrane Filter', 'Filters using semi-permeable membranes'),
(@cat_filt, 'DRUM', 'Drum Filter', 'Rotating drum microfilters'),
(@cat_filt, 'DISC', 'Disc Filter', 'Filters using stacked discs');

-- GEARBOX Classes
SET @cat_gear = (SELECT id FROM equipment_categories WHERE category_code = 'GEAR');
INSERT INTO equipment_classes (category_id, class_code, class_name, description) VALUES
(@cat_gear, 'HEL', 'Helical Gearbox', 'Gearboxes with helical gears'),
(@cat_gear, 'BEV', 'Bevel Gearbox', 'Gearboxes with bevel gears'),
(@cat_gear, 'WORM', 'Worm Gearbox', 'Gearboxes with worm drive'),
(@cat_gear, 'PLAN', 'Planetary Gearbox', 'Epicyclic gear systems');

-- GENERATOR Classes
SET @cat_gen = (SELECT id FROM equipment_categories WHERE category_code = 'GEN');
INSERT INTO equipment_classes (category_id, class_code, class_name, description) VALUES
(@cat_gen, 'DIESEL', 'Diesel Generator', 'Generators powered by diesel engines'),
(@cat_gen, 'GAS', 'Gas Generator', 'Generators powered by gas engines'),
(@cat_gen, 'HYDRO', 'Hydro Generator', 'Generators for hydroelectric power'),
(@cat_gen, 'WIND', 'Wind Generator', 'Generators for wind turbines');

-- TRANSFORMER Classes
SET @cat_tran = (SELECT id FROM equipment_categories WHERE category_code = 'TRAN');
INSERT INTO equipment_classes (category_id, class_code, class_name, description) VALUES
(@cat_tran, 'DIST', 'Distribution Transformer', 'Transformers for power distribution'),
(@cat_tran, 'POWER', 'Power Transformer', 'High voltage power transformers'),
(@cat_tran, 'DRY', 'Dry Type Transformer', 'Air-cooled transformers'),
(@cat_tran, 'OIL', 'Oil Filled Transformer', 'Oil-immersed transformers');

-- SWITCHGEAR Classes
SET @cat_swgr = (SELECT id FROM equipment_categories WHERE category_code = 'SWGR');
INSERT INTO equipment_classes (category_id, class_code, class_name, description) VALUES
(@cat_swgr, 'LV', 'Low Voltage Switchgear', 'Switchgear for low voltage applications'),
(@cat_swgr, 'MV', 'Medium Voltage Switchgear', 'Switchgear for medium voltage applications'),
(@cat_swgr, 'MCC', 'Motor Control Center', 'Centralized motor control equipment'),
(@cat_swgr, 'VFD', 'VFD Panel', 'Variable Frequency Drive panels');

-- UPS Classes
SET @cat_ups = (SELECT id FROM equipment_categories WHERE category_code = 'UPS');
INSERT INTO equipment_classes (category_id, class_code, class_name, description) VALUES
(@cat_ups, 'ONLI', 'Online UPS', 'Double-conversion UPS systems'),
(@cat_ups, 'LINE', 'Line Interactive UPS', 'Line-interactive UPS systems'),
(@cat_ups, 'STBY', 'Standby UPS', 'Offline/standby UPS systems');

-- PIPELINE Classes
SET @cat_pipe = (SELECT id FROM equipment_categories WHERE category_code = 'PIPE');
INSERT INTO equipment_classes (category_id, class_code, class_name, description) VALUES
(@cat_pipe, 'STEL', 'Steel Pipeline', 'Carbon steel piping systems'),
(@cat_pipe, 'SS', 'Stainless Pipeline', 'Stainless steel piping systems'),
(@cat_pipe, 'PVC', 'PVC Pipeline', 'PVC piping systems'),
(@cat_pipe, 'HDPE', 'HDPE Pipeline', 'High-density polyethylene pipelines'),
(@cat_pipe, 'DUCT', 'Ductile Iron', 'Ductile iron pipelines');

-- MIXER Classes
SET @cat_mix = (SELECT id FROM equipment_categories WHERE category_code = 'MIX');
INSERT INTO equipment_classes (category_id, class_code, class_name, description) VALUES
(@cat_mix, 'MECH', 'Mechanical Mixer', 'Motor-driven mechanical mixers'),
(@cat_mix, 'DIFF', 'Diffuser Aerator', 'Fine bubble diffuser systems'),
(@cat_mix, 'SURF', 'Surface Aerator', 'Surface aeration equipment'),
(@cat_mix, 'SUBM', 'Submersible Mixer', 'Submersible mixing equipment');

-- SCREEN Classes
SET @cat_scrn = (SELECT id FROM equipment_categories WHERE category_code = 'SCRN');
INSERT INTO equipment_classes (category_id, class_code, class_name, description) VALUES
(@cat_scrn, 'BAR', 'Bar Screen', 'Coarse screening with parallel bars'),
(@cat_scrn, 'BAND', 'Band Screen', 'Traveling band screens'),
(@cat_scrn, 'STEP', 'Step Screen', 'Step-type fine screens'),
(@cat_scrn, 'DRUM', 'Drum Screen', 'Rotary drum screens');

-- CONVEYOR Classes
SET @cat_conv = (SELECT id FROM equipment_categories WHERE category_code = 'CONV');
INSERT INTO equipment_classes (category_id, class_code, class_name, description) VALUES
(@cat_conv, 'BELT', 'Belt Conveyor', 'Continuous belt conveyors'),
(@cat_conv, 'SCREW', 'Screw Conveyor', 'Auger-type screw conveyors'),
(@cat_conv, 'CHAIN', 'Chain Conveyor', 'Chain-driven conveyors'),
(@cat_conv, 'PNEU', 'Pneumatic Conveyor', 'Air-powered conveying systems');

-- =====================================================
-- PART 3: EQUIPMENT TYPES (Examples for Key Classes)
-- =====================================================

-- Centrifugal Pump Types
SET @class_cent_pump = (SELECT id FROM equipment_classes WHERE class_code = 'CENT' AND category_id = @cat_pump);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_cent_pump, 'END_SUCT', 'End Suction Pump', 'Single impeller pump with suction on one end', 'Impeller, casing, shaft, seal, bearing housing, motor'),
(@class_cent_pump, 'SPLIT_CASE', 'Split Case Pump', 'Double suction pump with horizontally split casing', 'Double suction impeller, split casing, shaft, seals, bearings'),
(@class_cent_pump, 'MULTISTG', 'Multistage Pump', 'Pump with multiple impellers in series for high pressure', 'Impellers, diffusers, shaft, balance drum, seals'),
(@class_cent_pump, 'VERT_TURB', 'Vertical Turbine', 'Vertical pump with bowl assembly and column', 'Bowl assembly, impellers, column, discharge head, motor'),
(@class_cent_pump, 'SUBM_CENT', 'Submersible Centrifugal', 'Submersible pump with integrated motor', 'Impeller, diffuser, submersible motor, seal, cable'),
(@class_cent_pump, 'CIRCULAT', 'Circulator Pump', 'Low head, high flow pump for circulation', 'Impeller, volute, canned motor, seal');

-- Submersible Pump Types
SET @class_subm_pump = (SELECT id FROM equipment_classes WHERE class_code = 'SUBM' AND category_id = @cat_pump);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_subm_pump, 'SEWAGE', 'Submersible Sewage Pump', 'Pump for raw sewage with solids handling', 'Vortex impeller, volute, submersible motor, seal, cable'),
(@class_subm_pump, 'DRAINAGE', 'Submersible Drainage', 'Pump for clean water drainage', 'Impeller, diffuser, motor, seal, float switch'),
(@class_subm_pump, 'SLURRY', 'Submersible Slurry', 'Heavy duty pump for abrasive slurries', 'High chrome impeller, agitator, motor, seal');

-- Reciprocating Pump Types
SET @class_reci_pump = (SELECT id FROM equipment_classes WHERE class_code = 'RECI' AND category_id = @cat_pump);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_reci_pump, 'PLUNGER', 'Plunger Pump', 'High pressure pump with plunger', 'Plunger, cylinder, valves, crankshaft, packing'),
(@class_reci_pump, 'PISTON', 'Piston Pump', 'Positive displacement pump with piston', 'Piston, cylinder, suction/discharge valves, drive'),
(@class_reci_pump, 'DIAPH_HY', 'Hydraulic Diaphragm', 'Diaphragm pump with hydraulic drive', 'Diaphragm, hydraulic fluid, piston, valves');

-- AC Induction Motor Types
SET @class_acind = (SELECT id FROM equipment_classes WHERE class_code = 'ACIN' AND category_id = @cat_motor);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_acind, 'TEFC', 'TEFC Motor', 'Totally Enclosed Fan Cooled motor', 'Stator, rotor, fan, housing, bearings, terminal box'),
(@class_acind, 'ODP', 'ODP Motor', 'Open Drip Proof motor', 'Stator, rotor, ventilation openings, bearings'),
(@class_acind, 'WP', 'Weather Protected', 'Weather protected motor for outdoor use', 'Stator, rotor, weather shields, bearings, drains'),
(@class_acind, 'EXPL_PR', 'Explosion Proof', 'Explosion proof motor for hazardous areas', 'Explosion proof enclosure, stator, rotor, seals'),
(@class_acind, 'BRAKE', 'Brake Motor', 'Motor with integrated brake', 'Motor assembly, brake coils, brake disc, friction plate'),
(@class_acind, 'VAR_SPD', 'Variable Speed', 'Motor designed for VFD operation', 'Inverter grade insulation, separate cooling fan');

-- Gate Valve Types
SET @class_gate = (SELECT id FROM equipment_classes WHERE class_code = 'GATE' AND category_id = @cat_valv);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_gate, 'RISING_ST', 'Rising Stem Gate', 'Gate valve with visible rising stem', 'Body, bonnet, gate, stem, handwheel, packing'),
(@class_gate, 'NON_RISE', 'Non-Rising Stem', 'Gate valve for limited space', 'Body, bonnet, gate, stem, position indicator'),
(@class_gate, 'KNIFE', 'Knife Gate Valve', 'Gate valve for slurry applications', 'Body, sharp gate, stem, actuator, wiper');

-- Butterfly Valve Types
SET @class_butt = (SELECT id FROM equipment_classes WHERE class_code = 'BUTT' AND category_id = @cat_valv);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_butt, 'CONC', 'Concentric Butterfly', 'Rubber lined butterfly valve', 'Body, disc, rubber liner, stem, seat'),
(@class_butt, 'DOUB_OFF', 'Double Offset', 'High performance butterfly valve', 'Body, disc, offset stem, metal seat'),
(@class_butt, 'TRIP_OFF', 'Triple Offset', 'Zero leakage butterfly valve', 'Body, laminated disc, triple offset geometry');

-- Check Valve Types
SET @class_chec = (SELECT id FROM equipment_classes WHERE class_code = 'CHEC' AND category_id = @cat_valv);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_chec, 'SWING', 'Swing Check', 'Hinged disc check valve', 'Body, disc, hinge, seat'),
(@class_chec, 'LIFT', 'Lift Check', 'Piston type check valve', 'Body, piston, spring, seat'),
(@class_chec, 'DUAL_PL', 'Dual Plate', 'Wafer style dual plate check', 'Body, two plates, springs, hinge pins'),
(@class_chec, 'NOZZLE', 'Nozzle Check', 'Silent check valve', 'Body, poppet, spring, guide');

-- Pressure Transmitter Types
SET @class_pres = (SELECT id FROM equipment_classes WHERE class_code = 'PRES' AND category_id = @cat_inst);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_pres, 'GAUGE', 'Gauge Pressure', 'Measures pressure relative to atmosphere', 'Sensor, electronics, housing, process connection'),
(@class_pres, 'ABS', 'Absolute Pressure', 'Measures pressure relative to vacuum', 'Sensor with vacuum reference, electronics'),
(@class_pres, 'DIFF', 'Differential Pressure', 'Measures difference between two pressures', 'Dual sensor, transmitter, manifold'),
(@class_pres, 'HYDRO', 'Hydrostatic Level', 'Measures level via pressure', 'Submersible sensor, cable, transmitter');

-- Flow Meter Types
SET @class_flow = (SELECT id FROM equipment_classes WHERE class_code = 'FLOW' AND category_id = @cat_inst);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_flow, 'ELEC_MAG', 'Electromagnetic', 'Magmeter for conductive fluids', 'Coils, electrodes, liner, transmitter'),
(@class_flow, 'ULTRA', 'Ultrasonic', 'Non-invasive flow measurement', 'Transducers, clamp-on or inline, transmitter'),
(@class_flow, 'VORTEX', 'Vortex Shedding', 'Flow meter using vortex principle', 'Bluff body, sensor, transmitter'),
(@class_flow, 'TURBINE', 'Turbine', 'Mechanical turbine flow meter', 'Turbine rotor, bearings, pickup, housing'),
(@class_flow, 'ORIFICE', 'Orifice Plate', 'Differential pressure flow meter', 'Orifice plate, flanges, DP transmitter'),
(@class_flow, 'VENTURI', 'Venturi Tube', 'Low loss DP flow meter', 'Venturi tube, DP transmitter');

-- Level Transmitter Types
SET @class_levl = (SELECT id FROM equipment_classes WHERE class_code = 'LEVL' AND category_id = @cat_inst);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_levl, 'RADAR', 'Radar Level', 'Non-contact radar level measurement', 'Antenna, electronics, housing'),
(@class_levl, 'ULTRA_LVL', 'Ultrasonic Level', 'Non-contact ultrasonic level', 'Transducer, temperature sensor, transmitter'),
(@class_levl, 'CAPAC', 'Capacitance', 'Contact level measurement', 'Probe, electronics, housing'),
(@class_levl, 'FLOAT', 'Float Switch', 'Mechanical float level detection', 'Float, rod, switch mechanism');

-- Temperature Sensor Types
SET @class_temp = (SELECT id FROM equipment_classes WHERE class_code = 'TEMP' AND category_id = @cat_inst);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_temp, 'RTD', 'RTD Sensor', 'Resistance Temperature Detector', 'Platinum element, sheath, lead wires'),
(@class_temp, 'THERMO', 'Thermocouple', 'Thermocouple temperature sensor', 'Junction, thermoelement, sheath'),
(@class_temp, 'INFRA', 'Infrared', 'Non-contact temperature measurement', 'Optics, detector, electronics');

-- PLC Controller Types
SET @class_plcc = (SELECT id FROM equipment_classes WHERE class_code = 'PLCC' AND category_id = @cat_plc);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_plcc, 'MODULAR', 'Modular PLC', 'Rack-based modular PLC system', 'CPU, power supply, I/O modules, communication'),
(@class_plcc, 'COMPACT', 'Compact PLC', 'Integrated PLC with fixed I/O', 'CPU with integrated I/O, power supply'),
(@class_plcc, 'SAFETY', 'Safety PLC', 'SIL-rated safety PLC', 'Safety CPU, safety I/O, safety network');

-- Centrifugal Blower Types
SET @class_cent_blow = (SELECT id FROM equipment_classes WHERE class_code = 'CENT' AND category_id = @cat_blow);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_cent_blow, 'SINGLE', 'Single Stage Centrifugal', 'Single stage centrifugal blower', 'Impeller, volute, shaft, bearings, motor'),
(@class_cent_blow, 'MULTI', 'Multistage Centrifugal', 'High pressure multistage blower', 'Impellers, diffusers, shaft, seals');

-- Rotary Lobe Blower Types
SET @class_lobe = (SELECT id FROM equipment_classes WHERE class_code = 'LOBE' AND category_id = @cat_blow);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_lobe, 'TWIN_LOBE', 'Twin Lobe Blower', 'Two rotor positive displacement blower', 'Rotors, housing, gears, bearings, seals'),
(@class_lobe, 'TRI_LOBE', 'Tri-Lobe Blower', 'Three rotor blower for reduced pulsation', 'Three lobed rotors, housing, timing gears');

-- Screw Compressor Types
SET @class_scre_comp = (SELECT id FROM equipment_classes WHERE class_code = 'SCRE' AND category_id = @cat_comp);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_scre_comp, 'OIL_INJ', 'Oil Injected', 'Oil flooded screw compressor', 'Screw rotors, oil separator, cooler, motor'),
(@class_scre_comp, 'OIL_FREE', 'Oil Free', 'Dry screw compressor', 'Screw rotors, timing gears, seals, motor');

-- Sand Filter Types
SET @class_sand = (SELECT id FROM equipment_classes WHERE class_code = 'SAND' AND category_id = @cat_filt);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_sand, 'RAPID', 'Rapid Gravity Filter', 'Rapid gravity sand filter', 'Filter bed, underdrain, wash troughs, valves'),
(@class_sand, 'PRESSURE', 'Pressure Filter', 'Pressurized sand filter', 'Pressure vessel, media, underdrain, valves'),
(@class_sand, 'CONT', 'Continuous Backwash', 'Moving bed sand filter', 'Filter tank, sand washer, air lift, sand bed');

-- Membrane Filter Types
SET @class_memb = (SELECT id FROM equipment_classes WHERE class_code = 'MEMB' AND category_id = @cat_filt);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_memb, 'MF', 'Microfiltration', 'Microfiltration membrane system', 'Membrane modules, pumps, piping, CIP system'),
(@class_memb, 'UF', 'Ultrafiltration', 'Ultrafiltration membrane system', 'Membrane modules, pumps, backwash system'),
(@class_memb, 'RO', 'Reverse Osmosis', 'RO membrane system', 'RO vessels, membranes, HP pump, energy recovery');

-- Mechanical Mixer Types
SET @class_mech_mix = (SELECT id FROM equipment_classes WHERE class_code = 'MECH' AND category_id = @cat_mix);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_mech_mix, 'TURBO', 'Turbine Mixer', 'Turbine type mechanical mixer', 'Impeller, shaft, gearbox, motor, baffles'),
(@class_mech_mix, 'PROPELL', 'Propeller Mixer', 'Axial flow propeller mixer', 'Propeller, shaft, drive unit, mounting'),
(@class_mech_mix, 'PADDLE', 'Paddle Mixer', 'Slow speed paddle mixer', 'Paddles, shaft, gearbox, motor');

-- Diffuser Aerator Types
SET @class_diff = (SELECT id FROM equipment_classes WHERE class_code = 'DIFF' AND category_id = @cat_mix);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_diff, 'FINE_BUB', 'Fine Bubble Diffuser', 'Fine pore membrane diffusers', 'Diffuser membranes, grid piping, blowers'),
(@class_diff, 'COARSE', 'Coarse Bubble', 'Coarse bubble aeration', 'Diffusers, grid, air supply piping');

-- Bar Screen Types
SET @class_bar = (SELECT id FROM equipment_classes WHERE class_code = 'BAR' AND category_id = @cat_scrn);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_bar, 'MANUAL', 'Manual Bar Screen', 'Hand cleaned bar screen', 'Bars, frame, rake, platform'),
(@class_bar, 'MECH', 'Mechanical Bar Screen', 'Automatically cleaned bar screen', 'Bars, rakes, drive, screenings conveyor');

-- Step Screen Types
SET @class_step = (SELECT id FROM equipment_classes WHERE class_code = 'STEP' AND category_id = @cat_scrn);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_step, 'FINE_STEP', 'Fine Step Screen', 'Fine screening step screen', 'Step bars, moving plates, drive, wash system'),
(@class_step, 'PERF', 'Perforated Plate', 'Perforated plate step screen', 'Perforated plates, drive, spray system');

-- Screw Conveyor Types
SET @class_screw_conv = (SELECT id FROM equipment_classes WHERE class_code = 'SCREW' AND category_id = @cat_conv);
INSERT INTO equipment_types (class_id, type_code, type_name, description, typical_components) VALUES
(@class_screw_conv, 'SHAFTED', 'Shafted Screw', 'Shafted screw conveyor', 'Screw flight, shaft, trough, bearings, drive'),
(@class_screw_conv, 'SHAFTLESS', 'Shaftless Screw', 'Shaftless spiral conveyor', 'Spiral, trough liner, drive, end bearings'),
(@class_screw_conv, 'COMPACT', 'Compact Screw', 'Shaftless compactor conveyor', 'Screw, wash zone, compaction zone, chute');

-- =====================================================
-- PART 4: FAILURE MODES (Example Data for Key Types)
-- =====================================================

-- Centrifugal Pump Failure Modes
SET @type_end_suct = (SELECT id FROM equipment_types WHERE type_code = 'END_SUCT');
INSERT INTO failure_modes (equipment_type_id, failure_mode, failure_cause, failure_mechanism, typical_symptoms, recommended_action) VALUES
(@type_end_suct, 'No Flow', 'Cavitation, blocked suction, air lock', 'Vapor bubble collapse, blockage', 'No discharge, noise, vibration', 'Check NPSH, clear blockage, vent air'),
(@type_end_suct, 'Low Flow', 'Worn impeller, internal recirculation', 'Erosion, corrosion', 'Reduced capacity, high power', 'Inspect/replace impeller, check clearances'),
(@type_end_suct, 'High Vibration', 'Bearing failure, misalignment, imbalance', 'Fatigue, wear', 'Excessive vibration, noise', 'Check bearings, alignment, balance impeller'),
(@type_end_suct, 'Seal Leakage', 'Worn seal, dry running, misalignment', 'Abrasion, thermal damage', 'Fluid leakage from seal area', 'Replace seal, ensure flush, check alignment'),
(@type_end_suct, 'Motor Overload', 'High specific gravity, mechanical binding', 'Increased power demand', 'High current, tripped overload', 'Check fluid properties, inspect internals');

-- Motor Failure Modes
SET @type_tefc = (SELECT id FROM equipment_types WHERE type_code = 'TEFC');
INSERT INTO failure_modes (equipment_type_id, failure_mode, failure_cause, failure_mechanism, typical_symptoms, recommended_action) VALUES
(@type_tefc, 'Won''t Start', 'Electrical fault, mechanical seizure', 'Insulation failure, bearing failure', 'No rotation, hum, tripped breaker', 'Check electrical, inspect bearings, free rotor'),
(@type_tefc, 'Overheating', 'Overloading, poor ventilation, high ambient', 'Insulation degradation', 'High temp, burning smell, tripped thermal', 'Reduce load, clean cooling, check ambient'),
(@type_tefc, 'High Vibration', 'Bearing wear, rotor imbalance, misalignment', 'Mechanical wear', 'Vibration, noise', 'Replace bearings, balance rotor, align'),
(@type_tefc, 'Insulation Failure', 'Moisture, age, overvoltage', 'Dielectric breakdown', 'Short circuit, burnt windings', 'Rewind or replace motor, check environment');

-- Pressure Transmitter Failure Modes
SET @type_gauge_pres = (SELECT id FROM equipment_types WHERE type_code = 'GAUGE');
INSERT INTO failure_modes (equipment_type_id, failure_mode, failure_cause, failure_mechanism, typical_symptoms, recommended_action) VALUES
(@type_gauge_pres, 'Zero Drift', 'Temperature change, aging, mounting stress', 'Sensor characteristic shift', 'Incorrect zero reading', 'Recalibrate, check mounting, replace if needed'),
(@type_gauge_pres, 'No Output', 'Electrical fault, disconnected cable', 'Open circuit, power failure', 'No signal, error code', 'Check wiring, power, replace transmitter'),
(@type_gauge_pres, 'Erratic Reading', 'Moisture, vibration, EMI', 'Intermittent connection', 'Unstable output', 'Check sealing, grounding, shielding');

-- =====================================================
-- SEED COMPLETE
-- =====================================================

SELECT 'ISO Equipment Hierarchy seed data inserted successfully' AS status;
SELECT CONCAT((SELECT COUNT(*) FROM equipment_categories), ' categories') AS count;
SELECT CONCAT((SELECT COUNT(*) FROM equipment_classes), ' classes') AS count;
SELECT CONCAT((SELECT COUNT(*) FROM equipment_types), ' types') AS count;
SELECT CONCAT((SELECT COUNT(*) FROM failure_modes), ' failure modes') AS count;
