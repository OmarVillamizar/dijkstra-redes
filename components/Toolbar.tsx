'use client';

import { Tool } from '@/lib/types';

interface Props {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
}

export default function Toolbar({ activeTool, onToolChange }: Props) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Herramientas del workspace">
      <span className="toolbar-label">Herramientas</span>

      {/* Move/drag tool — blue */}
      <button
        id="tool-move-btn"
        className={`tool-btn tool-move ${activeTool === 'move' ? 'active' : ''}`}
        onClick={() => onToolChange('move')}
        title="Mover — arrastra nodos o el canvas (M)"
        aria-pressed={activeTool === 'move'}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1v14M1 8h14M8 1L5.5 3.5M8 1l2.5 2.5M8 15l-2.5-2.5M8 15l2.5-2.5M1 8l2.5-2.5M1 8l2.5 2.5M15 8l-2.5-2.5M15 8l-2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Mover
      </button>

      {/* Node tool — green */}
      <button
        id="tool-node-btn"
        className={`tool-btn tool-node ${activeTool === 'node' ? 'active' : ''}`}
        onClick={() => onToolChange('node')}
        title="Nodo — click en el canvas para crear nodos A, B, C... (N)"
        aria-pressed={activeTool === 'node'}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.8"/>
          <circle cx="8" cy="8" r="2.5" fill="currentColor"/>
        </svg>
        Nodo
      </button>

      {/* Edge tool — orange */}
      <button
        id="tool-edge-btn"
        className={`tool-btn tool-edge ${activeTool === 'edge' ? 'active' : ''}`}
        onClick={() => onToolChange('edge')}
        title="Enlace — toca dos nodos para crear una conexión con peso (E)"
        aria-pressed={activeTool === 'edge'}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="2.5" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="13.5" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="4.5" y1="8" x2="11.5" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M9.5 5.5L12 8l-2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Enlace
      </button>

      {/* Delete tool — red */}
      <button
        id="tool-delete-btn"
        className={`tool-btn tool-delete ${activeTool === 'delete' ? 'active' : ''}`}
        onClick={() => onToolChange('delete')}
        title="Borrar — elimina nodos y sus enlaces (X)"
        aria-pressed={activeTool === 'delete'}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 4h12M5.5 4V2.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5V4M6.5 7v5M9.5 7v5M3 4l.8 9.2A1 1 0 0 0 4.8 14h6.4a1 1 0 0 0 1-.8L13 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Borrar
      </button>
    </div>
  );
}
