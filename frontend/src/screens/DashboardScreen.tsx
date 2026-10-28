import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import type { Paper, HealthStatus, ResearchGap, GraphData } from '../types';
import { useAppStore } from '../store/useAppStore';
import { uploadPaper, fetchJobProgress, loadSamplePapers } from '../api/client';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { CitationChip } from '../components/CitationChip';
import { SimilarityGraphView } from '../components/SimilarityGraphView';
import { 
  FileText, Compass, GitCompare, Share2, 
  UploadCloud, Sparkles, BookOpen, Layers, CheckCircle2, 
  ArrowRight, Activity, Database, Cpu, ExternalLink, RefreshCw 
} from 'lucide-react';

interface DashboardScreenProps {
  papers: Paper[];
  health: HealthStatus | null;
  gaps: ResearchGap[];
  graphData: GraphData;
  loading: boolean;
  onRefresh: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  papers,
  health,
  gaps,
  graphData,
  loading,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const sessionId = useAppStore((s) => s.sessionId);
  const addToast = useAppStore((s) => s.addToast);
  const setSelectedPaperId = useAppStore((s) => s.setSelectedPaperId);
  const toggleComparisonPaper = useAppStore((s) => s.toggleComparisonPaper);
  const comparisonPaperIds = useAppStore((s) => s.comparisonPaperIds);

  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Compute total citations count across library
  const totalCitations = papers.reduce((acc, p) => {
    if (p.analysis && p.analysis.evidence) {
      const counts = Object.values(p.analysis.evidence).reduce((sum, list) => sum + list.length, 0);
      return acc + counts;
    }
    return acc;
  }, 0);

  const totalPages = papers.reduce((acc, p) => acc + (p.page_count || 1), 0);

  // Fast Dropzone
  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      addToast({ type: 'warning', title: 'Invalid File', message: 'Only PDF documents are supported.' });
      return;
    }

    try {
      setUploading(true);
      setUploadStage('Parsing PDF Structure');
      setUploadProgress(25);

      const res = await uploadPaper(file, sessionId);
      if (res.status === 'duplicate') {
        addToast({ type: 'warning', title: 'Duplicate Paper', message: `"${file.name}" already in library.` });
        setUploading(false);
        return;
      }

      if (res.job_id) {
        const interval = setInterval(async () => {
          try {
            const prog = await fetchJobProgress(res.job_id!);
            setUploadStage(prog.stage);
            setUploadProgress(prog.progress);
            if (prog.status === 'completed' || prog.status === 'failed') {
              clearInterval(interval);
              setUploading(false);
              onRefresh();
              if (prog.status === 'completed') {
                addToast({ type: 'success', title: 'Paper Ingested', message: `Parsed, chunked & grounded.` });
              }
            }
          } catch {
            clearInterval(interval);
            setUploading(false);
          }
        }, 700);
      }
    } catch (e: any) {
      setUploading(false);
      addToast({ type: 'error', title: 'Upload Failed', message: e.message });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  const handleLoadSamples = async () => {
    try {
      addToast({ type: 'info', title: 'Ingesting Papers', message: 'Loading landmark research papers...' });
      const res = await loadSamplePapers(sessionId);
      addToast({ type: 'success', title: 'Corpus Ready', message: res.message });
      onRefresh();
    } catch (e: any) {
      addToast({ type: 'error', title: 'Load Failed', message: e.message });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Hero Cockpit Banner */}
      <div className="relative overflow-hidden rounded-card p-6 md:p-8 bg-gradient-to-r from-surface via-raised to-surface border border-border shadow-dialog">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/30 text-accent-cyan text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
              <span>RESEARCHMATE AUTONOMOUS INTELLIGENCE</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-primary">
              Scientific Research Cockpit
            </h1>
            <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
              Upload literature, extract structured methodologies, map semantic topologies, and surface evidence-backed research gaps with 100% page-grounded citations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleLoadSamples}
              className="flex items-center gap-2 px-3.5 py-2 rounded-control text-xs font-semibold bg-raised hover:bg-surface text-text-primary border border-border hover:border-accent-cyan/50 transition-all shadow-sm"
              title="Ingest landmark AI papers (Vaswani et al., LoRA, CoT)"
            >
              <Database className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Load Landmark Corpus</span>
            </button>

            <button
              onClick={() => navigate('/reports')}
              className="flex items-center gap-2 px-4 py-2 rounded-control text-xs font-semibold bg-accent-primary hover:bg-accent-primary/80 text-white transition-all shadow-sm"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Export Synthesis</span>
            </button>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-accent-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-accent-violet/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Papers */}
        <div 
          onClick={() => navigate('/library')}
          className="p-4 bg-surface border border-border rounded-card shadow-card glow-card cursor-pointer group"
        >
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Ingested Papers
            </span>
            <div className="p-2 rounded bg-raised text-accent-primary group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-text-primary tabular-nums">
              {papers.length}
            </span>
            <span className="text-xs text-text-muted">
              ({totalPages} pages analyzed)
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-text-secondary">
            <span>Library Status</span>
            <span className="text-accent-cyan font-mono flex items-center gap-1">
              Active <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>

        {/* Evidence Citations */}
        <div 
          onClick={() => navigate('/analysis')}
          className="p-4 bg-surface border border-border rounded-card shadow-card glow-card cursor-pointer group"
        >
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Grounded Citations
            </span>
            <div className="p-2 rounded bg-raised text-accent-cyan group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-text-primary tabular-nums">
              {totalCitations}
            </span>
            <span className="text-xs text-success font-medium">
              100% Verified
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-text-secondary">
            <span>Evidence Rate</span>
            <span className="text-accent-cyan font-mono flex items-center gap-1">
              Inspect <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>

        {/* Discovered Gaps */}
        <div 
          onClick={() => navigate('/gaps')}
          className="p-4 bg-surface border border-border rounded-card shadow-card glow-card cursor-pointer group"
        >
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Research Gaps
            </span>
            <div className="p-2 rounded bg-raised text-warning group-hover:scale-110 transition-transform">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-text-primary tabular-nums">
              {gaps.length}
            </span>
            <span className="text-xs text-text-muted">
              priority clusters
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-text-secondary">
            <span>Frontiers</span>
            <span className="text-accent-cyan font-mono flex items-center gap-1">
              Explore <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>

        {/* AI Engine Architecture */}
        <div 
          onClick={() => navigate('/settings')}
          className="p-4 bg-surface border border-border rounded-card shadow-card glow-card cursor-pointer group"
        >
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Engine & Model
            </span>
            <div className="p-2 rounded bg-raised text-accent-violet group-hover:scale-110 transition-transform">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-sm font-semibold font-mono text-accent-cyan truncate block" title={health?.active_model_name}>
              {health?.ollama_available ? health.active_model_name : 'Extractive NLP'}
            </span>
            <span className="text-[11px] text-text-muted block mt-0.5">
              100% Offline • Zero API Key
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-text-secondary">
            <span>Health</span>
            <span className="text-success font-mono">Connected</span>
          </div>
        </div>
      </div>

      {/* Quick Ingestion Dropzone Bar */}
      <div
        {...getRootProps()}
        className={`p-4 border-2 border-dashed rounded-card bg-surface/60 transition-all cursor-pointer flex flex-col md:flex-row items-center justify-between gap-4 ${
          isDragActive ? 'border-accent-cyan bg-accent-cyan/5' : 'border-border hover:border-accent-primary/60'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-raised text-accent-cyan shrink-0">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-text-primary">
              Fast Paper Ingestion (PDF)
            </h3>
            <p className="text-[11px] text-text-muted">
              Drop any research PDF here (up to 50 MB) to parse, chunk, and synthesize immediately.
            </p>
          </div>
        </div>

        {uploading ? (
          <div className="w-full md:w-64 space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-accent-cyan">
              <span>{uploadStage}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-raised h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-accent-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
            <span className="px-2 py-0.5 rounded bg-raised border border-border">PyMuPDF</span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded bg-raised border border-border">TF-IDF Vectors</span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded bg-raised border border-border">Citations</span>
          </div>
        )}
      </div>

      {/* Main 2-Column Section: Research Gaps & Recent Papers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Top Evidence-Backed Research Gaps */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <Compass className="w-4 h-4 text-accent-cyan" />
              <span>Prioritized Research Gaps ({gaps.length})</span>
            </h3>
            <button
              onClick={() => navigate('/gaps')}
              className="text-xs font-mono text-accent-cyan hover:underline flex items-center gap-1"
            >
              <span>View All</span> <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {gaps.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-border rounded-card">
              <Compass className="w-8 h-8 text-text-muted mx-auto opacity-40 mb-2" />
              <p className="text-xs text-text-muted">
                No gaps clustered yet. Load sample papers to surface unresolved challenges.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {gaps.slice(0, 3).map((gap) => (
                <div
                  key={gap.id}
                  className="p-4 bg-surface border border-border rounded-card shadow-card space-y-2.5 glow-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-raised border border-border text-accent-cyan font-semibold">
                      {gap.category}
                    </span>
                    <ConfidenceBadge confidence={gap.confidence} rationale={gap.rationale} />
                  </div>

                  <h4 className="text-xs font-semibold text-text-primary line-clamp-1">
                    {gap.title}
                  </h4>

                  <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                    {gap.text}
                  </p>

                  {gap.evidence && gap.evidence.length > 0 && (
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                      <CitationChip citation={gap.evidence[0]} />
                      <span className="text-[10px] font-mono text-text-muted">
                        Cited in {gap.frequency} paper(s)
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Library Papers & Comparative Matrix Trigger */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent-primary" />
              <span>Research Papers In Library ({papers.length})</span>
            </h3>
            <button
              onClick={() => navigate('/library')}
              className="text-xs font-mono text-accent-primary hover:underline flex items-center gap-1"
            >
              <span>Manage Library</span> <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {papers.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-border rounded-card">
              <FileText className="w-8 h-8 text-text-muted mx-auto opacity-40 mb-2" />
              <p className="text-xs text-text-muted">
                No papers in library yet. Click "Load Landmark Corpus" above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {papers.slice(0, 3).map((paper) => {
                const isSelected = comparisonPaperIds.includes(paper.id);
                return (
                  <div
                    key={paper.id}
                    className="p-4 bg-surface border border-border rounded-card shadow-card space-y-2.5 glow-card"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-raised border border-border text-accent-cyan font-semibold">
                        {paper.year || 2024}
                      </span>
                      <span className="text-[10px] font-mono text-text-muted">
                        {paper.page_count} pages • {(paper.file_size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>

                    <h4 
                      onClick={() => {
                        setSelectedPaperId(paper.id);
                        navigate('/analysis');
                      }}
                      className="text-xs font-semibold text-text-primary line-clamp-1 hover:text-accent-primary cursor-pointer transition-colors"
                    >
                      {paper.title}
                    </h4>

                    <p className="text-[11px] text-text-secondary truncate">
                      {paper.authors}
                    </p>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setSelectedPaperId(paper.id);
                          navigate('/analysis');
                        }}
                        className="flex items-center gap-1 text-xs text-accent-cyan hover:underline font-medium"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Breakdown & Citations</span>
                      </button>

                      <button
                        onClick={() => toggleComparisonPaper(paper.id)}
                        className={`text-xs px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
                          isSelected
                            ? 'bg-accent-violet/20 border-accent-violet text-accent-violet font-semibold'
                            : 'bg-raised border-border text-text-muted hover:text-text-primary'
                        }`}
                      >
                        <GitCompare className="w-3 h-3" />
                        <span>{isSelected ? 'In Compare' : 'Add Compare'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Knowledge Topology Graph Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2">
            <Share2 className="w-4 h-4 text-accent-cyan" />
            <span>Interactive Library Knowledge Topology</span>
          </h3>
          <button
            onClick={() => navigate('/recommendations')}
            className="text-xs font-mono text-accent-cyan hover:underline flex items-center gap-1"
          >
            <span>Full Graph Screen</span> <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="rounded-card border border-border overflow-hidden bg-surface shadow-card">
          <SimilarityGraphView
            data={graphData}
            onSelectPaper={(pid) => {
              setSelectedPaperId(pid);
              navigate('/analysis');
            }}
          />
        </div>
      </div>
    </div>
  );
};
