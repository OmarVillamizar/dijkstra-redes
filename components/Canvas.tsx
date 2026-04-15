'use client';

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Node, Edge, Tool } from '@/lib/types';
import WeightModal from './WeightModal';

/* ─── helpers ───────────────────────────────────────────────── */
const NODE_R = 28;
const GRID_SIZE = 40;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function svgPoint(
  svgEl: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const pt = svgEl.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const transformed = pt.matrixTransform(svgEl.getScreenCTM()!.inverse());
  return { x: transformed.x, y: transformed.y };
}

function snapToGrid(v: number) {
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

/* ─── types ─────────────────────────────────────────────────── */
interface PendingEdge {
  sourceId: string;
  mouseX: number;
  mouseY: number;
}

interface WeightModalState {
  sourceId: string;
  targetId: string;
}

export interface CanvasRef {
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

interface Props {
  nodes: Node[];
  edges: Edge[];
  activeTool: Tool;
  optimalPath: string[];   // node labels of the optimal route
  onAddNode: (node: Node) => void;
  onAddEdge: (edge: Edge) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
}

/* ─── Grid pattern ──────────────────────────────────────────── */
function GridPattern() {
  return (
    <defs>
      <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
        <path
          d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
          fill="none"
          stroke="rgba(88,166,255,0.06)"
          strokeWidth="0.5"
        />
      </pattern>
    </defs>
  );
}

/* ─── Component ─────────────────────────────────────────────── */
const Canvas = forwardRef<CanvasRef, Props>(function Canvas(
  {
    nodes,
    edges,
    activeTool,
    optimalPath,
    onAddNode,
    onAddEdge,
    onDeleteNode,
    onDeleteEdge,
  },
  ref
) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Viewport state (pan + zoom)
  const [viewBox, setViewBox] = useState({ x: -400, y: -300, w: 1200, h: 800 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });

  // Edge creation
  const [pendingEdge, setPendingEdge] = useState<PendingEdge | null>(null);
  const [weightModal, setWeightModal] = useState<WeightModalState | null>(null);

  // Hover tracking for delete tool
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  /* ── Imperative zoom/reset ──────────────────────────────── */
  useImperativeHandle(ref, () => ({
    resetView() {
      setViewBox({ x: -400, y: -300, w: 1200, h: 800 });
    },
    zoomIn() {
      setViewBox((v) => {
        const factor = 0.8;
        const cx = v.x + v.w / 2;
        const cy = v.y + v.h / 2;
        const nw = v.w * factor;
        const nh = v.h * factor;
        return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
      });
    },
    zoomOut() {
      setViewBox((v) => {
        const factor = 1.25;
        const cx = v.x + v.w / 2;
        const cy = v.y + v.h / 2;
        const nw = v.w * factor;
        const nh = v.h * factor;
        return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
      });
    },
  }));

  /* ── Keyboard shortcuts ─────────────────────────────────── */
  // Keyboard handling is done in page.tsx via activeTool prop

  /* ── Wheel zoom ─────────────────────────────────────────── */
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.12 : 0.88;
    const svg = svgRef.current!;
    const pt = svgPoint(svg, e.clientX, e.clientY);
    setViewBox((v) => {
      const nw = Math.min(Math.max(v.w * factor, 300), 8000);
      const nh = Math.min(Math.max(v.h * factor, 200), 6000);
      const nx = pt.x - (pt.x - v.x) * (nw / v.w);
      const ny = pt.y - (pt.y - v.y) * (nh / v.h);
      return { x: nx, y: ny, w: nw, h: nh };
    });
  }, []);

  /* ── Pan ────────────────────────────────────────────────── */
  const startPan = useCallback(
    (clientX: number, clientY: number) => {
      isPanning.current = true;
      panStart.current = {
        x: clientX,
        y: clientY,
        vx: viewBox.x,
        vy: viewBox.y,
      };
    },
    [viewBox.x, viewBox.y]
  );

  const doPan = useCallback(
    (clientX: number, clientY: number) => {
      if (!isPanning.current) return;
      const svg = svgRef.current!;
      const scale = viewBox.w / svg.clientWidth;
      const dx = (clientX - panStart.current.x) * scale;
      const dy = (clientY - panStart.current.y) * scale;
      setViewBox((v) => ({
        ...v,
        x: panStart.current.vx - dx,
        y: panStart.current.vy - dy,
      }));
    },
    [viewBox.w]
  );

  const endPan = useCallback(() => {
    isPanning.current = false;
  }, []);

  /* ── Canvas click ───────────────────────────────────────── */
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (activeTool !== 'node') return;
      if ((e.target as SVGElement).closest('.node-group, .edge-group')) return;

      const svg = svgRef.current!;
      const pt = svgPoint(svg, e.clientX, e.clientY);
      const x = snapToGrid(pt.x);
      const y = snapToGrid(pt.y);

      // Avoid overlapping
      const tooClose = nodes.some(
        (n) => Math.hypot(n.x - x, n.y - y) < NODE_R * 2.2
      );
      if (tooClose) return;

      const label = String.fromCharCode(65 + nodes.length % 26);
      const suffix = nodes.length >= 26 ? String(Math.floor(nodes.length / 26)) : '';
      onAddNode({ id: uid(), label: label + suffix, x, y });
    },
    [activeTool, nodes, onAddNode]
  );

  /* ── Node click ─────────────────────────────────────────── */
  const handleNodeClick = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();

      if (activeTool === 'delete') {
        onDeleteNode(nodeId);
        return;
      }

      if (activeTool === 'edge') {
        if (!pendingEdge) {
          const svg = svgRef.current!;
          const pt = svgPoint(svg, e.clientX, e.clientY);
          setPendingEdge({ sourceId: nodeId, mouseX: pt.x, mouseY: pt.y });
        } else {
          if (pendingEdge.sourceId === nodeId) {
            // Same node  — cancel
            setPendingEdge(null);
            return;
          }
          // Check duplicate edge
          const duplicate = edges.some(
            (ed) =>
              (ed.sourceId === pendingEdge.sourceId && ed.targetId === nodeId) ||
              (ed.sourceId === nodeId && ed.targetId === pendingEdge.sourceId)
          );
          if (duplicate) {
            setPendingEdge(null);
            return;
          }
          setWeightModal({ sourceId: pendingEdge.sourceId, targetId: nodeId });
          setPendingEdge(null);
        }
      }
    },
    [activeTool, edges, onDeleteNode, pendingEdge]
  );

  /* ── Edge click ─────────────────────────────────────────── */
  const handleEdgeClick = useCallback(
    (e: React.MouseEvent, edgeId: string) => {
      e.stopPropagation();
      if (activeTool === 'delete') {
        onDeleteEdge(edgeId);
      }
    },
    [activeTool, onDeleteEdge]
  );

  /* ── Mouse move (pending edge + pan) ───────────────────── */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      doPan(e.clientX, e.clientY);

      if (pendingEdge && activeTool === 'edge') {
        const svg = svgRef.current!;
        const pt = svgPoint(svg, e.clientX, e.clientY);
        setPendingEdge((prev) =>
          prev ? { ...prev, mouseX: pt.x, mouseY: pt.y } : null
        );
      }
    },
    [doPan, pendingEdge, activeTool]
  );

  /* ── Mouse down ─────────────────────────────────────────── */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (activeTool === 'pan' || (e.button === 1)) {
        startPan(e.clientX, e.clientY);
      }
      // Middle mouse always pans
      if (e.button === 1) e.preventDefault();
    },
    [activeTool, startPan]
  );

  /* ── Mouse up ───────────────────────────────────────────── */
  const handleMouseUp = useCallback(() => {
    endPan();
  }, [endPan]);

  /* ── Cancel pending edge on Escape ─────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPendingEdge(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── Weight modal confirm ───────────────────────────────── */
  const handleWeightConfirm = useCallback(
    (weight: number) => {
      if (!weightModal) return;
      onAddEdge({
        id: uid(),
        sourceId: weightModal.sourceId,
        targetId: weightModal.targetId,
        weight,
      });
      setWeightModal(null);
    },
    [weightModal, onAddEdge]
  );

  /* ── Optimal path edge set ──────────────────────────────── */
  const optimalEdgeIds = new Set<string>();
  if (optimalPath.length > 1) {
    for (let i = 0; i < optimalPath.length - 1; i++) {
      const aLabel = optimalPath[i];
      const bLabel = optimalPath[i + 1];
      const edge = edges.find((ed) => {
        const src = nodes.find((n) => n.id === ed.sourceId);
        const tgt = nodes.find((n) => n.id === ed.targetId);
        return (
          (src?.label === aLabel && tgt?.label === bLabel) ||
          (src?.label === bLabel && tgt?.label === aLabel)
        );
      });
      if (edge) optimalEdgeIds.add(edge.id);
    }
  }

  /* ── Cursor class ───────────────────────────────────────── */
  const cursorClass = [
    'canvas-svg',
    `tool-${activeTool}`,
    isPanning.current ? 'panning' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const vbStr = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;

  return (
    <>
      <svg
        ref={svgRef}
        className={cursorClass}
        viewBox={vbStr}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
        role="application"
        aria-label="Canvas del grafo de red"
      >
        <GridPattern />

        {/* Background fill with grid */}
        <rect
          x={viewBox.x - 10000}
          y={viewBox.y - 10000}
          width={viewBox.w + 20000}
          height={viewBox.h + 20000}
          fill="url(#grid)"
        />

        {/* ── Edges ─────────────────────────────────────────── */}
        <g>
          {edges.map((edge) => {
            const src = nodes.find((n) => n.id === edge.sourceId);
            const tgt = nodes.find((n) => n.id === edge.targetId);
            if (!src || !tgt) return null;

            const mx = (src.x + tgt.x) / 2;
            const my = (src.y + tgt.y) / 2;
            const isOptimal = optimalEdgeIds.has(edge.id);
            const isHovered = hoveredEdgeId === edge.id;

            return (
              <g
                key={edge.id}
                className="edge-group"
                onClick={(e) => handleEdgeClick(e, edge.id)}
                onMouseEnter={() => activeTool === 'delete' && setHoveredEdgeId(edge.id)}
                onMouseLeave={() => setHoveredEdgeId(null)}
                style={{ cursor: activeTool === 'delete' ? 'not-allowed' : 'default' }}
              >
                {/* Hitbox (wider invisible line) */}
                <line
                  x1={src.x} y1={src.y}
                  x2={tgt.x} y2={tgt.y}
                  stroke="transparent"
                  strokeWidth="16"
                />
                {/* Visible edge */}
                <line
                  className={`edge-line ${isOptimal ? 'edge-optimal' : ''}`}
                  x1={src.x} y1={src.y}
                  x2={tgt.x} y2={tgt.y}
                  stroke={
                    isHovered && activeTool === 'delete'
                      ? 'var(--accent-red)'
                      : isOptimal
                      ? 'var(--accent-gold)'
                      : 'var(--edge-stroke)'
                  }
                  strokeWidth={isOptimal ? 2.5 : 2}
                  strokeLinecap="round"
                  filter={isHovered && activeTool === 'delete' ? 'url(#glow-red)' : undefined}
                />
                {/* Weight label */}
                <rect
                  x={mx - 16}
                  y={my - 11}
                  width={32}
                  height={22}
                  rx={5}
                  fill={isOptimal ? 'rgba(240,192,64,0.15)' : 'var(--bg-canvas)'}
                  stroke={isOptimal ? 'rgba(240,192,64,0.4)' : 'var(--border)'}
                  strokeWidth={1}
                />
                <text
                  x={mx}
                  y={my + 5}
                  textAnchor="middle"
                  fill={isOptimal ? 'var(--accent-gold)' : 'var(--text-secondary)'}
                  fontSize={12}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="600"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {edge.weight}
                </text>
              </g>
            );
          })}
        </g>

        {/* ── Pending edge preview ───────────────────────────── */}
        {pendingEdge && (() => {
          const src = nodes.find((n) => n.id === pendingEdge.sourceId);
          if (!src) return null;
          return (
            <line
              x1={src.x} y1={src.y}
              x2={pendingEdge.mouseX}
              y2={pendingEdge.mouseY}
              stroke="var(--accent-purple)"
              strokeWidth={2}
              strokeDasharray="6 4"
              strokeLinecap="round"
              style={{ pointerEvents: 'none' }}
            />
          );
        })()}

        {/* ── Nodes ─────────────────────────────────────────── */}
        <g>
          {nodes.map((node) => {
            const isInOptimal = optimalPath.includes(node.label);
            const isPending = pendingEdge?.sourceId === node.id;

            return (
              <g
                key={node.id}
                className="node-group"
                onClick={(e) => handleNodeClick(e, node.id)}
                style={{ cursor: activeTool === 'delete' ? 'not-allowed' : activeTool === 'edge' ? 'pointer' : 'default' }}
                role="button"
                aria-label={`Nodo ${node.label}`}
              >
                {/* Glow ring */}
                {(isInOptimal || isPending) && (
                  <circle
                    cx={node.x} cy={node.y}
                    r={NODE_R + 8}
                    fill={isInOptimal ? 'var(--accent-gold-dim)' : 'rgba(188,140,255,0.15)'}
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Main circle */}
                <circle
                  cx={node.x} cy={node.y} r={NODE_R}
                  fill="var(--node-fill)"
                  stroke={
                    isPending
                      ? 'var(--accent-purple)'
                      : isInOptimal
                      ? 'var(--accent-gold)'
                      : 'var(--node-stroke)'
                  }
                  strokeWidth={isInOptimal ? 2.5 : 2}
                  className={`node-circle ${isInOptimal ? 'node-optimal' : ''} ${isPending ? 'node-pending' : ''}`}
                />

                {/* Label */}
                <text
                  x={node.x} y={node.y + 6}
                  textAnchor="middle"
                  fill={
                    isInOptimal
                      ? 'var(--accent-gold)'
                      : isPending
                      ? 'var(--accent-purple)'
                      : 'var(--text-primary)'
                  }
                  fontSize={16}
                  fontFamily="Inter, sans-serif"
                  fontWeight="700"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </g>

        {/* defs for glow effects */}
        <defs>
          <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Weight modal */}
      {weightModal && (() => {
        const src = nodes.find((n) => n.id === weightModal.sourceId);
        const tgt = nodes.find((n) => n.id === weightModal.targetId);
        return (
          <WeightModal
            nodeA={src?.label ?? '?'}
            nodeB={tgt?.label ?? '?'}
            onConfirm={handleWeightConfirm}
            onCancel={() => setWeightModal(null)}
          />
        );
      })()}
    </>
  );
});

export default Canvas;
