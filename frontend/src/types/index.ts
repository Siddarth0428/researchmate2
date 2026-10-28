export interface CitationItem {
  paper_title: string;
  page: number;
  excerpt: string;
  score?: number;
}

export interface PaperAnalysis {
  paper_id: string;
  summary: string;
  problem: string;
  method: string;
  dataset: string;
  metrics: string;
  results: string;
  contributions: string;
  limitations: string;
  future_work: string;
  source_label: string; // e.g., "Extractive (no LLM)" or "Ollama: llama3.2"
  evidence: Record<string, CitationItem[]>;
  created_at: string;
}

export interface Paper {
  id: string;
  session_id: string;
  hash: string;
  filename: string;
  title: string;
  authors: string;
  year: number;
  abstract: string;
  page_count: number;
  status: 'parsing' | 'processing' | 'ready' | 'failed' | 'duplicate';
  file_size: number;
  created_at: string;
  analysis?: PaperAnalysis | null;
}

export interface RecommendationItem {
  paper_id: string;
  title: string;
  authors: string;
  year: number;
  similarity_score: number;
  shared_concepts: string[];
}

export interface GraphNode {
  id: string;
  title: string;
  authors: string;
  year: number;
  group: number;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  shared_concepts: string[];
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

export interface ResearchGap {
  id: string;
  session_id: string;
  title: string;
  text: string;
  category: string;
  frequency: number;
  confidence: 'High' | 'Medium' | 'Low';
  rationale: string;
  evidence: CitationItem[];
  created_at: string;
}

export interface ComparisonMatrix {
  session_id: string;
  paper_ids: string[];
  papers: Array<{
    id: string;
    title: string;
    authors: string;
    year: number;
  }>;
  matrix: Array<{
    criterion: string;
    key: string;
    values: Record<string, {
      text: string;
      evidence: CitationItem[];
    }>;
  }>;
  csv_download_url?: string;
}

export interface HealthStatus {
  api_status: string;
  ollama_available: boolean;
  active_model_name: string;
  embedding_model_loaded: string;
  sqlite_status: string;
  total_papers: number;
  total_chunks: number;
}

export interface Settings {
  ollama_url: string;
  ollama_model: string;
  use_ollama: boolean;
  embedding_mode: string;
}

export interface JobProgress {
  id: string;
  paper_id: string;
  stage: string;
  progress: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string | null;
  updated_at: string;
}
