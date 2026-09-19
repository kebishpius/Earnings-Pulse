export const SAMPLE_QUERIES = [
  { label: "Apple Q3 2026", query: "Apple Q3 2026 earnings report revenue iPhone services", ticker: "AAPL" },
  { label: "NVIDIA Q2 FY26", query: "NVIDIA Q2 FY2026 earnings report data center guidance", ticker: "NVDA" },
  { label: "Microsoft Cloud", query: "Microsoft Q4 2026 earnings release Azure cloud revenue", ticker: "MSFT" },
  { label: "Tesla Auto Margins", query: "Tesla recent quarterly earnings automotive margins robotaxi 2026", ticker: "TSLA" },
  { label: "Amazon AWS", query: "Amazon Q2 2026 earnings AWS operating income capex", ticker: "AMZN" },
];

export const SAMPLE_NEWS_ARTICLES = [
  {
    id: "news-1",
    headline: "Federal Trade Commission Expands Inquiry Into Mega-Cap AI Infrastructure Bundling Deals",
    source: "Bloomberg Terminals",
    ticker: "NVDA",
    timestamp: "12 mins ago",
    href: "https://www.ftc.gov/news-events/news/press-releases",
    content: "Antitrust enforcement authorities dispatched civil investigative demands requesting contracts regarding preferential hardware allocation and venture stakes.",
    cited_sources: [
      { title: "FTC Bureau of Competition: AI Foundation Model & Cloud Partnership Study", uri: "https://www.ftc.gov/policy/advocacy-research/studies", type: "Regulatory Report" },
      { title: "Bloomberg Technology: Accelerated Compute Bundling Scrutiny", uri: "https://www.bloomberg.com/technology", type: "Financial News" },
      { title: "SEC EDGAR Form 8-K Regulatory Inquiries Disclosure", uri: "https://www.sec.gov/edgar/searchedgar/companysearch?q=NVDA", type: "SEC Official" }
    ],
    defaultClassification: {
      impact_tier: "High",
      is_material_risk: true,
      sentiment: "Bearish",
      category: "Regulatory & Compliance",
      urgency_score: 9,
      market_impact_analysis: "High probability of margin compression and delay in capital expenditures for key cloud computing operators.",
      recommended_action: "Hedge semiconductor equity beta via sector put options; monitor supplier contract disclosure."
    }
  },
  {
    id: "news-2",
    headline: "Leading Cloud Hyperscaler Signs 1.2 GW Next-Gen SMR Clean Energy Nuclear Power Agreement",
    source: "Reuters Energy",
    ticker: "MSFT",
    timestamp: "45 mins ago",
    href: "https://www.reuters.com/business/energy/",
    content: "Long-term power purchase agreements secured to power next-generation 100k-accelerator data center clusters through 2035.",
    cited_sources: [
      { title: "Reuters Energy: Hyperscaler Clean Power Purchase Agreements", uri: "https://www.reuters.com/business/energy/", type: "Financial News" },
      { title: "Constellation Energy & Microsoft Clean Energy Center Announcement", uri: "https://news.microsoft.com", type: "Press Release" },
      { title: "U.S. Department of Energy Nuclear Energy Resource Report", uri: "https://www.energy.gov/ne", type: "Government Analysis" }
    ],
    defaultClassification: {
      impact_tier: "Medium",
      is_material_risk: false,
      sentiment: "Bullish",
      category: "Infrastructure & Energy",
      urgency_score: 6,
      market_impact_analysis: "De-risks multi-year power supply bottlenecks for AI training clusters, supporting forward EPS growth targets.",
      recommended_action: "Positive structural catalyst for data center supply chain; maintain overweight tech positioning."
    }
  },
  {
    id: "news-3",
    headline: "Automotive OEM Issues Recall of 12,000 Electric Vehicles Due to Inverter Software Calibration Glitch",
    source: "Dow Jones Wires",
    ticker: "TSLA",
    timestamp: "2 hours ago",
    href: "https://www.nhtsa.gov/recalls",
    content: "Over-the-air firmware update scheduled to deploy within 72 hours; negligible direct balance sheet cashflow impact.",
    cited_sources: [
      { title: "NHTSA Vehicle Safety Recall Bulletin #26V-840", uri: "https://www.nhtsa.gov/recalls", type: "Safety Bulletin" },
      { title: "Wall Street Journal Auto Industry Wire", uri: "https://www.wsj.com/business/autos", type: "Financial News" },
      { title: "SEC Form 8-K Current Report Material Event Disclosure", uri: "https://www.sec.gov/edgar/searchedgar/companysearch?q=TSLA", type: "SEC Official" }
    ],
    defaultClassification: {
      impact_tier: "Low",
      is_material_risk: false,
      sentiment: "Neutral",
      category: "Product & Operations",
      urgency_score: 2,
      market_impact_analysis: "Contained headline risk without material warranty provisions or regulatory penalties.",
      recommended_action: "No defensive portfolio adjustments required; ignore short-term intraday noise."
    }
  }
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
