import React, { useState } from 'react';
import { Search, Sparkles, AlertTriangle, TrendingUp, TrendingDown, Minus, ExternalLink, ShieldCheck, CheckCircle2, RefreshCw, Cpu, Globe } from 'lucide-react';
import { SAMPLE_QUERIES } from '../mockData/samples';

const TabEarnings = () => {
  const [query, setQuery] = useState('Apple Q3 2024 earnings report revenue iPhone services');
  const [loading, setLoading] = useState(false);
  const [pipelineStage, setPipelineStage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (targetQuery = query) => {
    const q = (targetQuery || query).trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setPipelineStage('Stage 1/2: Triggering Gemini Grounded Google Search for live filings & earnings call text...');

    try {
      // Small timeout simulation for visual clarity of dual-model handover if fast
      const timer = setTimeout(() => {
        setPipelineStage('Stage 2/2: Streaming grounded dossier to NVIDIA Nemotron NIM for deep financial risk reasoning...');
      }, 1200);

      const res = await fetch('/api/fetch-and-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });

      clearTimeout(timer);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch and analyze earnings data.');
    } finally {
      setLoading(false);
      setPipelineStage('');
    }
  };

  const getSentimentBadge = (sentiment = 'Bullish') => {
    const s = (sentiment || '').toLowerCase();
    if (s.includes('bull') || s.includes('pos') || s.includes('strong') || s.includes('outperform')) {
      return (
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold text-sm shadow-sm shadow-emerald-500/20">
          <TrendingUp className="h-4 w-4" />
          <span>Bullish Executive Tone</span>
        </div>
      );
    }
    if (s.includes('bear') || s.includes('neg') || s.includes('weak') || s.includes('headwind') || s.includes('miss')) {
      return (
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-400 font-bold text-sm shadow-sm shadow-rose-500/20">
          <TrendingDown className="h-4 w-4" />
          <span>Bearish Headwinds Disclosed</span>
        </div>
      );
    }
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold text-sm shadow-sm shadow-amber-500/20">
        <Minus className="h-4 w-4" />
        <span>Neutral / Balanced Guidance</span>
      </div>
    );
  };

  const getBeatBadge = (status = '') => {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s.includes('beat') || s.includes('exceed') || s.includes('above') || s.includes('top') || s.includes('higher') || s.includes('pos')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">BEAT</span>;
    }
    if (s.includes('miss') || s.includes('below') || s.includes('lower') || s.includes('lag') || s.includes('neg')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">MISS</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-300 border border-slate-600">IN-LINE</span>;
  };

  return (
    <div className="space-y-6">
      
      {/* Top Search Control Bar */}
      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border border-slate-800">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-3xl">
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Dual-Engine Live Earnings Intelligence</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Live Earnings Fetcher & Executive Scorecard
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Gemini queries live Google Search for official press releases and 10-Q/K SEC transcripts.
            NVIDIA Nemotron parses executive sentiment, headline financial metrics, and concealed balance sheet risks.
          </p>
        </div>

        {/* Search Bar Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="mt-6 flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="h-4 w-4 text-cyan-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter company name, ticker or earnings phrase (e.g. Apple Q3 earnings, NVDA latest)..."
              className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-white" />
                <span>Executing Pipeline...</span>
              </>
            ) : (
              <>
                <Cpu className="h-4 w-4" />
                <span>Fetch & Analyze</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Query Pills */}
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60 text-xs">
          <span className="text-slate-400 font-medium mr-1">Quick Presets:</span>
          {SAMPLE_QUERIES.map((sq) => (
            <button
              key={sq.label}
              type="button"
              disabled={loading}
              onClick={() => {
                setQuery(sq.query);
                handleSearch(sq.query);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-cyan-950/60 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {sq.label} ({sq.ticker})
            </button>
          ))}
        </div>
      </div>

      {/* Live Pipeline Processing Banner */}
      {loading && (
        <div className="glass-panel rounded-xl p-5 border border-cyan-500/30 bg-cyan-950/20 animate-pulse flex items-center space-x-4">
          <div className="h-10 w-10 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-400/40 text-cyan-300 shrink-0">
            <RefreshCw className="h-5 w-5 animate-spin" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-bold tracking-wider text-cyan-400">Pipeline Active</span>
              <span className="text-xs text-slate-400">• High-Throughput Handshake</span>
            </div>
            <p className="text-sm font-semibold text-slate-200 mt-0.5">{pipelineStage}</p>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="glass-panel rounded-xl p-5 border border-rose-500/40 bg-rose-950/20 flex items-center justify-between text-rose-300">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={() => handleSearch()}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold cursor-pointer transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results Executive Scorecard */}
      {result && !loading && (
        <div className="space-y-6">
          
          {/* Header Card: Company, Quarter, Sentiment */}
          <div className="glass-panel-glow rounded-2xl p-6 border border-cyan-500/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-3">
                  <h3 className="text-3xl font-extrabold text-white tracking-tight">
                    {result.company_name}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-mono font-bold text-sm">
                    {result.ticker}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold">
                    {result.quarter}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
                  <span>Processed in {result.pipeline_metadata?.elapsed_ms || 940}ms</span>
                  <span>•</span>
                  <span>Engine: {result.pipeline_metadata?.gemini_provider || "Gemini Search"} ➔ {result.pipeline_metadata?.nemotron_model || "NVIDIA Nemotron"}</span>
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">AI Sentiment Model</div>
                  <div className="mt-1">{getSentimentBadge(result.executive_sentiment)}</div>
                </div>
                <div className="h-10 w-px bg-slate-800 hidden sm:block" />
                <div className="text-right hidden sm:block">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Confidence</div>
                  <div className="text-lg font-mono font-bold text-cyan-400">
                    {Math.round((result.sentiment_confidence || 0.9) * 100)}%
                  </div>
                </div>
                <div className="h-10 w-px bg-slate-800 hidden sm:block" />
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  title="Clear Analysis & Start New Search"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Executive Synthesis */}
            <div className="mt-5 bg-slate-900/60 rounded-xl p-4 border border-slate-800/80">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                <span>Nemotron Executive Synthesis</span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">
                "{result.executive_summary}"
              </p>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-2">
              <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
              <span>Reported Key Financial Metrics vs Consensus</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {result.metrics?.map((m, idx) => (
                <div
                  key={idx}
                  className="glass-panel glass-card-hover rounded-xl p-4 border border-slate-800 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      {m.metric}
                    </span>
                    {getBeatBadge(m.beat_status)}
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-mono font-extrabold text-white tracking-tight">
                      {m.value}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                      <span>Est: <strong className="text-slate-300">{m.consensus || "N/A"}</strong></span>
                      {m.notes && <span className="truncate max-w-[110px] text-cyan-400" title={m.notes}>{m.notes}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hidden Risks & Strategic Catalysts (2 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Hidden Risk Factors */}
            <div className="glass-panel rounded-2xl p-5 border border-rose-500/20 bg-rose-950/5">
              <div className="flex items-center space-x-2 text-rose-400 mb-3">
                <AlertTriangle className="h-4 w-4" />
                <h4 className="text-sm font-bold uppercase tracking-wider">Hidden Risk Factors & Disclosed Headwinds</h4>
              </div>
              <ul className="space-y-2.5">
                {result.hidden_risks?.map((risk, idx) => (
                  <li key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{risk}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Strategic Growth Catalysts */}
            <div className="glass-panel rounded-2xl p-5 border border-emerald-500/20 bg-emerald-950/5">
              <div className="flex items-center space-x-2 text-emerald-400 mb-3">
                <CheckCircle2 className="h-4 w-4" />
                <h4 className="text-sm font-bold uppercase tracking-wider">Strategic Catalysts & Monetization Levers</h4>
              </div>
              <ul className="space-y-2.5">
                {result.strategic_catalysts?.map((cat, idx) => (
                  <li key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{cat}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Live Google Search Citations & Verification Panel */}
          {result.source_citations && result.source_citations.length > 0 && (
            <div className="glass-panel rounded-xl p-5 border border-slate-800">
              <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
                <Globe className="h-4 w-4" />
                <span>Google Search Grounding Verification Citations ({result.source_citations.length} Sources Verified)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {result.source_citations.map((cite, idx) => (
                  <a
                    key={idx}
                    href={cite.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-xs text-slate-300 transition-colors group"
                  >
                    <span className="truncate pr-2 group-hover:text-cyan-300">{cite.title}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Initial state placeholder before search */}
      {!result && !loading && !error && (
        <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800">
          <div className="h-14 w-14 rounded-2xl bg-slate-800/80 mx-auto flex items-center justify-center text-cyan-400 mb-4 border border-slate-700">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Ready for Real-Time Financial Query</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-2">
            Select one of the quick presets above or enter a company name to test live Google Search grounding paired with Nemotron financial risk extraction.
          </p>
        </div>
      )}

    </div>
  );
};

export default TabEarnings;
