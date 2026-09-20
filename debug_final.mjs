import fs from 'fs';
import { parseFinancialCsv } from './frontend/src/utils/financialCsv.js';

const pyContent = fs.readFileSync('test_reconstruct.py', 'utf8');
const startMarker = 'csv_data = """';
const endMarker = '"""\n\nreader';
const rawCsv = pyContent.substring(pyContent.indexOf(startMarker) + startMarker.length, pyContent.indexOf(endMarker));
const csv = rawCsv.replace(/\\"/g, '"');

// Count expected rows manually (each physical line pair = 1 row)
const physLines = csv.split(/\r\n|\r|\n/);
console.log('Physical lines in CSV:', physLines.length);

const res = parseFinancialCsv(csv);
console.log('Data Type:', res.dataType);
console.log('Transactions:', res.transactions.length);
console.log('Holdings (reconstructed):', res.holdings.length);

// Show all 25 holdings
console.log('\nAll Reconstructed Holdings:');
res.holdings.forEach((h, i) => {
  console.log(`  ${(i+1).toString().padStart(2)}. ${h.symbol.padEnd(6)} ${h.asset_name.padEnd(35)} | $${h.current_value.toFixed(2).padStart(10)} | ${h.allocation_pct}%`);
});

// Show a sample of transactions
console.log('\nSample Transactions (first 10):');
res.transactions.slice(0, 10).forEach(t => {
  console.log(`  ${t.date} | ${(t.description || '').substring(0, 40).padEnd(40)} | $${t.amount?.toFixed(2).padStart(9)} | ${t.category}`);
});
