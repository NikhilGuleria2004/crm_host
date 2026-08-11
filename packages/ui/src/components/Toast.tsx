import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export function Toast({
  message,
  type = 'success',
  duration = 4000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: 'border-success bg-success/10 text-success',
    error: 'border-danger bg-danger/10 text-danger',
    info: 'border-accent bg-accent/10 text-accent',
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded border shadow-lg ${colors[type]}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="text-current opacity-70 hover:opacity-100"
        >
          ×
        </button>
      </div>
    </div>
  );
}
