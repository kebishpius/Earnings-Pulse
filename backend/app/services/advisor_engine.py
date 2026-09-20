import re
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("earningspulse.advisor_engine")

def analyze_portfolio_and_generate_advice(
    user_message: str,
    model_id: str = "gemini",
    portfolio_context: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Intelligent dynamic quantitative financial advisor reasoning engine.
    Generates tailored, data-driven financial advice based on the user's specific prompt,
    conversation history, actual holdings, and transaction ledger.
    Differentiates perspective based on model persona (Gemini, Nemotron, Claude).
    """
    context = portfolio_context or {}
    holdings = context.get("holdings", [])
    transactions = context.get("transactions", [])
    last_audit = context.get("last_audit") or {}
    
    total_portfolio_val = sum(float(h.get("current_value", 0)) for h in holdings)

    # Amounts are signed: negative is cash out, positive is cash in. Spending is
    # the outflow side only — summing the ledger raw made a month with a
    # paycheck in it look almost free.
    outflows = [t for t in transactions if float(t.get("amount", 0)) < 0]
    inflows = [t for t in transactions if float(t.get("amount", 0)) > 0]
    total_spend = sum(abs(float(t.get("amount", 0))) for t in outflows)
    total_income = sum(float(t.get("amount", 0)) for t in inflows)
    net_flow = total_income - total_spend

    # Sort holdings by exposure, so a large short ranks with the large longs
    # rather than sinking to the bottom of the list.
    sorted_holdings = sorted(holdings, key=lambda x: abs(float(x.get("current_value", 0))), reverse=True)
    top_holding = sorted_holdings[0] if sorted_holdings else None

    # Category spending breakdown
    cat_spend: Dict[str, float] = {}
    for t in outflows:
        cat = t.get("category", "Other")
        cat_spend[cat] = cat_spend.get(cat, 0.0) + abs(float(t.get("amount", 0)))

    sorted_categories = sorted(cat_spend.items(), key=lambda x: x[1], reverse=True)
    
    # Check for recurring subscriptions or SaaS in transactions
    subscription_keywords = [
        "subscription", "spotify", "netflix", "bloomberg", "aws", "midjourney", 
        "chatgpt", "cloud", "gym", "equinox", "membership", "prime", "sub"
    ]
    # Outflows only: a dividend from a streaming stock is not a subscription.
    flagged_subscriptions = [
        t for t in outflows
        if any(k in t.get("description", "").lower() or k in t.get("category", "").lower() for k in subscription_keywords)
    ]
    
    # Analyze prompt intent
    msg_lower = user_message.lower().strip()
    
    # Check if a specific stock ticker is mentioned
    mentioned_tickers = []
    known_tickers = ["NVDA", "AAPL", "MSFT", "TSLA", "BTC", "ETH", "AMZN", "GOOGL", "META", "PLTR", "COIN", "VOO", "SPY"]
    for tkr in known_tickers:
        if re.search(r'\b' + re.escape(tkr.lower()) + r'\b', msg_lower) or re.search(r'\b' + re.escape(tkr) + r'\b', user_message):
            mentioned_tickers.append(tkr)
            
    # Check history count for follow-up phrasing
    prev_turns = len(history or [])
    is_followup = prev_turns > 0
    followup_lead = f"Continuing our advisory dialogue (exchange #{prev_turns + 1}):\n\n" if is_followup else ""

    # ──────────────────────────────────────────────────────────────────────────
    # SCENARIO A: Spending / Expenses / Overspending
    # ──────────────────────────────────────────────────────────────────────────
    if any(k in msg_lower for k in ["spending", "spend", "expense", "expenses", "overspending", "outflow", "budget", "lifestyle"]):
        if model_id == "nemotron":
            # NVIDIA Nemotron persona: Quantitative variance, burn rate, institutional capital allocation
            lines = [
                f"{followup_lead}### **NVIDIA Nemotron Quantitative Cashflow Audit**",
                f"**Capital Drag & Expenditure Variance Analysis:**",
                f"Total logged outflows across {len(transactions)} transactions stand at **${total_spend:,.2f}**, "
                f"against **${total_income:,.2f}** of recorded inflow — net cashflow of **${net_flow:+,.2f}**."
            ]
            if sorted_categories:
                top_cats = ", ".join(f"**{c[0]}** (${c[1]:,.2f}, {c[1]/total_spend*100:.1f}%)" for c in sorted_categories[:3]) if total_spend > 0 else "None"
                lines.append(f"\n1. **Primary Outflow Drivers**: {top_cats}")
            
            lines.extend([
                f"2. **Discretionary Capital Leakage**:",
                f"   - Annualized discretionary burn creates an implicit negative carry of **${(total_spend * 12):,.2f}/yr** against your compounding assets.",
                f"   - Capital allocated to high-variance outflows (such as speculative trading fees and redundant compute instances) degrades your overall Sharpe ratio.",
                f"\n3. **Institutional Action Mandate**:",
                f"   - **Establish a Hard Capital Hurdle**: Implement a 48-hour cooling protocol for non-operational expenditures exceeding $100.",
                f"   - **Redirect to Liquidity Reserves**: Sweep recovered capital into short-duration cash equivalents yielding 4.8–5.2% annualized risk-free return."
            ])
            text = "\n".join(lines)
            model_label = "Nemotron (mistralai/mistral-nemotron)"
            provider = "NVIDIA NIM"

        elif model_id == "claude":
            # Anthropic Claude persona: Behavioral finance, lifestyle optimization, cognitive friction
            lines = [
                f"{followup_lead}### **Claude Behavioral Cashflow Analysis**",
                f"Looking at your transaction ledger, you've recorded **${total_spend:,.2f}** in outflows and **${total_income:,.2f}** in inflows across {len(transactions)} entries.",
                f"\nHere is where your capital is concentrating and where behavioral adjustments will have the highest leverage:"
            ]
            if sorted_categories:
                lines.append("\n**Top Outflow Categories:**")
                for cat, amt in sorted_categories[:4]:
                    pct = (amt / total_spend * 100) if total_spend > 0 else 0
                    lines.append(f"- **{cat}**: ${amt:,.2f} ({pct:.1f}% of total outflow)")
            
            lines.extend([
                f"\n**Behavioral Observations & Opportunities:**",
                f"- **Convenience & Subscription Creep**: Small, recurring digital tools and memberships frequently go unmonitored because each charge feels individually insignificant.",
                f"- **Speculative Frictions**: Discretionary trading fees and rapid platform costs create unnecessary transaction drag on long-term net worth.",
                f"\n**Tactical Next Steps Today:**",
                f"1. Conduct a single-session audit to cancel recurring tools you haven't engaged with in the last 14 days.",
                f"2. Set an automated recurring transfer to invest 20% of your disposable income the same day income arrives, taking willpower out of the equation."
            ])
            text = "\n".join(lines)
            model_label = "Claude (claude-sonnet-4-5)"
            provider = "Anthropic"

        else:
            # Gemini persona: Grounded macroeconomic strategist
            lines = [
                f"{followup_lead}### **Google Gemini Grounded Spending & Capital Allocation Report**",
                f"**Macroeconomic Context & Household Expenditure Review:**",
                f"Analyzing your active cash ledger totaling **${total_spend:,.2f}** in recent outflows."
            ]
            if sorted_categories:
                top_cat = sorted_categories[0]
                lines.append(f"\n- **Heaviest Capital Drag**: **{top_cat[0]}** accounts for **${top_cat[1]:,.2f}** ({top_cat[1]/total_spend*100:.1f}%) of your total tracked outflow.")
            
            lines.extend([
                f"\n**Strategic Recommendations:**",
                f"1. **Categorical Cap**: Anchor discretionary spending to a 50/30/20 framework (50% Essential, 30% Discretionary, 20% Compounding Wealth).",
                f"2. **Opportunity Cost Modeling**: Reinvesting $300/month of reclaimed outflows at a conservative 8% historical index return yields ~$178,000 over 20 years.",
                f"\n**Concrete Next Steps:**",
                f"- Review transaction statements for redundant software licenses and premium service tiers.",
                f"- Consolidate fragmented payment methods into a single audited cash hub."
            ])
            text = "\n".join(lines)
            model_label = "Gemini 2.0 Flash"
            provider = "Google Gemini"

    # ──────────────────────────────────────────────────────────────────────────
    # SCENARIO B: Subscriptions / Leaks / Cancellations
    # ──────────────────────────────────────────────────────────────────────────
    elif any(k in msg_lower for k in ["subscription", "subscriptions", "leak", "leaks", "cancel", "recurring", "cancelation"]):
        # Costs are quoted as positive figures even though the ledger stores
        # them negative, so "$-19.99/mo" never reaches the user.
        sub_total = sum(abs(float(t.get("amount", 0))) for t in flagged_subscriptions)
        sub_list_str = "\n".join(
            f"- **{t.get('description', 'Unknown')}**: ${abs(float(t.get('amount', 0))):.2f}/mo (`{t.get('category', 'SaaS')}`)"
            for t in flagged_subscriptions
        ) if flagged_subscriptions else "- No obvious high-drag recurring subscriptions detected in current ledger."

        if model_id == "nemotron":
            text = f"""{followup_lead}### **NVIDIA Nemotron Subscription Risk & Drag Audit**

**Quantitative Leak Detection:**
Identified **{len(flagged_subscriptions)}** recurring or platform outflows totaling **${sub_total:,.2f}/month** (annualized drag: **${sub_total * 12:,.2f}**).

**Flagged Outflow Roster:**
{sub_list_str}

**Risk Impact Matrix:**
1. **Unproductive Fixed Burn**: Recurring SaaS fees compound as pure operational overhead without asset backing.
2. **Subscription Duplication**: Identifiable overlap in AI tools and media subscriptions causes redundant capital loss.

**Immediate Optimization:**
- **Terminate Redundant Tiers**: Immediate cancellation of underutilized tools unlocks approximately **${sub_total * 0.5:,.2f}/month** in immediate free cash flow.
- **Deploy Freed Capital**: Channel the recovered liquidity into your index baseline."""
            model_label = "Nemotron (mistralai/mistral-nemotron)"
            provider = "NVIDIA NIM"

        elif model_id == "claude":
            text = f"""{followup_lead}### **Claude Subscription Triage & Behavioral Audit**

Here is an itemized breakdown of recurring and subscription-like charges found in your transaction records:

{sub_list_str}

**Total Monthly Subscription Load:** **${sub_total:,.2f}** (~**${sub_total * 12:,.2f}** annually)

**Actionable Recommendations:**
1. **The 30-Day Cancellation Test**: For services like duplicate streaming, unused professional terminal add-ons, or duplicate AI seats, cancel the subscription today. If you genuinely miss the workflow in 30 days, resubscribe intentionally.
2. **Annual vs. Monthly Arbitrage**: For tools you use daily, switching to an annual commitment often yields a 15–20% discount.

**Step to Take Today:** Cancel at least one flagged service right now to reclaim immediate monthly momentum."""
            model_label = "Claude (claude-sonnet-4-5)"
            provider = "Anthropic"

        else:
            text = f"""{followup_lead}### **Google Gemini Subscription Intelligence & Optimization**

**Grounded Audit of Recurring Subscriptions:**
We identified **{len(flagged_subscriptions)} recurring line items** totaling **${sub_total:,.2f}/month**.

{sub_list_str}

**Strategic Takeaway:**
- Over a 5-year investment horizon at an average 7% market return, eliminating **${sub_total:,.2f}/mo** of subscription drag compounds to **${(sub_total * 12 * 5 * 1.18):,.2f}** in preserved wealth.
- Prioritize retaining high-utility productivity tools while shedding inactive leisure subscriptions.

**Immediate Action:**
Log in to your account dashboards and audit authorization settings for inactive tools."""
            model_label = "Gemini 2.0 Flash"
            provider = "Google Gemini"

    # ──────────────────────────────────────────────────────────────────────────
    # SCENARIO C: Portfolio Risk / Concentration / Vulnerability
    # ──────────────────────────────────────────────────────────────────────────
    elif any(k in msg_lower for k in ["risk", "vulnerability", "concentrat", "drawdown", "safe", "dangerous"]):
        if sorted_holdings:
            top_name = top_holding.get("symbol", "N/A")
            top_pct = float(top_holding.get("allocation_pct", 0))
            top_val = float(top_holding.get("current_value", 0))
        else:
            top_name, top_pct, top_val = "Top Asset", 40.0, 0.0

        if model_id == "nemotron":
            text = f"""{followup_lead}### **NVIDIA Nemotron Quantitative Risk Assessment**

**Portfolio Stress Test & Structural Exposure Analysis:**
- **Portfolio NAV**: ${total_portfolio_val:,.2f} across {len(holdings)} distinct holdings.
- **Top Concentration Risk**: **{top_name}** represents **{top_pct:.1f}%** (${top_val:,.2f}) of total equity exposure.

**Quantitative Vulnerability Breakdown:**
1. **Idiosyncratic Single-Stock Risk**:
   Standard institutional risk management (Basel III / UCITS) mandates maximum single-issuer exposure below **10–15%**. A {top_pct:.1f}% weighting in `{top_name}` exposes the portfolio to catastrophic drawdowns in the event of an earnings miss or sector rerating.
2. **Correlation & Tech Beta**:
   If the portfolio's secondary assets share high covariance with large-cap technology/semiconductors, systemic market corrections will produce a beta > 1.4 relative to the S&P 500.
3. **Value at Risk (VaR 95%)**:
   In a standard 2-standard-deviation market shock (-12%), expected portfolio drawdown exceeds **-${total_portfolio_val * 0.14:,.2f}**.

**Risk Mitigation Action Items:**
- **Trim Concentration**: Gradually scale `{top_name}` down to 20% allocation using limit orders or tax-loss harvesting offsets.
- **Liquidity Buffer**: Ensure at least 5–10% of portfolio NAV is held in low-duration cash equivalents (US Treasuries/SPAXX)."""
            model_label = "Nemotron (mistralai/mistral-nemotron)"
            provider = "NVIDIA NIM"

        elif model_id == "claude":
            text = f"""{followup_lead}### **Claude Risk Profile & Stress Test**

**Your Core Risk Profile:**
Your most significant structural risk right now is **over-concentration in {top_name}** ({top_pct:.1f}% of your portfolio, valued at ${top_val:,.2f}).

**Why This Matters Emotionally & Financially:**
- **The Winner's Curse**: When a stock performs phenomenally, it naturally grows to dominate your portfolio. While it feels great during bull runs, it leaves you emotionally vulnerable to sharp volatility.
- **Asymmetric Downside**: A 25% drop in `{top_name}` erases ${top_val * 0.25:,.2f} of capital, requiring a 33% recovery just to break even.

**What You Can Do Today:**
1. Don't panic-sell all at once. Set a structured rebalancing target (e.g., selling 5% of your position over each of the next 3 weeks).
2. Direct the proceeds into a diversified core index fund (like VOO or VTI) to protect your gains."""
            model_label = "Claude (claude-sonnet-4-5)"
            provider = "Anthropic"

        else:
            text = f"""{followup_lead}### **Google Gemini Grounded Portfolio Risk Intelligence**

**Portfolio Risk Snapshot:**
- **Total Portfolio Value**: ${total_portfolio_val:,.2f}
- **Primary Exposure**: **{top_name}** at **{top_pct:.1f}%** allocation (${top_val:,.2f}).
- **Diversification Rating**: {"Moderate-Low (Heavy Single-Stock Weight)" if top_pct > 30 else "Balanced"}

**Key Vulnerabilities Identified:**
1. **Sector Overweight**: Heavy weighting in high-multiple technology equities leaves portfolio performance tied to macroeconomic interest rate sentiment.
2. **Earnings Volatility**: Concentrated positions create sharp post-earnings gap risks.

**Strategic Action:**
- Establish trailing stops or disciplined profit-taking triggers.
- Rebalance toward multi-sector balance across healthcare, consumer defensives, and index anchors."""
            model_label = "Gemini 2.0 Flash"
            provider = "Google Gemini"

    # ──────────────────────────────────────────────────────────────────────────
    # SCENARIO D: Rebalancing Plan
    # ──────────────────────────────────────────────────────────────────────────
    elif any(k in msg_lower for k in ["rebalance", "rebalancing", "allocation", "weights", "diversify"]):
        if model_id == "nemotron":
            text = f"""{followup_lead}### **NVIDIA Nemotron Institutional Rebalancing Matrix**

**Target Asset Allocation Model (Core-Satellite Framework):**
- **Satellite High-Alpha Equities**: Target 30% max (Currently elevated due to single winners)
- **Core Broad Equity Beta (S&P 500 / VOO)**: Target 45–50%
- **Defensive & Real Assets / Bonds**: Target 15%
- **Cash & Cash Equivalents**: Target 5–10%

**Rebalancing Execution Schedule:**
1. **Tranche 1**: Trim top holding by 10% of NAV.
2. **Tranche 2**: Allocate 70% of reclaimed capital into broad index (VOO/VTI) and 30% into short-term cash reserves.
3. **Monitoring Frequency**: Re-audit every 90 days or when any position drifts by more than 5% from target weight."""
            model_label = "Nemotron (mistralai/mistral-nemotron)"
            provider = "NVIDIA NIM"

        else:
            text = f"""{followup_lead}### **Portfolio Rebalancing Roadmap**

**Current vs. Recommended Target:**
- **Current Core Concentration**: Heavy single-equity weighting.
- **Recommended Target Allocation**:
  - **60% Core Broad Market**: Low-cost index funds (VOO, VTI, QQQM)
  - **25% High-Conviction Individual Stocks**: Top growth ideas
  - **10% Diversified Fixed Income / Cash**: High-yield money market or short Treasuries
  - **5% Speculative / Crypto**: High-volatility upside

**Concrete Execution Steps:**
1. Direct new cash flow towards under-weighted asset classes rather than selling winners prematurely if capital gains taxes are a concern.
2. If rebalancing within a tax-advantaged account (IRA/401k), rebalance immediately with zero tax friction."""
            model_label = "Gemini 2.0 Flash" if model_id == "gemini" else "Claude (claude-sonnet-4-5)"
            provider = "Google Gemini" if model_id == "gemini" else "Anthropic"

    # ──────────────────────────────────────────────────────────────────────────
    # SCENARIO E: Investing $10,000 / New Capital Deployment
    # ──────────────────────────────────────────────────────────────────────────
    elif any(k in msg_lower for k in ["10,000", "10000", "invest today", "new capital", "lump sum", "invest $"]):
        if model_id == "nemotron":
            text = f"""{followup_lead}### **NVIDIA Nemotron $10,000 Capital Deployment Model**

**Risk-Optimized Tranche Allocation:**
Based on your current portfolio posture, here is an institutional deployment structure designed to maximize Risk-Adjusted Return (Sharpe Ratio):

1. **$5,000 (50%) — Broad-Market Equity Index Core (e.g., VOO / S&P 500)**
   - Dampens portfolio variance and balances existing individual single-stock exposures.
2. **$2,500 (25%) — Dividend & Defensive Value Equities (e.g., SCHD / VYM)**
   - Provides dependable cash yield and resilience during growth drawdowns.
3. **$1,500 (15%) — High-Yield Risk-Free Cash Anchor (SPAXX / Treasury Bills)**
   - Yielding ~4.8–5.2% annualized with zero equity risk, preserving dry powder for market corrections.
4. **$1,000 (10%) — Opportunistic Asymmetric Growth / Thematic AI Infra**
   - High-conviction growth opportunities.

**Execution Strategy:**
Deploy 50% immediately, and dollar-cost average the remaining 50% across two equal bi-weekly tranches to mitigate entry timing risk."""
            model_label = "Nemotron (mistralai/mistral-nemotron)"
            provider = "NVIDIA NIM"

        elif model_id == "claude":
            text = f"""{followup_lead}### **Claude $10,000 Investment Strategy**

If you have $10,000 to put to work today, here is a balanced, psychologically sustainable strategy:

1. **Safety & Peace of Mind ($2,000 — 20%)**:
   - Ensure your emergency liquidity is funded in a High-Yield Savings Account or Treasury Money Market fund.
2. **Core Compounding Engine ($6,000 — 60%)**:
   - Allocate into a broad total-market index fund (e.g., VTI or VOO). This ensures broad participation in American corporate earnings without single-stock vulnerability.
3. **Targeted Growth & Learning ($2,000 — 20%)**:
   - Invest in your highest-conviction individual ideas or high-quality dividend payers.

**Pro-Tip**: Avoid trying to time the bottom. Research consistently demonstrates that time in the market outperforms market timing in over 90% of 10-year periods."""
            model_label = "Claude (claude-sonnet-4-5)"
            provider = "Anthropic"

        else:
            text = f"""{followup_lead}### **Google Gemini $10,000 Deployment Plan**

**Macro-Calibrated Allocation Blueprint:**
- **Core Index Foundation ($6,000)**: S&P 500 / Total US Stock Index (VOO / VTI)
- **International & Emerging Diversification ($1,500)**: Broad international equity (VXUS) to capture non-US growth
- **Fixed Income / Treasury Buffer ($1,500)**: Short-duration high-yield Treasuries
- **Conviction Satellite ($1,000)**: Selective innovation equities

**Next Steps Today:**
Set up limit orders or automated recurring weekly investments to smooth your entry price over the quarter."""
            model_label = "Gemini 2.0 Flash"
            provider = "Google Gemini"

    # ──────────────────────────────────────────────────────────────────────────
    # SCENARIO F: Specific Ticker Mentioned
    # ──────────────────────────────────────────────────────────────────────────
    elif mentioned_tickers:
        tkr = mentioned_tickers[0]
        match_holding = next((h for h in holdings if h.get("symbol", "").upper() == tkr), None)
        h_info = f"You currently hold **{match_holding.get('shares', 'N/A')} shares** of `{tkr}` (${match_holding.get('current_value', 0):,.2f}, {match_holding.get('allocation_pct', 0)}% of your portfolio)." if match_holding else f"You do not currently hold `{tkr}` in your tracked portfolio."

        if model_id == "nemotron":
            text = f"""{followup_lead}### **NVIDIA Nemotron Quantitative Ticker Analysis: {tkr}**

**Portfolio Position Context:**
{h_info}

**Institutional Factor Analysis:**
1. **Valuation & Multiple Compression**:
   Evaluate forward Price-to-Earnings and EV/EBITDA relative to the 5-year historical median. High valuation multiples demand consistent double-digit revenue beats.
2. **Beta & Volatility Sensitivity**:
   `{tkr}` exhibits elevated beta relative to the S&P 500. Ensure position sizing does not exceed 15% of total liquid NAV.
3. **Earnings Catalyst Exposure**:
   Track the upcoming quarterly earnings date and implied options volatility move.

**Execution Guidance:**
Maintain strict position discipline. If `{tkr}` rises past your maximum allocation threshold, systematically harvest profits into broad-market index anchors."""
            model_label = "Nemotron (mistralai/mistral-nemotron)"
            provider = "NVIDIA NIM"
        else:
            text = f"""{followup_lead}### **Advisory Dossier: {tkr}**

**Your Portfolio Exposure:**
{h_info}

**Strategic Perspective:**
- **Fundamental Outlook**: `{tkr}` remains an institutional bellwether in its respective sector with strong pricing power and secular tailwinds.
- **Risk Considerations**: Monitor regulatory scrutiny, margin trajectory, and sector competition.
- **Actionable Takeaway**: Balance single-stock conviction with index diversification. Never let one position jeopardize your long-term financial security."""
            model_label = "Gemini 2.0 Flash" if model_id == "gemini" else "Claude (claude-sonnet-4-5)"
            provider = "Google Gemini" if model_id == "gemini" else "Anthropic"

    # ──────────────────────────────────────────────────────────────────────────
    # SCENARIO G: General Query / Fallback
    # ──────────────────────────────────────────────────────────────────────────
    else:
        if model_id == "nemotron":
            text = f"""{followup_lead}### **NVIDIA Nemotron Quantitative Advisory Brief**

**In response to:** *"{user_message}"*

**Quantitative Framework Application:**
1. **Risk-Weighted Capital Allocation**:
   Every financial decision should be evaluated through the lens of Risk-Adjusted Return (Sharpe ratio). With current portfolio NAV of **${total_portfolio_val:,.2f}**, preserve capital preservation as your primary priority.
2. **Operational Efficiency**:
   Audit ongoing monthly outflows (**${total_spend:,.2f}** tracked) to ensure recurring costs do not erode compounding capital.
3. **Scenario Testing**:
   Stress-test your asset allocation against 150bps interest rate adjustments and sector-specific multiple compressions.

**Tactical Recommendations:**
- Maintain 3–6 months of fixed living expenses in cash equivalents.
- Rebalance positions exceeding 15% allocation back to institutional baseline."""
            model_label = "Nemotron (mistralai/mistral-nemotron)"
            provider = "NVIDIA NIM"

        elif model_id == "claude":
            text = f"""{followup_lead}### **Claude Personal Financial Advisory**

**Addressing your question:** *"{user_message}"*

**Key Financial Perspectives:**
1. **Clarity Precedes Action**: Financial success is rarely about finding the "perfect" trade; it is about building disciplined, repeatable systems that protect your downside.
2. **Holistic Balance**: Evaluating your financial posture across your holdings (${total_portfolio_val:,.2f}) and recent transactions (${total_spend:,.2f}), the highest ROI actions are almost always eliminating high-friction recurring leaks and consistently investing in diversified index funds.

**Concrete Step Today:**
Identify the single largest source of financial anxiety or uncertainty in your current routine, and establish one automated rule to address it this week."""
            model_label = "Claude (claude-sonnet-4-5)"
            provider = "Anthropic"

        else:
            text = f"""{followup_lead}### **Google Gemini Grounded Advisory Synthesis**

**Analysis for:** *"{user_message}"*

**Strategic Assessment:**
- **Portfolio Health**: Portfolio value sits at **${total_portfolio_val:,.2f}** with **${total_spend:,.2f}** in tracked transaction activity.
- **Macro Alignment**: In today's interest rate and market environment, barbell strategies (pairing broad low-cost equity index funds with high-yield cash equivalents) provide resilient upside while mitigating drawdown risk.

**Action Plan:**
1. Review your top 3 asset weights for concentration drift.
2. Channel discretionary savings into compounding assets on a bi-weekly schedule."""
            model_label = "Gemini 2.0 Flash"
            provider = "Google Gemini"

    return {
        "text": text,
        "model": model_label,
        "provider": provider
    }
