const fs = require('fs');
const files = [
  'backend/src/routes/intelligenceRoutes.js',
  'backend/src/services/allocationService.js',
  'backend/src/services/backorderService.js',
  'backend/src/services/fulfillmentService.js',
  'backend/src/services/inventoryService.js',
  'backend/src/services/dealHealthService.js',
  'backend/src/services/negotiationService.js',
  'backend/src/services/recommendationService.js'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/const INTERNAL_ROLES = \[[^\]]*\];/g, 'const INTERNAL_ROLES = ["ADMIN", "SALES", "SALESPERSON", "MANAGER", "FINANCE", "OPERATIONS"];');
  
  // also handle Set case where it might span multiple lines, wait, the regex for that was single line
  // Let's do a simpler replace for Set
  // "const INTERNAL_ROLES = new Set([" followed by whatever until "]);"
  content = content.replace(/const INTERNAL_ROLES = new Set\(\[[\s\S]*?\]\);/g, 'const INTERNAL_ROLES = new Set(["ADMIN", "SALES", "SALESPERSON", "MANAGER", "FINANCE", "OPERATIONS"]);');

  fs.writeFileSync(f, content);
});
console.log("Done");
