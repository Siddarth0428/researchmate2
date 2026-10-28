import React from 'react';
import { Cpu, Terminal } from 'lucide-react';

interface SourceBadgeProps {
  label: string;
  className?: string;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({ label, className = '' }) => {
  const isExtractive = label.toLowerCase().includes('extractive');

  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border font-medium transition-colors ${
        isExtractive 
          ? 'bg-raised/70 border-border text-text-secondary' 
          : 'bg-accent-primary/10 border-accent-primary/30 text-accent-cyan'
      } ${className}`}
      title={isExtractive ? 'Grounded purely via section-heuristic extraction & TF-IDF ranking' : `Synthesized via ${label}`}
    >
      {isExtractive ? <Terminal className="w-3 h-3 text-text-muted" /> : <Cpu className="w-3 h-3 text-accent-cyan" />}
      <span>{label}</span>
    </span>
  );
};
