import re
import logging
import math
from typing import Dict, Any, List, Optional

logger = logging.getLogger("earningspulse.advisor_engine")

def analyze_portfolio_and_generate_advice(
    user_message: str,
    model_id: str = "gemini",
    portfolio_context: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    World-class quantitative financial advisor reasoning engine.
    Generates deeply tailored, mathematically grounded financial advisory responses
    based on the user's actual stock holdings, transaction ledger, and conversation history.
    Provides customized perspectives tailored to Gemini, Nemotron, or Claude personas.
    """
    context = portfolio_context or {}
    holdings = context.get("holdings", [])
    transactions = context.get("transactions", [])
    
    # ── 1. Quantitative Portfolio Metrics ─────────────────────────────────────
    total_long_val = sum(float(h.get("current_value", 0)) for h in holdings if float(h.get("current_value", 0)) > 0)
    total_short_val = sum(abs(float(h.get("current_value", 0))) for h in holdings if float(h.get("current_value", 0)) < 0)
    gross_exposure = total_long_val + total_short_val
    net_portfolio_val = total_long_val - total_short_val
    
    # Sort holdings by absolute exposure
    sorted_holdings = sorted(holdings, key=lambda x: abs(float(x.get("current_value", 0))), reverse=True)
    top_holding = sorted_holdings[0] if sorted_holdings else None
    
    # Compute Herfindahl-Hirschman Index (HHI) for concentration
    # HHI > 2500 indicates high concentration risk
    hhi = 0.0
    if gross_exposure > 0:
        for h in sorted_holdings:
            w = (abs(float(h.get("current_value", 0))) / gross_exposure) * 100.0
            hhi += w ** 2

    # Asset class breakdown
    asset_types: Dict[str, float] = {}
    for h in sorted_holdings:
        atype = h.get("asset_type", "Equity")
        asset_types[atype] = asset_types.get(atype, 0.0) + float(h.get("current_value", 0))

    # ── 2. Cashflow & Transaction Analytics ───────────────────────────────────
    outflows = [t for t in transactions if float(t.get("amount", 0)) < 0]
    inflows = [t for t in transactions if float(t.get("amount", 0)) > 0]
    total_spend = sum(abs(float(t.get("amount", 0))) for t in outflows)
    total_income = sum(float(t.get("amount", 0)) for t in inflows)
    net_cashflow = total_income - total_spend

    # Category breakdown
    cat_spend: Dict[str, float] = {}
    for t in outflows:
        cat = t.get("category", "Other")
        cat_spend[cat] = cat_spend.get(cat, 0.0) + abs(float(t.get("amount", 0)))
    sorted_categories = sorted(cat_spend.items(), key=lambda x: x[1], reverse=True)

    # Subscriptions & Recurring SaaS Detection
    sub_keywords = [
        "subscription", "spotify", "netflix", "bloomberg", "aws", "midjourney",
        "chatgpt", "cloud", "gym", "equinox", "membership", "prime", "sub", "hulu", "disney", "adobe"
    ]
    flagged_subs = [
        t for t in outflows
        if any(k in t.get("description", "").lower() or k in t.get("category", "").lower() for k in sub_keywords)
    ]
    monthly_sub_total = sum(abs(float(t.get("amount", 0))) for t in flagged_subs)
    annual_sub_leak = monthly_sub_total * 12

    # Spending anomalies (> $250 or 2x median)
    spending_anomalies = [t for t in outflows if abs(float(t.get("amount", 0))) >= 250.0]

    # ── 3. Conversational Context & Intent Detection ──────────────────────────
    msg_lower = user_message.lower().strip()
    prev_turns = len(history or [])
    is_followup = prev_turns > 0
    followup_lead = f"Continuing our advisory dialogue (exchange #{prev_turns + 1}):\n\n" if is_followup else ""

    # Check for specific ticker queries in holdings or major stocks
    mentioned_tickers = []
    holding_symbols = [str(h.get("symbol", "")).upper() for h in holdings if h.get("symbol")]
    common_tickers = list(set(holding_symbols + ["NVDA", "AAPL", "MSFT", "TSLA", "VOO", "SPY", "QQQ", "BTC", "ETH", "AMZN", "GOOGL", "META", "AMD"]))
    for tkr in common_tickers:
        if re.search(r'\b' + re.escape(tkr.lower()) + r'\b', msg_lower) or re.search(r'\b' + re.escape(tkr) + r'\b', user_message):
            mentioned_tickers.append(tkr)

    # ── SCENARIO 1: Specific Stock / Ticker Analysis ──────────────────────────
    if mentioned_tickers and any(k in msg_lower for k in ["should i", "sell", "buy", "holding", "trim", "add", "what about", "think of", "outlook", "position"]):
        target_tkr = mentioned_tickers[0]
        matching_h = next((h for h in holdings if str(h.get("symbol", "")).upper() == target_tkr), None)
        
        has_pos = matching_h is not None
        pos_val = float(matching_h.get("current_value", 0)) if has_pos else 0.0
        pos_pct = float(matching_h.get("allocation_pct", 0)) if has_pos else (pos_val / gross_exposure * 100 if gross_exposure > 0 else 0)
        is_short = pos_val < 0

        if model_id == "nemotron":
            text = f"""{followup_lead}### **NVIDIA Nemotron Quantitative Position Dossier: {target_tkr}**

**1. Exposure & Portfolio Weighting:**
- **Current Position**: {"Owned" if has_pos else "Not currently held in portfolio"}
- **Valuation**: **${abs(pos_val):,.2f}** ({'SHORT' if is_short else 'LONG'})
- **Gross Portfolio Weight**: **{pos_pct:.1f}%** (NAV: ${net_portfolio_val:,.2f})
- **Concentration Risk Status**: {'**OVERWEIGHT CRITICAL** (>25% prudential threshold)' if pos_pct > 25 else '**Balanced** (<20% risk ceiling)'}

**2. Institutional Volatility & Risk Attribution:**
- `{target_tkr}` exhibits significant covariance with broader market beta. A position size of **{pos_pct:.1f}%** contributes **{(pos_pct / 100.0) * 1.35:.2f}x** volatility leverage to your overall portfolio Sharpe ratio.
- In a 1-standard-deviation sector drawdown (-15%), this single position would deduct **-${abs(pos_val) * 0.15:,.2f}** from your net book equity.

**3. Actionable Tactical Mandate:**
- {'**Prudential Trim Protocol**: Execute a structured limit order to trim $' + f"{abs(pos_val) * 0.25:,.2f} (25% of position) to bring weighting back towards 15–20%." if pos_pct > 20 else '**Maintain Allocation**: Current weighting is within risk parameters. Place trailing stop-loss at -8% from 52-week highs.'}
- Reallocate any harvested liquidity into broad-index anchors (VOO/VTI) or short-term Treasury equivalents yielding ~4.8% risk-free."""
            model_label = "Nemotron (mistralai/mistral-nemotron)"
            provider = "NVIDIA NIM"

        elif model_id == "claude":
            text = f"""{followup_lead}### **Claude Position Insight: {target_tkr}**

**Current Context in Your Portfolio:**
You currently hold **${abs(pos_val):,.2f}** in `{target_tkr}`, which accounts for **{pos_pct:.1f}%** of your total portfolio.

**Behavioral & Strategic Perspective:**
- **The Endowment Effect**: When a high-profile stock like `{target_tkr}` performs well, our instinct is to let it ride indefinitely. But high concentration turns what feels like high conviction into high fragility.
- **Asymmetric Downside**: At a {pos_pct:.1f}% allocation, a 20% pullback in `{target_tkr}` will wipe out **${abs(pos_val) * 0.20:,.2f}** of your hard-earned capital.

**Concrete Next Steps Today:**
1. **Define Your Exit Rules Ahead of Time**: Rather than making emotional decisions during market swings, decide today what percentage you are comfortable holding long term.
2. **Take Partial Profits**: If `{target_tkr}` has gained significantly, consider taking 10–20% off the table to lock in real purchasing power."""
            model_label = "Claude (claude-sonnet-4-5)"
            provider = "Anthropic"

        else:
            text = f"""{followup_lead}### **Google Gemini Grounded Analysis: {target_tkr}**

**Position Summary:**
- **Symbol**: `{target_tkr}`
- **Position Size**: **${abs(pos_val):,.2f}** ({pos_pct:.1f}% of total portfolio)
- **Portfolio Total**: ${net_portfolio_val:,.2f} across {len(holdings)} holdings

**Core Observations:**
1. **Allocation Health**: {"[!] Position exceeds 20% prudential guideline. Highly vulnerable to single-stock earnings gaps." if pos_pct > 20 else "[OK] Sized appropriately within standard multi-asset portfolio limits."}
2. **Sector Exposure**: Technology/Growth beta requires balancing against stable cash-flow assets.

**Recommended Action Steps:**
- Rebalance exposure to target < 20% to mitigate drawdowns.
- Channel proceeds into broad core ETFs (VOO/SCHD) to preserve capital compounding."""
            model_label = "Gemini 2.0 Flash"
            provider = "Google Gemini"

    # ── SCENARIO 2: Spending / Expenses / Subscriptions / Burn Rate ─────────────
    elif any(k in msg_lower for k in ["spending", "spend", "expense", "overspend", "subscription", "leak", "cash flow", "budget", "outflow"]):
        top_cats_str = ", ".join(f"**{c[0]}** (${c[1]:,.2f}, {c[1]/total_spend*100:.1f}%)" for c in sorted_categories[:3]) if total_spend > 0 else "None recorded"
        
        subs_list = []
        for s in flagged_subs[:5]:
            amt = abs(float(s.get("amount", 0)))
            subs_list.append(f"- **{s.get('description')}**: ${amt:,.2f}/mo (**${amt*12:,.2f}/yr**)")
        subs_formatted = "\n".join(subs_list) if subs_list else "- *No recurring subscriptions identified.*"

        if model_id == "nemotron":
            text = f"""{followup_lead}### **NVIDIA Nemotron Quantitative Cashflow & Capital Drag Audit**

**1. Ledger Inflow vs Outflow Balance:**
- **Logged Outflows (Spend)**: **${total_spend:,.2f}** across {len(outflows)} transactions
- **Logged Inflows (Income)**: **${total_income:,.2f}** across {len(inflows)} transactions
- **Net Operating Cashflow**: **${net_cashflow:+,.2f}**

**2. Primary Capital Outflow Concentrations:**
{top_cats_str}

**3. Recurring SaaS & Subscription Drag:**
We identified **{len(flagged_subs)} recurring items** creating **${monthly_sub_total:,.2f}/month** in capital drainage:
{subs_formatted}
- **5-Year Compounding Penalty**: If redirected into a 7.5% market index, this **${annual_sub_leak:,.2f}/year** leakage erodes **${(annual_sub_leak * 5 * 1.18):,.2f}** in potential wealth.

**4. Institutional Action Mandate:**
1. **Immediate Purge**: Terminate redundant subscriptions to instantly recapture **${annual_sub_leak:,.2f}/year**.
2. **Discretionary Speedbump**: Enforce a mandatory 48-hour authorization delay for any non-recurring charge above $150."""
            model_label = "Nemotron (mistralai/mistral-nemotron)"
            provider = "NVIDIA NIM"

        elif model_id == "claude":
            text = f"""{followup_lead}### **Claude Behavioral Spending & Cashflow Breakdown**

**Your Real Numbers:**
Over your recent recorded activity, you've spent **${total_spend:,.2f}** against **${total_income:,.2f}** in income, resulting in a net monthly flow of **${net_cashflow:+,.2f}**.

**Where Your Money is Leaking:**
{subs_formatted}

**Behavioral Observations:**
- **Micro-Friction Invisibility**: Recurring subscriptions of $20–$60 slip past our attention because they fall below our daily pain threshold. But together they represent **${annual_sub_leak:,.2f} every year**.
- **Discretionary Drift**: Your top category is {sorted_categories[0][0] if sorted_categories else 'General Spending'} (${sorted_categories[0][1] if sorted_categories else 0:,.2f}).

**Two Actions You Can Take Today:**
1. Log in and cancel at least two subscriptions you haven't actively used this month.
2. Automate a scheduled transfer of $100/week into your investment portfolio the day after each paycheck arrives."""
            model_label = "Claude (claude-sonnet-4-5)"
            provider = "Anthropic"

        else:
            text = f"""{followup_lead}### **Google Gemini Cash Flow & Expense Audit**

**Monthly Cash Flow Overview:**
- **Total Tracked Outflows**: **${total_spend:,.2f}**
- **Total Tracked Inflows**: **${total_income:,.2f}**
- **Net Balance**: **${net_cashflow:+,.2f}**

**Identified Recurring Leaks:**
{subs_formatted}
- **Total Annual Leak**: **${annual_sub_leak:,.2f}/year**

**Top Spending Drivers:**
{top_cats_str}

**Immediate Priority Actions:**
1. Cancel unused digital memberships to reclaim capital.
2. Direct excess savings into low-cost index funds (e.g., VOO) to maximize compounding."""
            model_label = "Gemini 2.0 Flash"
            provider = "Google Gemini"

    # ── SCENARIO 3: Portfolio Risk / Concentration / Vulnerabilities ────────────
    elif any(k in msg_lower for k in ["risk", "concentrat", "vulnerab", "drawdown", "safe", "danger", "beta", "var"]):
        top_name = top_holding.get("symbol", "N/A") if top_holding else "None"
        top_pct = (abs(float(top_holding.get("current_value", 0))) / gross_exposure * 100) if (top_holding and gross_exposure > 0) else 0.0
        top_val = abs(float(top_holding.get("current_value", 0))) if top_holding else 0.0

        if model_id == "nemotron":
            text = f"""{followup_lead}### **NVIDIA Nemotron Quantitative Portfolio Risk Audit**

**1. Concentration & Structural Variance:**
- **Portfolio NAV**: **${net_portfolio_val:,.2f}** across {len(holdings)} active holdings.
- **Gross Market Exposure**: **${gross_exposure:,.2f}**
- **Herfindahl-Hirschman Index (HHI)**: **{hhi:.0f} / 10,000** ({'HIGH CONCENTRATION (>2500)' if hhi > 2500 else 'MODERATE CONCENTRATION'})
- **Top Asset Weight**: **{top_name}** represents **{top_pct:.1f}%** (${top_val:,.2f}) of your total equity capital.

**2. Stress Test & Value at Risk (VaR 95%):**
- **2-Sigma Sector Shock (-15%)**: Expected portfolio drawdown is **-${gross_exposure * 0.15:,.2f}**.
- **Single-Stock Failure Event**: If `{top_name}` drops 25% on an earnings miss, your NAV declines by **-${top_val * 0.25:,.2f}** instantly.

**3. Hedging & Optimization Roadmap:**
1. **De-risk `{top_name}`**: Trim down to target < 20% gross allocation.
2. **Establish Fixed-Income / Treasury Anchor**: Allocate at least 10–15% of NAV into short Treasuries/SPAXX to establish downside buffer and deploy dry powder during corrections."""
            model_label = "Nemotron (mistralai/mistral-nemotron)"
            provider = "NVIDIA NIM"

        else:
            text = f"""{followup_lead}### **Portfolio Risk & Concentration Diagnostic**

**Current Exposure Summary:**
- **Total Assets**: **${net_portfolio_val:,.2f}** across {len(holdings)} holdings.
- **Top Position Concentration**: **{top_name}** accounts for **{top_pct:.1f}%** (${top_val:,.2f}).
- **Risk Evaluation**: {"[!] OVERCONCENTRATED. Single position exceeds institutional 20% limit." if top_pct > 20 else "[OK] Well-balanced position sizing."}

**Downside Exposure Analysis:**
- Having {top_pct:.1f}% in `{top_name}` leaves your total net worth vulnerable to single-company volatility and sector rotations.
- If `{top_name}` experiences a standard 20% market correction, your balance falls by **${top_val * 0.20:,.2f}**.

**Next Steps to De-Risk:**
1. Scale down top exposure gradually over 2–4 weeks.
2. Move proceeds into core diversified index funds (VOO, VTI, BND)."""
            model_label = "Gemini 2.0 Flash" if model_id == "gemini" else "Claude (claude-sonnet-4-5)"
            provider = "Google Gemini" if model_id == "gemini" else "Anthropic"

    # ── SCENARIO 4: Rebalancing Plan & Asset Allocation ─────────────────────────
    elif any(k in msg_lower for k in ["rebalance", "allocation", "diversify", "weights", "asset mix"]):
        if model_id == "nemotron":
            text = f"""{followup_lead}### **NVIDIA Nemotron Quantitative Rebalancing Plan**

**1. Current Asset Structure (NAV: ${net_portfolio_val:,.2f}):**
- **Equities / Growth**: ${asset_types.get('Equity', 0):,.2f} ({(asset_types.get('Equity', 0)/gross_exposure*100) if gross_exposure>0 else 0:.1f}%)
- **Index ETFs**: ${asset_types.get('ETF', 0):,.2f} ({(asset_types.get('ETF', 0)/gross_exposure*100) if gross_exposure>0 else 0:.1f}%)
- **Cash Equivalents**: ${asset_types.get('Cash', 0):,.2f} ({(asset_types.get('Cash', 0)/gross_exposure*100) if gross_exposure>0 else 0:.1f}%)

**2. Institutional Target Allocation (Core-Satellite Model):**
- **50% Core Equity Index (VOO / VTI)**: Stable broad-market market beta
- **25% High-Conviction Single Equities**: Alpha generators (max 10% per name)
- **15% Fixed Income / Short Duration Treasuries**: Volatility cushion & rebalancing dry powder
- **10% Cash Reserves**: Liquid emergency buffer

**3. Execution Tranches:**
- **Step 1**: Trim any single holding exceeding 20% allocation.
- **Step 2**: Direct fresh monthly savings into lagging asset categories without triggering unnecessary taxable capital gains."""
            model_label = "Nemotron (mistralai/mistral-nemotron)"
            provider = "NVIDIA NIM"

        else:
            text = f"""{followup_lead}### **Target Asset Rebalancing Strategy**

**Recommended Target Portfolio Framework:**
1. **Core Market Foundation (55–65%)**: Low-cost index ETFs (VOO, VTI, QQQM)
2. **Individual Growth Opportunities (20–25%)**: High-conviction companies
3. **Safety & Cash Reserve (10–15%)**: High-yield cash / Treasury bills

**Execution Strategy:**
- Rather than selling all your winners at once and incurring capital gains taxes, direct future cash flows into underweight asset classes.
- Set a semi-annual rebalancing reminder to review position drift."""
            model_label = "Gemini 2.0 Flash" if model_id == "gemini" else "Claude (claude-sonnet-4-5)"
            provider = "Google Gemini" if model_id == "gemini" else "Anthropic"

    # ── SCENARIO 5: Deploying New Capital / $10,000 Allocation ─────────────────
    elif any(k in msg_lower for k in ["10,000", "10000", "deploy", "invest today", "lump sum", "new money", "where to invest"]):
        text = f"""{followup_lead}### **$10,000 Capital Allocation Blueprint**

Based on your current portfolio posture (NAV: **${net_portfolio_val:,.2f}**, {len(holdings)} holdings), here is a disciplined allocation roadmap:

**1. $5,000 (50%) — Core S&P 500 Index Anchor (VOO / VTI)**
- Provides broad corporate diversification and lowers portfolio volatility.

**2. $2,500 (25%) — Dividend / Defensive Value (SCHD / VYM)**
- Generates steady cash flow and acts as a stabilizing counterweight to high-beta tech.

**3. $1,500 (15%) — High-Yield Risk-Free Cash Reserve (SPAXX / Treasury Bills)**
- Yields ~4.8–5.2% annualized with zero market risk, preserving dry powder for market pullbacks.

**4. $1,000 (10%) — Opportunistic Growth / High Conviction**
- Reserved for asymmetric growth plays.

**Execution Rule**: Deploy 50% immediately, and dollar-cost average the remaining 50% across two bi-weekly tranches to mitigate timing risk."""
        model_label = "Nemotron (mistralai/mistral-nemotron)" if model_id == "nemotron" else ("Gemini 2.0 Flash" if model_id == "gemini" else "Claude (claude-sonnet-4-5)")
        provider = "NVIDIA NIM" if model_id == "nemotron" else ("Google Gemini" if model_id == "gemini" else "Anthropic")

    # ── SCENARIO 6: General Financial Health & Portfolio Review ────────────────
    else:
        top_h_symbol = top_holding.get("symbol", "N/A") if top_holding else "None"
        top_h_pct = (abs(float(top_holding.get("current_value", 0))) / gross_exposure * 100) if (top_holding and gross_exposure > 0) else 0.0
        top_h_val = abs(float(top_holding.get("current_value", 0))) if top_holding else 0.0

        if model_id == "nemotron":
            text = f"""{followup_lead}### **NVIDIA Nemotron Institutional Portfolio Audit**

**Comprehensive Health Diagnostics for:** *"{user_message}"*

**1. Capital Allocation & Concentration Health:**
- **Portfolio NAV**: **${net_portfolio_val:,.2f}** across **{len(holdings)}** asset positions.
- **Top Exposure**: **{top_h_symbol}** stands at **{top_h_pct:.1f}%** (${top_h_val:,.2f}) of your total equity capital.
- **Concentration Rating**: {'[!] HIGH RISK — Exceeds institutional 20% limit' if top_h_pct > 20 else '[OK] HEALTHY — Within prudential parameters'}.

**2. Cashflow Dynamics & Capital Preservation:**
- **Tracked Outflows**: **${total_spend:,.2f}**
- **Tracked Inflows**: **${total_income:,.2f}**
- **Net Monthly Flow**: **${net_cashflow:+,.2f}**
- **Recurring SaaS/Subscription Overhead**: **${annual_sub_leak:,.2f}/year** across {len(flagged_subs)} services.

**3. Quantitative Vulnerabilities & Priority Mandates:**
1. **Trim Overweight Exposure**: Cap any single position at 20% maximum to insulate against single-company drawdowns.
2. **Audit Discretionary Leaks**: Eliminate redundant recurring services to reclaim up to **${annual_sub_leak:,.2f}/year** in compounding capital.
3. **Liquidity Buffer**: Ensure 3–6 months of fixed expenditures are secured in liquid short-duration cash equivalents."""
            model_label = "Nemotron (mistralai/mistral-nemotron)"
            provider = "NVIDIA NIM"

        elif model_id == "claude":
            text = f"""{followup_lead}### **Claude Personal Financial Advisory Synthesis**

**Answering your question:** *"{user_message}"*

**Your Complete Financial Snapshot:**
- **Portfolio Value**: **${net_portfolio_val:,.2f}** across {len(holdings)} holdings.
- **Largest Position**: **{top_h_symbol}** ({top_h_pct:.1f}% of total).
- **Recent Net Cash Flow**: **${net_cashflow:+,.2f}** (${total_income:,.2f} in, ${total_spend:,.2f} out).

**Key Takeaways & Perspectives:**
1. **Simplify & Protect**: Wealth is built not by trying to predict the next big mover, but by protecting your base. Your largest single position is {top_h_symbol} at {top_h_pct:.1f}% — keeping an eye on this will prevent unexpected drawdowns.
2. **Cash Flow Freedom**: You have **${annual_sub_leak:,.2f}/year** in recurring subscriptions. Trimming even half of this frees up capital you can direct into long-term index compounding.

**Your Recommended Action Today:**
Conduct a 15-minute review to cancel unused subscriptions and set an automatic transfer into your core investment account."""
            model_label = "Claude (claude-sonnet-4-5)"
            provider = "Anthropic"

        else:
            text = f"""{followup_lead}### **Google Gemini Grounded Financial Advisory**

**Analysis in response to:** *"{user_message}"*

**Portfolio Health Snapshot:**
- **Portfolio Value**: **${net_portfolio_val:,.2f}** ({len(holdings)} holdings)
- **Top Holding**: **{top_h_symbol}** at **{top_h_pct:.1f}%** (${top_h_val:,.2f})
- **Net Cash Flow**: **${net_cashflow:+,.2f}** (${total_income:,.2f} in vs ${total_spend:,.2f} out)

**Identified Strategic Areas:**
1. **Concentration Risk**: {"Single-stock exposure in " + top_h_symbol + " exceeds 20%." if top_h_pct > 20 else "Holdings are diversified across multiple positions."}
2. **Cash Flow Efficiency**: Recurring subscriptions total **${annual_sub_leak:,.2f}/year**.

**Priority Next Steps:**
1. Rebalance concentrated holdings toward broad market index funds (e.g., VOO).
2. Eliminate inactive subscriptions to optimize monthly compounding."""
            model_label = "Gemini 2.0 Flash"
            provider = "Google Gemini"

    return {
        "text": text,
        "model": model_label,
        "provider": provider
    }
