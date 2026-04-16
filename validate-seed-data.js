const fs = require('fs');

// Read newCategories from the seed file
const content = fs.readFileSync('database/seeds/006_comprehensive_industry_equipment.js', 'utf8');
const newCatMatches = content.matchAll(/\{ code: '([A-Z_]+)', name:/g);
const newCategories = [];
for (const m of newCatMatches) {
  newCategories.push(m[1]);
}

const existingCategories = ['PUMP','MOTOR','BLOW','COMP','VALV','FILT','GEAR','GEN','TRAN','SWGR','UPS','PLC','SCAD','INST','PIPE','MIX','SCRN','CONV'];
const validCats = new Set([...newCategories, ...existingCategories]);

const catMatches = content.matchAll(/cat:\s*'([^']+)'/g);
const invalid = new Set();
for (const m of catMatches) {
  if (!validCats.has(m[1])) {
    invalid.add(m[1]);
  }
}
console.log('New categories found:', newCategories.length);
console.log('Invalid category codes:', [...invalid]);
