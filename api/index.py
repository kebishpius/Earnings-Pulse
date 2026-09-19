import sys
import os

# Add backend and root directories to sys.path so the FastAPI app and modules resolve cleanly on Vercel
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", "backend"))
root_dir = os.path.abspath(os.path.join(current_dir, ".."))

for path in [backend_dir, root_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

# Import and expose FastAPI app instance
from app.main import app

# Expose app for Vercel serverless ASGI handler
__all__ = ["app"]

