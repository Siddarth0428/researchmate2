import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, FileText, Quote, Maximize2, Minimize2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface PDFViewerPanelProps {
  paperId: string;
  paperTitle: string;
  onClose?: () => void;
}

export const PDFViewerPanel: React.FC<PDFViewerPanelProps> = ({ 
  paperId, 
  paperTitle, 
  onClose 
}) => {
  const activeCitation = useAppStore((s) => s.activeCitation);
  const setActiveCitation = useAppStore((s) => s.setActiveCitation);
  
  const [currentPage, setCurrentPage] = useState<number>(activeCitation?.page || 1);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Sync with citation target
  React.useEffect(() => {
    if (activeCitation?.page) {
      setCurrentPage(activeCitation.page);
    }
  }, [activeCitation]);

  const pdfUrl = `/api/papers/${paperId}/file#page=${currentPage}`;

  return (
    <div className={`flex flex-col h-full bg-surface border border-border rounded-card overflow-hidden shadow-card transition-all ${
      isExpanded ? 'fixed inset-4 z-50 bg-base shadow-dialog' : 'relative'
    }`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-raised/70 border-b border-border">
        <div className="flex items-center gap-2 truncate">
          <FileText className="w-4 h-4 text-accent-cyan shrink-0" />
          <span className="text-xs font-semibold text-text-primary truncate max-w-[280px]" title={paperTitle}>
            {paperTitle}
          </span>
          <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-base text-accent-cyan border border-border">
            Page {currentPage}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1 rounded hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-1 rounded hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-border mx-1" />
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
            title={isExpanded ? "Collapse View" : "Expand Fullscreen"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          {onClose && (
            <button
              onClick={() => {
                setActiveCitation(null);
                onClose();
              }}
              className="p-1 rounded hover:bg-surface text-text-secondary hover:text-danger transition-colors ml-1"
              title="Close PDF Reader"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Active Citation Grounding Banner */}
      {activeCitation && activeCitation.excerpt && (
        <div className="px-4 py-2 bg-accent-primary/10 border-b border-accent-primary/30 flex items-start gap-2.5 animate-fadeIn">
          <Quote className="w-4 h-4 text-accent-cyan shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-accent-cyan mr-1.5 font-mono">
              [Cited on Page {activeCitation.page}]:
            </span>
            <span className="text-text-primary italic">
              "{activeCitation.excerpt}"
            </span>
          </div>
          <button 
            onClick={() => setActiveCitation(null)}
            className="ml-auto text-text-muted hover:text-text-primary p-0.5 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* PDF Viewport */}
      <div className="flex-1 bg-base relative overflow-hidden flex items-center justify-center min-h-[420px]">
        <iframe
          key={`${paperId}-${currentPage}`}
          src={pdfUrl}
          title="PDF Document"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
};
