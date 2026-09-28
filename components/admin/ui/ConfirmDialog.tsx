'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
      // Focus cancel button by default for safety
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[90] bg-transparent p-0 m-0 max-w-none max-h-none w-full h-full backdrop:bg-black/50"
      onClick={(e) => {
        if (e.target === dialogRef.current) onCancel();
      }}
    >
      <div className="flex items-center justify-center min-h-full p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between p-5 border-b border-gray-100">
            <div className="flex items-start gap-3">
              {variant === 'danger' && (
                <div className="mt-0.5 p-2 rounded-full bg-red-50">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="mt-1 text-sm text-gray-500">{message}</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Đóng"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="flex justify-end gap-3 p-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors admin-focus"
            >
              {cancelText}
            </button>
            <button
              ref={confirmBtnRef}
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors admin-focus ${
                variant === 'danger'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-brand-400 hover:bg-brand-500'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
