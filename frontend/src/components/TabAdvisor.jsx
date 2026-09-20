import React, { useState, useRef, useEffect } from 'react';
import { useAppAuth } from '../auth/AuthContext';
import {
  Send, RefreshCw, Cpu, ChevronDown, ChevronUp,
  Zap, MessageSquare, BarChart2, Trash2, Database,
  User, Lock, ArrowRight, ShieldAlert, Sparkles, TrendingUp,
  DollarSign, CheckCircle2, AlertTriangle, Layers
} from 'lucide-react';

// ─── Advisory Model ───────────────────────────────────────────────────────────
const ADVISOR_MODEL = {
  id: 'nemotron',
  name: 'NVIDIA Nemotron',
  tagline: 'Quantitative Risk & Variance',
  provider: 'NVIDIA NIM',
  badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  iconColor: 'text-cyan-400',
  description: 'Wall Street institutional risk attribution, HHI concentration, and VaR modeling.'
};

// ─── Markdown Formatter ───────────────────────────────────────────────────────
const FormattedMessage = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-200">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty lines create visual spacing
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Heading 3: ### Title
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-base font-bold text-white tracking-tight pt-2 pb-1 border-b border-slate-800/80">
              {renderBoldText(trimmed.replace('### ', ''))}
            </h4>
          );
        }

        // Heading 2 or 1
        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          return (
            <h3 key={idx} className="text-lg font-extrabold text-white tracking-tight pt-2 pb-1 text-emerald-400">
              {renderBoldText(trimmed.replace(/^#+\s*/, ''))}
            </h3>
          );
        }

        // Bullet point: - or *
        if (/^[-*]\s+/.test(trimmed)) {
          const bulletContent = trimmed.replace(/^[-*]\s+/, '');
          return (
            <div key={idx} className="flex items-start space-x-2 pl-1.5 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
              <div className="flex-1 text-slate-300 leading-normal">
                {renderBoldText(bulletContent)}
              </div>
            </div>
          );
        }

        // Numbered list: 1. or 2.
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start space-x-2 pl-1 py-0.5">
              <span className="font-mono text-xs font-bold text-emerald-400/90 mt-0.5 shrink-0 min-w-4 text-right">
                {numMatch[1]}.
              </span>
              <div className="flex-1 text-slate-300 leading-normal">
                {renderBoldText(numMatch[2])}
              </div>
            </div>
          );
        }

        // Regular paragraph text
        return (
          <p key={idx} className="text-slate-300 leading-relaxed">
            {renderBoldText(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

// Helper to render bold **text**, inline `code`, and highlights
const renderBoldText = (text) => {
  if (!text) return null;

  // Split by inline code first: `code`
  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((codePart, i) => {
    if (codePart.startsWith('`') && codePart.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono text-xs border border-slate-700">
          {codePart.slice(1, -1)}
        </code>
      );
    }

    // Split by bold: **bold**
    const boldParts = codePart.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={j} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  });
};

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ msg }) => {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] flex items-end space-x-2">
          <div className="bg-gradient-to-br from-emerald-600/95 to-teal-700/95 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-lg shadow-emerald-950/40">
            {msg.content}
          </div>
          <div className="h-7 w-7 rounded-full bg-emerald-900/80 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-emerald-300" />
          </div>
        </div>
      </div>
    );
  }

  const providerLabel = msg.provider || ADVISOR_MODEL.provider;

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] flex items-start space-x-2.5">
        <div className="h-7 w-7 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 mt-1 shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <div className="space-y-1 w-full">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border shadow-sm uppercase font-mono">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span className="text-cyan-300">{providerLabel}</span>
          </div>
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl rounded-tl-sm px-5 py-4 shadow-xl">
            <FormattedMessage content={msg.content} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Typing Indicator ─────────────────────────────────────────────────────────
const TypingIndicator = ({ modelName }) => (
  <div className="flex justify-start">
    <div className="flex items-start space-x-2.5">
      <div className="h-7 w-7 rounded-full bg-slate-900 border border-emerald-500/50 flex items-center justify-center shrink-0 mt-1 animate-pulse">
        <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
      </div>
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center space-x-2 shadow-sm">
        <span className="text-xs text-slate-400 font-medium mr-1">{modelName} reasoning</span>
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
);

// ─── Upload Gate (shown when no portfolio data) ───────────────────────────────
const UploadGate = () => (
  <div className="space-y-5">
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
        <Sparkles className="h-3.5 w-3.5" />
        <span>Personal Portfolio AI Advisory</span>
      </div>
      <h2 className="text-2xl font-extrabold text-white tracking-tight">AI Financial Advisor</h2>
      <p className="text-sm text-slate-400 mt-1">
        Institutional-grade quantitative intelligence powered by NVIDIA Nemotron.
      </p>
    </div>

    <div className="glass-panel rounded-2xl border border-emerald-500/20 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 via-transparent to-teal-950/20 pointer-events-none" />

      <div className="p-10 flex flex-col items-center text-center relative">
        <div className="relative mb-6">
          <div className="h-20 w-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <Lock className="h-9 w-9 text-emerald-400" />
          </div>
          <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <span className="text-[10px] font-bold text-amber-300">!</span>
          </div>
        </div>

        <h3 className="text-xl font-extrabold text-white mb-2">Portfolio Data Required</h3>
        <p className="text-sm text-slate-400 max-w-md leading-relaxed mb-8">
          The AI Financial Advisor connects directly to your holdings and transaction ledger to give tailored, mathematically grounded answers with exact numbers.
          Upload your broker CSV or connect via SnapTrade on the <strong className="text-emerald-300">Portfolio tab</strong> to unlock this advisor.
        </p>

        <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-left">
          {[
            { icon: BarChart2, label: 'Single-Stock Risk & HHI', desc: 'Stress-test overweight holdings against earnings shocks' },
            { icon: TrendingUp, label: 'Rebalancing Roadmaps', desc: 'Core-satellite asset allocation optimization' },
            { icon: Zap, label: 'Spending Leak Detection', desc: 'Identify and eliminate recurring capital drains' },
            { icon: Layers, label: 'Grounded Reasoning', desc: 'Every answer anchored to your real holdings and ledger' },
          ].map((f, i) => {
            const FIcon = f.icon;
            return (
              <div key={i} className="flex items-start space-x-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <FIcon className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">{f.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{f.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <Database className="h-3.5 w-3.5 text-emerald-500" />
          <span>Go to <span className="text-emerald-400 font-semibold">Portfolio tab</span> → paste or import your broker CSV → return here</span>
        </div>
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const TabAdvisor = () => {
  const { uploadedPortfolio, hasPersonalData } = useAppAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!hasPersonalData) {
    return <UploadGate />;
  }

  const holdings = uploadedPortfolio?.holdings || [];
  const transactions = uploadedPortfolio?.transactions || [];

  const holdingCount = holdings.length;
  const txCount = transactions.length;

  const totalValue = holdings.reduce((s, h) => s + (parseFloat(h.current_value) || 0), 0);
  const outflows = transactions.filter(t => (parseFloat(t.amount) || 0) < 0);
  const inflows = transactions.filter(t => (parseFloat(t.amount) || 0) > 0);
  const totalOut = outflows.reduce((s, t) => s + Math.abs(parseFloat(t.amount) || 0), 0);
  const totalIn = inflows.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const netFlow = totalIn - totalOut;

  // Top holding
  const sortedHoldings = [...holdings].sort((a, b) => Math.abs(b.current_value || 0) - Math.abs(a.current_value || 0));
  const topHolding = sortedHoldings[0];
  const topWeight = totalValue > 0 && topHolding ? Math.round((Math.abs(topHolding.current_value) / totalValue) * 100) : 0;

  // Dynamic quick prompts tailored to their actual portfolio
  const quickPrompts = [
    topHolding
      ? { icon: ShieldAlert, text: `Analyze my concentration in ${topHolding.symbol} (${topWeight}%) and suggest a trim plan` }
      : { icon: ShieldAlert, text: "Analyze my portfolio concentration and flag any overweight positions" },
    { icon: Zap, text: "Where am I overspending? Show me specific leaks from my transaction data" },
    { icon: TrendingUp, text: "If I had $10,000 to deploy today, where should I allocate it?" },
    { icon: BarChart2, text: "Suggest a rebalancing plan based on my current asset allocation" },
    { icon: Sparkles, text: "Summarize my recurring subscriptions and flag any I should cancel" },
    { icon: Database, text: "Give me an executive diagnostic of my overall portfolio health" }
  ];

  const buildPortfolioContext = () => ({
    holdings: holdings,
    transactions: transactions,
    last_audit: uploadedPortfolio?.last_audit || null
  });

  const handleSend = async (messageText) => {
    const text = (messageText || input).trim();
    if (!text || isLoading) return;

    const userMsg = { id: Date.now(), role: 'user', content: text };
    const historyForApi = messages.map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          model: ADVISOR_MODEL.id,
          portfolio_context: buildPortfolioContext(),
          history: historyForApi
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `API error ${res.status}`);
      }

      const data = await res.json();
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.text,
        model: data.model,
        provider: data.provider
      }]);
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
      setMessages(prev => prev.filter(m => m.id !== userMsg.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const currentModelInfo = ADVISOR_MODEL;

  return (
    <div className="space-y-5">

      {/* Header & Model Selector Card */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>NVIDIA Nemotron AI Financial Advisor</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">AI Financial Advisor</h2>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Grounded directly in your personal portfolio data ({holdingCount} holdings, {txCount} transactions, ${Math.round(totalValue).toLocaleString()} NAV).
            </p>
          </div>

          {/* Active Model Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-white">{ADVISOR_MODEL.name}</span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">{ADVISOR_MODEL.provider}</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowContext(v => !v)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Database className="h-3.5 w-3.5 text-emerald-400" />
                <span>Data Drawer</span>
                {showContext ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearChat}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active Model Description Banner */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className={`inline-block h-2 w-2 rounded-full ${currentModelInfo.iconColor.replace('text-', 'bg-')}`} />
            <span className="font-semibold text-slate-200">{currentModelInfo.name}:</span>
            <span>{currentModelInfo.description}</span>
          </div>
          <span className="hidden md:inline font-mono text-[11px] text-slate-500">{currentModelInfo.tagline}</span>
        </div>

        {/* Collapsible Context Data Summary */}
        {showContext && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs animate-fadeIn">
            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
              <div className="text-slate-400 text-[11px]">Holdings & NAV</div>
              <div className="text-emerald-400 font-bold text-base mt-0.5">${Math.round(totalValue).toLocaleString()}</div>
              <div className="text-slate-500 text-[10px] mt-0.5">{holdingCount} active positions</div>
            </div>

            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
              <div className="text-slate-400 text-[11px]">Largest Exposure</div>
              <div className="text-white font-bold text-base mt-0.5">{topHolding ? topHolding.symbol : 'N/A'}</div>
              <div className="text-amber-400 text-[10px] mt-0.5">{topWeight}% of portfolio</div>
            </div>

            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
              <div className="text-slate-400 text-[11px]">Recent Outflows</div>
              <div className="text-rose-400 font-bold text-base mt-0.5">-${Math.round(totalOut).toLocaleString()}</div>
              <div className="text-slate-500 text-[10px] mt-0.5">{outflows.length} debits logged</div>
            </div>

            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
              <div className="text-slate-400 text-[11px]">Net Cashflow</div>
              <div className={`font-bold text-base mt-0.5 ${netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netFlow >= 0 ? '+' : '-'}${Math.round(Math.abs(netFlow)).toLocaleString()}
              </div>
              <div className="text-slate-500 text-[10px] mt-0.5">from ${Math.round(totalIn).toLocaleString()} inflow</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Interface */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col shadow-2xl" style={{ minHeight: '560px' }}>

        {/* Chat Thread Header */}
        <div className="px-5 py-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-2.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white flex items-center space-x-1.5">
              <span>{currentModelInfo.name}</span>
              <span className="text-slate-400 font-normal">Active Session</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center space-x-1">
            <ShieldAlert className="h-3 w-3 text-slate-600" />
            <span>Private & Local • Financial Data Grounded</span>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ maxHeight: '450px' }}>
          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center py-10 text-center">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center mb-4 shadow-lg shadow-emerald-950/30">
                <Sparkles className="h-7 w-7 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white">Ask {currentModelInfo.name} About Your Finances</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
                I have full context of your portfolio — {holdingCount} holdings (${Math.round(totalValue).toLocaleString()} NAV) and {txCount} ledger transactions.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {isLoading && <TypingIndicator modelName={currentModelInfo.name} />}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <strong>Advisory Notice:</strong> {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Shelf */}
        {messages.length === 0 && (
          <div className="px-5 pb-4">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 flex items-center space-x-1">
              <Zap className="h-3 w-3 text-emerald-400" />
              <span>Suggested Data-Grounded Prompts</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {quickPrompts.map((qp, i) => {
                const QIcon = qp.icon;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(qp.text)}
                    disabled={isLoading}
                    className="flex items-start space-x-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900 text-left text-xs text-slate-300 hover:text-white transition-all cursor-pointer group disabled:opacity-50"
                  >
                    <QIcon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-400 opacity-70 group-hover:opacity-100" />
                    <span className="leading-snug">{qp.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Chat Input Bar */}
        <div className="border-t border-slate-800/80 p-4 bg-slate-950/60">
          <div className="flex items-end space-x-3 p-1.5 rounded-xl border border-slate-800 bg-slate-900/80 focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${currentModelInfo.name} anything about your holdings or spending... (Enter to send, Shift+Enter for new line)`}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 resize-none focus:outline-none leading-relaxed"
              style={{ maxHeight: '120px' }}
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="mb-1 mr-1 p-2.5 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer hover:opacity-90 shadow-md shrink-0"
              title="Send message"
            >
              {isLoading
                ? <RefreshCw className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </button>
          </div>
          <p className="text-[10px] text-slate-600 mt-1.5 text-center">
            AI-generated analysis is for quantitative evaluation and educational planning. Not formal investment advice.
          </p>
        </div>

      </div>

    </div>
  );
};

export default TabAdvisor;
