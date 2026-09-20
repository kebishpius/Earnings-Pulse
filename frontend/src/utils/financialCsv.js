// Broker and bank CSV parsing.
//
// This runs whenever /api/upload-data/parse is unreachable, which for a local
// demo is most of the time, so it has to cope with what brokers actually
// export rather than with a tidy four-column sample: quoted fields containing
// commas, "$14,220.00" money formatting, leading account columns, preamble
// rows above the real header, and CRLF line endings.
//
// Sign convention, which everything downstream depends on:
//
//   transactions[].amount     negative = cash out (spending, buys, fees)
//                             positive = cash in  (income, sale proceeds, dividends)
//   holdings[].current_value  negative = short position or margin debit balance
//
// Exports disagree about how they encode direction — some sign the amount, some
// use separate Debit/Credit columns, some leave every number positive and only
// say "Buy" or "Sell" in an action column — so the sign is reconstructed from
// whichever of those a given file provides, and only assumed when the file
// states nothing at all.

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

// Handles "$14,220.00", "(1,234.56)" and "1,234.56-" for negatives, "1.234,56"
// EU decimals, trailing currency codes, and bare "--" placeholders.
export const parseMoney = (raw) => {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  if (!s || s === '--' || s === '-' || /^n\/a$/i.test(s)) return null;

  // Accounting parentheses and a trailing minus mean the same thing; bank
  // exports built on mainframe reports still use the second one.
  const isParenNegative = /^\(.*\)$/.test(s);
  if (isParenNegative) s = s.slice(1, -1);
  const isTrailingNegative = /\d\s*-$/.test(s);
  if (isTrailingNegative) s = s.replace(/-\s*$/, '');

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
  return (isParenNegative || isTrailingNegative) ? -Math.abs(n) : n;
};

// Whether a cell states its own direction. A signed amount is authoritative; an
// unsigned one has to take its sign from an action or debit/credit column.
const hasExplicitSign = (raw) => {
  // The sign can sit either side of the currency symbol: "-$42.10", "$-42.10".
  const s = String(raw ?? '').trim().replace(/^[^\d.,()+-]+/, '');
  return /^[-+(]/.test(s) || /\d\s*-$/.test(s);
};

// Keeps dots and hyphens so BRK.B and RY-PA survive, unlike a bare A-Z strip.
export const normalizeSymbol = (raw) =>
  String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/^\$/, '')
    .replace(/[^A-Z0-9.\-]/g, '')
    .slice(0, 12);

// ── Direction ───────────────────────────────────────────────────────────────

// Reads a direction out of an action / activity / transaction-type cell.
// Differentiates between security trades (selling stock = cash in) and
// retail card transactions ("Sale" at a merchant = cash out).
const ACTION_SIGNS = [
  [/margin interest|interest (charge|paid|expense)|advisory fee|management fee/i, -1],
  [/buy to (open|close|cover)|bought to cover|cover short/i, -1],
  [/sell to (open|close)|short sale|sold short/i, 1],
  [/dividend|distribution|capital gain|coupon|interest/i, 1],
  [/\b(sell|sold|selling)\b|redemption|redeem|proceeds|liquidat/i, 1],
  [/\b(buy|buys|bought|bot|purchase|reinvest)\b/i, -1],
  [/deposit|transfer in|incoming|refund|reimburs|rebate|cash ?back|payroll|salary|\bincome\b|\bcredit\b|received/i, 1],
  [/withdraw|transfer out|outgoing|\bfees?\b|commission|\btax\b|\bcharges?\b|payment|\bdebit\b|expense/i, -1],
  // Retail point-of-sale card transaction (e.g. Chase/Amex/BoA card "Sale")
  [/\b(sale|pos sale|card sale|debit sale|point of sale)\b/i, -1],
];

// Resolves sign from an action/type cell, taking into account whether a stock ticker is present
const signFromAction = (raw, { symbol = '' } = {}) => {
  const s = String(raw ?? '').toLowerCase().trim();
  if (!s) return 0;

  // In card/merchant statements, "Sale" is an outflow (spending).
  // Only if there is an explicit stock symbol or security context is "Sale" proceeds.
  if (/^(sale|pos sale|debit sale|card sale)$/i.test(s)) {
    return symbol && symbol !== 'USD' && !/cash/i.test(symbol) ? 1 : -1;
  }

  for (const [pattern, sign] of ACTION_SIGNS) {
    if (pattern.test(s)) return sign;
  }
  return 0;
};

// Infers direction from description when no action column exists or action is ambiguous
const signFromDescription = (desc = '') => {
  const s = String(desc || '').toLowerCase().trim();
  if (!s) return 0;

  // Clear Inflows
  if (/payroll|salary|direct dep|paycheck|bonus|tax refund|dividend|interest (paid|earned|credit|income)|cash ?back|rebate|zelle from|venmo from/i.test(s)) {
    return 1;
  }
  // Securities trades in description
  if (/\b(sell|sold|selling)\b.*\b([A-Z]{1,5}|shares?|stock|crypto)\b/i.test(s)) {
    return 1;
  }
  if (/\b(buy|buys|buying|bought|purchas(e|es|ing|ed)?)\b.*\b([A-Z]{1,5}|shares?|stock|crypto)\b/i.test(s)) {
    return -1;
  }
  // Clear Outflows & Common Merchant / Discretionary Expenses
  if (/payment to|purchase|atm withdrawal|withdrawal|wire out|\bfee\b|subscription|\bsub\b|uber|lyft|starbucks|amazon|walmart|target|netflix|spotify|equinox|gym|aws|cloud|chatgpt|midjourney|doordash|instacart|restaurant|cafe|coffee|grocery|groceries|electric|water|gas bill|utility|utilities|rent\b|mortgage|insurance|airline|flight|hotel|airbnb|apple\.com\/bill|google \*/i.test(s)) {
    return -1;
  }
  return 0;
};

// A dedicated direction column, as UK and EU banks export it.
const signFromIndicator = (raw) => {
  const s = String(raw ?? '').toLowerCase().trim();
  if (!s) return 0;
  if (/^(d|dr|debit|w|withdrawal|out|payment)$/.test(s)) return -1;
  if (/^(c|cr|credit|deposit|in|refund)$/.test(s)) return 1;
  return 0;
};

// Long/Short column on a positions export.
const signFromSide = (raw) => {
  const s = String(raw ?? '').toLowerCase().trim();
  if (!s) return 0;
  if (/^(short|shrt|s|sell|sold|selling|sld)$/.test(s)) return -1;
  if (/^(long|lng|l|buy|bot|bought)$/.test(s)) return 1;
  return 0;
};

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
  amount: ['transaction amount', 'net amount', 'net cash amount', 'cash amount', 'amount'],
  debit: ['debit amount', 'withdrawal amount', 'debit', 'withdrawals', 'withdrawal', 'money out', 'paid out'],
  credit: ['credit amount', 'deposit amount', 'credit', 'deposits', 'deposit', 'money in', 'paid in'],
  indicator: ['debit/credit', 'dr/cr', 'cr/dr', 'debit or credit', 'debit credit indicator', 'direction'],
  action: ['action', 'activity type', 'activity', 'transaction type', 'trans type', 'order type', 'trade type', 'buy/sell', 'type', 'side'],
  side: ['long/short', 'long short', 'position type', 'side'],
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

// Known expense categories where positive amounts must be treated as outflows
const EXPENSE_CATEGORIES = new Set([
  'subscription', 'food & dining', 'dining', 'food', 'restaurants', 'groceries',
  'travel', 'shopping', 'entertainment', 'utilities', 'fitness', 'healthcare',
  'cloud & infra', 'ai tools', 'finance sub', 'fees', 'trading outflow', 'personal'
]);

// Ledger category derivation incorporating action, amount, and description
const deriveCategory = (action = '', amount = 0, description = '') => {
  const combined = `${action} ${description}`.toLowerCase();

  // Subscriptions & Recurring SaaS
  if (/subscription|spotify|netflix|midjourney|chatgpt|aws|cloud|gym|equinox|bloomberg|adobe|prime|hulu|disney|github|patreon/i.test(combined)) {
    return 'Subscription';
  }
  // Food & Dining
  if (/starbucks|doordash|uber eats|grubhub|restaurant|cafe|coffee|trader joe|whole foods|grocer|food|dining|chipotle|mcdonald/i.test(combined)) {
    return 'Food & Dining';
  }
  // Travel & Transport
  if (/uber|lyft|airline|flight|hotel|airbnb|delta|united|gas|shell|chevron|parking|transit/i.test(combined)) {
    return 'Travel';
  }
  // Shopping
  if (/amazon|target|walmart|costco|ebay|best buy|apple store|ikea|shopping/i.test(combined)) {
    return 'Shopping';
  }
  // Utilities & Housing
  if (/electric|water|gas bill|utility|utilities|internet|comcast|verizon|rent|mortgage/i.test(combined)) {
    return 'Utilities';
  }
  // Fees & Commissions
  if (/\bfees?\b|commission|\btax\b|interest charge|atm fee/i.test(combined)) {
    return 'Fees';
  }
  // Securities Investment
  if (/buy|sell|sold|selling|bought|trade|shares?|stock|reinvest|redeem|dividend|distribution/i.test(combined)) {
    if (/dividend|distribution|interest|coupon|capital gain/i.test(combined)) return 'Income';
    return 'Investment';
  }
  // Income
  if (/payroll|salary|direct dep|paycheck|bonus|refund|rebate|cashback/i.test(combined)) {
    return 'Income';
  }
  return amount > 0 ? 'Income' : 'Other';
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Parses a broker positions export, a trade activity export or a bank statement
 * into the shapes the portfolio auditor expects. Amounts and values come back
 * signed — see the sign convention at the top of this file. Throws with a
 * specific reason when the text is not usable, so the UI can say what is wrong
 * instead of "import failed".
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
  const dateIdx = findColumn(headers, 'date');
  const actionIdx = findColumn(headers, 'action');

  // Resolved outermost-first so "Debit/Credit" is not taken for the debit
  // column and "Debit Amount" is not taken for the amount column.
  const indicatorIdx = findColumn(headers, 'indicator');
  const debitIdx = findColumn(headers, 'debit', { exclude: [indicatorIdx] });
  const creditIdx = findColumn(headers, 'credit', { exclude: [indicatorIdx, debitIdx] });
  const amountIdx = findColumn(headers, 'amount', { exclude: [indicatorIdx, debitIdx, creditIdx] });

  const hasCashColumn = amountIdx !== -1 || debitIdx !== -1 || creditIdx !== -1;
  const hasDirectionalActions = actionIdx !== -1 && dataRows.some(cols => signFromAction(cols[actionIdx]) !== 0);

  // A trade activity export ("Date, Action, Symbol, Quantity, Price, Amount")
  // names the same instruments a positions file does, so symbol + quantity is
  // not enough to tell them apart. Rows that say Buy/Sell, and dated rows that
  // move cash, are activity — reading those as positions is what turned every
  // sale into something the user supposedly still owns.
  const isActivity = hasDirectionalActions || (dateIdx !== -1 && hasCashColumn);
  const isHoldings = symbolIdx !== -1 && (valueIdx !== -1 || quantityIdx !== -1) && !isActivity;

  if (isHoldings) {
    const nameIdx = findColumn(headers, 'name', { exclude: [symbolIdx] });
    const sideIdx = findColumn(headers, 'side');
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

      const qty = quantityIdx !== -1 ? parseMoney(cols[quantityIdx]) : null;
      let value = valueIdx !== -1 ? parseMoney(cols[valueIdx]) : null;
      if (value === null || value === 0) {
        const price = priceIdx !== -1 ? parseMoney(cols[priceIdx]) : null;
        if (qty !== null && price !== null) value = qty * price;
      }
      if (value === null || value === 0) { skipped++; continue; }

      // A short position and a margin debit balance are liabilities, not
      // assets. Brokers mark them with a Long/Short column, a negative quantity
      // or a negative market value, and only one of the three is guaranteed to
      // be present — so keep whichever the file gives instead of flattening all
      // of them with Math.abs().
      const side = sideIdx !== -1 ? signFromSide(cols[sideIdx]) : 0;
      let sign = value < 0 ? -1 : 1;
      if (side !== 0) sign = side;
      else if (qty !== null && qty < 0) sign = -1;

      holdings.push({
        symbol,
        asset_name: name || symbol,
        asset_type: classifyAsset(symbol, name),
        current_value: sign * Math.abs(value),
        allocation_pct: 0,
      });
    }

    if (holdings.length === 0) {
      throw new Error('Found a positions header but no row had a usable market value. Check that a Value, or a Quantity and Price, column is present.');
    }
    return { holdings, transactions: [], dataType: 'holdings', skipped };
  }

  // ── Cash ledger / trade activity ──
  const descIdx = findColumn(headers, 'description', { exclude: [dateIdx, amountIdx, debitIdx, creditIdx, actionIdx] });
  const categoryIdx = findColumn(headers, 'category', { exclude: [dateIdx, amountIdx, debitIdx, creditIdx, descIdx] });

  const canPriceTrades = quantityIdx !== -1 && priceIdx !== -1;
  if (!hasCashColumn && !canPriceTrades) {
    throw new Error('No Amount column found. A statement needs Date, Description and Amount columns; a trade export needs Quantity and Price.');
  }

  // Resolves one row to a signed cash movement, or null when it moves none.
  const signedAmount = (cols) => {
    const rawAmount = amountIdx !== -1 ? cols[amountIdx] : null;
    let amount = rawAmount !== null ? parseMoney(rawAmount) : null;
    let stated = amount !== null && (amount < 0 || hasExplicitSign(rawAmount));

    // Two-column statements: the column a number lands in is its direction.
    if (amount === null && (debitIdx !== -1 || creditIdx !== -1)) {
      const debit = debitIdx !== -1 ? parseMoney(cols[debitIdx]) : null;
      const credit = creditIdx !== -1 ? parseMoney(cols[creditIdx]) : null;
      if (debit) { amount = -Math.abs(debit); stated = true; }
      else if (credit) { amount = Math.abs(credit); stated = true; }
    }

    // Trade rows with no cash column at all: quantity x price is the cash moved.
    if (amount === null && canPriceTrades) {
      const qty = parseMoney(cols[quantityIdx]);
      const price = parseMoney(cols[priceIdx]);
      if (qty !== null && price !== null) amount = Math.abs(qty * price);
    }

    if (amount === null || amount === 0) return null;

    const symbol = symbolIdx !== -1 ? normalizeSymbol(cols[symbolIdx]) : '';
    const actionRaw = actionIdx !== -1 ? cols[actionIdx] : '';
    const descRaw = descIdx !== -1 ? cols[descIdx] : '';
    const catRaw = categoryIdx !== -1 ? String(cols[categoryIdx] || '').trim().toLowerCase() : '';

    const actionSign = actionIdx !== -1 ? signFromAction(actionRaw, { symbol }) : 0;
    const indicatorSign = indicatorIdx !== -1 ? signFromIndicator(cols[indicatorIdx]) : 0;
    const descSign = signFromDescription(descRaw);

    // If explicit direction from action (e.g. BUY, SELL, Sale, Payment) or indicator (DR, CR):
    if (actionSign !== 0) return actionSign * Math.abs(amount);
    if (indicatorSign !== 0) return indicatorSign * Math.abs(amount);

    // If amount has explicit sign in the cell (e.g. -$42 or +$100 or (12.50))
    if (stated) return amount;

    // If description clearly indicates direction (e.g. Starbucks, Uber, Payroll, Sell AAPL):
    if (descSign !== 0) return descSign * Math.abs(amount);

    // If category is a known expense category:
    if (catRaw && EXPENSE_CATEGORIES.has(catRaw)) {
      return -Math.abs(amount);
    }

    return amount;
  };

  const amounts = dataRows.map(signedAmount);

  // An expense-only export — every number positive, no sign, no direction
  // column, no Buy/Sell — is a list of outflows. Only assume that when the file
  // says nothing itself: on a statement that does sign its rows, an unsigned
  // positive is genuinely a credit and stays income.
  const statesDirection = indicatorIdx !== -1 || hasDirectionalActions
    || debitIdx !== -1 || creditIdx !== -1
    || (amountIdx !== -1 && dataRows.some(cols => hasExplicitSign(cols[amountIdx])));
  const allOutflows = !statesDirection && amounts.every(a => a === null || a > 0);

  const transactions = [];
  let skipped = 0;

  dataRows.forEach((cols, i) => {
    const label = descIdx !== -1 ? (cols[descIdx] || '') : '';
    const action = actionIdx !== -1 ? String(cols[actionIdx] || '').trim() : '';
    if (isSummaryRow(label)) return;

    let amount = amounts[i];
    if (amount === null) { skipped++; return; }
    if (allOutflows) amount = -Math.abs(amount);

    const symbol = symbolIdx !== -1 ? normalizeSymbol(cols[symbolIdx]) : '';
    const rawCategory = categoryIdx !== -1 ? String(cols[categoryIdx] || '').trim() : '';
    const effectiveCategory = (rawCategory && signFromAction(rawCategory) === 0 ? rawCategory : '') || deriveCategory(action, amount, label);

    // Guard: If amount is positive but the category or merchant indicates spending/expense,
    // ensure it is properly signed as an outflow unless explicitly marked as income/refund.
    if (amount > 0 && EXPENSE_CATEGORIES.has(effectiveCategory.toLowerCase())) {
      const isExplicitIncome = /payroll|salary|direct dep|paycheck|refund|rebate|cash ?back|dividend|interest credit/i.test(`${action} ${label}`);
      if (!isExplicitIncome) {
        amount = -Math.abs(amount);
      }
    }

    transactions.push({
      date: dateIdx !== -1 ? (cols[dateIdx] || '') : '',
      // A trade row has no merchant, so "Sell NVDA" beats "Transaction 4".
      description: label || [action, symbol].filter(Boolean).join(' ') || `Transaction ${i + 1}`,
      amount,
      category: effectiveCategory,
    });
  });

  if (transactions.length === 0) {
    throw new Error('Found a statement header but no row had a usable amount.');
  }
  return { holdings: [], transactions, dataType: 'transactions', skipped };
};
