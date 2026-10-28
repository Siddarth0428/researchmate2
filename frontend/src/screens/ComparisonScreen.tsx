import React, { useState, useEffect } from 'react';
import type { Paper, ComparisonMatrix } from '../types';
import { comparePapers } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { CitationChip } from '../components/CitationChip';
import { 
  GitCompare, Download, Plus, X, Layers, 
  Check, FileSpreadsheet, Sparkles 
} from 'lucide-react';

interface ComparisonScreenProps {
  papers: Paper[];
}

const PALETTE_COLUMNS = [
  'border-t-[#5B8CFF]',
  'border-t-[#22D3EE]',
  'border-t-[#8B7BFF]',
  'border-t-[#34D399]',
  'border-t-[#FBBF24]',
  'border-t-[#F472B6]',
];

export const ComparisonScreen: React.FC<ComparisonScreenProps> = ({ papers }) => {
  const sessionId = useAppStore((s) => s.sessionId);
  const comparisonPaperIds = useAppStore((s) => s.comparisonPaperIds);
  const toggleComparisonPaper = useAppStore((s) => s.toggleComparisonPaper);
  const clearComparisonPapers = useAppStore((s) => s.clearComparisonPapers);
  const addToast = useAppStore((s) => s.addToast);

  const [matrixData, setMatrixData] = useState<ComparisonMatrix | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // If user hasn't selected papers yet, auto-select first 2 or 3
  useEffect(() => {
    if (comparisonPaperIds.length < 2 && papers.length >= 2) {
      papers.slice(0, 3).forEach((p) => {
        if (!comparisonPaperIds.includes(p.id)) {
          toggleComparisonPaper(p.id);
        }
      });
    }
  }, [papers]);

  // Fetch comparison matrix whenever selected papers change
  useEffect(() => {
    if (comparisonPaperIds.length >= 2) {
      runComparison(comparisonPaperIds);
    } else {
      setMatrixData(null);
    }
  }, [comparisonPaperIds, sessionId]);

  const runComparison = async (ids: string[]) => {
    try {
      setLoading(true);
      const res = await comparePapers(sessionId, ids);
      setMatrixData(res);
    } catch (e: any) {
      addToast({ type: 'error', title: 'Comparison Error', message: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!comparisonPaperIds.length) return;
    const url = `/api/compare/export-csv?session_id=${sessionId}&pids=${comparisonPaperIds.join(',')}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-accent-violet" />
            <span>Multi-Paper Comparison Workspace</span>
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Side-by-side methodological matrix across 2 to 6 research papers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {matrixData && (
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold bg-accent-primary hover:bg-accent-primary/80 text-white transition-all shadow-sm"
              title="Export comparison matrix as CSV file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}

          {comparisonPaperIds.length > 0 && (
            <button
              onClick={clearComparisonPapers}
              className="px-3 py-1.5 rounded-control text-xs text-text-muted hover:text-text-primary bg-surface border border-border transition-colors"
            >
              Clear Selection
            </button>
          )}
        </div>
      </div>

      {/* Quick Select Paper Chips Bar */}
      <div className="p-3 bg-surface border border-border rounded-card space-y-2">
        <span className="text-[11px] font-mono uppercase text-text-muted block">
          Toggle Papers to Compare (Select 2 to 6):
        </span>
        <div className="flex flex-wrap gap-2">
          {papers.map((p) => {
            const isSelected = comparisonPaperIds.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggleComparisonPaper(p.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-control text-xs font-medium border transition-all ${
                  isSelected
                    ? 'bg-accent-violet/20 border-accent-violet text-text-primary font-semibold'
                    : 'bg-raised border-border text-text-secondary hover:text-text-primary hover:border-accent-violet/40'
                }`}
              >
                {isSelected ? <Check className="w-3 h-3 text-accent-violet" /> : <Plus className="w-3 h-3 opacity-60" />}
                <span className="truncate max-w-[180px]">{p.title}</span>
                <span className="font-mono text-[10px] text-text-muted">({p.year})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparison Matrix Table */}
      {loading ? (
        <div className="p-12 text-center bg-surface border border-border rounded-card animate-pulse">
          <Layers className="w-8 h-8 text-accent-violet mx-auto animate-bounce mb-3" />
          <p className="text-xs text-text-secondary">Synthesizing multi-paper comparative matrix...</p>
        </div>
      ) : !matrixData || comparisonPaperIds.length < 2 ? (
        <div className="p-12 text-center bg-surface border border-border rounded-card space-y-3">
          <FileSpreadsheet className="w-10 h-10 text-text-muted mx-auto opacity-40" />
          <h3 className="text-sm font-semibold text-text-primary">
            Select at least 2 papers to compare
          </h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            Click the chips above to select 2 or more research papers and construct the comparative matrix.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-card bg-surface shadow-card">
          <table className="w-full text-left border-collapse min-w-[760px]">
            {/* Headers: Each Paper Column */}
            <thead>
              <tr className="border-b border-border bg-raised/80">
                <th className="p-3.5 text-xs font-mono uppercase tracking-wider text-text-muted w-44 sticky left-0 bg-raised/90 backdrop-blur z-10 border-r border-border">
                  Dimension
                </th>
                {matrixData.papers.map((p, idx) => {
                  const borderClass = PALETTE_COLUMNS[idx % PALETTE_COLUMNS.length];
                  return (
                    <th
                      key={p.id}
                      className={`p-3.5 text-xs font-semibold text-text-primary border-t-2 ${borderClass} border-r border-border/40 min-w-[240px]`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] text-accent-cyan">
                          {p.year}
                        </span>
                        <button
                          onClick={() => toggleComparisonPaper(p.id)}
                          className="text-text-muted hover:text-danger p-0.5 rounded"
                          title="Remove from comparison"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h4 className="text-xs font-semibold text-text-primary mt-1 line-clamp-2" title={p.title}>
                        {p.title}
                      </h4>
                      <p className="text-[10px] text-text-secondary mt-0.5 truncate">
                        {p.authors}
                      </p>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Matrix Body Rows */}
            <tbody className="divide-y divide-border/60">
              {matrixData.matrix.map((row) => (
                <tr key={row.key} className="hover:bg-raised/30 transition-colors">
                  {/* Criterion Title */}
                  <td className="p-3.5 text-xs font-semibold text-text-primary bg-surface/90 sticky left-0 border-r border-border align-top">
                    {row.criterion}
                  </td>

                  {/* Values per Paper */}
                  {matrixData.papers.map((p) => {
                    const cell = row.values[p.id] || { text: 'N/A', evidence: [] };
                    return (
                      <td key={p.id} className="p-3.5 text-xs text-text-secondary align-top border-r border-border/40 space-y-2">
                        <p className="leading-relaxed">
                          {cell.text}
                        </p>

                        {/* Citation Chips */}
                        {cell.evidence && cell.evidence.length > 0 && (
                          <div className="pt-1.5 flex flex-wrap gap-1">
                            {cell.evidence.map((cit, cIdx) => (
                              <CitationChip
                                key={cIdx}
                                citation={cit}
                                paperId={p.id}
                              />
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
