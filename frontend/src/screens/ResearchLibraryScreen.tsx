import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, FileText, CheckCircle2, AlertCircle, 
  Trash2, BookOpen, GitCompare, RotateCw, ExternalLink, Sparkles, X
} from 'lucide-react';
import type { Paper, JobProgress } from '../types';
import { uploadPaper, fetchJobProgress, deletePaper, reanalyzePaper } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { PDFViewerPanel } from '../components/PDFViewerPanel';

interface ResearchLibraryScreenProps {
  papers: Paper[];
  loading: boolean;
  onRefresh: () => void;
}

interface UploadTask {
  file: File;
  paperId?: string;
  jobId?: string;
  stage: string;
  progress: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

export const ResearchLibraryScreen: React.FC<ResearchLibraryScreenProps> = ({ 
  papers, 
  loading, 
  onRefresh 
}) => {
  const navigate = useNavigate();
  const sessionId = useAppStore((s) => s.sessionId);
  const addToast = useAppStore((s) => s.addToast);
  const setSelectedPaperId = useAppStore((s) => s.setSelectedPaperId);
  const toggleComparisonPaper = useAppStore((s) => s.toggleComparisonPaper);
  const comparisonPaperIds = useAppStore((s) => s.comparisonPaperIds);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);

  const [activeTasks, setActiveTasks] = useState<UploadTask[]>([]);
  const [viewingPdfPaper, setViewingPdfPaper] = useState<Paper | null>(null);

  // Real pipeline polling
  const startPolling = (jobId: string, taskIndex: number) => {
    const interval = setInterval(async () => {
      try {
        const progressData: JobProgress = await fetchJobProgress(jobId);
        setActiveTasks((prev) => {
          const updated = [...prev];
          if (updated[taskIndex]) {
            updated[taskIndex].stage = progressData.stage;
            updated[taskIndex].progress = progressData.progress;
            updated[taskIndex].status = progressData.status;
            if (progressData.error) updated[taskIndex].error = progressData.error;
          }
          return updated;
        });

        if (progressData.status === 'completed' || progressData.status === 'failed') {
          clearInterval(interval);
          onRefresh();
          if (progressData.status === 'completed') {
            addToast({
              type: 'success',
              title: 'Ingestion Finished',
              message: `Paper successfully parsed, chunked, and analyzed.`,
            });
            // Auto dismiss completed task after 4 seconds
            setTimeout(() => {
              setActiveTasks((prev) => prev.filter((_, i) => i !== taskIndex));
            }, 4000);
          } else {
            addToast({
              type: 'error',
              title: 'Pipeline Error',
              message: progressData.error || 'Failed to process PDF',
            });
          }
        }
      } catch (err) {
        clearInterval(interval);
      }
    }, 800);
  };

  const onDrop = async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        addToast({ type: 'warning', title: 'Invalid File', message: 'Only PDF documents are supported.' });
        continue;
      }

      const newTask: UploadTask = {
        file,
        stage: 'Uploading...',
        progress: 10,
        status: 'running',
      };

      const taskIndex = activeTasks.length;
      setActiveTasks((prev) => [...prev, newTask]);

      try {
        const res = await uploadPaper(file, sessionId);
        if (res.status === 'duplicate') {
          setActiveTasks((prev) => {
            const updated = [...prev];
            if (updated[taskIndex]) {
              updated[taskIndex].stage = 'Duplicate Detected';
              updated[taskIndex].progress = 100;
              updated[taskIndex].status = 'completed';
            }
            return updated;
          });
          addToast({
            type: 'warning',
            title: 'Duplicate Paper',
            message: `"${file.name}" already exists in this research session.`,
          });
        } else if (res.job_id) {
          setActiveTasks((prev) => {
            const updated = [...prev];
            if (updated[taskIndex]) {
              updated[taskIndex].jobId = res.job_id;
              updated[taskIndex].paperId = res.paper_id;
              updated[taskIndex].stage = 'Parsing PDF Structure';
              updated[taskIndex].progress = 25;
            }
            return updated;
          });
          startPolling(res.job_id, taskIndex);
        }
      } catch (err: any) {
        setActiveTasks((prev) => {
          const updated = [...prev];
          if (updated[taskIndex]) {
            updated[taskIndex].stage = 'Upload Failed';
            updated[taskIndex].status = 'failed';
            updated[taskIndex].error = err.message || 'Upload error';
          }
          return updated;
        });
        addToast({
          type: 'error',
          title: 'Upload Failed',
          message: err.message || 'Could not upload paper.',
        });
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 50 * 1024 * 1024,
  });

  const handleDelete = async (paperId: string, title: string) => {
    if (confirm(`Remove "${title}" from research library?`)) {
      try {
        await deletePaper(paperId);
        addToast({ type: 'info', title: 'Paper Removed', message: `Deleted ${title}` });
        onRefresh();
      } catch (e: any) {
        addToast({ type: 'error', title: 'Delete Failed', message: e.message });
      }
    }
  };

  const handleReanalyze = async (paperId: string) => {
    try {
      addToast({ type: 'info', title: 'Analyzing Paper', message: 'Re-running evidence extraction...' });
      await reanalyzePaper(paperId);
      addToast({ type: 'success', title: 'Analysis Complete', message: 'Paper updated.' });
      onRefresh();
    } catch (e: any) {
      addToast({ type: 'error', title: 'Analysis Failed', message: e.message });
    }
  };

  const filteredPapers = papers.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.authors.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(p.year).includes(searchQuery)
  );

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">
            Research Library
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Ingest papers, extract structured methodologies, and track citations.
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search papers by title, author, year..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-72 px-3 py-1.5 text-xs bg-surface border border-border rounded-control text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-cyan"
          />
        </div>
      </div>

      {/* Stepper Hero Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-card p-6 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-accent-cyan bg-accent-cyan/5 scale-[0.99]'
            : 'border-border hover:border-accent-primary/60 bg-surface/50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-raised flex items-center justify-center text-accent-cyan mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">
            Upload Research Papers (PDF)
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Drag & drop PDF files up to 50 MB, or click to browse.
          </p>
          <div className="flex items-center gap-2 mt-3 text-[11px] font-mono text-text-secondary bg-raised px-2.5 py-1 rounded border border-border">
            <span>Parse</span> → <span>Chunk</span> → <span>Embed</span> → <span>Analyze</span>
          </div>
        </div>
      </div>

      {/* Real Pipeline Active Steppers */}
      {activeTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {activeTasks.every((t) => t.status === 'completed')
                ? 'Processing Finished (Ready in Library)'
                : `Processing Pipeline (${activeTasks.length})`}
            </h4>
            <button
              onClick={() => setActiveTasks([])}
              className="text-[11px] text-text-muted hover:text-text-primary transition-colors"
            >
              Clear Status
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeTasks.map((task, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-surface border border-border rounded-card shadow-card space-y-2 animate-fadeIn relative group"
              >
                <div className="flex items-center justify-between text-xs pr-6">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-accent-cyan shrink-0" />
                    <span className="font-semibold text-text-primary truncate" title={task.file.name}>
                      {task.file.name}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-accent-cyan font-semibold">
                    {task.progress}%
                  </span>
                </div>

                {/* Dismiss button */}
                <button
                  onClick={() => setActiveTasks((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute top-3 right-3 text-text-muted hover:text-text-primary p-0.5 rounded transition-colors"
                  title="Dismiss from pipeline list"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Progress bar */}
                <div className="w-full bg-raised h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      task.status === 'failed' ? 'bg-danger' :
                      task.status === 'completed' ? 'bg-success' : 'bg-accent-primary'
                    }`}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-secondary font-mono">
                    {task.stage}
                  </span>
                  {task.status === 'completed' && (
                    <span className="flex items-center gap-1 text-success font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready in Library
                    </span>
                  )}
                  {task.status === 'failed' && (
                    <span className="flex items-center gap-1 text-danger font-medium" title={task.error}>
                      <AlertCircle className="w-3.5 h-3.5" /> Failed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Papers Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Ingested Papers ({filteredPapers.length})
          </h4>
          {comparisonPaperIds.length > 0 && (
            <span className="text-xs font-mono text-accent-violet">
              {comparisonPaperIds.length} paper(s) marked for comparison
            </span>
          )}
        </div>

        {loading ? (
          /* Loading Skeletons */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="p-4 bg-surface border border-border rounded-card animate-pulse space-y-3">
                <div className="h-4 bg-raised rounded w-3/4" />
                <div className="h-3 bg-raised rounded w-1/2" />
                <div className="h-16 bg-raised rounded w-full" />
                <div className="h-6 bg-raised rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : filteredPapers.length === 0 ? (
          /* Empty State */
          <div className="p-12 text-center bg-surface border border-border rounded-card space-y-3">
            <FileText className="w-10 h-10 text-text-muted mx-auto opacity-50" />
            <h3 className="text-sm font-semibold text-text-primary">
              No research papers found
            </h3>
            <p className="text-xs text-text-muted max-w-sm mx-auto">
              Upload your first PDF paper above or click "Load Sample Papers" in the top bar to get started immediately.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPapers.map((paper) => {
              const isSelectedForCompare = comparisonPaperIds.includes(paper.id);
              return (
                <div
                  key={paper.id}
                  className={`flex flex-col justify-between p-4 bg-surface border rounded-card shadow-card hover:border-accent-primary/50 transition-all ${
                    isSelectedForCompare ? 'border-accent-violet ring-1 ring-accent-violet/50' : 'border-border'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-raised border border-border text-accent-cyan font-semibold">
                        {paper.year || 2024}
                      </span>
                      <span className="text-[10px] font-mono text-text-muted">
                        {paper.page_count} pages • {(paper.file_size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>

                    {/* Title */}
                    <h3 
                      onClick={() => {
                        setSelectedPaperId(paper.id);
                        navigate('/analysis');
                      }}
                      className="text-sm font-semibold text-text-primary line-clamp-2 hover:text-accent-primary cursor-pointer transition-colors"
                      title={paper.title}
                    >
                      {paper.title}
                    </h3>

                    {/* Authors */}
                    <p className="text-xs text-text-secondary line-clamp-1" title={paper.authors}>
                      {paper.authors || 'Unknown Authors'}
                    </p>

                    {/* Abstract preview */}
                    <p className="text-xs text-text-muted line-clamp-3 leading-relaxed">
                      {paper.abstract || 'No abstract text extracted.'}
                    </p>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedPaperId(paper.id);
                          navigate('/analysis');
                        }}
                        className="px-2.5 py-1 rounded-control text-xs font-medium bg-raised hover:bg-accent-primary/20 text-text-primary hover:text-accent-cyan border border-border transition-colors flex items-center gap-1"
                        title="View Full Breakdown"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Breakdown</span>
                      </button>

                      <button
                        onClick={() => setViewingPdfPaper(paper)}
                        className="p-1.5 rounded-control text-xs text-text-secondary hover:text-accent-cyan hover:bg-raised transition-colors"
                        title="Open PDF Reader"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => toggleComparisonPaper(paper.id)}
                        className={`p-1.5 rounded-control text-xs transition-colors ${
                          isSelectedForCompare 
                            ? 'bg-accent-violet text-white' 
                            : 'text-text-secondary hover:text-accent-violet hover:bg-raised'
                        }`}
                        title={isSelectedForCompare ? "Remove from comparison" : "Add to multi-paper comparison matrix"}
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleReanalyze(paper.id)}
                        className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-raised transition-colors"
                        title="Re-run Analysis"
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(paper.id, paper.title)}
                        className="p-1 rounded text-text-muted hover:text-danger hover:bg-raised transition-colors"
                        title="Delete Paper"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PDF Viewer Sheet Modal */}
      {viewingPdfPaper && (
        <div className="fixed inset-4 z-50 animate-fadeIn">
          <PDFViewerPanel
            paperId={viewingPdfPaper.id}
            paperTitle={viewingPdfPaper.title}
            onClose={() => setViewingPdfPaper(null)}
          />
        </div>
      )}
    </div>
  );
};
