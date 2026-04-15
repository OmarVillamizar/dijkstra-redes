'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Edge, Tool, RouteResult } from '@/lib/types';
import { findAllRoutes } from '@/lib/allRoutes';
import Toolbar from '@/components/Toolbar';
import RoutePanel from '@/components/RoutePanel';
import ResultsPanel from '@/components/ResultsPanel';
import Canvas, { CanvasRef } from '@/components/Canvas';

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>('node');

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [routes, setRoutes] = useState<RouteResult[] | null>(null);
  const [routeError, setRouteError] = useState<string | undefined>();
  const [optimalPath, setOptimalPath] = useState<string[]>([]);

  const canvasRef = useRef<CanvasRef>(null);

  /* ── Keyboard shortcuts ─────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      switch (e.key.toLowerCase()) {
        case 'n': setActiveTool('node'); break;
        case 'e': setActiveTool('edge'); break;
        case 'x': setActiveTool('delete'); break;
        case 'escape': setActiveTool('node'); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── Graph mutations ────────────────────────────────────── */
  const handleAddNode = useCallback((node: Node) => {
    setNodes((prev) => [...prev, node]);
    setRoutes(null);
    setRouteError(undefined);
    setOptimalPath([]);
  }, []);

  const handleAddEdge = useCallback((edge: Edge) => {
    setEdges((prev) => [...prev, edge]);
    setRoutes(null);
    setRouteError(undefined);
    setOptimalPath([]);
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) =>
      prev.filter((e) => e.sourceId !== nodeId && e.targetId !== nodeId)
    );
    setRoutes(null);
    setRouteError(undefined);
    setOptimalPath([]);
  }, []);

  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    setRoutes(null);
    setRouteError(undefined);
    setOptimalPath([]);
  }, []);

  /* ── Route calculation ──────────────────────────────────── */
  const handleCalculate = useCallback(() => {
    if (!origin || !destination || origin === destination) return;

    const allRoutes = findAllRoutes(nodes, edges, origin, destination);

    if (allRoutes.length === 0) {
      setRoutes([]);
      setRouteError('no-route');
      setOptimalPath([]);
    } else {
      setRoutes(allRoutes);
      setRouteError(undefined);
      setOptimalPath(allRoutes[0].path);
    }
  }, [nodes, edges, origin, destination]);

  const canCalculate =
    !!origin &&
    !!destination &&
    origin !== destination &&
    nodes.length >= 2 &&
    edges.length >= 1;

  /* ── Hint message ───────────────────────────────────────── */
  const hintMessages: Record<Tool, string> = {
    node: 'Haz click en el canvas para agregar un nodo',
    edge: 'Selecciona el nodo origen del enlace',
    delete: 'Haz click en un nodo o enlace para eliminarlo',
    pan: 'Arrastra para mover el canvas',
  };

  return (
    <div className="app-shell">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="app-header">
        {/* Logo */}
        <div className="app-logo">
          <svg className="app-logo-icon" viewBox="0 0 34 34" fill="none" aria-hidden="true">
            <circle cx="8"  cy="17" r="5" fill="#58a6ff" opacity="0.9"/>
            <circle cx="26" cy="8"  r="5" fill="#bc8cff" opacity="0.9"/>
            <circle cx="26" cy="26" r="5" fill="#3fb950" opacity="0.9"/>
            <line x1="13" y1="17" x2="21" y2="10" stroke="#58a6ff" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="13" y1="17" x2="21" y2="24" stroke="#3fb950" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="21" y1="10" x2="21" y2="24" stroke="#bc8cff" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="3 2"/>
          </svg>
          <span>
            <span className="app-logo-name">Dijkstra Networks</span>
            <br />
            <span className="app-logo-sub">Workspace de grafos y rutas</span>
          </span>
        </div>

        <div className="header-divider" />

        {/* Toolbar */}
        <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />

        <div className="header-spacer" />

        {/* Route panel */}
        <RoutePanel
          nodes={nodes}
          origin={origin}
          destination={destination}
          onOriginChange={setOrigin}
          onDestinationChange={setDestination}
          onCalculate={handleCalculate}
          canCalculate={canCalculate}
        />
      </header>

      {/* ── Workspace ───────────────────────────────────────── */}
      <main className="workspace">
        {/* Canvas */}
        <div className="canvas-area">
          <Canvas
            ref={canvasRef}
            nodes={nodes}
            edges={edges}
            activeTool={activeTool}
            optimalPath={optimalPath}
            onAddNode={handleAddNode}
            onAddEdge={handleAddEdge}
            onDeleteNode={handleDeleteNode}
            onDeleteEdge={handleDeleteEdge}
          />

          {/* Hint bar */}
          <div className="canvas-hint" aria-live="polite">
            <span className="canvas-hint-dot" />
            {hintMessages[activeTool]}
          </div>

          {/* Stats bar */}
          <div className="stats-bar" aria-label="Estadísticas del grafo">
            <span className="stats-item">
              Nodos: <span>{nodes.length}</span>
            </span>
            <span className="stats-item">
              Enlaces: <span>{edges.length}</span>
            </span>
            {optimalPath.length > 0 && (
              <span className="stats-item" style={{ color: 'var(--accent-gold)' }}>
                Ruta óptima activa
              </span>
            )}
          </div>

          {/* Zoom controls */}
          <div className="zoom-controls" aria-label="Controles de zoom">
            <button
              id="zoom-in-btn"
              className="zoom-btn"
              onClick={() => canvasRef.current?.zoomIn()}
              title="Acercar"
              aria-label="Acercar"
            >
              +
            </button>
            <button
              id="zoom-reset-btn"
              className="zoom-btn"
              onClick={() => canvasRef.current?.resetView()}
              title="Restablecer vista"
              aria-label="Restablecer vista"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              ⌖
            </button>
            <button
              id="zoom-out-btn"
              className="zoom-btn"
              onClick={() => canvasRef.current?.zoomOut()}
              title="Alejar"
              aria-label="Alejar"
            >
              −
            </button>
          </div>
        </div>

        {/* Results panel */}
        <ResultsPanel
          results={routes && routes.length > 0 ? routes : routes !== null ? [] : null}
          origin={origin}
          destination={destination}
          error={routeError}
        />
      </main>
    </div>
  );
}
