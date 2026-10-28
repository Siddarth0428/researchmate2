import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { fetchHealth, fetchPapers, fetchGaps, fetchGraph } from './api/client';
import type { HealthStatus, Paper, ResearchGap, GraphData } from './types';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ToastContainer } from './components/ToastContainer';
import { CommandPalette } from './components/CommandPalette';

import { DashboardScreen } from './screens/DashboardScreen';
import { ResearchLibraryScreen } from './screens/ResearchLibraryScreen';
import { PaperAnalysisScreen } from './screens/PaperAnalysisScreen';
import { RecommendationsScreen } from './screens/RecommendationsScreen';
import { ResearchGapsScreen } from './screens/ResearchGapsScreen';
import { ComparisonScreen } from './screens/ComparisonScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export const App: React.FC = () => {
  const theme = useAppStore((s) => s.theme);
  const sessionId = useAppStore((s) => s.sessionId);

  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [gaps, setGaps] = useState<ResearchGap[]>([]);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loadingPapers, setLoadingPapers] = useState<boolean>(true);

  // Sync theme class with HTML root element
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  // Load initial system health and library papers
  const loadData = async () => {
    try {
      const h = await fetchHealth();
      setHealth(h);
    } catch (e) {
      console.warn('Backend not responding yet:', e);
    }

    try {
      setLoadingPapers(true);
      const p = await fetchPapers(sessionId);
      setPapers(p);
      const g = await fetchGaps(sessionId);
      setGaps(g);
      const gr = await fetchGraph(sessionId);
      setGraphData(gr);
    } catch (e) {
      console.warn('Failed to load papers:', e);
    } finally {
      setLoadingPapers(false);
    }
  };

  useEffect(() => {
    loadData();
    // Periodic health refresh every 30 seconds
    const interval = setInterval(async () => {
      try {
        const h = await fetchHealth();
        setHealth(h);
      } catch (err) {}
    }, 30000);
    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen overflow-hidden bg-base text-text-primary antialiased font-sans">
        {/* Global Sidebar */}
        <Sidebar
          totalPapers={papers.length}
          totalGaps={gaps.length}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* Top Bar */}
          <TopBar
            health={health}
            onRefreshHealth={loadData}
            onPapersUpdated={loadData}
          />

          {/* Router Outlet Screen */}
          <main className="flex-1 flex overflow-hidden relative">
            <Routes>
              <Route
                path="/"
                element={
                  <DashboardScreen
                    papers={papers}
                    health={health}
                    gaps={gaps}
                    graphData={graphData}
                    loading={loadingPapers}
                    onRefresh={loadData}
                  />
                }
              />
              <Route
                path="/dashboard"
                element={
                  <DashboardScreen
                    papers={papers}
                    health={health}
                    gaps={gaps}
                    graphData={graphData}
                    loading={loadingPapers}
                    onRefresh={loadData}
                  />
                }
              />
              <Route
                path="/library"
                element={
                  <ResearchLibraryScreen
                    papers={papers}
                    loading={loadingPapers}
                    onRefresh={loadData}
                  />
                }
              />
              <Route
                path="/analysis"
                element={
                  <PaperAnalysisScreen
                    papers={papers}
                    onRefresh={loadData}
                  />
                }
              />
              <Route
                path="/recommendations"
                element={<RecommendationsScreen papers={papers} />}
              />
              <Route
                path="/gaps"
                element={<ResearchGapsScreen papers={papers} />}
              />
              <Route
                path="/compare"
                element={<ComparisonScreen papers={papers} />}
              />
              <Route
                path="/reports"
                element={<ReportsScreen papers={papers} />}
              />
              <Route
                path="/settings"
                element={
                  <SettingsScreen
                    health={health}
                    onRefreshHealth={loadData}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>

        {/* Global Modals & Notifications */}
        <CommandPalette />
        <ToastContainer />
      </div>
    </BrowserRouter>
  );
};

export default App;
