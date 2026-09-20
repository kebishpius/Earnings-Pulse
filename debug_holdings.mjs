import fs from 'fs';
import { parseFinancialCsv, parseMoney } from './frontend/src/utils/financialCsv.js';

const pyContent = fs.readFileSync('test_reconstruct.py', 'utf8');
const startMarker = 'csv_data = """';
const endMarker = '"""\n\nreader';
const rawCsv = pyContent.substring(pyContent.indexOf(startMarker) + startMarker.length, pyContent.indexOf(endMarker));
const csv = rawCsv.replace(/\\"/g, '"');

// Split into lines to understand structure
const lines = csv.split(/\r\n|\r|\n/).map(l => l.trim()).filter(Boolean);
console.log('First 3 lines:');
lines.slice(0, 3).forEach((l, i) => console.log(`  [${i}]: ${l.substring(0, 80)}`));

// Check if multiline fields get merged
console.log('\nTotal lines (after trimming):', lines.length);

// Parse and see what happens
const res = parseFinancialCsv(csv);
console.log('\nData Type:', res.dataType);
console.log('Holdings:', res.holdings.length);
console.log('Transactions:', res.transactions.length);

// Now let's manually trace what's happening with action detection
// Look at first few trans to see if action is being read
console.log('\nFirst 5 transactions:');
res.transactions.slice(0, 5).forEach(t => {
  console.log(`  ${t.date} | ${t.description.substring(0,40)} | $${t.amount?.toFixed(2)} | ${t.category}`);
});
