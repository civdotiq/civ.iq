/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import {
  FC,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

type ToastType = 'info' | 'success' | 'warning' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const typeStyles: Record<ToastType, string> = {
  info: 'border-gray-400 bg-white text-gray-800',
  success: 'border-civiq-blue bg-blue-50 text-civiq-blue',
  warning: 'border-amber-600 bg-amber-50 text-amber-700',
  error: 'border-amber-600 bg-amber-50 text-amber-700',
};

const ToastItem: FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({
  toast: t,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(t.id), 3000);
    return () => clearTimeout(timer);
  }, [t.id, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'border-2 px-4 py-3 text-sm font-medium rounded-interactive shadow-elevated',
        'animate-fade-in',
        typeStyles[t.type]
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span>{t.message}</span>
        <button
          onClick={() => onDismiss(t.id)}
          className="text-current opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((type: ToastType, message: string) => {
    counterRef.current += 1;
    const id = `toast-${counterRef.current}-${Date.now()}`;
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
          aria-label="Notifications"
        >
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};

ToastProvider.displayName = 'ToastProvider';
