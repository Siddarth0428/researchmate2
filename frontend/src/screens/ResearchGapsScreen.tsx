import React, { useState, useEffect } from 'react';
import type { ResearchGap, Paper } from '../types';
import { fetchGaps } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { ConfidenceBadge } from '../components/ConfidenceBadge';
import { CitationChip } from '../components/CitationChip';
import { 
  Compass, Filter, RefreshCw, Quote, 
  Layers, CheckCircle2, AlertTriangle, AlertCircle 
} from 'lucide-react';

interface ResearchGapsScreenProps {
  papers: Paper[];
}

export const ResearchGapsScreen: React.FC<ResearchGapsScreenProps> = ({ papers }) => {
  const sessionId = useAppStore((s) => s.sessionId);
  const [gaps, setGaps] = useState<ResearchGap[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedConfidence, setSelectedConfidence] = useState<string>('All');

  const loadGapsData = async () => {
    try {
      setLoading(true);
      const data = await fetchGaps(sessionId);
      setGaps(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGapsData();
  }, [sessionId, papers]);

  // Extract distinct categories
  const categories = ['All', ...Array.from(new Set(gaps.map((g) => g.category)))];

  const filteredGaps = gaps.filter((g) => {
    const matchCat = selectedCategory === 'All' || g.category === selectedCategory;
    const matchConf = selectedConfidence === 'All' || g.confidence === selectedConfidence;
    return matchCat && matchConf;
  });

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Compass className="w-5 h-5 text-accent-cyan" />
            <span>Evidence-Backed Research Gaps</span>
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Synthesized barriers, constraints, and open directions clustered across your paper collection.
          </p>
        </div>

        {/* Filters and Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-control text-text-primary focus:outline-none focus:border-accent-cyan cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>

          {/* Confidence Filter */}
          <select
            value={selectedConfidence}
            onChange={(e) => setSelectedConfidence(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-control text-text-primary focus:outline-none focus:border-accent-cyan cursor-pointer"
          >
            <option value="All">All Confidences</option>
            <option value="High">High Confidence</option>
            <option value="Medium">Medium Confidence</option>
            <option value="Low">Low Confidence</option>
          </select>

          <button
            onClick={loadGapsData}
            className="p-1.5 rounded-control text-text-secondary hover:text-text-primary bg-surface border border-border transition-colors"
            title="Recalculate Gaps"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Gaps List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-5 bg-surface border border-border rounded-card animate-pulse space-y-3">
              <div className="h-5 bg-raised rounded w-1/3" />
              <div className="h-4 bg-raised rounded w-full" />
              <div className="h-4 bg-raised rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredGaps.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-border rounded-card space-y-3">
          <Compass className="w-10 h-10 text-text-muted mx-auto opacity-40" />
          <h3 className="text-sm font-semibold text-text-primary">
            No research gaps discovered
          </h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            {papers.length === 0
              ? 'Upload research papers to aggregate limitations and discover unresolved challenges.'
              : 'No matching gaps found with the current filter settings.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGaps.map((gap) => (
            <div
              key={gap.id}
              className="p-5 bg-surface border border-border rounded-card shadow-card space-y-3.5 hover:border-accent-primary/40 transition-all"
            >
              {/* Header: Title, Category Pill, Confidence Badge */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-raised border border-border text-accent-cyan font-semibold">
                      {gap.category}
                    </span>
                    <span className="text-[11px] font-mono text-text-muted">
                      Reported in {gap.frequency} paper(s)
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    {gap.title}
                  </h3>
                </div>

                <ConfidenceBadge
                  confidence={gap.confidence}
                  rationale={gap.rationale}
                />
              </div>

              {/* Synthesized Statement */}
              <p className="text-xs text-text-secondary leading-relaxed font-sans">
                {gap.text}
              </p>

              {/* Evidence Quotes / Grounding Citations */}
              {gap.evidence && gap.evidence.length > 0 && (
                <div className="pt-3 border-t border-border/60 space-y-2">
                  <div className="text-[10px] font-mono uppercase text-text-muted">
                    Supporting Literature Citations ({gap.evidence.length}):
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {gap.evidence.map((ev, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded bg-raised/60 border border-border/80 flex flex-col justify-between space-y-1.5"
                      >
                        <p className="text-[11px] text-text-primary italic font-serif leading-relaxed line-clamp-3">
                          "{ev.excerpt}"
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <CitationChip citation={ev} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
