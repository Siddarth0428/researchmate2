import React from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import type { CitationItem } from '../types';
import { useAppStore } from '../store/useAppStore';

interface CitationChipProps {
  citation: CitationItem;
  paperId?: string;
}

export const CitationChip: React.FC<CitationChipProps> = ({ citation, paperId }) => {
  const setActiveCitation = useAppStore((s) => s.setActiveCitation);
  const setSelectedPaperId = useAppStore((s) => s.setSelectedPaperId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (paperId) {
      setSelectedPaperId(paperId);
    }
    setActiveCitation({
      paperId: paperId || '',
      paperTitle: citation.paper_title,
      page: citation.page,
      excerpt: citation.excerpt,
    });
  };

  return (
    <button
      onClick={handleClick}
      type="button"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 mr-1.5 rounded-control text-[11px] font-sans bg-raised/80 hover:bg-accent-primary/20 text-accent-cyan border border-border hover:border-accent-primary/50 transition-all cursor-pointer group"
      title={`Click to open PDF at page ${citation.page}: "${citation.excerpt.slice(0, 150)}..."`}
    >
      <BookOpen className="w-3 h-3 text-accent-cyan/80 group-hover:text-accent-cyan" />
      <span className="truncate max-w-[140px] text-text-secondary group-hover:text-text-primary">
        {citation.paper_title}
      </span>
      <span className="font-mono text-accent-cyan font-semibold">
        p.{citation.page}
      </span>
      {citation.score !== undefined && (
        <span className="font-mono text-text-muted text-[10px]">
          ({Math.round(citation.score * 100)}%)
        </span>
      )}
      <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};
