import React, { useState, useEffect } from 'react';
import type { Paper, GraphData, RecommendationItem } from '../types';
import { fetchGraph, fetchRecommendations } from '../api/client';
import { SimilarityGraphView } from '../components/SimilarityGraphView';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { 
  Share2, Sparkles, BookOpen, GitCompare, 
  Tag, ArrowRight, RefreshCw, Layers 
} from 'lucide-react';

interface RecommendationsScreenProps {
  papers: Paper[];
}

export const RecommendationsScreen: React.FC<RecommendationsScreenProps> = ({ papers }) => {
  const navigate = useNavigate();
  const sessionId = useAppStore((s) => s.sessionId);
  const selectedPaperId = useAppStore((s) => s.selectedPaperId);
  const setSelectedPaperId = useAppStore((s) => s.setSelectedPaperId);
  const toggleComparisonPaper = useAppStore((s) => s.toggleComparisonPaper);
  const comparisonPaperIds = useAppStore((s) => s.comparisonPaperIds);

  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active target paper for recommendations
  const activePaperId = selectedPaperId || (papers.length > 0 ? papers[0].id : null);
  const activePaper = papers.find((p) => p.id === activePaperId);

  const loadGraph = async () => {
    try {
      setLoading(true);
      const g = await fetchGraph(sessionId);
      setGraphData(g);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadRecs = async (pid: string) => {
    try {
      const recs = await fetchRecommendations(pid, sessionId);
      setRecommendations(recs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadGraph();
  }, [sessionId, papers]);

  useEffect(() => {
    if (activePaperId) {
      loadRecs(activePaperId);
    }
  }, [activePaperId, sessionId]);

  const handleNodeClick = (pid: string) => {
    setSelectedPaperId(pid);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">
            Semantic Recommendations & Similarity Graph
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Discover topological relationships, shared architectural concepts, and top semantic matches.
          </p>
        </div>

        <button
          onClick={loadGraph}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs bg-surface border border-border text-text-secondary hover:text-text-primary transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Graph</span>
        </button>
      </div>

      {/* Main Content Grid: Graph on Top/Left, Top-K Recommendations List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visual Graph View */}
        <div className="lg:col-span-7 flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Interactive Knowledge Topology ({graphData.nodes.length} Nodes)</span>
            </h3>
            <span className="text-[11px] font-mono text-text-muted">
              Click any node to focus
            </span>
          </div>

          <SimilarityGraphView
            data={graphData}
            onSelectPaper={handleNodeClick}
            selectedPaperId={activePaperId}
          />
        </div>

        {/* Top-K Semantic Recommendations */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent-primary" />
              <span>Top Related Papers</span>
            </h3>
            {activePaper && (
              <span className="text-xs font-mono text-accent-cyan truncate max-w-[180px]" title={activePaper.title}>
                For: {activePaper.title}
              </span>
            )}
          </div>

          {recommendations.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-border rounded-card">
              <Layers className="w-8 h-8 text-text-muted mx-auto opacity-40 mb-2" />
              <p className="text-xs text-text-muted">
                {papers.length < 2
                  ? 'Add at least 2 papers to compute similarity recommendations.'
                  : 'No high-confidence matches found for this paper.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[540px] pr-1">
              {recommendations.map((rec) => {
                const isSelectedForCompare = comparisonPaperIds.includes(rec.paper_id);
                return (
                  <div
                    key={rec.paper_id}
                    className="p-4 bg-surface border border-border rounded-card shadow-card space-y-3 hover:border-accent-primary/50 transition-all"
                  >
                    {/* Header: Score & Year */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-accent-primary/10 text-accent-cyan border border-accent-primary/30">
                          {Math.round(rec.similarity_score * 100)}% Match
                        </span>
                        <span className="font-mono text-xs text-text-muted">
                          {rec.year}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedPaperId(rec.paper_id);
                            navigate('/analysis');
                          }}
                          className="p-1 rounded text-text-secondary hover:text-accent-primary hover:bg-raised transition-colors"
                          title="Open Analysis"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleComparisonPaper(rec.paper_id)}
                          className={`p-1 rounded transition-colors ${
                            isSelectedForCompare 
                              ? 'text-accent-violet bg-accent-violet/10' 
                              : 'text-text-secondary hover:text-accent-violet hover:bg-raised'
                          }`}
                          title={isSelectedForCompare ? "Remove from comparison" : "Add to comparison"}
                        >
                          <GitCompare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Paper Title */}
                    <h4 
                      onClick={() => setSelectedPaperId(rec.paper_id)}
                      className="text-xs font-semibold text-text-primary hover:text-accent-primary cursor-pointer transition-colors"
                    >
                      {rec.title}
                    </h4>

                    {/* Shared Concepts Chips */}
                    {rec.shared_concepts && rec.shared_concepts.length > 0 && (
                      <div className="pt-2 border-t border-border/50">
                        <span className="text-[10px] font-mono text-text-muted uppercase block mb-1">
                          Shared Conceptual Drivers:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {rec.shared_concepts.map((concept, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-raised border border-border text-text-secondary"
                            >
                              <Tag className="w-2.5 h-2.5 text-accent-cyan" />
                              <span>{concept}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
