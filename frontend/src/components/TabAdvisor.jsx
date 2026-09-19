import React, { useState, useRef, useEffect } from 'react';
import { useAppAuth } from '../auth/AuthContext';
import {
  Send, RefreshCw, Cpu, ChevronDown, ChevronUp,
  Zap, MessageSquare, BarChart2, Trash2, Database,
  User, Lock, ArrowRight, ShieldAlert, Sparkles, TrendingUp
} from 'lucide-react';

// ─── Quick Prompts ─────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { icon: BarChart2, text: "Analyze my portfolio concentration and flag any overweight positions" },
  { icon: Zap,       text: "Where am I overspending? Give me specific numbers from my data" },
  { icon: ShieldAlert, text: "What's my biggest financial risk right now and how do I mitigate it?" },
  { icon: Sparkles,  text: "Suggest a rebalancing plan based on my current holdings" },
  { icon: Database,  text: "Summarize my top subscriptions and flag any I should cancel" },
  { icon: TrendingUp, text: "If I had $10,000 to deploy today, where would you allocate it?" },
];

// ─── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble = ({ msg }) => {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] flex items-end space-x-2">
          <div className="bg-gradient-to-br from-emerald-600/90 to-teal-700/90 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-lg shadow-emerald-900/30">
            {msg.content}
          </div>
          <div className="h-7 w-7 rounded-full bg-emerald-900/80 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-emerald-300" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] flex items-start space-x-2">
        <div className="h-7 w-7 rounded-full bg-emerald-500/10 border border-emerald-500/50 flex items-center justify-center shrink-0 mt-1">
          <Cpu className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border mb-1 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            <Cpu className="h-2.5 w-2.5" />
            <span>NVIDIA Nemotron</span>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-200 leading-relaxed shadow-sm whitespace-pre-wrap">
            {msg.content}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Typing Indicator ─────────────────────────────────────────────────────────
const TypingIndicator = () => (
  <div className="flex justify-start">
    <div className="flex items-start space-x-2">
      <div className="h-7 w-7 rounded-full bg-emerald-500/10 border border-emerald-500/50 flex items-center justify-center shrink-0 mt-1 animate-pulse">
        <Cpu className="h-3.5 w-3.5 text-emerald-400" />
      </div>
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center space-x-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
);

// ─── Upload Gate (shown when no portfolio data) ───────────────────────────────
const UploadGate = () => (
  <div className="space-y-5">
    {/* Header */}
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
        <Cpu className="h-3.5 w-3.5" />
        <span>NVIDIA Nemotron Financial Advisor</span>
      </div>
      <h2 className="text-2xl font-extrabold text-white tracking-tight">AI Financial Advisor</h2>
      <p className="text-sm text-slate-400 mt-1">
        Powered exclusively by NVIDIA Nemotron — institutional-grade quantitative analysis for your personal portfolio.
      </p>
    </div>

    {/* Lock Gate Card */}
    <div className="glass-panel rounded-2xl border border-emerald-500/20 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 via-transparent to-teal-950/20 pointer-events-none" />

      <div className="p-12 flex flex-col items-center text-center relative">
        {/* Animated lock icon */}
        <div className="relative mb-6">
          <div className="h-20 w-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-900/30">
            <Lock className="h-9 w-9 text-emerald-400" />
          </div>
          <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <span className="text-[10px] font-bold text-amber-300">!</span>
          </div>
        </div>

        <h3 className="text-xl font-extrabold text-white mb-2">Portfolio Data Required</h3>
        <p className="text-sm text-slate-400 max-w-sm leading-relaxed mb-8">
          The NVIDIA Nemotron AI Advisor needs your actual financial data to provide personalized, 
          quantitative advice. Upload your portfolio or transaction history in the <strong className="text-emerald-300">Portfolio tab</strong> to unlock this feature.
        </p>

        {/* Feature preview */}
        <div className="w-full max-w-md grid grid-cols-1 gap-3 mb-8 text-left">
          {[
            { icon: BarChart2, label: 'Concentration Risk Analysis', desc: 'Detect overweight positions using Sharpe & HHI' },
            { icon: TrendingUp, label: 'Rebalancing Recommendations', desc: 'Institutional-grade allocation optimization' },
            { icon: Zap,       label: 'Spending Leak Detection',     desc: 'Identify and flag recurring capital drains' },
            { icon: ShieldAlert, label: 'Drawdown & Risk Scoring',   desc: 'Stress-test your portfolio against market events' },
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
          <span>Navigate to the <span className="text-emerald-400 font-semibold">Portfolio</span> tab → upload a CSV from your broker → return here</span>
        </div>
      </div>
    </div>

    {/* Security note */}
    <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-500">
      <ShieldAlert className="h-3 w-3 text-slate-600" />
      <span>Your financial data stays local — it's only sent to the AI when you ask a question</span>
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

  // If no data uploaded, show the gate
  if (!hasPersonalData) {
    return <UploadGate />;
  }

  const holdingCount = uploadedPortfolio?.holdings?.length || 0;
  const txCount = uploadedPortfolio?.transactions?.length || 0;
  const totalValue = (uploadedPortfolio?.holdings || []).reduce((s, h) => s + (h.current_value || 0), 0);

  const buildPortfolioContext = () => ({
    holdings: uploadedPortfolio?.holdings || [],
    transactions: uploadedPortfolio?.transactions || [],
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
          model: 'nemotron',
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

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Cpu className="h-3.5 w-3.5" />
              <span>NVIDIA Nemotron — Quantitative Financial Advisor</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">AI Financial Advisor</h2>
            <p className="text-sm text-slate-400 mt-1">
              Ask any financial question — your portfolio data ({holdingCount} holdings, {txCount} transactions) is automatically provided as context.
            </p>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setShowContext(v => !v)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-950/60 transition-colors cursor-pointer"
            >
              <Database className="h-3.5 w-3.5" />
              <span>Your Data Loaded 🔒</span>
              {showContext ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Context Data Summary */}
        {showContext && (
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-3 gap-3 text-xs animate-fadeIn">
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-center">
              <div className="text-emerald-400 font-bold text-base">{holdingCount}</div>
              <div className="text-slate-400 mt-0.5">Holdings</div>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-center">
              <div className="text-emerald-400 font-bold text-base">{txCount}</div>
              <div className="text-slate-400 mt-0.5">Transactions</div>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-center">
              <div className="text-emerald-400 font-bold text-base">${totalValue.toLocaleString()}</div>
              <div className="text-slate-400 mt-0.5">Portfolio Value</div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col" style={{ minHeight: '540px' }}>

        {/* Chat Header */}
        <div className="px-5 py-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 animate-pulse" />
            <span className="text-xs font-bold text-white flex items-center space-x-1.5">
              <Cpu className="h-3.5 w-3.5 text-emerald-400" />
              <span>NVIDIA Nemotron</span>
              <span className="text-slate-400 font-normal">Advisory Thread</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </span>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center space-x-1.5 transition-colors cursor-pointer px-2.5 py-1 rounded-lg hover:bg-slate-900/90 border border-transparent hover:border-slate-800"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear Chat</span>
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ maxHeight: '430px' }}>
          {messages.length === 0 && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center py-10 text-center">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/50 flex items-center justify-center mb-4">
                <Cpu className="h-7 w-7 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white">Ask Nemotron Anything</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                I have full context of your portfolio — {holdingCount} holdings, {txCount} transactions, ${totalValue.toLocaleString()} total value.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {isLoading && <TypingIndicator />}

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length === 0 && (
          <div className="px-5 pb-4">
            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-2">Quick Prompts</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {QUICK_PROMPTS.map((qp, i) => {
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

        {/* Input */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex items-end space-x-3 p-1 rounded-xl border border-emerald-500/50 bg-slate-900/60 focus-within:border-emerald-500/80 transition-colors">
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask NVIDIA Nemotron about your portfolio... (Enter to send, Shift+Enter for newline)"
              className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 resize-none focus:outline-none leading-relaxed"
              style={{ maxHeight: '120px' }}
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="mb-1 mr-1 p-2.5 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer hover:opacity-90 shrink-0"
            >
              {isLoading
                ? <RefreshCw className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </button>
          </div>
          <p className="text-[10px] text-slate-600 mt-1.5 text-center">
            AI-generated advice is for informational purposes only. Not financial advice.
          </p>
        </div>
      </div>

    </div>
  );
};

export default TabAdvisor;
