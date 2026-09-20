import fs from 'fs';

// RFC 4180 full CSV parser that handles multiline fields within quotes
function parseCsvRows(text, delimiter = ',') {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (ch === '\r') {
        if (text[i + 1] === '\n') i++;
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some(c => c !== '')) rows.push(currentRow);
        currentRow = [];
      } else if (ch === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some(c => c !== '')) rows.push(currentRow);
        currentRow = [];
      } else {
        currentField += ch;
      }
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(c => c !== '')) rows.push(currentRow);
  }
  return rows;
}

const pyContent = fs.readFileSync('test_reconstruct.py', 'utf8');
const startMarker = 'csv_data = """';
const endMarker = '"""\n\nreader';
const rawCsv = pyContent.substring(pyContent.indexOf(startMarker) + startMarker.length, pyContent.indexOf(endMarker));
const unescapedCsv = rawCsv.replace(/\\"/g, '"');

const rows = parseCsvRows(unescapedCsv);
console.log('Total parsed rows:', rows.length);
console.log('Header row:', rows[0]);
console.log('Row 1:', rows[1]);
console.log('Row 2:', rows[2]);
