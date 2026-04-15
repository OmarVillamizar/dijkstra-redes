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

      {/* Node tool */}
      <button
        id="tool-node-btn"
        className={`tool-btn ${activeTool === 'node' ? 'active' : ''}`}
        onClick={() => onToolChange('node')}
        title="Nodo — click en el canvas para crear un nodo (Tecla: N)"
        aria-pressed={activeTool === 'node'}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8" fill="none"/>
          <circle cx="8" cy="8" r="2" fill="currentColor"/>
        </svg>
        Nodo
      </button>

      {/* Edge tool */}
      <button
        id="tool-edge-btn"
        className={`tool-btn ${activeTool === 'edge' ? 'active' : ''}`}
        onClick={() => onToolChange('edge')}
        title="Enlace — selecciona dos nodos para conectarlos (Tecla: E)"
        aria-pressed={activeTool === 'edge'}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="3" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.6" fill="none"/>
          <circle cx="13" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.6" fill="none"/>
          <line x1="5.5" y1="8" x2="10.5" y2="8" stroke="currentColor" strokeWidth="1.6"/>
          <line x1="9.2" y1="6" x2="10.5" y2="8" stroke="currentColor" strokeWidth="1.4"/>
          <line x1="9.2" y1="10" x2="10.5" y2="8" stroke="currentColor" strokeWidth="1.4"/>
        </svg>
        Enlace
      </button>

      {/* Delete tool */}
      <button
        id="tool-delete-btn"
        className={`tool-btn ${activeTool === 'delete' ? 'active-delete' : ''}`}
        onClick={() => onToolChange('delete')}
        title="Borrar — elimina nodos o enlaces del grafo (Tecla: X)"
        aria-pressed={activeTool === 'delete'}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        Borrar
      </button>
    </div>
  );
}
