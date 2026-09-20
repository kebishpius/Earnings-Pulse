import fs from 'fs';
import { parseFinancialCsv } from './frontend/src/utils/financialCsv.js';

const pyContent = fs.readFileSync('test_reconstruct.py', 'utf8');
const startMarker = 'csv_data = """';
const endMarker = '"""\n\nreader';
const rawCsv = pyContent.substring(pyContent.indexOf(startMarker) + startMarker.length, pyContent.indexOf(endMarker));
const unescapedCsv = rawCsv.replace(/\\"/g, '"');

const res = parseFinancialCsv(unescapedCsv);
console.log('Data Type:', res.dataType);
console.log('Total Holdings:', res.holdings.length);
console.log('Total Transactions:', res.transactions.length);
console.log('\nTop 10 Active Holdings Reconstructed:');
res.holdings.slice(0, 10).forEach(h => {
  console.log(`  ${h.symbol.padEnd(6)} ${h.asset_name.padEnd(25)} | Value: $${h.current_value.toFixed(2)} | Alloc: ${h.allocation_pct}%`);
});

const soldSymbols = ['INTC', 'NVDA', 'AAPL', 'DELL', 'AMC', 'AMD', 'META', 'AMZN', 'WDC', 'DIS'];
console.log('\nChecking Sold Stocks (should NOT be in holdings):');
soldSymbols.forEach(sym => {
  const found = res.holdings.find(h => h.symbol === sym);
  console.log(`  ${sym}: ${found ? 'STILL IN HOLDINGS (ERROR)' : 'Correctly excluded (SOLD OUT)'}`);
});
