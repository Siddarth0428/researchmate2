import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
}

interface AppState {
  sessionId: string;
  setSessionId: (id: string) => void;
  
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  
  selectedPaperId: string | null;
  setSelectedPaperId: (id: string | null) => void;
  
  comparisonPaperIds: string[];
  toggleComparisonPaper: (id: string) => void;
  clearComparisonPapers: () => void;
  
  activeCitation: {
    paperId: string;
    paperTitle: string;
    page: number;
    excerpt: string;
  } | null;
  setActiveCitation: (cit: { paperId: string; paperTitle: string; page: number; excerpt: string } | null) => void;
  
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sessionId: 'default',
  setSessionId: (id) => set({ sessionId: id }),
  
  theme: (localStorage.getItem('researchmate_theme') as 'dark' | 'light') || 'dark',
  toggleTheme: () => set((state) => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('researchmate_theme', next);
    if (next === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    return { theme: next };
  }),
  
  selectedPaperId: null,
  setSelectedPaperId: (id) => set({ selectedPaperId: id }),
  
  comparisonPaperIds: [],
  toggleComparisonPaper: (id) => set((state) => {
    const exists = state.comparisonPaperIds.includes(id);
    if (exists) {
      return { comparisonPaperIds: state.comparisonPaperIds.filter((p) => p !== id) };
    }
    if (state.comparisonPaperIds.length >= 6) {
      return state; // Max 6 papers
    }
    return { comparisonPaperIds: [...state.comparisonPaperIds, id] };
  }),
  clearComparisonPapers: () => set({ comparisonPaperIds: [] }),
  
  activeCitation: null,
  setActiveCitation: (cit) => set({ activeCitation: cit }),
  
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4500);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
