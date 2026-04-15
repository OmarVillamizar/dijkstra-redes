'use client';

import { Node } from '@/lib/types';

interface Props {
  nodes: Node[];
  origin: string;
  destination: string;
  onOriginChange: (v: string) => void;
  onDestinationChange: (v: string) => void;
  onCalculate: () => void;
  canCalculate: boolean;
}

export default function RoutePanel({
  nodes,
  origin,
  destination,
  onOriginChange,
  onDestinationChange,
  onCalculate,
  canCalculate,
}: Props) {
  return (
    <div className="route-panel" role="search" aria-label="Calcular ruta">
      <span className="route-panel-label">Calcular ruta</span>

      {/* Origin selector */}
      <select
        id="route-origin-select"
        className="route-select"
        value={origin}
        onChange={(e) => onOriginChange(e.target.value)}
        aria-label="Nodo origen"
        title="Nodo origen"
      >
        <option value="">–</option>
        {nodes.map((n) => (
          <option key={n.id} value={n.label}>
            {n.label}
          </option>
        ))}
      </select>

      <span className="route-arrow" aria-hidden="true">→</span>

      {/* Destination selector */}
      <select
        id="route-destination-select"
        className="route-select"
        value={destination}
        onChange={(e) => onDestinationChange(e.target.value)}
        aria-label="Nodo destino"
        title="Nodo destino"
      >
        <option value="">–</option>
        {nodes.map((n) => (
          <option key={n.id} value={n.label}>
            {n.label}
          </option>
        ))}
      </select>

      {/* Calculate button */}
      <button
        id="calculate-route-btn"
        className="route-calc-btn"
        onClick={onCalculate}
        disabled={!canCalculate}
        aria-label="Calcular ruta óptima con Dijkstra"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M2 7h10M8 3l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Calcular
      </button>
    </div>
  );
}
