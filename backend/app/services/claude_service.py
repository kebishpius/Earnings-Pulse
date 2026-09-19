import logging
import anthropic
from app.config import ANTHROPIC_API_KEY

logger = logging.getLogger(__name__)

CLAUDE_MODEL = "claude-sonnet-4-5"

SYSTEM_PROMPT = """You are EarningsPulse AI, a world-class personal financial advisor and quantitative risk analyst.
You have been given the user's actual portfolio data, transaction history, and financial context.
Your job is to provide sharp, actionable, data-driven financial advice tailored to THEIR specific situation.

Guidelines:
- Always reference specific numbers from their data when relevant (e.g., "Your NVDA position at 46.5% is dangerously concentrated...")
- Be direct and confident — act like a top-tier Goldman Sachs analyst
- Identify risks proactively, not just when asked
- Format responses clearly with bullet points or numbered lists when listing multiple items
- Keep responses focused and concise (200-400 words unless a deep dive is requested)
- End with 1-2 actionable next steps the user can take TODAY
- Be encouraging but honest — don't sugarcoat real risks
"""


def build_portfolio_context(portfolio_context: dict) -> str:
    """Format portfolio data into a rich context string for Claude."""
    if not portfolio_context:
        return "No personal portfolio data uploaded yet. Provide general financial advice."

    lines = ["=== USER PORTFOLIO DATA ==="]

    holdings = portfolio_context.get("holdings", [])
    if holdings:
        lines.append("\nINVESTMENT HOLDINGS:")
        total_val = sum(h.get("current_value", 0) for h in holdings)
        for h in holdings:
            lines.append(
                f"  - {h.get('symbol', 'N/A')} ({h.get('asset_name', 'Unknown')}): "
                f"{h.get('allocation_pct', 0)}% allocation, "
                f"${h.get('current_value', 0):,.2f} value, "
                f"type: {h.get('asset_type', 'Equity')}"
            )
        lines.append(f"  TOTAL PORTFOLIO VALUE: ${total_val:,.2f}")

    transactions = portfolio_context.get("transactions", [])
    if transactions:
        lines.append(f"\nRECENT TRANSACTIONS ({len(transactions)} records):")
        total_spend = sum(float(t.get("amount", 0)) for t in transactions)
        for t in transactions[:15]:  # cap at 15 to stay within context
            lines.append(
                f"  - {t.get('date', 'N/A')}: {t.get('description', 'Unknown')} "
                f"= ${float(t.get('amount', 0)):.2f} [{t.get('category', 'Misc')}]"
            )
        if len(transactions) > 15:
            lines.append(f"  ... and {len(transactions) - 15} more transactions")
        lines.append(f"  TOTAL LOGGED SPEND: ${total_spend:,.2f}")

    audit_result = portfolio_context.get("last_audit")
    if audit_result:
        lines.append(f"\nLAST AI RISK AUDIT:")
        lines.append(f"  Risk Score: {audit_result.get('overall_risk_score', 'N/A')}/100")
        lines.append(f"  Risk Level: {audit_result.get('risk_level', 'N/A')}")
        leaks = audit_result.get("subscription_leaks", [])
        if leaks:
            lines.append(f"  Subscription Leaks: {len(leaks)} flagged")

    lines.append("\n=== END PORTFOLIO DATA ===")
    return "\n".join(lines)


def advise_with_claude(user_message: str, portfolio_context: dict = None, history: list = None) -> dict:
    """
    Send a user financial advisory question to Claude Sonnet with full portfolio context.
    Returns dict with 'text' and 'model' keys.
    """
    if not ANTHROPIC_API_KEY:
        from app.services.advisor_engine import analyze_portfolio_and_generate_advice
        return analyze_portfolio_and_generate_advice(
            user_message=user_message,
            model_id="claude",
            portfolio_context=portfolio_context,
            history=history
        )

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    portfolio_str = build_portfolio_context(portfolio_context or {})

    full_system = f"{SYSTEM_PROMPT}\n\n{portfolio_str}"

    logger.info(f"Sending advisor request to Claude {CLAUDE_MODEL}: '{user_message[:80]}...'")

    try:
        response = client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=1024,
            system=full_system,
            messages=[
                {"role": "user", "content": user_message}
            ]
        )
        text = response.content[0].text if response.content else "No response generated."
        return {
            "text": text,
            "model": f"Claude ({CLAUDE_MODEL})",
            "provider": "Anthropic",
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
        }
    except Exception as e:
        logger.warning(f"Claude API error/unavailable ({e}), generating dynamic behavioral advisor response.")
        from app.services.advisor_engine import analyze_portfolio_and_generate_advice
        return analyze_portfolio_and_generate_advice(
            user_message=user_message,
            model_id="claude",
            portfolio_context=portfolio_context,
            history=history
        )
