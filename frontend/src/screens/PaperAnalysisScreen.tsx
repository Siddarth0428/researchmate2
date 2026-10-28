import React, { useState } from 'react';
import type { Paper, CitationItem } from '../types';
import { useAppStore } from '../store/useAppStore';
import { SourceBadge } from '../components/SourceBadge';
import { CitationChip } from '../components/CitationChip';
import { PDFViewerPanel } from '../components/PDFViewerPanel';
import { reanalyzePaper } from '../api/client';
import { 
  FileText, RotateCw, ExternalLink, ChevronDown, 
  Lightbulb, ShieldAlert, Cpu, BarChart3, Database, Target 
} from 'lucide-react';

interface PaperAnalysisScreenProps {
  papers: Paper[];
  onRefresh: () => void;
}

const SECTION_ICONS: Record<string, any> = {
  summary: FileText,
  problem: Target,
  method: Cpu,
  dataset: Database,
  metrics: BarChart3,
  results: Lightbulb,
  contributions: Lightbulb,
  limitations: ShieldAlert,
  future_work: Lightbulb,
};

const SECTION_TITLES: Record<string, string> = {
  summary: 'Executive Summary',
  problem: 'Problem Formulation & Bottlenecks',
  method: 'Methodology & Technical Architecture',
  dataset: 'Datasets & Benchmarks',
  metrics: 'Evaluation Metrics',
  results: 'Key Empirical Results',
  contributions: 'Primary Novelty & Contributions',
  limitations: 'Identified Limitations & Assumptions',
  future_work: 'Future Research Directions',
};

export const PaperAnalysisScreen: React.FC<PaperAnalysisScreenProps> = ({ 
  papers, 
  onRefresh 
}) => {
  const selectedPaperId = useAppStore((s) => s.selectedPaperId);
  const setSelectedPaperId = useAppStore((s) => s.setSelectedPaperId);
  const addToast = useAppStore((s) => s.addToast);

  const [activeTab, setActiveTab] = useState<string>('all');
  const [isReanalyzing, setIsReanalyzing] = useState<boolean>(false);

  // Default to first paper if none selected
  const currentPaper = papers.find((p) => p.id === selectedPaperId) || papers[0];

  const handleReanalyze = async () => {
    if (!currentPaper) return;
    try {
      setIsReanalyzing(true);
      addToast({ type: 'info', title: 'Re-analyzing', message: 'Synthesizing evidence-based extraction...' });
      await reanalyzePaper(currentPaper.id);
      addToast({ type: 'success', title: 'Analysis Updated', message: 'Paper breakdown updated.' });
      onRefresh();
    } catch (e: any) {
      addToast({ type: 'error', title: 'Analysis Error', message: e.message });
    } finally {
      setIsReanalyzing(false);
    }
  };

  if (!currentPaper || papers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <FileText className="w-12 h-12 text-text-muted opacity-40 mb-3" />
        <h3 className="text-sm font-semibold text-text-primary">
          No paper selected for analysis
        </h3>
        <p className="text-xs text-text-muted mt-1 max-w-sm">
          Please upload a research paper in the Library or click "Load Sample Papers" to inspect structured breakdowns.
        </p>
      </div>
    );
  }

  const analysis = currentPaper.analysis;
  const evidenceMap = analysis?.evidence || {};

  const analysisFields = [
    'summary', 'problem', 'method', 'dataset', 
    'metrics', 'results', 'contributions', 'limitations', 'future_work'
  ];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Top Paper Header Bar */}
      <div className="px-6 py-3 bg-surface border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {/* Paper Selector Dropdown */}
          <div className="relative">
            <select
              value={currentPaper.id}
              onChange={(e) => setSelectedPaperId(e.target.value)}
              className="appearance-none bg-raised border border-border text-text-primary text-xs font-semibold py-1.5 pl-3 pr-8 rounded-control focus:outline-none focus:border-accent-cyan cursor-pointer max-w-[340px] truncate"
            >
              {papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.year} • {p.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {analysis && (
            <SourceBadge label={analysis.source_label} />
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReanalyze}
            disabled={isReanalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-medium bg-raised hover:bg-accent-primary/20 text-text-primary border border-border transition-colors disabled:opacity-50"
            title="Re-run pipeline analysis on this paper"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isReanalyzing ? 'animate-spin text-accent-cyan' : ''}`} />
            <span>Re-analyze</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Breakdown Left, PDF Viewer Right */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 gap-4">
        {/* Left Column: Structured Synthesis Cards */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5">
          {/* Paper metadata overview */}
          <div className="p-4 bg-surface border border-border rounded-card shadow-card space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-accent-cyan">
              <span>{currentPaper.year}</span>
              <span>•</span>
              <span>{currentPaper.page_count} pages</span>
              <span>•</span>
              <span className="text-text-muted">{currentPaper.filename}</span>
            </div>
            <h2 className="text-base font-bold text-text-primary">
              {currentPaper.title}
            </h2>
            <p className="text-xs text-text-secondary">
              {currentPaper.authors || 'Unknown Authors'}
            </p>
          </div>

          {/* Analysis Cards */}
          {analysis ? (
            analysisFields.map((fieldKey) => {
              const textVal = (analysis as any)[fieldKey] || 'No evidence found in text';
              const fieldEvidence: CitationItem[] = evidenceMap[fieldKey] || [];
              const Icon = SECTION_ICONS[fieldKey] || FileText;

              return (
                <div
                  key={fieldKey}
                  className="p-4 bg-surface border border-border rounded-card shadow-card space-y-2.5 transition-all hover:border-accent-primary/40"
                >
                  {/* Card Title & Source */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-raised text-accent-cyan">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                        {SECTION_TITLES[fieldKey]}
                      </h4>
                    </div>

                    <span className="text-[10px] font-mono text-text-muted">
                      {fieldEvidence.length} citation(s)
                    </span>
                  </div>

                  {/* Body Content */}
                  <p className="text-xs text-text-secondary leading-relaxed font-sans">
                    {textVal}
                  </p>

                  {/* Citation Chips Grounding */}
                  {fieldEvidence.length > 0 ? (
                    <div className="pt-2 border-t border-border/60">
                      <div className="text-[10px] font-mono uppercase text-text-muted mb-1">
                        Supporting Evidence:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {fieldEvidence.map((cit, idx) => (
                          <CitationChip
                            key={idx}
                            citation={cit}
                            paperId={currentPaper.id}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1 text-[11px] text-text-muted italic">
                      No explicit citation excerpt mapped.
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center bg-surface border border-border rounded-card">
              <p className="text-xs text-text-muted">Analysis pending or not yet extracted.</p>
            </div>
          )}
        </div>

        {/* Right Column: PDF Viewer with Page Jump & Highlight Quote */}
        <div className="w-full lg:w-[48%] h-full flex flex-col">
          <PDFViewerPanel
            paperId={currentPaper.id}
            paperTitle={currentPaper.title}
          />
        </div>
      </div>
    </div>
  );
};
