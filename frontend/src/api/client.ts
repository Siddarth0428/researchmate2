import type { 
  HealthStatus, Paper, PaperAnalysis, RecommendationItem, 
  GraphData, ResearchGap, ComparisonMatrix, Settings, JobProgress 
} from '../types';

const BASE_URL = '';

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch(`${BASE_URL}/api/health`);
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
}

export async function fetchPapers(sessionId: string = 'default'): Promise<Paper[]> {
  const res = await fetch(`${BASE_URL}/api/papers?session_id=${sessionId}`);
  if (!res.ok) throw new Error('Failed to fetch papers');
  return res.json();
}

export async function fetchPaper(paperId: string): Promise<Paper> {
  const res = await fetch(`${BASE_URL}/api/papers/${paperId}`);
  if (!res.ok) throw new Error('Failed to fetch paper details');
  return res.json();
}

export async function uploadPaper(file: File, sessionId: string = 'default'): Promise<{ job_id?: string; paper_id?: string; status: string; message?: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('session_id', sessionId);

  const res = await fetch(`${BASE_URL}/api/papers/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function fetchJobProgress(jobId: string): Promise<JobProgress> {
  const res = await fetch(`${BASE_URL}/api/jobs/${jobId}`);
  if (!res.ok) throw new Error('Failed to check pipeline progress');
  return res.json();
}

export async function deletePaper(paperId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/papers/${paperId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete paper');
}

export async function reanalyzePaper(paperId: string): Promise<PaperAnalysis> {
  const res = await fetch(`${BASE_URL}/api/papers/${paperId}/analyze`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reanalyze paper');
  return res.json();
}

export async function loadSamplePapers(sessionId: string = 'default'): Promise<{ message: string; paper_ids: string[] }> {
  const res = await fetch(`${BASE_URL}/api/papers/sample?session_id=${sessionId}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to load sample research papers');
  return res.json();
}

export async function fetchRecommendations(paperId: string, sessionId: string = 'default'): Promise<RecommendationItem[]> {
  const res = await fetch(`${BASE_URL}/api/recommendations/${paperId}?session_id=${sessionId}`);
  if (!res.ok) throw new Error('Failed to fetch recommendations');
  return res.json();
}

export async function fetchGraph(sessionId: string = 'default'): Promise<GraphData> {
  const res = await fetch(`${BASE_URL}/api/graph?session_id=${sessionId}`);
  if (!res.ok) throw new Error('Failed to fetch similarity graph');
  return res.json();
}

export async function comparePapers(sessionId: string, paperIds: string[]): Promise<ComparisonMatrix> {
  const res = await fetch(`${BASE_URL}/api/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, paper_ids: paperIds }),
  });
  if (!res.ok) throw new Error('Failed to compare papers');
  return res.json();
}

export async function fetchGaps(sessionId: string = 'default'): Promise<ResearchGap[]> {
  const res = await fetch(`${BASE_URL}/api/gaps?session_id=${sessionId}`);
  if (!res.ok) throw new Error('Failed to fetch research gaps');
  return res.json();
}

export async function generateReport(sessionId: string, title: string, format: string = 'markdown'): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, title, format }),
  });
  if (!res.ok) throw new Error('Failed to generate synthesis report');
  return res.json();
}

export async function fetchSettings(): Promise<Settings> {
  const res = await fetch(`${BASE_URL}/api/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(settings: Settings): Promise<Settings> {
  const res = await fetch(`${BASE_URL}/api/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to save settings');
  return res.json();
}
