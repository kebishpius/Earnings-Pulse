import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, CreditCard, PieChart, RefreshCw, DollarSign, TrendingDown, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { INITIAL_PORTFOLIO } from '../mockData/samples';

const TabPortfolio = () => {
  const [holdings, setHoldings] = useState(INITIAL_PORTFOLIO.holdings);
  const [transactions, setTransactions] = useState(INITIAL_PORTFOLIO.transactions);
  const [auditing, setAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [error, setError] = useState(null);

  // Quick transaction add state
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('Subscription');

  const totalPortfolioValue = holdings.reduce((acc, h) => acc + h.current_value, 0);

  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!newDesc.trim() || !newAmount) return;
    const newTx = {
      id: `tx-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      description: newDesc.trim(),
      amount: parseFloat(newAmount),
      category: newCategory
    };
    setTransactions([newTx, ...transactions]);
    setNewDesc('');
    setNewAmount('');
  };

  const handleRunAudit = async () => {
    setAuditing(true);
    setError(null);

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
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to complete Nemotron portfolio audit.');
    } finally {
      setAuditing(false);
    }
  };

  const getRiskScoreColor = (score) => {
    if (score > 75) return 'text-rose-400 border-rose-500/50 bg-rose-950/20';
    if (score > 50) return 'text-amber-400 border-amber-500/50 bg-amber-950/20';
    return 'text-emerald-400 border-emerald-500/50 bg-emerald-950/20';
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
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

          <button
            onClick={handleRunAudit}
            disabled={auditing}
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

      {error && (
        <div className="glass-panel rounded-xl p-4 border border-rose-500/40 bg-rose-950/20 text-rose-300 text-sm flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
          <span>{error}</span>
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
              5 Positions
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
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg font-semibold border border-slate-700"
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
                <div className="text-right font-mono font-semibold text-rose-400">
                  -${parseFloat(t.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
};

export default TabPortfolio;
