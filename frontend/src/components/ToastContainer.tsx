import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Info;
        let colorClasses = 'border-accent-primary/40 bg-surface/95 text-text-primary';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          colorClasses = 'border-success/50 bg-surface/95 text-text-primary';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          colorClasses = 'border-warning/50 bg-surface/95 text-text-primary';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          colorClasses = 'border-danger/50 bg-surface/95 text-text-primary';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-card border shadow-dialog backdrop-blur-md transition-all ${colorClasses}`}
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${
              toast.type === 'success' ? 'text-success' :
              toast.type === 'warning' ? 'text-warning' :
              toast.type === 'error' ? 'text-danger' : 'text-accent-cyan'
            }`} />
            <div className="flex-1">
              <h5 className="text-xs font-semibold text-text-primary leading-tight">
                {toast.title}
              </h5>
              <p className="text-[11px] text-text-secondary mt-0.5 leading-normal">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-text-muted hover:text-text-primary p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
