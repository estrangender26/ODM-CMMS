/**
 * Excel/CSV to SMP JSON Converter
 * Converts Excel/CSV data to SMP JSON format
 * Usage: node convert-excel-to-smp.js <csv-file>
 */

const fs = require('fs');

function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  return lines.slice(1).map(line => {
    const obj = {};
    // Simple CSV parsing - for complex CSV use csv-parser package
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    return obj;
  });
}

function convertToSMP(csvFile) {
  console.log(`Converting ${csvFile} to SMP format...\n`);
  
  const content = fs.readFileSync(csvFile, 'utf8');
  const rows = parseCSV(content);
  
  const smps = rows.map((row, index) => {
    // Map common column names to SMP format
    return {
      smpNumber: row.SMP_Number || row.SMP || row.smpNumber || `SMP-${String(index + 1).padStart(3, '0')}`,
      title: row.Title || row.title || row.Description || `Maintenance Procedure ${index + 1}`,
      description: row.Description || row.Procedure || row.title || '',
      
      facilityName: row.Facility || row.FacilityName || row.facility || 'Main Facility',
      facilityCode: row.FacilityCode || row.facilityCode || `FAC-${String(index + 1).padStart(3, '0')}`,
      facilityCity: row.City || row.FacilityCity || '',
      facilityState: row.State || row.FacilityState || '',
      
      equipmentName: row.Equipment || row.EquipmentName || row.equipment || `Equipment ${index + 1}`,
      equipmentCode: row.EquipmentCode || row.equipmentCode || row.Code || `EQ-${String(index + 1).padStart(3, '0')}`,
      equipmentCategory: row.Category || row.EquipmentCategory || row.Type || 'General',
      manufacturer: row.Manufacturer || row.Make || row.Brand || 'Unknown',
      model: row.Model || row.model || '',
      equipmentLocation: row.Location || row.EquipmentLocation || 'Main Area',
      criticality: row.Criticality || row.Priority || 'medium',
      
      taskType: row.TaskType || row.Type || 'inspection',
      frequency: row.Frequency || 'monthly',
      frequencyValue: parseInt(row.FrequencyValue) || 1,
      estimatedTime: parseInt(row.EstimatedTime) || parseInt(row.Duration) || 30,
      priority: row.Priority || 'medium',
      
      toolsRequired: row.Tools || row.ToolsRequired || 'Standard toolkit',
      safetyNotes: row.Safety || row.SafetyNotes || 'Follow standard safety procedures',
      
      // Generate default steps if not provided
      steps: [
        {
          description: row.Step1 || row.Check1 || 'Visual inspection completed',
          inputType: 'boolean',
          isCritical: true
        },
        {
          description: row.Step2 || row.Check2 || 'Equipment operational',
          inputType: 'boolean',
          isCritical: true
        },
        {
          description: row.Step3 || row.Check3 || 'Safety checks passed',
          inputType: 'boolean',
          isCritical: true
        }
      ].filter(s => s.description)
    };
  });
  
  const output = { smps };
  const outputFile = csvFile.replace('.csv', '-smp.json');
  
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  
  console.log(`✅ Converted ${rows.length} SMPs`);
  console.log(`📄 Output saved to: ${outputFile}\n`);
  console.log('Next step: Review the JSON file and run:');
  console.log(`  npm run import:smp ${outputFile}\n`);
  
  return output;
}

const csvFile = process.argv[2];

if (!csvFile) {
  console.log('Usage: node convert-excel-to-smp.js <csv-file>');
  console.log('\nExpected CSV columns:');
  console.log('  SMP_Number, Title, Description,');
  console.log('  Facility, Equipment, Category,');
  console.log('  Manufacturer, Model, Location,');
  console.log('  Frequency, Duration, Priority,');
  console.log('  Step1, Step2, Step3');
  console.log('\nOr send me your Excel/CSV file and I\'ll map the columns for you!');
  process.exit(1);
}

convertToSMP(csvFile);
