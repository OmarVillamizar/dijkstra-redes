'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Edge, Tool, RouteResult } from '@/lib/types';
import { findAllRoutes } from '@/lib/allRoutes';
import Toolbar from '@/components/Toolbar';
import RoutePanel from '@/components/RoutePanel';
import ResultsPanel from '@/components/ResultsPanel';
import Canvas, { CanvasRef } from '@/components/Canvas';

export default function Home() {
  const [nodes, setNodes]       = useState<Node[]>([]);
  const [edges, setEdges]       = useState<Edge[]>([]);
  const [activeTool, setActiveTool] = useState<Tool>('node');

  const [origin,      setOrigin]      = useState('');
  const [destination, setDestination] = useState('');
  const [routes,      setRoutes]      = useState<RouteResult[] | null>(null);
  const [routeError,  setRouteError]  = useState<string | undefined>();
  const [optimalPath, setOptimalPath] = useState<string[]>([]);

  const canvasRef = useRef<CanvasRef>(null);

  /* ── Keyboard shortcuts ───────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      switch (e.key.toLowerCase()) {
        case 'm': setActiveTool('move');   break;
        case 'n': setActiveTool('node');   break;
        case 'e': setActiveTool('edge');   break;
        case 'x': setActiveTool('delete'); break;
        case 'escape': setActiveTool('move'); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── Graph mutations ──────────────────────────────────────── */
  const clearResults = useCallback(() => {
    setRoutes(null);
    setRouteError(undefined);
    setOptimalPath([]);
  }, []);

  const handleAddNode = useCallback((node: Node) => {
    setNodes((p) => [...p, node]);
    clearResults();
  }, [clearResults]);

  const handleAddEdge = useCallback((edge: Edge) => {
    setEdges((p) => [...p, edge]);
    clearResults();
  }, [clearResults]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((p) => p.filter((n) => n.id !== nodeId));
    setEdges((p) => p.filter((e) => e.sourceId !== nodeId && e.targetId !== nodeId));
    clearResults();
  }, [clearResults]);

  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges((p) => p.filter((e) => e.id !== edgeId));
    clearResults();
  }, [clearResults]);

  const handleMoveNode = useCallback((nodeId: string, x: number, y: number) => {
    setNodes((p) => p.map((n) => n.id === nodeId ? { ...n, x, y } : n));
  }, []);

  /* ── Route calculation ────────────────────────────────────── */
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
    !!origin && !!destination && origin !== destination &&
    nodes.length >= 2 && edges.length >= 1;

  /* ── Hint config ──────────────────────────────────────────── */
  const hints: Record<Tool, { text: string; color: string }> = {
    move:   { text: 'Arrastra un nodo para moverlo, o el canvas para navegar', color: 'blue' },
    node:   { text: 'Clic en el canvas para agregar un nodo (A, B, C...)',     color: 'green' },
    edge:   { text: 'Selecciona el nodo origen, luego el destino del enlace',  color: 'orange' },
    delete: { text: 'Clic en un nodo o enlace para eliminarlo del grafo',      color: 'red' },
  };
  const hint = hints[activeTool];

  return (
    <div className="app-shell">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="app-header">

        {/* logos container */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* UFPS Logo SVG representation */}
          <div className="ufps-logo-wrap" title="UFPS - Universidad Francisco de Paula Santander">
            <svg width="42" height="42" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" fill="#dc2626"/>
              {/* U */}
              <path d="M20 20v30h20V20M20 50h20" stroke="white" strokeWidth="6" fill="none"/>
              {/* F */}
              <path d="M55 20v30M55 20h20M55 35h15" stroke="white" strokeWidth="6" fill="none"/>
              {/* P */}
              <path d="M20 65v25M20 65h15c2.76 0 5 2.24 5 5s-2.24 5-5 5H20" stroke="white" strokeWidth="6" fill="none"/>
              {/* S */}
              <path d="M75 65H55v7.5h20V80H55v10h20" stroke="white" strokeWidth="6" fill="none"/>
            </svg>
          </div>

          <div className="header-divider" style={{ margin: '0 4px' }} />

          {/* Main Logo */}
          <div className="app-logo">
            <svg className="app-logo-icon" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="8"  cy="16" r="5" fill="#16a34a"/>
              <circle cx="24" cy="7"  r="5" fill="#ea580c"/>
              <circle cx="24" cy="25" r="5" fill="#2563eb"/>
              <line x1="13" y1="16" x2="19" y2="9"  stroke="#16a34a" strokeWidth="2" strokeLinecap="round"/>
              <line x1="13" y1="16" x2="19" y2="23" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/>
              <line x1="19" y1="9"  x2="19" y2="23" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 2"/>
            </svg>
            <span>
              <span className="app-logo-name">Dijkstra Networks</span>
              <br/>
              <span className="app-logo-sub">Workspace de grafos y rutas óptimas</span>
            </span>
          </div>
        </div>

        <div className="header-divider"/>

        {/* Toolbar */}
        <Toolbar activeTool={activeTool} onToolChange={setActiveTool}/>

        <div className="header-spacer"/>

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

      {/* ── Workspace ─────────────────────────────────────────── */}
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
            onMoveNode={handleMoveNode}
          />

          {/* Hint bar */}
          <div className="canvas-hint" aria-live="polite">
            <span className={`canvas-hint-dot ${hint.color}`}/>
            {hint.text}
          </div>

          {/* Stats */}
          <div className="stats-bar" aria-label="Estadísticas del grafo">
            <span className="stats-item">
              Nodos: <span className="stat-value">{nodes.length}</span>
            </span>
            <span className="stats-item">
              Enlaces: <span className="stat-value">{edges.length}</span>
            </span>
            {optimalPath.length > 0 && (
              <span className="stats-item">
                <span className="stat-optimal">⭐ Ruta óptima calculada</span>
              </span>
            )}
          </div>

          {/* Zoom controls */}
          <div className="zoom-controls" aria-label="Controles de zoom">
            <button id="zoom-in-btn"    className="zoom-btn" onClick={() => canvasRef.current?.zoomIn()}    title="Acercar (+)">+</button>
            <button id="zoom-reset-btn" className="zoom-btn" onClick={() => canvasRef.current?.resetView()} title="Restablecer vista" style={{ fontSize: 14, fontWeight: 700 }}>⌖</button>
            <button id="zoom-out-btn"   className="zoom-btn" onClick={() => canvasRef.current?.zoomOut()}   title="Alejar (−)">−</button>
          </div>
        </div>

        {/* Results */}
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
