import React, { useEffect } from 'react';
import { useIssues } from '../context/TicketContext';
import { ToastNotification } from '../types';
import { CheckCircle2, AlertTriangle, Info, X, Zap } from 'lucide-react';

interface ToastItemProps {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <Zap className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-purple-200 bg-white';
      case 'warning':
        return 'border-amber-200 bg-white';
      case 'info':
      default:
        return 'border-gray-200 bg-white';
    }
  };

  return (
    <div
      className={`pointer-events-auto shadow-lg border rounded-lg p-3 ${getBorderColor()} flex items-start gap-2.5 transition-all text-xs animate-fade-in`}
      role="alert"
    >
      {getIcon()}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 leading-snug">{toast.title}</p>
        {toast.message && (
          <p className="text-gray-600 font-sans mt-0.5 leading-snug text-[11px]">
            {toast.message}
          </p>
        )}
        {toast.action && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss(toast.id);
              }}
              className="px-2 py-0.8 bg-black hover:bg-gray-800 text-white rounded font-mono text-[10px] font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              {toast.action.label}
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="text-gray-400 hover:text-black p-0.5 rounded cursor-pointer transition-colors shrink-0"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useIssues();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
};
