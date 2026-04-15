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

/* ─── Constants ─────────────────────────────────────────────── */
const NODE_R = 28;
const GRID_SIZE = 40;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function svgPoint(svgEl: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svgEl.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  return pt.matrixTransform(svgEl.getScreenCTM()!.inverse());
}

function snapToGrid(v: number) {
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

/* ─── Interfaces ────────────────────────────────────────────── */
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
  resetView(): void;
  zoomIn(): void;
  zoomOut(): void;
}
interface Props {
  nodes: Node[];
  edges: Edge[];
  activeTool: Tool;
  optimalPath: string[];
  onAddNode(node: Node): void;
  onAddEdge(edge: Edge): void;
  onDeleteNode(nodeId: string): void;
  onDeleteEdge(edgeId: string): void;
  onMoveNode(nodeId: string, x: number, y: number): void;
}

/* ─── Grid ──────────────────────────────────────────────────── */
function GridPattern() {
  return (
    <defs>
      <pattern id="canvas-grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
        <path
          d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
          fill="none"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="0.5"
        />
      </pattern>
      <filter id="shadow-node" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.12)"/>
      </filter>
    </defs>
  );
}

/* ─── Canvas Component ──────────────────────────────────────── */
const Canvas = forwardRef<CanvasRef, Props>(function Canvas(
  { nodes, edges, activeTool, optimalPath, onAddNode, onAddEdge, onDeleteNode, onDeleteEdge, onMoveNode },
  ref
) {
  const svgRef = useRef<SVGSVGElement>(null);

  /* Viewport */
  const [viewBox, setViewBox] = useState({ x: -400, y: -300, w: 1200, h: 800 });

  /* Pan state */
  const isPanning = useRef(false);
  const panStart  = useRef({ clientX: 0, clientY: 0, vx: 0, vy: 0 });

  /* Node drag state (move tool) */
  const draggingNodeId  = useRef<string | null>(null);
  const dragOffset      = useRef({ dx: 0, dy: 0 });
  const [isDragging, setIsDragging] = useState(false);

  /* Edge creation */
  const [pendingEdge,  setPendingEdge]  = useState<PendingEdge | null>(null);
  const [weightModal,  setWeightModal]  = useState<WeightModalState | null>(null);

  /* Hover for delete */
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  /* ── Imperative API ───────────────────────────────────────── */
  useImperativeHandle(ref, () => ({
    resetView() { setViewBox({ x: -400, y: -300, w: 1200, h: 800 }); },
    zoomIn()  { applyZoom(0.8); },
    zoomOut() { applyZoom(1.25); },
  }));

  function applyZoom(factor: number) {
    setViewBox((v) => {
      const cx = v.x + v.w / 2;
      const cy = v.y + v.h / 2;
      const nw = Math.min(Math.max(v.w * factor, 300), 8000);
      const nh = Math.min(Math.max(v.h * factor, 200), 6000);
      return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
    });
  }

  /* ── Wheel zoom ───────────────────────────────────────────── */
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const svg = svgRef.current!;
    const pt  = svgPoint(svg, e.clientX, e.clientY);
    setViewBox((v) => {
      const nw = Math.min(Math.max(v.w * factor, 300), 8000);
      const nh = Math.min(Math.max(v.h * factor, 200), 6000);
      return {
        x: pt.x - (pt.x - v.x) * (nw / v.w),
        y: pt.y - (pt.y - v.y) * (nh / v.h),
        w: nw, h: nh,
      };
    });
  }, []);

  /* ── Mouse DOWN ───────────────────────────────────────────── */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Middle mouse always pans
      if (e.button === 1) {
        e.preventDefault();
        isPanning.current = true;
        panStart.current = { clientX: e.clientX, clientY: e.clientY, vx: viewBox.x, vy: viewBox.y };
        return;
      }
      if (e.button !== 0) return;

      if (activeTool === 'move') {
        // Check if clicking on a node
        const target = e.target as SVGElement;
        const nodeGroup = target.closest<SVGElement>('[data-node-id]');
        if (nodeGroup) {
          const nodeId = nodeGroup.dataset.nodeId!;
          const node   = nodes.find((n) => n.id === nodeId);
          if (!node) return;
          const svg = svgRef.current!;
          const pt  = svgPoint(svg, e.clientX, e.clientY);
          draggingNodeId.current = nodeId;
          dragOffset.current     = { dx: pt.x - node.x, dy: pt.y - node.y };
          setIsDragging(true);
          e.stopPropagation();
        } else {
          // Pan canvas
          isPanning.current = true;
          panStart.current  = { clientX: e.clientX, clientY: e.clientY, vx: viewBox.x, vy: viewBox.y };
        }
      }
    },
    [activeTool, nodes, viewBox.x, viewBox.y]
  );

  /* ── Mouse MOVE ───────────────────────────────────────────── */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current!;

      // Node drag
      if (draggingNodeId.current) {
        const pt = svgPoint(svg, e.clientX, e.clientY);
        onMoveNode(
          draggingNodeId.current,
          pt.x - dragOffset.current.dx,
          pt.y - dragOffset.current.dy
        );
        return;
      }

      // Canvas pan
      if (isPanning.current) {
        const scale = viewBox.w / svg.clientWidth;
        const dx    = (e.clientX - panStart.current.clientX) * scale;
        const dy    = (e.clientY - panStart.current.clientY) * scale;
        setViewBox((v) => ({ ...v, x: panStart.current.vx - dx, y: panStart.current.vy - dy }));
        return;
      }

      // Pending edge preview
      if (pendingEdge && activeTool === 'edge') {
        const pt = svgPoint(svg, e.clientX, e.clientY);
        setPendingEdge((prev) => prev ? { ...prev, mouseX: pt.x, mouseY: pt.y } : null);
      }
    },
    [activeTool, pendingEdge, viewBox.w, onMoveNode]
  );

  /* ── Mouse UP ─────────────────────────────────────────────── */
  const handleMouseUp = useCallback(() => {
    if (draggingNodeId.current) {
      draggingNodeId.current = null;
      setIsDragging(false);
    }
    isPanning.current = false;
  }, []);

  /* ── Canvas CLICK (add node) ──────────────────────────────── */
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (activeTool !== 'node') return;
      if ((e.target as SVGElement).closest('[data-node-id], [data-edge-id]')) return;

      const svg = svgRef.current!;
      const pt  = svgPoint(svg, e.clientX, e.clientY);
      const x   = snapToGrid(pt.x);
      const y   = snapToGrid(pt.y);

      const tooClose = nodes.some((n) => Math.hypot(n.x - x, n.y - y) < NODE_R * 2.2);
      if (tooClose) return;

      // Next label: A, B, C... then A1, B1...
      const idx    = nodes.length;
      const letter = String.fromCharCode(65 + (idx % 26));
      const suffix = idx >= 26 ? String(Math.floor(idx / 26)) : '';
      onAddNode({ id: uid(), label: letter + suffix, x, y });
    },
    [activeTool, nodes, onAddNode]
  );

  /* ── Node CLICK ───────────────────────────────────────────── */
  const handleNodeClick = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      if (isDragging) return;  // suppress click after drag

      if (activeTool === 'delete') {
        onDeleteNode(nodeId);
        return;
      }

      if (activeTool === 'edge') {
        if (!pendingEdge) {
          const svg = svgRef.current!;
          const pt  = svgPoint(svg, e.clientX, e.clientY);
          setPendingEdge({ sourceId: nodeId, mouseX: pt.x, mouseY: pt.y });
        } else {
          if (pendingEdge.sourceId === nodeId) { setPendingEdge(null); return; }
          const duplicate = edges.some(
            (ed) =>
              (ed.sourceId === pendingEdge.sourceId && ed.targetId === nodeId) ||
              (ed.sourceId === nodeId && ed.targetId === pendingEdge.sourceId)
          );
          if (duplicate) { setPendingEdge(null); return; }
          setWeightModal({ sourceId: pendingEdge.sourceId, targetId: nodeId });
          setPendingEdge(null);
        }
      }
    },
    [activeTool, edges, isDragging, onDeleteNode, pendingEdge]
  );

  /* ── Edge CLICK ───────────────────────────────────────────── */
  const handleEdgeClick = useCallback(
    (e: React.MouseEvent, edgeId: string) => {
      e.stopPropagation();
      if (activeTool === 'delete') onDeleteEdge(edgeId);
    },
    [activeTool, onDeleteEdge]
  );

  /* ── Escape cancels pending edge ──────────────────────────── */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setPendingEdge(null); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  /* ── Weight modal confirm ─────────────────────────────────── */
  const handleWeightConfirm = useCallback(
    (weight: number) => {
      if (!weightModal) return;
      onAddEdge({ id: uid(), sourceId: weightModal.sourceId, targetId: weightModal.targetId, weight });
      setWeightModal(null);
    },
    [weightModal, onAddEdge]
  );

  /* ── Optimal edge set ─────────────────────────────────────── */
  const optimalEdgeIds = new Set<string>();
  if (optimalPath.length > 1) {
    for (let i = 0; i < optimalPath.length - 1; i++) {
      const aL = optimalPath[i], bL = optimalPath[i + 1];
      const edge = edges.find((ed) => {
        const s = nodes.find((n) => n.id === ed.sourceId);
        const t = nodes.find((n) => n.id === ed.targetId);
        return (s?.label === aL && t?.label === bL) || (s?.label === bL && t?.label === aL);
      });
      if (edge) optimalEdgeIds.add(edge.id);
    }
  }

  /* ── Cursor class ─────────────────────────────────────────── */
  const cursorClass = [
    'canvas-svg',
    `tool-${activeTool}`,
    isPanning.current ? 'panning' : '',
    isDragging ? 'dragging' : '',
  ].filter(Boolean).join(' ');

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

        {/* Canvas background */}
        <rect
          x={viewBox.x - 10000} y={viewBox.y - 10000}
          width={viewBox.w + 20000} height={viewBox.h + 20000}
          fill="url(#canvas-grid)"
        />

        {/* ── Edges ───────────────────────────────────────────── */}
        <g>
          {edges.map((edge) => {
            const src = nodes.find((n) => n.id === edge.sourceId);
            const tgt = nodes.find((n) => n.id === edge.targetId);
            if (!src || !tgt) return null;

            const mx = (src.x + tgt.x) / 2;
            const my = (src.y + tgt.y) / 2;
            const isOptimal  = optimalEdgeIds.has(edge.id);
            const isHovDel   = hoveredEdgeId === edge.id && activeTool === 'delete';

            return (
              <g
                key={edge.id}
                data-edge-id={edge.id}
                className="edge-group"
                onClick={(e) => handleEdgeClick(e, edge.id)}
                onMouseEnter={() => activeTool === 'delete' && setHoveredEdgeId(edge.id)}
                onMouseLeave={() => setHoveredEdgeId(null)}
                style={{ cursor: activeTool === 'delete' ? 'not-allowed' : 'default' }}
              >
                {/* Wide hitbox */}
                <line x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y} stroke="transparent" strokeWidth={18}/>

                {/* Visible edge line */}
                <line
                  className={`edge-line ${isOptimal ? 'edge-optimal' : ''} ${isHovDel ? 'edge-delete-hover' : ''}`}
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke={isHovDel ? 'var(--red)' : isOptimal ? 'var(--optimal)' : 'var(--edge-stroke)'}
                  strokeWidth={isOptimal ? 3 : 2.5}
                  strokeLinecap="round"
                />

                {/* Weight label */}
                <rect
                  x={mx - 17} y={my - 12} width={34} height={24} rx={6}
                  fill={isOptimal ? 'var(--optimal-light)' : 'var(--edge-weight-bg)'}
                  stroke={isOptimal ? 'var(--optimal-border)' : 'var(--border)'}
                  strokeWidth={1.5}
                  style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.1))' }}
                />
                <text
                  x={mx} y={my + 5}
                  textAnchor="middle"
                  fill={isOptimal ? 'var(--optimal)' : 'var(--orange)'}
                  fontSize={13}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="700"
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
              x2={pendingEdge.mouseX} y2={pendingEdge.mouseY}
              stroke="var(--orange)"
              strokeWidth={2}
              strokeDasharray="7 4"
              strokeLinecap="round"
              style={{ pointerEvents: 'none' }}
            />
          );
        })()}

        {/* ── Nodes ─────────────────────────────────────────── */}
        <g>
          {nodes.map((node) => {
            const isInOptimal  = optimalPath.includes(node.label);
            const isPendFirst  = pendingEdge?.sourceId === node.id;
            const isHovDel     = hoveredNodeId === node.id && activeTool === 'delete';
            const isDraggingMe = draggingNodeId.current === node.id;

            const strokeColor = isHovDel
              ? 'var(--red)'
              : isInOptimal
              ? 'var(--optimal)'
              : isPendFirst
              ? 'var(--orange)'
              : 'var(--node-stroke)';

            const fillColor = isHovDel
              ? 'var(--red-light)'
              : isInOptimal
              ? 'var(--optimal-light)'
              : 'var(--node-fill)';

            return (
              <g
                key={node.id}
                data-node-id={node.id}
                className="node-group"
                onClick={(e) => handleNodeClick(e, node.id)}
                onMouseEnter={() => activeTool === 'delete' && setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                style={{
                  cursor: activeTool === 'delete'
                    ? 'not-allowed'
                    : activeTool === 'move'
                    ? isDraggingMe ? 'grabbing' : 'grab'
                    : activeTool === 'edge'
                    ? 'pointer'
                    : 'default',
                }}
              >
                {/* Shadow / glow ring */}
                {(isInOptimal || isPendFirst || isDraggingMe) && (
                  <circle
                    cx={node.x} cy={node.y}
                    r={NODE_R + 9}
                    fill={
                      isInOptimal
                        ? 'rgba(34,197,94,0.12)'
                        : isPendFirst || isDraggingMe
                        ? 'rgba(234,88,12,0.1)'
                        : 'transparent'
                    }
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Main circle */}
                <circle
                  cx={node.x} cy={node.y} r={NODE_R}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isInOptimal || isHovDel ? 3 : 2.5}
                  className={`node-circle ${isInOptimal ? 'node-optimal' : ''} ${isPendFirst ? 'node-pending-first' : ''} ${isHovDel ? 'node-delete-hover' : ''}`}
                  filter="url(#shadow-node)"
                />

                {/* Label */}
                <text
                  x={node.x} y={node.y + 6}
                  textAnchor="middle"
                  fill={isHovDel ? 'var(--red)' : isInOptimal ? 'var(--optimal)' : isPendFirst ? 'var(--orange)' : 'var(--node-text)'}
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
