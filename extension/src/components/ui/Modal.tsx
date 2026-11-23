import React, { useEffect, useRef } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  maxWidth?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, maxWidth, style, children }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      className="glass"
      aria-labelledby="modal-title"
      style={{ maxWidth: maxWidth || undefined, ...style }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 id="modal-title" style={{ fontSize: '20px' }}>{title}</h2>
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'transparent', border: 0, fontSize: '20px', cursor: 'pointer', color: 'var(--muted)' }}
          aria-label="Close dialog"
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
};
