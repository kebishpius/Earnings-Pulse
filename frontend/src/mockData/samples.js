export const SAMPLE_QUERIES = [
  { label: "Apple Q3 2026", query: "Apple Q3 2026 earnings report revenue iPhone services", ticker: "AAPL" },
  { label: "NVIDIA Q2 FY26", query: "NVIDIA Q2 FY2026 earnings report data center guidance", ticker: "NVDA" },
  { label: "Microsoft Cloud", query: "Microsoft Q4 2026 earnings release Azure cloud revenue", ticker: "MSFT" },
  { label: "Tesla Auto Margins", query: "Tesla recent quarterly earnings automotive margins robotaxi 2026", ticker: "TSLA" },
  { label: "Amazon AWS", query: "Amazon Q2 2026 earnings AWS operating income capex", ticker: "AMZN" },
];

export const INITIAL_PORTFOLIO = {
  holdings: [
    { symbol: "NVDA", asset_name: "NVIDIA Corp", asset_type: "Equity", allocation_pct: 48.5, current_value: 48500.00 },
    { symbol: "AAPL", asset_name: "Apple Inc", asset_type: "Equity", allocation_pct: 22.0, current_value: 22000.00 },
    { symbol: "BTC", asset_name: "Bitcoin (Spot)", asset_type: "Crypto", allocation_pct: 17.5, current_value: 17500.00 },
    { symbol: "TSLA", asset_name: "Tesla Inc", asset_type: "Equity", allocation_pct: 8.0, current_value: 8000.00 },
    { symbol: "USD", asset_name: "Cash & Treasuries", asset_type: "Cash", allocation_pct: 4.0, current_value: 4000.00 }
  ],
  transactions: [
    { id: "tx-1", date: "2026-08-01", description: "AWS Cloud Dedicated Cluster", amount: 240.00, category: "Infrastructure" },
    { id: "tx-2", date: "2026-08-03", description: "Midjourney Pro Tier Subscription", amount: 60.00, category: "AI Tools" },
    { id: "tx-3", date: "2026-08-05", description: "Equinox All-Access Health Club", amount: 330.00, category: "Fitness" },
    { id: "tx-4", date: "2026-08-08", description: "Spotify Duo Account (Redundant)", amount: 16.99, category: "Entertainment" },
    { id: "tx-5", date: "2026-08-12", description: "Bloomberg Terminal Specialist Add-on", amount: 450.00, category: "Financial Data" },
    { id: "tx-6", date: "2026-08-16", description: "Unusual Late Night Luxury Dining Outflow", amount: 620.00, category: "Discretionary" },
    { id: "tx-7", date: "2026-08-20", description: "ChatGPT Plus Enterprise Seat", amount: 50.00, category: "AI Tools" }
  ]
};
