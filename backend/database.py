import sqlite3
import json
from typing import Dict, Any, List, Optional
from backend.config import DB_PATH

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # sessions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)
    
    # papers
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS papers (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        hash TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        title TEXT NOT NULL,
        authors TEXT DEFAULT '',
        year INTEGER DEFAULT 2024,
        abstract TEXT DEFAULT '',
        page_count INTEGER DEFAULT 1,
        status TEXT DEFAULT 'pending',
        file_size INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    )
    """)
    
    # chunks
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        paper_id TEXT NOT NULL,
        section TEXT NOT NULL,
        page INTEGER NOT NULL,
        text TEXT NOT NULL,
        embedding TEXT,
        chunk_index INTEGER DEFAULT 0,
        FOREIGN KEY (paper_id) REFERENCES papers (id) ON DELETE CASCADE
    )
    """)
    
    # analyses
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS analyses (
        id TEXT PRIMARY KEY,
        paper_id TEXT NOT NULL UNIQUE,
        summary TEXT NOT NULL,
        problem TEXT NOT NULL,
        method TEXT NOT NULL,
        dataset TEXT NOT NULL,
        metrics TEXT NOT NULL,
        results TEXT NOT NULL,
        contributions TEXT NOT NULL,
        limitations TEXT NOT NULL,
        future_work TEXT NOT NULL,
        source_label TEXT NOT NULL,
        evidence_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (paper_id) REFERENCES papers (id) ON DELETE CASCADE
    )
    """)
    
    # gaps
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gaps (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        title TEXT NOT NULL,
        text TEXT NOT NULL,
        category TEXT DEFAULT 'Methodological',
        frequency INTEGER DEFAULT 1,
        confidence TEXT NOT NULL,
        rationale TEXT NOT NULL,
        evidence_json TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)
    
    # comparisons
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS comparisons (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        paper_ids TEXT NOT NULL,
        matrix_json TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)
    
    # background jobs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        paper_id TEXT NOT NULL,
        stage TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        status TEXT NOT NULL,
        error TEXT,
        updated_at TEXT NOT NULL
    )
    """)
    
    # settings
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)
    
    # Insert default session if none exists
    cursor.execute("SELECT COUNT(*) as count FROM sessions")
    if cursor.fetchone()["count"] == 0:
        cursor.execute(
            "INSERT INTO sessions (id, name, created_at) VALUES ('default', 'Primary Research Workspace', datetime('now'))"
        )
    
    # Insert default settings if none exist
    defaults = {
        "ollama_url": "http://localhost:11434",
        "ollama_model": "llama3.2",
        "use_ollama": "true",
        "embedding_mode": "local_vectorizer"
    }
    for k, v in defaults.items():
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, v))
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized.")
