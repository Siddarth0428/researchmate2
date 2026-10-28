import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface ConfidenceBadgeProps {
  confidence: 'High' | 'Medium' | 'Low' | string;
  rationale?: string;
  className?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ 
  confidence, 
  rationale,
  className = '' 
}) => {
  const norm = confidence.toLowerCase();

  let colorClasses = 'bg-success/10 text-success border-success/30';
  let Icon = CheckCircle2;

  if (norm === 'medium') {
    colorClasses = 'bg-warning/10 text-warning border-warning/30';
    Icon = AlertTriangle;
  } else if (norm === 'low') {
    colorClasses = 'bg-danger/10 text-danger border-danger/30';
    Icon = AlertCircle;
  }

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${colorClasses} ${className}`}
      title={rationale || `${confidence} confidence evidence grounding`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="font-mono">{confidence}</span>
      {rationale && (
        <span className="hidden sm:inline text-[11px] opacity-80 border-l border-current/20 pl-1.5 ml-0.5">
          {rationale}
        </span>
      )}
    </div>
  );
};
