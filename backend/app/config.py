import os
from pathlib import Path
from dotenv import load_dotenv

# Search for .env in current directory and parent directories
base_dir = Path(__file__).resolve().parent.parent.parent
env_paths = [
    base_dir / ".env",
    Path(__file__).resolve().parent.parent / ".env",
    Path.cwd() / ".env"
]

for p in env_paths:
    if p.exists():
        load_dotenv(p, override=True)
        break

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "mistralai/mistral-nemotron")
NVIDIA_FALLBACK_MODELS = [
    os.getenv("NVIDIA_MODEL", "mistralai/mistral-nemotron"),
    "nvidia/nemotron-3-super-120b-a12b",
    "nvidia/nemotron-3-ultra-550b-a55b",
]

PORT = int(os.getenv("PORT", "8000"))
HOST = os.getenv("HOST", "127.0.0.1")

# SnapTrade Brokerage Integration
SNAPTRADE_CLIENT_ID = os.getenv("SNAPTRADE_CLIENT_ID", "")
SNAPTRADE_CONSUMER_KEY = os.getenv("SNAPTRADE_CONSUMER_KEY", "")
SNAPTRADE_BASE_URL = os.getenv("SNAPTRADE_BASE_URL", "https://api.snaptrade.com/api/v1")
