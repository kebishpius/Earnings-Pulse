// Sign handling regression checks for the local CSV parser.
// Run with: node src/utils/financialCsv.test.mjs
import { parseFinancialCsv, parseMoney } from './financialCsv.js';

let failures = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${ok ? '' : `\n         expected ${JSON.stringify(expected)}\n         actual   ${JSON.stringify(actual)}`}`);
};

// ── parseMoney ──
check('parseMoney parens negative', parseMoney('(1,234.56)'), -1234.56);
check('parseMoney trailing minus', parseMoney('1,234.56-'), -1234.56);
check('parseMoney leading minus with currency', parseMoney('-$42.10'), -42.1);
check('parseMoney EU decimal', parseMoney('1.234,56 EUR'), 1234.56);

// ── Expense-only bank export: every row unsigned, all of it is spending ──
{
  const { transactions, dataType } = parseFinancialCsv(
`Date,Description,Amount,Category
2026-08-01,AWS Cloud Server,145.00,Cloud & Infra
2026-08-05,Equinox Luxury Gym,295.00,Fitness`);
  check('expense-only dataType', dataType, 'transactions');
  check('expense-only amounts are outflows', transactions.map(t => t.amount), [-145, -295]);
  check('expense-only keeps category', transactions[0].category, 'Cloud & Infra');
}

// ── Signed statement: income stays income instead of being dropped ──
{
  const { transactions } = parseFinancialCsv(
`Date,Description,Amount
2026-08-01,Payroll Deposit,4200.00
2026-08-02,Netflix,-19.99
2026-08-03,Rent,(1800.00)`);
  check('signed statement keeps both directions',
    transactions.map(t => t.amount), [4200, -19.99, -1800]);
}

// ── Separate Debit / Credit columns ──
{
  const { transactions } = parseFinancialCsv(
`Date,Description,Debit,Credit
2026-08-01,Grocery Store,84.20,
2026-08-02,Salary,,3100.00`);
  check('debit column is an outflow', transactions[0].amount, -84.2);
  check('credit column is an inflow', transactions[1].amount, 3100);
}

// ── DR/CR indicator column ──
{
  const { transactions } = parseFinancialCsv(
`Date,Description,Amount,Dr/Cr
2026-08-01,Utility Bill,120.00,DR
2026-08-02,Refund,45.00,CR`);
  check('indicator column signs rows', transactions.map(t => t.amount), [-120, 45]);
}

// ── Broker activity export: buys out, sells and dividends in ──
{
  const { transactions, dataType } = parseFinancialCsv(
`Run Date,Action,Symbol,Description,Quantity,Price,Amount
2026-08-04,BUY,NVDA,NVIDIA CORP,50,118.50,5925.00
2026-08-09,SELL,AAPL,APPLE INC,40,224.20,8968.00
2026-08-12,DIVIDEND RECEIVED,MSFT,MICROSOFT CORP,,,92.40
2026-08-12,FEE,,COMMISSION,,,4.95`);
  check('activity file is not read as holdings', dataType, 'transactions');
  check('buy is out, sell is in, dividend is in, fee is out',
    transactions.map(t => t.amount), [-5925, 8968, 92.4, -4.95]);
  check('trade category derived', transactions.map(t => t.category),
    ['Investment', 'Investment', 'Income', 'Fees']);
}

// ── Dollar-sign prefixed amounts (real broker export format) ──
{
  const { transactions } = parseFinancialCsv(
`Run Date,Action,Symbol,Description,Quantity,Price,Amount
2026-08-04,BUY,NVDA,NVIDIA CORPORATION,50,$118.50,$5925.00
2026-08-07,SELL,AAPL,APPLE INC,40,$224.20,$8968.00
2026-08-11,DIVIDEND RECEIVED,MSFT,MICROSOFT CORPORATION,,,$92.40
2026-08-19,FEE,,TRADE COMMISSION,,,$4.95`);
  check('dollar-sign amounts: buy negative, sell positive, dividend positive, fee negative',
    transactions.map(t => t.amount), [-5925, 8968, 92.4, -4.95]);
}

// ── Bank statement: all-positive unsigned amounts treated as outflows ──
{
  const { transactions } = parseFinancialCsv(
`Date,Description,Amount,Category
2026-08-01,AWS Cloud Server,145.00,Cloud & Infra
2026-08-03,Midjourney AI Subscription,60.00,AI Tools
2026-08-18,Speculative Options Outflow,650.00,Trading Outflow`);
  check('unsigned bank statement amounts all become negative outflows',
    transactions.map(t => t.amount), [-145, -60, -650]);
  check('category column preserved from bank statement',
    transactions[0].category, 'Cloud & Infra');
}

// ── Activity export with no Amount column at all ──
{
  const { transactions } = parseFinancialCsv(
`Trade Date,Type,Symbol,Quantity,Price
2026-08-04,Bought,TSLA,10,218.80
2026-08-06,Sold,TSLA,10,241.00`);
  check('quantity x price signed by action',
    transactions.map(t => Math.round(t.amount * 100) / 100), [-2188, 2410]);
  check('description falls back to action + symbol',
    transactions.map(t => t.description), ['Bought TSLA', 'Sold TSLA']);
}

// ── Positions export with a short and a margin debit balance ──
{
  const { holdings, dataType } = parseFinancialCsv(
`Symbol,Description,Quantity,Price,Current Value
NVDA,NVIDIA Corporation,120,$118.50,$14220.00
GME,GameStop Corp,-100,$24.00,($2400.00)
TSLA,Tesla Inc,-25,$218.80,$5470.00
MARGIN,Margin Balance,,,-$8000.00`);
  check('positions dataType', dataType, 'holdings');
  check('short and margin stay negative',
    holdings.map(h => h.current_value), [14220, -2400, -5470, -8000]);
}

// ── Long/Short column ──
{
  const { holdings } = parseFinancialCsv(
`Symbol,Name,Side,Quantity,Market Value
AMD,Advanced Micro Devices,Long,80,12336.00
GME,GameStop Corp,Short,100,2400.00`);
  check('side column signs the position',
    holdings.map(h => h.current_value), [12336, -2400]);
}

// ── Plain positions file still parses unchanged ──
{
  const { holdings } = parseFinancialCsv(
`Symbol,Description,Quantity,Price,Current Value
NVDA,NVIDIA Corporation,120,$118.50,$14220.00
SWVXX,Schwab Value Advantage Cash,5000,$1.00,$5000.00
Account Total,,,,$19220.00`);
  check('summary row still dropped', holdings.length, 2);
  check('long positions unchanged', holdings.map(h => h.current_value), [14220, 5000]);
  check('cash still classified', holdings[1].asset_type, 'Cash');
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
