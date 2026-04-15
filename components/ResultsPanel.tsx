'use client';

import { RouteResult } from '@/lib/types';

interface Props {
  results: RouteResult[] | null;
  origin: string;
  destination: string;
  error?: string;
}

function PathDisplay({ path }: { path: string[] }) {
  return (
    <>
      {path.map((label, i) => (
        <span key={i}>
          {i > 0 && <span className="path-sep"> → </span>}
          {label}
        </span>
      ))}
    </>
  );
}

export default function ResultsPanel({ results, origin, destination, error }: Props) {
  if (!results && !error) {
    return (
      <aside className="results-panel" aria-label="Panel de resultados Dijkstra">
        <div className="results-empty">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4"/>
            <circle cx="14" cy="24" r="4" fill="currentColor" opacity="0.5"/>
            <circle cx="34" cy="14" r="4" fill="currentColor" opacity="0.5"/>
            <circle cx="34" cy="34" r="4" fill="currentColor" opacity="0.5"/>
            <line x1="17.5" y1="22" x2="31" y2="16" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
            <line x1="17.5" y1="26" x2="31" y2="32" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
          </svg>
          <p>
            Crea nodos y enlaces en el canvas, luego selecciona un origen y destino para calcular la ruta óptima.
          </p>
        </div>
      </aside>
    );
  }

  const optimal = results?.find((r) => r.isOptimal);
  const others = results?.filter((r) => !r.isOptimal) ?? [];

  return (
    <aside className="results-panel" aria-label="Panel de resultados Dijkstra">
      <div className="results-header">
        <p className="results-title">
          Convergencia Dijkstra
        </p>
      </div>

      <div className="results-body">
        {/* Error state */}
        {error && (
          <div className="no-route-msg" role="alert">
            <strong>Sin ruta disponible</strong>
            <br />
            No existe camino entre <strong>{origin}</strong> y{' '}
            <strong>{destination}</strong>. Verifica la topología del grafo.
          </div>
        )}

        {/* Optimal route */}
        {optimal && (
          <div className="optimal-card" aria-label="Ruta óptima">
            <p className="optimal-badge">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                <polygon points="5,0 6.2,3.8 10,3.8 7,6.2 8.1,10 5,7.6 1.9,10 3,6.2 0,3.8 3.8,3.8"/>
              </svg>
              Ruta óptima — menor coste
            </p>

            <p className="optimal-path" aria-label={`Ruta: ${optimal.path.join(' → ')}`}>
              <PathDisplay path={optimal.path} />
            </p>

            <div className="optimal-cost">
              <span className="cost-label">Coste total</span>
              <span className="cost-value">{optimal.cost}</span>
              <span className="cost-unit">unidades</span>
            </div>
          </div>
        )}

        {/* Other routes */}
        {others.length > 0 && (
          <div>
            <p className="other-routes-title">
              Rutas alternativas ({others.length})
            </p>
            <ul className="other-routes-list" aria-label="Rutas alternativas">
              {others.map((route, i) => (
                <li key={i} className="route-item">
                  <span className="route-item-path" title={route.path.join(' → ')}>
                    <PathDisplay path={route.path} />
                  </span>
                  <span className="route-item-cost" aria-label={`Coste: ${route.cost}`}>
                    {route.cost}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Only one route exists */}
        {optimal && others.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            No existen rutas alternativas para esta topología.
          </p>
        )}
      </div>
    </aside>
  );
}
