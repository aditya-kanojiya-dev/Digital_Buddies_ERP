
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3 sm:gap-4">
        <div
          className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 h-fit ${
            tone === 'danger'
              ? 'bg-rose-500/15 text-rose-300'
              : 'bg-violet-500/15 text-violet-300'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-slate-100">{title}</h3>
          {message && <p className="text-xs sm:text-sm text-slate-400 mt-1">{message}</p>}
        </div>
      </div>
    </Modal>
  );
}
