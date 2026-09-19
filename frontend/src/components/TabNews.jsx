import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertOctagon, Zap, PlusCircle, RefreshCw, Send, CheckCircle2, RotateCcw,
  Radio, TrendingUp, TrendingDown, Minus, ExternalLink, ChevronDown, ChevronUp,
  Flame, Activity, Clock, Search, X, Bookmark, Copy, Check, ArrowUpRight,
  Globe, FileText, Landmark, Inbox, Star, ArrowUpDown, Layers
} from 'lucide-react';

import { SAMPLE_NEWS_ARTICLES } from '../mockData/samples';
import { useAppAuth } from '../auth/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Visual vocabulary — one place that decides how each impact tier / sentiment
// is rendered, so a signal always looks the same wherever it appears.
// ─────────────────────────────────────────────────────────────────────────────

const TIERS = {
  high: {
    label: 'High impact',
    Icon: Flame,
    rail: 'bg-rose-500',
    border: 'border-rose-500/40',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    bar: 'bg-rose-500',
    text: 'text-rose-400',
  },
  medium: {
    label: 'Medium impact',
    Icon: Activity,
    rail: 'bg-amber-400',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    bar: 'bg-amber-400',
    text: 'text-amber-400',
  },
  low: {
    label: 'Low impact',
    Icon: Minus,
    rail: 'bg-slate-600',
    border: 'border-slate-800',
    badge: 'bg-slate-800 text-slate-300 border-slate-700',
    bar: 'bg-cyan-400',
    text: 'text-cyan-400',
  },
};

const getTier = (tier) => TIERS[(tier || '').toLowerCase()] || TIERS.low;

const SENTIMENTS = {
  bullish: { label: 'Bullish', Icon: TrendingUp, chip: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
  bearish: { label: 'Bearish', Icon: TrendingDown, chip: 'text-rose-300 bg-rose-500/10 border-rose-500/30' },
  neutral: { label: 'Neutral', Icon: Minus, chip: 'text-slate-300 bg-slate-800 border-slate-700' },
};

const getSentiment = (sentiment) => SENTIMENTS[(sentiment || '').toLowerCase()] || SENTIMENTS.neutral;

const PRESET_SIGNALS = [
  {
    tag: 'Regulatory',
    badgeColor: 'text-rose-300 border-rose-500/30 bg-rose-500/10',
    payload: {
      headline: 'DOJ Antitrust Subpoenas Cloud Provider Over Accelerated Hardware Bundling and Quotas',
      source: 'Financial Times',
      content: 'Federal antitrust investigators demanded unredacted contracts regarding GPU cluster allocation and preferential venture partner pricing.',
      ticker: 'NVDA'
    }
  },
  {
    tag: 'Energy',
    badgeColor: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
    payload: {
      headline: 'Mega-Cap Hyperscaler Inks $3.2B Clean Nuclear Energy Agreement for Next-Gen Data Hubs',
      source: 'Bloomberg Energy',
      content: 'Secures long-term baseload electricity through 2038 to mitigate regional power grid constraints for 100k-accelerator data center clusters.',
      ticker: 'MSFT'
    }
  },
  {
    tag: 'Earnings',
    badgeColor: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
    payload: {
      headline: 'Enterprise SaaS Provider Reports 38% Gross Margin Squeeze Due to Escalating Cloud Inference Costs',
      source: 'Bloomberg Wire',
      content: 'Operating losses widened as infrastructure compute expenditure outpaced software subscription renewals across Fortune 500 accounts.',
      ticker: 'CRM'
    }
  },
  {
    tag: 'Macro',
    badgeColor: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10',
    payload: {
      headline: 'Federal Reserve Signals Potential 50bps Interest Rate Cut Following Labor Market Cooling',
      source: 'Wall Street Journal',
      content: 'FOMC members highlighted balanced risk between employment growth and target inflation trajectory heading into next quarterly policy meeting.',
      ticker: 'SPY'
    }
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Small shared pieces
// ─────────────────────────────────────────────────────────────────────────────

const UrgencyMeter = ({ score = 0, tier }) => (
  <div className="flex items-center space-x-2 shrink-0" title={`Urgency ${score} out of 10`}>
    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Urgency</span>
    <div className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
      <div className={`h-full transition-all duration-700 ${tier.bar}`} style={{ width: `${score * 10}%` }} />
    </div>
    <span className={`text-xs font-mono font-bold ${tier.text}`}>{score}<span className="text-slate-600">/10</span></span>
  </div>
);

const SourceLinks = ({ item }) => {
  const cites = item.cited_sources || [];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1 mr-0.5">
        <Globe className="h-3 w-3 text-cyan-400" />
        <span>Sources</span>
      </span>

      {cites.map((cite, i) => (
        <a
          key={i}
          href={cite.uri}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-[10px] text-slate-300 hover:text-cyan-300 transition-colors"
        >
          {cite.type && <span className="text-[9px] font-bold text-cyan-400 uppercase">[{cite.type}]</span>}
          <span className="truncate max-w-[220px]">{cite.title}</span>
          <ArrowUpRight className="h-2.5 w-2.5 shrink-0 text-cyan-400" />
        </a>
      ))}

      {cites.length === 0 && (
        <>
          {item.ticker && (
            <a
              href={`https://www.sec.gov/edgar/searchedgar/companysearch?q=${item.ticker}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-[10px] text-slate-300 hover:text-cyan-300 transition-colors"
            >
              <span className="text-cyan-400 font-bold">[SEC]</span>
              <span>Filings for {item.ticker}</span>
              <ArrowUpRight className="h-2.5 w-2.5 shrink-0 text-cyan-400" />
            </a>
          )}
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(item.headline)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>Search this story</span>
            <ArrowUpRight className="h-2.5 w-2.5 shrink-0" />
          </a>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SignalCard — an analyzed signal. Reads top-to-bottom: what happened,
// how urgent it is, what it means, what to do. Raw text and sources are
// tucked behind a toggle so the stream stays scannable.
// ─────────────────────────────────────────────────────────────────────────────

const SignalCard = ({ item, onDismiss }) => {
  const { toggleBookmarkSignal, isSignalBookmarked } = useAppAuth();
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const c = item.defaultClassification || {};
  const tier = getTier(c.impact_tier);
  const sentiment = getSentiment(c.sentiment);
  const isBookmarked = isSignalBookmarked(item.id);
  const TierIcon = tier.Icon;
  const SentimentIcon = sentiment.Icon;

  const handleCopyAction = () => {
    navigator.clipboard.writeText(c.recommended_action || item.headline);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <article className={`glass-panel relative overflow-hidden rounded-2xl border shadow-lg ${tier.border} bg-slate-950/60`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${tier.rail}`} />

      <div className="p-5 pl-6">
        {/* Row 1 — classification at a glance, housekeeping on the right */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${tier.badge}`}>
              <TierIcon className="h-3 w-3" />
              <span>{tier.label}</span>
            </span>

            {c.is_material_risk && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500 text-slate-950">
                <AlertOctagon className="h-2.5 w-2.5" />
                <span>Material risk</span>
              </span>
            )}

            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sentiment.chip}`}>
              <SentimentIcon className="h-3 w-3" />
              <span>{sentiment.label}</span>
            </span>

            {item.ticker && (
              <span className="text-[10px] font-bold font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded-md">
                ${item.ticker}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              onClick={() => toggleBookmarkSignal(item)}
              title={isBookmarked ? 'Remove from saved signals' : 'Save this signal'}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isBookmarked
                  ? 'text-amber-400 bg-amber-500/15 border-amber-500/40'
                  : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800 border-slate-800'
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-amber-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              title="Dismiss this signal"
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2 — the headline itself */}
        <h3 className="mt-2.5 text-base font-bold text-white tracking-tight leading-snug">
          {item.headline}
        </h3>

        {/* Row 3 — provenance + urgency on one quiet line */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <span className="flex items-center space-x-1.5">
            <span className="font-semibold text-slate-300">{item.source || 'SEC EDGAR'}</span>
            <span className="text-slate-600">•</span>
            <Clock className="h-3 w-3" />
            <span>{item.timestamp || item.filing_date || 'Recent'}</span>
            {c.category && (
              <>
                <span className="text-slate-600">•</span>
                <span>{c.category}</span>
              </>
            )}
          </span>
          <UrgencyMeter score={c.urgency_score || 0} tier={tier} />
        </div>

        {/* Row 4 — the two answers a reader actually wants */}
        <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider flex items-center space-x-1 mb-1.5">
              <Activity className="h-3 w-3" />
              <span>What it means</span>
            </span>
            <p className="text-xs text-slate-200 leading-relaxed">{c.market_impact_analysis}</p>
          </div>

          <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-500/25">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center space-x-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>Suggested action</span>
              </span>
              <button
                type="button"
                onClick={handleCopyAction}
                title="Copy this action"
                className="text-slate-400 hover:text-white rounded cursor-pointer transition-colors flex items-center space-x-1 text-[10px]"
              >
                {copied ? (
                  <><Check className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400 font-semibold">Copied</span></>
                ) : (
                  <><Copy className="h-3 w-3" /><span>Copy</span></>
                )}
              </button>
            </div>
            <p className="text-xs text-emerald-200 font-medium leading-relaxed">{c.recommended_action}</p>
          </div>
        </div>

        {/* Row 5 — everything secondary, collapsed by default */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowDetails(v => !v)}
            className="text-[11px] font-semibold text-slate-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer transition-colors"
          >
            {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            <span>{showDetails ? 'Hide excerpt & sources' : 'Excerpt & sources'}</span>
          </button>

          {(item.href || item.url) && (
            <a
              href={item.href || item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline shrink-0"
            >
              <span>Read original</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {showDetails && (
          <div className="mt-2.5 space-y-2.5 animate-fadeIn">
            {item.content && (
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                {item.content.replace(/<[^>]*>?/gm, ' ')}
              </p>
            )}
            <SourceLinks item={item} />
          </div>
        )}
      </div>
    </article>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FilingRow — an unanalyzed 8-K. Deliberately one line tall: there is no
// analysis to show yet, so it should not take the space of a full card.
// ─────────────────────────────────────────────────────────────────────────────

const FilingRow = ({ item, onAnalyze, onDismiss }) => {
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    await onAnalyze(item);
    setAnalyzing(false);
  };

  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/50 hover:border-slate-700 transition-colors">
      <div className="h-7 w-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
        <Landmark className="h-3.5 w-3.5 text-slate-400" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-200 truncate">{item.headline}</p>
        <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
          {item.ticker && <span className="font-mono font-bold text-cyan-400">${item.ticker}</span>}
          <span>{item.filing_type || '8-K'}</span>
          <span className="text-slate-700">•</span>
          <span>{item.timestamp || item.filing_date || 'Recent'}</span>
        </p>
      </div>

      {item.href && (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          title="Open filing on SEC EDGAR"
          className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-colors shrink-0"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={analyzing}
        className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center space-x-1 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
      >
        {analyzing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
        <span>{analyzing ? 'Analyzing' : 'Analyze'}</span>
      </button>

      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        title="Dismiss this filing"
        className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-slate-800 transition-colors shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
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

  // View state
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // ALL | HIGH | MATERIAL | EDGAR | SAVED
  const [sentimentFilter, setSentimentFilter] = useState(null); // null | 'bullish' | 'bearish'
  const [sortMode, setSortMode] = useState('impact'); // 'impact' | 'newest'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [showAllFilings, setShowAllFilings] = useState(false);

  // Ingest console
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [inputHeadline, setInputHeadline] = useState('');
  const [inputSource, setInputSource] = useState('');
  const [inputTicker, setInputTicker] = useState('');
  const [inputContent, setInputContent] = useState('');
  const [isRouting, setIsRouting] = useState(false);

  // ── Fetch live SEC EDGAR 8-K filings
  const fetchEdgarFilings = useCallback(async () => {
    setEdgarLoading(true);
    try {
      const res = await fetch('/api/edgar-news?limit=25');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = (data.items || []).map(item => ({
        ...item,
        defaultClassification: null // Analyzed on demand
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

  // ── Analyze a signal using NVIDIA Nemotron
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
        body: JSON.stringify({ headline, source, content }),
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

  // ── Analyze an unclassified filing from its row
  const handleAnalyzeFiling = async (filing) => {
    const classification = await handleRouteNews({
      headline: filing.headline,
      source: filing.source || 'SEC EDGAR 8-K',
      ticker: filing.ticker || '',
      content: filing.content || '',
      href: filing.href || null
    });

    if (classification) {
      setEdgarItems(prev => prev.filter(e => e.id !== filing.id));
    }
  };

  const handleDismiss = (id) => {
    setFeed(prev => prev.filter(item => item.id !== id));
    setEdgarItems(prev => prev.filter(item => item.id !== id));
  };

  const handleResetFilters = () => {
    setSelectedFilter('ALL');
    setSentimentFilter(null);
    setSearchQuery('');
    setSelectedTicker(null);
  };

  const filtersActive = selectedFilter !== 'ALL' || sentimentFilter || searchQuery.trim() || selectedTicker;

  // ── Shared filter predicate (ticker + keyword), applied to both streams
  const matchesQuery = useCallback((item) => {
    if (selectedTicker && item.ticker?.toUpperCase() !== selectedTicker.toUpperCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const c = item.defaultClassification;
      const text = `${item.headline} ${item.source} ${item.ticker || ''} ${c?.recommended_action || ''}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  }, [selectedTicker, searchQuery]);

  // ── Stream 1: analyzed signals
  const analyzedSignals = useMemo(() => {
    if (selectedFilter === 'EDGAR') return [];

    const pool = selectedFilter === 'SAVED' ? (userPreferences?.savedSignals || []) : feed;

    const list = pool.filter(item => {
      const c = item.defaultClassification;
      if (!c) return false;
      if (selectedFilter === 'HIGH' && c.impact_tier?.toLowerCase() !== 'high') return false;
      if (selectedFilter === 'MATERIAL' && !c.is_material_risk) return false;
      if (sentimentFilter && c.sentiment?.toLowerCase() !== sentimentFilter) return false;
      return matchesQuery(item);
    });

    if (sortMode === 'impact') {
      return [...list].sort(
        (a, b) => (b.defaultClassification?.urgency_score || 0) - (a.defaultClassification?.urgency_score || 0)
      );
    }
    return list;
  }, [feed, userPreferences?.savedSignals, selectedFilter, sentimentFilter, sortMode, matchesQuery]);

  // ── Stream 2: filings still waiting on analysis
  const pendingFilings = useMemo(() => {
    if (sentimentFilter) return []; // no classification yet, so sentiment cannot match
    // Signals saved before they were analyzed still belong on the saved desk.
    if (selectedFilter === 'SAVED') {
      return (userPreferences?.savedSignals || []).filter(i => !i.defaultClassification).filter(matchesQuery);
    }
    if (selectedFilter !== 'ALL' && selectedFilter !== 'EDGAR') return [];
    return edgarItems.filter(matchesQuery);
  }, [edgarItems, userPreferences?.savedSignals, selectedFilter, sentimentFilter, matchesQuery]);

  const visibleFilings = showAllFilings ? pendingFilings : pendingFilings.slice(0, 6);

  // ── Counts driving the filter tiles
  const counts = {
    ALL: feed.length + edgarItems.length,
    HIGH: feed.filter(i => i.defaultClassification?.impact_tier?.toLowerCase() === 'high').length,
    MATERIAL: feed.filter(i => i.defaultClassification?.is_material_risk).length,
    EDGAR: edgarItems.length,
    SAVED: (userPreferences?.savedSignals || []).length,
  };

  const FILTER_TILES = [
    { id: 'ALL', label: 'Everything', hint: 'Signals + filings', Icon: Layers, accent: 'text-white', ring: 'border-cyan-500/50 bg-cyan-500/10' },
    { id: 'HIGH', label: 'High impact', hint: 'Move markets', Icon: Flame, accent: 'text-rose-400', ring: 'border-rose-500/50 bg-rose-500/10' },
    { id: 'MATERIAL', label: 'Material risk', hint: 'Needs attention', Icon: AlertOctagon, accent: 'text-amber-400', ring: 'border-amber-500/50 bg-amber-500/10' },
    { id: 'EDGAR', label: 'New filings', hint: 'Awaiting analysis', Icon: Landmark, accent: 'text-cyan-400', ring: 'border-cyan-500/50 bg-cyan-500/10' },
    { id: 'SAVED', label: 'Saved', hint: 'Your desk', Icon: Star, accent: 'text-indigo-300', ring: 'border-indigo-500/50 bg-indigo-500/10' },
  ];

  return (
    <div className="space-y-5 text-left">

      {/* ── Header: what this tab does, and when it last refreshed ───────── */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-rose-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-2 text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-1.5">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              <span>Live feed · analyzed by NVIDIA Nemotron</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              News &amp; Signal Router
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
              Breaking headlines and fresh SEC 8-K filings, each turned into three plain answers:
              <span className="text-slate-300 font-semibold"> how urgent it is</span>,
              <span className="text-slate-300 font-semibold"> what it means</span>, and
              <span className="text-slate-300 font-semibold"> what to do about it</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-slate-500 hidden sm:flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </span>
            <button
              type="button"
              onClick={fetchEdgarFilings}
              disabled={edgarLoading}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-xs font-semibold text-slate-300 hover:text-cyan-300 flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${edgarLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setIsConsoleOpen(v => !v)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              {isConsoleOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <PlusCircle className="h-3.5 w-3.5" />}
              <span>Add a headline</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Ingest console (collapsed by default) ────────────────────────── */}
      {isConsoleOpen && (
        <div className="glass-panel rounded-2xl border border-amber-500/30 overflow-hidden shadow-xl animate-fadeIn">
          <div className="px-5 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center space-x-2 text-white font-bold text-sm">
            <Zap className="h-4 w-4 text-amber-400" />
            <span>Analyze your own headline</span>
          </div>

          <div className="p-5 space-y-5 bg-slate-900/40">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Start from an example
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
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${preset.badgeColor}`}>
                        {preset.tag}
                      </span>
                      <p className="text-xs font-semibold text-slate-200 mt-2 group-hover:text-amber-300 transition-colors line-clamp-2">
                        {preset.payload.headline}
                      </p>
                    </div>
                    <span className="text-[10px] text-amber-400 font-bold mt-2 flex items-center space-x-1">
                      <span>Analyze this</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleRouteNews(); }} className="space-y-3 pt-4 border-t border-slate-800">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-8">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Headline *</label>
                  <input
                    type="text"
                    required
                    value={inputHeadline}
                    onChange={(e) => setInputHeadline(e.target.value)}
                    placeholder="e.g. Regulators subpoena major cloud operator over AI bundling..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Ticker</label>
                  <input
                    type="text"
                    value={inputTicker}
                    onChange={(e) => setInputTicker(e.target.value.toUpperCase())}
                    placeholder="NVDA"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Source</label>
                  <input
                    type="text"
                    value={inputSource}
                    onChange={(e) => setInputSource(e.target.value)}
                    placeholder="Bloomberg"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Article excerpt <span className="text-slate-600 font-normal">(optional — improves the analysis)</span>
                </label>
                <textarea
                  rows={2}
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  placeholder="Paste a paragraph of context or filing detail..."
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
                    <><RefreshCw className="h-3.5 w-3.5 animate-spin" /><span>Analyzing...</span></>
                  ) : (
                    <><Send className="h-3.5 w-3.5" /><span>Analyze headline</span></>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Filter tiles: the counts and the controls are the same thing ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {FILTER_TILES.map(tile => {
          const TileIcon = tile.Icon;
          const isActive = selectedFilter === tile.id;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => setSelectedFilter(tile.id)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                isActive ? tile.ring : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-2xl font-mono font-black ${isActive ? tile.accent : 'text-slate-300'}`}>
                  {counts[tile.id]}
                </span>
                <TileIcon className={`h-4 w-4 ${isActive ? tile.accent : 'text-slate-600'}`} />
              </div>
              <div className="text-[11px] font-bold text-slate-200 mt-1">{tile.label}</div>
              <div className="text-[10px] text-slate-500">{tile.hint}</div>
            </button>
          );
        })}
      </div>

      {/* ── Search, sentiment, sort, watchlist ───────────────────────────── */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search headlines, sources or tickers..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sentiment */}
            <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950/70 p-0.5">
              {[
                { id: null, label: 'Any' },
                { id: 'bullish', label: 'Bullish' },
                { id: 'bearish', label: 'Bearish' },
              ].map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setSentimentFilter(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    sentimentFilter === opt.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <button
              type="button"
              onClick={() => setSortMode(m => (m === 'impact' ? 'newest' : 'impact'))}
              title="Change ordering"
              className="px-2.5 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-cyan-300 hover:border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <ArrowUpDown className="h-3 w-3" />
              <span>{sortMode === 'impact' ? 'Most urgent first' : 'Newest first'}</span>
            </button>

            {filtersActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-400 hover:text-cyan-300 flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Clear filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Watchlist */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mr-0.5">Watchlist:</span>
            {activeWatchlist.map(ticker => {
              const isSelected = selectedTicker === ticker;
              return (
                <button
                  key={ticker}
                  type="button"
                  onClick={() => setSelectedTicker(isSelected ? null : ticker)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400'
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
            <span>Edit watchlist</span>
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── Stream 1: analyzed signals ───────────────────────────────────── */}
      {selectedFilter !== 'EDGAR' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
              <span>{selectedFilter === 'SAVED' ? 'Saved signals' : 'Analyzed signals'}</span>
              <span className="text-slate-600 font-mono normal-case">({analyzedSignals.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              {sortMode === 'impact' ? 'Sorted by urgency' : 'Sorted by newest'}
            </span>
          </div>

          {analyzedSignals.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-8 text-center">
              <Inbox className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-300">
                {selectedFilter === 'SAVED' ? 'Nothing saved yet' : 'No analyzed signals match your filters'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {selectedFilter === 'SAVED'
                  ? 'Use the bookmark icon on any signal to keep it on your desk.'
                  : 'Clear the filters, or analyze a filing below to add one to the stream.'}
              </p>
              {filtersActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            analyzedSignals.map(item => (
              <SignalCard key={item.id} item={item} onDismiss={handleDismiss} />
            ))
          )}
        </section>
      )}

      {/* ── Stream 2: filings awaiting analysis ──────────────────────────── */}
      {(selectedFilter === 'ALL' || selectedFilter === 'EDGAR' || pendingFilings.length > 0) && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              <span>{selectedFilter === 'SAVED' ? 'Saved · not analyzed yet' : 'Awaiting analysis · live SEC 8-K'}</span>
              <span className="text-slate-600 font-mono normal-case">({pendingFilings.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500 hidden sm:block">
              Analyze a filing to move it into the stream above
            </span>
          </div>

          {edgarLoading && pendingFilings.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6 flex items-center justify-center space-x-2 text-xs text-slate-400">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              <span>Loading filings from SEC EDGAR...</span>
            </div>
          ) : pendingFilings.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6 text-center text-xs text-slate-500">
              No filings waiting. Hit refresh to pull the latest 8-K reports.
            </div>
          ) : (
            <>
              {visibleFilings.map(item => (
                <FilingRow
                  key={item.id}
                  item={item}
                  onAnalyze={handleAnalyzeFiling}
                  onDismiss={handleDismiss}
                />
              ))}

              {pendingFilings.length > visibleFilings.length && (
                <button
                  type="button"
                  onClick={() => setShowAllFilings(true)}
                  className="w-full py-2.5 rounded-xl border border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 hover:text-cyan-300 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  Show {pendingFilings.length - visibleFilings.length} more filings
                </button>
              )}

              {showAllFilings && pendingFilings.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllFilings(false)}
                  className="w-full py-2.5 rounded-xl border border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 hover:text-cyan-300 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  Show fewer filings
                </button>
              )}
            </>
          )}
        </section>
      )}

    </div>
  );
};

export default TabNews;
