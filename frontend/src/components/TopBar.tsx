import React from 'react';
import type { HealthStatus } from '../types';
import { useAppStore } from '../store/useAppStore';
import { loadSamplePapers } from '../api/client';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, CheckCircle2, AlertCircle, Database, 
  Search, Sparkles, GitCompare, RefreshCw 
} from 'lucide-react';

interface TopBarProps {
  health: HealthStatus | null;
  onRefreshHealth: () => void;
  onPapersUpdated?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ 
  health, 
  onRefreshHealth,
  onPapersUpdated 
}) => {
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const comparisonCount = useAppStore((s) => s.comparisonPaperIds.length);
  const sessionId = useAppStore((s) => s.sessionId);
  const addToast = useAppStore((s) => s.addToast);
  const navigate = useNavigate();

  const handleLoadSamples = async () => {
    try {
      addToast({ type: 'info', title: 'Loading Papers', message: 'Ingesting landmark research papers...' });
      const res = await loadSamplePapers(sessionId);
      addToast({ type: 'success', title: 'Papers Ingested', message: res.message });
      if (onPapersUpdated) onPapersUpdated();
      onRefreshHealth();
    } catch (e: any) {
      addToast({ type: 'error', title: 'Error', message: e.message || 'Failed to load sample papers' });
    }
  };

  return (
    <header className="h-14 bg-surface border-b border-border px-6 flex items-center justify-between z-10 select-none">
      {/* Left: Health and Model Status Pill */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-raised border border-border text-xs">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              health?.api_status === 'ok' ? 'bg-success' : 'bg-danger'
            }`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              health?.api_status === 'ok' ? 'bg-success' : 'bg-danger'
            }`} />
          </span>
          
          <span className="font-mono text-text-secondary text-[11px]">
            API: <span className="text-text-primary font-semibold">Online</span>
          </span>
          <span className="text-border">|</span>
          <span className="font-mono text-text-secondary text-[11px] truncate max-w-[210px]" title={health?.active_model_name}>
            Engine: <span className="text-accent-cyan font-semibold">{health?.active_model_name || 'Extractive'}</span>
          </span>
          <span className="text-border">|</span>
          <span className="font-mono text-text-secondary text-[11px]">
            DB: <span className="text-success font-semibold">SQLite</span>
          </span>

          <button 
            onClick={onRefreshHealth}
            className="p-0.5 ml-1 text-text-muted hover:text-text-primary transition-colors"
            title="Refresh System Health"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Right: Quick Actions & Command Palette Trigger */}
      <div className="flex items-center gap-2.5">
        {comparisonCount >= 2 && (
          <button
            onClick={() => navigate('/compare')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-semibold bg-accent-violet/20 hover:bg-accent-violet/30 text-accent-violet border border-accent-violet/40 transition-all animate-fadeIn"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Compare ({comparisonCount})</span>
          </button>
        )}

        <button
          onClick={handleLoadSamples}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-control text-xs font-medium bg-raised hover:bg-accent-primary/10 text-text-primary hover:text-accent-primary border border-border hover:border-accent-primary/40 transition-all"
          title="Load 3 landmark research papers with full citation evidence"
        >
          <Database className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="hidden sm:inline">Load Sample Papers</span>
        </button>

        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-control bg-base hover:bg-raised text-text-muted hover:text-text-primary border border-border text-xs transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Command Palette</span>
          <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-raised border border-border text-text-secondary">
            Ctrl+K
          </kbd>
        </button>
      </div>
    </header>
  );
};
