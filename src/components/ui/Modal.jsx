import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  footer,
  closeOnOverlay = true,
  children,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Dialog'}
        className={`glass-panel border border-violet-500/20 rounded-3xl w-full ${
          SIZES[size] || SIZES.md
        } max-h-[90vh] flex flex-col shadow-2xl animate-modal-pop outline-none`}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-4 p-4 sm:p-6 border-b border-violet-500/10">
            <div className="min-w-0">
              {title && (
                <h3 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-200 transition p-1 -m-1 rounded-lg flex-shrink-0 cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div className="p-4 px-4 sm:px-6 border-t border-violet-500/10 flex items-center justify-end gap-3 flex-wrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
