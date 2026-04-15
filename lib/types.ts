export interface Node {
  id: string;        // unique uuid
  label: string;     // A, B, C...
  x: number;
  y: number;
}

export interface Edge {
  id: string;
  sourceId: string;
  targetId: string;
  weight: number;
}

export type Tool = 'node' | 'edge' | 'delete' | 'pan';

export interface RouteResult {
  path: string[];    // labels: ['A', 'B', 'E']
  cost: number;
  isOptimal: boolean;
}

export interface GraphState {
  nodes: Node[];
  edges: Edge[];
}
