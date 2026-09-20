import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  CalendarClock, RefreshCw, Plus, X, Search, TrendingUp, TrendingDown,
  Minus, CheckCircle2, CircleDashed, Sunrise, Moon, Clock, AlertTriangle,
  ArrowUpRight, Sparkles, Eye, Landmark, ChevronRight, Target, Inbox
} from 'lucide-react';

import { useAppAuth, MAX_WATCHLIST, PREP_WINDOW_CHOICES } from '../auth/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Encoding decisions, made once
//
// Beat / miss is a polarity scale, so it gets two poles and a neutral middle.
// The green here is lighter than the app's usual emerald: the emerald/rose
// pair separates by only ΔE 4.6 under deuteranopia, which is the classic
// red/green trap, while green-400 against rose-500 clears 14. Polarity is also
// carried by the bar's direction from the zero line, an arrow, the word
// "Beat"/"Miss", and a signed number — so it never rests on hue alone.
// ─────────────────────────────────────────────────────────────────────────────

const BEAT = '#4ade80';
const MISS = '#f43f5e';
const FLAT = '#64748b';

const RESULTS = {
  Beat: { Icon: TrendingUp, color: BEAT, chip: 'bg-green-500/10 text-green-300 border-green-500/40' },
  Miss: { Icon: TrendingDown, color: MISS, chip: 'bg-rose-500/10 text-rose-300 border-rose-500/40' },
  'In line': { Icon: Minus, color: FLAT, chip: 'bg-slate-800 text-slate-300 border-slate-700' },
  Unknown: { Icon: CircleDashed, color: FLAT, chip: 'bg-slate-800 text-slate-400 border-slate-700' },
};

const getResult = (name) => RESULTS[name] || RESULTS.Unknown;

const TIMINGS = {
  'pre-market': { label: 'Before the open', Icon: Sunrise },
  'after-hours': { label: 'After the close', Icon: Moon },
  unspecified: { label: 'Time not set', Icon: Clock },
};

// ─────────────────────────────────────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────────────────────────────────────

// Dates arrive as plain calendar days. Parsing them by hand avoids the
// timezone shift that turns "2026-10-29" into the 28th west of UTC.
const parseDay = (iso) => {
  const [y, m, d] = (iso || '').split('-').map(Number);
  return y ? new Date(y, m - 1, d) : null;
};

const formatDay = (iso, opts = {}) => {
  const d = parseDay(iso);
  if (!d) return '—';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', ...opts });
};

const countdown = (days) => {
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
};

const formatMoney = (v, digits = 2) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const sign = v < 0 ? '-' : '';
  return `${sign}$${Math.abs(v).toFixed(digits)}`;
};

const formatSigned = (v, digits = 1) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}%`;
};

const formatCap = (v) => {
  if (!v) return null;
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(0)}B`;
  return `$${(v / 1e6).toFixed(0)}M`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Surprise history — four quarters of actual EPS against consensus.
//
// A diverging strip: bars grow up from a zero line when the company beat and
// down when it missed, oldest on the left. Only four values, so every one is
// labeled directly rather than hidden behind a hover.
// ─────────────────────────────────────────────────────────────────────────────

const SURPRISE_CAP = 20;   // % — past this the bar is full height and the label carries the real figure
const ARM = 22;            // px per side of the zero line

const SurpriseHistory = ({ history }) => {
  if (!history || history.length === 0) {
    return (
      <p className="text-[11px] text-slate-500">No consensus history published for this company.</p>
    );
  }

  const quarters = [...history].reverse(); // oldest → newest

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
          Last {quarters.length} quarters vs consensus
        </span>
        <span className="text-[10px] text-slate-600">oldest → newest</span>
      </div>

      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${quarters.length}, minmax(0, 1fr))` }}>
        {quarters.map((q, i) => {
          const res = getResult(q.result);
          const ResIcon = res.Icon;
          const pct = q.surprise_pct;
          const magnitude = pct === null || pct === undefined
            ? 0
            : Math.min(Math.abs(pct) / SURPRISE_CAP, 1);
          const height = Math.max(3, Math.round(magnitude * ARM));
          const known = pct !== null && pct !== undefined;
          const isUp = known && pct > 0;
          const isDown = known && pct < 0;
          // A quarter that landed exactly on consensus still gets a mark, or
          // it would be indistinguishable from one with no consensus at all.
          const isFlat = known && pct === 0;

          const detail = q.consensus === null || q.consensus === undefined
            ? `${q.fiscal_quarter || 'Quarter'}: reported ${formatMoney(q.eps)} — no consensus on file`
            : `${q.fiscal_quarter || 'Quarter'}: reported ${formatMoney(q.eps)} vs ${formatMoney(q.consensus)} consensus (${formatSigned(pct)}) — reported ${formatDay(q.date)}`;

          return (
            <div key={q.date || i} className="text-center" title={detail}>
              <div className="flex items-center justify-center gap-0.5 h-3.5">
                <ResIcon className="h-2.5 w-2.5 shrink-0" style={{ color: res.color }} />
                <span className="text-[10px] font-mono font-bold text-slate-300 tabular-nums">
                  {pct === null || pct === undefined ? 'n/a' : formatSigned(pct)}
                </span>
              </div>

              {/* Zero line sits between the two arms, so direction reads before color does. */}
              <div className="mt-1" style={{ height: ARM }}>
                <div className="h-full flex flex-col justify-end">
                  {isUp && (
                    <div className="rounded-t-[3px] mx-auto w-3" style={{ height, backgroundColor: BEAT }} />
                  )}
                  {isFlat && (
                    <div className="rounded-t-[2px] mx-auto w-3" style={{ height: 3, backgroundColor: FLAT }} />
                  )}
                </div>
              </div>
              <div className="h-px bg-slate-700" />
              <div style={{ height: ARM }}>
                {isDown && (
                  <div className="rounded-b-[3px] mx-auto w-3" style={{ height, backgroundColor: MISS }} />
                )}
              </div>

              <div className="mt-1 text-[9px] text-slate-500 truncate">{q.fiscal_quarter || '—'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// How the last report actually landed: the surprise, and what the stock did.
// ─────────────────────────────────────────────────────────────────────────────

const LastReportLine = ({ last }) => {
  if (!last) {
    return <p className="text-[11px] text-slate-500">No prior report on record.</p>;
  }

  const res = getResult(last.result);
  const ResIcon = res.Icon;
  const reaction = last.reaction_pct;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${res.chip}`}>
          <ResIcon className="h-2.5 w-2.5" />
          <span>{last.result === 'Unknown' ? 'No consensus' : last.result}</span>
        </span>
        <span className="text-[11px] text-slate-400">
          {last.result === 'Unknown'
            ? <>Reported <span className="text-slate-200 font-mono font-semibold">{formatMoney(last.eps)}</span> on {formatDay(last.date)}</>
            : <>
                <span className="text-slate-200 font-mono font-semibold">{formatMoney(last.eps)}</span>
                {' vs '}
                <span className="font-mono">{formatMoney(last.consensus)}</span>
                {' est · '}
                <span className="text-slate-300 font-mono font-semibold">{formatSigned(last.surprise_pct)}</span>
              </>}
        </span>
      </div>

      {reaction !== null && reaction !== undefined && (
        <div
          className="flex items-center gap-1 text-[11px] text-slate-400"
          title={`Closing price ${last.reaction_window}, bracketing the announcement`}
        >
          {reaction >= 0
            ? <TrendingUp className="h-3 w-3 shrink-0" style={{ color: BEAT }} />
            : <TrendingDown className="h-3 w-3 shrink-0" style={{ color: MISS }} />}
          <span>
            Stock moved{' '}
            <span className="text-slate-200 font-mono font-semibold">{formatSigned(reaction)}</span>
            {' '}around that report
          </span>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// One upcoming report.
// ─────────────────────────────────────────────────────────────────────────────

const EventCard = ({ event, urgent, onAnalyze, onRemove }) => {
  const timing = TIMINGS[event.timing] || TIMINGS.unspecified;
  const TimingIcon = timing.Icon;
  const day = parseDay(event.date);
  const streak = event.beats_of_last;
  const price = event.price || {};

  return (
    <article
      className={`glass-panel rounded-2xl border overflow-hidden transition-colors ${
        urgent ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
      }`}
    >
      <div className="p-4 flex flex-col sm:flex-row gap-4">

        {/* Date block — the thing the reader scans for */}
        <div className={`shrink-0 w-full sm:w-24 rounded-xl border p-2.5 text-center ${
          urgent ? 'border-amber-500/40 bg-amber-500/10' : 'border-slate-800 bg-slate-950/80'
        }`}>
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            {day ? day.toLocaleDateString(undefined, { month: 'short' }) : '—'}
          </div>
          <div className={`text-2xl font-black font-mono leading-tight ${urgent ? 'text-amber-300' : 'text-white'}`}>
            {day ? day.getDate() : '—'}
          </div>
          <div className="text-[10px] text-slate-500">
            {day ? day.toLocaleDateString(undefined, { weekday: 'short' }) : ''}
          </div>
          <div className={`mt-1.5 pt-1.5 border-t text-[10px] font-bold ${
            urgent ? 'border-amber-500/30 text-amber-300' : 'border-slate-800 text-slate-300'
          }`}>
            {countdown(event.days_away)}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {/* Identity */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-mono font-black text-cyan-300">${event.ticker}</span>
                <span className="text-sm font-bold text-white truncate">{event.company_name}</span>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <TimingIcon className="h-3 w-3 text-slate-500" />
                  <span>{timing.label}</span>
                </span>

                <span className="text-slate-700">•</span>

                {event.confirmed ? (
                  <span className="inline-flex items-center gap-1 text-cyan-300" title="This company appears on the published earnings calendar for that day.">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="font-semibold">Confirmed date</span>
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 text-slate-400"
                    title="Not yet announced. Estimated from the same fiscal quarter a year ago, which is how companies schedule."
                  >
                    <CircleDashed className="h-3 w-3" />
                    <span>Projected date</span>
                  </span>
                )}

                {event.fiscal_quarter && (
                  <>
                    <span className="text-slate-700">•</span>
                    <span>Q ending {event.fiscal_quarter}</span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onRemove(event.ticker)}
              title={`Stop watching ${event.ticker}`}
              className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-slate-800 border border-slate-800 transition-colors shrink-0 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* The three numbers worth carrying into the print */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2.5">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Consensus EPS</div>
              <div className="text-base font-mono font-bold text-white mt-0.5 tabular-nums">
                {formatMoney(event.consensus_eps)}
              </div>
              <div className="text-[10px] text-slate-500">
                {event.num_estimates > 0 ? `${event.num_estimates} analysts` : 'Street estimate'}
              </div>
            </div>

            <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2.5">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Beat record</div>
              <div className="text-base font-mono font-bold text-white mt-0.5 tabular-nums">
                {streak ? `${streak.beats}/${streak.of}` : '—'}
              </div>
              <div className="text-[10px] text-slate-500">recent quarters</div>
            </div>

            <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2.5">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Share price</div>
              <div className="text-base font-mono font-bold text-white mt-0.5 tabular-nums">
                {price.last ? `$${price.last.toFixed(2)}` : '—'}
              </div>
              <div className="text-[10px] flex items-center gap-0.5 text-slate-500">
                {price.day_change_pct !== null && price.day_change_pct !== undefined ? (
                  <>
                    {price.day_change_pct >= 0
                      ? <TrendingUp className="h-2.5 w-2.5" style={{ color: BEAT }} />
                      : <TrendingDown className="h-2.5 w-2.5" style={{ color: MISS }} />}
                    <span className="font-mono">{formatSigned(price.day_change_pct, 2)} last session</span>
                  </>
                ) : 'no quote'}
              </div>
            </div>
          </div>

          {/* How the last one went */}
          <div className="rounded-xl bg-slate-950/50 border border-slate-800/80 p-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">Last report</div>
              <LastReportLine last={event.last_report} />
            </div>
            <SurpriseHistory history={event.history} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onAnalyze(event)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
            >
              <Sparkles className="h-3 w-3" />
              <span>Analyze last quarter</span>
              <ChevronRight className="h-3 w-3" />
            </button>

            <a
              href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(event.ticker)}&type=8-K&dateb=&owner=include&count=10`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Landmark className="h-3 w-3" />
              <span>SEC filings</span>
              <ArrowUpRight className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Watchlist editor. Lives on the page it drives, so adding a company and
// seeing its next report are not two different screens.
// ─────────────────────────────────────────────────────────────────────────────

const WatchlistEditor = () => {
  const { watchlist, addToWatchlist, removeFromWatchlist, prepWindowDays, setPrepWindow } = useAppAuth();

  const [input, setInput] = useState('');
  const [matches, setMatches] = useState([]);
  const [notice, setNotice] = useState(null);
  const boxRef = useRef(null);

  // Resolve what the user typed against the SEC's own company list, so a
  // fat-fingered symbol is caught here rather than surfacing as an empty card.
  useEffect(() => {
    const term = input.trim();
    if (term.length < 1) {
      setMatches([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/companies/search?q=${encodeURIComponent(term)}&limit=6`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setMatches(Array.isArray(data) ? data : []);
      } catch {
        // Autocomplete is a convenience; typing a symbol by hand still works.
      }
    }, 200);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [input]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setMatches([]);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const announce = (result) => {
    const messages = {
      added: `${result.symbol} added to your watchlist.`,
      duplicate: `You are already watching ${result.symbol}.`,
      full: `Your watchlist holds ${MAX_WATCHLIST} companies. Remove one to add another.`,
      invalid: 'Enter a ticker symbol, for example NVDA.',
    };
    setNotice({ status: result.status, message: messages[result.status] });
    setTimeout(() => setNotice(null), 3200);
  };

  const commit = (symbol) => {
    announce(addToWatchlist(symbol));
    setInput('');
    setMatches([]);
  };

  return (
    <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-cyan-400" />
          <span>Your watchlist</span>
          <span className="text-slate-600 font-mono normal-case">({watchlist.length}/{MAX_WATCHLIST})</span>
        </h3>
        <span className="text-[11px] text-slate-500">Saved to your profile automatically</span>
      </div>

      <div ref={boxRef} className="relative">
        <form
          onSubmit={(e) => { e.preventDefault(); commit(input); }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Add a company — ticker or name (e.g. NVDA, Costco)"
              className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || watchlist.length >= MAX_WATCHLIST}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add</span>
          </button>
        </form>

        {matches.length > 0 && (
          <ul className="absolute z-30 mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/98 backdrop-blur shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
            {matches.map((m) => (
              <li key={m.cik || m.ticker}>
                <button
                  type="button"
                  onClick={() => commit(m.ticker)}
                  className="w-full px-3 py-2 text-left hover:bg-slate-800/80 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span className="text-[11px] font-mono font-bold text-cyan-300 w-14 shrink-0">${m.ticker}</span>
                  <span className="text-[11px] text-slate-300 truncate">{m.company_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {notice && (
        <p className={`text-[11px] font-semibold ${notice.status === 'added' ? 'text-green-300' : 'text-amber-300'}`}>
          {notice.message}
        </p>
      )}

      {watchlist.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {watchlist.map((ticker) => (
            <span
              key={ticker}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold font-mono"
            >
              <span>${ticker}</span>
              <button
                type="button"
                onClick={() => removeFromWatchlist(ticker)}
                title={`Remove ${ticker}`}
                className="text-slate-600 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">
          Your watchlist is empty. Add a company above to put it on the radar.
        </p>
      )}

      <div className="pt-3 border-t border-slate-800/80">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-semibold text-slate-300">Prep window</span>
          <span className="text-[11px] text-slate-500">Flag a report this many days out</span>
        </div>
        <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950/70 p-0.5 w-fit">
          {PREP_WINDOW_CHOICES.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setPrepWindow(days)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                prepWindowDays === days ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {days} {days === 1 ? 'day' : 'days'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Master TabRadar component
// ─────────────────────────────────────────────────────────────────────────────

const TabRadar = ({ onAnalyze }) => {
  const { watchlist, prepWindowDays, addToWatchlist, removeFromWatchlist } = useAppAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [windowDays, setWindowDays] = useState(30);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Joined rather than the array itself: the effect should re-run when the
  // membership changes, not every time the provider hands back a new array.
  const watchKey = watchlist.join(',');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/earnings-calendar?tickers=${encodeURIComponent(watchKey)}&window=${windowDays}`);
      if (!res.ok) throw new Error(`The calendar service answered ${res.status}.`);
      setData(await res.json());
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Could not reach the earnings calendar.');
    } finally {
      setLoading(false);
    }
  }, [watchKey, windowDays]);

  useEffect(() => { load(); }, [load]);

  const events = data?.events || [];

  const groups = useMemo(() => {
    const urgent = [];
    const soon = [];
    const later = [];
    for (const e of events) {
      if (e.days_away <= prepWindowDays) urgent.push(e);
      else if (e.days_away <= windowDays) soon.push(e);
      else later.push(e);
    }
    return { urgent, soon, later };
  }, [events, prepWindowDays, windowDays]);

  const next = events[0];
  const confirmedCount = data?.confirmed_count || 0;

  const handleAnalyze = (event) => {
    onAnalyze?.(`${event.company_name} (${event.ticker}) latest quarterly earnings report`);
  };

  return (
    <div className="space-y-5 text-left">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/10 via-blue-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-cyan-400 text-[11px] font-bold uppercase tracking-wider mb-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              <span>Nasdaq calendar · SEC EDGAR · consensus estimates</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Earnings Radar
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
              Who on your watchlist reports next, what the street expects going in, and how the
              last four quarters actually landed against those estimates.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950/70 p-0.5">
              {[14, 30, 45].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setWindowDays(d)}
                  title={`Confirm dates up to ${d} days out`}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    windowDays === d ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-xs font-semibold text-slate-300 hover:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Next up — the single answer most visits are looking for */}
        {next && (
          <div className="relative mt-5 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="shrink-0">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Next on your watchlist</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-black text-white leading-none">
                  {next.days_away <= 0 ? 'Today' : next.days_away}
                </span>
                {next.days_away > 0 && (
                  <span className="text-sm font-semibold text-slate-400">
                    {next.days_away === 1 ? 'day away' : 'days away'}
                  </span>
                )}
              </div>
            </div>

            <div className="sm:border-l sm:border-slate-800 sm:pl-4 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-mono font-black text-cyan-300">${next.ticker}</span>
                <span className="text-sm font-bold text-white truncate">{next.company_name}</span>
                <span className="text-[11px] text-slate-400">{formatDay(next.date, { year: undefined })}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {(TIMINGS[next.timing] || TIMINGS.unspecified).label}
                {' · '}
                {next.confirmed ? 'confirmed date' : 'projected date'}
                {next.consensus_eps !== null && next.consensus_eps !== undefined && (
                  <> · street looks for <span className="text-slate-200 font-mono font-semibold">{formatMoney(next.consensus_eps)}</span> a share</>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-500 shrink-0">
              <span>{confirmedCount} confirmed</span>
              <span className="text-slate-700">•</span>
              <span>{events.length - confirmedCount} projected</span>
              {lastUpdated && (
                <>
                  <span className="text-slate-700">•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-4 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold text-rose-300">Could not load the earnings calendar</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{error}</p>
          </div>
          <button
            type="button"
            onClick={load}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-cyan-300 cursor-pointer shrink-0"
          >
            Try again
          </button>
        </div>
      )}

      <WatchlistEditor />

      {/* ── The schedule ────────────────────────────────────────────────── */}
      {loading && events.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-8 flex items-center justify-center gap-2 text-xs text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
          <span>Checking the calendar and pulling consensus history…</span>
        </div>
      ) : watchlist.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-8 text-center">
          <Inbox className="h-8 w-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-300">Nothing on the radar yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Add a company above and this page will tell you when it reports, what the street expects,
            and how it has handled the last four quarters.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            {['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => addToWatchlist(t)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono font-bold text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                + ${t}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {[
            {
              key: 'urgent',
              list: groups.urgent,
              title: `Reporting within ${prepWindowDays} ${prepWindowDays === 1 ? 'day' : 'days'}`,
              hint: 'Your prep window',
              Icon: Target,
              accent: 'text-amber-400',
            },
            {
              key: 'soon',
              list: groups.soon,
              title: `Next ${windowDays} days`,
              hint: 'On the published calendar',
              Icon: CalendarClock,
              accent: 'text-cyan-400',
            },
            {
              key: 'later',
              list: groups.later,
              title: `Beyond ${windowDays} days`,
              hint: 'Dates projected from last year',
              Icon: CircleDashed,
              accent: 'text-slate-500',
            },
          ].filter(section => section.list.length > 0).map(section => {
            const SectionIcon = section.Icon;
            return (
              <section key={section.key} className="space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <SectionIcon className={`h-3.5 w-3.5 ${section.accent}`} />
                    <span>{section.title}</span>
                    <span className="text-slate-600 font-mono normal-case">({section.list.length})</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 hidden sm:block">{section.hint}</span>
                </div>

                {section.list.map(event => (
                  <EventCard
                    key={event.ticker}
                    event={event}
                    urgent={section.key === 'urgent'}
                    onAnalyze={handleAnalyze}
                    onRemove={removeFromWatchlist}
                  />
                ))}
              </section>
            );
          })}

          {events.length === 0 && !loading && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-8 text-center">
              <CalendarClock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-300">No reporting dates found</p>
              <p className="text-xs text-slate-500 mt-1">
                None of your companies have a schedule we could resolve. Try adding a widely covered name.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Tickers we could not place ──────────────────────────────────── */}
      {data?.unscheduled?.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span>No schedule found</span>
            <span className="text-slate-600 font-mono normal-case">({data.unscheduled.length})</span>
          </h3>
          {data.unscheduled.map(item => (
            <div
              key={item.ticker}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950/50"
            >
              <span className="text-xs font-mono font-bold text-slate-300 w-16 shrink-0">${item.ticker}</span>
              <span className="text-[11px] text-slate-400 flex-1 min-w-0 truncate">{item.reason}</span>
              <button
                type="button"
                onClick={() => removeFromWatchlist(item.ticker)}
                className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                title={`Remove ${item.ticker}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </section>
      )}

      {/* ── Everyone else reporting in the window ───────────────────────── */}
      {data?.also_reporting?.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Landmark className="h-3.5 w-3.5 text-slate-500" />
              <span>Also reporting in the next {windowDays} days</span>
            </h3>
            <span className="text-[11px] text-slate-500 hidden sm:block">Largest companies, not on your list</span>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80">
            {data.also_reporting.map(row => {
              const rowTiming = TIMINGS[row.timing] || TIMINGS.unspecified;
              const RowTimingIcon = rowTiming.Icon;
              return (
                <div key={`${row.ticker}-${row.date}`} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-900/40 transition-colors">
                  <div className="w-16 shrink-0 text-[11px] font-semibold text-slate-300">
                    {formatDay(row.date, { weekday: undefined })}
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-300 w-16 shrink-0">${row.ticker}</span>
                  <span className="text-[11px] text-slate-300 flex-1 min-w-0 truncate">{row.company_name}</span>

                  <span className="hidden lg:flex items-center gap-1 text-[10px] text-slate-500 w-32 shrink-0">
                    <RowTimingIcon className="h-3 w-3" />
                    <span>{rowTiming.label}</span>
                  </span>

                  <span className="hidden sm:block text-[11px] font-mono text-slate-400 w-16 shrink-0 text-right tabular-nums">
                    {formatCap(row.market_cap) || '—'}
                  </span>

                  <button
                    type="button"
                    onClick={() => addToWatchlist(row.ticker)}
                    disabled={watchlist.length >= MAX_WATCHLIST}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-[11px] font-semibold text-slate-300 hover:text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={watchlist.length >= MAX_WATCHLIST ? 'Watchlist is full' : `Watch ${row.ticker}`}
                  >
                    <Plus className="h-3 w-3" />
                    <span>Watch</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <p className="text-[11px] text-slate-600 text-center pt-1">
        Confirmed dates and consensus estimates from the Nasdaq earnings calendar · reporting history
        cross-checked against SEC EDGAR 8-K filings · prices from the public market feed.
        Projected dates are estimates, not announcements.
      </p>
    </div>
  );
};

export default TabRadar;
