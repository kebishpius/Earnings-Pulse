export const POPULAR_COMPANIES = [
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    sector: "Consumer Tech & Services",
    exchange: "NASDAQ",
    defaultQuarter: "Q3 2026",
    query: "Apple Q3 2026 earnings report revenue iPhone services"
  },
  {
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    sector: "Semiconductors & AI Hardware",
    exchange: "NASDAQ",
    defaultQuarter: "Q2 FY2026",
    query: "NVIDIA Q2 FY2026 earnings report data center guidance"
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corporation",
    sector: "Cloud Infrastructure & Software",
    exchange: "NASDAQ",
    defaultQuarter: "Q4 2026",
    query: "Microsoft Q4 2026 earnings release Azure cloud revenue"
  },
  {
    ticker: "GOOGL",
    name: "Alphabet Inc. (Google)",
    sector: "Search, Advertising & Cloud",
    exchange: "NASDAQ",
    defaultQuarter: "Q2 2026",
    query: "Alphabet Google Q2 2026 earnings report cloud advertising"
  },
  {
    ticker: "AMZN",
    name: "Amazon.com Inc.",
    sector: "E-Commerce & Cloud (AWS)",
    exchange: "NASDAQ",
    defaultQuarter: "Q2 2026",
    query: "Amazon Q2 2026 earnings AWS operating income capex"
  },
  {
    ticker: "TSLA",
    name: "Tesla Inc.",
    sector: "Electric Vehicles & Energy",
    exchange: "NASDAQ",
    defaultQuarter: "Q2 2026",
    query: "Tesla recent quarterly earnings automotive margins robotaxi 2026"
  },
  {
    ticker: "META",
    name: "Meta Platforms Inc.",
    sector: "Social Media & Metaverse AI",
    exchange: "NASDAQ",
    defaultQuarter: "Q2 2026",
    query: "Meta Platforms Q2 2026 earnings ad impressions reality labs"
  },
  {
    ticker: "AMD",
    name: "Advanced Micro Devices",
    sector: "Semiconductors & Processors",
    exchange: "NASDAQ",
    defaultQuarter: "Q2 2026",
    query: "AMD Q2 2026 earnings report data center MI300 revenue"
  },
  {
    ticker: "PLTR",
    name: "Palantir Technologies",
    sector: "Enterprise AI & Defense Analytics",
    exchange: "NYSE",
    defaultQuarter: "Q2 2026",
    query: "Palantir Q2 2026 earnings commercial AIP customer growth"
  },
  {
    ticker: "NFLX",
    name: "Netflix Inc.",
    sector: "Streaming & Digital Media",
    exchange: "NASDAQ",
    defaultQuarter: "Q2 2026",
    query: "Netflix Q2 2026 earnings subscriber additions ad tier"
  },
  {
    ticker: "CRM",
    name: "Salesforce Inc.",
    sector: "Enterprise Software & CRM",
    exchange: "NYSE",
    defaultQuarter: "Q2 FY2026",
    query: "Salesforce Q2 FY2026 earnings Agentforce cloud operating margin"
  },
  {
    ticker: "COIN",
    name: "Coinbase Global Inc.",
    sector: "Crypto Exchange & Custody",
    exchange: "NASDAQ",
    defaultQuarter: "Q2 2026",
    query: "Coinbase Q2 2026 earnings transaction revenue institutional"
  },
  {
    ticker: "ARM",
    name: "Arm Holdings plc",
    sector: "Semiconductor Architecture IP",
    exchange: "NASDAQ",
    defaultQuarter: "Q1 FY2026",
    query: "Arm Holdings Q1 FY2026 earnings royalty revenue v9"
  },
  {
    ticker: "AVGO",
    name: "Broadcom Inc.",
    sector: "AI Networking & Infrastructure",
    exchange: "NASDAQ",
    defaultQuarter: "Q3 FY2026",
    query: "Broadcom Q3 FY2026 earnings AI networking VMware integration"
  },
  {
    ticker: "SMCI",
    name: "Super Micro Computer",
    sector: "AI Server Solutions",
    exchange: "NASDAQ",
    defaultQuarter: "Q4 FY2026",
    query: "Super Micro Computer earnings liquid cooling server rack demand 2026"
  },
  {
    ticker: "INTC",
    name: "Intel Corporation",
    sector: "Semiconductors & Foundry",
    exchange: "NASDAQ",
    defaultQuarter: "Q2 2026",
    query: "Intel Q2 2026 earnings foundry losses restructuring 18A node"
  },
  {
    ticker: "UBER",
    name: "Uber Technologies",
    sector: "Mobility & Delivery Platform",
    exchange: "NYSE",
    defaultQuarter: "Q2 2026",
    query: "Uber Q2 2026 earnings gross bookings autonomous mobility"
  },
  {
    ticker: "SNOW",
    name: "Snowflake Inc.",
    sector: "Cloud Data Platform",
    exchange: "NYSE",
    defaultQuarter: "Q2 FY2026",
    query: "Snowflake Q2 FY2026 earnings product revenue net retention"
  },
  {
    ticker: "CRWD",
    name: "CrowdStrike Holdings",
    sector: "Cybersecurity & Threat Intel",
    exchange: "NASDAQ",
    defaultQuarter: "Q2 FY2026",
    query: "CrowdStrike Q2 FY2026 earnings ARR Falcon platform growth"
  },
  {
    ticker: "ORCL",
    name: "Oracle Corporation",
    sector: "Database & Cloud Infrastructure",
    exchange: "NYSE",
    defaultQuarter: "Q1 FY2026",
    query: "Oracle Q1 FY2026 earnings multicloud database OCI infrastructure"
  },
  {
    ticker: "JPM",
    name: "JPMorgan Chase & Co.",
    sector: "Banking & Financial Services",
    exchange: "NYSE",
    defaultQuarter: "Q2 2026",
    query: "JPMorgan Chase Q2 2026 earnings net interest income markets"
  },
  {
    ticker: "DIS",
    name: "The Walt Disney Company",
    sector: "Entertainment & Theme Parks",
    exchange: "NYSE",
    defaultQuarter: "Q3 FY2026",
    query: "Disney Q3 FY2026 earnings streaming profitability parks income"
  },
  {
    ticker: "WMT",
    name: "Walmart Inc.",
    sector: "Retail & E-Commerce",
    exchange: "NYSE",
    defaultQuarter: "Q2 FY2026",
    query: "Walmart Q2 FY2026 earnings e-commerce growth US comp sales"
  },
  {
    ticker: "LLY",
    name: "Eli Lilly and Company",
    sector: "Pharmaceuticals & Healthcare",
    exchange: "NYSE",
    defaultQuarter: "Q2 2026",
    query: "Eli Lilly Q2 2026 earnings Mounjaro Zepbound sales capacity"
  }
];

export function getCompanySuggestions(searchTerm, limit = 6) {
  if (!searchTerm || !searchTerm.trim()) {
    // Return top popular suggestions when query is empty
    return POPULAR_COMPANIES.slice(0, limit);
  }

  const term = searchTerm.trim().toLowerCase();
  const tokens = term.split(/\s+/).filter(Boolean);

  const scored = POPULAR_COMPANIES.map(company => {
    const tickerLower = company.ticker.toLowerCase();
    const nameLower = company.name.toLowerCase();
    const sectorLower = company.sector.toLowerCase();

    let score = 0;

    // Direct ticker exact match gets highest score
    if (tickerLower === term) score += 120;
    // Ticker starts with term
    else if (tickerLower.startsWith(term)) score += 90;
    // Name starts with term
    else if (nameLower.startsWith(term)) score += 80;
    // Ticker contains term
    else if (tickerLower.includes(term)) score += 65;
    // Name contains term
    else if (nameLower.includes(term)) score += 55;

    // Check token-based matching for multi-word queries
    for (const token of tokens) {
      if (token.length < 2) continue;
      if (tickerLower === token) score += 45;
      else if (tickerLower.startsWith(token)) score += 35;
      else if (nameLower.includes(token)) score += 30;
      else if (company.query.toLowerCase().includes(token)) score += 15;
    }

    if (sectorLower.includes(term)) score += 15;

    return { company, score };
  });

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.company);
}
