// Broker and bank CSV parsing.
//
// This runs whenever /api/upload-data/parse is unreachable, which for a local
// demo is most of the time, so it has to cope with what brokers actually
// export rather than with a tidy four-column sample: quoted fields containing
// commas, "$14,220.00" money formatting, leading account columns, preamble
// rows above the real header, and CRLF line endings.

// ── Low-level CSV ───────────────────────────────────────────────────────────

// RFC 4180 split: quoted fields may contain the delimiter, and "" is an
// escaped quote. A naive split() on the delimiter is what broke Schwab and
// Fidelity exports, so every caller goes through this.
const splitRow = (line, delimiter) => {
  const out = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(field.trim());
      field = '';
    } else {
      field += ch;
    }
  }
  out.push(field.trim());
  return out;
};

// Brokers export comma, tab and (in EU locales) semicolon separated files.
// Whichever character yields the most columns on the header row wins.
const detectDelimiter = (line) => {
  let best = ',';
  let bestCount = 0;
  for (const d of [',', '\t', ';', '|']) {
    const count = splitRow(line, d).length;
    if (count > bestCount) { bestCount = count; best = d; }
  }
  return best;
};

// ── Value coercion ──────────────────────────────────────────────────────────

// Handles "$14,220.00", "(1,234.56)" for negatives, "1.234,56" EU decimals,
// trailing currency codes, and bare "--" placeholders.
export const parseMoney = (raw) => {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  if (!s || s === '--' || s === '-' || /^n\/a$/i.test(s)) return null;

  const isParenNegative = /^\(.*\)$/.test(s);
  if (isParenNegative) s = s.slice(1, -1);

  s = s.replace(/[^\d.,-]/g, '');
  if (!s) return null;

  // "1.234,56" (EU) vs "1,234.56" (US): whichever separator comes last is the
  // decimal point. A lone comma with exactly two trailing digits is decimal.
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma > -1) {
    s = /,\d{2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  }

  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return isParenNegative ? -Math.abs(n) : n;
};

// Keeps dots and hyphens so BRK.B and RY-PA survive, unlike a bare A-Z strip.
export const normalizeSymbol = (raw) =>
  String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
    .replace(/[^A-Z0-9.\-]/g, '')
    .slice(0, 12);

// ── Header mapping ──────────────────────────────────────────────────────────

// Column aliases, most specific first so "current value" is preferred over a
// generic "value" and "last price" over a bare "price".
const COLUMN_ALIASES = {
  symbol: ['symbol', 'ticker symbol', 'ticker', 'security symbol', 'stock', 'instrument'],
  name: ['security description', 'security name', 'asset name', 'investment name', 'description', 'security', 'company', 'name'],
  quantity: ['quantity', 'share quantity', 'number of shares', 'shares', 'qty', 'units'],
  price: ['last price', 'current price', 'market price', 'price per share', 'close price', 'price'],
  value: ['current value', 'market value', 'position value', 'total value', 'ending value', 'value', 'total'],
  date: ['transaction date', 'trade date', 'posting date', 'post date', 'activity date', 'settlement date', 'date'],
  description: ['transaction description', 'description', 'merchant', 'payee', 'memo', 'details', 'name'],
  amount: ['transaction amount', 'amount', 'debit', 'withdrawal', 'credit', 'deposit'],
  category: ['category', 'classification', 'transaction type', 'type'],
};

const findColumn = (headers, field, { exclude = [] } = {}) => {
  for (const alias of COLUMN_ALIASES[field]) {
    const idx = headers.findIndex((h, i) => h === alias && !exclude.includes(i));
    if (idx !== -1) return idx;
  }
  // Fall back to a substring match for headers like "Market Value (USD)".
  for (const alias of COLUMN_ALIASES[field]) {
    const idx = headers.findIndex((h, i) => h.includes(alias) && !exclude.includes(i));
    if (idx !== -1) return idx;
  }
  return -1;
};

const HEADER_HINTS = [
  'symbol', 'ticker', 'description', 'quantity', 'shares',
  'amount', 'date', 'price', 'value', 'merchant', 'category',
];

// Broker exports often open with "Positions for account ..." and a blank line
// before the real header, so locate the first row that looks like a header
// rather than assuming line 0.
const locateHeader = (lines) => {
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const lower = lines[i].toLowerCase();
    if (!HEADER_HINTS.some(h => lower.includes(h))) continue;
    const delimiter = detectDelimiter(lines[i]);
    const cells = splitRow(lines[i], delimiter);
    if (cells.filter(Boolean).length >= 2) return { index: i, delimiter };
  }
  return null;
};

// ── Row classification ──────────────────────────────────────────────────────

const CASH_SYMBOLS = new Set(['USD', 'CASH', 'SPAXX', 'FDRXX', 'SWVXX', 'VMFXX', 'FZFXX', 'SPRXX']);
const CRYPTO_SYMBOLS = new Set(['BTC', 'ETH', 'SOL', 'DOGE', 'ADA', 'XRP', 'LTC', 'AVAX', 'DOT']);
const ETF_SYMBOLS = new Set(['SPY', 'QQQ', 'VOO', 'VTI', 'IWM', 'DIA', 'VEA', 'VWO', 'AGG', 'BND', 'ARKK', 'SCHD']);

// Summary rows ("Account Total", "Grand Total") are not positions and would
// otherwise double the portfolio value.
const isSummaryRow = (label) => /^(account\s+)?(grand\s+)?totals?$|^subtotal|^sum$/i.test(String(label ?? '').trim());

const classifyAsset = (symbol, name = '') => {
  const n = String(name).toLowerCase();
  if (CASH_SYMBOLS.has(symbol) || /money market|cash (balance|reserve|investment)|sweep/.test(n)) return 'Cash';
  if (CRYPTO_SYMBOLS.has(symbol) || /bitcoin|ethereum|crypto/.test(n)) return 'Crypto';
  if (ETF_SYMBOLS.has(symbol) || /\betf\b|index fund|trust|\bfund\b/.test(n)) return 'ETF';
  if (/\bbond\b|treasury|t-bill/.test(n)) return 'Bond';
  return 'Equity';
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Parses a broker positions export or a bank statement into the shapes the
 * portfolio auditor expects. Throws with a specific reason when the text is
 * not usable, so the UI can say what is wrong instead of "import failed".
 */
export const parseFinancialCsv = (rawText) => {
  const text = String(rawText || '').replace(/^﻿/, '');
  const lines = text.split(/\r\n|\r|\n/).map(l => l.trim()).filter(Boolean);

  if (lines.length < 2) {
    throw new Error('This file needs a header row and at least one data row.');
  }

  const located = locateHeader(lines);
  if (!located) {
    throw new Error('No recognizable header row found. Expected columns such as Symbol, Quantity and Value, or Date, Description and Amount.');
  }

  const { index: headerIdx, delimiter } = located;
  const headers = splitRow(lines[headerIdx], delimiter).map(h => h.toLowerCase().replace(/\s+/g, ' ').trim());
  const dataRows = lines.slice(headerIdx + 1)
    .map(line => splitRow(line, delimiter))
    .filter(cols => cols.some(c => c !== ''));

  if (dataRows.length === 0) {
    throw new Error('The header row was found but there are no data rows beneath it.');
  }

  const symbolIdx = findColumn(headers, 'symbol');
  const valueIdx = findColumn(headers, 'value');
  const quantityIdx = findColumn(headers, 'quantity');
  const priceIdx = findColumn(headers, 'price');

  // A positions file is one that identifies an instrument and says how much of
  // it is held. Anything else is treated as a cash ledger.
  const isHoldings = symbolIdx !== -1 && (valueIdx !== -1 || quantityIdx !== -1);

  if (isHoldings) {
    const nameIdx = findColumn(headers, 'name', { exclude: [symbolIdx] });
    const holdings = [];
    let skipped = 0;

    for (const cols of dataRows) {
      const rawSymbol = cols[symbolIdx] ?? '';
      // Brokers pad empty description cells with "--" rather than leaving them
      // blank, which would otherwise become the asset name.
      const rawName = nameIdx !== -1 ? (cols[nameIdx] || '') : '';
      const name = (rawName && rawName !== '--' ? rawName : '') || rawSymbol;
      if (isSummaryRow(rawSymbol) || isSummaryRow(name)) continue;

      // Schwab writes its cash line as "Cash & Cash Investments" in the symbol
      // column, which is not a ticker but is a real position.
      let symbol = normalizeSymbol(rawSymbol);
      if (/cash/i.test(rawSymbol) && (!symbol || symbol.length > 6)) symbol = 'USD';
      if (!symbol) { skipped++; continue; }

      let value = valueIdx !== -1 ? parseMoney(cols[valueIdx]) : null;
      if (value === null || value === 0) {
        const qty = quantityIdx !== -1 ? parseMoney(cols[quantityIdx]) : null;
        const price = priceIdx !== -1 ? parseMoney(cols[priceIdx]) : null;
        if (qty !== null && price !== null) value = qty * price;
      }
      if (value === null || Math.abs(value) === 0) { skipped++; continue; }

      holdings.push({
        symbol,
        asset_name: name || symbol,
        asset_type: classifyAsset(symbol, name),
        current_value: Math.abs(value),
        allocation_pct: 0,
      });
    }

    if (holdings.length === 0) {
      throw new Error('Found a positions header but no row had a usable market value. Check that a Value, or a Quantity and Price, column is present.');
    }
    return { holdings, transactions: [], dataType: 'holdings', skipped };
  }

  // ── Cash ledger ──
  const dateIdx = findColumn(headers, 'date');
  const amountIdx = findColumn(headers, 'amount');
  const descIdx = findColumn(headers, 'description', { exclude: [dateIdx, amountIdx] });
  const categoryIdx = findColumn(headers, 'category', { exclude: [dateIdx, amountIdx, descIdx] });

  if (amountIdx === -1) {
    throw new Error('No Amount column found. A statement needs Date, Description and Amount columns.');
  }

  // Statements sign outflows negative and income positive. When both appear,
  // only the outflows are spending; when every row is positive the file is an
  // expense-only export and all of it counts.
  const amounts = dataRows.map(cols => parseMoney(cols[amountIdx]));
  const hasNegatives = amounts.some(a => a !== null && a < 0);

  const transactions = [];
  let skipped = 0;

  dataRows.forEach((cols, i) => {
    const amount = amounts[i];
    const label = descIdx !== -1 ? cols[descIdx] : '';
    if (isSummaryRow(label)) return;
    if (amount === null || amount === 0) { skipped++; return; }
    if (hasNegatives && amount > 0) return; // a credit, not spending

    transactions.push({
      date: dateIdx !== -1 ? (cols[dateIdx] || '') : '',
      description: label || `Transaction ${i + 1}`,
      amount: Math.abs(amount),
      category: (categoryIdx !== -1 ? cols[categoryIdx] : '') || 'Other',
    });
  });

  if (transactions.length === 0) {
    throw new Error('Found a statement header but no row had a usable amount.');
  }
  return { holdings: [], transactions, dataType: 'transactions', skipped };
};
