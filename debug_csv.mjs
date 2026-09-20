import fs from 'fs';
import { locateHeader, splitRow, findColumn, signFromAction } from './frontend/src/utils/financialCsv.js';

const pyContent = fs.readFileSync('test_reconstruct.py', 'utf8');
const startMarker = 'csv_data = """';
const endMarker = '"""\n\nreader';
const rawCsv = pyContent.substring(pyContent.indexOf(startMarker) + startMarker.length, pyContent.indexOf(endMarker));
const unescapedCsv = rawCsv.replace(/\\"/g, '"');

const lines = unescapedCsv.split(/\r\n|\r|\n/).map(l => l.trim()).filter(Boolean);
console.log('Lines count:', lines.length);
console.log('Line 0:', lines[0]);
console.log('Line 1:', lines[1]);
console.log('Line 2:', lines[2]);

const located = locateHeader(lines);
console.log('Located header:', located);
if (located) {
  const headers = splitRow(lines[located.index], located.delimiter).map(h => h.toLowerCase().replace(/\s+/g, ' ').trim());
  console.log('Headers:', headers);
  console.log('symbolIdx:', findColumn(headers, 'symbol'));
  console.log('actionIdx:', findColumn(headers, 'action'));
  console.log('quantityIdx:', findColumn(headers, 'quantity'));
  console.log('priceIdx:', findColumn(headers, 'price'));
  console.log('dateIdx:', findColumn(headers, 'date'));
  console.log('amountIdx:', findColumn(headers, 'amount'));
}
