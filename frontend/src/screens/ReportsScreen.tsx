import React, { useState } from 'react';
import type { Paper } from '../types';
import { generateReport } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { 
  FileText, Download, Copy, Check, 
  Layers, RefreshCw, FileCode, CheckCircle2 
} from 'lucide-react';

interface ReportsScreenProps {
  papers: Paper[];
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({ papers }) => {
  const sessionId = useAppStore((s) => s.sessionId);
  const addToast = useAppStore((s) => s.addToast);

  const [title, setTitle] = useState<string>('Autonomous Research Synthesis & Literature Review');
  const [format, setFormat] = useState<'markdown' | 'pdf'>('markdown');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [reportResult, setReportResult] = useState<any>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleGenerate = async (overrideFormat?: 'markdown' | 'pdf') => {
    const fmt = overrideFormat || format;
    try {
      setIsGenerating(true);
      addToast({ type: 'info', title: 'Synthesizing Report', message: `Compiling ${fmt.toUpperCase()} report...` });
      const res = await generateReport(sessionId, title, fmt);
      setReportResult(res);
      addToast({ type: 'success', title: 'Report Ready', message: `Generated ${res.filename}` });
      if (fmt === 'pdf' && res.download_url) {
        window.open(res.download_url, '_blank');
      }
    } catch (e: any) {
      addToast({ type: 'error', title: 'Report Failed', message: e.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (reportResult?.content) {
      navigator.clipboard.writeText(reportResult.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast({ type: 'success', title: 'Copied', message: 'Markdown content copied to clipboard.' });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent-primary" />
            <span>Session Intelligence Reports & Export</span>
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Export unified scientific synthesis reports to Markdown and PDF with complete citations.
          </p>
        </div>
      </div>

      {/* Report Configuration Card */}
      <div className="p-5 bg-surface border border-border rounded-card shadow-card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Report Title */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-text-primary">
              Report Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-base border border-border rounded-control text-text-primary focus:outline-none focus:border-accent-cyan"
            />
          </div>

          {/* Format Selector & Triggers */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary">
              Export Action
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleGenerate('markdown')}
                disabled={isGenerating || papers.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-control text-xs font-semibold bg-raised hover:bg-accent-primary/20 text-text-primary border border-border transition-colors disabled:opacity-50"
              >
                <FileCode className="w-3.5 h-3.5 text-accent-cyan" />
                <span>Markdown</span>
              </button>

              <button
                onClick={() => handleGenerate('pdf')}
                disabled={isGenerating || papers.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-control text-xs font-semibold bg-accent-primary hover:bg-accent-primary/80 text-white transition-colors disabled:opacity-50 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF Report</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border">
          <span>Targeting {papers.length} research paper(s) in active workspace</span>
          <span className="font-mono text-accent-cyan">Grounded with exact page numbers</span>
        </div>
      </div>

      {/* Live Preview Panel */}
      {reportResult ? (
        <div className="p-5 bg-surface border border-border rounded-card shadow-card space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <h3 className="text-xs font-semibold text-text-primary">
                Generated: {reportResult.filename}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-raised hover:bg-surface border border-border text-text-secondary hover:text-text-primary transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {reportResult.download_url && (
                <a
                  href={reportResult.download_url}
                  download={reportResult.filename}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-accent-primary text-white hover:bg-accent-primary/80 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              )}
            </div>
          </div>

          {/* Formatted Markdown Box */}
          <div className="p-4 bg-base border border-border rounded-control max-h-96 overflow-y-auto font-mono text-xs text-text-secondary whitespace-pre-wrap leading-relaxed select-text">
            {reportResult.content}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-surface border border-border rounded-card space-y-2">
          <FileText className="w-10 h-10 text-text-muted mx-auto opacity-40" />
          <h4 className="text-xs font-semibold text-text-primary">
            No report synthesized yet
          </h4>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            Click "Markdown" or "PDF Report" above to compile a complete multi-paper intelligence report.
          </p>
        </div>
      )}
    </div>
  );
};
