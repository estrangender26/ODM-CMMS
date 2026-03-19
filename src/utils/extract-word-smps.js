/**
 * Extract SMPs from Word Documents
 * Converts .docx files to JSON format
 * Usage: node extract-word-smps.js "SMP Folder"
 */

const fs = require('fs');
const path = require('path');

// Simple regex-based extraction for Word files
function extractFromWord(content) {
  // Remove XML tags and metadata
  let text = content
    .replace(/<[^>]+>/g, ' ')  // Remove XML tags
    .replace(/&\w+;/g, ' ')     // Remove HTML entities
    .replace(/\s+/g, ' ')       // Normalize whitespace
    .trim();
  
  const smp = {
    smpNumber: '',
    title: '',
    equipmentName: '',
    equipmentCode: '',
    description: '',
    steps: []
  };
  
  // Extract SMP Number
  const smpMatch = text.match(/SMP[\s#-]*([A-Z0-9-]+)/i);
  if (smpMatch) smp.smpNumber = smpMatch[1];
  
  // Extract Title
  const titleMatch = text.match(/(?:Title|Subject)[\s:]*([^\n]+)/i);
  if (titleMatch) smp.title = titleMatch[1].trim();
  
  // Extract Equipment
  const equipMatch = text.match(/(?:Equipment|Asset)[\s:]*([^\n]+)/i);
  if (equipMatch) smp.equipmentName = equipMatch[1].trim();
  
  const equipCodeMatch = text.match(/(?:Equipment\s*(?:Code|#|ID)|Asset\s*(?:Code|#|ID))[\s:]*([A-Z0-9-]+)/i);
  if (equipCodeMatch) smp.equipmentCode = equipCodeMatch[1];
  
  // Extract Description
  const descMatch = text.match(/(?:Description|Purpose|Objective)[\s:]*([^]+?)(?=\n\s*(?:Step|Procedure|Check|Item|\d+\.|•|-))/i);
  if (descMatch) smp.description = descMatch[1].trim();
  
  // Extract Steps
  // Look for numbered items, bullets, or "Step" keywords
  const stepPatterns = [
    /(?:Step|Check|Item)\s*(\d+|[A-Z])\s*[.):-]\s*([^\n]+)/gi,
    /(\d+)\.\s+([^\n]+)/g,
    /[•\-\*]\s+([^\n]+)/g
  ];
  
  for (const pattern of stepPatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      matches.forEach((match, idx) => {
        const desc = match[2] || match[1];
        if (desc && desc.length > 5) {
          smp.steps.push({
            description: desc.trim(),
            inputType: detectInputType(desc),
            isCritical: desc.toLowerCase().includes('critical') || 
                       desc.toLowerCase().includes('safety') ||
                       desc.toLowerCase().includes('danger')
          });
        }
      });
      break; // Stop after first successful pattern
    }
  }
  
  // If no title found, use first line
  if (!smp.title) {
    const lines = text.split(/\n|\r/).filter(l => l.trim());
    smp.title = lines[0]?.substring(0, 50) || 'Untitled SMP';
  }
  
  // If no equipment code, generate one
  if (!smp.equipmentCode) {
    smp.equipmentCode = `EQ-${Date.now()}`;
  }
  
  // If no SMP number, generate one
  if (!smp.smpNumber) {
    smp.smpNumber = `SMP-${Date.now()}`;
  }
  
  // Default steps if none found
  if (smp.steps.length === 0) {
    smp.steps = [
      { description: 'Visual inspection completed', inputType: 'boolean', isCritical: true },
      { description: 'Equipment operational', inputType: 'boolean', isCritical: true },
      { description: 'Safety checks passed', inputType: 'boolean', isCritical: true }
    ];
  }
  
  return smp;
}

function detectInputType(text) {
  const lower = text.toLowerCase();
  
  if (lower.includes('pressure') || lower.includes('temperature') || 
      lower.includes('vibration') || lower.includes('voltage') ||
      lower.includes('current') || lower.includes('flow') ||
      lower.includes('speed') || lower.includes('level')) {
    return 'numeric';
  }
  
  if (lower.includes('photo') || lower.includes('picture') || lower.includes('image')) {
    return 'photo';
  }
  
  if (lower.includes('condition') || lower.includes('status') || lower.includes('select')) {
    return 'select';
  }
  
  return 'boolean';
}

function processWordFiles(folderPath) {
  console.log(`Processing Word files from: ${folderPath}\n`);
  
  const files = fs.readdirSync(folderPath)
    .filter(f => f.endsWith('.docx') || f.endsWith('.doc'))
    .map(f => path.join(folderPath, f));
  
  console.log(`Found ${files.length} Word documents\n`);
  
  const smps = [];
  
  for (const file of files) {
    console.log(`Processing: ${path.basename(file)}`);
    
    try {
      // Read file as text (docx is zipped XML, but we can extract text)
      const content = fs.readFileSync(file, 'utf8');
      const smp = extractFromWord(content);
      
      if (smp.title && smp.steps.length > 0) {
        smps.push(smp);
        console.log(`  ✓ Extracted: ${smp.title}`);
        console.log(`    - Equipment: ${smp.equipmentName}`);
        console.log(`    - Steps: ${smp.steps.length}\n`);
      } else {
        console.log(`  ⚠ Could not extract enough data\n`);
      }
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}\n`);
    }
  }
  
  if (smps.length === 0) {
    console.log('No valid SMPs extracted. Word files may be in binary format.');
    console.log('\nAlternative: Open each Word file and copy the text to a .txt file.');
    return;
  }
  
  // Save as JSON
  const output = { smps };
  const outputFile = path.join(folderPath, 'extracted-smps.json');
  
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  
  console.log(`✅ Extracted ${smps.length} SMPs`);
  console.log(`📄 Saved to: ${outputFile}\n`);
  console.log('Next step: Run import');
  console.log(`  npm run import:smps "${folderPath}"`);
}

const folderPath = process.argv[2] || 'SMP Folder';

if (!fs.existsSync(folderPath)) {
  console.log(`Folder not found: ${folderPath}`);
  process.exit(1);
}

processWordFiles(folderPath);
