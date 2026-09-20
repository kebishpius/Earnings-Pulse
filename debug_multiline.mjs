import fs from 'fs';

const pyContent = fs.readFileSync('test_reconstruct.py', 'utf8');
const startMarker = 'csv_data = """';
const endMarker = '"""\n\nreader';
const rawCsv = pyContent.substring(pyContent.indexOf(startMarker) + startMarker.length, pyContent.indexOf(endMarker));
const csv = rawCsv.replace(/\\"/g, '"');

// Show exact raw structure to understand multiline
console.log('=== RAW CSV first 10 physical lines ===');
const rawLines = csv.split(/\r\n|\r|\n/);
rawLines.slice(0, 12).forEach((l, i) => console.log(`[${i}]: |${l}|`));

// Count total physical lines
console.log(`\nTotal physical lines: ${rawLines.length}`);

// Check the issue: when we filter(Boolean), CUSIP lines get isolated
// Let's manually count how many records we should have
// (Robinhood Sell INTC on line 8-9 should be one record)
console.log('\nExpected: each "Buy"/"Sell" row is 2 physical lines (header + CUSIP continuation)');
