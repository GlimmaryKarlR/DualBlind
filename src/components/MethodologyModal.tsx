import React from 'react';
import { X } from 'lucide-react';
import { MethodologyView } from './MethodologyView';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTraining?: () => void;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTraining,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 sm:p-6 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-auto max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-10 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer transition-all"
          title="Close Methodology"
        >
          <X className="h-5 w-5" />
        </button>

        <MethodologyView
          onNavigateToTraining={() => {
            onClose();
            if (onNavigateToTraining) onNavigateToTraining();
          }}
          onNavigateToArena={onClose}
        />
      </div>
    </div>
  );
};
