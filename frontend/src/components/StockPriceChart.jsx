import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, AlertTriangle, Rows3, Activity } from 'lucide-react';

// Time windows the reader can zoom between. Presets only — nobody fights a
// calendar grid to ask for "last month".
const RANGES = [
  { id: '7d', label: '7D', full: 'Last 7 days' },
  { id: '1mo', label: '1M', full: 'Last month' },
  { id: '6mo', label: '6M', full: 'Last 6 months' },
  { id: '1y', label: '1Y', full: 'Last year' },
];

// One series, so direction is the only thing color carries — and it is always
// paired with an arrow icon and a signed value, never color alone.
const UP_COLOR = '#34d399';
const DOWN_COLOR = '#fb7185';
const SURFACE = '#0b1120';   // the card surface: used for mark rings, not fills
const GRID = '#1e293b';

const CHART_HEIGHT = 250;
const PAD = { top: 18, right: 66, bottom: 26, left: 58 };

const formatPrice = (v, currency = 'USD') => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const symbol = currency === 'USD' ? '$' : '';
  const digits = Math.abs(v) >= 1000 ? 0 : 2;
  return `${symbol}${v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
};

const formatTimestamp = (t, range, long = false) => {
  const d = new Date(t);
  if (range === '7d') {
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      ...(long ? { hour: 'numeric', minute: '2-digit' } : { hour: 'numeric' }),
    });
  }
  return d.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
    ...(range === '1y' || long ? { year: 'numeric' } : {}),
  });
};

const StockPriceChart = ({ ticker, companyName }) => {
  const [range, setRange] = useState('1mo');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(null);     // hovered/focused point index
  const [showTable, setShowTable] = useState(false);
  const [width, setWidth] = useState(720);
  const [reloadKey, setReloadKey] = useState(0);

  const containerRef = useRef(null);

  // Render at real pixel width so the 2px strokes stay 2px and hit targets
  // keep their intended size instead of being scaled by the viewBox.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width;
      if (w) setWidth(w);
    });
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width || 720);
    return () => observer.disconnect();
  }, []);

  // Refetch keeps the frame: the previous series stays rendered (dimmed) while
  // a new range loads, so switching ranges never collapses the card.
  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/stock-history?ticker=${encodeURIComponent(ticker)}&range=${range}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `Price feed returned ${res.status}`);
        }
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setCursor(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not load price history.');
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [ticker, range, reloadKey]);

  const points = data?.points || [];
  const isUp = (data?.change ?? 0) >= 0;
  const color = isUp ? UP_COLOR : DOWN_COLOR;

  const geometry = useMemo(() => {
    if (points.length < 2) return null;

    const plotW = Math.max(width - PAD.left - PAD.right, 40);
    const plotH = CHART_HEIGHT - PAD.top - PAD.bottom;

    const values = points.map(p => p.c);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const headroom = (rawMax - rawMin || rawMax * 0.02 || 1) * 0.08;
    const yMin = rawMin - headroom;
    const yMax = rawMax + headroom;

    const xAt = i => PAD.left + (i / (points.length - 1)) * plotW;
    const yAt = v => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;

    const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(2)},${yAt(p.c).toFixed(2)}`).join(' ');
    const area = `${line} L${xAt(points.length - 1).toFixed(2)},${(PAD.top + plotH).toFixed(2)} L${PAD.left.toFixed(2)},${(PAD.top + plotH).toFixed(2)} Z`;

    // Ticks land on round numbers ($320, $330) rather than wherever the
    // domain happens to divide.
    const span = yMax - yMin;
    const magnitude = Math.pow(10, Math.floor(Math.log10(span / 4)));
    let yTicks = [];
    for (const factor of [1, 2, 2.5, 5, 10, 20]) {
      const step = factor * magnitude;
      const candidate = [];
      for (let v = Math.ceil(yMin / step) * step; v <= yMax && candidate.length < 12; v += step) {
        candidate.push(Number(v.toFixed(6)));
      }
      yTicks = candidate;
      if (candidate.length <= 5) break;   // 3-5 gridlines reads best
    }
    const tickCount = Math.min(5, points.length);
    const xTicks = Array.from({ length: tickCount }, (_, i) =>
      Math.round((i / (tickCount - 1)) * (points.length - 1))
    );

    return { plotW, plotH, yMin, yMax, xAt, yAt, line, area, yTicks, xTicks };
  }, [points, width]);

  const indexFromPointer = useCallback((clientX) => {
    if (!geometry || !containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left - PAD.left;
    const ratio = Math.min(Math.max(x / geometry.plotW, 0), 1);
    return Math.round(ratio * (points.length - 1));
  }, [geometry, points.length]);

  const handleKeyDown = (e) => {
    if (!geometry) return;
    const last = points.length - 1;
    const current = cursor ?? last;
    if (e.key === 'ArrowLeft') { e.preventDefault(); setCursor(Math.max(0, current - 1)); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); setCursor(Math.min(last, current + 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setCursor(0); }
    else if (e.key === 'End') { e.preventDefault(); setCursor(last); }
    else if (e.key === 'Escape') { setCursor(null); }
  };

  const active = cursor !== null && points[cursor] ? points[cursor] : null;
  const activeChange = active && data ? active.c - data.first : null;

  if (!ticker) return null;

  return (
    <div className="glass-panel rounded-2xl border border-slate-800 p-5">

      {/* Header: the number leads, the range presets sit above the plot */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            <span>Share price — {companyName || ticker}</span>
            <span className="font-mono text-cyan-300">{data?.ticker || ticker}</span>
            {loading && data && <RefreshCw className="h-3 w-3 animate-spin text-cyan-400" />}
          </div>

          <div className="mt-1.5 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {formatPrice(data?.last, data?.currency)}
            </span>
            {data && (
              <span className={`flex items-center space-x-1 text-sm font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span>
                  {isUp ? '+' : '−'}{formatPrice(Math.abs(data.change), data.currency)}
                  {' '}({isUp ? '+' : '−'}{Math.abs(data.change_pct).toFixed(2)}%)
                </span>
                <span className="text-slate-500 font-medium">
                  over {RANGES.find(r => r.id === range)?.full.toLowerCase()}
                </span>
              </span>
            )}
          </div>

          {data?.resolved_from && (
            <p className="text-[11px] text-amber-400/90 mt-1">
              No listing found for {data.resolved_from} — showing {data.ticker}
              {data.name ? ` (${data.name})` : ''} instead.
            </p>
          )}

          {data && (
            <p className="text-[11px] text-slate-500 mt-1">
              {data.exchange ? `${data.exchange} · ` : ''}
              Range low {formatPrice(data.low, data.currency)} · high {formatPrice(data.high, data.currency)}
              {data.as_of ? ` · as of ${new Date(data.as_of).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950/70 p-0.5" role="group" aria-label="Chart time range">
            {RANGES.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                aria-pressed={range === r.id}
                title={r.full}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  range === r.id ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowTable(v => !v)}
            aria-pressed={showTable}
            title="Show the underlying values as a table"
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              showTable
                ? 'bg-slate-800 text-cyan-300 border-slate-700'
                : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Rows3 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Plot */}
      <div ref={containerRef} className="relative mt-4" style={{ height: CHART_HEIGHT }}>
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
            <p className="text-xs text-slate-400 max-w-xs">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey(k => k + 1)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold cursor-pointer"
            >
              Try again
            </button>
          </div>
        ) : !geometry ? (
          <div className="absolute inset-0 flex items-center justify-center space-x-2 text-xs text-slate-500">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-400" />
            <span>Loading {ticker} price history...</span>
          </div>
        ) : (
          <>
            <svg
              width={width}
              height={CHART_HEIGHT}
              role="img"
              tabIndex={0}
              aria-label={`${companyName || ticker} closing price over the ${RANGES.find(r => r.id === range)?.full.toLowerCase()}, from ${formatPrice(data.first, data.currency)} to ${formatPrice(data.last, data.currency)}. Use the arrow keys to read individual values.`}
              onKeyDown={handleKeyDown}
              onBlur={() => setCursor(null)}
              className={`focus:outline-none focus:ring-1 focus:ring-cyan-500/50 rounded-lg transition-opacity ${loading ? 'opacity-40' : 'opacity-100'}`}
            >
              <defs>
                <linearGradient id={`priceFill-${ticker}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.16" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Recessive hairline grid + value axis */}
              {geometry.yTicks.map((v, i) => (
                <g key={i}>
                  <line
                    x1={PAD.left} x2={width - PAD.right}
                    y1={geometry.yAt(v)} y2={geometry.yAt(v)}
                    stroke={GRID} strokeWidth="1"
                  />
                  <text
                    x={PAD.left - 10} y={geometry.yAt(v)}
                    textAnchor="end" dominantBaseline="middle"
                    className="fill-slate-500 tabular-nums" style={{ fontSize: 10 }}
                  >
                    {formatPrice(v, data.currency)}
                  </text>
                </g>
              ))}

              {/* Time axis */}
              {geometry.xTicks.map((idx, i) => (
                <text
                  key={i}
                  x={geometry.xAt(idx)}
                  y={CHART_HEIGHT - 8}
                  textAnchor={i === 0 ? 'start' : i === geometry.xTicks.length - 1 ? 'end' : 'middle'}
                  className="fill-slate-500" style={{ fontSize: 10 }}
                >
                  {formatTimestamp(points[idx].t, range)}
                </text>
              ))}

              <path d={geometry.area} fill={`url(#priceFill-${ticker})`} />
              <path d={geometry.line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

              {/* Endpoint marker + its one direct label */}
              <circle
                cx={geometry.xAt(points.length - 1)} cy={geometry.yAt(data.last)}
                r="4" fill={color} stroke={SURFACE} strokeWidth="2"
              />
              <text
                x={geometry.xAt(points.length - 1) + 10}
                y={geometry.yAt(data.last)}
                dominantBaseline="middle"
                className="tabular-nums" style={{ fontSize: 11, fontWeight: 700, fill: color }}
              >
                {formatPrice(data.last, data.currency)}
              </text>

              {/* Crosshair: readers aim at a date, not at a 2px line */}
              {active && (
                <g>
                  <line
                    x1={geometry.xAt(cursor)} x2={geometry.xAt(cursor)}
                    y1={PAD.top} y2={PAD.top + geometry.plotH}
                    stroke="#475569" strokeWidth="1"
                  />
                  <circle
                    cx={geometry.xAt(cursor)} cy={geometry.yAt(active.c)}
                    r="4" fill={color} stroke={SURFACE} strokeWidth="2"
                  />
                </g>
              )}

              {/* Hit layer spans the whole plot, so the pointer only has to be closest */}
              <rect
                x={PAD.left} y={PAD.top}
                width={geometry.plotW} height={geometry.plotH}
                fill="transparent"
                style={{ touchAction: 'none' }}
                onPointerMove={(e) => setCursor(indexFromPointer(e.clientX))}
                onPointerLeave={() => setCursor(null)}
              />
            </svg>

            {/* Tooltip: value leads, label follows */}
            {active && (
              <div
                className="pointer-events-none absolute z-10 rounded-lg border border-slate-700 bg-slate-950/95 px-2.5 py-1.5 shadow-xl"
                style={{
                  left: Math.min(Math.max(geometry.xAt(cursor) - 70, 0), Math.max(width - 150, 0)),
                  top: 0,
                  minWidth: 140,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-3 rounded" style={{ backgroundColor: color }} />
                  <span className="text-sm font-bold text-white tabular-nums">
                    {formatPrice(active.c, data.currency)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {formatTimestamp(active.t, range, true)}
                </div>
                {activeChange !== null && (
                  <div className={`text-[10px] font-semibold ${activeChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {activeChange >= 0 ? '+' : '−'}{formatPrice(Math.abs(activeChange), data.currency)} from range start
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Table twin — every value in the plot is reachable without hovering */}
      {showTable && points.length > 0 && (
        <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs">
            <caption className="sr-only">
              {companyName || ticker} closing prices, {RANGES.find(r => r.id === range)?.full.toLowerCase()}
            </caption>
            <thead className="sticky top-0 bg-slate-900">
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
                <th scope="col" className="px-3 py-2 font-bold">Date</th>
                <th scope="col" className="px-3 py-2 font-bold text-right">Close</th>
                <th scope="col" className="px-3 py-2 font-bold text-right">From range start</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => {
                const delta = p.c - data.first;
                return (
                  <tr key={p.t} className={i % 2 ? 'bg-slate-950/40' : ''}>
                    <td className="px-3 py-1.5 text-slate-300">{formatTimestamp(p.t, range, true)}</td>
                    <td className="px-3 py-1.5 text-right text-slate-200 tabular-nums">{formatPrice(p.c, data.currency)}</td>
                    <td className={`px-3 py-1.5 text-right tabular-nums ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {delta >= 0 ? '+' : '−'}{formatPrice(Math.abs(delta), data.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-2.5 text-[10px] text-slate-500">
        Closing prices from the public market feed · hover, or focus the chart and use ← → , to read a single day
      </p>
    </div>
  );
};

export default StockPriceChart;
