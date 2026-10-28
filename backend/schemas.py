from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class CitationItem(BaseModel):
    paper_title: str
    page: int
    excerpt: str
    score: Optional[float] = None

class PaperAnalysisResponse(BaseModel):
    paper_id: str
    summary: str
    problem: str
    method: str
    dataset: str
    metrics: str
    results: str
    contributions: str
    limitations: str
    future_work: str
    source_label: str  # e.g., "Extractive (no LLM)" or "Ollama: llama3.2"
    evidence: Dict[str, List[CitationItem]] = {}
    created_at: str

class PaperResponse(BaseModel):
    id: str
    session_id: str
    hash: str
    filename: str
    title: str
    authors: str
    year: int
    abstract: str
    page_count: int
    status: str
    file_size: int
    created_at: str
    analysis: Optional[PaperAnalysisResponse] = None

class RecommendationItem(BaseModel):
    paper_id: str
    title: str
    authors: str
    year: int
    similarity_score: float
    shared_concepts: List[str]

class GraphNode(BaseModel):
    id: str
    title: str
    authors: str
    year: int
    group: int = 1

class GraphEdge(BaseModel):
    source: str
    target: str
    weight: float
    shared_concepts: List[str]

class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    links: List[GraphEdge]

class ResearchGapItem(BaseModel):
    id: str
    session_id: str
    title: str
    text: str
    category: str
    frequency: int
    confidence: str  # "High" | "Medium" | "Low"
    rationale: str
    evidence: List[CitationItem]
    created_at: str

class ComparisonRequest(BaseModel):
    session_id: str
    paper_ids: List[str]

class ComparisonMatrixResponse(BaseModel):
    session_id: str
    paper_ids: List[str]
    papers: List[Dict[str, Any]]
    matrix: List[Dict[str, Any]]
    csv_download_url: Optional[str] = None

class HealthResponse(BaseModel):
    api_status: str
    ollama_available: bool
    active_model_name: str
    embedding_model_loaded: str
    sqlite_status: str
    total_papers: int
    total_chunks: int

class SettingsModel(BaseModel):
    ollama_url: str
    ollama_model: str
    use_ollama: bool
    embedding_mode: str

class JobProgressResponse(BaseModel):
    id: str
    paper_id: str
    stage: str  # "Parsing" | "Chunking" | "Embedding" | "Analyzing" | "Complete" | "Failed"
    progress: int  # 0 to 100
    status: str    # "pending" | "running" | "completed" | "failed"
    error: Optional[str] = None
    updated_at: str

class ReportRequest(BaseModel):
    session_id: str
    title: Optional[str] = "Research Intelligence Synthesis Report"
    paper_ids: Optional[List[str]] = None
    format: str = "markdown"  # "markdown" or "pdf"
