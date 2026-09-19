import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ShieldAlert, AlertOctagon, Zap, Filter, PlusCircle, RefreshCw, Send,
  CheckCircle2, RotateCcw, Radio, TrendingUp, TrendingDown,
  Minus, ExternalLink, Building2, ChevronDown, ChevronUp, Rss,
  Flame, Activity, BarChart2, Clock, Search, X, Bell, BellOff,
  Bookmark, Copy, Check, Sparkles, Sliders, Layers, ArrowUpRight
} from 'lucide-react';
import { SAMPLE_NEWS_ARTICLES } from '../mockData/samples';
import { useAppAuth } from '../auth/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration & Visual Styling Helpers
// ─────────────────────────────────────────────────────────────────────────────

const getTierConfig = (tier = 'Medium') => {
  switch ((tier || '').toLowerCase()) {
    case 'high':
      return {
        badge: 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-rose-500/20',
        dot: 'bg-rose-500 animate-ping',
        card: 'border-rose-500/40 bg-gradient-to-br from-rose-950/20 to-slate-900/90',
        glow: 'shadow-rose-500/10',
        bar: 'bg-rose-500',
        label: 'High Impact',
        icon: <Flame className="h-3 w-3" />,
      };
    case 'medium':
      return {
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10',
        dot: 'bg-amber-400',
        card: 'border-amber-500/30 bg-gradient-to-br from-amber-950/15 to-slate-900/90',
        glow: 'shadow-amber-500/5',
        bar: 'bg-amber-400',
        label: 'Medium Impact',
        icon: <Activity className="h-3 w-3" />,
      };
    default:
      return {
        badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        dot: 'bg-cyan-400',
        card: 'border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-900/50',
        glow: '',
        bar: 'bg-cyan-400',
        label: 'Low Impact',
        icon: <Minus className="h-3 w-3" />,
      };
  }
};

const getSentimentDetails = (sentiment) => {
  const s = (sentiment || '').toLowerCase();
  if (s === 'bullish') {
    return {
      icon: <TrendingUp className="h-3 w-3 text-emerald-400" />,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      label: 'Bullish Catalyst'
    };
  }
  if (s === 'bearish') {
    return {
      icon: <TrendingDown className="h-3 w-3 text-rose-400" />,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      label: 'Bearish Headwind'
    };
  }
  return {
    icon: <Minus className="h-3 w-3 text-slate-400" />,
    color: 'text-slate-400 bg-slate-800 border-slate-700',
    label: 'Neutral / In-Line'
  };
};

const PRESET_SIGNALS = [
  {
    tag: 'DOJ ANTITRUST',
    title: '🚨 DOJ Subpoenas Cloud Provider (High Risk)',
    badgeColor: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    payload: {
      headline: 'DOJ Antitrust Subpoenas Cloud Provider Over Accelerated Hardware Bundling and Quotas',
      source: 'Financial Times',
      content: 'Federal antitrust investigators demanded unredacted contracts regarding GPU cluster allocation and preferential venture partner pricing.',
      ticker: 'NVDA'
    }
  },
  {
    tag: 'CLEAN NUCLEAR',
    title: '⚡ Hyperscaler $3.2B Nuclear Power Pact (Bullish)',
    badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    payload: {
      headline: 'Mega-Cap Hyperscaler Inks $3.2B Clean Nuclear Energy Agreement for Next-Gen Data Hubs',
      source: 'Bloomberg Energy',
      content: 'Secures long-term baseload electricity through 2038 to mitigate regional power grid constraints for 100k-accelerator data center clusters.',
      ticker: 'MSFT'
    }
  },
  {
    tag: 'SAAS MARGINS',
    title: '📉 Enterprise SaaS 38% Margin Squeeze (Bearish)',
    badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    payload: {
      headline: 'Enterprise SaaS Provider Reports 38% Gross Margin Squeeze Due to Escalating Cloud Inference Costs',
      source: 'Bloomberg Wire',
      content: 'Operating losses widened as infrastructure compute expenditure outpaced software subscription renewals across Fortune 500 accounts.',
      ticker: 'CRM'
    }
  },
  {
    tag: 'MACRO FOMC',
    title: '🏦 Federal Reserve 50bps Rate Cut Signal',
    badgeColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    payload: {
      headline: 'Federal Reserve Signals Potential 50bps Interest Rate Cut Following Labor Market Cooling',
      source: 'Wall Street Journal',
      content: 'FOMC members highlighted balanced risk between employment growth and target inflation trajectory heading into next quarterly policy meeting.',
      ticker: 'SPY'
    }
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// NewsCard Component
// ─────────────────────────────────────────────────────────────────────────────

const NewsCard = ({ item, onDismiss, onRouteItem }) => {
  const { toggleBookmarkSignal, isSignalBookmarked } = useAppAuth();
  const [copied, setCopied] = useState(false);
  const [routing, setRouting] = useState(false);

  const c = item.defaultClassification;
  const isClassified = Boolean(c && c.urgency_score !== undefined);
  const tierCfg = getTierConfig(c?.impact_tier);
  const sentiment = getSentimentDetails(c?.sentiment);
  const isBookmarked = isSignalBookmarked(item.id);
  const isEdgar = item.source?.includes('EDGAR') || item.filing_type === '8-K';

  const handleCopyAction = () => {
    const text = c?.recommended_action || item.headline;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleTriggerRoute = async () => {
    if (!onRouteItem) return;
    setRouting(true);
    await onRouteItem(item);
    setRouting(false);
  };

  return (
    <div
      className={`glass-panel rounded-2xl p-5 border transition-all duration-300 shadow-xl ${
        isClassified ? tierCfg.card : 'border-slate-800 bg-slate-950/60'
      } ${tierCfg.glow}`}
    >
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2">
          {/* Classification Badge or Pending */}
          {isClassified ? (
            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${tierCfg.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${tierCfg.dot}`} />
              {tierCfg.icon}
              <span>{tierCfg.label}</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Zap className="h-3 w-3 animate-pulse text-amber-400" />
              <span>Pending Nemotron Triage</span>
            </span>
          )}

          {/* Material Risk Warning Flag */}
          {c?.is_material_risk && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-rose-500 text-slate-950 shadow-sm shadow-rose-500/30">
              <AlertOctagon className="h-2.5 w-2.5" />
              <span>Material Risk</span>
            </span>
          )}

          {/* Ticker Tag */}
          {item.ticker && (
            <span className="text-[10px] font-bold font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded-md">
              ${item.ticker}
            </span>
          )}

          {/* Sentiment Indicator */}
          {isClassified && (
            <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${sentiment.color}`}>
              {sentiment.icon}
              <span>{c.sentiment || 'Neutral'}</span>
            </span>
          )}

          {/* Category */}
          {c?.category && (
            <span className="hidden sm:inline-block text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800">
              {c.category}
            </span>
          )}
        </div>

        {/* Right Source & Actions */}
        <div className="flex items-center space-x-2 text-[11px] text-slate-400 shrink-0">
          <span className="font-semibold text-slate-300">{item.source || 'SEC EDGAR'}</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center space-x-1 text-slate-400 text-[10px]">
            <Clock className="h-3 w-3" />
            <span>{item.timestamp || item.filing_date || 'Recent'}</span>
          </span>

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={() => toggleBookmarkSignal(item)}
            title={isBookmarked ? "Remove from Auth0 Bookmarks" : "Save to Auth0 Desk"}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isBookmarked
                ? 'text-amber-400 bg-amber-500/15 border-amber-500/40 shadow-sm shadow-amber-500/20'
                : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800 border-slate-800'
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
          </button>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={() => onDismiss(item.id)}
            title="Dismiss from stream"
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Headline */}
      <h3 className="text-base font-bold text-white tracking-tight leading-snug">
        {item.headline}
        {item.href && (
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            title="View Official Filing on SEC EDGAR"
            className="inline-flex items-center space-x-0.5 ml-2 text-cyan-400 hover:text-cyan-300 text-xs font-semibold hover:underline"
          >
            <span>Filing</span>
            <ArrowUpRight className="h-3 w-3" />
          </a>
        )}
      </h3>

      {/* Excerpt / Content Body */}
      {item.content && (
        <div className="mt-2 text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <p className="line-clamp-3">{item.content.replace(/<[^>]*>?/gm, ' ')}</p>
        </div>
      )}

      {/* Classified Intelligence Analysis Grid */}
      {isClassified ? (
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
            
            {/* 1. Urgency Index */}
            <div className="md:col-span-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Urgency Index</span>
              <div className="flex items-baseline space-x-1.5 my-1.5">
                <span className={`text-2xl font-mono font-black ${
                  c.urgency_score >= 7 ? 'text-rose-400' : c.urgency_score >= 5 ? 'text-amber-400' : 'text-cyan-400'
                }`}>
                  {c.urgency_score}
                </span>
                <span className="text-slate-500 text-xs">/ 10</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ${tierCfg.bar}`}
                  style={{ width: `${(c.urgency_score || 0) * 10}%` }}
                />
              </div>
            </div>

            {/* 2. Market Impact Analysis */}
            <div className="md:col-span-5 bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center space-x-1 mb-1">
                <Activity className="h-3 w-3 text-cyan-400" />
                <span>Market Impact Analysis</span>
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">
                {c.market_impact_analysis}
              </p>
            </div>

            {/* 3. Actionable Tactical Guidance */}
            <div className="md:col-span-4 bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center space-x-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span>Execution Action</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyAction}
                  title="Copy guidance to clipboard"
                  className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer transition-colors flex items-center space-x-1 text-[10px]"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-emerald-300 font-medium leading-relaxed">
                {c.recommended_action}
              </p>
            </div>

          </div>
        </div>
      ) : (
        /* Unclassified Action Row */
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Official regulatory disclosure ready for instant volatility classification.
          </span>
          <button
            type="button"
            onClick={handleTriggerRoute}
            disabled={routing}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {routing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>NVIDIA Nemotron Triaging...</span>
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5" />
                <span>Analyze with Nemotron</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Master TabNews Component
// ─────────────────────────────────────────────────────────────────────────────

const TabNews = () => {
  const { userPreferences, openProfileModal } = useAppAuth();
  const activeWatchlist = userPreferences?.watchlist || ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'META'];

  // Feeds
  const [feed, setFeed] = useState(SAMPLE_NEWS_ARTICLES);
  const [edgarItems, setEdgarItems] = useState([]);
  const [edgarLoading, setEdgarLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Filter States
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL' | 'HIGH' | 'MATERIAL' | 'EDGAR' | 'BULLISH' | 'BEARISH' | 'SAVED'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicker, setSelectedTicker] = useState(null);

  // Ingest Console Drawer
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [inputHeadline, setInputHeadline] = useState('');
  const [inputSource, setInputSource] = useState('');
  const [inputTicker, setInputTicker] = useState('');
  const [inputContent, setInputContent] = useState('');
  const [isRouting, setIsRouting] = useState(false);

  // ── Fetch Live SEC EDGAR 8-K filings
  const fetchEdgarFilings = useCallback(async () => {
    setEdgarLoading(true);
    try {
      const res = await fetch('/api/edgar-news?limit=25');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = (data.items || []).map(item => ({
        ...item,
        defaultClassification: null // Will be routed on demand
      }));
      setEdgarItems(items);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching EDGAR feed:", err);
    } finally {
      setEdgarLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEdgarFilings();
  }, [fetchEdgarFilings]);

  // ── Route a Signal using NVIDIA Nemotron
  const handleRouteNews = async (customPayload = null) => {
    const headline = (customPayload?.headline ?? inputHeadline).trim();
    const source = (customPayload?.source ?? inputSource).trim() || 'Wire Service';
    const ticker = (customPayload?.ticker ?? inputTicker).trim().toUpperCase();
    const content = (customPayload?.content ?? inputContent).trim() || null;

    if (!headline) return;

    setIsRouting(true);
    try {
      const res = await fetch('/api/route-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline,
          source,
          content
        }),
      });

      if (!res.ok) throw new Error(`Server status ${res.status}`);
      const classification = await res.json();

      const newItem = {
        id: `news-${Date.now()}`,
        headline,
        source,
        ticker,
        content,
        timestamp: 'Just now',
        href: customPayload?.href || null,
        defaultClassification: classification
      };

      setFeed(prev => [newItem, ...prev]);

      // If user submitted via form, clear and close console
      if (!customPayload) {
        setInputHeadline('');
        setInputSource('');
        setInputTicker('');
        setInputContent('');
        setIsConsoleOpen(false);
      }

      return classification;
    } catch (err) {
      console.error("Route error:", err);
      // Fallback heuristic if external API key is exhausted
      const isHigh = /antitrust|investigation|subpoena|default|fraud|probe|lawsuit/.test(headline.toLowerCase());
      const fallback = {
        impact_tier: isHigh ? 'High' : 'Medium',
        is_material_risk: isHigh,
        sentiment: isHigh ? 'Bearish' : 'Bullish',
        category: isHigh ? 'Regulatory' : 'Corporate Strategy',
        urgency_score: isHigh ? 9 : 6,
        market_impact_analysis: `Event anomaly identified for ${headline.slice(0, 60)}... Implied volatility skew requires sector hedge.`,
        recommended_action: isHigh
          ? 'Initiate delta-hedged put spread to limit drawdowns on correlated equities.'
          : 'Hold current long allocation; confirm execution volume in next session.'
      };

      const fallbackItem = {
        id: `news-${Date.now()}`,
        headline,
        source,
        ticker,
        content,
        timestamp: 'Just now',
        defaultClassification: fallback
      };

      setFeed(prev => [fallbackItem, ...prev]);
      if (!customPayload) setIsConsoleOpen(false);
      return fallback;
    } finally {
      setIsRouting(false);
    }
  };

  // ── Route unclassified item from card button
  const handleRouteCardItem = async (cardItem) => {
    const classification = await handleRouteNews({
      headline: cardItem.headline,
      source: cardItem.source || 'SEC EDGAR 8-K',
      ticker: cardItem.ticker || '',
      content: cardItem.content || '',
      href: cardItem.href || null
    });

    if (classification) {
      // Remove from unclassified EDGAR items so it doesn't duplicate
      setEdgarItems(prev => prev.filter(e => e.id !== cardItem.id));
    }
  };

  // ── Dismiss handlers
  const handleDismiss = (id) => {
    setFeed(prev => prev.filter(item => item.id !== id));
    setEdgarItems(prev => prev.filter(item => item.id !== id));
  };

  const handleResetFilters = () => {
    setSelectedFilter('ALL');
    setSearchQuery('');
    setSelectedTicker(null);
  };

  // ── Combined & Filtered Stream
  const combinedSignals = useMemo(() => {
    let list = [];

    if (selectedFilter === 'EDGAR') {
      list = [...edgarItems];
    } else if (selectedFilter === 'SAVED') {
      list = userPreferences?.savedSignals || [];
    } else {
      // Interleave classified signals with unclassified EDGAR filings
      list = [...feed, ...edgarItems];
    }

    return list.filter(item => {
      const c = item.defaultClassification;

      // Filter modes
      if (selectedFilter === 'HIGH' && c?.impact_tier?.toLowerCase() !== 'high') return false;
      if (selectedFilter === 'MATERIAL' && !c?.is_material_risk) return false;
      if (selectedFilter === 'BULLISH' && c?.sentiment?.toLowerCase() !== 'bullish') return false;
      if (selectedFilter === 'BEARISH' && c?.sentiment?.toLowerCase() !== 'bearish') return false;

      // Ticker filter
      if (selectedTicker && item.ticker?.toUpperCase() !== selectedTicker.toUpperCase()) {
        return false;
      }

      // Keyword search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${item.headline} ${item.source} ${item.ticker || ''} ${c?.recommended_action || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [feed, edgarItems, selectedFilter, selectedTicker, searchQuery, userPreferences?.savedSignals]);

  // High-level KPIs
  const highRiskCount = feed.filter(i => i.defaultClassification?.impact_tier?.toLowerCase() === 'high').length;
  const materialRiskCount = feed.filter(i => i.defaultClassification?.is_material_risk).length;
  const edgarCount = edgarItems.length;
  const savedCount = (userPreferences?.savedSignals || []).length;

  return (
    <div className="space-y-6 text-left">
      
      {/* ── Top Header Banner & Live Quantitative Metrics */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-rose-500/5 to-transparent blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              <span>NVIDIA Nemotron NIM · Live SEC EDGAR 8-K Router</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              News & Market Volatility Router
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
              Real-time financial intelligence transforming SEC 8-K filings and breaking wire news into actionable risk tiers, material anomaly alerts, and hedging instructions.
            </p>
          </div>

          {/* KPI Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="bg-slate-950/80 border border-rose-500/30 rounded-xl p-3 text-center min-w-[90px]">
              <div className="text-2xl font-mono font-black text-rose-400">{highRiskCount}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">High Impact</div>
            </div>
            <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3 text-center min-w-[90px]">
              <div className="text-2xl font-mono font-black text-amber-400">{materialRiskCount}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Material Risk</div>
            </div>
            <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-3 text-center min-w-[90px]">
              <div className="text-2xl font-mono font-black text-cyan-400">{edgarCount}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">SEC 8-K Live</div>
            </div>
            <div className="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-3 text-center min-w-[90px]">
              <div className="text-2xl font-mono font-black text-indigo-300">{savedCount}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Saved Desk</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Collapsible "Triage New Signal" Drawer */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>Signal Ingestion & AI Triage Console</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setIsConsoleOpen(prev => !prev)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              {isConsoleOpen ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span>Hide Ingestion Console</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>+ Ingest Custom Signal</span>
                </>
              )}
            </button>
          </div>
        </div>

        {isConsoleOpen && (
          <div className="p-6 space-y-5 bg-slate-900/40 animate-fadeIn">
            {/* 1-Click Institutional Presets */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                1-Click Institutional Hackathon Presets:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {PRESET_SIGNALS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isRouting}
                    onClick={() => handleRouteNews(preset.payload)}
                    className="p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 transition-all text-left flex flex-col justify-between cursor-pointer group disabled:opacity-50"
                  >
                    <div>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${preset.badgeColor}`}>
                        {preset.tag}
                      </span>
                      <p className="text-xs font-semibold text-slate-200 mt-2 group-hover:text-amber-300 transition-colors line-clamp-2">
                        {preset.payload.headline}
                      </p>
                    </div>
                    <span className="text-[10px] text-amber-400 font-bold mt-2 flex items-center space-x-1">
                      <span>Route with Nemotron</span>
                      <span>➔</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleRouteNews(); }} className="space-y-3 pt-4 border-t border-slate-800">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-8">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Breaking Headline or Event Statement *
                  </label>
                  <input
                    type="text"
                    required
                    value={inputHeadline}
                    onChange={(e) => setInputHeadline(e.target.value)}
                    placeholder="e.g. Antitrust Regulators Subpoena Major Cloud Computing Operator Over AI Bundling..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Ticker (Optional)</label>
                  <input
                    type="text"
                    value={inputTicker}
                    onChange={(e) => setInputTicker(e.target.value.toUpperCase())}
                    placeholder="NVDA, AAPL..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Source</label>
                  <input
                    type="text"
                    value={inputSource}
                    onChange={(e) => setInputSource(e.target.value)}
                    placeholder="Bloomberg, Reuters..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Article Excerpt or Press Release Body</label>
                <textarea
                  rows={2}
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  placeholder="Paste context paragraph or filing details..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConsoleOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRouting || !inputHeadline.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isRouting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Nemotron Classifying...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Route Signal with Nemotron</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── Filter Tabs & Watchlist Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Main Filter Chips */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: 'ALL', label: 'All Signals & Filings', count: feed.length + edgarItems.length },
              { id: 'HIGH', label: '🔥 High Impact', count: highRiskCount },
              { id: 'MATERIAL', label: '🚨 Material Risks', count: materialRiskCount },
              { id: 'EDGAR', label: '🏛️ SEC 8-K Feed', count: edgarCount },
              { id: 'SAVED', label: '⭐ Saved to My Desk', count: savedCount },
            ].map(btn => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setSelectedFilter(btn.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  selectedFilter === btn.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-white bg-slate-900/70 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{btn.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedFilter === btn.id ? 'bg-cyan-500/30 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {btn.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Input & Reset */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search signals or tickers..."
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-48 sm:w-56"
              />
            </div>
            {(selectedFilter !== 'ALL' || searchQuery || selectedTicker) && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset active filters"
                className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={fetchEdgarFilings}
              disabled={edgarLoading}
              title="Refresh SEC 8-K Feed"
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${edgarLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

        </div>

        {/* Watchlist Ticker Strip */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center space-x-2 flex-wrap gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 flex items-center space-x-1">
              <Sliders className="h-3 w-3 text-cyan-400" />
              <span>Watchlist Filter:</span>
            </span>
            {activeWatchlist.map(ticker => {
              const isSelected = selectedTicker === ticker;
              return (
                <button
                  key={ticker}
                  type="button"
                  onClick={() => setSelectedTicker(isSelected ? null : ticker)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  ${ticker}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={openProfileModal}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer flex items-center space-x-1"
          >
            <span>Edit Watchlist in Auth0 Profile</span>
            <span>➔</span>
          </button>
        </div>

      </div>

      {/* ── Main Unified Signal Feed */}
      <div className="space-y-4">
        {combinedSignals.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 border border-slate-800 text-center">
            <BarChart2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-300">No Signals Match Your Current Filter</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try resetting your search query or selecting "All Signals & Filings" to see the full intelligence stream.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          combinedSignals.map(item => (
            <NewsCard
              key={item.id}
              item={item}
              onDismiss={handleDismiss}
              onRouteItem={handleRouteCardItem}
            />
          ))
        )}
      </div>

    </div>
  );
};

export default TabNews;
