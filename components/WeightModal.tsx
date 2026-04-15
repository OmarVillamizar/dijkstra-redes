'use client';

import { useState, useRef, useCallback } from 'react';

interface Props {
  nodeA: string;
  nodeB: string;
  onConfirm: (weight: number) => void;
  onCancel: () => void;
}

export default function WeightModal({ nodeA, nodeB, onConfirm, onCancel }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleConfirm = useCallback(() => {
    const w = parseFloat(value);
    if (!isNaN(w) && w > 0) onConfirm(w);
  }, [value, onConfirm]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleConfirm();
      if (e.key === 'Escape') onCancel();
    },
    [handleConfirm, onCancel]
  );

  const isValid = !isNaN(parseFloat(value)) && parseFloat(value) > 0;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-box">
        <p className="modal-title" id="modal-title">Definir peso del enlace</p>
        <p className="modal-sub">
          Enlace entre nodo <strong style={{ color: 'var(--accent-blue)' }}>{nodeA}</strong>
          {' '}→{' '}
          <strong style={{ color: 'var(--accent-blue)' }}>{nodeB}</strong>
          <br />
          Ingresa el coste (métrica) de esta conexión.
        </p>

        <div className="modal-input-wrap">
          <input
            id="weight-input"
            ref={inputRef}
            autoFocus
            type="number"
            min="0.01"
            step="any"
            placeholder="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKey}
            className="modal-input"
            aria-label="Peso del enlace"
          />
        </div>

        <div className="modal-actions">
          <button
            id="modal-cancel-btn"
            className="modal-btn modal-btn-cancel"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            id="modal-confirm-btn"
            className="modal-btn modal-btn-confirm"
            onClick={handleConfirm}
            disabled={!isValid}
          >
            Confirmar enlace
          </button>
        </div>
      </div>
    </div>
  );
}
