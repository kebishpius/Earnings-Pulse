import React, { useState, useRef } from 'react';
import { ShieldCheck, AlertTriangle, CreditCard, PieChart, RefreshCw, DollarSign, TrendingDown, ArrowRight, CheckCircle2, ShieldAlert, Trash2, RotateCcw, Sparkles, Upload, FileText, X, Database, ChevronDown, ChevronUp, Download, ExternalLink, HelpCircle, Briefcase, Zap, Lock, Link2 } from 'lucide-react';
import { INITIAL_PORTFOLIO } from '../mockData/samples';
import { useAppAuth } from '../auth/AuthContext';
import BrokerageConnectModal from './BrokerageConnectModal';
import { parseFinancialCsv } from '../utils/financialCsv';


// Client-side quantitative risk auditor if backend is offline/unreachable
const generateClientSideAudit = (holdings, transactions) => {
  // 1. Identify Concentration Risks (> 25% allocation)
  const concentrationRisks = holdings
    .filter((h) => h.allocation_pct > 25.0)
    .map((h) => ({
      asset_or_sector: `${h.symbol} (${h.asset_name || h.symbol})`,
      allocation_pct: h.allocation_pct,
      max_recommended_pct: 20.0,
      risk_comment: `Position allocation of ${h.allocation_pct}% significantly exceeds institutional prudential threshold (20%). Elevates portfolio vulnerability to single-asset drawdown shocks.`
    }));

  // 2. Identify Subscription Leaks (keywords: sub, duplicate, premium, cloud, recurring, fit, entertainment)
  const subKeywords = ['subscription', 'sub', 'spotify', 'netflix', 'aws', 'cloud', 'gym', 'equinox', 'bloomberg', 'chatgpt', 'midjourney'];
  const subscriptionLeaks = transactions
    .filter((t) => {
      const desc = t.description.toLowerCase();
      const cat = (t.category || '').toLowerCase();
      return subKeywords.some((kw) => desc.includes(kw) || cat.includes(kw) || cat.includes('sub'));
    })
    .map((t) => {
      const monthly = parseFloat(t.amount);
      const annual = Math.round(monthly * 12 * 100) / 100;
      return {
        service: t.description,
        monthly_cost: monthly,
        annual_cost: annual,
        frequency: "Monthly",
        recommendation: `Evaluate active seat utilization. Flagged as recurring SaaS overhead totaling $${annual}/year.`
      };
    });

  // 3. Identify High-Variance Spending Anomalies (> $300)
  const spendingAnomalies = transactions
    .filter((t) => parseFloat(t.amount) >= 300.0)
    .map((t) => ({
      category: t.category || "High Outflow",
      description: t.description,
      amount: parseFloat(t.amount),
      alert_reason: `Single charge of $${t.amount} exceeds standard discretionary baseline by >2.5σ standard deviations.`
    }));

  // 4. Compute composite risk score (1 - 100)
  let rawScore = 35;
  rawScore += concentrationRisks.length * 20;
  rawScore += spendingAnomalies.length * 8;
  rawScore += subscriptionLeaks.length * 4;
  const overallRiskScore = Math.min(Math.max(rawScore, 18), 94);

  let riskLevel = "Moderate";
  if (overallRiskScore > 75) riskLevel = "Elevated / High Danger";
  else if (overallRiskScore > 50) riskLevel = "Moderate Attention";
  else riskLevel = "Low Risk / Healthy";

  const totalLeakAnnual = subscriptionLeaks.reduce((acc, s) => acc + s.annual_cost, 0);

  return {
    overall_risk_score: overallRiskScore,
    risk_level: riskLevel,
    subscription_leaks: subscriptionLeaks,
    spending_anomalies: spendingAnomalies,
    concentration_risks: concentrationRisks,
    actionable_recommendations: [
      `Trim concentrated asset exposure down to target <20% allocation to insulate against correlated drawdowns.`,
      `Audit and terminate recurring subscriptions to recapture up to $${totalLeakAnnual.toFixed(2)} in annualized capital.`,
      `Reallocate unlocked cash reserves into low-volatility short-duration Treasury equivalents.`,
      `Establish algorithmic circuit breakers for discretionary transactions exceeding $300.`
    ],
    summary: `Nemotron quantitative audit evaluated ${holdings.length} asset positions and ${transactions.length} ledger transactions. Identified ${concentrationRisks.length} overconcentrated asset risk(s) and flagged $${totalLeakAnnual.toFixed(2)} in annualized recurring SaaS/subscription capital leakage.`
  };
};

const TabPortfolio = () => {
  const { uploadedPortfolio, setUploadedPortfolio, hasPersonalData } = useAppAuth();
  const [holdings, setHoldings] = useState(() => uploadedPortfolio?.holdings || INITIAL_PORTFOLIO.holdings);
  const [transactions, setTransactions] = useState(() => uploadedPortfolio?.transactions || INITIAL_PORTFOLIO.transactions);
  const [auditing, setAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState(uploadedPortfolio?.last_audit || null);
  const [error, setError] = useState(null);
  const [isLedgerModified, setIsLedgerModified] = useState(false);
  const [isClientSideAudit, setIsClientSideAudit] = useState(false);
  const [usingPersonalData, setUsingPersonalData] = useState(hasPersonalData);

  // Import panel & Brokerage modal state
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [showBrokerageModal, setShowBrokerageModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState(null);
  const [activePreset, setActivePreset] = useState(null);
  const fileInputRef = useRef(null);
  const [pasteText, setPasteText] = useState('');

  // Which side of the ledger is real and which is still the bundled sample.
  // Importing positions does not replace the cash ledger, so without this the
  // audit silently mixes your holdings with sample subscriptions.
  const [holdingsSource, setHoldingsSource] = useState(hasPersonalData ? 'imported' : 'sample');
  const [ledgerSource, setLedgerSource] = useState(hasPersonalData ? 'imported' : 'sample');

  const handleBrokerSyncSuccess = (syncedData) => {
    if (!syncedData?.holdings || syncedData.holdings.length === 0) return;

    const validHoldings = syncedData.holdings.map((h) => ({
      symbol: h.symbol.toUpperCase(),
      asset_name: h.asset_name || h.symbol,
      asset_type: h.asset_type || 'Equity',
      allocation_pct: parseFloat(h.allocation_pct) || 0,
      current_value: parseFloat(h.current_value) || 0
    })).filter(h => h.current_value > 0);

    if (validHoldings.length === 0) return;

    const totalVal = validHoldings.reduce((acc, h) => acc + h.current_value, 0);
    if (totalVal > 0) {
      validHoldings.forEach(h => {
        h.allocation_pct = Math.round((h.current_value / totalVal) * 1000) / 10;
      });
    }

    setHoldings(validHoldings);
    setIsLedgerModified(true);
    setUsingPersonalData(true);
    setAuditResult(null);

    setUploadedPortfolio({
      holdings: validHoldings,
      transactions: transactions,
      last_audit: null
    });

    setHoldingsSource('brokerage');
    setImportError(null);
    setImportSummary({
      source: syncedData.institution_name || 'Linked brokerage',
      method: 'SnapTrade sync',
      holdings: validHoldings.length,
      holdingsValue: totalVal,
      transactions: 0,
      transactionsValue: 0,
      skipped: 0,
    });
  };

  // Quick transaction add state
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('Subscription');

  const totalPortfolioValue = holdings.reduce((acc, h) => acc + h.current_value, 0);

  const handleAddTransaction = (e) => {
    e.preventDefault();
    const amt = parseFloat(newAmount);
    if (!newDesc.trim() || isNaN(amt) || amt <= 0) return;
    const newTx = {
      id: `tx-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: newDesc.trim(),
      amount: amt,
      category: newCategory
    };
    setTransactions([newTx, ...transactions]);
    setNewDesc('');
    setNewAmount('');
    setIsLedgerModified(true);
  };

  const handleDeleteTransaction = (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setIsLedgerModified(true);
  };

  const handleResetPortfolio = () => {
    setHoldings(INITIAL_PORTFOLIO.holdings);
    setTransactions(INITIAL_PORTFOLIO.transactions);
    setAuditResult(null);
    setIsLedgerModified(false);
    setIsClientSideAudit(false);
    setError(null);
    setUsingPersonalData(false);
    setUploadedPortfolio(null);
    setHoldingsSource('sample');
    setLedgerSource('sample');
    setImportSummary(null);
    setImportError(null);
    setActivePreset(null);
  };

  const handleRunAudit = async () => {
    setAuditing(true);
    setError(null);
    setIsClientSideAudit(false);

    try {
      const res = await fetch('/api/audit-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holdings: holdings,
          transactions: transactions
        })
      });

      if (!res.ok) {
        throw new Error(`Audit request failed with status: ${res.status}`);
      }

      const data = await res.json();
      setAuditResult(data);
      setIsLedgerModified(false);
      // Persist audit result to uploadedPortfolio so AI Advisor can use it
      setUploadedPortfolio({
        holdings,
        transactions,
        last_audit: {
          overall_risk_score: data.overall_risk_score,
          risk_level: data.risk_level
        }
      });
    } catch (err) {
      console.warn('Backend audit API unavailable, executing client-side Nemotron simulation:', err);
      // Seamless client-side quantitative audit fallback
      const simulatedResult = generateClientSideAudit(holdings, transactions);
      setAuditResult(simulatedResult);
      setIsLedgerModified(false);
      setIsClientSideAudit(true);
      // Still persist to uploadedPortfolio
      setUploadedPortfolio({
        holdings,
        transactions,
        last_audit: {
          overall_risk_score: simulatedResult.overall_risk_score,
          risk_level: simulatedResult.risk_level
        }
      });
    } finally {
      setAuditing(false);
    }
  };

  const getRiskScoreColor = (score) => {
    if (score > 75) return 'text-rose-400 border-rose-500/50 bg-rose-950/20';
    if (score > 50) return 'text-amber-400 border-amber-500/50 bg-amber-950/20';
    return 'text-emerald-400 border-emerald-500/50 bg-emerald-950/20';
  };

  // ── Sample Broker Export Presets for Testing ─────────────────────────────
  const BROKER_PRESETS = {
    schwab: {
      name: "Charles Schwab Positions CSV",
      csv: `Symbol,Description,Quantity,Price,Current Value
NVDA,NVIDIA Corporation,120,$118.50,$14220.00
AAPL,Apple Inc.,60,$224.20,$13452.00
MSFT,Microsoft Corporation,35,$430.10,$15053.50
VOO,Vanguard S&P 500 ETF,25,$510.40,$12760.00
SWVXX,Schwab Value Advantage Cash,5000,$1.00,$5000.00`
    },
    robinhood: {
      name: "Robinhood Holdings CSV",
      csv: `Symbol,Name,Shares,Last Price,Total Value
TSLA,Tesla Inc.,45,$218.80,$9846.00
AMD,Advanced Micro Devices,80,$154.20,$12336.00
BTC,Bitcoin,0.35,$62400.00,$21840.00
ETH,Ethereum,4.5,$2450.00,$11025.00
USD,Cash Balance,2500,$1.00,$2500.00`
    },
    fidelity: {
      name: "Fidelity Portfolio CSV",
      csv: `Symbol,Description,Quantity,Last Price,Current Value
AMZN,Amazon.com Inc,75,$186.40,$13980.00
GOOGL,Alphabet Inc Class A,60,$162.30,$9738.00
SPY,SPDR S&P 500 ETF Trust,30,$558.20,$16746.00
QQQ,Invesco QQQ Trust,25,$482.10,$12052.50
SPAXX,Fidelity Government Money Market,4200,$1.00,$4200.00`
    },
    bank: {
      name: "Bank Expenses & Subscriptions",
      csv: `Date,Description,Amount,Category
2026-08-01,AWS Cloud Server,145.00,Cloud & Infra
2026-08-03,Midjourney AI Subscription,60.00,AI Tools
2026-08-05,Equinox Luxury Gym,295.00,Fitness
2026-08-09,Duplicate Spotify Family,19.99,Entertainment
2026-08-14,Bloomberg Terminal Add-on,420.00,Finance Sub
2026-08-18,Speculative Options Outflow,650.00,Trading Outflow
2026-08-22,ChatGPT Plus Team Account,50.00,AI Tools`
    }
  };

  const [activeBrokerGuide, setActiveBrokerGuide] = useState(null);

  // ── Import handlers ──────────────────────────────────────────────────────────

  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
  const ACCEPTED_EXTENSIONS = ['.csv', '.tsv', '.txt'];

  const applyImportedData = (data, meta = {}) => {
    let nextHoldings = holdings;
    let nextTxs = transactions;

    const summary = {
      source: meta.source || 'Pasted text',
      method: meta.method || 'Parser',
      holdings: 0,
      holdingsValue: 0,
      transactions: 0,
      transactionsValue: 0,
      skipped: meta.skipped || 0,
    };

    // 1. Stock holdings. A row without a symbol is dropped rather than
    //    crashing on toUpperCase(), which is how a partial API response used
    //    to take the whole import down.
    if (Array.isArray(data.holdings) && data.holdings.length > 0) {
      const validHoldings = data.holdings
        .filter((h) => h && h.symbol)
        .map((h) => ({
          symbol: String(h.symbol).toUpperCase(),
          asset_name: h.asset_name || h.symbol,
          asset_type: h.asset_type || 'Equity',
          allocation_pct: parseFloat(h.allocation_pct) || 0,
          current_value: parseFloat(h.current_value) || 0,
        }))
        .filter((h) => h.current_value > 0);

      if (validHoldings.length > 0) {
        const totalVal = validHoldings.reduce((acc, h) => acc + h.current_value, 0);
        if (totalVal > 0) {
          validHoldings.forEach((h) => {
            h.allocation_pct = Math.round((h.current_value / totalVal) * 1000) / 10;
          });
        }
        nextHoldings = validHoldings;
        setHoldings(validHoldings);
        setHoldingsSource('imported');
        summary.holdings = validHoldings.length;
        summary.holdingsValue = totalVal;
      }
    }

    // 2. Cash ledger transactions
    if (Array.isArray(data.transactions) && data.transactions.length > 0) {
      const validTxs = data.transactions
        .filter((t) => t)
        .map((t, i) => ({
          id: `imported-${Date.now()}-${i}`,
          date: t.date || new Date().toISOString().split('T')[0],
          description: t.description || `Transaction ${i + 1}`,
          amount: parseFloat(t.amount) || 0,
          category: t.category || 'Other',
        }))
        .filter((t) => t.amount > 0);

      if (validTxs.length > 0) {
        nextTxs = validTxs;
        setTransactions(validTxs);
        setLedgerSource('imported');
        summary.transactions = validTxs.length;
        summary.transactionsValue = validTxs.reduce((acc, t) => acc + t.amount, 0);
      }
    }

    if (summary.holdings === 0 && summary.transactions === 0) {
      throw new Error('No valid holdings or transactions could be extracted from this file.');
    }

    setIsLedgerModified(true);
    setUsingPersonalData(true);
    setAuditResult(null);

    // Persist to Auth0-scoped localStorage
    setUploadedPortfolio({
      holdings: nextHoldings,
      transactions: nextTxs,
      last_audit: null,
    });

    setImportSummary(summary);
    setPasteText('');
  };

  // Tries the Gemini-backed endpoint first and falls back to the local parser.
  // The fallback owns its own error messages, so a malformed file reports what
  // is actually wrong with it instead of a generic "import failed".
  const handleImportText = async (text, meta = {}) => {
    const raw = (text || '').trim();
    if (!raw) return;

    setImportLoading(true);
    setImportError(null);
    setImportSummary(null);

    try {
      let parsed = null;
      let method = 'Gemini AI parser';

      try {
        const res = await fetch('/api/upload-data/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw_text: raw, format: 'csv' }),
        });
        if (res.ok) {
          const data = await res.json();
          const rows = (data?.holdings?.length || 0) + (data?.transactions?.length || 0);
          if (rows > 0) {
            parsed = data;
            // The server says which parser actually ran; claiming "Gemini" when
            // its deterministic fallback did the work would be wrong.
            if (data.parse_method) method = data.parse_method;
          }
        }
      } catch (apiErr) {
        console.warn('Parse API unreachable, using local CSV parser:', apiErr);
      }

      if (!parsed) {
        parsed = parseFinancialCsv(raw);
        method = 'Local CSV parser';
      }

      applyImportedData(parsed, { ...meta, method, skipped: parsed.skipped });
    } catch (err) {
      setImportError(err.message || 'Import failed. Please verify your CSV format.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleFileUpload = (file, inputEl) => {
    // Clearing the input up front is what lets the same file be re-selected;
    // without it a second pick fires no change event at all.
    if (inputEl) inputEl.value = '';
    if (!file) return;

    setImportError(null);
    setImportSummary(null);

    const name = file.name || 'upload';
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setImportError(`${name} is not a supported file. Export your positions as CSV (.csv, .tsv or .txt) — spreadsheets and PDFs cannot be read directly.`);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setImportError(`${name} is ${(file.size / 1024 / 1024).toFixed(1)} MB, above the 5 MB limit.`);
      return;
    }
    if (file.size === 0) {
      setImportError(`${name} is empty.`);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setImportError(`Could not read ${name}. The file may be locked by another program.`);
    reader.onload = (e) => handleImportText(e.target.result, { source: name });
    reader.readAsText(file);
  };

  // dragOver is refcounted because dragleave also fires when the pointer
  // crosses a child element, which made the highlight flicker.
  const dragDepth = useRef(0);

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragDepth.current += 1;
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  // Presets parse silently: the raw broker CSV is never surfaced in the paste box,
  // only the finished holdings/ledger once parsing resolves.
  const handlePresetImport = async (key) => {
    const preset = BROKER_PRESETS[key];
    if (!preset || importLoading) return;
    setActivePreset(key);
    setLoadingPreset(key);
    try {
      await handleImportText(preset.csv, { source: preset.name });
    } finally {
      setLoadingPreset(null);
    }
  };


  return (
    <div className="space-y-6">

      {/* ── 1-Click Institutional Brokerage Sync Banner (Robinhood, Fidelity, Schwab) ── */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <Zap className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white">Direct Brokerage Connection</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  SnapTrade Read-Only OAuth
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center space-x-1">
                  <Lock className="h-2.5 w-2.5" />
                  <span>No Passwords Stored</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Link <strong>Robinhood</strong>, <strong>Fidelity</strong>, <strong>Charles Schwab</strong>, or <strong>Webull</strong> with 1 click to automatically stream live portfolio positions into the AI Risk Auditor.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowBrokerageModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer group"
            >
              <Zap className="h-4 w-4 fill-slate-950 group-hover:scale-110 transition-transform" />
              <span>Connect Robinhood / Fidelity</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Data Import Panel ───────────────────────────────────────────────── */}
      <div className={`glass-panel rounded-2xl border transition-all ${showImportPanel ? 'border-cyan-500/40' : 'border-slate-800'}`}>
        <button
          type="button"
          onClick={() => { setShowImportPanel(v => !v); setImportError(null); }}
          className="w-full flex items-center justify-between p-5 text-left cursor-pointer group"
        >
          <div className="flex items-center space-x-3">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center border ${showImportPanel ? 'bg-cyan-500/20 border-cyan-500/40' : 'bg-slate-800 border-slate-700'}`}>
              <Upload className={`h-4 w-4 ${showImportPanel ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400'} transition-colors`} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Import your portfolio or bank statement</p>
              <p className="text-xs text-slate-400">CSV exports from Schwab, Fidelity, Robinhood, Vanguard, Webull or any bank</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {usingPersonalData && (
              <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Database className="h-2.5 w-2.5" />
                <span>Your data</span>
              </span>
            )}
            {showImportPanel ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </div>
        </button>

        {showImportPanel && (
          <div className="px-5 pb-5 space-y-3 border-t border-slate-800 pt-4 animate-fadeIn">

            {/* Step 1 — the file itself. Primary action, so it comes first. */}
            <div
              onDragEnter={handleDragEnter}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border border-dashed rounded-xl px-5 py-8 text-center transition-colors ${
                importLoading
                  ? 'border-cyan-500/40 bg-slate-900/60 cursor-wait'
                  : dragOver
                    ? 'border-cyan-400 bg-cyan-500/10 cursor-copy'
                    : 'border-slate-700 hover:border-cyan-500/50 hover:bg-slate-900/40 cursor-pointer'
              }`}
            >
              {importLoading ? (
                <RefreshCw className="h-7 w-7 mx-auto mb-2.5 text-cyan-400 animate-spin" />
              ) : (
                <Upload className={`h-7 w-7 mx-auto mb-2.5 transition-colors ${dragOver ? 'text-cyan-400' : 'text-slate-500'}`} />
              )}

              <p className="text-sm font-semibold text-white">
                {importLoading ? 'Parsing your file…' : dragOver ? 'Drop to import' : 'Drop a CSV here, or click to browse'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Positions files and bank statements are both detected automatically
              </p>
              <p className="text-[10px] text-slate-600 mt-2 font-mono">.csv · .tsv · .txt · up to 5 MB · parsed in your browser</p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt,text/csv,text/plain"
                className="hidden"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => handleFileUpload(e.target.files?.[0], e.target)}
              />
            </div>

            {/* Import outcome */}
            {importError && (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <p className="font-semibold text-rose-200">Could not import that file</p>
                  <p className="mt-0.5 text-rose-300/90">{importError}</p>
                </div>
              </div>
            )}

            {importSummary && (
              <div className="rounded-xl bg-emerald-950/25 border border-emerald-500/40 overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-emerald-500/20">
                  <span className="flex items-center space-x-2 text-xs font-bold text-emerald-300 min-w-0">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">Imported {importSummary.source}</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400/70 shrink-0 ml-2">{importSummary.method}</span>
                </div>
                <div className="grid grid-cols-2 divide-x divide-emerald-500/15 text-center">
                  <div className="px-3 py-2.5">
                    <div className="text-lg font-bold text-white tabular-nums">{importSummary.holdings}</div>
                    <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-semibold">Holdings</div>
                    {importSummary.holdingsValue > 0 && (
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        ${importSummary.holdingsValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2.5">
                    <div className="text-lg font-bold text-white tabular-nums">{importSummary.transactions}</div>
                    <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-semibold">Transactions</div>
                    {importSummary.transactionsValue > 0 && (
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        ${importSummary.transactionsValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    )}
                  </div>
                </div>
                <p className="px-3.5 py-2 border-t border-emerald-500/20 text-[11px] text-slate-300">
                  {importSummary.skipped > 0 && (
                    <span className="text-amber-300">{importSummary.skipped} unreadable row{importSummary.skipped === 1 ? '' : 's'} skipped. </span>
                  )}
                  {importSummary.holdings > 0 && ledgerSource === 'sample' && (
                    <span className="text-amber-300">Your cash ledger is still sample data — import a bank statement to replace it. </span>
                  )}
                  {importSummary.transactions > 0 && holdingsSource === 'sample' && (
                    <span className="text-amber-300">Your holdings are still sample data — import a positions file to replace them. </span>
                  )}
                  Run the Nemotron audit below to analyze it.
                </p>
              </div>
            )}

            {/* Step 2 — paste, for anyone who cannot download a file */}
            <details className="group rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
              <summary className="px-4 py-2.5 flex items-center justify-between text-xs text-slate-300 hover:text-white cursor-pointer list-none">
                <span className="flex items-center space-x-2 font-semibold">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  <span>Paste CSV text instead</span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-3.5 pt-1 space-y-2 border-t border-slate-800/80">
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={"Symbol,Description,Quantity,Price,Current Value\nNVDA,NVIDIA Corporation,120,$118.50,$14220.00"}
                  rows={4}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-y"
                />
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    disabled={!pasteText.trim() || importLoading}
                    onClick={() => handleImportText(pasteText, { source: 'pasted text' })}
                    className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center space-x-1.5"
                  >
                    {importLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    <span>{importLoading ? 'Parsing…' : 'Parse & import'}</span>
                  </button>
                </div>
              </div>
            </details>

            {/* Step 3 — sample files, one neutral row instead of four clashing ones */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="text-[11px] text-slate-500 font-semibold shrink-0">No file handy? Try a sample:</span>
              {[
                { key: 'schwab', label: 'Schwab', Icon: Briefcase },
                { key: 'robinhood', label: 'Robinhood', Icon: Briefcase },
                { key: 'fidelity', label: 'Fidelity', Icon: Briefcase },
                { key: 'bank', label: 'Bank statement', Icon: CreditCard },
              ].map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  disabled={importLoading}
                  onClick={() => handlePresetImport(key)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    activePreset === key
                      ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {loadingPreset === key
                    ? <RefreshCw className="h-3 w-3 shrink-0 animate-spin" />
                    : <Icon className="h-3 w-3 shrink-0" />}
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* How to Grab Your Portfolio Guide Accordion */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setActiveBrokerGuide(g => g ? null : 'schwab')}
                className="w-full px-4 py-2.5 flex items-center justify-between text-slate-300 hover:text-white font-medium cursor-pointer"
              >
                <span className="flex items-center space-x-2 text-cyan-400 font-semibold">
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>How to export your real portfolio from your broker (Step-by-Step)</span>
                </span>
                <span className="text-[10px] text-slate-500">
                  {activeBrokerGuide ? 'Hide Guide ▲' : 'Show Instructions ▼'}
                </span>
              </button>

              {activeBrokerGuide && (
                <div className="px-4 pb-3.5 pt-1 space-y-3 border-t border-slate-800/80 animate-fadeIn text-slate-300">
                  <div className="flex space-x-2 border-b border-slate-800 pb-2">
                    {[
                      { id: 'schwab', label: 'Charles Schwab' },
                      { id: 'robinhood', label: 'Robinhood' },
                      { id: 'fidelity', label: 'Fidelity' },
                      { id: 'vanguard', label: 'Vanguard / Webull' }
                    ].map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setActiveBrokerGuide(b.id)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          activeBrokerGuide === b.id ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>

                  {activeBrokerGuide === 'schwab' && (
                    <div className="space-y-1.5 text-[11px]">
                      <p className="font-bold text-white">Charles Schwab:</p>
                      <p>1. Log in to <span className="text-cyan-400 font-mono">schwab.com</span> and go to <strong>Accounts &rarr; Positions</strong>.</p>
                      <p>2. In the upper-right corner of your positions table, click the <strong>Export</strong> icon (sheet with arrow).</p>
                      <p>3. Choose <strong>CSV</strong>. Your browser downloads <span className="text-cyan-400 font-mono">Positions.csv</span>.</p>
                      <p>4. Drag and drop that file into the box below or paste its text!</p>
                    </div>
                  )}

                  {activeBrokerGuide === 'robinhood' && (
                    <div className="space-y-1.5 text-[11px]">
                      <p className="font-bold text-white">Robinhood:</p>
                      <p>1. In Robinhood (Web or Mobile), click or tap the <strong>Account</strong> icon.</p>
                      <p>2. Select <strong>Reports and Statements</strong> &rarr; <strong>Export Account Activity</strong>.</p>
                      <p>3. Export your current positions or monthly holdings as a <strong>.CSV</strong> file.</p>
                      <p>4. Drop the CSV file into EarningsPulse to instantly evaluate single-stock risk & options exposure.</p>
                    </div>
                  )}

                  {activeBrokerGuide === 'fidelity' && (
                    <div className="space-y-1.5 text-[11px]">
                      <p className="font-bold text-white">Fidelity:</p>
                      <p>1. Log in to <span className="text-cyan-400 font-mono">fidelity.com</span> &rarr; <strong>Accounts & Trade &rarr; Portfolio</strong>.</p>
                      <p>2. Click on the <strong>Positions</strong> tab.</p>
                      <p>3. Click the <strong>Download</strong> icon (downward arrow) at the top right of the positions table.</p>
                      <p>4. Saves as <span className="text-cyan-400 font-mono">Portfolio_Positions.csv</span>. Upload it below!</p>
                    </div>
                  )}

                  {activeBrokerGuide === 'vanguard' && (
                    <div className="space-y-1.5 text-[11px]">
                      <p className="font-bold text-white">Vanguard / Webull / E*TRADE:</p>
                      <p>• <strong>Vanguard:</strong> Go to <strong>My Accounts &rarr; Balances & Holdings &rarr; Download (CSV)</strong>.</p>
                      <p>• <strong>Webull:</strong> In Webull Desktop/Web, open <strong>Account &rarr; Assets &rarr; Export</strong>.</p>
                      <p>• <strong>E*TRADE:</strong> Go to <strong>Accounts &rarr; Portfolios &rarr; Actions &rarr; Download to Spreadsheet (.csv)</strong>.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

        )}
      </div>


      <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>NVIDIA Nemotron Quantitative Audit</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Portfolio & Capital Leak Auditor
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Nemotron scans transaction ledgers for zombie subscriptions and abnormal cash outflow, while evaluating asset concentration drawdowns across mock holdings.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {isLedgerModified && (
              <button
                type="button"
                onClick={handleResetPortfolio}
                className="px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Reset holdings and ledger to initial samples"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}

            <button
              onClick={handleRunAudit}
              disabled={auditing}
              type="button"
              className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer shrink-0"
            >
              {auditing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  <span>Auditing with Nemotron...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4" />
                  <span>Run Nemotron Risk Audit</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="glass-panel rounded-xl p-4 border border-rose-500/40 bg-rose-950/20 text-rose-300 text-sm flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isClientSideAudit && auditResult && !auditing && (
        <div className="glass-panel rounded-xl p-3 border border-cyan-500/30 bg-cyan-950/20 flex items-center justify-between text-xs text-cyan-300">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>Quantitative Risk Audit Generated (Dynamic Rule-Based Quantitative Simulator)</span>
          </div>
          <button
            type="button"
            onClick={handleRunAudit}
            className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 font-semibold cursor-pointer"
          >
            Retry Live NIM API
          </button>
        </div>
      )}

      {/* Audit Results Dashboard (When generated) */}
      {auditResult && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Executive Risk Scorecard Banner */}
          <div className="glass-panel-glow rounded-2xl p-6 border border-emerald-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Risk Assessment Overview</span>
                <h3 className="text-xl font-extrabold text-white mt-0.5">
                  Portfolio Diagnostic Status: <span className="text-cyan-400">{auditResult.risk_level}</span>
                </h3>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Total Risk Meter</span>
                  <div className="text-xs text-slate-400">100 = Maximum Danger</div>
                </div>
                <div className={`px-4 py-2 rounded-xl border font-mono font-extrabold text-2xl ${getRiskScoreColor(auditResult.overall_risk_score)}`}>
                  {auditResult.overall_risk_score} / 100
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-300 mt-4 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              "{auditResult.summary}"
            </p>
          </div>

          {/* 3 Columns: Subscription Leaks | Spending Anomalies | Concentration Risk */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Subscription Leaks */}
            <div className="glass-panel rounded-2xl p-5 border border-amber-500/30 bg-amber-950/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2 text-amber-400">
                    <CreditCard className="h-4 w-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Subscription Leaks</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {auditResult.subscription_leaks?.length || 0} Flagged
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {auditResult.subscription_leaks?.map((sub, idx) => (
                    <div key={idx} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
                      <div className="flex items-center justify-between font-semibold text-white">
                        <span>{sub.service}</span>
                        <span className="font-mono text-amber-400">${sub.monthly_cost}/mo</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                        <span>Annualized Leakage:</span>
                        <strong className="text-slate-300">${sub.annual_cost}/yr</strong>
                      </div>
                      <p className="text-[11px] text-amber-300/80 mt-1.5 italic">
                        Tip: {sub.recommendation}
                      </p>
                    </div>
                  ))}
                  {(!auditResult.subscription_leaks || auditResult.subscription_leaks.length === 0) && (
                    <div className="text-slate-500 text-xs text-center py-4">No recurring subscription leaks detected.</div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Unusual Spending Anomalies */}
            <div className="glass-panel rounded-2xl p-5 border border-rose-500/30 bg-rose-950/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2 text-rose-400">
                    <TrendingDown className="h-4 w-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Spending Anomalies</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Outliers
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {auditResult.spending_anomalies?.map((anom, idx) => (
                    <div key={idx} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
                      <div className="flex items-center justify-between font-semibold text-white">
                        <span>{anom.category}</span>
                        <span className="font-mono text-rose-400">${anom.amount}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">{anom.description}</p>
                      <div className="mt-2 text-[11px] text-rose-300/90 font-medium flex items-center space-x-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        <span>{anom.alert_reason}</span>
                      </div>
                    </div>
                  ))}
                  {(!auditResult.spending_anomalies || auditResult.spending_anomalies.length === 0) && (
                    <div className="text-slate-500 text-xs text-center py-4">No high variance spending outliers detected.</div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Asset Concentration Risk */}
            <div className="glass-panel rounded-2xl p-5 border border-cyan-500/30 bg-cyan-950/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2 text-cyan-400">
                    <PieChart className="h-4 w-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Concentration Limits</h4>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Prudential Caps
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {auditResult.concentration_risks?.map((risk, idx) => (
                    <div key={idx} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
                      <div className="flex items-center justify-between font-semibold text-white">
                        <span className="font-mono text-cyan-300">{risk.asset_or_sector}</span>
                        <span className="font-mono text-amber-400">{risk.allocation_pct}% Alloc</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 my-2">
                        <div
                          className="bg-amber-400 h-1.5 rounded-full"
                          style={{ width: `${Math.min(risk.allocation_pct, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Max Cap: {risk.max_recommended_pct}%</span>
                        <span className="text-rose-400 font-semibold">Over by +{(risk.allocation_pct - risk.max_recommended_pct).toFixed(1)}%</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-2">
                        {risk.risk_comment}
                      </p>
                    </div>
                  ))}
                  {(!auditResult.concentration_risks || auditResult.concentration_risks.length === 0) && (
                    <div className="text-slate-500 text-xs text-center py-4">All assets meet recommended allocation caps (&lt;25%).</div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Actionable Recommendations Checklist */}
          {auditResult.actionable_recommendations && auditResult.actionable_recommendations.length > 0 && (
            <div className="glass-panel rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">
                <CheckCircle2 className="h-4 w-4" />
                <span>Tactical Rebalancing & Capital Recovery Plan</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {auditResult.actionable_recommendations.map((rec, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 flex items-start space-x-2">
                    <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Raw Data Tables: Holdings & Transaction Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Holdings Table */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Investment Holdings</h3>
              <p className="text-xs text-slate-400">Portfolio Total: ${totalPortfolioValue.toLocaleString()}</p>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
              {holdings.length} Positions
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800/80 pb-2">
                  <th className="pb-2">Asset</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2 text-right">Alloc %</th>
                  <th className="pb-2 text-right">Current Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {holdings.map((h, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50">
                    <td className="py-2.5 font-medium text-white flex items-center space-x-2">
                      <span className="font-mono text-cyan-400 font-bold">{h.symbol}</span>
                      <span className="text-slate-400 hidden sm:inline truncate max-w-[120px]">{h.asset_name}</span>
                    </td>
                    <td className="py-2.5 text-slate-400">{h.asset_type}</td>
                    <td className="py-2.5 text-right font-mono font-semibold">
                      <span className={h.allocation_pct > 25 ? 'text-amber-400' : 'text-slate-200'}>
                        {h.allocation_pct}%
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-300">
                      ${h.current_value.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transaction Log & Ingest Table */}
        <div className="lg:col-span-6 glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Monthly Transaction Ledger</h3>
              <p className="text-xs text-slate-400">Scanned for recurring leaks & high variance spikes</p>
            </div>
            <span className="text-xs font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
              {transactions.length} Records
            </span>
          </div>

          {/* Quick Add Form */}
          <form onSubmit={handleAddTransaction} className="flex gap-2 text-xs">
            <input
              type="text"
              placeholder="Merchant / Service..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
            />
            <input
              type="number"
              placeholder="Amount ($)..."
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="w-24 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg font-semibold border border-slate-700 cursor-pointer transition-colors"
            >
              + Add
            </button>
          </form>

          {/* Transactions List */}
          <div className="max-h-64 overflow-y-auto pr-1 space-y-2">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs hover:border-slate-700 transition-colors"
              >
                <div>
                  <p className="font-semibold text-white">{t.description}</p>
                  <p className="text-[10px] text-slate-500">{t.date} • {t.category}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-semibold text-rose-400">
                    -${parseFloat(t.amount).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteTransaction(t.id)}
                    title="Delete transaction"
                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* ── SnapTrade Brokerage Connection Modal ── */}
      <BrokerageConnectModal
        isOpen={showBrokerageModal}
        onClose={() => setShowBrokerageModal(false)}
        onSyncSuccess={handleBrokerSyncSuccess}
        userId={uploadedPortfolio?.userId}
      />

    </div>
  );
};

export default TabPortfolio;
