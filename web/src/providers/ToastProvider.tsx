'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CircleCheck, CircleX, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CircleCheck size={16} className="text-green-500" />,
  error: <CircleX size={16} className="text-red-500" />,
  info: <Info size={16} className="text-blue-500" />,
};

const bgColors: Record<ToastType, string> = {
  success: 'border-green-200 dark:border-green-800',
  error: 'border-red-200 dark:border-red-800',
  info: 'border-blue-200 dark:border-blue-800',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-3 rounded-lg border bg-[var(--card)] shadow-lg ${bgColors[toast.type]} animate-in slide-in-from-top-2`}
          >
            <span className="mt-0.5 shrink-0">{icons[toast.type]}</span>
            <p className="flex-1 text-sm">{toast.message}</p>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
