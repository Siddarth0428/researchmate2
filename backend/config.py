import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
PAPERS_DIR = STORAGE_DIR / "papers"
REPORTS_DIR = STORAGE_DIR / "reports"
DB_PATH = BASE_DIR / "researchmate.db"

# Ensure directories exist
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
PAPERS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
ACTIVE_EMBEDDING_MODEL = "TF-IDF / Local Semantic Cosine Vectorizer"
MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50 MB
