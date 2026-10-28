import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, FileText, Share2, GitCompare, Compass, 
  Settings as SettingsIcon, Sun, Moon, Database, UploadCloud, X, LayoutDashboard 
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { loadSamplePapers } from '../api/client';

export const CommandPalette: React.FC = () => {
  const isOpen = useAppStore((s) => s.commandPaletteOpen);
  const setIsOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const addToast = useAppStore((s) => s.addToast);
  const sessionId = useAppStore((s) => s.sessionId);

  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  // Listen for Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'dashboard',
      label: 'Go to Cockpit Dashboard',
      category: 'Navigation',
      icon: LayoutDashboard,
      run: () => navigate('/dashboard'),
    },
    {
      id: 'library',
      label: 'Go to Research Library',
      category: 'Navigation',
      icon: FileText,
      run: () => navigate('/library'),
    },
    {
      id: 'analysis',
      label: 'Go to Paper Analysis',
      category: 'Navigation',
      icon: FileText,
      run: () => navigate('/analysis'),
    },
    {
      id: 'graph',
      label: 'Open Recommendations & Graph',
      category: 'Navigation',
      icon: Share2,
      run: () => navigate('/recommendations'),
    },
    {
      id: 'gaps',
      label: 'View Evidence-Backed Research Gaps',
      category: 'Intelligence',
      icon: Compass,
      run: () => navigate('/gaps'),
    },
    {
      id: 'compare',
      label: 'Open Comparison Workspace',
      category: 'Analysis',
      icon: GitCompare,
      run: () => navigate('/compare'),
    },
    {
      id: 'reports',
      label: 'Generate Session Reports',
      category: 'Export',
      icon: FileText,
      run: () => navigate('/reports'),
    },
    {
      id: 'samples',
      label: 'Load Landmark Sample Research Papers',
      category: 'Actions',
      icon: Database,
      run: async () => {
        try {
          addToast({ type: 'info', title: 'Loading Papers', message: 'Ingesting landmark research papers...' });
          const res = await loadSamplePapers(sessionId);
          addToast({ type: 'success', title: 'Papers Ingested', message: res.message });
          navigate('/library');
        } catch (e: any) {
          addToast({ type: 'error', title: 'Error', message: e.message || 'Failed to load samples' });
        }
      },
    },
    {
      id: 'theme',
      label: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`,
      category: 'Preferences',
      icon: theme === 'dark' ? Sun : Moon,
      run: () => toggleTheme(),
    },
    {
      id: 'settings',
      label: 'Open System Settings & Health',
      category: 'System',
      icon: SettingsIcon,
      run: () => navigate('/settings'),
    },
  ];

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-base/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-surface border border-border-strong rounded-dialog shadow-dialog overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-border bg-raised/50">
          <Search className="w-4 h-4 text-accent-cyan mr-3 shrink-0" />
          <input
            type="text"
            placeholder="Type a command or jump to screen... (ESC to exit)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded text-text-muted hover:text-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action list */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-border/40">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-text-muted">
              No matching commands found.
            </div>
          ) : (
            filtered.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    action.run();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-control text-left hover:bg-raised transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-accent-primary group-hover:text-accent-cyan transition-colors" />
                    <span className="text-xs font-medium text-text-primary">
                      {action.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider px-1.5 py-0.5 rounded bg-base border border-border">
                    {action.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2 bg-raised/40 border-t border-border text-[11px] text-text-muted">
          <span>Navigation: <kbd className="font-mono bg-base px-1 py-0.5 rounded border border-border">↑</kbd> <kbd className="font-mono bg-base px-1 py-0.5 rounded border border-border">↓</kbd></span>
          <span>Execute: <kbd className="font-mono bg-base px-1 py-0.5 rounded border border-border">↵ Enter</kbd></span>
        </div>
      </div>
    </div>
  );
};
